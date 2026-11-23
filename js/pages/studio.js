/* Studio soạn bài (v2): tạo tiết học theo bài SGK bằng trợ lý AI (chọn 15 hoạt động → lời nhắc),
   trình soạn trực quan (trang bài giảng, khối hình ảnh, câu hỏi nhiều dạng), giáo án Word theo CV 5512 có năng lực số,
   bài giảng PowerPoint 20–40 trang, in phiếu học tập. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const C = L360.Curr;
  const Pack = L360.Pack;
  const Lib = L360.Lib;
  const A = L360.Architect;
  const app = u.$("#app");
  const dt = /che-do=dien-tap/.test(location.search) ? "&che-do=dien-tap" : "";
  let teacher = null;
  let tab = u.qs("tab") || (u.qs("sua") ? "soan" : u.qs("bai") || u.qs("mon") ? "tao" : "cua-toi");
  let cur = null;
  let dirty = false;
  const TABS = [
    ["cua-toi", "Tiết của tôi", "grid"],
    ["tao", "Tạo tiết mới", "spark"],
    ["soan", "Soạn & chỉnh sửa", "edit"],
    ["giaoan", "Giáo án Word", "doc"],
    ["ppt", "PowerPoint", "slides"],
    ["in", "In phiếu", "print"]
  ];
  const AI_LINKS = [
    ["Claude", "https://claude.ai/new"],
    ["ChatGPT", "https://chatgpt.com/"],
    ["Gemini", "https://gemini.google.com/app"]
  ];
  const PH_COL = { "khoi-dong": "var(--ph-kd)", "hinh-thanh": "var(--ph-ht)", "luyen-tap": "var(--ph-lt)", "van-dung": "var(--ph-vd)" };
  const icon = (n) => (L360.icon ? L360.icon(n) : "");

  /* ================= Khung trang ================= */
  function frame() {
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(teacher)}`, { sub: "Studio soạn bài", nav: "studio" }) +
      `<main class="wrap"><div class="tabs no-print st-tabs">${TABS.map(([k, l, ic]) => `<button class="tab ${tab === k ? "on" : ""}" data-tab="${k}">${icon(ic)}${l}</button>`).join("")}
        <span class="spacer"></span><span id="curLbl" class="small muted ellipsis" style="max-width:380px"></span></div><div id="pane"></div></main>` +
      L360.shell.footer();
    L360.shell.bindUserMenu(teacher);
    u.$$("[data-tab]").forEach((b) => (b.onclick = () => go(b.dataset.tab)));
    render();
  }
  async function go(t) {
    if (tab === "soan" && t !== "soan" && dirty) await saveDraft(true);
    tab = t;
    const q = new URLSearchParams();
    q.set("tab", t);
    if (cur) q.set("sua", cur.id);
    if (dt) q.set("che-do", "dien-tap");
    history.replaceState(null, "", "?" + q.toString());
    u.$$("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
    render();
  }
  function render() {
    const pane = u.$("#pane");
    const lbl = u.$("#curLbl");
    if (lbl) lbl.innerHTML = cur ? `Đang mở: <b>${u.esc(Pack.label(cur) || "")}</b> ${u.esc(cur.title)}` : "";
    window.scrollTo(0, 0);
    if (tab === "cua-toi") return mine(pane);
    if (tab === "tao") return wizard(pane);
    if (tab === "soan") return editor(pane);
    if (tab === "giaoan") return khbdPane(pane);
    if (tab === "ppt") return pptPane(pane);
    if (tab === "in") return printPane(pane);
  }
  const needPack = (pane, what) => {
    pane.innerHTML = `<div class="card center" style="padding:40px"><h2>Chưa mở tiết học nào</h2><p class="muted">${what}</p>
      <div class="row" style="justify-content:center"><button class="btn primary" id="n1">${icon("spark")} Tạo tiết mới</button><button class="btn" id="n2">Tiết của tôi</button></div></div>`;
    u.$("#n1").onclick = () => go("tao");
    u.$("#n2").onclick = () => go("cua-toi");
  };

  /* ================= Tiết của tôi ================= */
  async function mine(pane) {
    pane.innerHTML = `<div class="empty">Đang tải…</div>`;
    const list = (await Lib.drafts.list(teacher)).map((p) => Pack.normalize(p));
    list.sort((a, b) => ((b.meta && b.meta.savedAt) || 0) - ((a.meta && a.meta.savedAt) || 0));
    pane.innerHTML = `<div class="row" style="margin:6px 0 16px"><div class="grow"><h1 style="margin:0">Tiết học của tôi</h1><p class="muted" style="margin:4px 0 0">Bản nháp riêng của thầy cô. Khi hoàn thiện, bấm <b>Đăng lên thư viện</b> để mọi giáo viên trong trường cùng dùng.</p></div>
      <button class="btn primary" id="nw">${icon("spark")} Tạo tiết mới</button><a class="btn" href="thuvien.html${dt ? "?" + dt.slice(1) : ""}">${icon("grid")} Thư viện trường</a>
      <label class="btn">${icon("upload")} Nhập tệp .json<input type="file" accept=".json,application/json" id="imp" hidden></label></div>
      ${
        list.length
          ? `<div class="grid g3">${list
              .map((p) => {
                const ph = Pack.phaseCount(p);
                return `<article class="card st-card"><div class="row nowrap" style="align-items:flex-start">${L360.Design.preview(p.design.style, p.design.palette, Pack.label(p) || "Tiết học")}</div>
                <div class="small muted" style="margin-top:8px">${u.esc(C.subjectName(p.subjectId, p.grade) || p.subject || "")}${p.grade ? " · Lớp " + u.esc(p.grade) : ""}</div>
                <h3 class="clamp2" style="margin:2px 0 6px">${u.esc(p.title)}</h3>
                <div class="row" style="gap:4px">${L360.PHASES.map((x) => `<span class="ph-dot ${ph[x.id] || (x.id === "hinh-thanh" && p.steps.some((s) => s.phase === x.id)) ? "on" : ""}" style="--c:${PH_COL[x.id]}" title="${x.name}">${x.short}</span>`).join("")}
                  <span class="small muted">${p.steps.length} bước · ${p.steps.reduce((a, s) => a + (s.minutes || 0), 0)} phút</span>${p.meta && p.meta.publishedAt ? `<span class="pill ok">Đã đăng</span>` : ""}</div>
                <div class="row" style="margin-top:auto;padding-top:10px;gap:6px"><button class="btn sm primary" data-open="${u.esc(p.id)}">${icon("edit")} Soạn</button>
                  <a class="btn sm" href="giaovien.html?pack=${encodeURIComponent(p.id)}${dt}">${icon("play")} Dạy</a>
                  <button class="btn sm" data-go="${u.esc(p.id)}" data-t="giaoan">Giáo án</button><button class="btn sm" data-go="${u.esc(p.id)}" data-t="ppt">PPT</button>
                  <button class="btn sm ghost" data-del="${u.esc(p.id)}" title="Xoá bản nháp">✕</button></div></article>`;
              })
              .join("")}</div>`
          : `<div class="card center" style="padding:40px"><h2>Chưa có tiết học nào</h2><p class="muted">Bắt đầu từ một bài trong SGK: chọn hoạt động, để trợ lý AI dựng tiết học, rồi chỉnh sửa trực quan.</p></div>`
      }`;
    u.$("#nw").onclick = () => ((cur = null), go("tao"));
    u.$$("[data-open]").forEach((b) => (b.onclick = () => openPack(list.find((p) => p.id === b.dataset.open), "soan")));
    u.$$("[data-go]").forEach((b) => (b.onclick = () => openPack(list.find((p) => p.id === b.dataset.go), b.dataset.t)));
    u.$$("[data-del]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (!(await u.confirm("Xoá bản nháp này? (Bản đã đăng trên thư viện trường không bị ảnh hưởng.)", "Xoá"))) return;
          await Lib.drafts.remove(b.dataset.del, teacher);
          if (cur && cur.id === b.dataset.del) cur = null;
          mine(pane);
        })
    );
    u.$("#imp").onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const v = Pack.validate(Pack.parse(await f.text()));
        if (v.errors.length) return u.toast("Tệp còn lỗi: " + v.errors[0], "bad", 5000);
        await Lib.drafts.save(v.pack, teacher);
        u.toast("Đã nhập vào tiết của tôi.", "ok");
        mine(pane);
      } catch (err) {
        u.toast("Không đọc được tệp JSON.", "bad");
      }
    };
  }
  function openPack(p, t) {
    if (!p) return;
    cur = Pack.normalize(p);
    dirty = false;
    go(t || "soan");
  }

  /* ================= Tạo tiết mới (4 bước) ================= */
  const WKEY = "l360:wiz2";
  function wizState() {
    let w = {};
    try {
      w = JSON.parse(localStorage.getItem(WKEY) || "{}");
    } catch (e) {}
    w = Object.assign({ level: "thpt", subject: (teacher.subjects || [])[0] || "lich-su", grade: 10, book: "", bai: "", so: 1, tong: 1, duration: 45, groups: 4, size: 30, acts: ["bai-giang", "o-chu", "trac-nghiem", "phieu-thoat"], qkinds: ["mcq", "tf"], style: "", palette: "", content: "", step: 1 }, w);
    const qb = u.qs("bai");
    if (qb && C.lesson(qb)) {
      const l = C.lesson(qb);
      Object.assign(w, { bai: qb, subject: l.subject, grade: Number(l.grade), book: l.bookId + (l.part || ""), level: Number(l.grade) <= 9 ? "thcs" : "thpt", step: 1 });
    } else if (u.qs("mon")) Object.assign(w, { subject: u.qs("mon"), grade: Number(u.qs("lop")) || w.grade, bai: "", step: 1 });
    return w;
  }
  function wizard(pane) {
    const w = wizState();
    const save = () => localStorage.setItem(WKEY, JSON.stringify(w));
    const draw = () => {
      save();
      const subj = C.subject(w.subject) || C.subjects[0];
      const grades = C.gradesFor(subj.id);
      if (!grades.includes(Number(w.grade))) w.grade = grades[0];
      w.level = Number(w.grade) <= 9 ? "thcs" : "thpt";
      const books = C.lessons(subj.id, w.grade);
      if (!books.find((x) => x.book.id + (x.book.part || "") === w.book)) w.book = books.length ? books[0].book.id + (books[0].book.part || "") : "";
      const bk = books.find((x) => x.book.id + (x.book.part || "") === w.book);
      const les = bk ? bk.lessons : [];
      if (w.bai && !les.find((l) => l.key === w.bai)) {
        const other = books.find((x) => x.lessons.some((l) => l.key === w.bai));
        if (!other) w.bai = "";
      }
      const lesson = w.bai ? C.lesson(w.bai) : null;
      const allowed = A.allowedPhases({ so: w.so, tong: w.tong });
      if (!w.style) Object.assign(w, L360.Design.suggest(subj.id === "lich-su" && Number(w.grade) <= 9 ? "lsdl-ls" : subj.id));
      const stepper = [
        [1, "Bài học"],
        [2, "Hoạt động"],
        [3, "Phong cách"],
        [4, "Trợ lý AI"]
      ]
        .map(([n, l]) => `<button class="wz-s ${w.step === n ? "on" : ""} ${w.step > n ? "done" : ""}" data-step="${n}"><span>${w.step > n ? "✓" : n}</span>${l}</button>`)
        .join("");
      let body = "";
      if (w.step === 1) {
        let ch = "";
        const opts = les
          .map((l) => {
            const g = l.chuong !== ch ? `${ch ? "</optgroup>" : ""}<optgroup label="${u.esc(l.chuong || "Bài học")}">` : "";
            ch = l.chuong;
            return `${g}<option value="${u.esc(l.key)}" ${l.key === w.bai ? "selected" : ""}>${u.esc(l.label)}</option>`;
          })
          .join("");
        body = `<div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:18px">
          <section class="card"><h2>Chọn bài trong SGK</h2>
            <div class="row" style="margin:6px 0 12px"><div class="seg">${C.levels.map((lv) => `<button class="${w.level === lv.id ? "on" : ""}" data-lv="${lv.id}">${u.esc(lv.name)}</button>`).join("")}</div></div>
            <div class="chips">${C.subjects
              .filter((s) => s.levels.includes(w.level))
              .map((s) => `<button class="chip ${s.id === subj.id ? "sel" : ""}" data-sj="${s.id}">${icon(s.icon)} ${u.esc(C.subjectName(s.id, w.level === "thcs" ? 6 : 10))}</button>`)
              .join("")}${(C.future[w.level] || []).map((f) => `<span class="chip chip-off" title="Hướng mở rộng sau">${u.esc(f)}</span>`).join("")}</div>
            <div class="row" style="margin:12px 0"><div class="seg">${grades.map((g) => `<button class="${Number(w.grade) === g ? "on" : ""}" data-g="${g}">Lớp ${g}</button>`).join("")}</div>
              ${books.length > 1 ? `<div class="seg">${books.map((b) => `<button class="${b.book.id + (b.book.part || "") === w.book ? "on" : ""}" data-bk="${b.book.id + (b.book.part || "")}">${u.esc(b.book.local ? "Tỉnh " + ((b.book.title.match(/tỉnh (.+?) –/) || [])[1] || "") : b.book.title.replace(/^.*?(tập một|tập hai|Chuyên đề.*)$/i, (m, x) => x[0].toUpperCase() + x.slice(1)))}</button>`).join("")}</div>` : ""}</div>
            ${les.length ? `<label class="field">Bài<select id="bai"><option value="">– Chọn bài –</option>${opts}${ch ? "</optgroup>" : ""}</select></label>` : `<p class="muted">Sách này chưa có mục lục trong dữ liệu – thầy cô vẫn có thể soạn bằng cách nhập tên bài.</p><label class="field">Tên bài<input id="baiTen" value="${u.esc(w.baiTen || "")}"></label>`}
            ${lesson ? `<div class="card flat st-lesson"><div class="small muted">${u.esc(lesson.bookTitle || "")}${lesson.chuong ? " · " + u.esc(lesson.chuong) : ""}</div><b>${u.esc(lesson.label)}</b>
              <div class="row small" style="margin-top:6px">${lesson.trang ? `<span>Trang ${lesson.trang}</span>` : ""}${C.lessonUrl(lesson) ? `<a href="${u.esc(C.lessonUrl(lesson))}" target="_blank" rel="noopener">${icon("sgk")} Mở SGK đúng trang ↗</a>` : ""}${
                C.eduVideos(lesson).length ? `<span class="pill accent">${C.eduVideos(lesson).length} video EduHistory</span>` : ""
              }</div></div>` : ""}</section>
          <section class="card"><h2>Tiết học</h2>
            <div class="grid g2"><label class="field">Tiết thứ<input type="number" min="1" id="so" value="${w.so}"></label><label class="field">Bài có tổng số tiết<input type="number" min="1" id="tong" value="${w.tong}"></label>
              <label class="field">Thời lượng (phút)<input type="number" id="dur" value="${w.duration}"></label><label class="field">Số nhóm<input type="number" min="2" max="6" id="grp" value="${w.groups}"></label></div>
            <p class="small st-rule">Mỗi bài chỉ có <b>1 khởi động</b> (ở tiết đầu), <b>1 luyện tập</b> và <b>1 vận dụng</b> (ở tiết cuối). Tiết ${w.so}/${w.tong} dùng các pha: <b>${allowed.map((x) => L360.phase(x).name).join(" · ")}</b>.</p>
            <label class="field">Nội dung tiết này (không bắt buộc)<textarea id="ct" rows="3" placeholder="Ví dụ: mục 1 và 2 của bài; trọng tâm…">${u.esc(w.content || "")}</textarea></label></section></div>`;
      } else if (w.step === 2) {
        body = `<section class="card"><div class="row"><h2 class="grow" style="margin:0">Tích chọn hoạt động cho tiết ${w.so}/${w.tong}</h2><span class="small muted">Đã chọn ${w.acts.filter((id) => (A.ACTS.find((a) => a.id === id) || {}).phase && allowed.includes(A.ACTS.find((a) => a.id === id).phase)).length + (w.acts.includes("bai-giang") ? 0 : 1)} hoạt động</span></div>
          <p class="small muted">Trợ lý AI dựng đúng các hoạt động được chọn. Khởi động, luyện tập, vận dụng: chọn <b>1</b> hoạt động mỗi pha (nhiều câu hỏi gộp trong một hoạt động).</p>
          <div class="st-acts">${L360.PHASES.map((ph) => {
            const ok = allowed.includes(ph.id);
            const list = A.ACTS.filter((a) => a.phase === ph.id);
            return `<div class="st-ph ${ok ? "" : "off"}" style="--c:${PH_COL[ph.id]}"><div class="st-ph-h"><span>${ph.short}</span>${ph.name}${ok ? "" : `<em>không thuộc tiết này</em>`}</div>${list
              .map((a) => {
                const on = a.always || w.acts.includes(a.id);
                return `<label class="st-act ${on ? "on" : ""} ${!ok ? "dis" : ""}"><input type="${ph.id === "hinh-thanh" ? "checkbox" : "radio"}" name="act-${ph.id}" data-act="${a.id}" ${on ? "checked" : ""} ${a.always || !ok ? "disabled" : ""}>
                  <span><b>${u.esc(a.label)}</b><small>${u.esc(a.hint)}</small></span></label>`;
              })
              .join("")}${ph.id !== "hinh-thanh" && ok ? `<button class="btn sm ghost" data-none="${ph.id}">Bỏ chọn</button>` : ""}</div>`;
          }).join("")}</div>
          ${w.acts.includes("trac-nghiem") && allowed.includes("luyen-tap") ? `<div class="row" style="margin-top:12px"><b class="small">Dạng câu hỏi trắc nghiệm:</b>${A.QKINDS.map(([k, l]) => `<label class="chip ${w.qkinds.includes(k) ? "sel" : ""}"><input type="checkbox" data-qk="${k}" ${w.qkinds.includes(k) ? "checked" : ""} hidden>${u.esc(l)}</label>`).join("")}</div>` : ""}</section>`;
      } else if (w.step === 3) {
        const sug = L360.Design.suggest(subj.id === "lich-su" && Number(w.grade) <= 9 ? "lsdl-ls" : subj.id);
        body = `<section class="card"><div class="row"><h2 class="grow" style="margin:0">Phong cách trình bày</h2><button class="btn sm" id="sug">Gợi ý cho môn ${u.esc(subj.name)}</button></div>
          <p class="small muted">Áp dụng cho màn chiếu, máy học sinh, bài giảng PowerPoint. Đổi lại bất cứ lúc nào trong trình soạn.</p>
          <div class="grid g4 st-styles">${L360.Design.styles
            .map((s) => `<button class="st-style ${s.id === w.style ? "on" : ""}" data-style="${s.id}">${L360.Design.preview(s.id, s.id === w.style ? w.palette : s.palette, s.name)}<b>${u.esc(s.name)}${s.id === sug.style ? ` <span class="pill accent">gợi ý</span>` : ""}</b><small>${u.esc(s.hint)}</small></button>`)
            .join("")}</div>
          <h3 style="margin-top:18px">Bảng màu</h3><div class="st-pals">${L360.Design.palettes
            .map((p) => `<button class="st-pal ${p.id === w.palette ? "on" : ""}" data-pal="${p.id}" title="${u.esc(p.hint)}"><span class="sw"><i style="background:${p.accent}"></i><i style="background:${p.soft}"></i><i style="background:${p.bg}"></i></span><span class="tx"><b>${u.esc(p.name)}</b><small>${u.esc(p.hint)}</small></span></button>`)
            .join("")}</div></section>`;
      } else {
        body = `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px">
          <section class="card"><h2>Gửi cho trợ lý AI</h2>
            <ol class="small st-ol"><li>Bấm <b>Sao chép lời nhắc</b>.</li><li>Mở Claude / ChatGPT / Gemini, <b>đính kèm giáo án</b> (Word/PDF) hoặc dán nội dung, rồi dán lời nhắc và gửi.</li><li>Sao chép toàn bộ câu trả lời, dán vào ô bên phải.</li></ol>
            <div class="row"><button class="btn primary" id="copyP">${icon("copy")} Sao chép lời nhắc</button>${AI_LINKS.map(([n, l]) => `<a class="btn sm" href="${l}" target="_blank" rel="noopener">${n} ↗</a>`).join("")}</div>
            <p class="small muted" style="margin-top:10px">Không có giáo án sẵn? Trợ lý AI vẫn soạn được theo SGK – thầy cô kiểm tra lại nội dung trước khi dạy.</p>
            <details style="margin-top:6px"><summary class="small">Xem lời nhắc</summary><pre id="pv" class="st-pre"></pre></details>
            <hr><button class="btn" id="blank">Không dùng AI – tạo khung từ các hoạt động đã chọn</button></section>
          <section class="card"><h2>Dán kết quả</h2><textarea id="res" rows="14" placeholder="Dán câu trả lời của trợ lý AI (có khối \`\`\`json … \`\`\`) vào đây…"></textarea>
            <div class="row" style="margin-top:10px"><button class="btn primary" id="check">Kiểm tra & mở trình soạn</button><span class="small muted" id="timer"></span></div><div id="out" style="margin-top:12px"></div></section></div>`;
      }
      pane.innerHTML = `<div class="wz">${stepper}</div>${body}<div class="row" style="margin-top:16px">${w.step > 1 ? `<button class="btn" id="prev">‹ Quay lại</button>` : ""}<span class="spacer"></span>${
        w.step < 4 ? `<button class="btn primary lg" id="next">Tiếp tục ›</button>` : ""
      }</div>`;
      bind();
    };
    const opts = () => {
      const subj = C.subject(w.subject);
      const lesson = w.bai ? C.lesson(w.bai) : null;
      return {
        subjectId: w.subject,
        subject: C.subjectName(w.subject, w.grade),
        grade: String(w.grade),
        book: lesson ? lesson.bookTitle : "",
        bai: lesson ? { key: lesson.key, so: lesson.so, ten: lesson.ten, trang: lesson.trang, chuong: lesson.chuong } : { key: "", so: "", ten: w.baiTen || "" },
        tiet: { so: Number(w.so) || 1, tong: Math.max(Number(w.so) || 1, Number(w.tong) || 1) },
        duration: Number(w.duration) || 45,
        groups: Number(w.groups) || 4,
        size: Number(w.size) || 30,
        acts: w.acts,
        qkinds: w.qkinds,
        design: { style: w.style, palette: w.palette },
        videos: lesson ? C.eduVideos(lesson) : [],
        content: w.content,
        _subj: subj
      };
    };
    const bind = () => {
      u.$$("[data-step]").forEach((b) => (b.onclick = () => ((w.step = Number(b.dataset.step)), draw())));
      const nx = u.$("#next");
      if (nx)
        nx.onclick = () => {
          if (w.step === 1 && !w.bai && !w.baiTen) return u.toast("Hãy chọn bài trong SGK.", "bad");
          w.step++;
          draw();
        };
      const pv = u.$("#prev");
      if (pv) pv.onclick = () => (w.step--, draw());
      u.$$("[data-lv]").forEach((b) => (b.onclick = () => ((w.level = b.dataset.lv), (w.grade = b.dataset.lv === "thcs" ? 6 : 10), (w.bai = ""), (w.style = ""), draw())));
      u.$$("[data-sj]").forEach((b) => (b.onclick = () => ((w.subject = b.dataset.sj), (w.bai = ""), (w.book = ""), (w.style = ""), draw())));
      u.$$("[data-g]").forEach((b) => (b.onclick = () => ((w.grade = Number(b.dataset.g)), (w.bai = ""), (w.book = ""), draw())));
      u.$$("[data-bk]").forEach((b) => (b.onclick = () => ((w.book = b.dataset.bk), (w.bai = ""), draw())));
      const sel = u.$("#bai");
      if (sel) sel.onchange = () => ((w.bai = sel.value), draw());
      const bt = u.$("#baiTen");
      if (bt) bt.oninput = () => ((w.baiTen = bt.value), save());
      [
        ["#so", "so"],
        ["#tong", "tong"],
        ["#dur", "duration"],
        ["#grp", "groups"]
      ].forEach(([id, k]) => {
        const el = u.$(id);
        if (el)
          el.onchange = () => {
            w[k] = Math.max(1, Number(el.value) || 1);
            if (k === "so" && w.so > w.tong) w.tong = w.so;
            draw();
          };
      });
      const ct = u.$("#ct");
      if (ct) ct.oninput = () => ((w.content = ct.value), save());
      u.$$("[data-act]").forEach(
        (el) =>
          (el.onchange = () => {
            const a = A.ACTS.find((x) => x.id === el.dataset.act);
            if (a.phase !== "hinh-thanh") w.acts = w.acts.filter((id) => (A.ACTS.find((x) => x.id === id) || {}).phase !== a.phase);
            if (el.checked) w.acts.push(a.id);
            else w.acts = w.acts.filter((id) => id !== a.id);
            w.acts = [...new Set(w.acts)];
            draw();
          })
      );
      u.$$("[data-none]").forEach((b) => (b.onclick = () => ((w.acts = w.acts.filter((id) => (A.ACTS.find((x) => x.id === id) || {}).phase !== b.dataset.none)), draw())));
      u.$$("[data-qk]").forEach(
        (el) =>
          (el.onchange = () => {
            w.qkinds = el.checked ? [...new Set(w.qkinds.concat(el.dataset.qk))] : w.qkinds.filter((k) => k !== el.dataset.qk);
            if (!w.qkinds.length) w.qkinds = ["mcq"];
            draw();
          })
      );
      u.$$("[data-style]").forEach((b) => (b.onclick = () => ((w.style = b.dataset.style), (w.palette = L360.Design.style(w.style).palette), draw())));
      u.$$("[data-pal]").forEach((b) => (b.onclick = () => ((w.palette = b.dataset.pal), draw())));
      const sg = u.$("#sug");
      if (sg) sg.onclick = () => ((w.style = ""), draw());
      if (w.step === 4) {
        const o = opts();
        u.$("#pv").textContent = A.prompt(o);
        u.$("#copyP").onclick = async () => {
          const ok = await u.copy(A.prompt(o));
          localStorage.setItem("l360:aiStart", String(Date.now()));
          u.toast(ok ? "Đã sao chép. Dán vào trợ lý AI cùng giáo án." : "Không sao chép được – mở “Xem lời nhắc” để chép tay.", ok ? "ok" : "bad");
        };
        u.$("#blank").onclick = () => startPack(skeleton(o), o, false);
        u.$("#check").onclick = () => {
          const out = u.$("#out");
          let raw;
          try {
            raw = Pack.parse(u.$("#res").value);
          } catch (e) {
            out.innerHTML = `<p class="pill bad" style="white-space:normal">Không tìm thấy JSON hợp lệ. Hãy sao chép cả khối \`\`\`json … \`\`\`.</p>`;
            return;
          }
          const v = Pack.validate(raw);
          if (v.errors.length) {
            out.innerHTML = `<div class="card flat" style="border-color:var(--bad)"><b style="color:var(--bad)">${v.errors.length} lỗi cần sửa</b><ul class="small">${v.errors.map((e) => `<li>${u.esc(e)}</li>`).join("")}</ul>
              <div class="row"><button class="btn sm primary" id="fix">${icon("copy")} Sao chép lời nhắc sửa lỗi</button><button class="btn sm" id="force">Vẫn mở để tự sửa</button></div></div>`;
            u.$("#fix").onclick = async () => (await u.copy(A.fixPrompt(v.errors, v.warnings))) && u.toast("Đã sao chép – dán tiếp vào cuộc trò chuyện với trợ lý AI.", "ok");
            u.$("#force").onclick = () => startPack(raw, o, true);
            return;
          }
          startPack(raw, o, true);
        };
      }
    };
    draw();
  }
  // Khung tiết học không cần AI: lấy mẫu của các hoạt động đã chọn.
  function skeleton(o) {
    const allowed = A.allowedPhases(o.tiet);
    const steps = [];
    A.ACTS.filter((a) => (a.always || o.acts.includes(a.id)) && allowed.includes(a.phase)).forEach((a) => {
      const types = a.id === "nhom" ? ["groupwork", "expo"] : [a.type];
      types.forEach((t) => {
        const s = L360.types[t].template();
        s.id = "s" + u.uid(4);
        s.phase = a.phase;
        if (a.id === "bai-giang") s.title = "Tìm hiểu kiến thức mới";
        steps.push(s);
      });
    });
    const order = { "khoi-dong": 0, "hinh-thanh": 1, "luyen-tap": 2, "van-dung": 3 };
    steps.sort((a, b) => order[a.phase] - order[b.phase]);
    return { title: o.bai.ten || "Tiết học mới", steps };
  }
  async function startPack(raw, o, ai) {
    const p = Object.assign({}, raw);
    p.subjectId = o.subjectId;
    p.subject = o.subject;
    p.grade = o.grade;
    p.bai = Object.assign({}, o.bai, { trang: undefined, chuong: undefined });
    delete p.bai.trang;
    delete p.bai.chuong;
    p.tiet = o.tiet;
    p.duration = o.duration;
    p.design = Object.assign({}, o.design, raw.design && raw.design.style ? {} : {});
    p.meta = Object.assign({}, p.meta, { madeWithAI: !!ai, authorUid: teacher.uid, authorName: teacher.name || "" });
    const t0 = Number(localStorage.getItem("l360:aiStart"));
    if (ai && t0) p.meta.prepMinutes = Math.max(1, Math.round((Date.now() - t0) / 60000));
    p.id = "";
    cur = Pack.normalize(p);
    cur.id = u.slug(`${cur.subjectId}-${cur.grade}-bai${cur.bai.so || ""}-tiet${cur.tiet.so}`).slice(0, 50) + "-" + u.uid(4).toLowerCase();
    await saveDraft(true);
    dirty = false;
    u.toast(ai ? "Đã nhận tiết học từ trợ lý AI. Đang tìm ảnh minh hoạ…" : "Đã tạo khung tiết học.", "ok");
    go("soan");
    if (ai) autoImages(true);
  }

  /* ================= Trình soạn ================= */
  let openStep = 0;
  let openPage = 0;
  function editor(pane) {
    if (!cur) return needPack(pane, "Mở một tiết trong “Tiết của tôi”, nhân bản từ Thư viện trường, hoặc tạo tiết mới.");
    const p = cur;
    const subjOpts = C.subjects.map((s) => `<option value="${s.id}" ${s.id === p.subjectId ? "selected" : ""}>${u.esc(s.name)}</option>`).join("");
    pane.innerHTML = `<div class="st-ed">
      <div class="col" style="min-width:0">
        <section class="card"><div class="row"><h2 class="grow" style="margin:0">Thông tin tiết học</h2>${p.bai.key ? `<span class="pill accent">${u.esc(Pack.label(p))}</span>` : ""}</div>
          <div class="grid g2" style="margin-top:10px">
            <label class="field" style="grid-column:1/-1">Tên tiết học<input data-pk="title" value="${u.esc(p.title)}"></label>
            <label class="field">Môn<select data-pk="subjectId">${subjOpts}</select></label><label class="field">Lớp<input data-pk="grade" value="${u.esc(p.grade)}"></label>
            <label class="field">Bài số<input data-pk="bai.so" value="${u.esc(p.bai.so || "")}"></label><label class="field">Tên bài<input data-pk="bai.ten" value="${u.esc(p.bai.ten || "")}"></label>
            <label class="field">Tiết thứ<input type="number" min="1" data-pk="tiet.so" value="${p.tiet.so}"></label><label class="field">Tổng số tiết của bài<input type="number" min="1" data-pk="tiet.tong" value="${p.tiet.tong}"></label>
            <label class="field">Thời lượng (phút)<input type="number" data-pk="duration" value="${p.duration}"></label>
            <label class="field">Tên nhóm (cách nhau dấu phẩy)<input data-pk="groups" value="${u.esc((p.groups || []).map((g) => g.name).join(", "))}" placeholder="Nhóm 1, Nhóm 2…"></label></div>
          <label class="field" style="margin-top:8px">Mục tiêu (mỗi dòng một mục tiêu)<textarea data-pk="objectives" rows="3">${u.esc(p.objectives.join("\n"))}</textarea></label>
          <details style="margin-top:8px"><summary><b>Phong cách & màu</b> <span class="small muted">${u.esc(L360.Design.style(p.design.style).name)} · ${u.esc(L360.Design.palette(p.design.palette).name)}</span></summary>
            <div class="grid g4 st-styles sm" style="margin-top:10px">${L360.Design.styles
              .map((s) => `<button class="st-style ${s.id === p.design.style ? "on" : ""}" data-dstyle="${s.id}">${L360.Design.preview(s.id, s.id === p.design.style ? p.design.palette : s.palette, s.name)}<b>${u.esc(s.name)}</b></button>`)
              .join("")}</div>
            <div class="st-pals sm" style="margin-top:10px">${L360.Design.palettes
              .map((x) => `<button class="st-pal ${x.id === p.design.palette ? "on" : ""}" data-dpal="${x.id}" title="${u.esc(x.hint)}"><span class="sw"><i style="background:${x.accent}"></i><i style="background:${x.soft}"></i><i style="background:${x.bg}"></i></span><span class="tx"><b>${u.esc(x.name)}</b></span></button>`)
              .join("")}</div></details></section>
        <div id="stepsEd" class="col"></div>
        <section class="card"><h3>Thêm hoạt động</h3><div class="grid g3">${L360.typeOrder
          .map((t) => {
            const T = L360.types[t];
            return `<button class="opt st-add" data-add="${t}"><b>${T.icon || ""} ${u.esc(T.label)}</b><span class="small muted">${u.esc(T.desc || "")}</span></button>`;
          })
          .join("")}</div></section></div>
      <aside class="st-side"><section class="card"><h3>Xem trước</h3><div id="prev" class="host-prev st-prev"></div></section>
        <section class="card"><h3>Kiểm tra</h3><div id="val"></div>
          <div class="col" style="margin-top:12px;gap:8px"><button class="btn" id="imgs">${icon("image")} Tìm ảnh cho khối còn thiếu</button>
          <button class="btn primary" id="saveB">${icon("save")} Lưu nháp</button><button class="btn" id="pub">${icon("upload")} Đăng lên thư viện trường</button>
          <a class="btn" id="teach" href="#">${icon("play")} Dạy thử</a><div class="row" style="gap:6px"><button class="btn sm grow" data-goto="giaoan">Giáo án Word</button><button class="btn sm grow" data-goto="ppt">PowerPoint</button></div>
          <button class="btn sm ghost" id="dl">Tải tệp .json</button></div></section></aside></div>`;
    drawSteps();
    validate();
    u.$$("[data-pk]", pane).forEach((el) =>
      el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
        const k = el.dataset.pk;
        let v = el.value;
        if (k === "objectives") v = v.split("\n").map((x) => x.trim()).filter(Boolean);
        else if (k === "groups") {
          const names = v.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 6);
          v = names.length ? names.map((n, i) => Object.assign({}, (p.groups || [])[i] || {}, { name: n })) : null;
        } else if (["duration", "tiet.so", "tiet.tong"].includes(k)) v = Math.max(1, Number(v) || 1);
        setP(p, k, v);
        if (k === "groups" && v == null) p.groups = null;
        if (k === "subjectId") p.subject = C.subjectName(v, p.grade);
        changed();
      })
    );
    u.$$("[data-dstyle]", pane).forEach((b) => (b.onclick = () => ((p.design.style = b.dataset.dstyle), (p.design.palette = L360.Design.style(p.design.style).palette), changed(), editor(pane))));
    u.$$("[data-dpal]", pane).forEach((b) => (b.onclick = () => ((p.design.palette = b.dataset.dpal), changed(), editor(pane))));
    u.$$("[data-add]", pane).forEach(
      (b) =>
        (b.onclick = () => {
          const s = L360.types[b.dataset.add].template();
          s.id = "s" + u.uid(4);
          if (!s.phase) s.phase = "hinh-thanh";
          p.steps.push(s);
          changed();
          drawSteps(p.steps.length - 1);
          setTimeout(() => u.$(`[data-step="${p.steps.length - 1}"]`).scrollIntoView({ behavior: "smooth", block: "center" }), 50);
        })
    );
    u.$$("[data-goto]", pane).forEach((b) => (b.onclick = () => go(b.dataset.goto)));
    u.$("#imgs").onclick = () => autoImages(false);
    u.$("#saveB").onclick = () => saveDraft(false);
    u.$("#pub").onclick = publish;
    u.$("#teach").onclick = async (e) => {
      e.preventDefault();
      await saveDraft(true);
      location.href = `giaovien.html?pack=${encodeURIComponent(cur.id)}&che-do=dien-tap`;
    };
    u.$("#dl").onclick = () => u.download(`${cur.id}.l360.json`, JSON.stringify(cur, null, 2), "application/json");
  }
  const getP = (o, path) => path.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
  const setP = (o, path, v) => {
    const ks = path.split(".");
    let c = o;
    ks.slice(0, -1).forEach((k) => (c = c[k] = c[k] && typeof c[k] === "object" ? c[k] : {}));
    if (v === "" || v == null) delete c[ks[ks.length - 1]];
    else c[ks[ks.length - 1]] = v;
  };

  /* ----- Danh sách bước, nhóm theo pha ----- */
  function drawSteps(focus) {
    if (focus != null) {
      openStep = focus;
      openPage = 0;
    }
    const p = cur;
    const box = u.$("#stepsEd");
    let last = "";
    box.innerHTML = p.steps
      .map((s, i) => {
        const T = L360.types[s.type] || { label: s.type, fields: [] };
        const open = i === openStep;
        const head = s.phase !== last ? `<div class="st-phase" style="--c:${PH_COL[s.phase]}"><span>${L360.phase(s.phase).short}</span>${u.esc(L360.phase(s.phase).name)}</div>` : "";
        last = s.phase;
        const ghi = (s.pages || []).some((pg) => L360.blocks.hasNote(pg)) || s.ghiBai;
        return `${head}<section class="card st-step ${open ? "open" : ""}" data-step="${i}" style="--c:${PH_COL[s.phase]}"><div class="row nowrap"><span class="pill">${i + 1}</span><b class="grow ellipsis" style="cursor:pointer" data-toggle="${i}">${T.icon || ""} ${u.esc(s.title)} <span class="small muted">· ${u.esc(
          T.label
        )} · ${s.minutes || 0}′</span>${ghi ? ` <span class="ghi-badge sm" title="Có nội dung ghi vở">${icon("ghiBai")}</span>` : ""}</b>
          <button class="btn sm ghost" data-mv="${i}" data-d="-1" ${i === 0 ? "disabled" : ""} title="Lên">▲</button><button class="btn sm ghost" data-mv="${i}" data-d="1" ${i === p.steps.length - 1 ? "disabled" : ""} title="Xuống">▼</button>
          <button class="btn sm ghost" data-dup="${i}" title="Nhân bản">⧉</button><button class="btn sm ghost" data-rm="${i}" title="Xoá">✕</button></div>
          ${open ? stepBody(s, i, T) : ""}</section>`;
      })
      .join("");
    bindSteps(box);
    preview();
  }
  function stepBody(s, i, T) {
    const allowed = A.allowedPhases(cur.tiet);
    return `<div class="col" style="margin-top:12px">
      <div class="grid g3"><label class="field" style="grid-column:span 2">Tên hoạt động<input data-si="${i}" data-k="title" value="${u.esc(s.title)}"></label>
        <label class="field">Số phút<input type="number" data-si="${i}" data-k="minutes" data-kind="number" value="${s.minutes || ""}"></label>
        <label class="field">Pha<select data-si="${i}" data-k="phase" data-kind="select">${L360.PHASES.map((ph) => `<option value="${ph.id}" ${s.phase === ph.id ? "selected" : ""} ${allowed.includes(ph.id) ? "" : "disabled"}>${ph.name}</option>`).join("")}</select></label>
        <label class="field" style="grid-column:span 2">Nhiệm vụ cho học sinh (1 câu)<input data-si="${i}" data-k="instructions" value="${u.esc(s.instructions || "")}"></label></div>
      <label class="field">Lời dẫn cho giáo viên<textarea data-si="${i}" data-k="script" rows="2">${u.esc(s.script || "")}</textarea></label>
      ${s.type === "slide" ? pagesEd(s, i) : ""}
      ${s.type === "quiz" || s.type === "video" ? questionsEd(s, i) : ""}
      ${s.type === "crossword" ? cwEd(s, i) : ""}
      ${s.type === "video" ? videoEd(s, i) : ""}
      ${(T.fields || [])
        .filter((f) => !["pages", "questions", "cwrows", "video"].includes(f.kind) && !["keyword", "keyClue", "rows", "source"].includes(f.key) && !(s.type === "slide" && f.key.startsWith("media.")))
        .map((f) => fieldHtml(s, f, i))
        .join("")}
      ${s.type !== "slide" ? `<label class="field">${icon("ghiBai")} Nội dung học sinh ghi vở sau hoạt động (không bắt buộc)<textarea data-si="${i}" data-k="ghiBai" rows="2" placeholder="- Ý chính cần ghi">${u.esc(s.ghiBai || "")}</textarea></label>` : ""}
      <details><summary class="small">JSON nâng cao của bước này</summary><textarea class="mono" data-raw="${i}" rows="8">${u.esc(JSON.stringify(s, null, 1))}</textarea><button class="btn sm" data-rawapply="${i}">Áp dụng JSON</button></details></div>`;
  }

  /* ----- Trang bài giảng & khối ----- */
  const LINES = {
    // Chuyển khối có cấu trúc ↔ các dòng "a | b | c" để sửa nhanh.
    timeline: [(b) => (b.items || []).map((x) => [x.time || x.year || "", x.label || "", x.desc || ""].join(" | ")).join("\n"), (t, b) => (b.items = rows(t).map((r) => ({ time: r[0], label: r[1] || "", desc: r[2] || "" }))), "Mốc | Sự kiện | Mô tả ngắn"],
    mindmap: [(b) => (b.branches || []).map((x) => `${x.label}: ${(x.items || []).join("; ")}`).join("\n"), (t, b) => (b.branches = lines(t).map((l) => ({ label: l.split(":")[0].trim(), items: (l.split(":").slice(1).join(":") || "").split(";").map((x) => x.trim()).filter(Boolean) }))), "Nhánh: ý 1; ý 2"],
    compare: [(b) => [b.columns || []].concat(b.rows || []).map((r) => r.join(" | ")).join("\n"), (t, b) => {
      const r = rows(t);
      b.columns = r[0] || [];
      b.rows = r.slice(1);
    }, "Dòng đầu là tiêu đề cột: Tiêu chí | A | B"],
    flow: [(b) => (b.steps || []).map((x) => (typeof x === "string" ? x : [x.label, x.desc || ""].filter(Boolean).join(" | "))).join("\n"), (t, b) => (b.steps = rows(t).map((r) => ({ label: r[0], desc: r[1] || "" }))), "Bước | Mô tả ngắn"],
    cycle: [(b) => (b.items || []).map((x) => (typeof x === "string" ? x : x.label)).join("\n"), (t, b) => (b.items = lines(t)), "Mỗi dòng một khâu"],
    stats: [(b) => (b.items || []).map((x) => [x.value, x.label].join(" | ")).join("\n"), (t, b) => (b.items = rows(t).map((r) => ({ value: r[0], label: r[1] || "" }))), "Số liệu | Ý nghĩa (chỉ số liệu có trong SGK)"],
    keyterms: [(b) => (b.items || []).map((x) => [x.term, x.def].join(" | ")).join("\n"), (t, b) => (b.items = rows(t).map((r) => ({ term: r[0], def: r[1] || "" }))), "Thuật ngữ | Giải thích"],
    list: [(b) => (b.items || []).map((x) => (typeof x === "string" ? x : x.text)).join("\n"), (t, b) => (b.items = lines(t)), "Mỗi dòng một ý"],
    map: [(b) => (b.pins || []).map((x) => [x.x, x.y, x.label].join(" | ")).join("\n"), (t, b) => (b.pins = rows(t).map((r) => ({ x: Number(r[0]) || 0, y: Number(r[1]) || 0, label: r[2] || "" }))), "Ghim: x% | y% | tên địa danh"]
  };
  const lines = (t) => String(t || "").split("\n").map((x) => x.trim()).filter(Boolean);
  const rows = (t) => lines(t).map((l) => l.split("|").map((x) => x.trim()));
  const KIND_NAME = Object.fromEntries(L360.blocks.kinds);
  function imgEd(im, path, i) {
    return `<div class="st-img"><div class="st-thumb">${im.src ? `<img src="${u.esc(im.src)}" alt="">` : `<span>${icon("image")}</span>`}</div><div class="col grow" style="gap:6px;min-width:0">
      <div class="row nowrap"><input data-si="${i}" data-bp="${path}.query" value="${u.esc(im.query || "")}" placeholder="Từ khoá tìm ảnh"><button class="btn sm primary" data-pick="${path}" data-si="${i}">Chọn ảnh</button>${im.src ? `<button class="btn sm ghost" data-unimg="${path}" data-si="${i}" title="Bỏ ảnh">✕</button>` : ""}</div>
      <input data-si="${i}" data-bp="${path}.caption" value="${u.esc(im.caption || "")}" placeholder="Chú thích"><input data-si="${i}" data-bp="${path}.credit" value="${u.esc(im.credit || "")}" placeholder="Nguồn ảnh (tác giả, giấy phép)"></div></div>`;
  }
  function blockEd(b, path, i) {
    const k = b.kind;
    const f = (key, label, ta, rowsN) =>
      ta ? `<label class="field">${label}<textarea data-si="${i}" data-bp="${path}.${key}" rows="${rowsN || 3}">${u.esc(b[key] || "")}</textarea></label>` : `<label class="field">${label}<input data-si="${i}" data-bp="${path}.${key}" value="${u.esc(b[key] || "")}"></label>`;
    let body = "";
    if (k === "image") body = imgEd(b, path, i);
    else if (k === "gallery")
      body = (b.images || []).map((im, j) => imgEd(im, `${path}.images.${j}`, i)).join("") + `<button class="btn sm" data-galadd="${path}" data-si="${i}">+ Ảnh</button>`;
    else if (k === "map") body = imgEd(b, path, i) + `<label class="field">${LINES.map[2]}<textarea data-si="${i}" data-bl="${path}" data-lk="map" rows="3">${u.esc(LINES.map[0](b))}</textarea></label>`;
    else if (k === "video") {
      const vids = cur.bai && cur.bai.key && C.lesson(cur.bai.key) ? C.eduVideos(C.lesson(cur.bai.key)) : [];
      body = `${vids.length ? `<label class="field">Video EduHistory của bài<select data-si="${i}" data-bp="${path}.edu"><option value="">–</option>${vids.map((v) => `<option value="${v.ma}" ${b.edu === v.ma ? "selected" : ""}>${u.esc(v.ma + " – " + v.ten)}</option>`).join("")}</select></label>` : ""}${f("edu", "Mã video EduHistory")}${f("url", "Hoặc đường dẫn YouTube/mp4")}${f("caption", "Tiêu đề")}`;
    } else if (LINES[k]) body = `${k === "mindmap" || k === "cycle" ? f("center", "Ở giữa") : ""}<label class="field">${LINES[k][2]}<textarea data-si="${i}" data-bl="${path}" data-lk="${k}" rows="4">${u.esc(LINES[k][0](b))}</textarea></label>`;
    else if (k === "quote") body = f("text", "Tư liệu", true) + f("source", "Nguồn");
    else if (k === "text") body = f("md", "Nội dung (dòng bắt đầu bằng - là gạch đầu dòng; **đậm**)", true, 4);
    else body = f("text", k === "note" ? `${icon("ghiBai")} Nội dung học sinh ghi vở` : k === "question" ? "Câu hỏi" : "Nội dung", true);
    const titled = !["image", "note", "conclusion", "question"].includes(k);
    return `<div class="st-blk" data-kind="${k}"><div class="row nowrap"><b class="grow small">${u.esc(KIND_NAME[k] || k)}</b>${titled ? `<input class="sm" data-si="${i}" data-bp="${path}.title" value="${u.esc(b.title || "")}" placeholder="Tiêu đề khối (không bắt buộc)" style="max-width:220px">` : ""}
      <button class="btn sm ghost" data-bmv="${path}" data-d="-1" data-si="${i}">▲</button><button class="btn sm ghost" data-bmv="${path}" data-d="1" data-si="${i}">▼</button><button class="btn sm ghost" data-brm="${path}" data-si="${i}">✕</button></div>${body}</div>`;
  }
  function pagesEd(s, i) {
    const pages = s.pages || [];
    const pi = Math.min(openPage, pages.length - 1);
    const pg = pages[pi] || { blocks: [] };
    return `<div class="st-pages"><div class="row"><b>Trang bài giảng</b>${pages
      .map((x, j) => `<button class="btn sm ${j === pi ? "primary" : ""}" data-pg="${j}" data-si="${i}">${j + 1}${L360.blocks.hasNote(x) ? " ✎" : ""}</button>`)
      .join("")}<button class="btn sm" data-pgadd data-si="${i}">+ Trang</button><span class="spacer"></span>${pages.length > 1 ? `<button class="btn sm ghost" data-pgrm="${pi}" data-si="${i}">Xoá trang ${pi + 1}</button>` : ""}</div>
      <div class="grid g2" style="margin-top:8px"><label class="field">Tiêu đề trang<input data-si="${i}" data-bp="pages.${pi}.title" value="${u.esc(pg.title || "")}"></label>
        <label class="field">Bố cục<select data-si="${i}" data-bp="pages.${pi}.layout"><option value="">Tự động</option><option value="split" ${pg.layout === "split" ? "selected" : ""}>Ảnh bên trái – chữ bên phải</option><option value="stack" ${pg.layout === "stack" ? "selected" : ""}>Xếp dọc</option></select></label></div>
      ${(pg.blocks || []).map((b, j) => blockEd(b, `pages.${pi}.blocks.${j}`, i)).join("")}
      <div class="row" style="margin-top:8px"><select id="newBlk" data-si="${i}">${L360.blocks.kinds.map(([k, l]) => `<option value="${k}">${u.esc(l)}</option>`).join("")}</select><button class="btn sm" data-blkadd="${pi}" data-si="${i}">+ Thêm khối</button>
        <span class="small muted">Gợi ý: mỗi trang có 1 hình ảnh/sơ đồ + khung Kết luận hoặc Ghi vở.</span></div></div>`;
  }
  const BLANK = {
    text: { md: "" },
    list: { items: ["", ""] },
    image: { query: "", src: "", caption: "", credit: "" },
    gallery: { images: [{ query: "", src: "" }, { query: "", src: "" }] },
    timeline: { items: [{ time: "", label: "" }, { time: "", label: "" }, { time: "", label: "" }] },
    mindmap: { center: "", branches: [{ label: "", items: [] }, { label: "", items: [] }, { label: "", items: [] }] },
    compare: { columns: ["Tiêu chí", "A", "B"], rows: [["", "", ""]] },
    flow: { steps: [{ label: "" }, { label: "" }, { label: "" }] },
    cycle: { center: "", items: ["", "", ""] },
    stats: { items: [{ value: "", label: "" }] },
    quote: { text: "", source: "" },
    map: { query: "", src: "", pins: [] },
    keyterms: { items: [{ term: "", def: "" }] },
    question: { text: "" },
    conclusion: { text: "" },
    note: { text: "- " },
    video: { edu: "", url: "" }
  };

  /* ----- Câu hỏi ----- */
  function questionsEd(s, i) {
    const qs = s.questions || [];
    return `<div class="field"><b>Câu hỏi</b>${qs
      .map((q, qi) => {
        const kind = q.kind || "mcq";
        let body = "";
        if (kind === "tf")
          body = (q.statements || [])
            .map((st, j) => `<div class="row nowrap" style="margin-top:6px"><b>${"abcd"[j]})</b><input data-si="${i}" data-q="${qi}" data-st="${j}" value="${u.esc(st.text)}"><label class="chip ${st.answer ? "sel" : ""}"><input type="checkbox" data-si="${i}" data-q="${qi}" data-sta="${j}" ${st.answer ? "checked" : ""} hidden>${st.answer ? "Đúng" : "Sai"}</label></div>`)
            .join("");
        else if (kind === "short")
          body = `<div class="grid g2" style="margin-top:6px"><input data-si="${i}" data-q="${qi}" data-qf="answer" value="${u.esc(q.answer == null ? "" : q.answer)}" placeholder="Đáp án"><input data-si="${i}" data-q="${qi}" data-qf="accept" value="${u.esc((q.accept || []).join(", "))}" placeholder="Cách viết khác được chấp nhận (cách nhau dấu phẩy)"></div>`;
        else
          body =
            (q.options || [])
              .map(
                (o, oi) => `<div class="row nowrap" style="margin-top:6px"><input type="radio" name="q-${i}-${qi}" data-si="${i}" data-q="${qi}" data-qans="${oi}" ${Number(q.answer) === oi ? "checked" : ""} title="Đáp án đúng"><b>${u.letter(oi)}</b>
            <input data-si="${i}" data-q="${qi}" data-qopt="${oi}" value="${u.esc(o)}"></div>`
              )
              .join("") + `<button class="btn sm ghost" data-qoptadd="${qi}" data-si="${i}">+ Phương án</button>`;
        return `<div class="card flat st-q"><div class="row nowrap"><b>Câu ${qi + 1}</b><select data-si="${i}" data-q="${qi}" data-qkind>${A.QKINDS.map(([k, l]) => `<option value="${k}" ${kind === k ? "selected" : ""}>${l}</option>`).join("")}</select>
            ${s.type === "video" ? `<label class="small row nowrap">Dừng ở giây<input type="number" style="width:90px" data-si="${i}" data-q="${qi}" data-qf="t" value="${q.t || 0}"></label>` : ""}<span class="spacer"></span>
            <button class="btn sm ghost" data-qmv="${qi}" data-d="-1" data-si="${i}">▲</button><button class="btn sm ghost" data-qdel="${qi}" data-si="${i}">✕</button></div>
          <textarea rows="2" data-si="${i}" data-q="${qi}" data-qf="q" placeholder="Nội dung câu hỏi / đoạn tư liệu">${u.esc(q.q || "")}</textarea>${body}
          <input style="margin-top:6px" placeholder="Giải thích đáp án" data-si="${i}" data-q="${qi}" data-qf="explain" value="${u.esc(q.explain || "")}"></div>`;
      })
      .join("")}<div class="row"><button class="btn sm" data-qadd="mcq" data-si="${i}">+ Câu 4 lựa chọn</button><button class="btn sm" data-qadd="tf" data-si="${i}">+ Câu Đúng/Sai</button><button class="btn sm" data-qadd="short" data-si="${i}">+ Câu trả lời ngắn</button></div></div>`;
  }
  function cwEd(s, i) {
    return `<div class="grid g2"><label class="field">Từ khoá hàng dọc (viết liền, không dấu)<input data-si="${i}" data-k="keyword" value="${u.esc(s.keyword || "")}"></label><label class="field">Gợi ý từ khoá<input data-si="${i}" data-k="keyClue" value="${u.esc(s.keyClue || "")}"></label></div>
      <label class="field">Hàng ngang – mỗi dòng: ĐÁP ÁN | gợi ý (hàng thứ i chứa chữ thứ i của từ khoá)<textarea data-si="${i}" data-cw rows="${Math.max(4, (s.rows || []).length + 1)}">${u.esc((s.rows || []).map((r) => `${r.answer} | ${r.clue}`).join("\n"))}</textarea></label>`;
  }
  function videoEd(s, i) {
    const src = s.source || {};
    const vids = cur.bai && cur.bai.key && C.lesson(cur.bai.key) ? C.eduVideos(C.lesson(cur.bai.key)) : [];
    return `<div class="grid g2">${vids.length ? `<label class="field">Video EduHistory của bài<select data-si="${i}" data-k="source.edu"><option value="">–</option>${vids.map((v) => `<option value="${v.ma}" ${src.edu === v.ma ? "selected" : ""}>${u.esc(v.ma + " – " + v.ten)}</option>`).join("")}</select></label>` : `<label class="field">Mã video EduHistory<input data-si="${i}" data-k="source.edu" value="${u.esc(src.edu || "")}"></label>`}
      <label class="field">Hoặc đường dẫn YouTube / mp4<input data-si="${i}" data-k="source.url" value="${u.esc(src.url || "")}"></label></div>`;
  }

  /* ----- Trường chung của các loại hoạt động khác ----- */
  function fieldHtml(s, f, si) {
    const val = getP(s, f.key);
    const lab = `${u.esc(f.label)}${f.hint ? `<span class="hint">${u.esc(f.hint)}</span>` : ""}`;
    const d = `data-si="${si}" data-k="${f.key}" data-kind="${f.kind}"`;
    switch (f.kind) {
      case "textarea":
        return `<label class="field">${lab}<textarea ${d} rows="3">${u.esc(val || "")}</textarea></label>`;
      case "number":
        return `<label class="field">${lab}<input type="number" ${d} value="${val == null ? "" : u.esc(val)}"></label>`;
      case "bool":
        return `<label class="row small"><input type="checkbox" ${d} ${val ? "checked" : ""}> ${u.esc(f.label)}</label>`;
      case "select":
        return `<label class="field">${lab}<select ${d}>${f.options.map(([v, l]) => `<option value="${v}" ${val === v ? "selected" : ""}>${u.esc(l)}</option>`).join("")}</select></label>`;
      case "list":
        return `<label class="field">${lab}<span class="hint">Mỗi dòng một mục</span><textarea ${d} rows="4">${u.esc((val || []).map((x) => (typeof x === "string" ? x : x.text || x.title || "")).join("\n"))}</textarea></label>`;
      case "pair":
        return `<label class="field">${lab}<div class="row nowrap"><input type="number" ${d} data-i="0" value="${(val || [])[0] || ""}"><input type="number" ${d} data-i="1" value="${(val || [])[1] || ""}"></div></label>`;
      case "site":
        return `<label class="field">${lab}<select ${d}><option value="">–</option>${(L360.heritage ? L360.heritage.SITES : []).map((x) => `<option value="${x.id}" ${val === x.id ? "selected" : ""}>${u.esc(x.name)}</option>`).join("")}</select></label>`;
      case "options":
        return `<div class="field"><span>${lab}<span class="hint">Chọn nút tròn ở phương án đúng</span></span>${(val || [])
          .map(
            (o, i) => `<div class="row nowrap" style="margin-bottom:6px"><input type="radio" name="o-${si}" data-si="${si}" data-ans="${i}" ${s.answer === i ? "checked" : ""}><b>${u.letter(i)}</b>
            <input data-si="${si}" data-opt="${i}" value="${u.esc(o)}"><button class="btn sm ghost" data-optdel="${i}" data-si="${si}">✕</button></div>`
          )
          .join("")}<div class="row"><button class="btn sm" data-optadd data-si="${si}">+ Phương án</button>${
          s.type === "poll2" ? `<label class="row small"><input type="radio" name="o-${si}" data-si="${si}" data-ans="-1" ${s.answer == null ? "checked" : ""}> Câu hỏi ý kiến (không có đáp án)</label>` : ""
        }</div></div>`;
      case "pairs":
        return `<div class="field"><span>${lab}</span>${(val || [])
          .map(
            (p, pi) => `<div class="row nowrap" style="margin-bottom:6px"><input data-si="${si}" data-pair="${pi}" data-side="left" value="${u.esc(p.left)}"><span>↔</span>
            <input data-si="${si}" data-pair="${pi}" data-side="right" value="${u.esc(p.right)}"><button class="btn sm ghost" data-pdel="${pi}" data-si="${si}">✕</button></div>`
          )
          .join("")}<button class="btn sm" data-padd data-si="${si}">+ Cặp</button></div>`;
      case "fieldsList":
        return `<label class="field">${lab}<span class="hint">Mỗi dòng: Mã | Tên mục | Gợi ý</span><textarea data-si="${si}" data-k="${f.key}" data-kind="fieldsList" rows="5">${u.esc(
          (val || []).map((x) => [x.key, x.label, x.hint || ""].join(" | ")).join("\n")
        )}</textarea></label>`;
      case "json":
        return `<label class="field">${lab}<textarea class="mono" data-si="${si}" data-k="${f.key}" data-kind="json" rows="6">${u.esc(JSON.stringify(val || [], null, 1))}</textarea></label>`;
      case "image":
        return `<label class="field">${lab}<input ${d} value="${u.esc(val || "")}"></label>`;
      default:
        return `<label class="field">${lab}<input ${d} value="${u.esc(val || "")}"></label>`;
    }
  }

  function bindSteps(box) {
    const p = cur;
    const S0 = (el) => p.steps[Number(el.dataset.si)];
    const redraw = () => drawSteps();
    const on = (sel, ev, fn) => u.$$(sel, box).forEach((el) => el.addEventListener(ev, () => fn(el)));
    u.$$("[data-toggle]", box).forEach((b) => (b.onclick = () => drawSteps(openStep === Number(b.dataset.toggle) ? -1 : Number(b.dataset.toggle))));
    u.$$("[data-mv]", box).forEach(
      (b) =>
        (b.onclick = () => {
          const i = Number(b.dataset.mv);
          const j = i + Number(b.dataset.d);
          [p.steps[i], p.steps[j]] = [p.steps[j], p.steps[i]];
          changed();
          drawSteps(j);
        })
    );
    u.$$("[data-dup]", box).forEach(
      (b) =>
        (b.onclick = () => {
          const i = Number(b.dataset.dup);
          const c = u.clone(p.steps[i]);
          c.id = "s" + u.uid(4);
          p.steps.splice(i + 1, 0, c);
          changed();
          drawSteps(i + 1);
        })
    );
    u.$$("[data-rm]", box).forEach(
      (b) =>
        (b.onclick = async () => {
          if (!(await u.confirm("Xoá hoạt động này?", "Xoá"))) return;
          p.steps.splice(Number(b.dataset.rm), 1);
          changed();
          drawSteps(-1);
        })
    );
    // Trường chung
    u.$$("[data-k]", box).forEach((el) =>
      el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input", () => {
        const s = S0(el);
        const k = el.dataset.k;
        const kind = el.dataset.kind;
        let v = el.value;
        if (kind === "number") v = v === "" ? null : Number(v);
        if (kind === "bool") v = el.checked;
        if (kind === "list") v = lines(v);
        if (kind === "pair") {
          const a = Array.isArray(s[k]) ? s[k].slice() : [0, 0];
          a[Number(el.dataset.i)] = Number(v) || 0;
          v = a;
        }
        if (kind === "fieldsList") v = rows(v).filter((a) => a[0] || a[1]).map((a, i) => ({ key: a[0] || u.letter(i), label: a[1] || "", hint: a[2] || "" }));
        if (kind === "json") {
          try {
            v = JSON.parse(v);
            el.style.borderColor = "";
          } catch (e) {
            el.style.borderColor = "var(--bad)";
            return;
          }
        }
        setP(s, k, v);
        if (k === "keyword") s.keyword = L360.upWord ? L360.upWord(v || "") : v;
        if (k === "phase") return changed(), drawSteps();
        changed();
        if (k === "title") preview();
      })
    );
    // Khối & trang
    on("[data-bp]", "input", (el) => {
      setP(S0(el), el.dataset.bp, el.value);
      changed();
      preview();
    });
    on("select[data-bp]", "change", (el) => {
      setP(S0(el), el.dataset.bp, el.value);
      changed();
      preview();
    });
    on("[data-bl]", "input", (el) => {
      const b = getP(S0(el), el.dataset.bl);
      LINES[el.dataset.lk][1](el.value, b);
      changed();
      preview();
    });
    u.$$("[data-pg]", box).forEach((b) => (b.onclick = () => ((openPage = Number(b.dataset.pg)), redraw())));
    u.$$("[data-pgadd]", box).forEach(
      (b) =>
        (b.onclick = () => {
          const s = S0(b);
          s.pages.push({ title: "", blocks: [Object.assign({ kind: "image" }, u.clone(BLANK.image)), { kind: "list", items: [""] }] });
          openPage = s.pages.length - 1;
          changed();
          redraw();
        })
    );
    u.$$("[data-pgrm]", box).forEach(
      (b) =>
        (b.onclick = async () => {
          if (!(await u.confirm("Xoá trang này?", "Xoá"))) return;
          S0(b).pages.splice(Number(b.dataset.pgrm), 1);
          openPage = 0;
          changed();
          redraw();
        })
    );
    u.$$("[data-blkadd]", box).forEach(
      (b) =>
        (b.onclick = () => {
          const k = u.$("#newBlk", box).value;
          S0(b).pages[Number(b.dataset.blkadd)].blocks.push(Object.assign({ kind: k }, u.clone(BLANK[k] || {})));
          changed();
          redraw();
        })
    );
    const parentOf = (s, path) => {
      const ks = path.split(".");
      const idx = Number(ks.pop());
      return [getP(s, ks.join(".")), idx];
    };
    u.$$("[data-bmv]", box).forEach(
      (b) =>
        (b.onclick = () => {
          const [list, i] = parentOf(S0(b), b.dataset.bmv);
          const j = i + Number(b.dataset.d);
          if (j < 0 || j >= list.length) return;
          [list[i], list[j]] = [list[j], list[i]];
          changed();
          redraw();
        })
    );
    u.$$("[data-brm]", box).forEach(
      (b) =>
        (b.onclick = () => {
          const [list, i] = parentOf(S0(b), b.dataset.brm);
          list.splice(i, 1);
          changed();
          redraw();
        })
    );
    u.$$("[data-galadd]", box).forEach((b) => (b.onclick = () => (getP(S0(b), b.dataset.galadd).images.push({ query: "", src: "" }), changed(), redraw())));
    u.$$("[data-pick]", box).forEach(
      (b) =>
        (b.onclick = async () => {
          const target = getP(S0(b), b.dataset.pick);
          const r = await L360.Images.pick({ query: target.query || target.caption || "" });
          if (!r) return;
          target.src = r.src;
          target.credit = r.credit || target.credit || "";
          if (!target.caption && r.caption) target.caption = r.caption;
          changed();
          redraw();
        })
    );
    u.$$("[data-unimg]", box).forEach((b) => (b.onclick = () => ((getP(S0(b), b.dataset.unimg).src = ""), changed(), redraw())));
    // Câu hỏi
    const Q = (el) => S0(el).questions[Number(el.dataset.q)];
    on("[data-qf]", "input", (el) => {
      const q = Q(el);
      const f = el.dataset.qf;
      q[f] = f === "accept" ? el.value.split(",").map((x) => x.trim()).filter(Boolean) : f === "t" ? Number(el.value) || 0 : el.value;
      changed();
    });
    on("[data-qopt]", "input", (el) => ((Q(el).options[Number(el.dataset.qopt)] = el.value), changed()));
    on("[data-qans]", "change", (el) => ((Q(el).answer = Number(el.dataset.qans)), changed()));
    on("[data-st]", "input", (el) => ((Q(el).statements[Number(el.dataset.st)].text = el.value), changed()));
    on("[data-sta]", "change", (el) => ((Q(el).statements[Number(el.dataset.sta)].answer = el.checked), changed(), redraw()));
    on("[data-qkind]", "change", (el) => {
      const q = Q(el);
      q.kind = el.value;
      if (q.kind === "mcq" && !(q.options || []).length) Object.assign(q, { options: ["", "", "", ""], answer: 0 });
      if (q.kind === "tf" && (q.statements || []).length !== 4) q.statements = [0, 1, 2, 3].map((j) => ({ text: "", answer: j % 2 === 0 }));
      if (q.kind === "short" && q.answer == null) q.answer = "";
      changed();
      redraw();
    });
    u.$$("[data-qoptadd]", box).forEach((b) => (b.onclick = () => (Q({ dataset: { si: b.dataset.si, q: b.dataset.qoptadd } }).options.push(""), changed(), redraw())));
    u.$$("[data-qadd]", box).forEach(
      (b) =>
        (b.onclick = () => {
          const k = b.dataset.qadd;
          const s = S0(b);
          s.questions = s.questions || [];
          s.questions.push(
            k === "tf" ? { kind: "tf", q: "", statements: [0, 1, 2, 3].map((j) => ({ text: "", answer: j % 2 === 0 })), explain: "" } : k === "short" ? { kind: "short", q: "", answer: "", accept: [], explain: "" } : { kind: "mcq", q: "", options: ["", "", "", ""], answer: 0, explain: "" }
          );
          changed();
          redraw();
        })
    );
    u.$$("[data-qdel]", box).forEach((b) => (b.onclick = () => (S0(b).questions.splice(Number(b.dataset.qdel), 1), changed(), redraw())));
    u.$$("[data-qmv]", box).forEach(
      (b) =>
        (b.onclick = () => {
          const qs = S0(b).questions;
          const i = Number(b.dataset.qmv);
          if (i < 1) return;
          [qs[i - 1], qs[i]] = [qs[i], qs[i - 1]];
          changed();
          redraw();
        })
    );
    // Ô chữ
    on("[data-cw]", "input", (el) => {
      const s = S0(el);
      s.rows = rows(el.value).map((r) => ({ answer: L360.upWord ? L360.upWord(r[0]) : r[0], clue: r[1] || "" }));
      changed();
    });
    // Phương án (poll2, explore…)
    on("[data-opt]", "input", (el) => ((S0(el).options[Number(el.dataset.opt)] = el.value), changed()));
    on("[data-ans]", "change", (el) => ((S0(el).answer = Number(el.dataset.ans) < 0 ? null : Number(el.dataset.ans)), changed()));
    u.$$("[data-optadd]", box).forEach((b) => (b.onclick = () => ((S0(b).options = (S0(b).options || []).concat("")), changed(), redraw())));
    u.$$("[data-optdel]", box).forEach(
      (b) =>
        (b.onclick = () => {
          const s = S0(b);
          const i = Number(b.dataset.optdel);
          s.options.splice(i, 1);
          if (s.answer === i) s.answer = 0;
          else if (s.answer > i) s.answer--;
          changed();
          redraw();
        })
    );
    on("[data-pair]", "input", (el) => ((S0(el).pairs[Number(el.dataset.pair)][el.dataset.side] = el.value), changed()));
    u.$$("[data-padd]", box).forEach((b) => (b.onclick = () => ((S0(b).pairs = (S0(b).pairs || []).concat({ left: "", right: "" })), changed(), redraw())));
    u.$$("[data-pdel]", box).forEach((b) => (b.onclick = () => (S0(b).pairs.splice(Number(b.dataset.pdel), 1), changed(), redraw())));
    u.$$("[data-rawapply]", box).forEach(
      (b) =>
        (b.onclick = () => {
          const i = Number(b.dataset.rawapply);
          try {
            p.steps[i] = JSON.parse(u.$(`[data-raw="${i}"]`, box).value);
            changed();
            drawSteps(i);
          } catch (e) {
            u.toast("JSON chưa hợp lệ.", "bad");
          }
        })
    );
  }

  // Xem trước bước đang mở (trang bài giảng hoặc màn chiếu của hoạt động).
  const preview = u.debounce(() => {
    const el = u.$("#prev");
    if (!el || !cur) return;
    const s = cur.steps[openStep];
    L360.Design.apply(cur, el);
    if (!s) return (el.innerHTML = `<p class="small muted">Mở một hoạt động để xem trước.</p>`);
    const T = L360.types[s.type];
    const ph = L360.phase(s.phase);
    let inner = "";
    try {
      if (s.type === "slide") {
        const pg = (s.pages || [])[Math.min(openPage, (s.pages || []).length - 1)] || {};
        inner = L360.blocks.page(pg, { mode: "screen" });
      } else if (T && T.screen) {
        const tmp = document.createElement("div");
        const n = Pack.normalize({ schema: "l360-pack/2", title: "x", steps: [u.clone(s)] }).steps[0];
        const item = T.publicPayload ? T.publicPayload(n, { q: 0, page: 0 }) : null;
        T.screen(tmp, { step: n, item, state: { phase: "observe", q: 0, page: 0 }, subs: {}, mode: "preview", featured: {}, groups: [], pack: cur, answer: null });
        inner = tmp.innerHTML;
      }
    } catch (e) {
      inner = `<p class="small muted">${u.esc(s.title)}</p>`;
    }
    el.innerHTML = `<div class="row" style="margin-bottom:8px"><span class="pill" style="background:${PH_COL[s.phase]};color:#fff">${u.esc(ph.name)}</span><b class="small ellipsis">${u.esc(s.title)}</b></div>${inner}`;
  }, 200);

  const validate = u.debounce(() => {
    const el = u.$("#val");
    if (!el || !cur) return;
    const v = Pack.validate(cur);
    const n = Pack.normalize(cur);
    const mins = n.steps.reduce((a, s) => a + (s.minutes || 0), 0);
    const c = Pack.phaseCount(n);
    const missing = L360.Images.slots(n).filter((x) => !x.block.src).length;
    el.innerHTML = `<div class="row" style="gap:6px">${L360.PHASES.map((x) => `<span class="ph-dot ${n.steps.some((s) => s.phase === x.id) ? "on" : ""}" style="--c:${PH_COL[x.id]}" title="${x.name}: ${c[x.id] || 0} hoạt động">${x.short}</span>`).join("")}<span class="small"><b>${mins}</b>/${n.duration} phút</span></div>
      ${missing ? `<p class="small" style="color:var(--warn);margin:8px 0 0">${missing} khối ảnh chưa có ảnh.</p>` : ""}
      ${v.errors.length ? `<p class="pill bad" style="margin-top:8px">${v.errors.length} lỗi</p><ul class="small" style="color:var(--bad)">${v.errors.map((e) => `<li>${u.esc(e)}</li>`).join("")}</ul>` : `<p class="pill ok" style="margin-top:8px">✓ Chạy được</p>`}
      ${v.warnings.length ? `<details><summary class="small">${v.warnings.length} gợi ý</summary><ul class="small" style="color:var(--warn)">${v.warnings.map((e) => `<li>${u.esc(e)}</li>`).join("")}</ul></details>` : ""}${dirty ? `<p class="small muted">Có thay đổi chưa lưu.</p>` : ""}`;
  }, 250);
  const autosave = u.debounce(() => dirty && saveDraft(true), 4000);
  function changed() {
    dirty = true;
    validate();
    autosave();
  }
  async function saveDraft(quiet) {
    if (!cur) return;
    cur.meta = Object.assign({}, cur.meta, { savedAt: Date.now() });
    const saved = await Lib.drafts.save(Pack.normalize(cur), teacher);
    cur.id = saved.id;
    dirty = false;
    validate();
    if (!quiet) u.toast("Đã lưu nháp.", "ok");
  }
  async function publish() {
    const v = Pack.validate(cur);
    if (v.errors.length) return u.toast("Còn lỗi – xem khung Kiểm tra trước khi đăng.", "bad");
    if (L360.isLocal) return u.toast("Chế độ Diễn tập chỉ lưu trên máy này. Đăng nhập trực tuyến để đăng lên thư viện trường.", "bad", 4500);
    if (!(await u.confirm(`Đăng “${cur.title}” lên thư viện trường? Mọi giáo viên sẽ thấy và dùng được, kèm tên **${teacher.name || teacher.email}**.`, "Đăng"))) return;
    await saveDraft(true);
    const p = await Lib.publish(cur, teacher);
    cur.meta = Object.assign({}, cur.meta, { publishedAt: Date.now(), publishedId: p.id });
    await saveDraft(true);
    u.toast("Đã đăng lên thư viện trường.", "ok");
  }
  async function autoImages(fromAi) {
    if (!cur) return;
    const n = Pack.normalize(cur);
    const need = L360.Images.slots(n).filter((x) => !x.block.src && (x.block.query || x.block.caption)).length;
    if (!need) return fromAi ? null : u.toast("Không có khối ảnh nào cần tìm.", "ok");
    u.toast(`Đang tìm ${need} ảnh từ Wikipedia/Wikimedia Commons…`, "", 3000);
    const r = await L360.Images.autoFill(cur, (i, t) => {
      const el = u.$("#imgs");
      if (el) el.textContent = `Đang tìm ảnh ${i}/${t}…`;
    });
    const el = u.$("#imgs");
    if (el) el.innerHTML = `${icon("image")} Tìm ảnh cho khối còn thiếu`;
    changed();
    if (tab === "soan") drawSteps();
    u.toast(`Đã thêm ${r.filled}/${r.total} ảnh.${r.missing ? ` Còn ${r.missing} khối cần chọn tay.` : ""} Kiểm tra lại ảnh trước khi dạy.`, "ok", 5000);
  }

  /* ================= Các tiết cùng bài (cho giáo án & PPT) ================= */
  async function siblings() {
    const all = (await Lib.drafts.list(teacher)).map((p) => Pack.normalize(p));
    const key = cur.bai && cur.bai.key;
    const same = key ? all.filter((p) => p.bai && p.bai.key === key) : [cur];
    if (!same.find((p) => p.id === cur.id)) same.push(Pack.normalize(cur));
    return same.map((p) => (p.id === cur.id ? Pack.normalize(cur) : p)).sort((a, b) => a.tiet.so - b.tiet.so);
  }
  function packPicker(list, sel) {
    return `<div class="col" style="gap:6px">${list
      .map((p) => `<label class="row small st-pk"><input type="checkbox" data-pk2="${u.esc(p.id)}" ${sel.includes(p.id) ? "checked" : ""}><b>Tiết ${p.tiet.so}${p.tiet.tong > 1 ? "/" + p.tiet.tong : ""}</b><span class="ellipsis">${u.esc(p.title)}</span>${p.id === cur.id ? `<span class="pill accent">đang mở</span>` : ""}</label>`)
      .join("")}</div>`;
  }

  /* ================= Giáo án Word ================= */
  async function khbdPane(pane) {
    if (!cur) return needPack(pane, "Giáo án được dựng từ tiết học (hoặc các tiết của cùng một bài).");
    if (dirty) await saveDraft(true);
    const list = await siblings();
    const st = { sel: list.map((p) => p.id), k: cur.khbd ? L360.Khbd.normalize(cur.khbd) : null, ppct: (cur.meta && cur.meta.ppct) || "", tuan: (cur.meta && cur.meta.tuan) || "", extra: "" };
    const chosen = () => list.filter((p) => st.sel.includes(p.id));
    const draw = () => {
      const v = st.k ? L360.Khbd.validate(st.k) : null;
      pane.innerHTML = `<div class="st-kh"><aside class="col" style="gap:14px">
        <section class="card"><h3>1. Các tiết đưa vào giáo án</h3>${packPicker(list, st.sel)}
          <div class="grid g2" style="margin-top:10px"><label class="field">Tiết theo PPCT<input id="ppct" value="${u.esc(st.ppct)}" placeholder="44, 45, 46"></label><label class="field">Tuần<input id="tuan" value="${u.esc(st.tuan)}" placeholder="33, 34"></label></div></section>
        <section class="card"><h3>2. Soạn giáo án</h3>
          <button class="btn block" id="skel">${icon("doc")} Tạo khung ngay từ tiết học (không cần AI)</button>
          <p class="small muted" style="margin:8px 0">Khung có đủ tiến trình, 4 bước của từng nhiệm vụ, câu hỏi, đáp án và số slide khớp bài giảng PowerPoint. Phần mục tiêu, năng lực số đánh dấu […] để thầy cô điền.</p>
          <hr><b class="small">Giáo án đầy đủ bằng trợ lý AI</b>
          <label class="field">Yêu cầu thêm (không bắt buộc)<input id="extra" value="${u.esc(st.extra)}" placeholder="Ví dụ: liên hệ địa phương Bắc Ninh"></label>
          <div class="row"><button class="btn primary" id="kp">${icon("copy")} Sao chép lời nhắc</button>${AI_LINKS.map(([n, l]) => `<a class="btn sm" href="${l}" target="_blank" rel="noopener">${n} ↗</a>`).join("")}</div>
          <p class="small muted" style="margin-top:6px">Lời nhắc đã gồm toàn bộ hoạt động, câu hỏi, số slide; kèm khung năng lực số TT 02/2025 và năng lực AI QĐ 2422. Có thể đính kèm giáo án cũ để AI giữ văn phong.</p>
          <textarea id="kres" rows="5" placeholder="Dán câu trả lời của trợ lý AI (khối \`\`\`json\`\`\`)…"></textarea><button class="btn" id="kread" style="margin-top:6px">Đọc giáo án</button></section>
        ${
          st.k
            ? `<section class="card"><h3>3. Tải về</h3>${v.errors.length ? `<ul class="small" style="color:var(--bad)">${v.errors.map((e) => `<li>${u.esc(e)}</li>`).join("")}</ul>` : ""}${
                v.warnings.length ? `<ul class="small" style="color:var(--warn)">${v.warnings.map((e) => `<li>${u.esc(e)}</li>`).join("")}</ul>` : ""
              }<div class="col" style="gap:8px"><button class="btn primary" id="kdoc">${icon("download")} Tải Word (.docx)</button><button class="btn" id="ksave">${icon("save")} Lưu giáo án vào tiết học</button><button class="btn sm ghost" id="kjson">Tải JSON giáo án</button></div>
              <p class="tiny muted" style="margin-top:8px">Tệp Word đúng mẫu của tổ: A4, Times New Roman 13, lề 2–2–2–2,5 cm, chân trang 04.07-BM//ĐT/HDCV/FE-FSC và số trang. Mã năng lực số tô đỏ, năng lực AI tô xanh.</p></section>`
            : ""
        }</aside>
        <section class="card st-kh-prev">${st.k ? L360.Khbd.html(st.k) : `<div class="empty" style="padding:60px 20px">${icon("doc")}<br>Xem trước giáo án hiện ở đây.</div>`}</section></div>`;
      u.$$("[data-pk2]").forEach((el) => (el.onchange = () => ((st.sel = el.checked ? st.sel.concat(el.dataset.pk2) : st.sel.filter((x) => x !== el.dataset.pk2)), draw())));
      u.$("#ppct").oninput = (e) => (st.ppct = e.target.value);
      u.$("#tuan").oninput = (e) => (st.tuan = e.target.value);
      u.$("#extra").oninput = (e) => (st.extra = e.target.value);
      u.$("#skel").onclick = () => {
        if (!chosen().length) return u.toast("Chọn ít nhất 1 tiết.", "bad");
        st.k = applyPpct(L360.Khbd.fromPacks(chosen()));
        draw();
      };
      u.$("#kp").onclick = async () => {
        if (!chosen().length) return u.toast("Chọn ít nhất 1 tiết.", "bad");
        const p0 = chosen()[0];
        const l = p0.bai.key ? C.lesson(p0.bai.key) : null;
        const ok = await u.copy(
          L360.Khbd.prompt({ packs: chosen(), subject: C.subjectName(p0.subjectId, p0.grade), book: l ? l.bookTitle : "", bai: Object.assign({}, p0.bai, l ? { trang: l.trang } : {}), giaoVien: teacher.name || "", ppct: st.ppct, tuan: st.tuan, extra: st.extra })
        );
        u.toast(ok ? "Đã sao chép lời nhắc soạn giáo án." : "Không sao chép được.", ok ? "ok" : "bad");
      };
      u.$("#kread").onclick = () => {
        try {
          const raw = L360.Khbd.parse(u.$("#kres").value);
          st.k = L360.Khbd.normalize(raw);
          if (!st.k.giaoVien) st.k.giaoVien = teacher.name || "";
          draw();
        } catch (e) {
          u.toast("Không tìm thấy JSON giáo án hợp lệ.", "bad");
        }
      };
      if (st.k) {
        u.$("#kdoc").onclick = async () => {
          const b = u.$("#kdoc");
          b.disabled = true;
          b.textContent = "Đang tạo tệp Word…";
          try {
            await L360.Khbd.download(st.k);
          } catch (e) {
            u.toast("Không tạo được tệp Word: " + e.message, "bad");
          }
          b.disabled = false;
          b.innerHTML = `${icon("download")} Tải Word (.docx)`;
        };
        u.$("#ksave").onclick = async () => {
          cur.khbd = st.k;
          cur.meta = Object.assign({}, cur.meta, { ppct: st.ppct, tuan: st.tuan });
          await saveDraft(false);
        };
        u.$("#kjson").onclick = () => u.download(`khbd-${cur.id}.json`, JSON.stringify(st.k, null, 2), "application/json");
      }
    };
    function applyPpct(k) {
      const nums = String(st.ppct || "").split(/[,;\s]+/).filter(Boolean);
      if (nums.length) {
        k.tiet.forEach((t, i) => nums[i] && (t.ten = t.ten.replace("[…]", nums[i])));
        k.thoiGian = `${k.tiet.length} tiết (Tiết ${nums.join(", ")} theo PPCT${st.tuan ? " – Tuần " + st.tuan : ""})`;
      } else if (st.tuan) k.thoiGian = k.thoiGian.replace("Tuần […]", "Tuần " + st.tuan);
      if (!k.giaoVien) k.giaoVien = teacher.name || "";
      return k;
    }
    draw();
  }

  /* ================= PowerPoint ================= */
  async function pptPane(pane) {
    if (!cur) return needPack(pane, "Bài giảng PowerPoint được dựng từ tiết học đã soạn.");
    if (dirty) await saveDraft(true);
    const list = await siblings();
    const st = { sel: [cur.id], font: localStorage.getItem("l360:pptFont") || "Calibri" };
    const draw = () => {
      const chosen = list.filter((p) => st.sel.includes(p.id));
      const pl = chosen.length ? L360.Pptx.plan(chosen) : { slides: [] };
      const NAMES = { title: "Trang bìa", goals: "Mục tiêu", phase: "Chuyển pha", page: "Bài giảng", video: "Video", q: "Câu hỏi", qans: "Đáp án", cw: "Ô chữ", match: "Ghép nối", order: "Sắp xếp", group: "Nhiệm vụ nhóm", sheet: "Phiếu học tập", cards: "Chọn thẻ", auction: "Đấu giá", task: "Nhiệm vụ", recap: "Ghi nhớ", end: "Kết thúc" };
      const per = chosen.length ? Math.round(pl.slides.length / chosen.length) : 0;
      pane.innerHTML = `<div class="st-kh"><aside class="col" style="gap:14px"><section class="card"><h3>Các tiết</h3>${packPicker(list, st.sel)}
          <label class="field" style="margin-top:10px">Phông chữ<select id="font">${["Calibri", "Arial", "Be Vietnam Pro", "Times New Roman"].map((f) => `<option ${f === st.font ? "selected" : ""}>${f}</option>`).join("")}</select><span class="hint">Be Vietnam Pro đẹp nhất nhưng máy chiếu phải cài phông; Calibri/Arial an toàn trên mọi máy.</span></label>
          <button class="btn primary block lg" id="mk" style="margin-top:10px">${icon("download")} Tải PowerPoint (.pptx)</button><p class="small muted" id="mkmsg" style="margin-top:8px"></p></section>
        <section class="card small"><b>Có gì trong tệp?</b><ul><li>Trang bìa, mục tiêu, trang chuyển pha theo màu Khởi động – Hình thành – Luyện tập – Vận dụng.</li><li>Bài giảng trực quan: ảnh, dòng thời gian, sơ đồ tư duy, bảng so sánh, quy trình, số liệu, khung <b>✎ Ghi vào vở</b>.</li><li>Câu hỏi 4 lựa chọn, Đúng/Sai, trả lời ngắn kèm trang đáp án; ô chữ có trang đáp án.</li><li>Lời dẫn và đáp án nằm trong phần <b>Ghi chú</b> của từng trang.</li></ul></section></aside>
        <section class="card"><div class="row"><h2 class="grow" style="margin:0">${pl.slides.length} trang chiếu</h2><span class="pill ${per >= 20 && per <= 40 ? "ok" : "warn"}">${per} trang/tiết · chuẩn 20–40</span></div>
          ${per && per < 20 ? `<p class="small" style="color:var(--warn)">Ít hơn 20 trang/tiết: thêm trang bài giảng hoặc câu hỏi trong trình soạn để bài giảng đầy đủ hơn.</p>` : ""}
          <table class="t st-plan"><tr><th>#</th><th>Loại</th><th>Nội dung</th></tr>${pl.slides
            .map((d, i) => {
              const ph = d.s ? d.s.phase : d.phase;
              const t = d.k === "page" ? d.pg.title || d.s.title : d.k === "q" ? `${d.s.title} – câu ${d.i + 1}: ${d.q.q || ""}` : d.k === "phase" ? L360.phase(d.phase).name : d.k === "title" ? d.p.title : d.s ? d.s.title : "";
              return `<tr><td class="num">${i + 1}</td><td><span class="ph-bar" style="--c:${PH_COL[ph] || "var(--muted)"}"></span>${NAMES[d.k] || d.k}${d.reveal ? " (đáp án)" : ""}</td><td class="ellipsis" style="max-width:520px">${u.esc(String(t).slice(0, 120))}</td></tr>`;
            })
            .join("")}</table></section></div>`;
      u.$$("[data-pk2]").forEach((el) => (el.onchange = () => ((st.sel = el.checked ? st.sel.concat(el.dataset.pk2) : st.sel.filter((x) => x !== el.dataset.pk2)), draw())));
      u.$("#font").onchange = (e) => ((st.font = e.target.value), localStorage.setItem("l360:pptFont", st.font));
      u.$("#mk").onclick = async () => {
        if (!chosen.length) return u.toast("Chọn ít nhất 1 tiết.", "bad");
        const b = u.$("#mk");
        const msg = u.$("#mkmsg");
        b.disabled = true;
        msg.textContent = "Đang dựng bài giảng…";
        try {
          const n = await L360.Pptx.download(chosen, { font: st.font, author: teacher.name || "", onProgress: (t) => (msg.textContent = t) });
          msg.textContent = `Đã tạo ${n} trang chiếu. Mở bằng PowerPoint, Keynote hoặc Google Trang trình bày.`;
        } catch (e) {
          msg.textContent = "Không tạo được tệp: " + e.message;
        }
        b.disabled = false;
      };
    };
    draw();
  }

  /* ================= In phiếu học tập & kịch bản ================= */
  const dots = (n) => `<div style="border-bottom:1px dotted #999;height:26px"></div>`.repeat(n);
  function sheetFor(s, i, p) {
    const head = `<h3 style="margin:14px 0 6px">Hoạt động ${i + 1}. ${u.esc(s.title)}</h3>${s.instructions ? `<p class="small"><i>${u.esc(s.instructions)}</i></p>` : ""}`;
    const opts = (o) => `<ol type="A" style="margin:4px 0 8px 18px">${(o || []).map((x) => `<li>${u.esc(x)}</li>`).join("")}</ol>`;
    const qHtml = (q, k) =>
      q.kind === "tf"
        ? `<p><b>Câu ${k + 1}.</b> ${u.esc(q.q)}</p><table class="t">${(q.statements || []).map((x, j) => `<tr><td>${"abcd"[j]}) ${u.esc(x.text)}</td><td style="width:60px">Đ ☐</td><td style="width:60px">S ☐</td></tr>`).join("")}</table>`
        : q.kind === "short"
        ? `<p><b>Câu ${k + 1}.</b> ${u.esc(q.q)}</p><p>Trả lời: ____________________</p>`
        : `<p><b>Câu ${k + 1}.</b> ${u.esc(q.q)}</p>${opts(q.options)}`;
    switch (s.type) {
      case "slide": {
        const notes = (s.pages || []).flatMap((pg) => L360.blocks.notes(pg).filter((n) => n.kind === "note"));
        return notes.length ? head + `<p class="small"><b>Ghi vào vở:</b></p>${dots(Math.min(6, notes.length * 2 + 1))}` : "";
      }
      case "quiz":
      case "video":
        return head + (s.questions || []).map(qHtml).join("");
      case "crossword":
        return head + `<p>${(s.rows || []).map((r, k) => `${k + 1}. ${u.esc(r.clue)} (${r.answer.length} chữ cái)`).join("<br>")}</p><p>Từ khoá: ${u.esc(s.keyClue || "")} ____________</p>`;
      case "poll2":
        return head + `<p>${u.esc(s.question)}</p>${opts(s.options)}<p>Vòng 1: _____ &nbsp;&nbsp; Vòng 2: _____ &nbsp;&nbsp; Lí do đổi/giữ: ____________________</p>`;
      case "cards":
        return head + `<p>${u.esc(s.question)} (chọn tối đa ${s.maxPick})</p><p>${(s.cards || []).map((c) => `☐ ${u.esc(c)}`).join(" &nbsp; ")}</p>${s.textPrompt ? `<p>${u.esc(s.textPrompt)}:</p>${dots(2)}` : ""}`;
      case "text":
        return head + `<p>${u.esc(s.question)}</p>${s.source ? `<blockquote class="small">${u.esc(s.source)}</blockquote>` : ""}${dots(3)}${s.selfAssess ? `<p>Tự đánh giá: ☐ 1 &nbsp; ☐ 2 &nbsp; ☐ 3</p>` : ""}`;
      case "match": {
        const t = L360.types.match.publicPayload(s);
        return (
          head +
          `<p>${u.esc(s.question)}</p><table class="t"><tr><td style="width:50%">${t.lefts.map((l, k) => `${k + 1}. ${u.esc(l)}`).join("<br>")}</td><td>${t.rights
            .map((r, k) => `${u.letter(k)}. ${u.esc(r)}`)
            .join("<br>")}</td></tr></table><p>Ghép: ${t.lefts.map((_, k) => `${k + 1} → ___`).join("  ")}</p>`
        );
      }
      case "order": {
        const t = L360.types.order.publicPayload(s);
        return head + `<p>${u.esc(s.question)}</p><p>${t.items.map((x, k) => `${u.letter(k)}. ${u.esc(x)}`).join("<br>")}</p><p>Thứ tự đúng: ${t.items.map(() => "___").join(" → ")}</p>`;
      }
      case "groupwork":
        return head + `<p>${u.esc(s.task || "")}</p><table class="t">${(s.fields || []).map((f) => `<tr><td style="width:32%"><b>${f.key}. ${u.esc(f.label)}</b></td><td style="height:58px"></td></tr>`).join("")}</table>`;
      case "expo": {
        const gs = Pack.groups(p, (p.groups || []).length || 4);
        return head + `<table class="t"><tr><th>Nhóm</th>${(s.criteria || []).map((c) => `<th>${u.esc(c)} (1–5)</th>`).join("")}<th>Câu hỏi</th></tr>${gs.map((g) => `<tr><td>${u.esc(g.name)}</td>${(s.criteria || []).map(() => "<td></td>").join("")}<td style="width:30%"></td></tr>`).join("")}</table>`;
      }
      case "auction":
        return head + `<p>${u.esc(s.question)}</p><p>${(s.items || []).map((x, k) => `${k + 1}. ${u.esc(x.title)}`).join(" · ")}</p><p>Nhóm chọn: ______ Giá: ____ Lí do: ______________________</p>`;
      case "explore": {
        const t = L360.types.explore.publicPayload(s);
        return head + `<div class="row nowrap" style="align-items:flex-start"><div style="width:110px">${u.qr(t.url, 3)}</div><div><p><b>${u.esc(t.siteName)}</b></p><p>${u.esc(t.mission)}</p>${t.answerType === "choice" ? opts(t.options) : dots(3)}</div></div>`;
      }
      default:
        return head;
    }
  }
  function answersFor(s) {
    if (s.type === "quiz" || s.type === "video") return (s.questions || []).map((q, k) => L360.Khbd.qLine(q, k)).join("\n");
    if (s.type === "crossword") return (s.rows || []).map((r, k) => `${k + 1}) ${r.answer}`).join(" · ") + ` · Từ khoá: ${s.keyword}`;
    if (s.type === "poll2") return s.answer == null ? "Câu hỏi ý kiến" : u.letter(s.answer) + (s.explain ? ` – ${s.explain}` : "");
    if (s.type === "match") return (s.pairs || []).map((x) => `${x.left} – ${x.right}`).join("; ");
    if (s.type === "order") return (s.items || []).map((x) => (typeof x === "string" ? x : x.text)).join(" → ");
    if (s.type === "cards") return s.conclusion || "";
    if (s.type === "text") return s.sample || "";
    if (s.type === "explore") return s.answerType === "choice" ? u.letter(s.answer) + (s.explain ? ` – ${s.explain}` : "") : s.explain || "";
    return "";
  }
  async function printPane(pane) {
    if (!cur) return needPack(pane, "In phiếu học tập và kịch bản cho tiết đang mở.");
    const pk = Pack.normalize(cur);
    pane.innerHTML = `<div class="row no-print" style="margin-bottom:14px"><b class="grow">${u.esc(Pack.label(pk))} · ${u.esc(pk.title)}</b>
      <label class="row small"><input type="checkbox" id="c1" checked> Phiếu học tập</label><label class="row small"><input type="checkbox" id="c2" checked> Kịch bản giáo viên + đáp án</label>
      <label class="row small"><input type="checkbox" id="c3"> Thẻ A/B/C/D dự phòng mất mạng</label><button class="btn primary" onclick="print()">In / Lưu PDF</button></div><div id="sheet"></div>`;
    const draw = () => {
      const head = `<div class="row"><img src="assets/img/logo-l360.svg" style="height:30px"><span class="spacer"></span><span class="small">${u.esc(L360.cfg.school)}</span></div>`;
      let h = "";
      if (u.$("#c1").checked)
        h += `<section class="card page-break">${head}<h2 style="margin-top:10px">PHIẾU HỌC TẬP – ${u.esc(pk.title)}</h2><p class="small">${u.esc(Pack.label(pk))} · ${u.esc(C.subjectName(pk.subjectId, pk.grade) || pk.subject)} ${pk.grade ? "– Lớp " + u.esc(pk.grade) : ""}</p><p>Họ tên: ____________________ Lớp: ______ Nhóm: ______</p>${pk.steps
          .map((s, i) => sheetFor(s, i, pk))
          .join("")}</section>`;
      if (u.$("#c2").checked)
        h += `<section class="card page-break">${head}<h2 style="margin-top:10px">KỊCH BẢN GIÁO VIÊN – ${u.esc(pk.title)}</h2><p class="small">${u.esc(Pack.label(pk))} · ${pk.duration} phút</p>${pk.objectives.length ? `<p><b>Mục tiêu:</b></p><ul>${pk.objectives.map((o) => `<li>${u.esc(o)}</li>`).join("")}</ul>` : ""}
          <table class="t"><tr><th>#</th><th>Hoạt động</th><th class="num">Phút</th><th>Lời dẫn và nhiệm vụ</th><th>Đáp án / kết luận</th></tr>${pk.steps
            .map(
              (s, i) => `<tr><td>${i + 1}</td><td><b>${u.esc(s.title)}</b><br><span class="small muted">${u.esc(L360.phase(s.phase).name)} · ${u.esc((L360.types[s.type] || {}).label || s.type)}</span></td><td class="num">${s.minutes || ""}</td>
            <td class="small">${u.esc(s.script || "")}${s.instructions ? `<br><i>HS: ${u.esc(s.instructions)}</i>` : ""}</td><td class="small" style="white-space:pre-line">${u.esc(answersFor(s))}${s.ghiBai ? `\nGhi vở: ${u.esc(s.ghiBai)}` : ""}</td></tr>`
            )
            .join("")}</table></section>`;
      if (u.$("#c3").checked)
        h += `<section class="page-break"><div class="grid g2">${["A", "B", "C", "D"].map((k) => `<div class="card center" style="height:240px;display:grid;place-items:center;font-size:150px;font-weight:800">${k}</div>`).join("")}</div></section>`;
      u.$("#sheet").innerHTML = h;
    };
    u.$$("#c1,#c2,#c3").forEach((el) => (el.onchange = draw));
    draw();
  }

  window.addEventListener("beforeunload", () => {
    if (dirty && cur) {
      try {
        L360.Local.save(Pack.normalize(cur));
      } catch (e) {}
    }
  });

  (async function init() {
    await L360.store.ready;
    teacher = await L360.Auth.requireTeacher(app, { title: "Studio – đăng nhập giáo viên" });
    const id = u.qs("sua") || u.qs("id");
    if (id) {
      const f = (await Lib.drafts.get(id, teacher)) || (await Lib.getPack(id));
      if (f) cur = Pack.normalize(f);
    }
    if (!cur && ["soan", "giaoan", "ppt", "in"].includes(tab)) {
      const d = await Lib.drafts.list(teacher);
      if (d.length) cur = Pack.normalize(d.sort((a, b) => ((b.meta && b.meta.savedAt) || 0) - ((a.meta && a.meta.savedAt) || 0))[0]);
    }
    frame();
  })();
})();
