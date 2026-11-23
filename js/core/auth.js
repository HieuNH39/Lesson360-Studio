/* Tài khoản giáo viên (học sinh không cần tài khoản).
   - Trực tuyến: Google (khuyên dùng với tài khoản @fpt.edu.vn) hoặc email + mật khẩu.
     Lần đầu đăng nhập: hoàn tất hồ sơ (họ tên, môn dạy, mã mời của tổ). Tài khoản đầu tiên tự là quản trị.
     Vai trò: giáo viên · tổ trưởng (xem dữ liệu cả tổ, nhận xét tiết dạy) · quản trị (đặt mã mời, phân quyền).
   - Diễn tập: không cần đăng nhập, chỉ hỏi tên để ghi vào minh chứng. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const S = L360.store;

  const subjectsPicker = (sel = []) =>
    `<div class="chips" id="sjs">${L360.Curr.subjects
      .map((s) => `<button type="button" class="chip ${sel.includes(s.id) ? "sel" : ""}" data-sj="${s.id}">${u.esc(s.name)}</button>`)
      .join("")}</div>`;
  const bindSubjects = (root, sel) =>
    u.$$("[data-sj]", root).forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.sj;
          const i = sel.indexOf(id);
          i >= 0 ? sel.splice(i, 1) : sel.push(id);
          b.classList.toggle("sel", sel.includes(id));
        })
    );

  async function loadRecord(user) {
    const rec = await S.get(`teachers/${user.uid}`).catch(() => null);
    if (!rec) return null;
    const [adm, lead] = await Promise.all([S.get(`admins/${user.uid}`).catch(() => null), S.get(`leaders/${user.uid}`).catch(() => null)]);
    const isAdmin = adm === true;
    const isLeader = lead === true || isAdmin;
    return Object.assign({ uid: user.uid, email: user.email }, rec, { subjects: rec.subjects || [], isAdmin, isLeader, role: isAdmin ? "admin" : isLeader ? "tt" : "gv" });
  }

  // Hồ sơ lần đầu.
  function profileForm(container, user, msg) {
    return new Promise((resolve) => {
      const sel = [];
      const draw = (m) => {
        container.innerHTML = `<div class="wrap" style="max-width:600px"><div class="card"><h1 style="font-size:1.5rem">Hoàn tất hồ sơ giáo viên</h1>
          <p class="muted">${u.esc(user.email || "")} – chỉ cần làm một lần. Hồ sơ giúp cá nhân hoá thư viện, dữ liệu tiết dạy và ghi tên thầy/cô trên bài chia sẻ.</p>
          ${m ? `<p class="pill bad" style="white-space:normal">${u.esc(m)}</p>` : ""}
          <label class="field">Họ và tên<input id="nm" type="text" value="${u.esc(user.name || "")}" placeholder="VD: Nguyễn Hữu Hiệu"></label>
          <p style="margin:14px 0 6px;font-weight:650">Môn dạy</p>${subjectsPicker(sel)}
          <label class="field" style="margin-top:14px">Mã mời của tổ<span class="hint">Do tổ trưởng / quản trị cung cấp. Tài khoản đầu tiên của trường không cần.</span><input id="iv" type="text" autocomplete="off"></label>
          <div class="row" style="margin-top:16px"><button class="btn" id="back">Đổi tài khoản</button><span class="spacer"></span><button class="btn primary lg" id="ok">Lưu và tiếp tục</button></div></div></div>`;
        bindSubjects(container, sel);
        u.$("#back", container).onclick = () => L360.Auth.signOut();
        u.$("#ok", container).onclick = async () => {
          const name = u.$("#nm", container).value.trim();
          if (!name) return draw("Nhập họ tên.");
          if (!sel.length) return draw("Chọn ít nhất một môn dạy.");
          const invite = u.$("#iv", container).value.trim();
          try {
            const admins = await S.get("admins").catch(() => null);
            const base = { name, email: user.email || "", subjects: sel, t: S.TS };
            if (!admins) {
              await S.set(`teachers/${user.uid}`, Object.assign(base, { invite: "" }));
              await S.set(`admins/${user.uid}`, true);
            } else await S.set(`teachers/${user.uid}`, Object.assign(base, { invite }));
            resolve(await loadRecord(user));
          } catch (e) {
            draw(/PERMISSION|permission/i.test(String(e && (e.code || e.message))) ? "Mã mời không đúng – hỏi tổ trưởng mã mời mới." : String(e.message || e));
          }
        };
      };
      draw(msg);
    });
  }

  L360.Auth = {
    teacher: null,
    async current() {
      await S.ready;
      if (L360.isLocal) return L360.Auth.localTeacher();
      const user = S.auth.user;
      if (!user || user.anonymous) return null;
      return (L360.Auth.teacher = await loadRecord(user));
    },
    localTeacher() {
      const name = localStorage.getItem("l360:tname");
      if (!name) return null;
      let subjects = [];
      try {
        subjects = JSON.parse(localStorage.getItem("l360:tsubjects") || "[]");
      } catch (e) {}
      return (L360.Auth.teacher = { uid: "local-teacher", email: "", name, subjects, role: "admin", isAdmin: true, isLeader: true });
    },
    async requireTeacher(container, { title = "Đăng nhập giáo viên" } = {}) {
      await S.ready;
      if (L360.isLocal) {
        if (!localStorage.getItem("l360:tname")) {
          await new Promise((res) => {
            const sel = [];
            container.innerHTML = `<div class="wrap" style="max-width:600px"><div class="card"><h1 style="font-size:1.5rem">Chế độ Diễn tập</h1>
              <p class="muted">Chạy trên một máy, không cần mạng: mở trang học sinh và màn chiếu ở các tab khác để thử. Dữ liệu lưu trong trình duyệt này.</p>
              <label class="field">Họ tên giáo viên<input id="tn" type="text" value="${u.esc(L360.cfg.author || "")}"></label>
              <p style="margin:14px 0 6px;font-weight:650">Môn dạy</p>${subjectsPicker(sel)}
              <button class="btn primary lg block" style="margin-top:16px" id="ok">Bắt đầu</button></div></div>`;
            bindSubjects(container, sel);
            u.$("#ok", container).onclick = () => {
              localStorage.setItem("l360:tname", u.$("#tn", container).value.trim() || "Giáo viên");
              localStorage.setItem("l360:tsubjects", JSON.stringify(sel));
              res();
            };
          });
        }
        await S.auth.signInTeacher();
        return L360.Auth.localTeacher();
      }
      const user = S.auth.user;
      if (user && !user.anonymous) {
        const rec = await loadRecord(user);
        if (rec) return (L360.Auth.teacher = rec);
        return (L360.Auth.teacher = await profileForm(container, user));
      }
      return new Promise((resolve) => {
        const after = async (usr) => {
          const rec = await loadRecord(usr);
          resolve((L360.Auth.teacher = rec || (await profileForm(container, usr))));
        };
        const draw = (mode, msg) => {
          container.innerHTML = `<div class="wrap" style="max-width:520px"><div class="card" style="padding:26px">
            <div class="center" style="margin-bottom:10px"><img src="assets/img/logo-l360.svg" alt="" style="height:56px"></div>
            <h1 style="font-size:1.5rem;text-align:center">${u.esc(title)}</h1><p class="muted center">Học sinh không cần tài khoản – chỉ cần mã phòng.</p>
            ${msg ? `<p class="pill bad" style="white-space:normal">${u.esc(msg)}</p>` : ""}
            <button class="btn lg block" id="gg" style="margin:10px 0 6px"><svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Đăng nhập bằng Google (khuyên dùng)</button>
            <div class="row" style="margin:12px 0"><hr class="grow" style="margin:0"><span class="small muted">hoặc bằng email</span><hr class="grow" style="margin:0"></div>
            <div class="seg" style="margin-bottom:12px"><button class="${mode === "in" ? "on" : ""}" data-m="in">Đăng nhập</button><button class="${mode === "up" ? "on" : ""}" data-m="up">Tạo tài khoản</button></div>
            <label class="field">Email<input id="em" type="email" autocomplete="username"></label>
            <label class="field" style="margin-top:10px">Mật khẩu<input id="pw" type="password" autocomplete="${mode === "in" ? "current-password" : "new-password"}"></label>
            <button class="btn primary lg block" style="margin-top:16px" id="go">${mode === "in" ? "Đăng nhập" : "Tạo tài khoản"}</button>
            ${mode === "in" ? `<p class="center small" style="margin-top:10px"><a href="#" id="fg">Quên mật khẩu?</a></p>` : ""}</div></div>`;
          u.$$("[data-m]", container).forEach((b) => (b.onclick = () => draw(b.dataset.m)));
          u.$("#gg", container).onclick = async () => {
            try {
              await after(await S.auth.signInGoogle());
            } catch (e) {
              draw(mode, /popup-closed/.test(String(e && e.code)) ? "Đã đóng cửa sổ đăng nhập." : /unauthorized-domain/.test(String(e && e.code)) ? "Tên miền chưa được phép đăng nhập Google." : String((e && (e.code || e.message)) || e));
            }
          };
          if (u.$("#fg", container))
            u.$("#fg", container).onclick = async (ev) => {
              ev.preventDefault();
              const em = u.$("#em", container).value.trim();
              if (!em) return draw(mode, "Nhập email trước rồi bấm Quên mật khẩu.");
              await S.auth.resetPassword(em).catch(() => {});
              u.toast("Đã gửi thư đặt lại mật khẩu (nếu email có tài khoản).", "ok", 4000);
            };
          u.$("#go", container).onclick = async () => {
            const em = u.$("#em", container).value.trim();
            const pw = u.$("#pw", container).value;
            try {
              let usr;
              if (mode === "in") usr = await S.auth.signInTeacher(em, pw);
              else {
                try {
                  usr = await S.auth.signUpTeacher(em, pw);
                } catch (e) {
                  if (/email-already/.test(String(e && e.code))) usr = await S.auth.signInTeacher(em, pw);
                  else throw e;
                }
              }
              await after(usr);
            } catch (e) {
              const m = String((e && (e.code || e.message)) || e);
              draw(
                mode,
                /wrong-password|invalid-credential|user-not-found|invalid-login/.test(m)
                  ? "Sai email hoặc mật khẩu."
                  : /email-already/.test(m)
                  ? "Email đã có tài khoản – chọn Đăng nhập."
                  : /weak-password/.test(m)
                  ? "Mật khẩu cần ít nhất 6 kí tự."
                  : /invalid-email/.test(m)
                  ? "Email không hợp lệ."
                  : m
              );
            }
          };
        };
        draw("in");
      });
    },
    async signOut() {
      await S.auth.signOut();
      if (L360.isLocal) localStorage.removeItem("l360:tname");
      location.reload();
    }
  };
})();
