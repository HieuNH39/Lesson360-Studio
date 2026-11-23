/* Trò chơi / công cụ web mở (Wordwall, LearningApps, Quizizz, Kahoot, Blooket, Genially, Padlet, Mentimeter, Google Biểu mẫu…):
   giáo viên tạo trò chơi trên trang của công cụ (nội dung do trợ lý AI soạn sẵn để dán), dán đường dẫn hoặc mã nhúng;
   màn chiếu hiện trò chơi ngay (nếu nhúng được) kèm mã QR, máy học sinh mở trò chơi trong trang học. */
(function () {
  const L360 = window.L360;
  const u = L360.u;

  const TOOLS = [
    ["wordwall", "Wordwall", "https://wordwall.net/vi/create/picktemplate", "Vòng quay, ghép đôi, đố vui, mở hộp, lật thẻ, sắp xếp nhóm"],
    ["learningapps", "LearningApps", "https://learningapps.org/createApp.php", "Ghép cặp, sắp xếp, điền khuyết, trục thời gian, bản đồ"],
    ["quizizz", "Quizizz (Wayground)", "https://wayground.com/admin", "Thi trắc nghiệm theo mã phòng, học sinh làm trên máy"],
    ["kahoot", "Kahoot!", "https://create.kahoot.it/", "Đố vui đối kháng cả lớp có nhạc nền"],
    ["blooket", "Blooket", "https://dashboard.blooket.com/create", "Ôn tập dạng trò chơi nhiều chế độ"],
    ["educaplay", "Educaplay", "https://www.educaplay.com/", "Ô chữ, tìm từ, câu đố, nối cột"],
    ["genially", "Genially", "https://app.genially.com/", "Phòng thoát hiểm, bản đồ, tranh tương tác"],
    ["padlet", "Padlet", "https://padlet.com/", "Bảng ý kiến chung, dòng thời gian, bản đồ cả lớp"],
    ["mentimeter", "Mentimeter", "https://www.mentimeter.com/", "Đám mây từ khoá, bình chọn nhanh"],
    ["google-forms", "Google Biểu mẫu", "https://forms.new", "Phiếu hỏi, bài kiểm tra ngắn tự chấm"],
    ["khac", "Công cụ khác", "", "Trang web học tập mở bất kì"]
  ];
  const tool = (id) => TOOLS.find((t) => t[0] === id) || TOOLS[TOOLS.length - 1];

  // Đường dẫn → {url, embed}: nhận cả mã nhúng <iframe>; chỉ nhúng các dạng biết chắc hiển thị được trong khung.
  function embedOf(raw) {
    let url = String(raw || "").trim();
    const m = url.match(/<iframe[^>]*\ssrc=["']([^"']+)/i);
    if (m) url = m[1].replace(/&amp;/g, "&");
    if (!/^https:\/\//i.test(url)) return { url: "", embed: "" };
    let e = "";
    let mm;
    if (/wordwall\.net\/(?:[a-z]{2}\/)?embed\//i.test(url)) e = url;
    else if ((mm = url.match(/learningapps\.org\/(?:view)?(\d{4,})/i))) e = `https://learningapps.org/watch?app=${mm[1]}`;
    else if (/learningapps\.org\/watch\?/i.test(url)) e = url;
    else if (/view\.genial\.ly\//i.test(url)) e = url;
    else if (/padlet\.com\/embed\//i.test(url)) e = url;
    else if (/docs\.google\.com\/forms\/.+\/viewform/i.test(url)) e = url + (/embedded=true/.test(url) ? "" : (url.includes("?") ? "&" : "?") + "embedded=true");
    else if (/\/embed(\/|\?|$)/i.test(url)) e = url;
    return { url, embed: e };
  }
  L360.webEmbed = embedOf;
  L360.WEB_TOOLS = TOOLS;

  L360.registerType({
    type: "web",
    label: "Trò chơi / công cụ web",
    icon: "🎮",
    desc: "Trò chơi trực quan trên web mở (Wordwall, LearningApps, Quizizz, Kahoot, Blooket, Genially, Padlet…): màn chiếu hiện trò chơi và mã QR, học sinh mở trên laptop/iPad.",
    noSubmit: true,
    activity: true,
    releaseOnEnter: true,
    fields: [
      { key: "tool", label: "Công cụ", kind: "select", options: TOOLS.map((t) => [t[0], t[1]]) },
      { key: "template", label: "Dạng trò chơi", kind: "text", hint: "Ví dụ: Wordwall – Ghép đôi; LearningApps – Trục thời gian" },
      { key: "url", label: "Đường dẫn trò chơi hoặc mã nhúng (embed)", kind: "text", hint: "Dán mã nhúng <iframe…> để trò chơi hiện ngay trên màn chiếu" },
      { key: "content", label: "Nội dung trò chơi (để dán vào công cụ)", kind: "textarea", hint: "Mỗi dòng một mục; cặp ghép viết “vế trái | vế phải”" },
      { key: "joinCode", label: "Mã tham gia (Quizizz/Kahoot…)", kind: "text" },
      { key: "studentOpen", label: "Học sinh mở trò chơi trên máy", kind: "bool" }
    ],
    template: () => ({
      type: "web",
      phase: "luyen-tap",
      title: "Trò chơi ôn tập",
      minutes: 6,
      tool: "wordwall",
      template: "Wordwall – Ghép đôi",
      url: "",
      content: "Khái niệm | Nội dung",
      joinCode: "",
      studentOpen: true,
      instructions: "Mở trò chơi trên máy và hoàn thành trong thời gian quy định.",
      script: ""
    }),
    normalize(s) {
      s.tool = tool(s.tool)[0];
      s.url = String(s.url || "").trim();
      s.content = Array.isArray(s.content) ? s.content.join("\n") : String(s.content || "");
      s.studentOpen = s.studentOpen !== false;
    },
    validate(s, err, warn) {
      if (!s.url) warn(`“${s.title}”: chưa có đường dẫn trò chơi – tạo trên ${tool(s.tool)[1]} (nội dung đã có sẵn trong bước) rồi dán đường dẫn/mã nhúng.`);
      else if (!embedOf(s.url).url) warn(`“${s.title}”: đường dẫn trò chơi phải bắt đầu bằng https://`);
    },
    count: () => 1,
    publicPayload(s) {
      const e = embedOf(s.url);
      return { title: s.title, tool: s.tool, toolName: tool(s.tool)[1], template: s.template || "", url: e.url, embed: e.embed, code: s.joinCode || "", studentOpen: s.studentOpen !== false, instructions: s.instructions || "" };
    },
    student: {
      render(el, ctx) {
        const it = ctx.item || {};
        if (!it.url) {
          el.innerHTML = `<div class="card center"><div style="font-size:2.4rem">🎮</div><h2>${u.esc(it.title || ctx.step.title)}</h2><p class="muted">Theo dõi trò chơi trên màn chiếu.</p></div>`;
          return;
        }
        const frame = it.studentOpen && it.embed;
        el.innerHTML = `<div class="card web-card"><div class="row" style="gap:8px"><span class="pill accent">${u.esc(it.toolName)}</span><b class="grow">${u.esc(it.title)}</b>${it.code ? `<span class="pill">Mã: <b>${u.esc(it.code)}</b></span>` : ""}</div>
          ${it.instructions ? `<p class="small" style="margin:8px 0">${u.esc(it.instructions)}</p>` : ""}
          ${frame ? `<div class="web-frame"><iframe src="${u.esc(it.embed)}" allow="fullscreen; autoplay" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe></div>` : ""}
          ${it.studentOpen ? `<a class="btn ${frame ? "sm" : "primary lg"}" href="${u.esc(it.url)}" target="_blank" rel="noopener" data-allow-leave style="margin-top:8px">Mở trò chơi ${frame ? "trong tab mới" : ""} ↗</a>` : `<p class="muted">Trò chơi chơi chung trên màn chiếu.</p>`}</div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item || {};
      const k = it.embed + "|" + it.url;
      if (el.dataset.web === k && u.$(".web-scr", el)) return;
      el.dataset.web = k;
      el.innerHTML = `<div class="web-scr ${it.embed ? "" : "noembed"}">${
        it.embed
          ? `<div class="web-frame big"><iframe src="${u.esc(it.embed)}" allow="fullscreen; autoplay" allowfullscreen></iframe></div>`
          : `<div class="web-hero"><div style="font-size:84px">🎮</div><h1>${u.esc(it.title || "")}</h1><p class="muted" style="font-size:24px">${u.esc(it.toolName || "")}${it.template ? " · " + u.esc(it.template) : ""}</p></div>`
      }<aside class="web-side">${it.url ? `<div class="web-qr">${u.qr(it.url, 5)}</div><p class="small muted" style="word-break:break-all">${u.esc(it.url)}</p>` : `<p class="muted">Giáo viên chưa dán đường dẫn trò chơi.</p>`}${
        it.code ? `<div class="web-code"><span>Mã tham gia</span><b>${u.esc(it.code)}</b></div>` : ""
      }${it.instructions ? `<p style="font-size:20px">${u.esc(it.instructions)}</p>` : ""}</aside></div>`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const e = embedOf(s.url);
      el.innerHTML = `<div class="card flat"><b>${u.esc(tool(s.tool)[1])}</b>${s.template ? ` · ${u.esc(s.template)}` : ""}<div class="row small" style="margin-top:6px">${
        e.url ? `<a href="${u.esc(e.url)}" target="_blank" rel="noopener">Mở trò chơi ↗</a>${e.embed ? `<span class="pill ok">Hiện ngay trên màn chiếu</span>` : `<span class="pill">Màn chiếu hiện mã QR</span>`}` : `<span class="pill bad">Chưa có đường dẫn trò chơi</span>`
      }</div></div>`;
    }
  });
})();
