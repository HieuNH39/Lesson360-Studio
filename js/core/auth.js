/* Tài khoản giáo viên (học sinh không cần tài khoản).
   - Trực tuyến: giáo viên đăng nhập bằng email công ty @fpt.edu.vn (Google hoặc email + mật khẩu đã xác minh).
     Email khác không dùng được – riêng quản trị viên được đăng nhập bằng email riêng.
     Lần đầu đăng nhập: gửi đăng kí (họ tên, môn dạy) → quản trị viên hoặc tổ trưởng duyệt, chọn môn phụ trách.
     Tên tài khoản lấy theo email công ty (HieuNH39@fpt.edu.vn → HieuNH39). Tài khoản đầu tiên tự là quản trị.
     Vai trò: giáo viên · tổ trưởng (duyệt giáo viên, xem dữ liệu cả tổ) · quản trị (quyền cao nhất, phân quyền cho mọi người).
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

  const DOMAIN = String((L360.cfg && L360.cfg.emailDomain) || "fpt.edu.vn").toLowerCase();
  const isOrg = (email) => String(email || "").toLowerCase().endsWith("@" + DOMAIN);
  const plain = (x) =>
    String(x || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .toLowerCase();
  // Tên tài khoản theo quy ước email FPT: Tên + chữ cái đầu họ, đệm + số (hieunh39 + "Nguyễn Hữu Hiệu" → HieuNH39).
  function accName(email, name) {
    const local = String(email || "").split("@")[0];
    const words = plain(name).trim().split(/\s+/).filter(Boolean);
    const given = words.slice(-1)[0] || "";
    const cap = (x) => x.charAt(0).toUpperCase() + x.slice(1);
    // Email riêng (quản trị viên): Tên + chữ cái đầu họ, đệm (Nguyễn Hữu Hiệu → HieuNH); sửa được trong Tài khoản.
    if (!isOrg(email)) return given ? cap(given) + words.slice(0, -1).map((x) => x.charAt(0).toUpperCase()).join("") : cap(local);
    if (!local) return "";
    if (/[A-Z]/.test(local)) return local;
    const lo = local.toLowerCase();
    const rest = local.slice(given.length);
    if (given && lo.startsWith(given) && /^[a-z]+\d*$/.test(rest)) return cap(given) + rest.replace(/[a-z]+/g, (m) => m.toUpperCase());
    return cap(local);
  }

  async function loadRecord(user) {
    const rec = await S.get(`teachers/${user.uid}`).catch(() => null);
    if (!rec) return null;
    const [adm, lead] = await Promise.all([S.get(`admins/${user.uid}`).catch(() => null), S.get(`leaders/${user.uid}`).catch(() => null)]);
    const isAdmin = adm === true;
    const isLeader = lead === true || isAdmin;
    return Object.assign({ uid: user.uid, email: user.email }, rec, {
      acc: rec.acc || accName(rec.email || user.email, rec.name),
      subjects: rec.subjects || [],
      isAdmin,
      isLeader,
      role: isAdmin ? "admin" : isLeader ? "tt" : "gv"
    });
  }

  const card = (inner) => `<div class="wrap" style="max-width:600px"><div class="card" style="padding:28px"><div class="center" style="margin-bottom:10px"><img src="assets/img/logo-l360.svg" alt="" style="height:56px"></div>${inner}</div></div>`;
  // Email ngoài công ty: không dùng được.
  function blocked(container, user) {
    return new Promise(() => {
      container.innerHTML = card(`<h1 style="font-size:1.4rem;text-align:center">Chưa dùng được với email này</h1>
        <p class="center">Lesson 360° chỉ dành cho giáo viên đăng nhập bằng <b>email công ty @${u.esc(DOMAIN)}</b>.</p>
        <p class="center small muted">Thầy cô đang đăng nhập bằng <b>${u.esc(user.email || "tài khoản không có email")}</b>. Bấm nút dưới đây rồi đăng nhập lại bằng email công ty (VD: HieuNH39@${u.esc(DOMAIN)}).</p>
        <div class="row" style="justify-content:center;margin-top:16px"><button class="btn primary" id="back">Đăng nhập bằng email công ty</button></div>`);
      u.$("#back", container).onclick = () => L360.Auth.signOut();
    });
  }
  // Tài khoản email + mật khẩu: xác minh email trước khi gửi đăng kí (Google đã xác minh sẵn).
  function verifyEmail(container, user) {
    return new Promise((resolve) => {
      let sent = false;
      const draw = (m) => {
        container.innerHTML = card(`<h1 style="font-size:1.4rem;text-align:center">Xác minh email công ty</h1>
          <p class="center">Lesson 360° đã gửi thư xác minh tới <b>${u.esc(user.email || "")}</b>. Thầy cô mở hộp thư, bấm đường link trong thư, rồi quay lại đây bấm <b>Tôi đã xác minh</b>.</p>
          <p class="center small muted">Không thấy thư? Kiểm tra mục Thư rác (Spam) hoặc bấm Gửi lại.</p>
          ${m ? `<p class="center"><span class="pill bad" style="white-space:normal">${u.esc(m)}</span></p>` : ""}
          <div class="row" style="justify-content:center;gap:8px;margin-top:16px"><button class="btn primary" id="ok">Tôi đã xác minh</button><button class="btn" id="re">Gửi lại thư</button><button class="btn ghost" id="back">Đổi tài khoản</button></div>`);
        u.$("#back", container).onclick = () => L360.Auth.signOut();
        u.$("#re", container).onclick = async () => {
          await S.auth.sendVerify().catch(() => {});
          u.toast("Đã gửi lại thư xác minh.", "ok", 3000);
        };
        u.$("#ok", container).onclick = async () => {
          const usr = await S.auth.refresh().catch(() => null);
          if (usr && usr.verified) resolve(usr);
          else draw("Email chưa được xác minh – thầy cô bấm đường link trong thư trước nhé.");
        };
      };
      if (!sent) {
        sent = true;
        S.auth.sendVerify().catch(() => {});
      }
      draw();
    });
  }
  // Cửa vào: kiểm tra email công ty, xác minh, đăng kí – chờ duyệt.
  async function gate(container, user) {
    const rec = await loadRecord(user);
    const org = isOrg(user.email);
    if (rec) return rec.isAdmin || org ? rec : blocked(container, user);
    const admins = await S.get("admins").catch(() => "denied");
    if (admins !== null) {
      if (!org) return blocked(container, user);
      if (!user.verified) user = await verifyEmail(container, user);
    }
    return profileForm(container, user);
  }

  // Hồ sơ lần đầu → gửi yêu cầu cấp quyền; quản trị viên hoặc tổ trưởng duyệt là dùng được ngay.
  // Tài khoản đầu tiên của trường tự là quản trị.
  function profileForm(container, user, msg) {
    return new Promise(async (resolve) => {
      const sel = [];
      let unsub = null;
      const done = async () => {
        const rec = await loadRecord(user);
        if (rec) {
          if (unsub) unsub();
          resolve(rec);
          return true;
        }
        return false;
      };
      // Màn hình chờ duyệt: tự chuyển vào ứng dụng khi quản trị viên duyệt.
      const waiting = (req) => {
        const rejected = req && req.status === "rejected";
        container.innerHTML = `<div class="wrap" style="max-width:600px"><div class="card" style="padding:28px">
          <div class="center" style="margin-bottom:10px"><img src="assets/img/logo-l360.svg" alt="" style="height:56px"></div>
          <h1 style="font-size:1.45rem;text-align:center">${rejected ? "Yêu cầu chưa được duyệt" : "Đã gửi yêu cầu cấp quyền"}</h1>
          ${
            rejected
              ? `<p class="center">Yêu cầu của thầy cô chưa được duyệt${req.note ? `: <b>${u.esc(req.note)}</b>` : "."}</p><p class="center small muted">Thầy cô kiểm tra lại thông tin rồi gửi lại, hoặc liên hệ tổ trưởng, quản trị viên.</p>`
              : `<p class="center">Tài khoản <b>${u.esc((req && req.acc) || user.email || "")}</b> đang chờ quản trị viên hoặc tổ trưởng duyệt. Khi được duyệt, trang này tự mở vào ứng dụng – không cần đăng nhập lại.</p>
                 <div class="ga-wait"><span></span><span></span><span></span></div>
                 <p class="center small muted">Họ tên: <b>${u.esc((req && req.name) || "")}</b>${req && req.subjects ? ` · Môn: ${u.esc(req.subjects.map((x) => L360.Curr.subjectName(x)).join(", "))}` : ""}</p>`
          }
          <div class="row" style="margin-top:16px;justify-content:center;gap:8px">${rejected ? `<button class="btn primary" id="again">Sửa và gửi lại</button>` : `<button class="btn" id="chk">Kiểm tra lại</button>`}<button class="btn ghost" id="back">Đổi tài khoản</button></div></div></div>`;
        u.$("#back", container).onclick = () => L360.Auth.signOut();
        if (u.$("#again", container)) u.$("#again", container).onclick = () => draw("", req);
        if (u.$("#chk", container)) u.$("#chk", container).onclick = async () => (await done()) || u.toast("Chưa được duyệt – thầy cô chờ thêm một chút nhé.", "", 3000);
      };
      const listen = () => {
        if (unsub) return;
        // Theo dõi quyết định của quản trị viên.
        unsub = S.on(`requests/${user.uid}`, async (v) => {
          if (await done()) return;
          if (v) waiting(v);
        });
      };
      const draw = (m, pre) => {
        if (pre && pre.subjects) pre.subjects.forEach((x) => !sel.includes(x) && sel.push(x));
        container.innerHTML = `<div class="wrap" style="max-width:600px"><div class="card"><h1 style="font-size:1.5rem">Đăng kí sử dụng Lesson 360°</h1>
          <p class="muted">${u.esc(user.email || "")} – chỉ cần làm một lần. Sau khi gửi, quản trị viên hoặc tổ trưởng duyệt là thầy cô dùng được ngay.</p>
          ${m ? `<p class="pill bad" style="white-space:normal">${u.esc(m)}</p>` : ""}
          <label class="field">Tên tài khoản<input type="text" id="acc" value="${u.esc(accName(user.email, (pre && pre.name) || user.name))}" disabled><span class="hint">Lấy theo email công ty – hiện trên ứng dụng cùng môn dạy.</span></label>
          <label class="field" style="margin-top:10px">Họ và tên đầy đủ<input id="nm" type="text" value="${u.esc((pre && pre.name) || user.name || "")}" placeholder="VD: Nguyễn Văn A"><span class="hint">Dùng để ghi tên giáo viên trên giáo án, báo cáo.</span></label>
          <p style="margin:14px 0 6px;font-weight:650">Môn dạy <span class="small muted" style="font-weight:400">(người duyệt sẽ xác nhận môn phụ trách)</span></p>${subjectsPicker(sel)}
          <div class="row" style="margin-top:16px"><button class="btn" id="back">Đổi tài khoản</button><span class="spacer"></span><button class="btn primary lg" id="ok">Gửi đăng kí</button></div></div></div>`;
        u.$("#nm", container).oninput = (e) => (u.$("#acc", container).value = accName(user.email, e.target.value));
        bindSubjects(container, sel);
        u.$("#back", container).onclick = () => L360.Auth.signOut();
        u.$("#ok", container).onclick = async () => {
          const name = u.$("#nm", container).value.trim();
          if (!name) return draw("Nhập họ và tên.", { name });
          if (!sel.length) return draw("Chọn ít nhất một môn dạy.", { name });
          const base = { name, acc: accName(user.email, name), email: user.email || "", subjects: sel.slice(), t: S.TS };
          try {
            const admins = await S.get("admins").catch(() => "denied");
            if (admins === null) {
              // Tài khoản đầu tiên của trường.
              await S.set(`teachers/${user.uid}`, base);
              await S.set(`admins/${user.uid}`, true);
              return done();
            }
            const req = Object.assign({}, base, { status: "pending", at: Date.now() });
            await S.set(`requests/${user.uid}`, req);
            waiting(req);
            listen();
          } catch (e) {
            draw(/PERMISSION|permission/i.test(String(e && (e.code || e.message))) ? `Chưa gửi được: chỉ email công ty @${DOMAIN} đã xác minh mới đăng kí được. Nếu đúng email công ty, báo quản trị viên cập nhật luật bảo mật Firebase.` : String(e.message || e), base);
          }
        };
      };
      // Đã gửi yêu cầu trước đó → hiện màn hình chờ.
      const old = await S.get(`requests/${user.uid}`).catch(() => null);
      if (old && !msg) {
        waiting(old);
        listen();
      } else draw(msg, old);
    });
  }

  L360.Auth = {
    isOrg,
    accName,
    domain: DOMAIN,
    teacher: null,
    async current() {
      await S.ready;
      if (L360.isLocal) return L360.Auth.localTeacher();
      const user = S.auth.user;
      if (!user || user.anonymous) return null;
      const rec = await loadRecord(user);
      if (rec && !rec.isAdmin && !isOrg(user.email)) return null;
      return (L360.Auth.teacher = rec);
    },
    localTeacher() {
      const name = localStorage.getItem("l360:tname");
      if (!name) return null;
      let subjects = [];
      try {
        subjects = JSON.parse(localStorage.getItem("l360:tsubjects") || "[]");
      } catch (e) {}
      let avatar = "";
      try {
        avatar = localStorage.getItem("l360:tavatar") || "";
      } catch (e) {}
      return (L360.Auth.teacher = { uid: "local-teacher", email: "", name, acc: accName("giaovien@x", name) || "GiaoVien", subjects, avatar, role: "admin", isAdmin: true, isLeader: true });
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
      if (user && !user.anonymous) return (L360.Auth.teacher = await gate(container, user));
      return new Promise((resolve) => {
        const after = async (usr) => resolve((L360.Auth.teacher = await gate(container, usr)));
        const draw = (mode, msg) => {
          container.innerHTML = `<div class="wrap" style="max-width:520px"><div class="card" style="padding:26px">
            <div class="center" style="margin-bottom:10px"><img src="assets/img/logo-l360.svg" alt="" style="height:56px"></div>
            <h1 style="font-size:1.5rem;text-align:center">${u.esc(title)}</h1><p class="muted center">Giáo viên đăng nhập bằng <b>email công ty @${u.esc(DOMAIN)}</b>. Học sinh không cần tài khoản – chỉ cần mã phòng.</p>
            ${msg ? `<p class="pill bad" style="white-space:normal">${u.esc(msg)}</p>` : ""}
            <button class="btn lg block" id="gg" style="margin:10px 0 6px"><svg width="20" height="20" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>Đăng nhập bằng Google · @${u.esc(DOMAIN)}</button>
            <div class="row" style="margin:12px 0"><hr class="grow" style="margin:0"><span class="small muted">hoặc bằng email</span><hr class="grow" style="margin:0"></div>
            <div class="seg" style="margin-bottom:12px"><button class="${mode === "in" ? "on" : ""}" data-m="in">Đăng nhập</button><button class="${mode === "up" ? "on" : ""}" data-m="up">Tạo tài khoản</button></div>
            <label class="field">Email<input id="em" type="email" autocomplete="username" placeholder="VD: HieuNH39@${u.esc(DOMAIN)}"></label>
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
                if (!isOrg(em)) return draw(mode, `Tạo tài khoản bằng email công ty @${DOMAIN} (VD: HieuNH39@${DOMAIN}).`);
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
