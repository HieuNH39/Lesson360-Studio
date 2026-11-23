/* Trang Phân phối chương trình: xem PPCT theo năm học; tổ trưởng/quản trị nạp Phụ lục I (Word/Excel/bảng dán),
   duyệt kết quả đọc, khớp SGK, áp dụng cho năm học, tạo năm học mới từ năm trước. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const S = L360.store;
  const C = L360.Curr;
  const P = L360.Ppct;
  const app = u.$("#app");
  const dt = /che-do=dien-tap/.test(location.search) ? "che-do=dien-tap" : "";
  let teacher = null;
  const st = { nam: u.qs("nam") || P.yearNow(), id: u.qs("bang") || "", years: [], list: [], doc: null, q: "" };
  const MON = () => C.subjects.map((s) => [s.id, s.name]);
  const monName = (id, lop) => C.subjectName(id, lop) || id;
  const docName = (x) => `${x.cd ? "Chuyên đề học tập " : ""}${monName(x.mon, x.lop)} ${x.lop}`;
  const SHORT = { "ngu-van": "Ngữ văn", "lich-su": "Lịch sử", "dia-li": "Địa lí", gdcd: "Giáo dục công dân", gdktpl: "GD Kinh tế và Pháp luật", gddp: "Giáo dục địa phương" };
  const shortName = (x) => `${x.cd ? "Chuyên đề " : ""}${SHORT[x.mon] || monName(x.mon, x.lop)}${x.lop <= 9 && (x.mon === "lich-su" || x.mon === "dia-li") ? " (LS&ĐL)" : ""}`;
  const canEdit = () => teacher && teacher.isLeader;

  const setUrl = () => {
    const q = new URLSearchParams();
    q.set("nam", st.nam);
    if (st.id) q.set("bang", st.id);
    if (dt) q.set("che-do", "dien-tap");
    const url = "?" + q.toString();
    if (st.push && url !== location.search) history.pushState({ pp: 1 }, "", url);
    else history.replaceState({ pp: 1 }, "", url);
    st.push = false;
  };
  window.addEventListener("popstate", () => {
    st.nam = u.qs("nam") || st.nam;
    st.id = u.qs("bang") || "";
    render();
  });

  function shell(inner) {
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(teacher)}`, { sub: "Phân phối chương trình theo năm học", nav: "ppct" }) +
      `<main class="wrap" style="max-width:1360px">${inner}</main>` +
      L360.shell.footer();
    L360.shell.bindUserMenu(teacher);
  }

  async function render() {
    st.list = await P.list(st.nam);
    if (st.id && !st.list.some((x) => x.id === st.id)) st.id = "";
    if (!st.id && st.list.length) {
      const mine = st.list.find((x) => (teacher.subjects || []).includes(x.mon) && !x.cd);
      st.id = (mine || st.list[0]).id;
    }
    st.doc = st.id ? await P.get(st.id, st.nam) : null;
    setUrl();
    const groups = {};
    st.list
      .filter((x) => !st.q || P.norm(docName(x)).includes(P.norm(st.q)))
      .forEach((x) => (groups[x.lop] = groups[x.lop] || []).push(x));
    const yearOpts = [...new Set([...st.years, st.nam])].sort().reverse();
    shell(`<div class="row" style="align-items:flex-end;margin-bottom:14px;gap:12px">
        <div class="grow"><h1 style="margin:0">Phân phối chương trình</h1>
        <p class="muted" style="margin:4px 0 0">Kế hoạch dạy học (Phụ lục I) của tổ: mỗi bài dạy mấy tiết, tiết thứ mấy, tuần nào, nội dung từng tiết. Studio, giáo án và màn mở tiết đều bám theo bảng này.</p></div>
        <label class="field" style="min-width:170px;margin:0">Năm học<select id="nam">${yearOpts.map((y) => `<option value="${y}" ${y === st.nam ? "selected" : ""}>${P.yearLabel(y)}${y === P.yearNow() ? " (hiện hành)" : ""}</option>`).join("")}</select></label>
        ${
          canEdit()
            ? `<button class="btn primary" id="nap">${L360.icon("upload")} Nạp Phụ lục I</button><button class="btn" id="namMoi">${L360.icon("plus")} Năm học mới</button>`
            : `<span class="pill" title="Chỉ tổ trưởng và quản trị được nạp hoặc sửa PPCT">${L360.icon("info")} Chỉ xem</span>`
        }</div>
      ${
        st.list.length
          ? `<div class="pp-grid"><aside class="card pp-side"><input id="q" class="pp-q" placeholder="Tìm môn, lớp…" value="${u.esc(st.q)}">${Object.keys(groups)
              .sort((a, b) => a - b)
              .map(
                (lop) => `<div class="pp-lv">Lớp ${lop}</div>${groups[lop]
                  .map(
                    (x) => `<button class="pp-item ${x.id === st.id ? "on" : ""}" data-id="${u.esc(x.id)}"><b>${u.esc(shortName(x))}</b><span class="tiny muted">${x.tongTiet} tiết · ${x.soBai} bài${x.canhBao && x.canhBao.length ? ` · <span style="color:var(--warn)">cần xem lại</span>` : ""}</span></button>`
                  )
                  .join("")}`
              )
              .join("")}</aside><section id="docv">${st.doc ? docView(st.doc) : ""}</section></div>`
          : `<div class="card center" style="padding:42px"><h2>Năm học ${P.yearLabel(st.nam)} chưa có PPCT</h2><p class="muted">${
              canEdit() ? "Nạp các tệp Phụ lục I của tổ (Word hoặc Excel), hoặc chép bộ PPCT của năm trước rồi sửa những chỗ thay đổi." : "Tổ trưởng chuyên môn sẽ nạp PPCT của năm học này."
            }</p>${canEdit() ? `<div class="row" style="justify-content:center"><button class="btn primary" id="nap2">${L360.icon("upload")} Nạp Phụ lục I</button><button class="btn" id="namMoi2">${L360.icon("copy")} Chép từ năm trước</button></div>` : ""}</div>`
      }`);
    u.$("#nam").onchange = (e) => {
      st.nam = e.target.value;
      st.id = "";
      render();
    };
    const q = u.$("#q");
    if (q)
      q.oninput = u.debounce(() => {
        st.q = q.value;
        const pos = q.selectionStart;
        render().then(() => {
          const q2 = u.$("#q");
          q2.focus();
          q2.setSelectionRange(pos, pos);
        });
      }, 250);
    u.$$("[data-id]").forEach(
      (b) =>
        (b.onclick = async () => {
          st.id = b.dataset.id;
          st.push = true;
          render();
        })
    );
    ["#nap", "#nap2"].forEach((s) => u.$(s) && (u.$(s).onclick = () => importer()));
    ["#namMoi", "#namMoi2"].forEach((s) => u.$(s) && (u.$(s).onclick = () => newYear()));
    if (st.doc) bindDoc(st.doc);
  }

  /* ---------- Xem một bảng PPCT ---------- */
  function rowsOf(doc) {
    const out = [];
    const kt = [...(doc.kt || [])];
    let lastTuan = 0;
    doc.bai.forEach((b) => {
      const t0 = P.tuanOf(b) || lastTuan;
      while (kt.length && kt[0].tuan && t0 && kt[0].tuan < t0) out.push({ kt: kt.shift() });
      out.push({ bai: b });
      b.tiet.forEach((t) => (lastTuan = t.tuan || lastTuan));
    });
    kt.forEach((k) => out.push({ kt: k }));
    return out;
  }
  function docView(doc) {
    const L = C.lessons(doc.mon, doc.lop).filter((x) => !!x.book.cd === !!doc.cd).flatMap((x) => x.lessons);
    const khop = doc.bai.filter((b) => b.key).length;
    const khopTong = doc.bai.filter((b) => !P.isExtra(b)).length;
    const warns = [].concat(doc.canhBaoNap || [], doc.canhBao ? [doc.canhBao] : []);
    const src = doc.nguon || {};
    return `<div class="card">
      <div class="row" style="align-items:flex-start;gap:10px"><div class="grow"><h2 style="margin:0">${u.esc(docName(doc))} <span class="muted" style="font-weight:500">· ${P.yearLabel(doc.nam)}</span></h2>
      <p class="small muted" style="margin:4px 0 0">${u.esc(doc.tieuDe || "")}</p></div>
      <div class="row" style="gap:6px">${canEdit() ? `<button class="btn sm" id="napLai">${L360.icon("upload")} Nạp lại bảng này</button><button class="btn sm ghost" id="xoa">Xoá</button>` : ""}<button class="btn sm ghost" id="taiJson" title="Tải bảng ở dạng dữ liệu (để lưu trữ)">${L360.icon("download")}</button></div></div>
      <div class="chips" style="margin:10px 0 4px"><span class="chip on">${doc.tongTiet} tiết</span><span class="chip">${doc.bai.length} bài/chủ đề</span>${doc.hk1Den ? `<span class="chip">Hết HK I: tiết ${doc.hk1Den}</span>` : ""}<span class="chip">${(doc.kt || []).length} tiết ôn tập – kiểm tra</span><span class="chip ${khop >= khopTong ? "" : "warn"}" title="Số bài gắn được với bài trong SGK (không tính tiết thực hành, ôn tập)">Khớp SGK ${khop}/${khopTong}</span>
      <span class="chip" title="Nguồn dữ liệu">${src.kieu === "nap-san" ? "Nạp sẵn từ " + u.esc(src.tep || "tệp của tổ") : src.kieu === "chep-nam" ? "Chép từ năm " + u.esc(src.tu || "") : src.tep ? "Tệp " + u.esc(src.tep) : "Nạp trên web"}${src.luc ? " · " + u.fmtDate(src.luc) : ""}</span></div>
      ${warns.length ? `<div class="note warn small" style="margin:8px 0">${L360.icon("info")} ${warns.map(u.esc).join(" ")} Tổ trưởng kiểm tra lại các dòng này trong tệp gốc.</div>` : ""}
      <div class="pp-wrap" style="margin-top:10px"><table class="t pp-tbl"><thead><tr><th style="width:62px">Tuần</th><th style="width:62px">Tiết</th><th>Bài / tiết dạy</th><th>Nội dung chủ yếu</th><th style="width:120px">Năng lực số</th></tr></thead><tbody>
      ${rowsOf(doc)
        .map((r) => {
          if (r.kt) return `<tr class="pp-kt"><td>${r.kt.tuan || ""}</td><td>${u.esc(r.kt.ma || "")}</td><td colspan="3"><b>${u.esc(r.kt.ten)}</b>${r.kt.noiDung ? ` <span class="small muted">– ${u.esc(r.kt.noiDung.slice(0, 160))}</span>` : ""}</td></tr>`;
          const b = r.bai;
          const l = b.key && C.lesson(b.key);
          const head = `<tr class="pp-bai"><td colspan="5"><div class="row" style="gap:8px"><b class="grow">${u.esc(b.ten)}</b>${b.chuong ? `<span class="tiny muted ellipsis" style="max-width:280px">${u.esc(b.chuong)}</span>` : ""}
            ${
              canEdit()
                ? `<select class="pp-key" data-bai="${u.esc(b.id)}" style="max-width:300px"><option value="">— Không gắn bài SGK —</option>${L.map((x) => `<option value="${u.esc(x.key)}" ${x.key === b.key ? "selected" : ""}>${u.esc(x.label.slice(0, 70))}</option>`).join("")}</select>`
                : l
                ? `<span class="pill ok">${L360.icon("sgk")} ${u.esc(l.label.slice(0, 50))}</span>`
                : `<span class="pill">Bài riêng của tổ</span>`
            }</div></td></tr>`;
          return (
            head +
            b.tiet
              .map(
                (t, i) => `<tr><td>${t.tuan || ""}</td><td><b>${t.so}</b></td><td class="small">${b.tiet.length > 1 ? `Tiết ${i + 1}/${b.tiet.length}` : "1 tiết"}${t.ten ? `<br>${u.esc(t.ten)}` : ""}</td><td class="small">${u.esc(t.noiDung || "")}${
                  t.thietBi ? `<div class="tiny muted" style="margin-top:3px">Thiết bị: ${u.esc(t.thietBi.slice(0, 160))}</div>` : ""
                }</td><td class="tiny">${(t.nls || []).map(u.esc).join(", ")}${t.ai && t.ai.length ? `<br><span style="color:var(--ok)">AI: ${t.ai.join(", ")}</span>` : ""}</td></tr>`
              )
              .join("")
          );
        })
        .join("")}</tbody></table></div></div>`;
  }
  function bindDoc(doc) {
    u.$("#taiJson").onclick = () => u.download(`PPCT ${docName(doc)} ${doc.nam}.json`, JSON.stringify(doc, null, 1), "application/json");
    if (!canEdit()) return;
    u.$("#napLai").onclick = () => importer({ replace: doc });
    u.$("#xoa").onclick = async () => {
      if (!(await u.confirm(`Xoá bảng **${docName(doc)}** của năm học ${P.yearLabel(doc.nam)}? Giáo án và tiết học đã soạn không bị xoá.`, "Xoá bảng"))) return;
      await P.remove(doc.id, doc.nam);
      u.toast("Đã xoá bảng.");
      st.id = "";
      render();
    };
    u.$$(".pp-key").forEach(
      (s) =>
        (s.onchange = async () => {
          const b = doc.bai.find((x) => x.id === s.dataset.bai);
          b.key = s.value || null;
          b.keyFixed = true;
          doc.khop = { co: doc.bai.filter((x) => x.key).length, tong: doc.bai.filter((x) => !P.isExtra(x)).length };
          try {
            await P.save(doc, teacher.uid);
            u.toast("Đã lưu liên kết bài SGK.", "ok");
          } catch (e) {
            u.toast("Không lưu được: " + (e.message || e), "err", 5000);
          }
        })
    );
  }

  /* ---------- Nạp Phụ lục I ---------- */
  function importer(opt) {
    opt = opt || {};
    const found = [];
    const m = u.modal(
      `<div class="row"><h2 class="grow" style="margin:0">${L360.icon("upload")} Nạp Phụ lục I${opt.replace ? ` – thay ${u.esc(docName(opt.replace))}` : ""}</h2><button class="btn sm ghost" data-close>Đóng</button></div>
      <p class="small muted">Chọn một hoặc nhiều tệp kế hoạch dạy học (Word .docx hoặc Excel .xlsx/.xls). Hệ thống đọc bảng “Bài học/chủ đề – Tiết dạy theo PPCT”, khớp với SGK, rồi cho thầy cô duyệt trước khi áp dụng.</p>
      <label class="drop" id="drop"><input type="file" id="f" multiple accept=".docx,.xlsx,.xls,.xlsm,.pdf,.doc" hidden>${L360.icon("upload")} <b>Kéo thả tệp vào đây</b> hoặc bấm để chọn tệp</label>
      <details style="margin-top:8px"><summary class="small">Hoặc dán bảng copy từ Word/Excel</summary><div id="paste" class="paste" contenteditable="true" data-ph="Bấm vào đây rồi dán (Ctrl+V / ⌘V) bảng PPCT…"></div></details>
      <div id="res" style="margin-top:12px"></div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-close>Huỷ</button><button class="btn primary" id="ap" disabled>Áp dụng</button></div>`,
      { wide: true }
    );
    const res = u.$("#res", m.el);
    const ap = u.$("#ap", m.el);
    const add = (src, err) => {
      if (err) {
        found.push({ file: src, err });
        return show();
      }
      const r = P.parse(src);
      r.docs.forEach((d) => {
        if (!d.bai.length) return;
        if (opt.replace) Object.assign(d, { mon: opt.replace.mon, lop: opt.replace.lop, cd: opt.replace.cd, id: opt.replace.id });
        d.nam = opt.replace ? opt.replace.nam : d.nam;
        P.match(d);
        d.nguon = { kieu: "nap-web", tep: src.file };
        d.canhBaoNap = r.warn.filter((w) => /trùng|đánh số/.test(w));
        found.push({ file: src.file, doc: d, warn: r.warn, on: true });
      });
      if (!r.docs.some((d) => d.bai.length)) found.push({ file: src.file, err: r.warn.join(" ") || "Không đọc được bảng PPCT." });
      show();
    };
    async function files(list) {
      for (const f of list) {
        res.insertAdjacentHTML("beforeend", `<p class="small muted" data-load>Đang đọc ${u.esc(f.name)}…</p>`);
        try {
          add(await P.readFile(f));
        } catch (e) {
          add(f.name, e.message || String(e));
        }
        u.$$("[data-load]", res).forEach((x) => x.remove());
      }
    }
    function show() {
      res.innerHTML = found
        .map((x, i) => {
          if (x.err) return `<div class="note warn small"><b>${u.esc(x.file)}</b>: ${u.esc(x.err)}</div>`;
          const d = x.doc;
          d.id = P.docId(d.mon, d.lop, d.cd);
          const exists = st.list.some((y) => y.id === d.id) && d.nam === st.nam;
          return `<div class="card pp-found" style="margin-bottom:10px;padding:12px 14px"><div class="row" style="gap:8px;align-items:center">
            <input type="checkbox" data-on="${i}" ${x.on ? "checked" : ""} title="Áp dụng bảng này">
            <b class="grow">${u.esc(x.file)}</b>
            <select data-mon="${i}">${MON().map(([id, n]) => `<option value="${id}" ${id === d.mon ? "selected" : ""}>${u.esc(n)}</option>`).join("")}</select>
            <select data-lop="${i}">${[6, 7, 8, 9, 10, 11, 12].map((g) => `<option ${g === d.lop ? "selected" : ""}>${g}</option>`).join("")}</select>
            <select data-cd="${i}"><option value="0" ${!d.cd ? "selected" : ""}>Cốt lõi</option><option value="1" ${d.cd ? "selected" : ""}>Chuyên đề</option></select>
            <input data-nam="${i}" value="${u.esc(d.nam)}" style="width:110px" title="Năm học"></div>
            <p class="small" style="margin:8px 0 0">${d.bai.length} bài/chủ đề · ${d.tongTiet} tiết · ${(d.kt || []).length} tiết ôn tập – kiểm tra · khớp SGK ${d.khop ? d.khop.co : 0}/${d.khop ? d.khop.tong : d.bai.length}${exists ? ` · <b style="color:var(--warn)">sẽ thay bảng đang có</b>` : ""}</p>
            ${x.warn.length || d.canhBao ? `<p class="tiny" style="color:var(--warn);margin:4px 0 0">${u.esc([d.canhBao].concat(x.warn).filter(Boolean).join(" "))}</p>` : ""}
            <details style="margin-top:6px"><summary class="tiny">Xem trước ${d.bai.length} bài</summary><ol class="small" style="margin:6px 0 0;padding-left:20px;max-height:240px;overflow:auto">${d.bai
              .map((b) => `<li>${u.esc(b.ten)} <span class="muted">– ${P.tietText(b)}</span>${b.key ? ` <span class="pill ok tiny">SGK</span>` : ""}</li>`)
              .join("")}</ol></details></div>`;
        })
        .join("");
      const n = found.filter((x) => x.doc && x.on).length;
      ap.disabled = !n;
      ap.textContent = n ? `Áp dụng ${n} bảng` : "Áp dụng";
      const upd = (sel, fn) =>
        u.$$(sel, res).forEach(
          (el) =>
            (el.onchange = () => {
              const x = found[+Object.values(el.dataset)[0]];
              fn(x, el);
              if (el.dataset.mon != null || el.dataset.lop != null || el.dataset.cd != null) P.match(x.doc);
              show();
            })
        );
      upd("[data-on]", (x, el) => (x.on = el.checked));
      upd("[data-mon]", (x, el) => (x.doc.mon = el.value));
      upd("[data-lop]", (x, el) => (x.doc.lop = +el.value));
      upd("[data-cd]", (x, el) => (x.doc.cd = el.value === "1"));
      upd("[data-nam]", (x, el) => (x.doc.nam = el.value.trim().replace(/\s*[–—]\s*/, "-")));
    }
    const fi = u.$("#f", m.el);
    fi.onchange = () => files([...fi.files]);
    const drop = u.$("#drop", m.el);
    drop.ondragover = (e) => {
      e.preventDefault();
      drop.classList.add("on");
    };
    drop.ondragleave = () => drop.classList.remove("on");
    drop.ondrop = (e) => {
      e.preventDefault();
      drop.classList.remove("on");
      files([...e.dataTransfer.files]);
    };
    const paste = u.$("#paste", m.el);
    paste.onpaste = (e) => {
      e.preventDefault();
      const html = e.clipboardData.getData("text/html");
      const text = e.clipboardData.getData("text/plain");
      const src = P.readPaste(html, text);
      paste.textContent = "Đã nhận bảng dán.";
      add(src);
    };
    ap.onclick = async () => {
      const go = found.filter((x) => x.doc && x.on);
      ap.disabled = true;
      let ok = 0;
      for (const x of go) {
        try {
          x.doc.id = P.docId(x.doc.mon, x.doc.lop, x.doc.cd);
          if (!/^\d{4}-\d{4}$/.test(x.doc.nam)) throw new Error("Năm học phải có dạng 2026-2027.");
          await P.save(x.doc, teacher.uid);
          ok++;
        } catch (e) {
          u.toast(`${x.file}: ${e.message || e}`, "err", 6000);
        }
      }
      if (ok) {
        u.toast(`Đã áp dụng ${ok} bảng PPCT.`, "ok");
        m.close();
        st.nam = go[0].doc.nam;
        st.id = go[0].doc.id;
        st.years = await P.years();
        render();
      } else ap.disabled = false;
    };
  }

  /* ---------- Năm học mới ---------- */
  function newYear() {
    const cur = st.nam;
    const [a] = cur.split("-").map(Number);
    const next = `${a + 1}-${a + 2}`;
    const m = u.modal(`<h2>${L360.icon("plus")} Tạo năm học mới</h2>
      <p class="muted small">Chép toàn bộ PPCT của năm học đang xem sang năm học mới. Sau đó nạp tệp Phụ lục I mới cho môn nào thay đổi, hoặc sửa liên kết từng bài. PPCT năm cũ vẫn được giữ để tra cứu giáo án cũ.</p>
      <div class="grid g2"><label class="field">Chép từ năm học<select id="tu">${st.years.map((y) => `<option ${y === cur ? "selected" : ""}>${y}</option>`).join("")}</select></label>
      <label class="field">Sang năm học<input id="den" value="${next}"></label></div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-close>Huỷ</button><button class="btn primary" id="go">Tạo năm học</button></div>`);
    u.$("#go", m.el).onclick = async () => {
      const tu = u.$("#tu", m.el).value;
      const den = u.$("#den", m.el).value.trim();
      if (!/^\d{4}-\d{4}$/.test(den)) return u.toast("Năm học phải có dạng 2027-2028.", "err");
      const b = u.$("#go", m.el);
      b.disabled = true;
      try {
        const n = await P.copyYear(tu, den, teacher.uid, (i, t) => (b.textContent = `Đang chép ${i}/${t}…`));
        u.toast(`Đã tạo năm học ${P.yearLabel(den)} với ${n} bảng.`, "ok");
        m.close();
        st.nam = den;
        st.id = "";
        st.years = await P.years();
        render();
      } catch (e) {
        b.disabled = false;
        b.textContent = "Tạo năm học";
        u.toast("Không tạo được: " + (e.message || e), "err", 6000);
      }
    };
  }

  (async function init() {
    await S.ready;
    teacher = await L360.Auth.requireTeacher(app, { title: "Đăng nhập để xem phân phối chương trình" });
    st.years = await P.years();
    if (!st.years.includes(st.nam)) st.nam = st.years[0] || P.yearNow();
    // Năm học hiện hành chưa có bảng nào thì mở năm gần nhất có dữ liệu.
    if (!u.qs("nam")) {
      for (const y of st.years) {
        if ((await P.list(y)).length) {
          st.nam = y;
          break;
        }
      }
    }
    render();
  })();
})();
