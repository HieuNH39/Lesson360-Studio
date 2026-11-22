/* EXPLORE – Di sản 360: nhiệm vụ khám phá di tích qua ứng dụng Heritage Lens – Kinh Bắc Ký Sự.
   Học sinh mở đúng trang di tích (quét QR hoặc bấm nút), đọc/nghe thuyết minh, rồi trả lời nhiệm vụ. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;
  const SITES = window.L360_HERITAGE || [];
  const base = () => (L360.cfg.heritageLensUrl || "").replace(/\/?$/, "/");
  const siteUrl = (s) => (s.url ? s.url : s.siteId ? `${base()}#/site/${s.siteId}` : base());
  const siteName = (s) => s.siteName || (SITES.find((x) => x.id === s.siteId) || {}).name || "Heritage Lens – Kinh Bắc Ký Sự";

  L360.registerType({
    type: "explore",
    label: "Khám phá di sản (Heritage Lens)",
    icon: "⌖",
    desc: "Mở trang di tích trong ứng dụng Heritage Lens (31 di tích Kinh Bắc, có thuyết minh, ảnh, câu đố), rồi hoàn thành nhiệm vụ: trả lời ngắn hoặc trắc nghiệm.",
    releaseOnEnter: true,
    fields: [
      { key: "siteId", label: "Di tích", kind: "site" },
      { key: "url", label: "Hoặc đường dẫn khác", kind: "text", hint: "Để trống để dùng trang di tích trong Heritage Lens" },
      { key: "mission", label: "Nhiệm vụ khám phá", kind: "textarea" },
      { key: "answerType", label: "Kiểu trả lời", kind: "select", options: [["text", "Viết ngắn"], ["choice", "Trắc nghiệm"]] },
      { key: "options", label: "Phương án (nếu trắc nghiệm)", kind: "options" },
      { key: "maxWords", label: "Giới hạn từ (nếu viết)", kind: "number" },
      { key: "explain", label: "Giải thích / kết luận sau khi công bố", kind: "textarea" },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({
      type: "explore",
      title: "Khám phá di sản",
      minutes: 6,
      siteId: "phat-tich",
      mission: "Mở trang di tích, nghe thuyết minh và cho biết một chi tiết chứng tỏ giá trị lịch sử của di tích.",
      answerType: "text",
      maxWords: 40,
      timer: 300
    }),
    normalize(s) {
      s.answerType = s.answerType === "choice" ? "choice" : "text";
      s.maxWords = Number(s.maxWords) || 40;
      if (s.answerType === "choice") s.options = s.options || [];
    },
    validate(s, err, warn) {
      if (!s.mission) err("Chưa có nhiệm vụ.");
      if (s.siteId && !SITES.find((x) => x.id === s.siteId)) warn(`Không thấy di tích "${s.siteId}" trong danh sách Heritage Lens.`);
      if (s.answerType === "choice" && (!s.options || s.options.length < 2)) err("Trắc nghiệm cần ít nhất 2 phương án.");
    },
    publicPayload: (s) => ({
      siteId: s.siteId || "",
      siteName: siteName(s),
      url: siteUrl(s),
      mission: s.mission,
      answerType: s.answerType,
      options: s.answerType === "choice" ? s.options : null,
      maxWords: s.maxWords
    }),
    answerPayload: (s) => ({ answer: s.answerType === "choice" ? s.answer : null, explain: s.explain || "" }),
    isCorrect: (s, key, v) => (s.answerType === "choice" && s.answer != null ? (v && v.choice) === s.answer : null),
    describe: (s, key, v) => (v ? (v.choice != null ? u.letter(v.choice) : v.text || "") : ""),
    student: {
      render(el, ctx) {
        const it = ctx.item || {};
        const st = ctx.state;
        const v = ctx.sub && ctx.sub.v;
        const ans = ctx.answer;
        const head = `<div class="card" style="border-top:6px solid var(--accent)"><div class="row"><span class="pill accent">Di sản 360</span><span class="spacer"></span>${
          st.phase === "open" ? ui.timer() : ""
        }</div><h2 style="margin-top:10px">${u.esc(it.siteName)}</h2>
          <a class="btn primary block" href="${u.esc(it.url)}" target="_blank" rel="noopener">Mở Heritage Lens ↗</a>
          <p class="small muted" style="margin-top:6px">Đọc, nghe thuyết minh, xem ảnh và làm câu đố của di tích, rồi quay lại trang này.</p>
          <div class="card flat" style="margin-top:12px;background:var(--paper)"><b>Nhiệm vụ.</b> ${u.rich(it.mission)}</div></div>`;
        if (st.phase !== "open" || (v && !el._editing)) {
          let res = "";
          if (v)
            res = it.answerType === "choice" ? ui.options(it.options, { selected: v.choice, answer: ans ? ans.answer : null, mine: v.choice, disabled: true }) : `<div class="card flat">${u.rich(v.text)}</div>`;
          el.innerHTML =
            head +
            `<div class="card" style="margin-top:12px">${v ? `<div class="small muted">Câu trả lời của em</div>${res}` : st.phase === "observe" ? `<p class="muted">Giáo viên sẽ mở phần trả lời sau khi cả lớp khám phá.</p>` : `<p class="muted">Em chưa trả lời.</p>`}
            ${ans && ans.explain ? `<div class="card flat" style="margin-top:10px;border-color:var(--accent)">${ui.md(ans.explain)}</div>` : ""}
            ${v && st.phase === "open" ? `<button class="btn sm" data-edit style="margin-top:10px">Sửa câu trả lời</button>` : ""}</div>`;
          const e = u.$("[data-edit]", el);
          if (e) e.onclick = () => ((el._editing = true), L360.types.explore.student.render(el, ctx));
          return;
        }
        let sel = v && v.choice != null ? v.choice : null;
        const draw = () => {
          el.innerHTML =
            head +
            `<div class="card" style="margin-top:12px">${
              it.answerType === "choice" ? ui.options(it.options, { selected: sel }) : ui.textarea("ta", { value: (v && v.text) || "", max: it.maxWords, rows: 4 })
            }<button class="btn primary lg block" style="margin-top:12px" data-send>Gửi</button></div>`;
          ui.bindWordCount(el);
          u.$$("[data-opt]", el).forEach((b) => (b.onclick = () => ((sel = Number(b.dataset.opt)), draw())));
          u.$("[data-send]", el).onclick = () => {
            el._editing = false;
            if (it.answerType === "choice") {
              if (sel == null) return u.toast("Chọn một phương án.", "bad");
              return ctx.submit({ choice: sel });
            }
            const t = u.$("#ta", el).value.trim();
            if (!t) return u.toast("Hãy viết câu trả lời.", "bad");
            if (u.words(t) > it.maxWords) return u.toast(`Tối đa ${it.maxWords} từ.`, "bad");
            ctx.submit({ text: t });
          };
        };
        draw();
      }
    },
    screen(el, ctx) {
      const it = ctx.item || {};
      const subs = u.vals(ctx.subs);
      const ans = ctx.answer;
      let live = "";
      if (ctx.mode === "live" || ctx.state.phase !== "open") {
        if (it.answerType === "choice") {
          const c = (it.options || []).map(() => 0);
          subs.forEach((s) => s.v && c[s.v.choice] != null && c[s.v.choice]++);
          live = ui.bars((it.options || []).map((o, i) => ({ label: `${u.letter(i)}. ${u.esc(o)}`, value: c[i], correct: ans && ans.answer === i })), { total: subs.length || 1 });
        } else live = ui.cloud(subs.map((s) => s.v && s.v.text));
      }
      el.innerHTML = `<div class="grid" style="grid-template-columns:minmax(0,1fr) 340px;gap:28px;align-items:start">
        <div><div class="pill accent" style="font-size:1rem">Di sản 360 · Heritage Lens</div><h1 class="scr-q">${u.esc(it.siteName)}</h1>
        <div class="scr-explain" style="margin-top:0"><b>Nhiệm vụ.</b> ${u.rich(it.mission)}</div>${live}
        ${ans && ans.explain ? `<div class="scr-explain">${ui.md(ans.explain)}</div>` : ""}</div>
        <div class="card center"><div style="background:#fff;padding:8px;border-radius:12px">${u.qr(it.url || base(), 6)}</div><p class="small muted" style="margin-top:8px;word-break:break-all">${u.esc(it.url || "")}</p></div></div>`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const subs = u.entries(ctx.subs);
      el.innerHTML = `<p class="small"><a href="${u.esc(siteUrl(s))}" target="_blank" rel="noopener">${u.esc(siteName(s))} ↗</a></p>${
        subs.length
          ? subs
              .map(([c, x]) => `<div class="small" style="border-bottom:1px solid var(--line);padding:6px 0"><b>${c}</b>: ${u.esc(L360.types.explore.describe(s, s.id, x.v))}</div>`)
              .join("")
          : `<p class="muted small">Chưa có câu trả lời.</p>`
      }`;
    }
  });
  L360.heritage = { SITES, siteUrl, siteName, base };
})();
