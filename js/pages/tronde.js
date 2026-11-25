/* Trang Trộn đề kiểm tra: tải đề gốc (.docx) → kiểm tra nhận dạng → nhập thông tin → trộn, tải ZIP. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const TD = L360.TronDe;
  const app = u.$("#app");
  let teacher = null;
  let ex = null;
  const KEY = "l360:tronde";
  const saved = (() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch (e) {
      return {};
    }
  })();
  const yearNow = () => (L360.Ppct ? L360.Ppct.yearNow() : "");
  const DEFAULTS = () => ({
      so: "SỞ GD&ĐT BẮC NINH",
      truong: (L360.cfg && L360.cfg.school) || "",
      ky: "Kiểm tra giữa học kì I",
      namHoc: yearNow() ? `NĂM HỌC ${yearNow().replace("-", " - ")}` : "",
      mon: "",
      thoiGian: 45,
      who: "học sinh",
      sbd: "Số báo danh",
      chinhThuc: true,
      count: 4,
      digits: 3,
      codeMode: "seq",
      codeStart: 101,
      codeList: "",
      origCode: "000",
      prefix: ".",
      size: 12,
      pageNo: true,
      soTrang: true,
      shuffleQ: true,
      shuffleA: true,
      shuffleTF: true,
      balance: true,
      forceFont: true,
      unifySize: true
  });
  let D = Object.assign(DEFAULTS(), saved);
  const KIND = { mcq: "Trắc nghiệm nhiều phương án lựa chọn", tf: "Trắc nghiệm đúng sai", sa: "Trắc nghiệm trả lời ngắn" };

  function render() {
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(teacher)}`, { sub: "Trộn đề kiểm tra", nav: "tronde" }) +
      `<main class="wrap" style="max-width:1240px">
      <div class="row" style="align-items:flex-end;gap:12px;flex-wrap:wrap"><h1 class="grow" style="margin-bottom:4px">Trộn đề kiểm tra</h1><button class="btn" id="reset" title="Xoá đề gốc và các thông tin vừa nhập để bắt đầu đề mới">↺ Trộn đề mới</button></div>
      <p class="muted" style="margin-top:0">Tải đề gốc (Word) → kiểm tra máy nhận dạng → điền thông tin → nhận một tệp ZIP gồm đề gốc, các mã đề, đáp án TN Maker và đáp án Word. Đề được xử lí ngay trên máy thầy cô, không gửi lên mạng.</p>
      <div class="grid td-grid" style="grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:18px;align-items:start">
        <div>
          <section class="card"><h2>1. Đề gốc</h2>
            <label class="td-drop" id="drop"><input type="file" id="file" accept=".docx" hidden>
              <b>${ex ? u.esc(ex.name) : "Chọn hoặc kéo thả đề gốc (.docx)"}</b><span class="small muted">${ex ? "Bấm để chọn đề khác" : "Chỉ cần các câu hỏi, không cần phần thông tin đầu đề"}</span></label>
            <details class="td-rule" ${ex ? "" : "open"}><summary class="small"><b>Quy ước soạn đề gốc</b></summary>
              <ul class="small">
                <li>Mỗi phần mở đầu bằng một dòng in đậm: <b>&lt;g1&gt;</b> trắc nghiệm nhiều phương án, <b>&lt;g2&gt;</b> đúng sai, <b>&lt;g3&gt;</b> trả lời ngắn (đề có phần nào thì ghi phần đó).</li>
                <li>Mỗi câu bắt đầu bằng <b>Câu 1.</b> hoặc <b>Câu 1:</b> (gõ tay, không dùng đánh số tự động).</li>
                <li>Phương án <b>A. B. C. D.</b> (cùng dòng cách nhau bằng Tab, hoặc mỗi phương án một dòng) – <span style="color:#D2453B;font-weight:700">tô đỏ phương án đúng</span>.</li>
                <li>Câu đúng sai: các ý <b>a) b) c) d)</b> – <span style="color:#D2453B;font-weight:700">tô đỏ các ý đúng</span>.</li>
                <li>Câu trả lời ngắn: dòng <span style="color:#D2453B;font-weight:700">Đáp án: …</span> tô đỏ ngay dưới câu (máy lấy làm đáp án và xoá khỏi đề phát cho học sinh).</li>
                <li>Công thức (Equation, MathType), hình ảnh, bảng giữ nguyên khi trộn.</li>
              </ul>
              <button class="btn sm ghost" id="sample" type="button">⬇ Tải đề gốc mẫu</button></details>
            <div id="scan">${ex ? scanHtml() : ""}</div>
          </section>
        </div>
        <div>
          <section class="card"><h2>2. Thông tin đề</h2>
            <div class="grid g2" style="gap:10px">
              ${fld("so", "Sở / Phòng")}${fld("truong", "Trường")}
              ${fld("namHoc", "Năm học", "VD: NĂM HỌC 2026 - 2027")}${fld("mon", "Môn", "VD: Lịch sử")}
              ${fld("ky", "Kì kiểm tra", "VD: Kiểm tra giữa học kì I · Kì thi KSCL tháng 11")}
              <label class="field">Thời gian làm bài (phút)<input type="number" min="5" max="240" data-k="thoiGian" value="${u.esc(D.thoiGian)}"></label>
              <label class="field">Ô cạnh “Họ và tên”<select data-k="sbd"><option ${D.sbd === "Số báo danh" ? "selected" : ""}>Số báo danh</option><option ${D.sbd === "Lớp" ? "selected" : ""}>Lớp</option></select></label>
              <label class="field">Dòng cuối đề<select data-k="who"><option value="học sinh" ${D.who === "học sinh" ? "selected" : ""}>Học sinh không được sử dụng tài liệu</option><option value="thí sinh" ${D.who === "thí sinh" ? "selected" : ""}>Thí sinh không được sử dụng tài liệu</option></select></label>
            </div>
            <div class="row" style="gap:16px;flex-wrap:wrap;margin-top:8px">${chk("chinhThuc", "Ghi “ĐỀ CHÍNH THỨC”")}${chk("soTrang", "Ghi “(Đề thi có … trang)”")}${chk("pageNo", "Chân trang: Trang x/y – Mã đề")}</div>
          </section>
          <section class="card"><h2>3. Trộn đề</h2>
            <div class="grid g2" style="gap:10px">
              <label class="field">Số đề trộn<input type="number" min="1" max="48" data-k="count" value="${u.esc(D.count)}"></label>
              <label class="field">Mã đề<select data-k="digits"><option value="3" ${String(D.digits) === "3" ? "selected" : ""}>3 chữ số (VD 101)</option><option value="4" ${String(D.digits) === "4" ? "selected" : ""}>4 chữ số (VD 0101 – phiếu 2025)</option></select></label>
              <label class="field">Cách đặt mã<select data-k="codeMode"><option value="seq" ${D.codeMode === "seq" ? "selected" : ""}>Liên tiếp từ số…</option><option value="rand" ${D.codeMode === "rand" ? "selected" : ""}>Ngẫu nhiên</option><option value="list" ${D.codeMode === "list" ? "selected" : ""}>Tự nhập danh sách</option></select></label>
              <label class="field" id="fStart">Bắt đầu từ<input type="number" min="1" data-k="codeStart" value="${u.esc(D.codeStart)}"></label>
              <label class="field" id="fList" style="grid-column:1/-1">Danh sách mã đề <span class="hint">cách nhau bằng dấu phẩy</span><input type="text" data-k="codeList" value="${u.esc(D.codeList)}" placeholder="VD: 132, 209, 357, 485"></label>
              <label class="field">Mã của đề gốc<input type="text" data-k="origCode" value="${u.esc(D.origCode)}"></label>
              <label class="field">Tiền tố câu hỏi<select data-k="prefix"><option value="." ${D.prefix === "." ? "selected" : ""}>Câu 1.</option><option value=":" ${D.prefix === ":" ? "selected" : ""}>Câu 1:</option></select></label>
              <label class="field">Phông chữ<input type="text" value="Times New Roman" disabled></label>
              <label class="field">Cỡ chữ<select data-k="size">${[12, 13, 14].map((n) => `<option ${Number(D.size) === n ? "selected" : ""}>${n}</option>`).join("")}</select></label>
            </div>
            <div class="row" style="gap:14px;flex-wrap:wrap;margin-top:8px">${chk("shuffleQ", "Trộn thứ tự câu (trong từng phần)")}${chk("shuffleA", "Trộn phương án A–D")}${chk("shuffleTF", "Trộn ý a)–d) câu đúng sai")}${chk("balance", "Cân bằng số đáp án A/B/C/D")}</div>
            <div class="row" style="gap:14px;flex-wrap:wrap;margin-top:4px">${chk("forceFont", "Đưa toàn bộ chữ về Times New Roman")}${chk("unifySize", "Thống nhất cỡ chữ")}</div>
            <div class="row" style="margin-top:14px;gap:10px"><button class="btn primary" id="go" ${ex && !ex.errs.length ? "" : "disabled"}>${L360.icon("download")} Trộn đề và tải về (.zip)</button><span class="small muted" id="prog">${ex ? (ex.errs.length ? "Sửa các lỗi ở mục 1 rồi tải lại đề gốc." : "") : "Chọn đề gốc trước."}</span></div>
            <div id="done"></div>
          </section>
        </div>
      </div></main>` +
      L360.shell.footer();
    L360.shell.bindUserMenu(teacher);
    bind();
  }
  const fld = (k, label, ph) => `<label class="field">${label}<input type="text" data-k="${k}" value="${u.esc(D[k] || "")}" placeholder="${u.esc(ph || "")}"></label>`;
  const chk = (k, label) => `<label class="chk"><input type="checkbox" data-k="${k}" ${D[k] ? "checked" : ""}> ${label}</label>`;

  function scanHtml() {
    const total = ex.parts.reduce((a, p) => a + p.qs.length, 0);
    const keyOf = (q) => (q.kind === "mcq" ? q.key || "?" : q.kind === "tf" ? q.key.split("").map((x, i) => `${"abcd"[i]}${x}`).join(" ") : q.key || "—");
    return `<h3 style="margin:16px 0 6px">Máy nhận dạng: ${total} câu, ${ex.parts.length} phần</h3>
      ${ex.errs.length ? `<div class="td-err"><b>Cần sửa trong đề gốc (${ex.errs.length})</b><ul>${ex.errs.map((e) => `<li>${u.esc(e)}</li>`).join("")}</ul></div>` : `<p class="pill ok" style="margin:4px 0 8px">Nhận dạng đầy đủ – sẵn sàng trộn</p>`}
      ${ex.notes.length ? `<div class="td-note"><b>Lưu ý (${ex.notes.length})</b><ul>${ex.notes.map((e) => `<li>${u.esc(e)}</li>`).join("")}</ul></div>` : ""}
      ${ex.parts
        .map(
          (p, i) => `<div class="td-part"><div class="row"><b class="grow">PHẦN ${["I", "II", "III", "IV", "V"][i]}. ${KIND[p.kind]}</b><span class="pill">${p.qs.length} câu</span></div>
          <div class="td-qs">${p.qs.map((q) => `<span class="td-q ${q.errs.length ? "bad" : ""}" title="${u.esc(q.errs.concat(q.notes).join(" "))}"><b>${q.no}</b> ${u.esc(keyOf(q))}${q.fixed ? " 🔒" : ""}</span>`).join("")}</div></div>`
        )
        .join("")}
      <p class="tiny muted">Mỗi ô: số câu trong đề gốc và đáp án máy đọc được (chữ đỏ). 🔒: giữ nguyên thứ tự phương án.</p>`;
  }

  function bind() {
    const file = u.$("#file");
    file.onchange = () => file.files[0] && open(file.files[0]);
    const drop = u.$("#drop");
    drop.ondragover = (e) => (e.preventDefault(), drop.classList.add("over"));
    drop.ondragleave = () => drop.classList.remove("over");
    drop.ondrop = (e) => {
      e.preventDefault();
      drop.classList.remove("over");
      const f = e.dataTransfer.files[0];
      if (f) open(f);
    };
    u.$("#sample").onclick = () => {
      const a = document.createElement("a");
      a.href = "assets/mau/De_goc_mau_tron_de.docx";
      a.download = "De_goc_mau_tron_de.docx";
      a.click();
    };
    u.$$("[data-k]").forEach((el) => {
      el.onchange = el.oninput = () => {
        const k = el.dataset.k;
        D[k] = el.type === "checkbox" ? el.checked : el.type === "number" ? Number(el.value) : el.value;
        try {
          localStorage.setItem(KEY, JSON.stringify(D));
        } catch (e) {}
        if (k === "digits" && /^0+$/.test(String(D.origCode || "0"))) {
          D.origCode = Number(D.digits) === 4 ? "0000" : "000";
          const oc = u.$('[data-k="origCode"]');
          if (oc) oc.value = D.origCode;
          localStorage.setItem(KEY, JSON.stringify(D));
        }
        if (k === "codeMode" || k === "digits") modeUi();
      };
    });
    modeUi();
    u.$("#go").onclick = go;
    u.$("#reset").onclick = async () => {
      if ((ex || u.$("#done").textContent.trim()) && !(await u.confirm("Xoá đề gốc, kết quả nhận dạng và toàn bộ thông tin vừa nhập để trộn đề mới?", "Trộn đề mới"))) return;
      ex = null;
      D = DEFAULTS();
      try {
        localStorage.removeItem(KEY);
      } catch (e) {}
      render();
      window.scrollTo(0, 0);
      u.toast("Đã làm mới – chọn đề gốc để bắt đầu.", "ok");
    };
  }
  function modeUi() {
    u.$("#fStart").style.display = D.codeMode === "seq" ? "" : "none";
    u.$("#fList").style.display = D.codeMode === "list" ? "" : "none";
  }

  async function open(f) {
    if (!/\.docx$/i.test(f.name)) return u.toast("Chỉ nhận tệp Word .docx (nếu là .doc, mở bằng Word rồi Lưu thành .docx).", "bad", 5000);
    try {
      u.$("#scan").innerHTML = `<p class="muted">Đang đọc đề…</p>`;
      ex = await TD.load(f);
      render();
    } catch (e) {
      console.error(e);
      ex = null;
      render();
      u.toast("Không đọc được tệp: " + (e.message || e), "bad", 6000);
    }
  }

  async function go() {
    if (!ex) return;
    if (!String(D.mon || "").trim()) return u.toast("Nhập tên môn (VD: LỊCH SỬ 12).", "bad");
    if (!String(D.ky || "").trim()) return u.toast("Nhập kì kiểm tra.", "bad");
    const btn = u.$("#go");
    btn.disabled = true;
    try {
      const res = await TD.run(ex, Object.assign({}, D), (i, n, what) => (u.$("#prog").textContent = `Đang tạo ${what === "đáp án" || what === "nén" ? what : "mã đề " + what} (${i}/${n})…`));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(res.blob);
      a.download = res.name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => (URL.revokeObjectURL(a.href), a.remove()), 4000);
      u.$("#prog").textContent = "";
      u.$("#done").innerHTML = `<div class="td-ok"><b>Đã tạo ${res.versions.length - 1} mã đề</b> + đề gốc (mã ${u.esc(res.versions[0].code)}): ${res.versions
        .slice(1)
        .map((v) => u.esc(v.code))
        .join(", ")}.<br><span class="small">Tệp <b>${u.esc(res.name)}</b> gồm: ${res.versions.map((v) => u.esc(v.file)).join(", ")}, đáp án TN Maker (.xlsx) và đáp án Word (kèm bảng đối chiếu với đề gốc). Mở đề bằng Word để số trang tự cập nhật.</span><div style="margin-top:8px"><button class="btn sm" id="reset2">↺ Trộn đề mới</button></div></div>`;
      u.$("#reset2").onclick = () => u.$("#reset").click();
      u.toast("Đã trộn đề xong.", "ok");
    } catch (e) {
      console.error(e);
      u.toast("Không trộn được: " + (e.message || e), "bad", 6000);
      u.$("#prog").textContent = "";
    } finally {
      btn.disabled = false;
    }
  }

  (async function init() {
    await L360.store.ready;
    teacher = await L360.Auth.requireTeacher(app, { title: "Đăng nhập để trộn đề kiểm tra" });
    if (!teacher) return;
    if (!D.truong && L360.cfg) D.truong = L360.cfg.school || "";
    render();
  })();
})();
