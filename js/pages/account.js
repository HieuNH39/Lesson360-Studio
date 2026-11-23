/* Tài khoản & quản trị: hồ sơ giáo viên; quản trị/tổ trưởng đặt mã mời, phân quyền tổ trưởng. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const S = L360.store;
  const app = u.$("#app");
  let t = null;

  async function draw() {
    const sel = (t.subjects || []).slice();
    const teachers = t.isLeader && !L360.isLocal ? (await S.get("teachers").catch(() => null)) || {} : {};
    const leaders = t.isLeader && !L360.isLocal ? (await S.get("leaders").catch(() => null)) || {} : {};
    const admins = t.isLeader && !L360.isLocal ? (await S.get("admins").catch(() => null)) || {} : {};
    const invite = t.isLeader && !L360.isLocal ? await S.get("secret/invite").catch(() => "") : "";
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(t)}`, { sub: "Tài khoản & quản trị" }) +
      `<main class="wrap" style="max-width:980px"><h1>Tài khoản</h1>
      <section class="card"><h2>Hồ sơ</h2><div class="grid g2"><label class="field">Họ và tên<input id="nm" type="text" value="${u.esc(t.name || "")}"></label><label class="field">Email<input type="text" value="${u.esc(t.email || "(Diễn tập)")}" disabled></label></div>
      <p style="margin:14px 0 6px;font-weight:650">Môn dạy</p><div class="chips">${L360.Curr.subjects.map((s) => `<button class="chip ${sel.includes(s.id) ? "sel" : ""}" data-sj="${s.id}">${u.esc(s.name)}</button>`).join("")}</div>
      <p class="small muted" style="margin-top:10px">Vai trò: <b>${t.isAdmin ? "Quản trị" : t.isLeader ? "Tổ trưởng" : "Giáo viên"}</b></p>
      <button class="btn primary" id="save" style="margin-top:8px">Lưu hồ sơ</button></section>
      ${
        t.isLeader && !L360.isLocal
          ? `<section class="card" style="margin-top:18px"><h2>Mã mời của tổ</h2><p class="muted">Giáo viên mới nhập mã này khi tạo tài khoản. Đổi mã bất cứ lúc nào – tài khoản đã tạo không bị ảnh hưởng.</p>
            <div class="row"><input id="inv" type="text" value="${u.esc(invite || "")}" style="max-width:280px;font-weight:700;letter-spacing:.06em"><button class="btn" id="gen">Tạo mã ngẫu nhiên</button><button class="btn primary" id="setInv">Lưu mã mời</button></div></section>
            <section class="card" style="margin-top:18px"><h2>Giáo viên (${Object.keys(teachers).length})</h2><table class="t"><tr><th>Họ tên</th><th>Email</th><th>Môn</th><th>Vai trò</th><th></th></tr>${u
              .entries(teachers)
              .sort((a, b) => String(a[1].name).localeCompare(String(b[1].name), "vi"))
              .map(
                ([uid, x]) => `<tr><td><b>${u.esc(x.name || "")}</b></td><td class="small">${u.esc(x.email || "")}</td><td class="small">${u.esc((x.subjects || []).map((s) => L360.Curr.subjectName(s)).join(", "))}</td>
                <td>${admins[uid] ? `<span class="pill brand">Quản trị</span>` : leaders[uid] ? `<span class="pill ok">Tổ trưởng</span>` : `<span class="pill">Giáo viên</span>`}</td>
                <td class="right">${t.isAdmin && !admins[uid] ? `<button class="btn sm" data-lead="${uid}" data-on="${leaders[uid] ? 0 : 1}">${leaders[uid] ? "Bỏ tổ trưởng" : "Đặt làm tổ trưởng"}</button>` : ""}</td></tr>`
              )
              .join("")}</table><p class="small muted">Tổ trưởng xem được dữ liệu tiết dạy của cả tổ và ghi phiếu nhận xét tiết dạy. Chỉ quản trị phân quyền.</p></section>`
          : ""
      }</main>` +
      L360.shell.footer();
    L360.shell.bindUserMenu(t);
    u.$$("[data-sj]").forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.sj;
          const i = sel.indexOf(id);
          i >= 0 ? sel.splice(i, 1) : sel.push(id);
          b.classList.toggle("sel", sel.includes(id));
        })
    );
    u.$("#save").onclick = async () => {
      const name = u.$("#nm").value.trim();
      if (!name) return u.toast("Nhập họ tên.", "bad");
      if (L360.isLocal) {
        localStorage.setItem("l360:tname", name);
        localStorage.setItem("l360:tsubjects", JSON.stringify(sel));
      } else await S.update(`teachers/${t.uid}`, { name, subjects: sel });
      t.name = name;
      t.subjects = sel;
      u.toast("Đã lưu hồ sơ.", "ok");
    };
    if (u.$("#gen")) u.$("#gen").onclick = () => (u.$("#inv").value = "TO-KHXH-" + u.uid(4).toUpperCase());
    if (u.$("#setInv"))
      u.$("#setInv").onclick = async () => {
        const v = u.$("#inv").value.trim();
        if (v.length < 4) return u.toast("Mã mời cần ít nhất 4 kí tự.", "bad");
        await S.set("secret/invite", v);
        u.toast("Đã lưu mã mời.", "ok");
      };
    u.$$("[data-lead]").forEach(
      (b) =>
        (b.onclick = async () => {
          await S.set(`leaders/${b.dataset.lead}`, b.dataset.on === "1" ? true : null);
          draw();
        })
    );
  }
  (async function init() {
    await S.ready;
    t = await L360.Auth.requireTeacher(app);
    draw();
  })();
})();
