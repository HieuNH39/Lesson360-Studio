/* Trang "Soạn giáo án (Phụ lục 4)": chọn bài theo Phụ lục 1 → trợ lý AI soạn giáo án (hoặc chuyển giáo án Word có sẵn)
   → tải giáo án Word, PDF đúng mẫu của tổ và PowerPoint giảng dạy dùng offline dựng từ chính giáo án đó. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const C = L360.Curr;
  const P = L360.Ppct;
  const K = L360.Khbd;
  const app = u.$("#app");
  const ic = L360.icon;
  const SKEY = "l360:ga";
  let teacher = null;
  const st = { mon: "", lop: "", cd: false, baiId: "", tiets: [], src: "ai", docName: "", docText: "", extra: "", raw: "", v: 1, gaId: "", view: "ga", font: "Arial" };
  let doc = null; // Phụ lục 1 của môn – lớp đang chọn
  let k = null; // giáo án đã đọc
  let built = null; // { packs, k, gaId }
  let saved = [];
  let imgJob = null; // tìm, kiểm tra ảnh chạy ngầm sau khi đọc giáo án

  const save = () => {
    try {
      const o = Object.assign({}, st);
      if (o.docText.length > 150000) o.docText = o.docText.slice(0, 150000);
      localStorage.setItem(SKEY, JSON.stringify(o));
    } catch (e) {}
  };
  const load = () => {
    try {
      Object.assign(st, JSON.parse(localStorage.getItem(SKEY) || "{}"));
    } catch (e) {}
  };

  /* ---------- Bài dạy ---------- */
  const subjects = () => C.subjects.filter((s) => !teacher.subjects || !teacher.subjects.length || teacher.subjects.includes(s.id) || true);
  async function loadDoc() {
    doc = null;
    if (!st.mon || !st.lop) return;
    doc = await P.forSubject(st.mon, st.lop, { cd: st.cd }).catch(() => null);
  }
  // Bài đang chọn: từ Phụ lục 1 (có số tiết, tuần, tiết PPCT) hoặc từ mục lục SGK khi chưa có Phụ lục 1.
  function curBai() {
    if (doc && st.baiId.startsWith("pl:")) {
      const b = doc.bai.find((x) => x.id === st.baiId.slice(3));
      if (!b) return null;
      const l = b.key ? C.lesson(b.key) : null;
      return { ten: b.ten, so: (l && l.so) || "", key: b.key || "", trang: l && l.trang, book: l && l.bookTitle, chuong: b.chuong || (l && l.chuong) || "", tiet: b.tiet || [], pl: b };
    }
    if (st.baiId.startsWith("sgk:")) {
      const l = C.lesson(st.baiId.slice(4));
      if (!l) return null;
      return { ten: l.ten, so: l.so, key: l.key, trang: l.trang, book: l.bookTitle, chuong: l.chuong || "", tiet: [1, 2, 3].map((n) => ({ so: "", thu: n })), sgk: true };
    }
    return null;
  }
  function chosenTiet(b) {
    const all = b.tiet.map((t, i) => i);
    const sel = st.tiets.filter((i) => i < b.tiet.length);
    return (sel.length ? sel : b.sgk ? [0] : all).sort((a, c) => a - c);
  }
  // Bài đầu tiên của chủ đề/chương → có trang giới thiệu chủ đề.
  function chudeOf(b) {
    if (!b || !b.chuong) return "";
    if (b.pl && doc) {
      const i = doc.bai.indexOf(b.pl);
      return i === 0 || (doc.bai[i - 1] || {}).chuong !== b.pl.chuong ? b.chuong : "";
    }
    try {
      const all = C.lessons(st.mon, st.lop).flatMap((x) => x.lessons);
      const f = all.find((l) => l.chuong === b.chuong);
      return f && f.key === b.key ? b.chuong : "";
    } catch (e) {
      return "";
    }
  }
  function info() {
    const b = curBai();
    if (!b) return null;
    const idx = chosenTiet(b);
    const ts = idx.map((i) => b.tiet[i]).filter(Boolean);
    return {
      b,
      idx,
      tong: idx.length,
      ppct: ts.map((t) => t.so).filter(Boolean),
      tuan: [...new Set(ts.map((t) => t.tuan).filter(Boolean))],
      chude: idx[0] === 0 ? chudeOf(b) : ""
    };
  }

  /* ---------- Lời nhắc ---------- */
  function promptText() {
    const f = info();
    if (!f) return "";
    const b = f.b;
    return K.prompt({
      subject: C.subjectName(st.mon, st.lop),
      subjectId: st.mon,
      grade: st.lop,
      book: b.book || "",
      bai: { so: b.so, ten: b.ten, trang: b.trang },
      tong: f.tong,
      ppct: f.ppct.join(", "),
      tuan: f.tuan.join(", "),
      giaoVien: teacher.name || "",
      extra: [st.extra, f.chude ? `Đây là bài mở đầu chủ đề "${f.chude}".` : "", f.tong < b.tiet.length ? `Chỉ soạn ${f.tong} tiết đã chọn (tiết ${f.idx.map((i) => i + 1).join(", ")} của bài).` : ""].filter(Boolean).join(" "),
      slides: true,
      source: st.src === "word" ? st.docText : ""
    });
  }
  // Rút chữ từ giáo án Word (.docx): đoạn văn giữ nguyên, bảng ghi theo hàng "ô | ô".
  async function docxText(file) {
    await u.loadScript("js/vendor/jszip.min.js");
    const zip = await window.JSZip.loadAsync(await file.arrayBuffer());
    const x = zip.file("word/document.xml");
    if (!x) throw new Error("Tệp không phải Word (.docx).");
    const d = new DOMParser().parseFromString(await x.async("string"), "application/xml");
    const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const para = (p) => [...p.getElementsByTagNameNS(W, "t")].map((t) => t.textContent).join("");
    const out = [];
    const walk = (el) => {
      [...el.children].forEach((c) => {
        if (c.localName === "p") {
          const t = para(c).trim();
          if (t) out.push(t);
        } else if (c.localName === "tbl") {
          [...c.children].filter((r) => r.localName === "tr").forEach((r) => {
            const cells = [...r.children].filter((x) => x.localName === "tc").map((tc) => [...tc.getElementsByTagNameNS(W, "p")].map(para).filter(Boolean).join(" / "));
            if (cells.some(Boolean)) out.push("| " + cells.join(" | ") + " |");
          });
        } else if (c.children && c.children.length) walk(c);
      });
    };
    walk(d.getElementsByTagNameNS(W, "body")[0] || d.documentElement);
    return out.join("\n");
  }
  function parseRaw(t) {
    t = String(t || "").trim();
    if (!t) throw new Error("Chưa dán kết quả của trợ lý AI.");
    const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
    let s = m ? m[1] : t;
    const a = s.indexOf("{");
    const z = s.lastIndexOf("}");
    if (a < 0 || z < a) throw new Error("Không thấy khối JSON trong nội dung đã dán.");
    s = s.slice(a, z + 1);
    try {
      return JSON.parse(s);
    } catch (e) {
      // Sửa lỗi hay gặp: dấu phẩy thừa trước } hoặc ].
      return JSON.parse(s.replace(/,\s*([}\]])/g, "$1"));
    }
  }
  function edoc() {
    const f = info();
    const b = f && f.b;
    return K.edocName({
      lop: st.lop,
      mon: st.mon,
      monTen: C.subjectName(st.mon, st.lop),
      cd: st.cd,
      tuan: f ? f.tuan.join(", ") : "",
      tiet: f ? f.ppct.join(", ") : "",
      tenBai: (b && b.ten) || (k && k.tenBai) || "",
      gv: (k && k.giaoVien) || teacher.name || "",
      v: st.v
    });
  }
  function build() {
    if (!k) return null;
    const f = info();
    const b = f && f.b;
    if (!st.gaId) st.gaId = `ga-${u.slug((b && b.ten) || k.tenBai).slice(0, 40)}-${u.uid(4).toLowerCase()}`;
    built = K.toPacks(k, {
      subjectId: st.mon,
      subject: C.subjectName(st.mon, st.lop),
      grade: st.lop,
      bai: b ? { key: b.key || "", so: b.so || "", ten: b.ten } : undefined,
      chude: f ? f.chude : "",
      gaId: st.gaId,
      ppct: f ? f.ppct : [],
      tuan: f ? f.tuan : []
    });
    k = built.k;
    return built;
  }

  /* ---------- Giao diện ---------- */
  function shell(inner) {
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(teacher)}`, { sub: "Soạn giáo án", nav: "giaoan" }) +
      `<main class="wrap" style="max-width:1400px">${inner}</main>` +
      L360.shell.footer();
    L360.shell.bindUserMenu(teacher);
  }
  function render() {
    const f = info();
    const b = f && f.b;
    const grades = st.mon ? C.gradesFor(st.mon) : [];
    const baiOpts = doc
      ? doc.bai.map((x) => `<option value="pl:${u.esc(x.id)}" ${st.baiId === "pl:" + x.id ? "selected" : ""}>${u.esc(x.ten)} (${(x.tiet || []).length} tiết)</option>`).join("")
      : st.mon && st.lop
      ? C.lessons(st.mon, st.lop)
          .flatMap((g) => g.lessons)
          .map((l) => `<option value="sgk:${u.esc(l.key)}" ${st.baiId === "sgk:" + l.key ? "selected" : ""}>${u.esc(l.so ? "Bài " + l.so + ". " : "")}${u.esc(l.ten)}</option>`)
          .join("")
      : "";
    const v = k ? K.validate(k) : null;
    shell(`<div class="row" style="align-items:flex-end;gap:12px;margin-bottom:14px"><div class="grow"><h1 style="margin:0">Soạn giáo án <span class="muted" style="font-weight:600">(Phụ lục 4)</span></h1>
        <p class="muted" style="margin:4px 0 0">Chọn bài theo Phụ lục 1 → trợ lý AI soạn giáo án đúng mẫu của tổ (hoặc chuyển giáo án Word có sẵn) → tải về Word, PDF và PowerPoint giảng dạy dùng offline.</p></div>
</div>
      <div class="ga-grid"><aside class="col" style="gap:14px;min-width:0">
        <section class="card"><h2 style="margin-top:0">1. Bài dạy</h2>
          <div class="grid g2" style="gap:8px"><label class="field">Môn<select id="gMon"><option value="">– Chọn môn –</option>${subjects()
            .map((s) => `<option value="${s.id}" ${st.mon === s.id ? "selected" : ""}>${u.esc(s.name)}</option>`)
            .join("")}</select></label>
          <label class="field">Lớp<select id="gLop"><option value="">–</option>${grades.map((g) => `<option ${String(st.lop) === String(g) ? "selected" : ""}>${g}</option>`).join("")}</select></label></div>
          ${Number(st.lop) >= 10 ? `<label class="row nowrap small" style="gap:6px;margin:-2px 0 8px"><input type="checkbox" id="gCd" ${st.cd ? "checked" : ""}> Chuyên đề học tập</label>` : ""}
          <label class="field">Bài${doc ? ` <span class="hint">theo Phụ lục 1 năm học ${u.esc((doc.nam || "").replace("-", "–"))}</span>` : st.mon && st.lop ? ` <span class="hint">chưa có Phụ lục 1 – chọn theo mục lục SGK</span>` : ""}<select id="gBai"><option value="">– Chọn bài –</option>${baiOpts}</select></label>
          ${
            b
              ? `<div class="small muted" style="margin:-4px 0 6px">Tiết cần soạn${b.sgk ? " (chọn số tiết)" : ""}:</div><div class="row" style="gap:6px;flex-wrap:wrap">${b.tiet
                  .map(
                    (t, i) =>
                      `<label class="chip ga-t ${f.idx.includes(i) ? "on" : ""}"><input type="checkbox" data-gt="${i}" ${f.idx.includes(i) ? "checked" : ""} hidden>Tiết ${i + 1}${t.so ? ` <small>· PPCT ${u.esc(t.so)}${t.tuan ? " · T" + u.esc(t.tuan) : ""}</small>` : ""}</label>`
                  )
                  .join("")}</div>
              <p class="tiny muted" style="margin:8px 0 0">${b.trang ? `SGK trang ${u.esc(b.trang)}` : ""}${b.book ? ` · ${u.esc(b.book)}` : ""}${f.chude ? ` · bài mở đầu chủ đề` : ""}</p>`
              : ""
          }
        </section>
        <section class="card"><h2 style="margin-top:0">2. Soạn với trợ lý AI</h2>
          <div class="seg" style="margin-bottom:10px"><button data-src="ai" class="${st.src === "ai" ? "on" : ""}">Soạn mới theo SGK</button><button data-src="word" class="${st.src === "word" ? "on" : ""}">Chuyển giáo án Word có sẵn</button></div>
          ${
            st.src === "word"
              ? `<label class="bg-drop" id="gDoc"><input type="file" accept=".docx" hidden>${ic("upload")}<b>${st.docName ? u.esc(st.docName) : "Chọn giáo án Word (.docx)"}</b><span class="small muted">${st.docText ? `Đã đọc ${st.docText.length.toLocaleString("vi-VN")} kí tự – nội dung sẽ nằm trong lời nhắc.` : "Nội dung giáo án được đưa vào lời nhắc để AI chuyển sang đúng mẫu và dựng trang chiếu."}</span></label>`
              : `<p class="small muted" style="margin:0 0 8px">Nên đính kèm SGK (tệp PDF của bài) khi gửi lời nhắc để AI bám đúng nội dung.</p>`
          }
          <label class="field" style="margin-top:8px">Yêu cầu thêm <span class="hint">không bắt buộc</span><textarea id="gExtra" rows="2" placeholder="Ví dụ: tăng hoạt động nhóm, dùng trò chơi ô chữ ở luyện tập…">${u.esc(st.extra)}</textarea></label>
          <button class="btn primary" id="gCopy" ${b ? "" : "disabled"} style="width:100%">${ic("copy")} Sao chép lời nhắc</button>
          <div class="row" style="gap:6px;margin-top:8px;justify-content:center"><a class="btn sm" href="https://chatgpt.com/" target="_blank" rel="noopener">ChatGPT ↗</a><a class="btn sm" href="https://gemini.google.com/app" target="_blank" rel="noopener">Gemini ↗</a><a class="btn sm" href="https://claude.ai/new" target="_blank" rel="noopener">Claude ↗</a></div>
        </section>
        <section class="card"><h2 style="margin-top:0">3. Dán kết quả của AI</h2>
          <textarea id="gRaw" rows="5" placeholder="Dán toàn bộ câu trả lời (có khối \`\`\`json\`\`\`) vào đây">${u.esc(st.raw)}</textarea>
          <button class="btn" id="gRead" style="width:100%;margin-top:8px">${ic("check")} Đọc giáo án</button>
          ${
            v
              ? `<div class="small" style="margin-top:8px">${v.errors.map((e) => `<div class="bg-flag" style="color:#B1352C">✕ ${u.esc(e)}</div>`).join("")}${v.warnings
                  .slice(0, 6)
                  .map((e) => `<div class="bg-flag">! ${u.esc(e)}</div>`)
                  .join("")}${!v.errors.length && !v.warnings.length ? `<div class="pill ok">Giáo án đúng cấu trúc</div>` : ""}</div>`
              : ""
          }
        </section>
        ${
          saved.length
            ? `<section class="card"><h3 style="margin-top:0">Giáo án đã lưu</h3>${saved
                .slice(0, 8)
                .map((g) => `<button class="ga-saved" data-open="${u.esc(g.gaId)}"><b class="clamp2">${u.esc(g.title)}</b><span class="tiny muted">${u.esc(g.label)} · ${g.n} tiết · ${u.fmtDate(g.up)}</span></button>`)
                .join("")}</section>`
            : ""
        }
      </aside>
      <section class="col" style="gap:14px;min-width:0">${k ? resultView() : emptyView()}</section></div>`);
    bind();
  }
  function emptyView() {
    return `<div class="card ga-empty"><div class="ga-flow">${[
      ["1", "Chọn bài", "Môn → lớp → bài theo Phụ lục 1; chọn các tiết cần soạn."],
      ["2", "Trợ lý AI soạn", "Sao chép lời nhắc, dán vào ChatGPT/Gemini/Claude (đính kèm SGK hoặc giáo án Word)."],
      ["3", "Dán kết quả", "Ứng dụng kiểm tra đúng mẫu: 1 khởi động – 1 luyện tập – 1 vận dụng, 4 bước, năng lực số, năng lực AI."],
      ["4", "Tải về dùng ngay", "Giáo án Word, PDF (đặt tên theo Edoc) và PowerPoint giảng dạy offline khớp số slide trong giáo án."]
    ]
      .map(([n, t, d]) => `<div class="ga-fs"><span>${n}</span><b>${t}</b><p class="small muted">${d}</p></div>`)
      .join("")}</div>
      <p class="small muted" style="margin:14px 0 0">Giáo án theo Phụ lục IV – CV 5512, tích hợp năng lực số (TT 02/2025) và năng lực AI (QĐ 2422), có hướng dẫn tự học ở nhà, phiếu học tập trước – trong – sau giờ, bảng ký xác nhận của tổ chuyên môn. PowerPoint có trang chủ đề, tên bài, tên mục, ghi vở, câu hỏi bấm hiện đáp án, đồng hồ, nhiệm vụ về nhà.</p></div>`;
  }
  function resultView() {
    const sum = built ? built.packs.reduce((a, p) => a + p.steps.length, 0) : 0;
    const slides = built ? L360.Pptx.plan(built.packs).slides.length : 0;
    return `<div class="card ga-bar"><label class="field" style="margin:0">Tên tệp nộp Edoc<input id="gName" value="${u.esc(edoc())}" style="font-size:.85rem"></label>
        <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><label class="small row nowrap" style="gap:6px">Phiên bản v<input id="gV" type="number" min="1" value="${st.v}" style="width:60px"></label>
          <label class="small row nowrap" style="gap:6px">Phông PowerPoint<select id="gFont">${["Arial", "Calibri", "Times New Roman"].map((x) => `<option ${st.font === x ? "selected" : ""}>${x}</option>`).join("")}</select></label><span class="spacer"></span>
          <span class="small muted">${k.tiet.length} tiết · ${slides} trang chiếu · ${sum} hoạt động</span></div>
        <div class="row ga-dl" style="gap:8px;margin-top:12px"><button class="btn primary" id="dWord">${ic("download")} Giáo án Word</button><button class="btn" id="dPdf">${ic("print")} Giáo án PDF</button><button class="btn" id="dPpt">${ic("slides")} PowerPoint giảng dạy</button><button class="btn ghost" id="dSave">${ic("save")} Lưu & mở trong Studio</button></div>
        <div id="gProg" class="small muted" style="margin-top:8px"></div></div>
      <div class="seg"><button data-view="ga" class="${st.view === "ga" ? "on" : ""}">Giáo án</button><button data-view="slides" class="${st.view === "slides" ? "on" : ""}">Bài giảng (trang chiếu)</button></div>
      <div class="card" id="gView" style="padding:0;overflow:hidden"></div>`;
  }
  function drawView() {
    const el = u.$("#gView");
    if (!el || !k) return;
    if (st.view === "ga") {
      el.innerHTML = `<div class="ga-doc">${K.html(k)}</div>`;
      return;
    }
    const B = L360.blocks;
    el.innerHTML = `<div class="ga-slides">${built.packs
      .map(
        (p) =>
          `<h3>Tiết ${p.tiet.so}/${p.tiet.tong}</h3>${p.steps
            .map((s) => {
              const ph = L360.phase(s.phase);
              const pages =
                s.type === "slide"
                  ? (s.pages || []).map((pg) => `<div class="ga-pg"><div class="ga-pgi">${B.page(pg)}</div></div>`).join("")
                  : (s.questions || []).map((q, i) => `<div class="ga-pg"><div class="ga-pgi"><div class="pg-t">Câu ${i + 1}</div><p style="font-size:1.4rem;font-weight:700">${u.esc(q.q || "")}</p>${(q.options || []).map((o, j) => `<div class="ga-opt ${Number(q.answer) === j ? "ok" : ""}">${"ABCD"[j]}. ${u.esc(o)}</div>`).join("")}</div></div>`).join("");
              return `<div class="ga-step"><div class="row nowrap" style="gap:8px"><span class="pill ga-ph ph-${s.phase}">${u.esc(ph.name)}</span><b>${u.esc(s.title)}</b><span class="tiny muted">${s.minutes || "?"} phút</span></div><div class="ga-pgs">${pages}</div></div>`;
            })
            .join("")}`
      )
      .join("")}<p class="small muted">PowerPoint còn có trang tiêu đề, mục tiêu, trang ghi nhớ cuối tiết và trang nhiệm vụ về nhà; hình ảnh được kiểm tra và nhúng sẵn khi tải.</p></div>`;
    // Thu nhỏ trang chiếu vừa khung xem trước.
    requestAnimationFrame(() => u.$$(".ga-pg", el).forEach((x) => x.firstElementChild && (x.firstElementChild.style.transform = `scale(${x.clientWidth / 960})`)));
  }

  // Tìm và kiểm tra ảnh cho các trang chiếu (chạy ngầm; PowerPoint chờ xong mới dựng).
  function fillImages() {
    if (!built) return Promise.resolve();
    const packs = built.packs;
    imgJob = (async () => {
      for (const p of packs) {
        await L360.Images.autoFill(p, (i, n) => {
          const el = u.$("#gProg");
          if (el) el.textContent = `Đang tìm ảnh minh hoạ cho tiết ${p.tiet.so}: ${i}/${n}…`;
        }).catch(() => null);
      }
      const el = u.$("#gProg");
      if (el) el.textContent = "";
      if (built && built.packs === packs && st.view === "slides") drawView();
    })();
    return imgJob;
  }
  async function readRaw() {
    try {
      const raw = parseRaw(u.$("#gRaw").value);
      st.raw = u.$("#gRaw").value;
      k = K.normalize(raw);
      st.gaId = "";
      build();
      save();
      render();
      drawView();
      fillImages();
      const v = K.validate(k);
      u.toast(v.errors.length ? `Giáo án còn ${v.errors.length} lỗi cấu trúc – xem danh sách bên trái.` : "Đã đọc giáo án. Tải về Word, PDF hoặc PowerPoint ở bên phải.", v.errors.length ? "bad" : "ok", 4000);
    } catch (e) {
      u.toast("Không đọc được: " + (e.message || e), "bad", 5000);
    }
  }
  function bind() {
    const on = (id, ev, fn) => u.$(id) && (u.$(id)[ev] = fn);
    on("#gMon", "onchange", async (e) => {
      st.mon = e.target.value;
      const gs = C.gradesFor(st.mon);
      if (!gs.map(String).includes(String(st.lop))) st.lop = gs.length ? String(gs[0]) : "";
      st.baiId = "";
      st.tiets = [];
      st.cd = false;
      await loadDoc();
      save();
      render();
    });
    on("#gLop", "onchange", async (e) => {
      st.lop = e.target.value;
      st.baiId = "";
      st.tiets = [];
      if (Number(st.lop) < 10) st.cd = false;
      await loadDoc();
      save();
      render();
    });
    on("#gCd", "onchange", async (e) => {
      st.cd = e.target.checked;
      st.baiId = "";
      st.tiets = [];
      await loadDoc();
      save();
      render();
    });
    on("#gBai", "onchange", (e) => {
      st.baiId = e.target.value;
      st.tiets = [];
      st.gaId = "";
      if (k) build(), (imgJob = null), fillImages();
      save();
      render();
    });
    u.$$("[data-gt]").forEach(
      (c) =>
        (c.onchange = () => {
          const b = curBai();
          const cur = chosenTiet(b);
          const i = Number(c.dataset.gt);
          let next = c.checked ? cur.concat([i]) : cur.filter((x) => x !== i);
          if (!next.length) next = [i];
          st.tiets = [...new Set(next)].sort((a, z) => a - z);
          if (k) build(), (imgJob = null), fillImages();
          save();
          render();
        })
    );
    u.$$("[data-src]").forEach((x) => (x.onclick = () => ((st.src = x.dataset.src), save(), render(), k && drawView())));
    const dz = u.$("#gDoc");
    if (dz) {
      const inp = dz.querySelector("input");
      const take = async (file) => {
        try {
          st.docText = await docxText(file);
          st.docName = file.name;
          save();
          render();
          if (k) drawView();
          u.toast(`Đã đọc giáo án ${file.name}.`, "ok");
        } catch (e) {
          u.toast(e.message || "Không đọc được tệp Word.", "bad", 5000);
        }
      };
      inp.onchange = () => inp.files[0] && take(inp.files[0]);
      dz.ondragover = (e) => (e.preventDefault(), dz.classList.add("over"));
      dz.ondragleave = () => dz.classList.remove("over");
      dz.ondrop = (e) => (e.preventDefault(), dz.classList.remove("over"), e.dataTransfer.files[0] && take(e.dataTransfer.files[0]));
    }
    on("#gExtra", "oninput", (e) => ((st.extra = e.target.value), save()));
    on("#gRaw", "oninput", (e) => ((st.raw = e.target.value), save()));
    on("#gCopy", "onclick", async () => {
      if (st.src === "word" && !st.docText) return u.toast("Chọn giáo án Word (.docx) trước.", "bad");
      const ok = await u.copy(promptText());
      u.toast(ok ? "Đã sao chép lời nhắc – dán vào ChatGPT, Gemini hoặc Claude, rồi dán câu trả lời vào ô 3." : "Không sao chép được.", ok ? "ok" : "bad", 4500);
    });
    on("#gRead", "onclick", readRaw);
    u.$$("[data-open]").forEach((x) => (x.onclick = () => openSaved(x.dataset.open)));
    if (!k) return;
    u.$$("[data-view]").forEach((x) => (x.onclick = () => ((st.view = x.dataset.view), save(), u.$$("[data-view]").forEach((y) => y.classList.toggle("on", y === x)), drawView())));
    on("#gV", "onchange", (e) => ((st.v = Math.max(1, Number(e.target.value) || 1)), save(), (u.$("#gName").value = edoc())));
    on("#gFont", "onchange", (e) => ((st.font = e.target.value), save()));
    const name = () => u.$("#gName").value.trim() || edoc();
    const busy = async (btn, fn) => {
      btn.disabled = true;
      try {
        await fn();
      } catch (e) {
        u.toast(e.message || String(e), "bad", 5000);
      }
      btn.disabled = false;
      u.$("#gProg").textContent = "";
    };
    on("#dWord", "onclick", (e) => busy(e.currentTarget, () => K.download(k, name() + ".docx")));
    on("#dPdf", "onclick", () => {
      try {
        K.pdf(k, name());
      } catch (e) {
        u.toast(e.message, "bad", 5000);
      }
    });
    on("#dPpt", "onclick", (e) =>
      busy(e.currentTarget, async () => {
        const prog = u.$("#gProg");
        const packs = built.packs;
        await (imgJob || fillImages());
        prog.textContent = "Đang dựng PowerPoint…";
        await L360.Pptx.download(packs, { font: st.font, fileName: name().replace(/_KHBD_/, "_BaiGiang_") + ".pptx" });
        u.toast("Đã tải PowerPoint giảng dạy (dùng offline).", "ok");
      })
    );
    on("#dSave", "onclick", (e) =>
      busy(e.currentTarget, async () => {
        for (const p of built.packs) {
          p.meta = Object.assign({}, p.meta, { authorUid: teacher.uid, authorName: teacher.name || "", khbdV: st.v });
          await L360.Lib.drafts.save(p, teacher);
        }
        await loadSaved();
        u.toast(`Đã lưu ${built.packs.length} tiết vào Bản nháp.`, "ok");
        location.href = `studio.html?tab=soan&sua=${encodeURIComponent(built.packs[0].id)}`;
      })
    );
    drawView();
  }
  async function loadSaved() {
    const list = await L360.Lib.drafts.list(teacher).catch(() => []);
    const g = {};
    list
      .filter((p) => p.khbd && p.meta && p.meta.gaId)
      .forEach((p) => {
        const x = (g[p.meta.gaId] = g[p.meta.gaId] || { gaId: p.meta.gaId, title: p.title, label: L360.Pack.label(p) || C.subjectName(p.subjectId, p.grade), n: 0, up: 0, packs: [] });
        x.n++;
        x.up = Math.max(x.up, (p.meta && p.meta.updatedAt) || 0);
        x.packs.push(p);
      });
    saved = Object.values(g).sort((a, b) => b.up - a.up);
  }
  async function openSaved(id) {
    const g = saved.find((x) => x.gaId === id);
    if (!g) return;
    const p0 = g.packs.sort((a, b) => a.tiet.so - b.tiet.so)[0];
    k = K.normalize(p0.khbd);
    st.mon = p0.subjectId;
    st.lop = String(p0.grade);
    st.gaId = id;
    st.v = Number(p0.meta.khbdV) || 1;
    st.raw = JSON.stringify(p0.khbd, null, 1);
    await loadDoc();
    const pb = doc && p0.bai.key ? doc.bai.find((x) => x.key === p0.bai.key) : null;
    st.baiId = pb ? "pl:" + pb.id : p0.bai.key ? "sgk:" + p0.bai.key : "";
    built = { packs: g.packs.sort((a, b) => a.tiet.so - b.tiet.so), k, gaId: id };
    imgJob = null;
    save();
    render();
  }

  (async function init() {
    teacher = await L360.Auth.requireTeacher(app, { title: "Đăng nhập để soạn giáo án" });
    load();
    if (!st.mon && teacher.subjects && teacher.subjects.length) st.mon = teacher.subjects[0];
    if (st.mon && !st.lop) st.lop = String((C.gradesFor(st.mon)[0] || "") || "");
    await loadDoc();
    await loadSaved();
    if (st.raw) {
      try {
        k = K.normalize(parseRaw(st.raw));
        build();
        setTimeout(fillImages, 300);
      } catch (e) {
        k = null;
      }
    }
    render();
  })();
})();
