/* Trang "Word → PDF": chuyển giáo án, đề kiểm tra, hồ sơ (.docx) sang PDF giữ nguyên bố cục; tuỳ chọn đặt mật khẩu mở tệp.
   Tệp PDF có sẵn: chỉ đặt mật khẩu. Mọi xử lí chạy trên máy, không tải tệp lên mạng. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ic = L360.icon;
  const app = u.$("#app");
  let teacher = null;
  const st = { files: [], pw: false, lock: false, busy: false };
  const fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1).replace(".", ",") + " MB" : Math.max(1, Math.round(n / 1024)) + " KB");
  const pdfName = (n) => String(n || "tai-lieu").replace(/\.(docx|pdf)$/i, "") + ".pdf";

  function render() {
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(teacher)}`, { sub: "Chuyển Word sang PDF", nav: "pdf" }) +
      `<main class="wrap" style="max-width:1100px">
        <h1 style="margin-bottom:4px">Chuyển Word sang PDF</h1>
        <p class="muted" style="margin:0 0 16px">Giáo án, đề kiểm tra, hồ sơ (.docx) → PDF giữ nguyên bố cục, khổ giấy, lề, bảng, đánh số, hình ảnh. Có thể đặt mật khẩu mở tệp để nộp. Tệp được xử lí ngay trên máy của thầy cô, không tải lên mạng.</p>
        <div class="grid" style="grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:16px;align-items:start">
          <section class="card"><h2 style="margin-top:0">1. Chọn tệp</h2>
            <label class="bg-drop" id="pdDrop"><input type="file" accept=".docx,.pdf" multiple hidden>${ic("upload")}<b>Chọn hoặc kéo thả tệp Word (.docx)</b><span class="small muted">Chọn được nhiều tệp cùng lúc. Tệp PDF có sẵn: chỉ đặt mật khẩu.</span></label>
            <div id="pdList" style="margin-top:12px">${listHtml()}</div>
          </section>
          <section class="card"><h2 style="margin-top:0">2. Tuỳ chọn</h2>
            <label class="row nowrap" style="gap:8px;font-weight:650"><input type="checkbox" id="pdPw" ${st.pw ? "checked" : ""}> Đặt mật khẩu mở tệp PDF</label>
            <div id="pdPwBox" class="${st.pw ? "" : "hidden"}" style="margin-top:10px">
              <label class="field">Mật khẩu<div class="row nowrap"><input id="pdP1" type="password" autocomplete="new-password" placeholder="Ít nhất 4 kí tự, không dấu"><button class="btn sm ghost" id="pdEye" type="button" title="Hiện/ẩn mật khẩu">👁</button></div></label>
              <label class="field">Nhập lại mật khẩu<input id="pdP2" type="password" autocomplete="new-password"></label>
              <label class="row nowrap small" style="gap:8px"><input type="checkbox" id="pdLock" ${st.lock ? "checked" : ""}> Không cho chỉnh sửa, sao chép nội dung (vẫn xem và in được)</label>
              <p class="tiny muted" style="margin:8px 0 0">Mã hoá AES-256. Ứng dụng không lưu mật khẩu – thầy cô ghi nhớ để gửi kèm khi nộp.</p>
            </div>
            <button class="btn primary lg block" id="pdGo" style="margin-top:16px" ${st.files.length && !st.busy ? "" : "disabled"}>${ic("print")} Chuyển sang PDF</button>
            <p id="pdProg" class="small muted" style="margin:8px 0 0"></p>
          </section>
        </div>
        <section class="card" style="margin-top:16px"><h3 style="margin-top:0">Lưu ý</h3><ul class="small muted" style="margin:0">
          <li>Phông Times New Roman, Arial, Calibri được thay bằng phông tương đương cùng kích thước chữ (Liberation Serif, Liberation Sans, Carlito) nên dòng, trang giữ như bản Word.</li>
          <li>Tệp lưu bằng Word: ngắt trang đúng như Word. Tệp do phần mềm khác tạo: ứng dụng tự ngắt trang tại khoảng giữa các dòng.</li>
          <li>Công thức Toán (Equation), biểu đồ Excel nhúng, phông chữ đặc biệt (VNI, TCVN3) có thể hiển thị khác – thầy cô xem trước trước khi nộp.</li>
        </ul></section>
      </main>` +
      L360.shell.footer();
    L360.shell.bindUserMenu(teacher);
    bind();
  }
  function listHtml() {
    if (!st.files.length) return `<p class="small muted" style="margin:0">Chưa chọn tệp.</p>`;
    return st.files
      .map(
        (f, i) => `<div class="pd-row ${f.err ? "bad" : f.out ? "ok" : ""}"><span class="pd-ic">${/\.pdf$/i.test(f.file.name) ? "PDF" : "W"}</span><div class="grow" style="min-width:0"><b class="ellipsis" style="display:block">${u.esc(f.file.name)}</b>
          <span class="tiny muted">${fmtSize(f.file.size)}${f.out ? ` → PDF ${f.pages ? f.pages + " trang · " : ""}${fmtSize(f.out.byteLength)}${f.pw ? " · 🔒 có mật khẩu" : ""}` : ""}${f.err ? ` · <span style="color:var(--bad)">${u.esc(f.err)}</span>` : f.doing ? " · đang chuyển…" : ""}</span></div>
          ${f.out ? `<button class="btn sm primary" data-dl="${i}">${ic("download")} Tải PDF</button>${f.plain ? `<button class="btn sm" data-pv="${i}">Xem trước</button>` : ""}` : ""}<button class="btn sm ghost" data-rm="${i}" title="Bỏ tệp">✕</button></div>`
      )
      .join("");
  }
  const drawList = () => {
    const el = u.$("#pdList");
    if (el) el.innerHTML = listHtml();
    const go = u.$("#pdGo");
    if (go) go.disabled = !st.files.length || st.busy;
    bindList();
  };
  function bindList() {
    u.$$("[data-dl]").forEach((b) => (b.onclick = () => {
      const f = st.files[Number(b.dataset.dl)];
      u.downloadBlob(pdfName(f.file.name), new Blob([f.out], { type: "application/pdf" }));
    }));
    u.$$("[data-pv]").forEach((b) => (b.onclick = () => {
      const f = st.files[Number(b.dataset.pv)];
      window.open(URL.createObjectURL(new Blob([f.plain], { type: "application/pdf" })), "_blank");
    }));
    u.$$("[data-rm]").forEach((b) => (b.onclick = () => (st.files.splice(Number(b.dataset.rm), 1), drawList())));
  }
  function add(list) {
    [...list].forEach((file) => {
      if (!/\.(docx|pdf)$/i.test(file.name)) return u.toast(`${file.name}: chỉ nhận tệp .docx hoặc .pdf (tệp .doc cũ hãy mở bằng Word, lưu lại dạng .docx).`, "bad", 6000);
      st.files.push({ file });
    });
    drawList();
  }
  function bind() {
    const dz = u.$("#pdDrop");
    const inp = dz.querySelector("input");
    inp.onchange = () => (add(inp.files), (inp.value = ""));
    dz.ondragover = (e) => (e.preventDefault(), dz.classList.add("over"));
    dz.ondragleave = () => dz.classList.remove("over");
    dz.ondrop = (e) => (e.preventDefault(), dz.classList.remove("over"), add(e.dataTransfer.files));
    u.$("#pdPw").onchange = (e) => ((st.pw = e.target.checked), u.$("#pdPwBox").classList.toggle("hidden", !st.pw));
    u.$("#pdLock").onchange = (e) => (st.lock = e.target.checked);
    u.$("#pdEye").onclick = () => ["#pdP1", "#pdP2"].forEach((s) => (u.$(s).type = u.$(s).type === "password" ? "text" : "password"));
    u.$("#pdGo").onclick = run;
    bindList();
  }
  async function run() {
    let pw = "";
    if (st.pw) {
      pw = u.$("#pdP1").value;
      if (pw.length < 4) return u.toast("Mật khẩu cần ít nhất 4 kí tự.", "bad");
      if (/[^\x20-\x7E]/.test(pw)) return u.toast("Mật khẩu chỉ dùng chữ không dấu, số và kí hiệu (để mọi phần mềm đọc PDF mở được).", "bad", 5000);
      if (pw !== u.$("#pdP2").value) return u.toast("Hai lần nhập mật khẩu chưa khớp.", "bad");
    } else if (st.files.some((f) => /\.pdf$/i.test(f.file.name))) return u.toast("Tệp PDF có sẵn: hãy bật “Đặt mật khẩu mở tệp” và nhập mật khẩu.", "bad", 5000);
    st.busy = true;
    drawList();
    const prog = u.$("#pdProg");
    let ok = 0;
    for (const f of st.files) {
      if (f.out && f.pw === !!pw) continue;
      Object.assign(f, { doing: true, err: "", out: null, plain: null });
      drawList();
      try {
        const r = await L360.Word2Pdf.convert(f.file, { password: pw, lock: st.lock, title: f.file.name, onProgress: (t) => (prog.textContent = `${f.file.name}: ${t}`) });
        Object.assign(f, { out: r.bytes, plain: r.plain, pages: r.pages, pw: !!pw, doing: false });
        ok++;
        if (st.files.length === 1) u.downloadBlob(pdfName(f.file.name), new Blob([r.bytes], { type: "application/pdf" }));
      } catch (e) {
        console.warn(e);
        Object.assign(f, { err: e.message || "Không chuyển được tệp này.", doing: false });
      }
      drawList();
    }
    st.busy = false;
    prog.textContent = "";
    drawList();
    if (ok) u.toast(st.files.length === 1 ? "Đã chuyển xong và tải PDF về máy." : `Đã chuyển ${ok} tệp – bấm “Tải PDF” ở từng tệp.`, "ok", 4500);
  }

  (async function init() {
    teacher = await L360.Auth.requireTeacher(app, { title: "Đăng nhập để chuyển Word sang PDF" });
    render();
  })();
})();
