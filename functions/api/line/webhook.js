const DEMO_REVIEWS = [
  {
    id: "r-001",
    store: "渋谷店",
    priority: "P0 即時対応",
    rating: 1,
    author: "M.K.",
    issue: "異物混入",
    comment: "料理に髪の毛のような異物が入っていて、スタッフに伝えても対応が雑でした。",
    check: "該当メニューの仕込み、盛り付け、提供前確認を見てください。",
  },
  {
    id: "r-005",
    store: "新宿店",
    priority: "P0 即時対応",
    rating: 1,
    author: "匿名",
    issue: "健康被害",
    comment: "食後に腹痛がありました。衛生面が不安です。保健所にも相談しようと思います。",
    check: "来店日時、注文内容、同じ時間帯の問い合わせ有無を確認してください。",
  },
  {
    id: "r-003",
    store: "渋谷店",
    priority: "P1 当日対応",
    rating: 2,
    author: "Aoi",
    issue: "待ち時間",
    comment: "予約していたのに30分以上待ちました。料理は良かったですが、案内が遅くて残念でした。",
    check: "予約枠、案内時間、提供遅れが発生した時間帯を確認してください。",
  },
];

const POST_IDEA_KEYWORDS = ["投稿", "おすすめ", "空席", "イベント", "臨時", "営業時間", "素材", "写真"];

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  return jsonResponse({
    ok: true,
    service: "ミセコエ LINE webhook",
    webhookUrl: `${url.origin}/api/line/webhook`,
    lineChannelSecretConfigured: Boolean(env.LINE_CHANNEL_SECRET),
    lineChannelAccessTokenConfigured: Boolean(env.LINE_CHANNEL_ACCESS_TOKEN),
    fieldInterface: "LINE Flex Message + postback",
    staffPreviewUrl: `${url.origin}/?view=staff`,
    adminLoginUrl: `${url.origin}/?view=reviews&source=line-admin-login`,
    supportedCommands: ["レビュー", "確認", "管理者", "投稿素材", "おすすめ", "空席", "ヘルプ"],
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.LINE_CHANNEL_SECRET || !env.LINE_CHANNEL_ACCESS_TOKEN) {
    return jsonResponse(
      {
        ok: false,
        error: "LINE_CHANNEL_SECRET and LINE_CHANNEL_ACCESS_TOKEN are required.",
      },
      500,
    );
  }

  const body = await request.text();
  const signature = request.headers.get("x-line-signature") || "";
  const valid = await verifyLineSignature(body, signature, env.LINE_CHANNEL_SECRET);
  if (!valid) {
    return jsonResponse({ ok: false, error: "Invalid LINE signature." }, 401);
  }

  const payload = JSON.parse(body || "{}");
  const events = Array.isArray(payload.events) ? payload.events : [];
  if (!events.length) {
    return jsonResponse({ ok: true, message: "Webhook verified." });
  }

  const origin = new URL(request.url).origin;
  await Promise.all(events.map((event) => handleLineEvent(event, env.LINE_CHANNEL_ACCESS_TOKEN, origin)));

  return jsonResponse({ ok: true, handled: events.length });
}

async function handleLineEvent(event, accessToken, origin) {
  if (!event.replyToken) return;

  if (event.type === "postback") {
    const params = new URLSearchParams(event.postback?.data || "");
    const review = DEMO_REVIEWS.find((item) => item.id === params.get("review")) || DEMO_REVIEWS[0];
    const action = params.get("action");
    const text =
      action === "confirm"
        ? `現場確認済みにしました。\n${review.store} / ${review.issue}\n管理者画面に確認結果を戻す想定です。`
        : `店長共有済みにしました。\n${review.store} / ${review.issue}\n公開返信前の確認対象として残します。`;
    return replyMessage(accessToken, event.replyToken, [
      {
        type: "text",
        text,
      },
    ]);
  }

  if (event.type === "follow") {
    return replyMessage(accessToken, event.replyToken, [
      {
        type: "text",
        text: "ミセコエと連携しました。\n現場ではLINE上でレビュー確認と投稿素材共有を行えます。",
        quickReply: buildQuickReply(),
      },
      ...buildHelpMessages(origin),
    ]);
  }

  if (event.type !== "message" || event.message?.type !== "text") return;

  const text = String(event.message.text || "").trim();
  const messages =
    text.includes("レビュー") || text.includes("確認")
      ? buildReviewMessages(origin)
      : text.includes("管理者")
        ? buildAdminLoginMessages(origin)
      : POST_IDEA_KEYWORDS.some((keyword) => text.includes(keyword))
        ? buildPostIdeaMessages(origin, text)
      : text.includes("ヘルプ") || text.includes("使い方")
        ? buildHelpMessages(origin)
      : [
          {
            type: "text",
            text: "「レビュー」で未確認レビュー、「投稿素材」でGBP投稿素材、「管理者」で管理者ログインを表示します。",
            quickReply: buildQuickReply(),
          },
        ];

  return replyMessage(accessToken, event.replyToken, messages);
}

function buildReviewMessages(origin) {
  const review = DEMO_REVIEWS[0];
  return [
    {
      type: "text",
      text: `未確認レビューが${DEMO_REVIEWS.length}件あります。\nまずは優先度が高いものから確認してください。`,
      quickReply: buildQuickReply(),
    },
    {
      type: "flex",
      altText: `${review.store}の${review.issue}レビュー確認`,
      contents: {
        type: "bubble",
        size: "mega",
        header: {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: "ミセコエ通知", weight: "bold", color: "#ffffff" },
            { type: "text", text: review.priority, size: "sm", color: "#d7f7f1" },
          ],
          backgroundColor: "#0f766e",
        },
        body: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [
            { type: "text", text: `${review.store} / ${review.issue}`, weight: "bold", size: "lg", wrap: true },
            { type: "text", text: `星${review.rating} / ${review.author}さん`, size: "sm", color: "#60706c" },
            { type: "text", text: review.comment, wrap: true, size: "sm" },
            { type: "separator" },
            { type: "text", text: "現場で確認すること", weight: "bold", size: "sm" },
            { type: "text", text: review.check, wrap: true, size: "sm" },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#0f766e",
              action: {
                type: "postback",
                label: "現場確認済み",
                data: `action=confirm&review=${review.id}`,
                displayText: "現場確認済み",
              },
            },
            {
              type: "button",
              style: "secondary",
              action: {
                type: "postback",
                label: "店長に共有",
                data: `action=escalate&review=${review.id}`,
                displayText: "店長に共有",
              },
            },
            {
              type: "button",
              action: {
                type: "uri",
                label: "管理者ログイン",
                uri: `${origin}/?view=reviews&source=line-admin-login&review=${encodeURIComponent(review.id)}`,
              },
            },
          ],
        },
      },
    },
  ];
}

function buildPostIdeaMessages(origin, text) {
  const cleaned = text.replace(/^投稿素材[:：\s]*/, "").trim();
  const summary = cleaned || "今日のおすすめ、空席、イベント、臨時営業時間などを送ってください。";
  return [
    {
      type: "text",
      text: cleaned
        ? `投稿素材を受け付けました。\n\n${summary}\n\n管理者画面のGBP投稿キューで下書き化・承認公開する想定です。`
        : "投稿素材の例:\n投稿素材 今日のおすすめは季節野菜のハンバーグです。19時以降に空席があります。",
      quickReply: buildQuickReply(),
    },
    {
      type: "template",
      altText: "GBP投稿キューを開く",
      template: {
        type: "buttons",
        title: "GBP投稿素材",
        text: "管理者はスマホブラウザで投稿キューを確認できます。",
        actions: [
          {
            type: "uri",
            label: "投稿キューを開く",
            uri: `${origin}/?view=gbp-posts&source=line-field-post`,
          },
        ],
      },
    },
  ];
}

function buildAdminLoginMessages(origin) {
  return [
    {
      type: "text",
      text: "管理者権限がある方は、以下からWeb管理者画面を開いてください。本番ではGoogleログインと店舗ロールで判定します。",
      quickReply: buildQuickReply(),
    },
    {
      type: "template",
      altText: "ミセコエ 管理者ログイン",
      template: {
        type: "buttons",
        title: "ミセコエ",
        text: "レビュー受信箱をスマホブラウザで開きます。",
        actions: [
          {
            type: "uri",
            label: "管理者ログイン",
            uri: `${origin}/?view=reviews&source=line-admin-login`,
          },
        ],
      },
    },
  ];
}

function buildHelpMessages(origin) {
  return [
    {
      type: "text",
      text: [
        "現場者向けコマンド",
        "・レビュー: 未確認レビューを表示",
        "・投稿素材: GBP投稿に使う素材を送信",
        "・管理者: 管理者画面を開く",
        "",
        `現場者画面プレビュー: ${origin}/?view=staff`,
      ].join("\n"),
      quickReply: buildQuickReply(),
    },
  ];
}

function buildQuickReply() {
  return {
    items: [
      { type: "action", action: { type: "message", label: "レビュー確認", text: "レビュー" } },
      { type: "action", action: { type: "message", label: "投稿素材", text: "投稿素材 " } },
      { type: "action", action: { type: "message", label: "管理者ログイン", text: "管理者" } },
      { type: "action", action: { type: "message", label: "ヘルプ", text: "ヘルプ" } },
    ],
  };
}

async function replyMessage(accessToken, replyToken, messages) {
  const response = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      replyToken,
      messages,
    }),
  });

  if (!response.ok) {
    console.error("LINE reply failed", response.status, await response.text());
  }
}

async function verifyLineSignature(body, signature, channelSecret) {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return timingSafeEqual(arrayBufferToBase64(digest), signature);
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
