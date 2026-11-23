/* Trang Báo giảng CSDL: giáo viên tải template báo giảng tuần (xuất từ CSDL, đã có thời khoá biểu)
   → hệ thống điền cột "Tiết theo PPCT" theo Syllabus của trường → tải lại Excel giữ nguyên mẫu để nộp.
   Quản trị viên: tải Syllabus CSDL/HĐTN-HN cho năm học, khai báo lịch nghỉ của trường. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const BG = L360.BaoGiang;
  const app = u.$("#app");
  const ic = L360.icon;
  let teacher = null;
  const st = { nam: BG.yearOf(), tpl: null, syl: {}, last: {}, src: {}, roles: {}, th: {}, off: {}, fix: {}, res: null, cal: [], prog: {}, idx: [] };
  const THU = { 2: "Thứ Hai", 3: "Thứ Ba", 4: "Thứ Tư", 5: "Thứ Năm", 6: "Thứ Sáu", 7: "Thứ Bảy", 8: "Chủ nhật", CN: "Chủ nhật" };
  const fmtD = (d) => (d ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}` : "");
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  function shell(inner) {
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(teacher)}`, { sub: "Báo giảng CSDL", nav: "baogiang" }) +
      `<main class="wrap" style="max-width:1280px">${inner}</main>` +
      L360.shell.footer();
    L360.shell.bindUserMenu(teacher);
  }
  const drop = (id, label, hint, multi) =>
    `<label class="bg-drop" id="${id}"><input type="file" accept=".xlsx,.xls" ${multi ? "multiple" : ""} hidden>${ic("upload")}<b>${label}</b><span class="small muted">${hint}</span></label>`;
  function bindDrop(id, fn) {
    const el = u.$("#" + id);
    if (!el) return;
    const inp = el.querySelector("input");
    inp.onchange = () => inp.files.length && fn([...inp.files]);
    el.ondragover = (e) => (e.preventDefault(), el.classList.add("over"));
    el.ondragleave = () => el.classList.remove("over");
    el.ondrop = (e) => {
      e.preventDefault();
      el.classList.remove("over");
      if (e.dataTransfer.files.length) fn([...e.dataTransfer.files]);
    };
  }

  /* ---------- Tính toán ---------- */
  async function loadSyl() {
    const ks = [...new Set(st.tpl.rows.map((r) => BG.khoiOf(r.lop)).filter(Boolean))];
    for (const k of ks) st.syl[k] = await BG.syllabus(st.nam, k);
  }
  // Các lớp – môn trong template và điểm xuất phát của từng lớp.
  function keys() {
    const out = {};
    st.tpl.rows.forEach((r) => {
      if (!r.mon || !r.lop) return;
      const k = BG.khoiOf(r.lop);
      const ml = BG.monList(st.syl[k], r.mon);
      const key = BG.keyOf(k, ml ? ml.name : r.mon, r.lop);
      out[key] = out[key] || { key, khoi: k, mon: ml ? ml.name : r.mon, lop: r.lop, rows: ml ? ml.rows : null, n: 0 };
      out[key].n++;
    });
    return Object.values(out).sort((a, b) => a.mon.localeCompare(b.mon, "vi") || a.lop.localeCompare(b.lop, "vi", { numeric: true }));
  }
  function autoOff() {
    if (!st.tpl || !st.tpl.from) return;
    [2, 3, 4, 5, 6, 7].forEach((t) => {
      const d = BG.dayOf(st.tpl, t);
      const hit = st.cal.find((c) => c.from <= iso(d) && iso(d) <= (c.to || c.from));
      if (hit && st.off[t] == null) st.off[t] = hit.note || "Nghỉ lễ";
    });
  }
  function compute() {
    st.res = BG.fill(st.tpl, { syl: st.syl, last: st.last, roles: st.roles, th: st.th, off: st.off, fix: st.fix });
  }

  /* ---------- Giao diện ---------- */
  function render() {
    const t = st.tpl;
    const ks = t ? keys() : [];
    const days = t ? [...new Set(t.rows.map((r) => r.thu).filter(Boolean))] : [];
    const flagged = st.res ? st.res.rows.filter((o) => o.flag && o.mon && !/^Ngày nghỉ$/.test(o.flag)) : [];
    const filled = st.res ? st.res.rows.filter((o) => o.mon && o.out).length : 0;
    shell(`<div class="row" style="align-items:flex-end;margin-bottom:14px;gap:12px"><div class="grow"><h1 style="margin:0">Báo giảng CSDL</h1>
        <p class="muted" style="margin:4px 0 0">Tải template báo giảng tuần (đã có thời khoá biểu) → hệ thống điền "Tiết theo PPCT" theo Syllabus của trường → tải lại tệp Excel giữ nguyên mẫu để nộp lên CSDL.</p></div>
        <span class="pill">Năm học ${u.esc(st.nam.replace("-", "–"))}</span></div>
      <div class="bg-grid">
      <div class="col" style="gap:16px;min-width:0">
        <section class="card"><h2>1. Template báo giảng tuần</h2>
          ${
            t
              ? `<div class="row" style="gap:10px;align-items:center"><span class="bg-file">${ic("doc")} ${u.esc(t.name)}</span><span class="pill accent">Tuần ${t.tuan || "?"}${t.from ? ` · ${fmtD(t.from)}–${fmtD(t.to)}` : ""}</span>${
                  t.gv ? `<span class="pill">${u.esc(t.gv)}${t.maGv ? " · " + u.esc(t.maGv) : ""}</span>` : ""
                }<span class="spacer"></span><button class="btn sm ghost" id="newTpl">Đổi template</button></div>`
              : drop("tplDrop", "Kéo thả hoặc bấm để chọn template báo giảng tuần (.xlsx)", "Tải từ CSDL: mỗi dòng là một tiết theo thời khoá biểu; cột “Tiết theo PPCT” để trống.")
          }
        </section>
        ${
          t
            ? `<section class="card"><h2>2. Ngày nghỉ trong tuần</h2><p class="small muted" style="margin-top:-4px">Ngày đánh dấu nghỉ: các tiết ghi “Nghỉ lễ”, không báo tiết PPCT${st.cal.length ? "; lịch nghỉ của trường đã được áp dụng sẵn" : ""}.</p>
              <div class="bg-days">${days
                .map((d) => {
                  const on = st.off[d] != null;
                  const dd = BG.dayOf(t, d);
                  return `<div class="bg-day ${on ? "on" : ""}"><label class="row nowrap" style="gap:8px"><input type="checkbox" data-off="${u.esc(d)}" ${on ? "checked" : ""}><b>${THU[d] || "Thứ " + d}</b><span class="small muted">${fmtD(dd)}</span></label>${
                    on ? `<input class="sm" data-offn="${u.esc(d)}" value="${u.esc(st.off[d] || "")}" placeholder="Lí do, ví dụ: Nghỉ lễ 20/11">` : ""
                  }</div>`;
                })
                .join("")}</div></section>
            <section class="card"><h2>3. Tiết đã báo gần nhất của từng lớp</h2>
              <p class="small muted" style="margin-top:-4px">Hệ thống nhớ tiết đã báo sau mỗi lần tải tệp. Lần đầu dùng, nạp các tệp báo giảng tuần trước hoặc chọn tay; chưa báo tiết nào thì để “Chưa báo”.</p>
              ${drop("prevDrop", "Nạp báo giảng các tuần trước (có thể chọn nhiều tệp)", "Đọc cột “Tiết theo PPCT” đã điền để biết tiết gần nhất của mỗi lớp.", true)}
              <div class="tbl-wrap" style="margin-top:10px"><table class="t bg-tbl"><tr><th>Môn</th><th>Lớp</th><th>Số tiết tuần này</th><th>Tiết đã báo gần nhất</th><th>Tuỳ chọn</th></tr>${ks
                .map((k) => {
                  const opts = (k.rows || []).map((r) => `<option value="${u.esc(r[0])}" ${st.last[k.key] === r[0] ? "selected" : ""}>${u.esc(r[0])} – ${u.esc(String(r[1]).slice(0, 60))}</option>`).join("");
                  const hd = BG.isHDTN(k.mon);
                  const hasTH = (k.rows || []).some(BG.isTH);
                  return `<tr><td>${u.esc(k.mon)}</td><td><b>${u.esc(k.lop)}</b></td><td class="num">${k.n}</td><td>${
                    k.rows ? `<select data-last="${u.esc(k.key)}" style="max-width:340px"><option value="">Chưa báo (bắt đầu từ tiết đầu)</option>${opts}</select>${st.src[k.key] ? `<div class="tiny muted">${u.esc(st.src[k.key])}</div>` : ""}` : `<span class="pill bad">Chưa có Syllabus</span>`
                  }</td><td class="small">${
                    hd
                      ? `<select data-role="${u.esc(k.key)}"><option value="GVCN" ${st.roles[k.key] === "GVCN" ? "selected" : ""}>GVCN: chỉ tiết GVCN</option><option value="GVBM" ${st.roles[k.key] === "GVBM" ? "selected" : ""}>GVBM: chỉ tiết GVBM</option><option value="all" ${st.roles[k.key] === "all" ? "selected" : ""}>Tất cả các tiết</option></select>`
                      : ""
                  }${hasTH ? `<label class="row nowrap small" style="gap:6px"><input type="checkbox" data-th="${u.esc(k.key)}" ${st.th[k.key] ? "checked" : ""}> Báo cả tiết TH (tăng cường)</label>` : ""}${BG.skipKT(k.mon) ? `<span class="tiny muted">Không báo tiết kiểm tra chung</span>` : ""}</td></tr>`;
                })
                .join("")}</table></div></section>
            <section class="card"><div class="row"><h2 class="grow" style="margin:0">4. Kết quả</h2><span class="pill ok">${filled} tiết đã điền</span>${flagged.length ? `<span class="pill warn">${flagged.length} dòng cần xem</span>` : ""}</div>
              <div class="tbl-wrap" style="margin-top:10px"><table class="t bg-tbl"><tr><th>Thứ</th><th>Buổi</th><th>Tiết</th><th>Kiểu</th><th>Môn</th><th>Lớp</th><th>Tiết theo PPCT</th><th>Tên bài dạy</th></tr>${st.res.rows
                .filter((o) => o.mon || o.kieu)
                .map((o) => {
                  const k = keys().find((x) => x.key === o.key);
                  const sel = k && k.rows ? `<select data-fix="${o.r}" class="${o.auto ? "auto" : o.fixed ? "fixed" : ""}"><option value="">${o.auto ? u.esc(o.out) + " (tự động)" : "– để trống –"}</option>${k.rows.map((r) => `<option value="${u.esc(r[0])}" ${st.fix[o.r] === r[0] || (o.fixed && o.out === r[0]) ? "selected" : ""}>${u.esc(r[0])}</option>`).join("")}</select>` : `<b>${u.esc(o.out || "")}</b>`;
                  return `<tr class="${o.flag ? (o.flag === "Ngày nghỉ" ? "off" : "warn") : ""}"><td>${u.esc(o.thu)}</td><td>${u.esc(o.buoi)}</td><td>${u.esc(o.tkb)}</td><td>${u.esc(o.kieuOut || "")}</td><td>${u.esc(o.mon)}</td><td><b>${u.esc(o.lop)}</b></td><td>${sel}</td><td class="small">${u.esc(o.ten || "")}${o.flag ? `<div class="bg-flag">${u.esc(o.flag)}${o.noteOut && o.flag === "Ngày nghỉ" ? ": " + u.esc(o.noteOut) : ""}</div>` : ""}</td></tr>`;
                })
                .join("")}</table></div>
              <div class="row" style="margin-top:14px;gap:10px"><button class="btn primary lg" id="dlx">${ic("download")} Tải tệp Excel báo giảng</button><span class="small muted">Tệp giữ nguyên mẫu của CSDL (chỉ ghi các ô cần điền) – tải thẳng lên hệ thống. Sau khi tải, hệ thống nhớ tiết đã báo cho tuần sau.</span></div></section>`
            : ""
        }
      </div>
      <aside class="col" style="gap:16px;min-width:0">
        <section class="card bg-rules"><h3>Quy tắc điền</h3><ul class="small">
          <li>Báo từ tiết 1, lần lượt theo từng tuần; mỗi tiết của một lớp chỉ báo một lần.</li>
          <li>Ngữ văn, Lịch sử, Địa lí, LS&amp;ĐL, GDCD, GDKT&amp;PL (kiểm tra chung toàn trường): <b>không</b> báo tiết kiểm tra. Hôm nào kiểm tra tại lớp thì chọn tay mã tiết (KTGHK…) ở dòng đó.</li>
          <li>GDĐP, HĐTN (kiểm tra, đánh giá tại lớp): báo tiết kiểm tra như tiết thường.</li>
          <li>HĐTN: GVCN chỉ báo tiết GVCN; GVBM chỉ báo tiết GVBM (theo Syllabus HĐTN-HN).</li>
          <li>Tiết “TH…” (luồng tăng cường) không báo, trừ khi chọn “Báo cả tiết TH”.</li>
          <li>Dạy thay, lấp giờ: thầy cô tự chọn mã tiết của lớp đó.</li></ul></section>
        <section class="card"><h3>Syllabus năm học ${u.esc(st.nam.replace("-", "–"))}</h3><div class="small">${
          st.idx.length ? st.idx.map((x) => `<div class="row nowrap" style="gap:6px;margin:3px 0"><b>Khối ${x.khoi}</b><span class="muted grow">${x.mon.length} môn · ${x.rows} tiết</span><span class="tiny muted">${u.esc(x.nguon || "")}</span></div>`).join("") : `<p class="muted">Chưa có Syllabus.</p>`
        }</div>${
          teacher.isAdmin
            ? `<div style="margin-top:10px">${drop("sylDrop", "Quản trị: tải Syllabus năm học", "Tệp Syllabus_CSDL_K*.xlsx và Syllabus_HDTNHN_K*.xlsx (chọn nhiều tệp cùng lúc).", true)}</div>`
            : `<p class="tiny muted" style="margin-top:8px">Quản trị viên cập nhật Syllabus mỗi năm học.</p>`
        }</section>
        <section class="card"><h3>Lịch nghỉ của trường</h3><div class="small">${
          st.cal.length ? st.cal.map((c, i) => `<div class="row nowrap" style="gap:6px;margin:3px 0"><span>${u.esc(c.from.split("-").reverse().join("/"))}${c.to && c.to !== c.from ? "–" + u.esc(c.to.split("-").reverse().join("/")) : ""}</span><span class="grow muted">${u.esc(c.note || "")}</span>${teacher.isAdmin || teacher.isLeader ? `<button class="btn sm ghost" data-caldel="${i}">✕</button>` : ""}</div>`).join("") : `<p class="muted">Chưa khai báo.</p>`
        }</div>${
          teacher.isAdmin || teacher.isLeader
            ? `<div class="grid g2" style="margin-top:8px;gap:6px"><input type="date" id="calF"><input type="date" id="calT"></div><div class="row nowrap" style="gap:6px;margin-top:6px"><input id="calN" placeholder="Ví dụ: Nghỉ Tết Dương lịch" class="grow"><button class="btn sm" id="calAdd">Thêm</button></div>`
            : ""
        }</section>
      </aside></div>`);
    bind();
  }

  function bind() {
    bindDrop("tplDrop", async (fs) => {
      try {
        st.tpl = await BG.readTemplate(fs[0]);
        st.nam = st.tpl.nam;
        st.fix = {};
        st.off = {};
        await loadSyl();
        st.cal = await BG.loadCalendar(st.nam);
        st.idx = await BG.syllabusIndex(st.nam);
        st.prog = await BG.loadProgress(teacher.uid, st.nam);
        keys().forEach((k) => {
          const p = st.prog[k.key];
          if (p && p.code && st.last[k.key] == null) (st.last[k.key] = p.code), (st.src[k.key] = `Đã báo đến tuần ${p.tuan || "?"}`);
          if (BG.isHDTN(k.mon) && !st.roles[k.key]) st.roles[k.key] = "GVCN";
        });
        autoOff();
        compute();
        render();
        const miss = keys().filter((k) => !k.rows);
        if (miss.length) u.toast(`Chưa có Syllabus cho: ${miss.map((k) => k.mon + " " + k.lop).join(", ")}.`, "bad", 5000);
      } catch (e) {
        u.toast(e.message || "Không đọc được tệp.", "bad", 5000);
      }
    });
    bindDrop("prevDrop", async (fs) => {
      try {
        const tpls = [];
        for (const f of fs) tpls.push(await BG.readTemplate(f));
        const last = BG.lastFrom(tpls, st.syl);
        const n = Object.keys(last).length;
        Object.entries(last).forEach(([k, c]) => ((st.last[k] = c), (st.src[k] = `Từ tệp ${tpls.map((t) => "tuần " + (t.tuan || "?")).join(", ")}`)));
        compute();
        render();
        u.toast(n ? `Đã đọc tiết gần nhất của ${n} lớp – môn.` : "Các tệp chưa có tiết nào đã điền.", n ? "ok" : "bad", 3500);
      } catch (e) {
        u.toast(e.message || "Không đọc được tệp.", "bad", 5000);
      }
    });
    bindDrop("sylDrop", async (fs) => {
      try {
        const parsed = [];
        for (const f of fs) parsed.push(await BG.parseSyllabus(f));
        const styles = {};
        parsed.filter((p) => p.kind === "hdtn").forEach((p) => Object.entries(p.styles).forEach(([k, v]) => (styles[k] = Object.assign(styles[k] || {}, v))));
        let n = 0;
        for (const p of parsed.filter((x) => x.kind === "csdl")) {
          for (const [k, mons] of Object.entries(p.docs)) {
            const doc = BG.mergeStyles({ v: 1, khoi: Number(k), nguon: p.name, up: Date.now(), mon: mons }, styles[k] || {});
            await BG.saveSyllabus(st.nam, k, doc);
            n++;
          }
        }
        if (!n && Object.keys(styles).length) {
          // Chỉ tải tệp HĐTN-HN: ghép vào Syllabus đang dùng.
          for (const [k, v] of Object.entries(styles)) {
            const doc = await BG.syllabus(st.nam, k);
            if (doc) await BG.saveSyllabus(st.nam, k, BG.mergeStyles(Object.assign({}, doc, { up: Date.now() }), v)), n++;
          }
        }
        st.idx = await BG.syllabusIndex(st.nam);
        if (st.tpl) (st.syl = {}), await loadSyl(), compute();
        render();
        u.toast(n ? `Đã cập nhật Syllabus ${n} khối cho năm học ${st.nam}.` : "Không thấy dữ liệu Syllabus trong tệp.", n ? "ok" : "bad", 4000);
      } catch (e) {
        u.toast(e.message || "Không đọc được tệp Syllabus.", "bad", 5000);
      }
    });
    const nt = u.$("#newTpl");
    if (nt) nt.onclick = () => ((st.tpl = null), (st.res = null), render());
    u.$$("[data-off]").forEach(
      (b) =>
        (b.onchange = () => {
          if (b.checked) st.off[b.dataset.off] = "Nghỉ lễ";
          else delete st.off[b.dataset.off];
          compute();
          render();
        })
    );
    u.$$("[data-offn]").forEach((b) => (b.onchange = () => ((st.off[b.dataset.offn] = b.value.trim() || "Nghỉ lễ"), compute(), render())));
    u.$$("[data-last]").forEach((b) => (b.onchange = () => ((st.last[b.dataset.last] = b.value || undefined), (st.src[b.dataset.last] = "Chọn tay"), compute(), render())));
    u.$$("[data-role]").forEach((b) => (b.onchange = () => ((st.roles[b.dataset.role] = b.value), compute(), render())));
    u.$$("[data-th]").forEach((b) => (b.onchange = () => ((st.th[b.dataset.th] = b.checked), compute(), render())));
    u.$$("[data-fix]").forEach(
      (b) =>
        (b.onchange = () => {
          if (b.value) st.fix[b.dataset.fix] = b.value;
          else delete st.fix[b.dataset.fix];
          compute();
          render();
        })
    );
    const dl = u.$("#dlx");
    if (dl)
      dl.onclick = async () => {
        dl.disabled = true;
        try {
          const blob = await BG.exportXlsx(st.tpl, st.res.rows);
          u.downloadBlob(st.tpl.name.replace(/\.xlsx?$/i, "") + ".xlsx", blob);
          try {
            await BG.saveProgress(teacher.uid, st.nam, st.tpl.tuan, st.res.last, st.res.rows);
          } catch (e) {}
          u.toast("Đã tải tệp báo giảng. Hệ thống đã nhớ tiết đã báo để điền tuần sau.", "ok", 4000);
        } catch (e) {
          u.toast("Không tạo được tệp: " + (e.message || e), "bad", 5000);
        }
        dl.disabled = false;
      };
    const ca = u.$("#calAdd");
    if (ca)
      ca.onclick = async () => {
        const f = u.$("#calF").value, t = u.$("#calT").value || f, n = u.$("#calN").value.trim();
        if (!f) return u.toast("Chọn ngày bắt đầu nghỉ.", "bad");
        await L360.store.push(`baogiang/lich/${st.nam}`, { from: f, to: t < f ? f : t, note: n || "Nghỉ lễ" });
        st.cal = await BG.loadCalendar(st.nam);
        if (st.tpl) autoOff(), compute();
        render();
      };
    u.$$("[data-caldel]").forEach(
      (b) =>
        (b.onclick = async () => {
          const all = (await L360.store.get(`baogiang/lich/${st.nam}`)) || {};
          const c = st.cal[Number(b.dataset.caldel)];
          const k = Object.keys(all).find((x) => all[x] && all[x].from === c.from && all[x].note === c.note);
          if (k) await L360.store.set(`baogiang/lich/${st.nam}/${k}`, null);
          st.cal = await BG.loadCalendar(st.nam);
          render();
        })
    );
  }

  (async function init() {
    teacher = await L360.Auth.requireTeacher(app, { title: "Đăng nhập để làm báo giảng" });
    st.idx = await BG.syllabusIndex(st.nam);
    st.cal = await BG.loadCalendar(st.nam);
    render();
  })();
})();
