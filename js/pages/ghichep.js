/* Trang "Ghi chép cuộc họp": ghi biên bản họp tổ, hội đồng, cha mẹ học sinh, sinh hoạt chuyên môn, tập huấn…
   Mẫu theo loại cuộc họp, soạn thảo có định dạng, chèn ảnh, đọc để ghi (giọng nói → chữ), tự lưu, tìm lại;
   việc cần làm sau họp đưa sang Lịch & ghi chú để được nhắc; tải Word / PDF làm minh chứng.
   Dữ liệu riêng của từng giáo viên: mine/<uid>/gc/{l: danh sách, d: nội dung, img: ảnh}. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ic = L360.icon;
  const G = L360.GhiChep;
  const L = L360.Lich;
  const cfg = L360.cfg;
  const app = u.$("#app");
  const dtq = /che-do=dien-tap/.test(location.search) ? "che-do=dien-tap" : "";
  const LS = (k, v) => {
    try {
      if (v === undefined) return localStorage.getItem(k);
      localStorage.setItem(k, v);
    } catch (e) {}
    return null;
  };
  let teacher = null;
  let list = {};
  let cur = null; // {id, meta, doc, imgs}
  let lastEd = null;
  let savedRange = null;
  let dirty = false;
  let saveP = null;
  const st = { q: "", f: "", mobileList: true };
  const base = () => `mine/${teacher.uid}/gc`;
  const MAX_IMG = 20;

  function render() {
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(teacher)}`, { sub: "Ghi chép cuộc họp", nav: "ghichep" }) +
      `<main class="wrap gc" style="max-width:1320px">
        <div class="gc-grid ${cur ? "has-cur" : ""}" id="gcGrid">
          <aside class="gc-side">
            <button class="btn primary block" id="gcNew">${ic("plus")} Ghi chép mới</button>
            <div class="lc-search" style="width:auto;margin:12px 0 8px">${ic("search")}<input type="search" id="gcQ" placeholder="Tìm trong ghi chép…" value="${u.esc(st.q)}" aria-label="Tìm ghi chép"></div>
            <select id="gcF" aria-label="Lọc theo loại cuộc họp"><option value="">Tất cả loại cuộc họp</option>${G.TYPES.map((t) => `<option value="${t.id}" ${st.f === t.id ? "selected" : ""}>${t.name}</option>`).join("")}</select>
            <div id="gcList" class="gc-list"></div>
          </aside>
          <section class="gc-main" id="gcMain"></section>
        </div>
      </main>` +
      L360.shell.footer();
    L360.shell.bindUserMenu(teacher);
    u.$("#gcNew").onclick = pickType;
    u.$("#gcQ").oninput = u.debounce((e) => ((st.q = e.target.value.trim()), drawList()), 150);
    u.$("#gcF").onchange = (e) => ((st.f = e.target.value), drawList());
    drawList();
    drawMain();
  }

  /* ---------- Danh sách ---------- */
  function drawList() {
    const el = u.$("#gcList");
    if (!el) return;
    const q = u.fold(st.q);
    const rows = u
      .entries(list)
      .map(([id, m]) => Object.assign({ id }, m))
      .filter((m) => (!st.f || m.loai === st.f) && (!q || u.fold([m.t, m.x, m.dd, m.ct, G.typeOf(m.loai).name].join(" ")).includes(q)))
      .sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || (b.ngay || "").localeCompare(a.ngay || "") || (b.up || 0) - (a.up || 0));
    if (!rows.length) {
      el.innerHTML = `<p class="small muted center" style="margin:24px 8px">${u.entries(list).length ? "Không tìm thấy ghi chép phù hợp." : "Chưa có ghi chép nào. Bấm “Ghi chép mới” để bắt đầu."}</p>`;
      return;
    }
    let lastMonth = "";
    el.innerHTML = rows
      .map((m) => {
        const t = G.typeOf(m.loai);
        const mon = m.pin ? "Đã ghim" : m.ngay ? `Tháng ${Number(m.ngay.slice(5, 7))}/${m.ngay.slice(0, 4)}` : "Chưa có ngày";
        const head = mon !== lastMonth ? `<div class="gc-mon">${mon}</div>` : "";
        lastMonth = mon;
        return `${head}<button class="gc-it ${cur && cur.id === m.id ? "on" : ""}" data-id="${u.esc(m.id)}" style="--c:${t.color}">
          <b class="clamp2">${m.pin ? "📌 " : ""}${u.esc(m.t || "(Chưa đặt tên)")}</b>
          <span class="tiny gc-it-m">${u.esc(t.name)} · ${m.ngay ? L.dmy(m.ngay) : ""}${m.bd ? " · " + m.bd : ""}${m.n ? ` · ${m.n} ảnh` : ""}</span>
          ${m.x ? `<span class="tiny muted clamp2">${u.esc(String(m.x).replace(/\s+/g, " ").slice(0, 160))}</span>` : ""}</button>`;
      })
      .join("");
    u.$$("[data-id]", el).forEach((b) => (b.onclick = () => open(b.dataset.id)));
  }

  /* ---------- Tạo mới ---------- */
  function pickType() {
    const m = u.modal(
      `<h2 style="margin-top:0">Ghi chép mới</h2><p class="muted" style="margin-top:-6px">Chọn loại cuộc họp – ứng dụng dựng sẵn các mục nội dung theo mẫu, thầy cô sửa tự do.</p>
      <div class="gc-types">${G.TYPES.map((t) => `<button class="gc-type" data-t="${t.id}" style="--c:${t.color}"><span class="gc-ti">${ic(t.icon)}</span><b>${t.name}</b><span class="tiny muted">${t.desc}</span></button>`).join("")}</div>`,
      { wide: true }
    );
    u.$$("[data-t]", m.el).forEach(
      (b) =>
        (b.onclick = async () => {
          m.close();
          await create(b.dataset.t);
        })
    );
  }
  async function create(type, from) {
    await flush();
    const t = G.typeOf(type);
    const now = new Date();
    const day = L.iso(now);
    const id = Date.now().toString(36) + u.uid(5);
    const meta = from
      ? (({ pin, ...rest }) => Object.assign(rest, { t: (from.meta.t || "") + " (bản sao)", ngay: day, at: Date.now(), up: Date.now() }))(from.meta)
      : {
          t: G.defTitle(type, day),
          loai: type,
          ngay: day,
          bd: `${String(now.getHours()).padStart(2, "0")}:${String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, "0")}`,
          kt: "",
          dd: type === "to" || type === "shcm" ? "Phòng họp tổ" : "",
          ct: type === "to" || type === "shcm" ? cfg.toTruong || "" : "",
          tk: "",
          x: "",
          n: 0,
          at: Date.now(),
          up: Date.now()
        };
    const doc = from ? Object.assign({}, u.clone(from.doc), { viec: (from.doc.viec || []).map((v) => Object.assign({}, v, { lid: null, x: false })) }) : { tp: "", vang: "", nd: t.nd, kl: "<p></p>", viec: [], dv: G.defUnit(type), so: "" };
    const imgs = from ? Object.assign({}, from.imgs) : {};
    try {
      const up = { [`l/${id}`]: meta, [`d/${id}`]: doc };
      Object.entries(imgs).forEach(([k, v]) => (up[`img/${id}/${k}`] = v));
      await L360.store.update(base(), up);
    } catch (e) {
      console.warn(e);
      return u.toast("Chưa tạo được ghi chép – kiểm tra kết nối mạng.", "bad");
    }
    list[id] = meta;
    cur = { id, meta, doc, imgs };
    drawList();
    drawMain(true);
    history.replaceState(null, "", `ghichep.html?${dtq ? dtq + "&" : ""}id=${id}`);
  }

  /* ---------- Mở, soạn ---------- */
  async function open(id) {
    if (cur && cur.id === id) return;
    await flush();
    const meta = list[id];
    if (!meta) return;
    u.$("#gcMain").innerHTML = `<p class="muted" style="padding:20px">Đang mở…</p>`;
    const [doc, imgs] = await Promise.all([L360.store.get(`${base()}/d/${id}`), L360.store.get(`${base()}/img/${id}`)]).catch(() => [null, null]);
    cur = { id, meta: Object.assign({}, meta), doc: Object.assign({ tp: "", vang: "", nd: "", kl: "", viec: [], dv: "", so: "" }, doc || {}), imgs: imgs || {} };
    cur.doc.viec = u.vals(cur.doc.viec).filter(Boolean);
    drawList();
    drawMain();
    history.replaceState(null, "", `ghichep.html?${dtq ? dtq + "&" : ""}id=${id}`);
  }
  const withSrc = (html) => {
    const d = document.createElement("div");
    d.innerHTML = G.sanitize(html);
    u.$$("img[data-k]", d).forEach((im) => cur.imgs[im.dataset.k] && (im.src = cur.imgs[im.dataset.k]));
    return d.innerHTML;
  };
  const TB = [
    ["bold", "<b>B</b>", "Đậm (Ctrl+B)"],
    ["italic", "<i>I</i>", "Nghiêng (Ctrl+I)"],
    ["underline", "<u>U</u>", "Gạch chân (Ctrl+U)"],
    "|",
    ["h", ic("heading"), "Tiêu đề mục"],
    ["ul", ic("list"), "Danh sách gạch đầu dòng"],
    ["ol", ic("olist"), "Danh sách số"],
    ["hl", ic("hl"), "Tô nổi bật"],
    "|",
    ["table", ic("table"), "Chèn bảng 3×3"],
    ["img", ic("image"), "Chèn ảnh (chụp bảng, tài liệu…)"],
    ["time", ic("clock"), "Chèn giờ hiện tại"],
    "|",
    ["undo", ic("undo"), "Hoàn tác (Ctrl+Z)"],
    ["redo", ic("redo"), "Làm lại (Ctrl+Y)"],
    ["clear", "<span style='font-weight:700'>T̸</span>", "Xoá định dạng"]
  ];
  function drawMain(focusTitle) {
    const el = u.$("#gcMain");
    const grid = u.$("#gcGrid");
    if (grid) grid.classList.toggle("has-cur", !!cur);
    if (!cur) {
      el.innerHTML = `<div class="card gc-empty"><span class="gc-ei">${ic("note")}</span><h2>Ghi chép cuộc họp</h2>
        <p class="muted">Ghi nhanh trong lúc họp, tự lưu, tìm lại khi cần và tải biên bản Word/PDF làm minh chứng. Việc được giao trong cuộc họp đưa sang Lịch để được nhắc hạn.</p>
        <div class="gc-types sm">${G.TYPES.map((t) => `<button class="gc-type" data-t="${t.id}" style="--c:${t.color}"><span class="gc-ti">${ic(t.icon)}</span><b>${t.name}</b></button>`).join("")}</div></div>`;
      u.$$("[data-t]", el).forEach((b) => (b.onclick = () => create(b.dataset.t)));
      return;
    }
    const { meta, doc } = cur;
    const t = G.typeOf(meta.loai);
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    el.innerHTML = `<div class="gc-doc" style="--c:${t.color}">
      <div class="gc-top row nowrap">
        <button class="btn sm ghost gc-back" id="gcBack" title="Về danh sách">‹ Danh sách</button>
        <span class="gc-saved tiny muted" id="gcSaved">${meta.up ? "Đã lưu " + u.fmtDateTime(meta.up) : ""}</span><span class="spacer"></span>
        <button class="btn sm ghost" id="gcPin" title="${meta.pin ? "Bỏ ghim" : "Ghim lên đầu danh sách"}">${ic(meta.pin ? "flagOn" : "flag")}</button>
        <button class="btn sm ghost" id="gcDup" title="Nhân bản (dùng lại cho cuộc họp sau)">${ic("copy")}<span class="nl"> Nhân bản</span></button>
        <button class="btn sm ghost" id="gcDel" title="Xoá ghi chép">${ic("trash")}</button>
        <button class="btn sm" id="gcWord">${ic("doc")} Tải Word</button>
        <button class="btn sm primary" id="gcPdf">${ic("download")} Tải PDF</button>
      </div>
      <input class="gc-title" id="g_t" value="${u.esc(meta.t)}" placeholder="Tên cuộc họp" maxlength="200" aria-label="Tên cuộc họp">
      <details class="gc-meta card" ${doc.tp ? "" : "open"} id="gcMeta"><summary><b>Thông tin cuộc họp</b><span class="tiny muted" id="gcMetaSum"></span></summary>
        <div class="gc-mg">
          <label class="field">Loại cuộc họp<select id="g_loai">${G.TYPES.map((x) => `<option value="${x.id}" ${x.id === meta.loai ? "selected" : ""}>${x.name}</option>`).join("")}</select></label>
          <label class="field">Ngày<input type="date" id="g_ngay" value="${meta.ngay || ""}"></label>
          <label class="field">Bắt đầu<input type="time" id="g_bd" value="${meta.bd || ""}"></label>
          <label class="field">Kết thúc<input type="time" id="g_kt" value="${meta.kt || ""}"></label>
          <label class="field">Địa điểm<input type="text" id="g_dd" value="${u.esc(meta.dd || "")}" maxlength="160" placeholder="Phòng họp tổ, Hội trường, Google Meet…"></label>
          <label class="field">Đơn vị (góc trái biên bản)<input type="text" id="g_dv" value="${u.esc(doc.dv || "")}" maxlength="120" placeholder="Tổ Khoa học xã hội / Lớp 10A2"></label>
          <label class="field">Chủ trì<input type="text" id="g_ct" value="${u.esc(meta.ct || "")}" maxlength="120"></label>
          <label class="field">Thư kí<input type="text" id="g_tk" value="${u.esc(meta.tk || "")}" maxlength="120"></label>
          <label class="field gc-w2">Thành phần tham dự<textarea id="g_tp" rows="2" maxlength="2000" placeholder="Ví dụ: Toàn thể giáo viên tổ (8/9 đồng chí)…">${u.esc(doc.tp || "")}</textarea></label>
          <label class="field">Vắng mặt<input type="text" id="g_vang" value="${u.esc(doc.vang || "")}" maxlength="400" placeholder="Họ tên – lí do"></label>
          <label class="field">Số biên bản (nếu có)<input type="text" id="g_so" value="${u.esc(doc.so || "")}" maxlength="40" placeholder="…/BB-TXH"></label>
        </div></details>
      <div class="gc-tb" id="gcTb" role="toolbar" aria-label="Định dạng">${TB.map((b) => (b === "|" ? `<span class="gc-tbs"></span>` : `<button type="button" data-cmd="${b[0]}" title="${b[2]}" aria-label="${b[2]}">${b[1]}</button>`)).join("")}
        <span class="spacer"></span><button type="button" class="gc-mic" id="gcMic" ${SR ? "" : "disabled"} title="${SR ? "Đọc để ghi: nói, ứng dụng chuyển thành chữ tại vị trí con trỏ (Chrome, Edge)" : "Trình duyệt này chưa hỗ trợ – dùng Chrome hoặc Edge"}">${ic("mic")}<span>Đọc để ghi</span></button></div>
      <div class="gc-lab">Nội dung cuộc họp</div>
      <div class="gc-ed" id="g_nd" contenteditable="true" spellcheck="false" data-ph="Ghi nội dung cuộc họp…">${withSrc(doc.nd)}</div>
      <div class="gc-lab">Kết luận</div>
      <div class="gc-ed sm" id="g_kl" contenteditable="true" spellcheck="false" data-ph="Kết luận của chủ trì…">${withSrc(doc.kl)}</div>
      <div class="gc-lab row nowrap">Việc cần làm sau cuộc họp<span class="spacer"></span><span class="tiny muted" style="font-weight:500;text-transform:none;letter-spacing:0">Bật ${ic("bell")} để đưa vào Lịch & ghi chú – ứng dụng nhắc trước hạn</span></div>
      <div id="gcViec" class="gc-viec"></div>
      <button type="button" class="btn sm ghost" id="gcVAdd">${ic("plus")} Thêm việc</button>
      <input type="file" id="gcImgIn" accept="image/*" multiple hidden>
    </div>`;
    drawViec();
    metaSum();
    bindEditor();
    if (focusTitle) {
      const ti = u.$("#g_t");
      ti.focus();
      ti.select();
    }
  }
  function metaSum() {
    const s = u.$("#gcMetaSum");
    if (!s || !cur) return;
    const m = cur.meta;
    s.textContent = [m.ngay && L.dmy(m.ngay), m.bd && m.bd + (m.kt ? "–" + m.kt : ""), m.dd, m.ct && "Chủ trì: " + m.ct].filter(Boolean).join(" · ");
  }
  function drawViec() {
    const box = u.$("#gcViec");
    const v = cur.doc.viec || [];
    box.innerHTML = v.length
      ? v
          .map(
            (r, i) => `<div class="gc-v ${r.x ? "x" : ""}" data-i="${i}">
          <input type="checkbox" data-vx ${r.x ? "checked" : ""} title="Đã xong">
          <input type="text" data-vt value="${u.esc(r.t || "")}" placeholder="Nội dung công việc" maxlength="300">
          <input type="text" data-va value="${u.esc(r.ai || "")}" placeholder="Người thực hiện" maxlength="120">
          <input type="date" data-vh value="${r.han || ""}" title="Thời hạn">
          <button type="button" class="gc-vl ${r.lid ? "on" : ""}" data-vl title="${r.lid ? "Đang có trong Lịch – bấm để bỏ" : "Đưa vào Lịch & ghi chú để được nhắc hạn"}">${ic("bell")}</button>
          <button type="button" class="btn sm ghost" data-vd title="Bỏ việc này">✕</button></div>`
          )
          .join("")
      : `<p class="tiny muted" style="margin:4px 2px 8px">Chưa có việc nào – ví dụ: “Nộp kế hoạch chuyên đề – cô Lan – 05/12”.</p>`;
  }

  /* ---------- Soạn thảo ---------- */
  function bindEditor() {
    const eds = [u.$("#g_nd"), u.$("#g_kl")];
    try {
      document.execCommand("styleWithCSS", false, false);
      document.execCommand("defaultParagraphSeparator", false, "p");
    } catch (e) {}
    eds.forEach((ed) => {
      ed.addEventListener("focus", () => (lastEd = ed));
      ed.addEventListener("input", touch);
      ed.addEventListener("paste", onPaste);
      ed.addEventListener("drop", onDrop);
      ed.addEventListener("keydown", (e) => {
        // Tab trong danh sách: lùi/thụt mức.
        if (e.key === "Tab" && document.queryCommandState && (document.queryCommandState("insertUnorderedList") || document.queryCommandState("insertOrderedList"))) {
          e.preventDefault();
          document.execCommand(e.shiftKey ? "outdent" : "indent");
          touch();
        }
      });
    });
    lastEd = eds[0];
    ["#g_t", "#g_loai", "#g_ngay", "#g_bd", "#g_kt", "#g_dd", "#g_dv", "#g_ct", "#g_tk", "#g_tp", "#g_vang", "#g_so"].forEach((s) => {
      const el = u.$(s);
      el.addEventListener("input", touch);
      el.addEventListener("change", touch);
    });
    u.$("#g_loai").addEventListener("change", (e) => {
      const t = G.typeOf(e.target.value);
      u.$(".gc-doc").style.setProperty("--c", t.color);
    });
    u.$$("#gcTb [data-cmd]").forEach((b) => {
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.onclick = () => cmd(b.dataset.cmd);
    });
    u.$("#gcMic").onmousedown = (e) => e.preventDefault();
    u.$("#gcMic").onclick = toggleMic;
    u.$("#gcImgIn").onchange = async (e) => {
      const files = [...e.target.files];
      e.target.value = "";
      for (const f of files) await addImage(f);
    };
    u.$("#gcVAdd").onclick = () => {
      collect();
      cur.doc.viec.push({ t: "", ai: "", han: "", x: false });
      drawViec();
      const ins = u.$$("#gcViec [data-vt]");
      ins[ins.length - 1].focus();
    };
    const vbox = u.$("#gcViec");
    vbox.addEventListener("input", touch);
    vbox.addEventListener("change", (e) => {
      if (e.target.matches("[data-vx]")) e.target.closest(".gc-v").classList.toggle("x", e.target.checked);
      touch();
    });
    vbox.addEventListener("click", async (e) => {
      const row = e.target.closest(".gc-v");
      if (!row) return;
      const i = Number(row.dataset.i);
      if (e.target.closest("[data-vd]")) {
        collect();
        const r = cur.doc.viec[i];
        if (r && r.lid) await L.remove(teacher.uid, r.lid).catch(() => {});
        cur.doc.viec.splice(i, 1);
        drawViec();
        touch();
      } else if (e.target.closest("[data-vl]")) {
        collect();
        const r = cur.doc.viec[i];
        if (r.lid) {
          await L.remove(teacher.uid, r.lid).catch(() => {});
          r.lid = null;
          u.toast("Đã bỏ khỏi Lịch.", "ok");
        } else {
          if (!r.t.trim()) return u.toast("Nhập nội dung việc trước.", "bad");
          if (!r.han) return u.toast("Chọn thời hạn để ứng dụng nhắc.", "bad");
          r.lid = await L.save(teacher.uid, lichItem(r));
          r.sig = sig(r);
          u.toast("Đã đưa vào Lịch & ghi chú – sẽ nhắc trước hạn 1 ngày.", "ok");
        }
        drawViec();
        touch();
      }
    });
    u.$("#gcBack").onclick = async () => {
      await flush();
      cur = null;
      drawList();
      drawMain();
      history.replaceState(null, "", `ghichep.html${dtq ? "?" + dtq : ""}`);
    };
    u.$("#gcPin").onclick = () => {
      cur.meta.pin = cur.meta.pin ? null : true;
      touch();
      flush().then(() => drawMain());
    };
    u.$("#gcDup").onclick = async () => {
      collect();
      await create(cur.meta.loai, u.clone(cur));
      u.toast("Đã nhân bản – sửa ngày và nội dung cho cuộc họp mới.", "ok");
    };
    u.$("#gcDel").onclick = async () => {
      if (!(await u.confirm(`Xoá ghi chép **${cur.meta.t || "này"}**? Không khôi phục được.`, "Xoá"))) return;
      const id = cur.id;
      const lids = (cur.doc.viec || []).map((r) => r.lid).filter(Boolean);
      dirty = false;
      await L360.store.update(base(), { [`l/${id}`]: null, [`d/${id}`]: null, [`img/${id}`]: null });
      await Promise.all(lids.map((x) => L.remove(teacher.uid, x).catch(() => {})));
      delete list[id];
      cur = null;
      drawList();
      drawMain();
      history.replaceState(null, "", `ghichep.html${dtq ? "?" + dtq : ""}`);
      u.toast("Đã xoá ghi chép.", "ok");
    };
    u.$("#gcWord").onclick = () => exportDlg("docx");
    u.$("#gcPdf").onclick = () => exportDlg("pdf");
  }
  document.addEventListener("selectionchange", () => {
    const s = document.getSelection();
    if (!s || !s.rangeCount) return;
    const r = s.getRangeAt(0);
    const ed = r.startContainer && (r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement);
    const host = ed && ed.closest && ed.closest(".gc-ed");
    if (host) {
      lastEd = host;
      savedRange = r.cloneRange();
    }
  });
  function restore() {
    if (!lastEd) lastEd = u.$("#g_nd");
    lastEd.focus();
    if (savedRange && lastEd.contains(savedRange.startContainer)) {
      const s = document.getSelection();
      s.removeAllRanges();
      s.addRange(savedRange);
    }
  }
  const hhmm = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  function cmd(c) {
    if (c === "img") return u.$("#gcImgIn").click();
    restore();
    const ex = (a, v) => document.execCommand(a, false, v);
    if (c === "h") ex("formatBlock", /^h[34]$/i.test(document.queryCommandValue("formatBlock") || "") ? "p" : "h3");
    else if (c === "ul") ex("insertUnorderedList");
    else if (c === "ol") ex("insertOrderedList");
    else if (c === "hl") {
      const sel = document.getSelection();
      const n = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
      const on = n && n.closest && n.closest("mark,span[style*='background']");
      ex("hiliteColor", on ? "transparent" : "#FFF176");
    } else if (c === "table") ex("insertHTML", `<table><tbody>${"<tr><td><br></td><td><br></td><td><br></td></tr>".repeat(3)}</tbody></table><p><br></p>`);
    else if (c === "time") ex("insertHTML", `&nbsp;<b>${hhmm()}</b>&nbsp;–&nbsp;`);
    else if (c === "clear") {
      ex("removeFormat");
      ex("formatBlock", "p");
    } else ex(c);
    touch();
  }
  function onPaste(e) {
    const cd = e.clipboardData;
    if (!cd) return;
    const files = [...(cd.files || [])].filter((f) => /^image\//.test(f.type));
    if (files.length) {
      e.preventDefault();
      files.forEach((f) => addImage(f));
      return;
    }
    const html = cd.getData("text/html");
    const text = cd.getData("text/plain");
    e.preventDefault();
    if (html) document.execCommand("insertHTML", false, G.sanitize(html));
    else if (text)
      document.execCommand(
        "insertHTML",
        false,
        text
          .split(/\r?\n/)
          .map((l) => u.esc(l))
          .join("<br>")
      );
    touch();
  }
  function onDrop(e) {
    const files = [...((e.dataTransfer && e.dataTransfer.files) || [])].filter((f) => /^image\//.test(f.type));
    if (!files.length) return;
    e.preventDefault();
    const pos = document.caretRangeFromPoint ? document.caretRangeFromPoint(e.clientX, e.clientY) : null;
    if (pos) {
      const s = document.getSelection();
      s.removeAllRanges();
      s.addRange(pos);
      savedRange = pos;
    }
    files.forEach((f) => addImage(f));
  }
  // Ảnh: thu nhỏ còn tối đa 1400 px, JPEG ~ 150–400 KB; lưu riêng, ô soạn thảo chỉ giữ mã ảnh.
  async function compress(file) {
    const url = URL.createObjectURL(file);
    try {
      const im = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = url;
      });
      const sc = Math.min(1, 1400 / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(im.naturalWidth * sc));
      c.height = Math.max(1, Math.round(im.naturalHeight * sc));
      const g = c.getContext("2d");
      g.fillStyle = "#fff";
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(im, 0, 0, c.width, c.height);
      let q = 0.82;
      let out = c.toDataURL("image/jpeg", q);
      while (out.length > 700000 && q > 0.45) out = c.toDataURL("image/jpeg", (q -= 0.12));
      return out;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  async function addImage(file) {
    if (!cur) return;
    if (Object.keys(cur.imgs).length >= MAX_IMG) return u.toast(`Mỗi ghi chép tối đa ${MAX_IMG} ảnh.`, "bad");
    let src;
    try {
      src = await compress(file);
    } catch (e) {
      return u.toast("Không đọc được ảnh này.", "bad");
    }
    const k = u.uid(10);
    try {
      await L360.store.set(`${base()}/img/${cur.id}/${k}`, src);
    } catch (e) {
      return u.toast("Chưa lưu được ảnh – kiểm tra kết nối mạng.", "bad");
    }
    cur.imgs[k] = src;
    restore();
    document.execCommand("insertHTML", false, `<img data-k="${k}" src="${src}" alt="Ảnh minh chứng"><br>`);
    touch();
  }

  /* ---------- Đọc để ghi (Web Speech API, tiếng Việt) ---------- */
  let rec = null;
  let listening = false;
  let interimEl = null;
  function toggleMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) return stopMic();
    if (!sessionStorage.getItem("l360:gc:mic")) {
      sessionStorage.setItem("l360:gc:mic", "1");
      u.toast("Giọng nói được trình duyệt gửi tới dịch vụ nhận dạng giọng nói (Google/Microsoft) để chuyển thành chữ. Không nên đọc thông tin bí mật.", "", 7000);
    }
    restore();
    rec = new SR();
    rec.lang = "vi-VN";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          restore();
          const t = r[0].transcript.trim();
          if (t) document.execCommand("insertText", false, t.charAt(0).toUpperCase() + t.slice(1) + ". ");
          touch();
        } else interim += r[0].transcript;
      }
      if (interimEl) interimEl.textContent = interim ? "“" + interim + "”" : "Đang nghe… nói rõ, chậm vừa phải";
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        u.toast("Chưa cho phép dùng micro – bấm biểu tượng ổ khoá cạnh địa chỉ trang để cho phép.", "bad", 6000);
        stopMic();
      } else if (e.error === "network") {
        u.toast("Đọc để ghi cần kết nối mạng.", "bad");
        stopMic();
      }
    };
    rec.onend = () => {
      if (listening)
        try {
          rec.start();
        } catch (e) {}
    };
    try {
      rec.start();
    } catch (e) {
      return;
    }
    listening = true;
    u.$("#gcMic").classList.add("on");
    u.$("#gcMic span").textContent = "Đang nghe – bấm để dừng";
    interimEl = u.html(`<div class="gc-interim no-print">Đang nghe… nói rõ, chậm vừa phải</div>`);
    document.body.appendChild(interimEl);
  }
  function stopMic() {
    listening = false;
    try {
      rec && rec.stop();
    } catch (e) {}
    const b = u.$("#gcMic");
    if (b) {
      b.classList.remove("on");
      u.$("span", b).textContent = "Đọc để ghi";
    }
    if (interimEl) interimEl.remove();
    interimEl = null;
  }

  /* ---------- Tự lưu ---------- */
  const autosave = u.debounce(() => save(), 900);
  function touch() {
    if (!cur) return;
    dirty = true;
    const s = u.$("#gcSaved");
    if (s) s.textContent = "Đang soạn…";
    autosave();
  }
  function collect() {
    if (!cur || !u.$("#g_t")) return;
    const v = (s) => u.$(s).value;
    const m = cur.meta;
    m.t = v("#g_t").trim();
    m.loai = v("#g_loai");
    m.ngay = v("#g_ngay");
    m.bd = v("#g_bd");
    m.kt = v("#g_kt");
    m.dd = v("#g_dd").trim();
    m.ct = v("#g_ct").trim();
    m.tk = v("#g_tk").trim();
    const d = cur.doc;
    d.dv = v("#g_dv").trim();
    d.tp = v("#g_tp");
    d.vang = v("#g_vang").trim();
    d.so = v("#g_so").trim();
    d.nd = G.sanitize(u.$("#g_nd").innerHTML);
    d.kl = G.sanitize(u.$("#g_kl").innerHTML);
    const old = d.viec || [];
    d.viec = u.$$("#gcViec .gc-v").map((row, i) => ({
      t: u.$("[data-vt]", row).value,
      ai: u.$("[data-va]", row).value,
      han: u.$("[data-vh]", row).value,
      x: u.$("[data-vx]", row).checked,
      lid: (old[i] && old[i].lid) || null,
      sig: (old[i] && old[i].sig) || ""
    }));
  }
  const sig = (r) => [r.t, r.ai, r.han, r.x ? 1 : 0].join("|");
  const lichItem = (r, prev) =>
    Object.assign({}, prev || {}, {
      id: r.lid || undefined,
      k: "viec",
      t: r.t.trim(),
      day: r.han,
      cat: (prev && prev.cat) || "hop",
      d: `Từ cuộc họp: ${cur.meta.t}${r.ai ? "\nNgười thực hiện: " + r.ai : ""}`,
      src: { gc: cur.id },
      done: r.x ? (prev && prev.done) || Date.now() : null
    });
  async function save() {
    if (!cur || !dirty) return saveP;
    collect();
    dirty = false;
    const id = cur.id;
    const m = cur.meta;
    const d = cur.doc;
    // Ảnh không còn trong nội dung thì xoá khỏi kho.
    const used = new Set([...(d.nd + d.kl).matchAll(/data-k="([a-z0-9]+)"/gi)].map((x) => x[1]));
    const up = {};
    Object.keys(cur.imgs).forEach((k) => {
      if (!used.has(k)) {
        up[`img/${id}/${k}`] = null;
        delete cur.imgs[k];
      }
    });
    m.n = Object.keys(cur.imgs).length;
    m.x = G.plain([d.tp, d.nd, d.kl, (d.viec || []).map((r) => r.t).join("\n")].join("\n")).slice(0, 4000);
    m.up = Date.now();
    up[`l/${id}`] = Object.assign({}, m);
    up[`d/${id}`] = Object.assign({}, d, { viec: (d.viec || []).map((r) => ({ t: r.t, ai: r.ai, han: r.han, x: !!r.x, lid: r.lid || null, sig: r.sig || null })) });
    const s = u.$("#gcSaved");
    if (s) s.textContent = "Đang lưu…";
    saveP = (async () => {
      try {
        await L360.store.update(base(), up);
        list[id] = Object.assign({}, m);
        // Việc đã đưa vào Lịch: cập nhật khi sửa nội dung, hạn, đánh dấu xong.
        const items = (L360.Nhac.data && L360.Nhac.data.i) || {};
        for (const r of d.viec || []) {
          if (!r.lid || r.sig === sig(r)) continue;
          if (!r.t.trim() || !r.han) continue;
          const prev = items[r.lid] ? Object.assign({ id: r.lid }, items[r.lid]) : null;
          await L.save(teacher.uid, lichItem(r, prev));
          r.sig = sig(r);
        }
        if (cur && cur.id === id) {
          const el = u.$("#gcSaved");
          if (el && !dirty) el.textContent = "Đã lưu " + hhmm();
          metaSum();
        }
        drawList();
      } catch (e) {
        console.warn(e);
        dirty = true;
        const el = u.$("#gcSaved");
        if (el) el.textContent = "Chưa lưu được – đang thử lại…";
        setTimeout(() => save(), 5000);
      }
    })();
    return saveP;
  }
  async function flush() {
    if (dirty) await save();
    else if (saveP) await saveP;
  }
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      save();
      e.preventDefault();
      e.returnValue = "";
    }
  });
  document.addEventListener("visibilitychange", () => document.hidden && dirty && save());

  /* ---------- Tải Word / PDF ---------- */
  function exportDlg(fmt) {
    collect();
    const t = G.typeOf(cur.meta.loai);
    const style = LS("l360:gc:style:" + cur.meta.loai) || (t.bb ? "bb" : "gc");
    const hasImg = Object.keys(cur.imgs).length > 0;
    const m = u.modal(`<h2 style="margin-top:0">Tải ${fmt === "pdf" ? "PDF" : "Word"}</h2>
      <div class="col" style="gap:10px">
        <label class="gc-opt"><input type="radio" name="gst" value="bb" ${style === "bb" ? "checked" : ""}><span><b>Biên bản</b><br><span class="small muted">Thể thức văn bản hành chính (Nghị định 30/2020): quốc hiệu, tiêu ngữ, đơn vị, địa danh – ngày tháng, chữ kí Thư kí – Chủ trì. Times New Roman 14.</span></span></label>
        <label class="gc-opt"><input type="radio" name="gst" value="gc" ${style === "gc" ? "checked" : ""}><span><b>Bản ghi chép</b><br><span class="small muted">Gọn: bảng thông tin cuộc họp, nội dung, kết luận, việc cần làm – dùng cho tập huấn, ghi chép cá nhân.</span></span></label>
        ${hasImg ? `<label class="row nowrap small" style="gap:8px"><input type="checkbox" id="gImg" checked> Kèm ${Object.keys(cur.imgs).length} ảnh trong nội dung</label>` : ""}
      </div>
      <p class="tiny muted" style="margin:12px 0 0">Tệp Word sửa tiếp được (thêm chữ kí, số văn bản). PDF được chuyển từ chính tệp Word nên giữ nguyên bố cục.</p>
      <div class="row" style="justify-content:flex-end;margin-top:16px;gap:8px"><button class="btn" data-close>Huỷ</button>${fmt === "pdf" ? `<button class="btn" id="gView">${ic("eye")} Xem trước</button>` : ""}<button class="btn primary" id="gGo">${ic("download")} Tải ${fmt === "pdf" ? "PDF" : "Word"}</button></div>
      <p class="small muted" id="gProg" style="margin:8px 0 0;min-height:1.2em"></p>`);
    const run = async (view) => {
      const st2 = (u.$("input[name=gst]:checked", m.el) || {}).value || "bb";
      LS("l360:gc:style:" + cur.meta.loai, st2);
      const prog = u.$("#gProg", m.el);
      u.$$("button", m.el).forEach((b) => (b.disabled = true));
      try {
        await flush();
        prog.textContent = "Đang tạo tệp Word…";
        const blob = await G.docx(cur.meta, cur.doc, cur.imgs, { style: st2, images: !u.$("#gImg", m.el) || u.$("#gImg", m.el).checked, author: teacher.name });
        const name = G.fileName(Object.assign({}, cur.meta, { loai: st2 === "bb" ? cur.meta.loai : "khac" }), fmt);
        if (fmt === "docx") {
          u.downloadBlob(name, blob);
          u.toast("Đã tải tệp Word.", "ok");
          return m.close();
        }
        prog.textContent = "Đang chuyển sang PDF…";
        await u.loadScript("js/core/word2pdf.js");
        const r = await L360.Word2Pdf.convert(await blob.arrayBuffer(), { title: cur.meta.t, onProgress: (x) => (prog.textContent = x) });
        const pdf = new Blob([r.bytes], { type: "application/pdf" });
        if (view) window.open(URL.createObjectURL(pdf), "_blank");
        else {
          u.downloadBlob(name, pdf);
          u.toast(`Đã tải PDF (${r.pages} trang).`, "ok");
          m.close();
        }
      } catch (e) {
        console.warn(e);
        u.toast("Chưa tạo được tệp: " + (e.message || e), "bad", 6000);
      } finally {
        prog.textContent = "";
        u.$$("button", m.el).forEach((b) => (b.disabled = false));
      }
    };
    u.$("#gGo", m.el).onclick = () => run(false);
    const v = u.$("#gView", m.el);
    if (v) v.onclick = () => run(true);
  }

  (async function init() {
    teacher = await L360.Auth.requireTeacher(app, { title: "Đăng nhập để ghi chép cuộc họp" });
    render();
    const want = u.qs("id");
    let first = true;
    L360.store.on(`${base()}/l`, (v) => {
      // Giữ bản đang soạn (chưa lưu) của ghi chép đang mở.
      list = v || {};
      if (cur && list[cur.id] && dirty) list[cur.id] = Object.assign({}, list[cur.id], cur.meta);
      drawList();
      if (first) {
        first = false;
        if (want && list[want]) open(want);
      }
    });
  })();
})();
