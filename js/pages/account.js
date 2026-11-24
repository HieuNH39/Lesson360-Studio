/* Tài khoản & quản trị: hồ sơ giáo viên; tổ trưởng và quản trị viên duyệt đăng kí, chọn môn phụ trách;
   quản trị viên (quyền cao nhất) phân quyền tổ trưởng/quản trị cho mọi người, thu hồi quyền. */
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

  const subjName = (arr) => (arr || []).map((x) => L360.Curr.subjectName(x)).join(", ");
  const chipsOf = (sel, attr = "sj") => `<div class="chips">${L360.Curr.subjects.map((x) => `<button type="button" class="chip ${sel.includes(x.id) ? "sel" : ""}" data-${attr}="${x.id}">${u.esc(x.name)}</button>`).join("")}</div>`;
  const bindChips = (root, sel, attr = "sj") =>
    u.$$(`[data-${attr}]`, root).forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset[attr];
          const i = sel.indexOf(id);
          i >= 0 ? sel.splice(i, 1) : sel.push(id);
          b.classList.toggle("sel", sel.includes(id));
        })
    );
  let D = { teachers: {}, leaders: {}, admins: {}, reqs: {} };
  const roleOf = (uid) => (D.admins[uid] ? "admin" : D.leaders[uid] ? "tt" : "gv");
  const ROLE = { admin: ["Quản trị", "brand"], tt: ["Tổ trưởng", "ok"], gv: ["Giáo viên", ""] };
  // Tổ trưởng chỉ duyệt, sửa, thu hồi tài khoản giáo viên; quản trị viên làm được với mọi người.
  const canManage = (uid) => t.isAdmin || (t.isLeader && roleOf(uid) === "gv");

  // Hộp thoại duyệt đăng kí / sửa tài khoản: tên tài khoản, họ tên, môn phụ trách, vai trò.
  function editor({ uid, rec, approve }) {
    const sel = (rec.subjects || []).slice();
    const role = approve ? "gv" : roleOf(uid);
    const m = u.modal(`<h2>${approve ? "Duyệt tài khoản" : "Sửa tài khoản"}</h2><p class="small muted">${u.esc(rec.email || "")}</p>
      <div class="grid g2"><label class="field">Tên tài khoản<input id="eAcc" type="text" value="${u.esc(rec.acc || L360.Auth.accName(rec.email, rec.name))}"></label><label class="field">Họ và tên đầy đủ<input id="eNm" type="text" value="${u.esc(rec.name || "")}"></label></div>
      <p style="margin:14px 0 6px;font-weight:650">Môn học phụ trách <span class="small muted" style="font-weight:400">(bắt buộc)</span></p>${chipsOf(sel, "es")}
      ${
        t.isAdmin && uid !== t.uid
          ? `<p style="margin:14px 0 6px;font-weight:650">Vai trò</p><div class="seg" id="eRole">${["gv", "tt", "admin"].map((r) => `<button type="button" data-r="${r}" class="${r === role ? "on" : ""}">${ROLE[r][0]}</button>`).join("")}</div>
             <p class="tiny muted" style="margin-top:6px">Tổ trưởng: duyệt tài khoản giáo viên, xem tiến độ và dữ liệu của tổ. Quản trị: quyền cao nhất, phân quyền cho mọi người.</p>`
          : ""
      }
      <div class="row" style="justify-content:flex-end;margin-top:18px;gap:8px"><button class="btn" data-close>Huỷ</button><button class="btn primary" id="eOk">${approve ? "Duyệt – cho phép sử dụng" : "Lưu"}</button></div>`);
    bindChips(m.el, sel, "es");
    let r2 = role;
    u.$$("#eRole [data-r]", m.el).forEach((b) => (b.onclick = () => ((r2 = b.dataset.r), u.$$("#eRole [data-r]", m.el).forEach((x) => x.classList.toggle("on", x === b)))));
    u.$("#eOk", m.el).onclick = async () => {
      const acc = u.$("#eAcc", m.el).value.trim();
      const name = u.$("#eNm", m.el).value.trim();
      if (!acc || !name) return u.toast("Nhập tên tài khoản và họ tên.", "bad");
      if (!sel.length) return u.toast("Chọn ít nhất một môn phụ trách.", "bad");
      const btn = u.$("#eOk", m.el);
      btn.disabled = true;
      try {
        if (approve) await S.set(`teachers/${uid}`, { acc, name, email: rec.email || "", subjects: sel, avatar: rec.avatar || null, t: S.TS, approvedBy: t.uid, approvedAt: Date.now() });
        else await S.update(`teachers/${uid}`, { acc, name, subjects: sel });
        if (t.isAdmin && uid !== t.uid && r2 !== role) {
          await S.set(`admins/${uid}`, r2 === "admin" ? true : null);
          await S.set(`leaders/${uid}`, r2 === "tt" ? true : null);
        }
        // Xoá yêu cầu sau cùng: máy giáo viên tự vào ứng dụng ngay khi yêu cầu được xoá.
        if (approve) await S.set(`requests/${uid}`, null);
        if (uid === t.uid) Object.assign(t, { acc, name, subjects: sel });
        m.close();
        u.toast(approve ? `Đã duyệt ${acc}. Thầy cô ấy dùng được ngay.` : "Đã lưu.", "ok", 4000);
        draw();
      } catch (e) {
        btn.disabled = false;
        u.toast("Chưa lưu được: " + ((e && (e.code || e.message)) || e), "bad", 5000);
      }
    };
  }

  async function draw() {
    const sel = (t.subjects || []).slice();
    const mng = t.isLeader && !L360.isLocal;
    if (mng) {
      const [teachers, leaders, admins, reqs] = await Promise.all(["teachers", "leaders", "admins", "requests"].map((k) => S.get(k).catch(() => null)));
      D = { teachers: teachers || {}, leaders: leaders || {}, admins: admins || {}, reqs: reqs || {} };
    }
    const pending = u.entries(D.reqs).filter(([, r]) => r && r.status !== "rejected").sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
    const list = u.entries(D.teachers).sort((a, b) => ["admin", "tt", "gv"].indexOf(roleOf(a[0])) - ["admin", "tt", "gv"].indexOf(roleOf(b[0])) || String(a[1].acc || a[1].name).localeCompare(String(b[1].acc || b[1].name), "vi"));
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(t)}`, { sub: "Tài khoản & quản trị" }) +
      `<main class="wrap" style="max-width:1040px"><h1>Tài khoản</h1>
      <section class="card"><h2>Hồ sơ</h2>
      <div class="row" style="gap:16px;margin-bottom:14px;align-items:center"><div id="avtBox">${L360.shell.avatar(t, 84)}</div><div class="col" style="gap:8px"><div class="row" style="gap:6px"><label class="btn sm">${L360.icon("upload")} Tải ảnh đại diện<input type="file" id="avtFile" accept="image/*" hidden></label>${t.avatar ? `<button class="btn sm ghost" id="avtDel">Bỏ ảnh</button>` : ""}</div>
        <div class="avt-presets">${AVT.map((a) => `<button class="avt-p" data-avt="${u.esc(a)}" title="Chọn">${L360.shell.avatar({ avatar: a }, 34)}</button>`).join("")}</div></div></div>
      <div class="grid g3"><label class="field">Tên tài khoản<input id="acc" type="text" value="${u.esc(t.acc || "")}" ${t.isAdmin ? "" : "disabled"}>${t.isAdmin ? "" : `<span class="hint">Theo email công ty.</span>`}</label><label class="field">Họ và tên đầy đủ<input id="nm" type="text" value="${u.esc(t.name || "")}"></label><label class="field">Email<input type="text" value="${u.esc(t.email || "(Diễn tập)")}" disabled></label></div>
      <p style="margin:14px 0 6px;font-weight:650">Môn dạy</p>${chipsOf(sel)}
      <p class="small muted" style="margin-top:10px">Vai trò: <b>${t.isAdmin ? "Quản trị viên (quyền cao nhất)" : t.isLeader ? "Tổ trưởng" : "Giáo viên"}</b></p>
      <button class="btn primary" id="save" style="margin-top:8px">Lưu hồ sơ</button></section>
      ${
        !L360.isLocal && S.auth.providers && L360.Auth.isOrg(t.email)
          ? `<section class="card" style="margin-top:18px"><h2>Đăng nhập</h2>${
              S.auth.providers().includes("google.com")
                ? `<p class="muted">${L360.icon("check")} Tài khoản đã liên kết Google – đăng nhập bằng nút “Đăng nhập bằng Google”.</p>`
                : `<p class="muted">Liên kết tài khoản Google @${u.esc(L360.Auth.domain)} để lần sau đăng nhập một chạm, không cần mật khẩu.</p><button class="btn" id="linkG">Liên kết Google</button>`
            }</section>`
          : ""
      }
      ${
        mng
          ? `<section class="card ${pending.length ? "acc-req" : ""}" style="margin-top:18px" id="reqs"><h2>Đăng kí chờ duyệt (${pending.length})</h2>${
              pending.length
                ? `<div class="tbl-wrap"><table class="t"><tr><th>Tài khoản</th><th>Họ tên</th><th>Môn đăng kí</th><th>Gửi lúc</th><th></th></tr>${pending
                    .map(
                      ([uid, r]) => `<tr><td><b>${u.esc(r.acc || L360.Auth.accName(r.email, r.name))}</b><div class="tiny muted">${u.esc(r.email || "")}</div></td><td>${u.esc(r.name || "")}</td><td class="small">${u.esc(subjName(r.subjects))}</td><td class="small nowrap">${r.at ? u.fmtDateTime(r.at) : ""}</td>
                      <td class="right nowrap"><button class="btn sm primary" data-ok="${uid}">Duyệt…</button> <button class="btn sm ghost" data-no="${uid}">Từ chối</button></td></tr>`
                    )
                    .join("")}</table></div>`
                : `<p class="muted">Không có đăng kí mới. Giáo viên mở ứng dụng, đăng nhập bằng email @${u.esc(L360.Auth.domain)} rồi bấm “Gửi đăng kí” – yêu cầu sẽ hiện ở đây.</p>`
            }<p class="tiny muted" style="margin:10px 0 0">Khi duyệt, chọn môn học phụ trách của giáo viên.${t.isAdmin ? " Quản trị viên chọn được cả vai trò (giáo viên, tổ trưởng, quản trị)." : " Tổ trưởng duyệt được tài khoản giáo viên; phân quyền tổ trưởng, quản trị do quản trị viên thực hiện."}</p></section>
            <section class="card" style="margin-top:18px"><h2>Tài khoản được cấp quyền (${list.length})</h2><div class="tbl-wrap"><table class="t"><tr><th>Tài khoản</th><th>Họ tên</th><th>Môn phụ trách</th><th>Vai trò</th><th></th></tr>${list
              .map(([uid, x]) => {
                const r = roleOf(uid);
                const off = !D.admins[uid] && !L360.Auth.isOrg(x.email);
                return `<tr><td><div class="row nowrap" style="gap:8px">${L360.shell.avatar(x, 30)}<div><b>${u.esc(x.acc || L360.Auth.accName(x.email, x.name))}</b><div class="tiny muted">${u.esc(x.email || "")}</div></div></div></td><td>${u.esc(x.name || "")}</td><td class="small">${u.esc(subjName(x.subjects)) || `<span class="pill warn">Chưa chọn</span>`}</td>
                <td><span class="pill ${ROLE[r][1]}">${ROLE[r][0]}</span>${off ? ` <span class="pill bad" title="Email ngoài công ty – không đăng nhập được">Email ngoài</span>` : ""}</td>
                <td class="right nowrap">${uid === t.uid ? `<span class="tiny muted">Tài khoản của thầy cô</span>` : canManage(uid) ? `<button class="btn sm" data-ed="${uid}">Sửa${t.isAdmin ? " · phân quyền" : ""}</button> <button class="btn sm ghost" data-rv="${uid}">Thu hồi</button>` : ""}</td></tr>`;
              })
              .join("")}</table></div><p class="small muted">Thu hồi: tài khoản không dùng được ứng dụng nữa (bài đã soạn vẫn giữ trong thư viện). Muốn dùng lại, giáo viên gửi đăng kí mới.</p></section>`
          : ""
      }</main>` +
      L360.shell.footer();
    L360.shell.bindUserMenu(t);
    bindChips(app, sel);
    u.$("#save").onclick = async () => {
      const name = u.$("#nm").value.trim();
      const acc = u.$("#acc").value.trim() || t.acc;
      if (!name) return u.toast("Nhập họ tên.", "bad");
      try {
        if (L360.isLocal) {
          localStorage.setItem("l360:tname", name);
          localStorage.setItem("l360:tsubjects", JSON.stringify(sel));
        } else await S.update(`teachers/${t.uid}`, Object.assign({ name, subjects: sel }, t.isAdmin ? { acc } : {}));
        Object.assign(t, { name, subjects: sel }, t.isAdmin ? { acc } : {});
        u.toast("Đã lưu hồ sơ.", "ok");
        draw();
      } catch (e) {
        u.toast("Chưa lưu được: " + ((e && (e.code || e.message)) || e), "bad", 5000);
      }
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
    u.$$("[data-ok]").forEach((b) => (b.onclick = () => editor({ uid: b.dataset.ok, rec: D.reqs[b.dataset.ok] || {}, approve: true })));
    u.$$("[data-ed]").forEach((b) => (b.onclick = () => editor({ uid: b.dataset.ed, rec: D.teachers[b.dataset.ed] || {}, approve: false })));
    u.$$("[data-no]").forEach(
      (b) =>
        (b.onclick = async () => {
          const uid = b.dataset.no;
          const note = prompt("Lí do từ chối (giáo viên sẽ thấy, có thể để trống):", "");
          if (note === null) return;
          await S.update(`requests/${uid}`, { status: "rejected", note: note.trim().slice(0, 200), by: t.uid, at2: Date.now() }).catch((e) => u.toast(String(e.message || e), "bad"));
          draw();
        })
    );
    u.$$("[data-rv]").forEach(
      (b) =>
        (b.onclick = async () => {
          const uid = b.dataset.rv;
          const x = D.teachers[uid] || {};
          if (!confirm(`Thu hồi quyền sử dụng của ${x.acc || x.name || "tài khoản này"}? Tài khoản sẽ không vào được ứng dụng nữa.`)) return;
          try {
            if (t.isAdmin) {
              await S.set(`admins/${uid}`, null);
              await S.set(`leaders/${uid}`, null);
            }
            await S.set(`teachers/${uid}`, null);
            u.toast("Đã thu hồi quyền.", "ok");
          } catch (e) {
            u.toast("Chưa thu hồi được: " + ((e && (e.code || e.message)) || e), "bad", 5000);
          }
          draw();
        })
    );
  }
  (async function init() {
    await S.ready;
    t = await L360.Auth.requireTeacher(app);
    draw();
    if (location.hash === "#reqs") setTimeout(() => u.$("#reqs") && u.$("#reqs").scrollIntoView({ behavior: "smooth" }), 400);
  })();
})();
