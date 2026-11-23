/* Tài khoản & quản trị: hồ sơ giáo viên; quản trị/tổ trưởng đặt mã mời, phân quyền tổ trưởng. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const S = L360.store;
  const app = u.$("#app");
  let t = null;
  const AVT = ["📚|#2F6FDB", "🏛|#8A5A2B", "🌏|#0C9A9A", "✍️|#E8930C", "⚖️|#1B6CA8", "🧭|#1E8E5A", "🎓|#0F2742", "🌸|#D2453B"];
  // Thu nhỏ ảnh tải lên thành 160×160 (JPEG) để lưu nhẹ cùng hồ sơ.
  const shrink = (file) =>
    new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const im = new Image();
        im.onload = () => {
          const c = document.createElement("canvas");
          c.width = c.height = 160;
          const k = Math.min(im.width, im.height);
          c.getContext("2d").drawImage(im, (im.width - k) / 2, (im.height - k) / 2, k, k, 0, 0, 160, 160);
          res(c.toDataURL("image/jpeg", 0.82));
        };
        im.onerror = rej;
        im.src = fr.result;
      };
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  async function setAvatar(a) {
    if (L360.isLocal) a ? localStorage.setItem("l360:tavatar", a) : localStorage.removeItem("l360:tavatar");
    else await S.update(`teachers/${t.uid}`, { avatar: a || null });
    t.avatar = a || "";
    draw();
    u.toast(a ? "Đã đổi ảnh đại diện." : "Đã bỏ ảnh đại diện.", "ok");
  }

  async function draw() {
    const sel = (t.subjects || []).slice();
    const teachers = t.isLeader && !L360.isLocal ? (await S.get("teachers").catch(() => null)) || {} : {};
    const leaders = t.isLeader && !L360.isLocal ? (await S.get("leaders").catch(() => null)) || {} : {};
    const admins = t.isLeader && !L360.isLocal ? (await S.get("admins").catch(() => null)) || {} : {};
    const invite = t.isLeader && !L360.isLocal ? await S.get("secret/invite").catch(() => "") : "";
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(t)}`, { sub: "Tài khoản & quản trị" }) +
      `<main class="wrap" style="max-width:980px"><h1>Tài khoản</h1>
      <section class="card"><h2>Hồ sơ</h2>
      <div class="row" style="gap:16px;margin-bottom:14px;align-items:center"><div id="avtBox">${L360.shell.avatar(t, 84)}</div><div class="col" style="gap:8px"><div class="row" style="gap:6px"><label class="btn sm">${L360.icon("upload")} Tải ảnh đại diện<input type="file" id="avtFile" accept="image/*" hidden></label>${t.avatar ? `<button class="btn sm ghost" id="avtDel">Bỏ ảnh</button>` : ""}</div>
        <div class="avt-presets">${AVT.map((a) => `<button class="avt-p" data-avt="${u.esc(a)}" title="Chọn">${L360.shell.avatar({ avatar: a }, 34)}</button>`).join("")}</div></div></div>
      <div class="grid g2"><label class="field">Họ và tên<input id="nm" type="text" value="${u.esc(t.name || "")}"></label><label class="field">Email<input type="text" value="${u.esc(t.email || "(Diễn tập)")}" disabled></label></div>
      <p style="margin:14px 0 6px;font-weight:650">Môn dạy</p><div class="chips">${L360.Curr.subjects.map((s) => `<button class="chip ${sel.includes(s.id) ? "sel" : ""}" data-sj="${s.id}">${u.esc(s.name)}</button>`).join("")}</div>
      <p class="small muted" style="margin-top:10px">Vai trò: <b>${t.isAdmin ? "Quản trị viên (cao nhất)" : t.isLeader ? "Tổ trưởng" : "Giáo viên"}</b></p>
      <button class="btn primary" id="save" style="margin-top:8px">Lưu hồ sơ</button></section>
      ${
        !L360.isLocal && S.auth.providers
          ? `<section class="card" style="margin-top:18px"><h2>Đăng nhập</h2>${
              S.auth.providers().includes("google.com")
                ? `<p class="muted">${L360.icon("check")} Tài khoản đã liên kết Google – đăng nhập bằng nút “Đăng nhập bằng Google”.</p>`
                : `<p class="muted">Liên kết tài khoản Google (khuyên dùng tài khoản @fpt.edu.vn) để lần sau đăng nhập một chạm, không cần mật khẩu.</p><button class="btn" id="linkG">Liên kết Google</button>`
            }</section>`
          : ""
      }
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
                <td class="right nowrap">${
                  t.isAdmin && uid !== t.uid
                    ? `${!admins[uid] ? `<button class="btn sm" data-lead="${uid}" data-on="${leaders[uid] ? 0 : 1}">${leaders[uid] ? "Bỏ tổ trưởng" : "Đặt tổ trưởng"}</button>` : ""}<button class="btn sm ${admins[uid] ? "ghost" : ""}" data-adm="${uid}" data-on="${admins[uid] ? 0 : 1}">${admins[uid] ? "Bỏ quản trị" : "Cấp quyền quản trị"}</button>`
                    : uid === t.uid ? `<span class="tiny muted">Tài khoản của thầy cô</span>` : ""
                }</td></tr>`
              )
              .join("")}</table><p class="small muted">Quản trị viên là quyền cao nhất: cấp/bỏ quyền quản trị và tổ trưởng cho bất kì ai, cập nhật Syllabus, Phụ lục 1, lịch nghỉ. Tổ trưởng xem dữ liệu, tiến độ của cả tổ và ghi phiếu nhận xét tiết dạy.</p></section>`
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
    const af = u.$("#avtFile");
    if (af)
      af.onchange = async () => {
        if (!af.files[0]) return;
        try {
          await setAvatar(await shrink(af.files[0]));
        } catch (e) {
          u.toast("Không đọc được ảnh.", "bad");
        }
      };
    if (u.$("#avtDel")) u.$("#avtDel").onclick = () => setAvatar("");
    u.$$("[data-avt]").forEach((b) => (b.onclick = () => setAvatar(b.dataset.avt)));
    if (u.$("#linkG"))
      u.$("#linkG").onclick = async () => {
        try {
          await S.auth.linkGoogle();
          u.toast("Đã liên kết Google.", "ok");
          draw();
        } catch (e) {
          u.toast(/credential-already-in-use|already/.test(String(e && e.code)) ? "Tài khoản Google này đã gắn với một tài khoản khác." : "Chưa liên kết được: " + ((e && (e.code || e.message)) || e), "bad", 5000);
        }
      };
    u.$$("[data-adm]").forEach(
      (b) =>
        (b.onclick = async () => {
          const on = b.dataset.on === "1";
          if (!on && !confirm("Bỏ quyền quản trị của giáo viên này?")) return;
          await S.set(`admins/${b.dataset.adm}`, on ? true : null);
          u.toast(on ? "Đã cấp quyền quản trị." : "Đã bỏ quyền quản trị.", "ok");
          draw();
        })
    );
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
