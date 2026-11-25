/* Trang Danh sách lớp: xem theo năm học → khối → lớp; quản trị viên tải lên (Excel/CSV/dán), sửa, xoá. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const Lop = L360.Lop;
  const app = u.$("#app");
  let teacher = null;
  const st = { nam: u.qs("nam") || "", id: u.qs("lop") || "", years: [], list: [] };
  const canEdit = () => !!(teacher && teacher.isAdmin);
  const yl = (n) => String(n || "").replace("-", "–");

  const setUrl = () => {
    const q = new URLSearchParams();
    q.set("nam", st.nam);
    if (st.id) q.set("lop", st.id);
    if (/che-do=dien-tap/.test(location.search)) q.set("che-do", "dien-tap"), q.set("dev", "1");
    history.replaceState(null, "", "?" + q.toString());
  };

  async function load() {
    st.list = await Lop.list(st.nam);
    if (st.id && !st.list.find((c) => c.id === st.id)) st.id = "";
    if (!st.id && st.list.length) st.id = st.list[0].id;
    setUrl();
    render();
  }

  function render() {
    const cur = st.list.find((c) => c.id === st.id);
    const groups = Lop.byKhoi(st.list);
    const total = st.list.reduce((a, c) => a + (c.n || c.hs.length), 0);
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(teacher)}`, { sub: "Danh sách lớp" }) +
      `<main class="wrap" style="max-width:1280px">
      <div class="row" style="align-items:flex-end;gap:12px;flex-wrap:wrap"><div class="grow"><h1 style="margin-bottom:4px">Danh sách lớp</h1>
        <p class="muted" style="margin:0">Theo năm học, sắp xếp Khối → Lớp. Khi mở tiết học, thầy cô chỉ cần chọn lớp: mã học sinh S01… theo thứ tự danh sách, học sinh vào lớp bằng tên của mình.</p></div>
        <label class="field" style="min-width:170px">Năm học<select id="nam">${st.years.map((y) => `<option value="${y}" ${y === st.nam ? "selected" : ""}>${yl(y)}</option>`).join("")}</select></label></div>
      ${
        canEdit()
          ? `<div class="row" style="margin:14px 0;gap:8px;flex-wrap:wrap"><button class="btn primary" id="up">${L360.icon("upload")} Tải danh sách lên (Excel)</button><button class="btn" id="paste">Dán danh sách một lớp</button><button class="btn ghost" id="tpl">⬇ Tệp mẫu Excel</button><input type="file" id="file" accept=".xlsx,.xls,.csv,.txt" multiple hidden>
            <span class="spacer"></span><span class="small muted">${st.list.length} lớp · ${total} học sinh · năm học ${yl(st.nam)}</span></div>`
          : `<p class="pill" style="margin:14px 0;white-space:normal">Chỉ quản trị viên cập nhật danh sách lớp. Thầy cô chọn lớp khi mở tiết học ở trang Dạy học.</p>`
      }
      ${
        !st.list.length
          ? `<section class="card center" style="padding:40px"><h2>Năm học ${yl(st.nam)} chưa có danh sách lớp</h2><p class="muted">${
              canEdit() ? "Bấm “Tải danh sách lên (Excel)”: mỗi lớp một trang tính (tên trang tính là tên lớp) hoặc tệp xuất từ phần mềm quản lí trường. Có thể tải nhiều tệp một lần." : "Quản trị viên sẽ tải danh sách lớp lên. Trong lúc chờ, khi mở tiết học thầy cô chọn “Lớp chưa có danh sách” và nhập sĩ số như trước."
            }</p></section>`
          : `<div class="grid lh" style="grid-template-columns:minmax(240px,320px) minmax(0,1fr);gap:20px;align-items:start;margin-top:6px">
        <aside class="card lh-side">${groups
          .map(
            (g) => `<div class="lh-k"><div class="lh-kh">${g.khoi ? `Khối ${g.khoi}` : "Khác"} <span class="muted small">· ${g.lop.length} lớp</span></div><div class="lh-cs">${g.lop
              .map((c) => `<button class="lh-c ${c.id === st.id ? "on" : ""}" data-lop="${u.esc(c.id)}"><b>${u.esc(c.ten)}</b><span>${c.n || c.hs.length} HS</span></button>`)
              .join("")}</div></div>`
          )
          .join("")}</aside>
        <section class="card">${cur ? detail(cur) : ""}</section></div>`
      }
      <p class="tiny muted" style="margin-top:14px">Bảo mật: họ tên đầy đủ chỉ giáo viên đã được duyệt xem được. Trong tiết học, máy học sinh và màn chiếu chỉ hiện mã số và tên (VD: S05 – Hiệu); trùng tên thì thêm A, B, C theo thứ tự trong danh sách.</p>
      </main>` +
      L360.shell.footer();
    L360.shell.bindUserMenu(teacher);
    u.$("#nam").onchange = (e) => ((st.nam = e.target.value), (st.id = ""), load());
    u.$$("[data-lop]").forEach((b) => (b.onclick = () => ((st.id = b.dataset.lop), setUrl(), render())));
    if (canEdit()) {
      u.$("#up").onclick = () => u.$("#file").click();
      u.$("#file").onchange = (e) => upload([...e.target.files]);
      u.$("#paste").onclick = () => pasteModal(null);
      u.$("#tpl").onclick = () => Lop.template();
      if (cur) {
        u.$("#edit").onclick = () => pasteModal(cur);
        u.$("#del").onclick = async () => {
          if (!(await u.confirm(`Xoá danh sách lớp **${cur.ten}** (${cur.hs.length} học sinh) của năm học ${yl(st.nam)}? Các tiết đã dạy vẫn giữ nguyên số liệu.`, "Xoá lớp"))) return;
          await Lop.remove(st.nam, cur.id);
          u.toast(`Đã xoá lớp ${cur.ten}.`, "ok");
          st.id = "";
          load();
        };
      }
    }
  }

  function detail(c) {
    const sn = Lop.shortNames(c.hs);
    return `<div class="row" style="gap:10px;flex-wrap:wrap"><h2 class="grow" style="margin:0">Lớp ${u.esc(c.ten)} <span class="muted small" style="font-weight:500">· Khối ${c.khoi || "?"} · ${c.hs.length} học sinh · năm học ${yl(c.nam)}</span></h2>
      ${canEdit() ? `<button class="btn sm" id="edit">Sửa danh sách</button><button class="btn sm ghost" id="del">Xoá lớp</button>` : ""}</div>
      ${c.at ? `<p class="tiny muted" style="margin:4px 0 10px">Cập nhật ${u.fmtDateTime(c.at)}${c.by ? " · " + u.esc(c.by) : ""}</p>` : ""}
      <div style="overflow:auto"><table class="t lh-t"><tr><th style="width:56px">STT</th><th style="width:80px">Mã</th><th>Họ và tên</th><th>Tên khi vào lớp</th></tr>${c.hs
        .map((n, i) => `<tr><td>${i + 1}</td><td><b>${Lop.code(i)}</b></td><td>${u.esc(n)}</td><td>${u.esc(sn[i])}${sn[i] !== Lop.given(n) ? ` <span class="pill sm">trùng tên</span>` : ""}</td></tr>`)
        .join("")}</table></div>`;
  }

  // Tải tệp: đọc mọi lớp trong các tệp → xem trước, sửa tên lớp → lưu.
  async function upload(files) {
    if (!files.length) return;
    let found = [];
    const bad = [];
    for (const f of files) {
      try {
        const cs = await Lop.readFile(f);
        if (!cs.length) bad.push(f.name);
        cs.forEach((c) => found.push(Object.assign(c, { file: f.name })));
      } catch (e) {
        console.warn(e);
        bad.push(f.name);
      }
    }
    u.$("#file").value = "";
    if (!found.length) return u.toast(`Không đọc được danh sách học sinh trong ${bad.join(", ")}. Kiểm tra cột “Họ và tên” hoặc dùng tệp mẫu.`, "bad", 6000);
    preview(found, bad);
  }

  function preview(found, bad) {
    const exist = Object.fromEntries(st.list.map((c) => [c.ten, c]));
    const md = u.modal(`<h2>Xem trước danh sách lớp</h2><p class="small muted" style="margin-top:-4px">Năm học <b>${yl(st.nam)}</b>. Kiểm tra tên lớp và sĩ số; lớp đã có sẽ được thay bằng danh sách mới.${
      bad.length ? `<br><span style="color:var(--bad)">Không đọc được: ${u.esc(bad.join(", "))}</span>` : ""
    }</p>
      <div style="max-height:55vh;overflow:auto"><table class="t"><tr><th></th><th>Lớp</th><th>Khối</th><th>Sĩ số</th><th>Học sinh đầu danh sách</th><th></th></tr>${found
        .map(
          (c, i) => `<tr><td><input type="checkbox" data-pk="${i}" checked></td><td><input class="lh-in" data-pt="${i}" value="${u.esc(c.ten)}" placeholder="VD: 10A1" style="width:90px;text-transform:uppercase"></td><td data-pkh="${i}">${c.khoi || "?"}</td><td><b>${c.hs.length}</b></td>
          <td class="small">${u.esc(c.hs.slice(0, 3).join(", "))}${c.hs.length > 3 ? "…" : ""}<div class="tiny muted">${u.esc(c.file || "")}</div></td><td data-pst="${i}" class="small"></td></tr>`
        )
        .join("")}</table></div>
      <div class="row" style="margin-top:14px"><span class="spacer"></span><button class="btn" data-close>Huỷ</button><button class="btn primary" id="sv">Lưu các lớp đã chọn</button></div>`, { wide: true });
    const status = () =>
      found.forEach((c, i) => {
        const t = Lop.className(u.$(`[data-pt="${i}"]`, md.el).value);
        c.ten = t;
        c.khoi = Lop.khoiOf(t);
        u.$(`[data-pkh="${i}"]`, md.el).textContent = c.khoi || "?";
        const dup = found.filter((x, j) => j !== i && x.ten && x.ten === t && u.$(`[data-pk="${j}"]`, md.el).checked).length;
        u.$(`[data-pst="${i}"]`, md.el).innerHTML = !t
          ? `<span class="pill bad">Nhập tên lớp</span>`
          : dup
          ? `<span class="pill warn">Trùng lớp trong tệp</span>`
          : exist[t]
          ? `<span class="pill warn">Thay ${exist[t].hs.length} em cũ</span>`
          : `<span class="pill ok">Lớp mới</span>`;
      });
    u.$$("[data-pt]", md.el).forEach((x) => (x.oninput = status));
    u.$$("[data-pk]", md.el).forEach((x) => (x.onchange = status));
    status();
    u.$("#sv", md.el).onclick = async () => {
      status();
      const pick = found.filter((c, i) => u.$(`[data-pk="${i}"]`, md.el).checked);
      if (!pick.length) return u.toast("Chưa chọn lớp nào.", "bad");
      if (pick.some((c) => !c.ten)) return u.toast("Còn lớp chưa có tên – nhập tên lớp (VD: 10A1).", "bad");
      const names = pick.map((c) => c.ten);
      if (new Set(names).size !== names.length) return u.toast("Có hai danh sách cùng tên lớp – bỏ chọn một danh sách.", "bad");
      if (pick.some((c) => c.hs.length > Lop.MAX_HS)) return u.toast(`Mỗi lớp tối đa ${Lop.MAX_HS} học sinh.`, "bad");
      u.$("#sv", md.el).disabled = true;
      try {
        for (const c of pick) await Lop.save(st.nam, Object.assign({}, c, { id: exist[c.ten] ? exist[c.ten].id : "" }), teacher.acc || teacher.name || "");
        md.close();
        u.toast(`Đã lưu ${pick.length} lớp (${pick.reduce((a, c) => a + c.hs.length, 0)} học sinh) cho năm học ${yl(st.nam)}.`, "ok", 4500);
        st.id = exist[pick[0].ten] ? exist[pick[0].ten].id : Lop.idOf(pick[0].ten);
        load();
      } catch (e) {
        u.$("#sv", md.el).disabled = false;
        u.toast("Không lưu được: " + (e.message || e), "bad", 5000);
      }
    };
  }

  // Dán hoặc sửa danh sách một lớp (mỗi dòng một em, đúng thứ tự trong sổ).
  function pasteModal(c) {
    const md = u.modal(`<h2>${c ? `Sửa danh sách lớp ${u.esc(c.ten)}` : "Dán danh sách một lớp"}</h2>
      <div class="grid g2" style="gap:10px"><label class="field">Lớp<input id="pl" value="${u.esc(c ? c.ten : "")}" placeholder="VD: 10A1" style="text-transform:uppercase" ${c ? "disabled" : ""}></label><div class="small muted" style="align-self:end">Mỗi dòng một học sinh, đúng thứ tự trong sổ (dòng 1 là S01). Có thể dán thẳng từ Excel/Word, kể cả cột STT.</div></div>
      <label class="field" style="margin-top:10px">Họ và tên<textarea id="pt" rows="14" placeholder="Nguyễn Văn An&#10;Trần Thị Bình&#10;…">${u.esc(c ? c.hs.join("\n") : "")}</textarea></label>
      <p class="small" id="pn" style="margin:6px 0"></p>
      <div class="row"><span class="spacer"></span><button class="btn" data-close>Huỷ</button><button class="btn primary" id="ps">Lưu</button></div>`);
    const read = () => {
      const ten = Lop.className(u.$("#pl", md.el).value);
      const r = Lop.readPaste(u.$("#pt", md.el).value, ten || "10X");
      return { ten, hs: r.length ? r[0].hs : [] };
    };
    const info = () => {
      const r = read();
      u.$("#pn", md.el).innerHTML = r.hs.length ? `Đọc được <b>${r.hs.length}</b> học sinh · ${u.esc(Lop.shortNames(r.hs).slice(0, 6).map((n, i) => `${Lop.code(i)} ${n}`).join(", "))}${r.hs.length > 6 ? "…" : ""}` : `<span class="muted">Chưa đọc được học sinh nào.</span>`;
    };
    u.$("#pt", md.el).oninput = u.debounce(info, 250);
    info();
    u.$("#ps", md.el).onclick = async () => {
      const r = read();
      if (!r.ten) return u.toast("Nhập tên lớp, VD: 10A1.", "bad");
      if (!r.hs.length) return u.toast("Chưa có học sinh nào.", "bad");
      if (r.hs.length > Lop.MAX_HS) return u.toast(`Mỗi lớp tối đa ${Lop.MAX_HS} học sinh.`, "bad");
      const old = st.list.find((x) => x.ten === r.ten);
      if (!c && old && !(await u.confirm(`Lớp **${r.ten}** đã có danh sách ${old.hs.length} em. Thay bằng danh sách mới?`, "Thay danh sách"))) return;
      try {
        st.id = await Lop.save(st.nam, { id: c ? c.id : old ? old.id : "", ten: r.ten, hs: r.hs }, teacher.acc || teacher.name || "");
        md.close();
        u.toast(`Đã lưu lớp ${r.ten}: ${r.hs.length} học sinh.`, "ok");
        load();
      } catch (e) {
        u.toast("Không lưu được: " + (e.message || e), "bad", 5000);
      }
    };
  }

  (async function init() {
    await L360.store.ready;
    teacher = await L360.Auth.requireTeacher(app, { title: "Đăng nhập để xem danh sách lớp" });
    if (!teacher) return;
    st.years = await Lop.years();
    if (!st.nam) st.nam = L360.Ppct ? await L360.Ppct.activeYear().catch(() => L360.Ppct.yearNow()) : st.years[0];
    if (!st.years.includes(st.nam)) st.years.unshift(st.nam);
    load();
  })();
})();
