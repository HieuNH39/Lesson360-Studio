/* Trang "Kho biểu mẫu": biểu mẫu dùng chung của trường theo nhóm (Báo cáo, Biên bản, Đề – Ma trận – HDC, Kế hoạch, KHDH – Syllabus FSP…).
   Quản trị viên tải lên, sửa, thay bản mới, xoá; giáo viên tìm, xem trước, tải về.
   Tệp lưu trong Realtime Database theo từng khúc (không cần Firebase Storage trả phí); tệp lớn hơn 10 MB dùng liên kết Google Drive/OneDrive. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ic = L360.icon;
  const app = u.$("#app");
  const S = () => L360.store;
  const MAX = 10 * 1024 * 1024;
  const CHUNK = 700000;
  const NEW_DAYS = 14;
  const DEF_GROUPS = [
    ["bao-cao", "Báo cáo"],
    ["bien-ban", "Biên bản"],
    ["de-ma-tran", "Đề, Ma trận, HDC"],
    ["ke-hoach", "Kế hoạch"],
    ["khdh-syllabus", "KHDH, Syllabus FSP"]
  ];
  const TYPES = {
    docx: ["W", "#2B579A", "Word"],
    doc: ["W", "#2B579A", "Word"],
    xlsx: ["X", "#1E7145", "Excel"],
    xls: ["X", "#1E7145", "Excel"],
    csv: ["X", "#1E7145", "CSV"],
    pptx: ["P", "#C43E1C", "PowerPoint"],
    ppt: ["P", "#C43E1C", "PowerPoint"],
    pdf: ["PDF", "#D2453B", "PDF"],
    zip: ["ZIP", "#6B7A90", "Tệp nén"],
    rar: ["ZIP", "#6B7A90", "Tệp nén"],
    png: ["ẢNH", "#0C9A9A", "Ảnh"],
    jpg: ["ẢNH", "#0C9A9A", "Ảnh"],
    jpeg: ["ẢNH", "#0C9A9A", "Ảnh"],
    link: ["", "#2F6FDB", "Liên kết"]
  };
  const MIME = {
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    doc: "application/msword",
    xls: "application/vnd.ms-excel",
    ppt: "application/vnd.ms-powerpoint",
    pdf: "application/pdf",
    csv: "text/csv",
    zip: "application/zip",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg"
  };
  const ACCEPT = ".docx,.doc,.xlsx,.xls,.csv,.pptx,.ppt,.pdf,.zip,.rar,.png,.jpg,.jpeg";
  let teacher = null;
  let groups = null;
  let items = {};
  let dls = {};
  const st = { g: "", q: "", sort: "group" };
  const isAdmin = () => !!(teacher && teacher.isAdmin);
  const extOf = (n) => (String(n || "").match(/\.([a-z0-9]{2,5})$/i) || [, ""])[1].toLowerCase();
  const typeOf = (it) => TYPES[it.link ? "link" : (it.file && it.file.ext) || ""] || ["?", "#6B7A90", "Tệp"];
  const fmtSize = (n) => (!n ? "" : n > 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
  const groupList = () =>
    groups && Object.keys(groups).length
      ? u.entries(groups).map(([id, g]) => ({ id, name: g.name, o: g.o || 0 })).sort((a, b) => a.o - b.o)
      : DEF_GROUPS.map(([id, name], i) => ({ id, name, o: i + 1 }));
  const gName = (id) => (groupList().find((g) => g.id === id) || { name: "Khác" }).name;
  const isNew = (it) => Date.now() - (it.up || it.at || 0) < NEW_DAYS * 86400000;
  const all = () => u.entries(items).map(([id, x]) => Object.assign({ id }, x));
  const baseName = (n) => String(n || "").replace(/\.[a-z0-9]{2,5}$/i, "");

  function render() {
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(teacher)}`, { sub: "Kho biểu mẫu", nav: "bieumau" }) +
      `<main class="wrap bm" style="max-width:1240px">
        <div class="row lc-head"><div class="grow"><h1 style="margin-bottom:2px">Kho biểu mẫu</h1><p class="muted" style="margin:0">Biểu mẫu dùng chung của ${u.esc(L360.cfg.school || "trường")} – xem trước, tải về khi cần.${isAdmin() ? " Quản trị viên thêm, sửa, thay bản mới." : ""}</p></div>
          ${isAdmin() ? `<div class="row nowrap" style="gap:8px"><button class="btn" id="bmGroups">${ic("folder")} Quản lí nhóm</button><button class="btn primary" id="bmAdd">${ic("upload")} Thêm biểu mẫu</button></div>` : ""}</div>
        <div class="bm-groups" id="bmG"></div>
        <div class="row lc-bar" style="margin-top:6px"><h2 id="bmTitle" style="margin:0;font-size:1.2rem"></h2><span class="spacer"></span>
          <select id="bmSort" style="width:auto;min-height:38px!important;padding:6px 36px 6px 12px!important;font-size:.9rem" aria-label="Sắp xếp"><option value="group">Theo nhóm, tên</option><option value="new">Mới cập nhật</option><option value="name">Tên A–Z</option></select>
          <div class="lc-search" style="width:260px">${ic("search")}<input type="search" id="bmQ" placeholder="Tìm biểu mẫu…" aria-label="Tìm biểu mẫu"></div></div>
        <div id="bmList" class="bm-list ${isAdmin() ? "admin" : ""}"><p class="muted">Đang tải…</p></div>
      </main>` +
      L360.shell.footer();
    L360.shell.bindUserMenu(teacher);
    u.$("#bmQ").oninput = u.debounce((e) => ((st.q = e.target.value.trim()), draw()), 150);
    u.$("#bmSort").onchange = (e) => ((st.sort = e.target.value), draw());
    if (isAdmin()) {
      u.$("#bmAdd").onclick = () => upload([]);
      u.$("#bmGroups").onclick = manageGroups;
      // Kéo thả tệp vào trang để thêm nhanh.
      const main = u.$(".bm");
      main.addEventListener("dragover", (e) => {
        if (![...(e.dataTransfer.types || [])].includes("Files")) return;
        e.preventDefault();
        main.classList.add("drop");
      });
      main.addEventListener("dragleave", (e) => e.target === main && main.classList.remove("drop"));
      main.addEventListener("drop", (e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        main.classList.remove("drop");
        upload([...e.dataTransfer.files]);
      });
    }
  }
  function draw() {
    const gl = groupList();
    const list = all();
    const count = (id) => list.filter((x) => x.g === id).length;
    const other = list.filter((x) => !gl.some((g) => g.id === x.g)).length;
    u.$("#bmG").innerHTML =
      `<button class="bm-g ${!st.g ? "on" : ""}" data-g=""><span class="bm-gi">${ic("grid")}</span><b>Tất cả</b><small>${list.length}</small></button>` +
      gl.map((g) => `<button class="bm-g ${st.g === g.id ? "on" : ""}" data-g="${u.esc(g.id)}"><span class="bm-gi">${ic("folder")}</span><b>${u.esc(g.name)}</b><small>${count(g.id)}</small></button>`).join("") +
      (other ? `<button class="bm-g ${st.g === "_" ? "on" : ""}" data-g="_"><span class="bm-gi">${ic("folder")}</span><b>Khác</b><small>${other}</small></button>` : "");
    u.$$("#bmG [data-g]").forEach((b) => (b.onclick = () => ((st.g = b.dataset.g), draw())));
    u.$("#bmTitle").textContent = !st.g ? "Tất cả biểu mẫu" : st.g === "_" ? "Khác" : gName(st.g);
    const q = u.fold(st.q);
    let rows = list.filter((x) => (!st.g || (st.g === "_" ? !gl.some((g) => g.id === x.g) : x.g === st.g)) && (!q || u.fold([x.name, x.desc, x.file && x.file.n, gName(x.g)].join(" ")).includes(q)));
    const order = Object.fromEntries(gl.map((g, i) => [g.id, i]));
    if (st.sort === "new") rows.sort((a, b) => (b.up || 0) - (a.up || 0));
    else if (st.sort === "name") rows.sort((a, b) => a.name.localeCompare(b.name, "vi"));
    else rows.sort((a, b) => (order[a.g] ?? 99) - (order[b.g] ?? 99) || a.name.localeCompare(b.name, "vi"));
    const el = u.$("#bmList");
    if (!rows.length) {
      el.innerHTML = `<div class="empty">${
        list.length ? "Không có biểu mẫu phù hợp." : isAdmin() ? `Kho chưa có biểu mẫu. Bấm <b>Thêm biểu mẫu</b> hoặc kéo thả tệp Word, Excel, PDF vào đây.` : "Kho chưa có biểu mẫu – quản trị viên sẽ sớm cập nhật."
      }</div>`;
      return;
    }
    el.innerHTML = rows
      .map((x) => {
        const [lab, col, kind] = typeOf(x);
        const n = Object.keys(dls[x.id] || {}).length;
        const canView = x.link || ["docx", "pdf", "xlsx", "xls", "csv", "png", "jpg", "jpeg"].includes(x.file && x.file.ext);
        return `<div class="bm-row" data-id="${u.esc(x.id)}">
          <span class="bm-ic" style="--c:${col}">${x.link ? ic("link") : lab}</span>
          <div class="grow bm-tx"><b>${u.esc(x.name)}${isNew(x) ? ` <span class="pill sm ok">Mới</span>` : ""}${x.v > 1 ? ` <span class="pill sm">Bản ${x.v}</span>` : ""}</b>
            ${x.desc ? `<span class="small muted clamp2">${u.esc(x.desc)}</span>` : ""}
            <span class="tiny muted">${!st.g ? `<span class="bm-chip">${u.esc(gName(x.g))}</span>` : ""}${kind}${x.file && x.file.size ? " · " + fmtSize(x.file.size) : ""} · cập nhật ${u.fmtDate(x.up || x.at)}${isAdmin() && n ? ` · ${n} lượt tải` : ""}</span></div>
          <div class="bm-act">${canView ? `<button class="btn sm ghost" data-a="view" title="${x.link ? "Mở liên kết" : "Xem trước"}">${ic(x.link ? "link" : "eye")}<span class="nl"> ${x.link ? "Mở" : "Xem"}</span></button>` : ""}
            ${x.link ? "" : `<button class="btn sm primary" data-a="dl">${ic("download")} Tải về</button>`}
            ${isAdmin() ? `<button class="btn sm ghost" data-a="edit" title="Sửa, thay bản mới">${ic("edit")}</button><button class="btn sm ghost" data-a="del" title="Xoá">${ic("trash")}</button>` : ""}</div></div>`;
      })
      .join("");
    u.$$("#bmList [data-a]").forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.closest("[data-id]").dataset.id;
          const x = Object.assign({ id }, items[id]);
          const a = b.dataset.a;
          if (a === "dl") download(x, b);
          else if (a === "view") view(x);
          else if (a === "edit") upload([], x);
          else if (a === "del") remove(x);
        })
    );
  }

  /* ---------- Đọc / ghi tệp theo khúc ---------- */
  const toB64 = (file) =>
    new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).replace(/^data:[^,]*,/, ""));
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
  async function fetchBytes(x, onProg) {
    const n = (x.file && x.file.chunks) || 1;
    const parts = [];
    for (let i = 0; i < n; i++) {
      onProg && onProg(i, n);
      const p = await S().get(`forms/blob/${x.id}/${i}`);
      if (typeof p !== "string") throw new Error("Tệp trên máy chủ chưa đủ – nhờ quản trị viên tải lại.");
      parts.push(p);
    }
    const bin = atob(parts.join(""));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  async function download(x, btn) {
    const old = btn ? btn.innerHTML : "";
    try {
      if (btn) (btn.disabled = true), (btn.textContent = "Đang tải…");
      const bytes = await fetchBytes(x, (i, n) => btn && n > 2 && (btn.textContent = `Đang tải ${Math.round((i / n) * 100)}%`));
      u.downloadBlob(x.file.n, new Blob([bytes], { type: x.file.mime || MIME[x.file.ext] || "application/octet-stream" }));
      S().set(`forms/dl/${x.id}/${teacher.uid}`, Date.now()).catch(() => {});
    } catch (e) {
      console.warn(e);
      u.toast(e.message || "Chưa tải được – kiểm tra kết nối mạng.", "bad", 5000);
    } finally {
      if (btn) (btn.disabled = false), (btn.innerHTML = old);
    }
  }
  async function view(x) {
    if (x.link) return window.open(x.link, "_blank", "noopener");
    const m = u.modal(`<div class="row nowrap" style="gap:10px;margin:0 30px 12px 0"><h2 style="margin:0" class="grow ellipsis">${u.esc(x.name)}</h2><button class="btn sm primary" id="pvDl">${ic("download")} Tải về</button></div><div class="bm-pv" id="pv"><p class="muted">Đang mở…</p></div>`, { wide: true });
    u.$("#pvDl", m.el).onclick = (e) => download(x, e.currentTarget);
    const box = u.$("#pv", m.el);
    try {
      const bytes = await fetchBytes(x);
      const ext = x.file.ext;
      if (ext === "pdf") box.innerHTML = `<iframe src="${URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }))}" title="${u.esc(x.name)}"></iframe>`;
      else if (["png", "jpg", "jpeg"].includes(ext)) box.innerHTML = `<img src="${URL.createObjectURL(new Blob([bytes], { type: MIME[ext] }))}" alt="${u.esc(x.name)}">`;
      else if (ext === "docx") {
        await u.loadScript("js/vendor/jszip.min.js");
        await u.loadScript("js/vendor/docx-preview.min.js");
        box.innerHTML = "";
        box.classList.add("docx");
        await window.docx.renderAsync(bytes.buffer, box, null, { inWrapper: true, ignoreLastRenderedPageBreak: false, experimental: false });
      } else if (["xlsx", "xls", "csv"].includes(ext)) {
        await u.loadScript("js/vendor/xlsx.full.min.js");
        const wb = window.XLSX.read(bytes, { type: "array" });
        const tabs = wb.SheetNames;
        const show = (i) => {
          const html = window.XLSX.utils.sheet_to_html(wb.Sheets[tabs[i]], { editable: false });
          const doc = new DOMParser().parseFromString(html, "text/html");
          const t = doc.querySelector("table");
          box.innerHTML = (tabs.length > 1 ? `<div class="seg sm" style="margin-bottom:10px">${tabs.map((n, j) => `<button data-s="${j}" class="${i === j ? "on" : ""}">${u.esc(n)}</button>`).join("")}</div>` : "") + `<div class="bm-xl">${t ? t.outerHTML : "<p class='muted'>Trang tính trống.</p>"}</div>`;
          u.$$("[data-s]", box).forEach((b) => (b.onclick = () => show(Number(b.dataset.s))));
        };
        show(0);
      }
    } catch (e) {
      console.warn(e);
      box.innerHTML = `<p class="muted">Không xem trước được tệp này – bấm “Tải về” để mở bằng Word/Excel.</p>`;
    }
  }

  /* ---------- Quản trị: thêm, sửa, thay bản mới, xoá ---------- */
  async function ensureGroups() {
    if (groups && Object.keys(groups).length) return;
    const out = {};
    DEF_GROUPS.forEach(([id, name], i) => (out[id] = { name, o: i + 1 }));
    await S().set("forms/groups", out);
  }
  function upload(files, edit) {
    const gl = groupList();
    const st2 = {
      files: files.map((f) => ({ f, name: baseName(f.name) })),
      mode: edit && edit.link ? "link" : "file",
      busy: false,
      g: edit ? edit.g : st.g && st.g !== "_" ? st.g : gl[0].id,
      name: edit ? edit.name : "",
      desc: (edit && edit.desc) || "",
      link: (edit && edit.link) || "",
      linkName: ""
    };
    const m = u.modal(`<div class="bm-up"></div>`);
    const box = u.$(".bm-up", m.el);
    const drawUp = () => {
      box.innerHTML = `<h2 style="margin-top:0">${edit ? "Sửa biểu mẫu" : "Thêm biểu mẫu"}</h2>
        <label class="field">Nhóm<select id="upG">${gl.map((g) => `<option value="${u.esc(g.id)}" ${st2.g === g.id ? "selected" : ""}>${u.esc(g.name)}</option>`).join("")}</select></label>
        ${edit ? `<label class="field">Tên biểu mẫu<input type="text" id="upN" value="${u.esc(st2.name)}" maxlength="200"></label>` : ""}
        <div class="seg sm" id="upMode" style="margin:4px 0 10px"><button type="button" data-m="file" class="${st2.mode === "file" ? "on" : ""}">${edit ? "Thay tệp" : "Tải tệp lên"}</button><button type="button" data-m="link" class="${st2.mode === "link" ? "on" : ""}">Dán liên kết (Drive, OneDrive)</button></div>
        ${
          st2.mode === "file"
            ? `<label class="bg-drop" id="upDrop" style="padding:18px"><input type="file" accept="${ACCEPT}" ${edit ? "" : "multiple"} hidden>${ic("upload")}<b>${edit ? "Chọn tệp mới để thay (không bắt buộc)" : "Chọn hoặc kéo thả tệp"}</b><span class="small muted">Word, Excel, PowerPoint, PDF, ảnh, ZIP · tối đa 10 MB mỗi tệp${edit && edit.file ? ` · Tệp hiện tại: ${u.esc(edit.file.n)} (${fmtSize(edit.file.size)})` : ""}</span></label>
               <div id="upFiles" class="col" style="gap:6px;margin-top:10px">${st2.files
                 .map(
                   (x, i) => `<div class="bm-uf row nowrap"><span class="bm-ic sm" style="--c:${(TYPES[extOf(x.f.name)] || [, "#6B7A90"])[1]}">${(TYPES[extOf(x.f.name)] || ["?"])[0]}</span>${
                     edit ? `<span class="grow ellipsis">${u.esc(x.f.name)}</span>` : `<input type="text" data-fn="${i}" value="${u.esc(x.name)}" maxlength="200" title="Tên hiển thị trong kho">`
                   }<span class="tiny muted" style="white-space:nowrap">${fmtSize(x.f.size)}</span><button type="button" class="btn sm ghost" data-rm="${i}">✕</button></div>`
                 )
                 .join("")}</div>`
            : `<label class="field">Liên kết<input type="url" id="upL" value="${u.esc(st2.link)}" placeholder="https://drive.google.com/…"></label>${edit ? "" : `<label class="field">Tên biểu mẫu<input type="text" id="upLN" value="${u.esc(st2.linkName)}" maxlength="200"></label>`}
               <p class="tiny muted" style="margin-top:-4px">Trên Google Drive: chuột phải tệp → Chia sẻ → “Bất kì ai có đường liên kết” (hoặc “Trong tổ chức fpt.edu.vn”) → Sao chép đường liên kết.</p>`
        }
        <label class="field" style="margin-top:8px">Mô tả (không bắt buộc)<textarea id="upD" rows="2" maxlength="500" placeholder="Dùng khi nào, hạn nộp, lưu ý điền…">${u.esc(st2.desc)}</textarea></label>
        <div class="bm-prog hidden" id="upP"><div></div></div><p class="small muted" id="upT" style="margin:6px 0 0;min-height:1.2em"></p>
        <div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button class="btn" data-close>Huỷ</button><button class="btn primary" id="upGo">${ic("save")} ${edit ? "Lưu" : "Tải lên"}</button></div>`;
      [["#upG", "g"], ["#upN", "name"], ["#upD", "desc"], ["#upL", "link"], ["#upLN", "linkName"]].forEach(([sel, k]) => {
        const el = u.$(sel, box);
        if (el) el.oninput = el.onchange = () => (st2[k] = el.value);
      });
      u.$$("#upMode [data-m]", box).forEach((b) => (b.onclick = () => ((st2.mode = b.dataset.m), drawUp())));
      const dz = u.$("#upDrop", box);
      if (dz) {
        const inp = dz.querySelector("input");
        const add = (list) => {
          [...list].forEach((f) => {
            if (!ACCEPT.split(",").includes("." + extOf(f.name))) return u.toast(`${f.name}: định dạng chưa hỗ trợ.`, "bad");
            if (f.size > MAX) return u.toast(`${f.name} lớn hơn 10 MB – hãy tải lên Google Drive rồi dùng “Dán liên kết”.`, "bad", 6000);
            if (edit) st2.files = [{ f, name: baseName(f.name) }];
            else st2.files.push({ f, name: baseName(f.name) });
          });
          drawUp();
        };
        inp.onchange = () => (add(inp.files), (inp.value = ""));
        dz.ondragover = (e) => (e.preventDefault(), e.stopPropagation(), dz.classList.add("over"));
        dz.ondragleave = () => dz.classList.remove("over");
        dz.ondrop = (e) => (e.preventDefault(), e.stopPropagation(), dz.classList.remove("over"), add(e.dataTransfer.files));
      }
      u.$$("[data-fn]", box).forEach((inp) => (inp.oninput = () => (st2.files[Number(inp.dataset.fn)].name = inp.value)));
      u.$$("[data-rm]", box).forEach((b) => (b.onclick = () => (st2.files.splice(Number(b.dataset.rm), 1), drawUp())));
      u.$("#upGo", box).onclick = go;
    };
    const prog = (frac, text) => {
      const p = u.$("#upP", box);
      p.classList.remove("hidden");
      p.firstElementChild.style.width = Math.round(frac * 100) + "%";
      u.$("#upT", box).textContent = text || "";
    };
    async function putFile(id, f, onP) {
      const b64 = await toB64(f);
      const n = Math.max(1, Math.ceil(b64.length / CHUNK));
      // Xoá khúc cũ (khi thay tệp) rồi ghi lần lượt từng khúc.
      await S().remove(`forms/blob/${id}`);
      for (let i = 0; i < n; i++) {
        onP(i / n);
        await S().set(`forms/blob/${id}/${i}`, b64.slice(i * CHUNK, (i + 1) * CHUNK));
      }
      const ext = extOf(f.name);
      return { n: f.name, ext, size: f.size, mime: f.type || MIME[ext] || "", chunks: n };
    }
    async function go() {
      if (st2.busy) return;
      const g = u.$("#upG", box).value;
      const desc = u.$("#upD", box).value.trim();
      const by = { by: teacher.uid, byName: teacher.name || teacher.acc || "" };
      st2.busy = true;
      u.$("#upGo", box).disabled = true;
      try {
        await ensureGroups();
        if (edit) {
          const name = u.$("#upN", box).value.trim();
          if (!name) throw new Error("Nhập tên biểu mẫu.");
          const upd = Object.assign({}, items[edit.id], { name, g, desc, up: Date.now() }, by);
          if (st2.mode === "link") {
            const link = u.$("#upL", box).value.trim();
            if (!/^https:\/\/\S+$/i.test(link)) throw new Error("Liên kết phải bắt đầu bằng https://");
            if (upd.file) await S().remove(`forms/blob/${edit.id}`);
            upd.link = link;
            delete upd.file;
            if (link !== edit.link) upd.v = (edit.v || 1) + 1;
          } else if (st2.files.length) {
            upd.file = await putFile(edit.id, st2.files[0].f, (fr) => prog(fr, "Đang tải lên…"));
            delete upd.link;
            upd.v = (edit.v || 1) + 1;
          } else if (!upd.file) throw new Error("Chọn tệp để tải lên.");
          await S().set(`forms/items/${edit.id}`, upd);
          u.toast(st2.files.length || upd.v !== edit.v ? `Đã cập nhật bản ${upd.v}.` : "Đã lưu.", "ok");
        } else if (st2.mode === "link") {
          const link = u.$("#upL", box).value.trim();
          const name = u.$("#upLN", box).value.trim();
          if (!/^https:\/\/\S+$/i.test(link)) throw new Error("Liên kết phải bắt đầu bằng https://");
          if (!name) throw new Error("Nhập tên biểu mẫu.");
          const id = Date.now().toString(36) + u.uid(5);
          await S().set(`forms/items/${id}`, Object.assign({ name, g, desc, link, at: Date.now(), up: Date.now(), v: 1 }, by));
          u.toast("Đã thêm liên kết.", "ok");
        } else {
          if (!st2.files.length) throw new Error("Chọn tệp để tải lên.");
          if (st2.files.some((x) => !x.name.trim())) throw new Error("Đặt tên cho mỗi biểu mẫu.");
          const total = st2.files.length;
          for (let k = 0; k < total; k++) {
            const x = st2.files[k];
            const id = Date.now().toString(36) + u.uid(5);
            const file = await putFile(id, x.f, (fr) => prog((k + fr) / total, `Đang tải lên ${k + 1}/${total}: ${x.f.name}`));
            await S().set(`forms/items/${id}`, Object.assign({ name: x.name.trim().slice(0, 200), g, desc, file, at: Date.now(), up: Date.now(), v: 1 }, by));
          }
          u.toast(total > 1 ? `Đã tải lên ${total} biểu mẫu.` : "Đã tải lên.", "ok");
        }
        st.g = g;
        m.close();
      } catch (e) {
        console.warn(e);
        u.toast(e.message || "Chưa tải lên được – kiểm tra kết nối mạng.", "bad", 6000);
        st2.busy = false;
        const b = u.$("#upGo", box);
        if (b) b.disabled = false;
      }
    }
    drawUp();
  }
  async function remove(x) {
    if (!(await u.confirm(`Xoá biểu mẫu **${x.name}** khỏi kho? Giáo viên sẽ không tải được nữa.`, "Xoá"))) return;
    try {
      await S().remove(`forms/items/${x.id}`);
      await S().remove(`forms/blob/${x.id}`);
      await S().remove(`forms/dl/${x.id}`).catch(() => {});
      u.toast("Đã xoá.", "ok");
    } catch (e) {
      u.toast("Chưa xoá được.", "bad");
    }
  }
  function manageGroups() {
    let gl = groupList().map((g) => Object.assign({}, g));
    const m = u.modal(`<div class="bm-mg"></div>`);
    const box = u.$(".bm-mg", m.el);
    const drawG = () => {
      box.innerHTML = `<h2 style="margin-top:0">Nhóm biểu mẫu</h2><p class="small muted" style="margin-top:-6px">Đổi tên, sắp xếp, thêm nhóm. Chỉ xoá được nhóm chưa có biểu mẫu.</p>
        <div class="col" style="gap:8px">${gl
          .map((g, i) => {
            const n = all().filter((x) => x.g === g.id).length;
            return `<div class="row nowrap" style="gap:8px"><span class="bm-gi">${ic("folder")}</span><input type="text" data-n="${i}" value="${u.esc(g.name)}" maxlength="60">
              <button type="button" class="btn sm ghost" data-up="${i}" ${i ? "" : "disabled"} title="Lên">↑</button><button type="button" class="btn sm ghost" data-dn="${i}" ${i < gl.length - 1 ? "" : "disabled"} title="Xuống">↓</button>
              <button type="button" class="btn sm ghost" data-del="${i}" ${n ? `disabled title="Còn ${n} biểu mẫu"` : `title="Xoá nhóm"`}>${ic("trash")}</button></div>`;
          })
          .join("")}</div>
        <button type="button" class="btn sm" id="gAdd" style="margin-top:10px">${ic("plus")} Thêm nhóm</button>
        <div class="row" style="justify-content:flex-end;gap:8px;margin-top:16px"><button class="btn" data-close>Huỷ</button><button class="btn primary" id="gSave">${ic("save")} Lưu</button></div>`;
      u.$$("[data-n]", box).forEach((inp) => (inp.oninput = () => (gl[Number(inp.dataset.n)].name = inp.value)));
      u.$$("[data-up]", box).forEach((b) => (b.onclick = () => ((i) => ([gl[i - 1], gl[i]] = [gl[i], gl[i - 1]], drawG()))(Number(b.dataset.up))));
      u.$$("[data-dn]", box).forEach((b) => (b.onclick = () => ((i) => ([gl[i + 1], gl[i]] = [gl[i], gl[i + 1]], drawG()))(Number(b.dataset.dn))));
      u.$$("[data-del]", box).forEach((b) => (b.onclick = () => (gl.splice(Number(b.dataset.del), 1), drawG())));
      u.$("#gAdd", box).onclick = () => {
        gl.push({ id: "g" + Date.now().toString(36), name: "Nhóm mới" });
        drawG();
        const ins = u.$$("[data-n]", box);
        ins[ins.length - 1].select();
      };
      u.$("#gSave", box).onclick = async () => {
        if (gl.some((g) => !g.name.trim())) return u.toast("Nhóm cần có tên.", "bad");
        if (!gl.length) return u.toast("Cần ít nhất một nhóm.", "bad");
        const out = {};
        gl.forEach((g, i) => (out[g.id] = { name: g.name.trim().slice(0, 60), o: i + 1 }));
        try {
          await S().set("forms/groups", out);
          m.close();
          u.toast("Đã lưu nhóm.", "ok");
        } catch (e) {
          u.toast("Chưa lưu được.", "bad");
        }
      };
    };
    drawG();
  }

  (async function init() {
    teacher = await L360.Auth.requireTeacher(app, { title: "Đăng nhập để dùng Kho biểu mẫu" });
    render();
    let ready = 0;
    const done = () => ++ready >= 2 && draw();
    S().on("forms/groups", (v) => ((groups = v || {}), ready >= 2 ? draw() : done()));
    S().on("forms/items", (v) => ((items = v || {}), ready >= 2 ? draw() : done()));
    if (isAdmin()) S().on("forms/dl", (v) => ((dls = v || {}), ready >= 2 && draw()));
    const g = u.qs("nhom");
    if (g) st.g = g;
  })();
})();
