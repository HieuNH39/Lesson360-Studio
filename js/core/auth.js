/* Đăng nhập giáo viên.
   - Trực tuyến: email + mật khẩu (Firebase). Tài khoản đầu tiên của trường tự nhận quyền quản trị;
     giáo viên sau đăng kí bằng "mã mời" do quản trị đặt (chống người ngoài vào bảng điều khiển).
   - Diễn tập: không cần đăng nhập, chỉ hỏi tên để ghi vào minh chứng. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const S = L360.store;

  async function ensureRecord(user, form) {
    let rec = await S.get(`teachers/${user.uid}`).catch(() => null);
    if (rec) return rec;
    if (!form) return null;
    const admins = await S.get("admins").catch(() => null);
    const base = { name: form.name || user.email, email: user.email, subject: form.subject || "", unit: form.unit || "", t: S.TS };
    if (!admins) {
      await S.set(`admins/${user.uid}`, true);
      rec = Object.assign(base, { role: "admin" });
    } else {
      rec = Object.assign(base, { role: "teacher", invite: String(form.invite || "").trim() });
    }
    await S.set(`teachers/${user.uid}`, rec);
    return rec;
  }

  L360.Auth = {
    teacher: null,
    async requireTeacher(container, { title = "Đăng nhập giáo viên" } = {}) {
      await S.ready;
      if (L360.isLocal) {
        let name = localStorage.getItem("l360:tname");
        if (!name) {
          name = await new Promise((res) => {
            container.innerHTML = `<div class="wrap" style="max-width:520px"><div class="card"><h1 style="font-size:1.5rem">Chế độ Diễn tập</h1>
              <p class="muted">Web chưa nối Firebase nên chạy trên một máy: mở trang học sinh và màn chiếu ở các tab khác để thử. Dữ liệu lưu trong trình duyệt này.</p>
              <label class="field">Họ tên giáo viên (ghi vào minh chứng)<input id="tn" type="text" value="${u.esc(L360.cfg.author || "")}"></label>
              <label class="field" style="margin-top:10px">Môn dạy<input id="ts" type="text" placeholder="VD: Lịch sử"></label>
              <button class="btn primary lg block" style="margin-top:16px" id="ok">Bắt đầu</button></div></div>`;
            u.$("#ok", container).onclick = () => {
              const v = u.$("#tn", container).value.trim() || "Giáo viên";
              localStorage.setItem("l360:tname", v);
              localStorage.setItem("l360:tsubject", u.$("#ts", container).value.trim());
              res(v);
            };
          });
        }
        await S.auth.signInTeacher();
        L360.Auth.teacher = { uid: "local-teacher", email: "", name, subject: localStorage.getItem("l360:tsubject") || "", role: "admin", isAdmin: true };
        return L360.Auth.teacher;
      }
      const user = S.auth.user;
      if (user && !user.anonymous) {
        const rec = await ensureRecord(user, null);
        if (rec) return (L360.Auth.teacher = Object.assign({ uid: user.uid, email: user.email }, rec, { isAdmin: (await S.get(`admins/${user.uid}`).catch(() => null)) === true }));
      }
      return new Promise((resolve) => {
        const draw = (mode, msg) => {
          container.innerHTML = `<div class="wrap" style="max-width:520px"><div class="card"><h1 style="font-size:1.5rem">${u.esc(title)}</h1>
            ${msg ? `<p class="pill bad" style="white-space:normal">${u.esc(msg)}</p>` : ""}
            <div class="tabs"><button class="tab ${mode === "in" ? "on" : ""}" data-m="in">Đăng nhập</button><button class="tab ${mode === "up" ? "on" : ""}" data-m="up">Đăng kí giáo viên</button></div>
            <label class="field">Email<input id="em" type="email" autocomplete="username"></label>
            <label class="field" style="margin-top:10px">Mật khẩu<input id="pw" type="password" autocomplete="${mode === "in" ? "current-password" : "new-password"}"></label>
            ${
              mode === "up"
                ? `<label class="field" style="margin-top:10px">Họ tên<input id="nm" type="text"></label>
            <div class="grid g2" style="margin-top:10px"><label class="field">Môn<input id="sj" type="text"></label><label class="field">Tổ<input id="un" type="text"></label></div>
            <label class="field" style="margin-top:10px">Mã mời của trường<span class="hint">Do quản trị viên cung cấp. Tài khoản đầu tiên của trường không cần.</span><input id="iv" type="text"></label>`
                : ""
            }
            <button class="btn primary lg block" style="margin-top:16px" id="go">${mode === "in" ? "Đăng nhập" : "Tạo tài khoản"}</button></div></div>`;
          u.$$("[data-m]", container).forEach((b) => (b.onclick = () => draw(b.dataset.m)));
          u.$("#go", container).onclick = async () => {
            const em = u.$("#em", container).value.trim();
            const pw = u.$("#pw", container).value;
            try {
              let usr;
              let form = null;
              if (mode === "in") usr = await S.auth.signInTeacher(em, pw);
              else {
                form = { name: u.$("#nm", container).value.trim(), subject: u.$("#sj", container).value.trim(), unit: u.$("#un", container).value.trim(), invite: u.$("#iv", container).value.trim() };
                try {
                  usr = await S.auth.signUpTeacher(em, pw);
                } catch (e) {
                  // Đã có tài khoản (ví dụ lần trước nhập sai mã mời): đăng nhập rồi hoàn tất đăng kí.
                  if (/email-already/.test(String(e && e.code))) usr = await S.auth.signInTeacher(em, pw);
                  else throw e;
                }
              }
              let rec = await ensureRecord(usr, form);
              if (!rec) return draw("up", "Tài khoản chưa đăng kí giáo viên – hãy điền mã mời ở thẻ Đăng kí.");
              const adm = (await S.get(`admins/${usr.uid}`).catch(() => null)) === true;
              resolve((L360.Auth.teacher = Object.assign({ uid: usr.uid, email: usr.email }, rec, { isAdmin: adm })));
            } catch (e) {
              const m = String((e && (e.code || e.message)) || e);
              draw(
                mode,
                /PERMISSION_DENIED|permission/i.test(m)
                  ? "Mã mời không đúng."
                  : /wrong-password|invalid-credential|user-not-found/.test(m)
                  ? "Sai email hoặc mật khẩu."
                  : /email-already/.test(m)
                  ? "Email đã có tài khoản – chọn Đăng nhập."
                  : /weak-password/.test(m)
                  ? "Mật khẩu cần ít nhất 6 kí tự."
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
