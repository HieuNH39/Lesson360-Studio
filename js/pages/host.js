/* Bảng điều khiển giáo viên: mở phòng, điều khiển từng bước, theo dõi lớp, xuất minh chứng, kết thúc tiết. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;
  const S = L360.store;
  const Room = L360.Room;
  const Pack = L360.Pack;
  const app = u.$("#app");
  let teacher = null;
  let host = null;

  const recent = {
    list() {
      try {
        return JSON.parse(localStorage.getItem("l360:hostRooms") || "[]");
      } catch (e) {
        return [];
      }
    },
    add(r) {
      const l = recent.list().filter((x) => x.room !== r.room);
      l.unshift(r);
      localStorage.setItem("l360:hostRooms", JSON.stringify(l.slice(0, 12)));
    },
    drop(room) {
      localStorage.setItem("l360:hostRooms", JSON.stringify(recent.list().filter((x) => x.room !== room)));
    }
  };
  const forced = /che-do=dien-tap/.test(location.search);
  const studentUrl = (room) => location.href.replace(/giaovien\.html.*$/, "") + `hocsinh.html?phong=${encodeURIComponent(room)}${forced ? "&che-do=dien-tap" : ""}`;
  const screenUrl = (room) => `manchieu.html?phong=${encodeURIComponent(room)}${forced ? "&che-do=dien-tap" : ""}`;

  /* ---------------- Màn hình mở phòng ---------------- */
  async function setupView() {
    if (host) {
      host.destroy();
      host = null;
    }
    const want = u.qs("pack");
    let packs = L360.Local.all();
    const libId = u.qs("lib");
    if (libId && L360.Lib) {
      const lp = await L360.Lib.getPack(libId).catch(() => null);
      if (lp && !packs.find((p) => p.id === lp.id)) packs.unshift(Object.assign(lp, { _school: lp.meta && lp.meta.authorName ? "GV " + lp.meta.authorName : "Thư viện trường" }));
    }
    let sel = (packs.find((p) => p.id === want) || packs[0] || {}).id;
    const rooms = recent.list();
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(teacher)}`, { sub: "Dạy học trực tiếp", nav: "day" }) +
      `<main class="wrap"><h1>Mở tiết học</h1><div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);gap:20px">
      <section class="card"><div class="row"><h2 class="grow">1. Chọn tiết học</h2><input id="q" type="search" placeholder="Tìm bài…" style="max-width:220px;min-height:38px"></div>
        <p class="small muted" style="margin:0">Bài của tôi, bài mẫu và bài vừa chọn từ <a href="thuvien.html">Thư viện trường</a>.</p>
        <div id="plist" class="col" style="gap:8px;max-height:60vh;overflow:auto;margin-top:8px"></div></section>
      <section class="card"><h2>2. Thông tin lớp</h2>
        <label class="field">Lớp<input id="cls" type="text" placeholder="VD: 10A2" value="${u.esc(localStorage.getItem("l360:lastClass") || "")}"></label>
        <div class="grid g2" style="margin-top:10px"><label class="field">Sĩ số<input id="size" type="number" min="1" max="${L360.cfg.maxClassSize}" value="${
        localStorage.getItem("l360:lastSize") || L360.cfg.defaultClassSize
      }"></label>
        <label class="field">Số nhóm<select id="gc">${[2, 3, 4, 5, 6].map((n) => `<option ${n === (Number(localStorage.getItem("l360:lastGroups")) || L360.cfg.defaultGroupCount) ? "selected" : ""}>${n}</option>`).join("")}</select></label></div>
        <label class="field" style="margin-top:10px">Mã phòng<span class="hint">Học sinh nhập mã này hoặc quét QR. Để trống để tạo ngẫu nhiên.</span><input id="rc" type="text" maxlength="12" style="text-transform:uppercase;letter-spacing:.08em;font-weight:700" placeholder="Tự động"></label>
        <label class="row small" style="margin-top:10px"><input type="checkbox" id="wipe"> Xoá dữ liệu cũ nếu mã phòng đã dùng (chỉ với phòng của tôi)</label>
        <button class="btn primary lg block" style="margin-top:16px" id="open">Mở phòng</button>
        <p class="small muted" style="margin-top:10px">Mẹo: mở trước giờ 10–15 phút, bật màn chiếu ở chế độ mở rộng màn hình.</p></section></div>
      ${
        rooms.length
          ? `<section class="card" style="margin-top:20px"><h2>Phòng gần đây</h2><table class="t"><tr><th>Mã</th><th>Bài học</th><th>Lớp</th><th>Mở lúc</th><th></th></tr>${rooms
              .map(
                (r) =>
                  `<tr><td><b>${u.esc(r.room)}</b></td><td>${u.esc(r.title)}</td><td>${u.esc(r.className || "")}</td><td>${u.fmtDateTime(r.at)}</td><td class="right"><button class="btn sm" data-resume="${u.esc(
                    r.room
                  )}">Tiếp tục</button> <button class="btn sm ghost" data-drop="${u.esc(r.room)}">Ẩn</button></td></tr>`
              )
              .join("")}</table></section>`
          : ""
      }

      </main>` +
      L360.shell.footer();
    const drawList = () => {
      const q = u.slug(u.$("#q").value);
      u.$("#plist").innerHTML =
        packs
          .filter((p) => !q || u.slug(`${p.title} ${p.subject} ${p.grade}`).includes(q))
          .map((p) => {
            const sm = Pack.summary(p);
            return `<label class="opt ${p.id === sel ? "sel" : ""}" style="cursor:pointer"><input type="radio" name="pk" value="${u.esc(p.id)}" ${p.id === sel ? "checked" : ""} style="margin-top:6px">
            <span class="grow" style="min-width:0"><b class="clamp2">${u.esc(p.title)}</b><span class="small muted ellipsis" style="display:block">${u.esc([p.subject, p.grade && "lớp " + p.grade, Pack.label(p)].filter(Boolean).join(" · "))}</span>
            <span class="small">${sm.steps} hoạt động · ${sm.minutes} phút</span> ${p._sample ? `<span class="pill">Bài mẫu</span>` : p._school ? `<span class="pill accent">${u.esc(p._school)}</span>` : `<span class="pill ok">Của tôi</span>`}</span></label>`;
          })
          .join("") || `<p class="muted">Chưa có bài học. <a href="studio.html">Soạn bài mới với trợ lý AI</a>.</p>`;
      u.$$("input[name=pk]").forEach((r) => (r.onchange = () => ((sel = r.value), drawList())));
    };
    drawList();
    u.$("#q").oninput = drawList;
    L360.shell.bindUserMenu(teacher);
    u.$$("[data-drop]").forEach((b) => (b.onclick = () => (recent.drop(b.dataset.drop), setupView())));
    u.$$("[data-resume]").forEach((b) => (b.onclick = () => resume(b.dataset.resume)));

    u.$("#open").onclick = async () => {
      const pack = packs.find((p) => p.id === sel);
      if (!pack) return u.toast("Chọn một bài học.", "bad");
      const v = Pack.validate(pack);
      if (v.errors.length) return u.toast("Bài học còn lỗi – mở trong Studio để sửa.", "bad");
      let room = (u.$("#rc").value || "").toUpperCase().replace(/[^A-Z0-9]/g, "") || u.roomCode();
      const cls = u.$("#cls").value.trim();
      const size = Number(u.$("#size").value) || 30;
      const gc = Number(u.$("#gc").value) || 4;
      localStorage.setItem("l360:lastClass", cls);
      localStorage.setItem("l360:lastSize", size);
      localStorage.setItem("l360:lastGroups", gc);
      try {
        const old = await S.get(`rooms/${room}/meta`).catch(() => null);
        if (old) {
          if (old.teacherUid !== teacher.uid) return u.toast("Mã phòng này đang thuộc giáo viên khác. Chọn mã khác.", "bad");
          if (!u.$("#wipe").checked) {
            if (await u.confirm(`Phòng **${room}** đã có dữ liệu (${old.title}). Tiếp tục phòng cũ?`, "Tiếp tục phòng cũ")) return resume(room);
            return;
          }
          await Room.wipe(room);
        }
        await Room.create({ pack, room, className: cls, classSize: size, groupCount: gc, teacher });
        recent.add({ room, title: pack.title, className: cls, at: Date.now() });
        history.replaceState(null, "", `?phong=${room}${L360.isLocal && /che-do=dien-tap/.test(location.search) ? "&che-do=dien-tap" : ""}`);
        liveView(room, pack);
      } catch (e) {
        console.error(e);
        u.toast("Không mở được phòng: " + (e.message || e), "bad", 5000);
      }
    };
  }

  async function resume(room) {
    const priv = await S.get(`priv/${room}`).catch(() => null);
    if (!priv || !priv.pack) {
      recent.drop(room);
      return u.toast("Không còn dữ liệu của phòng này.", "bad");
    }
    history.replaceState(null, "", `?phong=${room}${/che-do=dien-tap/.test(location.search) ? "&che-do=dien-tap" : ""}`);
    liveView(room, priv.pack);
  }

  /* ---------------- Điều khiển tiết học ---------------- */
  function liveView(room, pack) {
    host = new Room.Host(room, pack, () => draw());
    const pal = L360.Design.resolve(host.pack).palette;
    ["--accent", "--accent-2"].forEach((k, i) => document.documentElement.style.setProperty(k, i ? pal.accent2 : pal.accent));
    document.documentElement.style.setProperty("--accent-a12", L360.Design.rgba(pal.accent, 0.12));
    document.documentElement.style.setProperty("--accent-a25", L360.Design.rgba(pal.accent, 0.25));
    app.innerHTML =
      L360.shell.topbar(
        `<span class="pill accent" style="font-size:.95rem">Phòng <b>${u.esc(room)}</b></span>${L360.shell.modeBadge()}
        <a class="btn sm primary" href="${screenUrl(room)}" target="l360screen" id="scr">${L360.icon("layers")} Mở màn chiếu</a>
        <button class="btn sm" id="menu">Minh chứng & kết thúc ▾</button>`,
        { sub: [Pack.label(host.pack), host.pack.title].filter(Boolean).join(" · ") }
      ) +
      `<main class="host-grid">
        <nav class="card flat host-steps" id="steps"></nav>
        <section class="col" style="min-width:0"><div class="card" id="ctrl"></div><div class="card" id="livep"></div></section>
        <aside class="col" style="min-width:0"><div class="card" id="seats"></div></aside>
      </main>`;
    u.$("#menu").onclick = menu;
  }

  function menu() {
    const m = u.modal(`<h2>Minh chứng & kết thúc</h2>
      <div class="col">
        <button class="btn" data-a="csv1">⬇ Minh chứng cá nhân (CSV, mở bằng Excel)</button>
        <button class="btn" data-a="csv2">⬇ Minh chứng nhóm (CSV)</button>
        <button class="btn" data-a="report">🖨 Báo cáo tổng kết tiết học (in / lưu PDF)</button>
        <button class="btn" data-a="link">🔗 Sao chép đường dẫn cho học sinh</button>
        <hr><button class="btn primary" data-a="end">Kết thúc tiết & lưu vào bảng dữ liệu</button>
        <button class="btn ghost" data-a="leave">Rời phòng (về màn hình mở phòng)</button>
      </div><p class="small muted" style="margin-top:10px">Dữ liệu tiết học vẫn được giữ; có thể xuất lại bất cứ lúc nào bằng “Phòng gần đây”.</p>`);
    const act = async (a) => {
      const slug = `L360_${host.room}_${u.slug(host.meta.className || "lop")}`;
      if (a === "csv1") u.download(`${slug}_minh-chung-ca-nhan.csv`, Room.Stats.csvIndividual(host.pack, host.data), "text/csv;charset=utf-8");
      if (a === "csv2") u.download(`${slug}_minh-chung-nhom.csv`, Room.Stats.csvGroups(host.pack, host.data), "text/csv;charset=utf-8");
      if (a === "report") report();
      if (a === "link") (await u.copy(studentUrl(host.room))) && u.toast("Đã sao chép.", "ok");
      if (a === "end") {
        m.close();
        return endLesson();
      }
      if (a === "leave") {
        m.close();
        history.replaceState(null, "", location.pathname + (/che-do=dien-tap/.test(location.search) ? "?che-do=dien-tap" : ""));
        return setupView();
      }
    };
    u.$$("[data-a]", m.el).forEach((b) => (b.onclick = () => act(b.dataset.a)));
  }

  function endLesson() {
    const pm = host.pack.meta || {};
    const m = u.modal(`<h2>Kết thúc tiết học</h2><p class="muted">Ý kiến của thầy/cô được lưu cùng số liệu tiết học để làm minh chứng (1 phút).</p>
      <label class="field">Lesson 360° dễ dùng ở mức nào? (1 = rất khó, 5 = rất dễ)<select id="f1">${[5, 4, 3, 2, 1].map((n) => `<option>${n}</option>`).join("")}</select></label>
      <label class="field" style="margin-top:10px">Học sinh hứng thú ở mức nào? (1–5)<select id="f2">${[5, 4, 3, 2, 1].map((n) => `<option>${n}</option>`).join("")}</select></label>
      <label class="field" style="margin-top:10px">Thời gian soạn bài này (phút)<span class="hint">Tính từ lúc đưa giáo án cho trợ lý AI đến lúc dạy được.</span><input id="f3" type="number" min="0" value="${pm.prepMinutes || ""}"></label>
      <label class="field" style="margin-top:10px">Ghi chú (sự cố, điều chỉnh, nhận xét của người dự giờ…)<textarea id="f4" rows="3"></textarea></label>
      <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn" data-close>Huỷ</button><button class="btn primary" id="fin">Lưu và kết thúc</button></div>`);
    u.$("#fin", m.el).onclick = async () => {
      const fb = { ease: Number(u.$("#f1", m.el).value), engage: Number(u.$("#f2", m.el).value), note: u.$("#f4", m.el).value.trim() };
      const pmn = Number(u.$("#f3", m.el).value);
      if (pmn) host.pack.meta = Object.assign({}, host.pack.meta, { prepMinutes: pmn });
      try {
        const s = await host.end(fb);
        m.close();
        u.toast("Đã lưu tổng kết tiết học.", "ok");
        if (L360.isLocal) u.toast("Chế độ Diễn tập: số liệu chỉ nằm trên máy này.", "", 4000);
        void s;
      } catch (e) {
        u.toast("Chưa lưu được: " + (e.message || e), "bad", 5000);
      }
    };
  }

  function report() {
    const s = Room.Stats.summary(host.pack, host.data, host.room, null);
    const lb = Room.Stats.leaderboard(host.pack, host.data);
    const exits = [];
    host.pack.steps
      .filter((x) => x.type === "text")
      .forEach((x) => u.entries(host.data.subs && host.data.subs[x.id]).forEach(([c, v]) => exits.push([x.title, c, v.v && v.v.text])));
    const w = window.open("", "_blank");
    w.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo tiết học ${u.esc(host.room)}</title><link rel="stylesheet" href="${location.href.replace(/giaovien\.html.*$/, "")}assets/css/l360.css">
      <style>body{background:#fff}.wrap{max-width:900px}</style></head><body><main class="wrap">
      <div class="row"><img src="${location.href.replace(/giaovien\.html.*$/, "")}assets/img/logo-hsh-muc.png" style="height:40px"><span class="spacer"></span><span class="small muted">${u.esc(L360.cfg.school)}</span></div>
      <h1 style="margin-top:14px">Báo cáo tổng kết tiết học</h1>
      <p><b>${u.esc(host.pack.title)}</b><br>${u.esc([host.pack.subject, host.pack.grade && "lớp " + host.pack.grade].filter(Boolean).join(" · "))} · Lớp ${u.esc(host.meta.className || "")} · Phòng ${u.esc(
      host.room
    )} · ${u.fmtDateTime(s.startedAt)} · GV ${u.esc(host.meta.teacherName || "")}</p>
      <div class="grid g4" style="margin:16px 0"><div class="card center"><h2>${s.joined}/${host.meta.classSize}</h2><span class="small">học sinh tham gia</span></div>
      <div class="card center"><h2>${s.participation == null ? "–" : s.participation + "%"}</h2><span class="small">tỉ lệ nộp bài TB</span></div>
      <div class="card center"><h2>${s.correctRate == null ? "–" : s.correctRate + "%"}</h2><span class="small">trả lời đúng</span></div>
      <div class="card center"><h2>${s.interactive}</h2><span class="small">lượt tương tác</span></div></div>
      ${s.peer.length ? `<h2>Học từ bạn (vòng 1 → vòng 2)</h2><ul>${s.peer.map((p) => `<li>${u.esc(p.title)}: ${p.r1}% → ${p.r2}% đúng</li>`).join("")}</ul>` : ""}
      <h2>Từng hoạt động</h2><table class="t"><tr><th>Hoạt động</th><th class="num">Đã nộp</th><th class="num">Tỉ lệ nộp</th><th class="num">Đúng</th></tr>${s.rows
        .map((r) => `<tr><td>${u.esc(r.label)}</td><td class="num">${r.n}</td><td class="num">${r.rate == null ? "" : r.rate + "%"}</td><td class="num">${r.correct == null ? "" : r.correct + "%"}</td></tr>`)
        .join("")}</table>
      ${lb.list.some((x) => x.pts) ? `<h2 style="margin-top:18px">Điểm trắc nghiệm theo nhóm</h2><table class="t">${lb.groups.map((g) => `<tr><td>${u.esc(g.name)}</td><td class="num">${g.avg}</td></tr>`).join("")}</table>` : ""}
      ${exits.length ? `<h2 style="margin-top:18px">Câu trả lời viết của học sinh</h2><table class="t">${exits.map((e) => `<tr><td class="small">${u.esc(e[0])}</td><td><b>${e[1]}</b></td><td>${u.esc(e[2] || "")}</td></tr>`).join("")}</table>` : ""}
      <p class="small muted" style="margin-top:20px">Tạo bởi Lesson 360° Studio (${u.esc(L360.modeLabel)}). Học sinh dùng mã số, không thu thập họ tên.</p>
      <p class="no-print"><button class="btn primary" onclick="print()">In / Lưu PDF</button></p></main></body></html>`);
    w.document.close();
  }

  function genericControls() {
    const st = host.state;
    const step = host.step;
    const T = host.type;
    if (!step) return [];
    if (T.controls) return T.controls({ host, state: st, step, groups: host.meta.groups || [] });
    if (T.noSubmit) return [];
    const c = [];
    const dur = host.defaultDur();
    if (st.phase === "observe") c.push({ label: `▶ Mở nhận bài${dur ? ` (${u.fmtSec(dur)})` : ""}`, cls: "primary", fn: () => host.open() });
    if (st.phase === "open")
      c.push({ label: "■ Khoá nộp bài", cls: "dark", fn: () => host.lock() }, { label: "+30 giây", fn: () => host.addTime(30) }, { label: "+1 phút", fn: () => host.addTime(60) });
    if (st.phase === "locked") {
      const ans = Pack.answerItem(step, st);
      const meaningful = ans && Object.values(ans).some((v) => v != null && v !== "");
      if (meaningful || step.type === "auction") c.push({ label: "✓ Công bố", cls: "ok", fn: () => host.reveal() });
      c.push({ label: "↻ Mở lại", fn: () => host.reopen() });
    }
    return c;
  }

  const draw = u.throttleRaf(() => {
    if (!host || !u.$("#ctrl")) return;
    const d = host.data;
    const st = host.state;
    ui.timerState = st;
    const steps = host.pack.steps;
    const step = host.step;
    const meta = host.meta;
    const groups = meta.groups || [];
    const joined = Room.joined(d);
    const key = step ? host.key() : null;
    // Danh sách bước
    let lastPh = "";
    u.$("#steps").innerHTML = `<div class="small muted" style="margin-bottom:6px">${u.esc(Pack.label(host.pack))} · <span data-clock>0:00</span> / ${host.pack.duration} phút</div>
      <button class="hstep ${st.step < 0 ? "cur" : ""}" data-go="-1"><span class="n">0</span><span>Phòng chờ</span></button>
      ${steps
        .map((s, i) => {
          const T = L360.types[s.type] || {};
          const hd = s.phase !== lastPh ? `<div class="hph phc-${s.phase}">${u.esc(L360.phase(s.phase).name)}</div>` : "";
          lastPh = s.phase;
          const note = s.ghiBai || (s.pages || []).some((pg) => L360.blocks.hasNote(pg));
          return `${hd}<button class="hstep phc-${s.phase} ${i === st.step ? "cur" : i < st.step ? "done" : ""}" data-go="${i}"><span class="n">${i + 1}</span><span class="grow">${u.esc(s.title)}<br><span class="tiny muted">${u.esc(T.label || s.type)}${
            s.minutes ? ` · ${s.minutes}′` : ""
          }${note ? " · ✎ ghi vở" : ""}</span></span></button>`;
        })
        .join("")}
      <button class="hstep ${st.step >= steps.length ? "cur" : ""}" data-go="${steps.length}"><span class="n">✓</span><span>Tổng kết</span></button>`;
    u.$$("[data-go]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (st.phase === "open" && !(await u.confirm("Bước hiện tại đang nhận bài. Chuyển bước?", "Chuyển"))) return;
          host.goto(Number(b.dataset.go));
        })
    );
    // Điều khiển
    const ctrl = u.$("#ctrl");
    if (st.step < 0) {
      ctrl.innerHTML = `<div class="grid" style="grid-template-columns:260px 1fr;gap:20px;align-items:center"><div style="background:#fff;border-radius:14px;padding:6px">${u.qr(studentUrl(host.room), 5)}</div>
        <div><span class="pill">Phòng chờ</span><h2 style="margin-top:8px">${u.esc(host.pack.title)}</h2><p>Học sinh quét QR hoặc mở <b>${u.esc(studentUrl(host.room))}</b>, chọn mã và nhóm.</p>
        <p class="big" style="font-size:1.4rem"><b>${joined.length}</b>/${meta.classSize} đã vào lớp</p>
        <div class="row"><button class="btn primary lg" id="start">Bắt đầu tiết học ›</button><a class="btn" href="${screenUrl(host.room)}" target="l360screen">Mở màn chiếu</a></div></div></div>`;
      u.$("#start").onclick = () => host.goto(0);
    } else if (!step) {
      ctrl.innerHTML = `<span class="pill ok">Tổng kết</span><h2 style="margin-top:8px">Tiết học đã đi hết các bước</h2>
        <p>${meta.status === "ended" ? "Đã lưu tổng kết vào bảng dữ liệu." : "Bấm “Kết thúc tiết & lưu” để đưa số liệu vào bảng dữ liệu INSIGHT."}</p>
        <div class="row"><button class="btn primary" id="endb">${meta.status === "ended" ? "Lưu lại tổng kết" : "Kết thúc tiết & lưu"}</button><button class="btn" id="rep">Báo cáo tổng kết</button><a class="btn" href="insight.html">Mở bảng dữ liệu</a></div>`;
      u.$("#endb").onclick = endLesson;
      u.$("#rep").onclick = report;
    } else {
      const T = host.type || {};
      const btns = genericControls();
      const modes = [
        ["content", "Nội dung"],
        ["live", "Kết quả trực tiếp"],
        ["board", "Bảng xếp hạng"],
        ["featured", "Bài nổi bật"]
      ];
      const pg = step.type === "slide" ? (step.pages || [])[st.page || 0] : null;
      const noteNow = (pg && L360.blocks.hasNote(pg)) || step.ghiBai;
      ctrl.innerHTML = `<div class="row"><span class="ph ph-${step.phase}">${u.esc(L360.phase(step.phase).name)}</span><span class="pill">${st.step + 1}/${steps.length} · ${u.esc(T.label || step.type)}</span><span class="pill ${
        st.phase === "open" ? "ok" : st.phase === "revealed" ? "accent" : ""
      }">${ui.phaseLabel(st, T)}</span>${step.type === "quiz" ? `<span class="pill">Câu ${(st.q || 0) + 1}/${step.questions.length}</span>` : ""}${step.type === "poll2" ? `<span class="pill">Vòng ${st.round === 2 ? 2 : 1}</span>` : ""}${
        step.type === "slide" && (step.pages || []).length > 1 ? `<span class="pill">Trang ${(st.page || 0) + 1}/${step.pages.length}</span>` : ""
      }${noteNow ? `<span class="ghi-badge">${L360.icon("ghiBai")} Nhắc học sinh ghi vở</span>` : ""}<span class="spacer"></span><span style="font-size:1.8rem">${ui.timer()}</span></div>
        <h2 style="margin-top:8px">${u.esc(step.title)}</h2>
        ${step.script ? `<div class="script"><b>Lời dẫn gợi ý.</b> ${u.rich(step.script)}</div>` : ""}
        ${step.instructions ? `<p class="small"><b>Nhiệm vụ cho học sinh:</b> ${u.rich(step.instructions)}</p>` : ""}
        <div class="row" style="margin-top:12px">${btns.map((b, i) => `<button class="btn ${b.cls || ""}" data-b="${i}">${u.esc(b.label)}</button>`).join("")}</div>
        <div class="row" style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px"><button class="btn sm" id="prev">‹ Bước trước</button><button class="btn sm dark" id="next">Bước tiếp theo ›</button>
        <button class="btn sm" id="pick" title="Gọi một học sinh ngẫu nhiên lên màn chiếu">${L360.icon("dice")} Gọi ngẫu nhiên</button>${d.pub && d.pub.overlay ? `<button class="btn sm" id="ovx">Tắt lớp phủ</button>` : ""}
        <button class="btn sm ghost" id="snd" title="Âm thanh trên màn chiếu">${L360.icon(st.sound === false ? "soundOff" : "soundOn")}</button>
        <span class="spacer"></span><span class="small muted">Màn chiếu:</span>${modes
          .map(([m, l]) => `<button class="btn sm ${(st.screen || "content") === m ? "primary" : ""}" data-sm="${m}">${l}</button>`)
          .join("")}</div>`;
      u.$$("[data-b]", ctrl).forEach((b) => (b.onclick = () => btns[Number(b.dataset.b)].fn()));
      u.$$("[data-sm]", ctrl).forEach((b) => (b.onclick = () => host.setScreen(b.dataset.sm)));
      u.$("#prev").onclick = () => host.prev();
      u.$("#pick").onclick = async () => ((await host.pick()) ? null : u.toast("Chưa có học sinh trong lớp.", "bad"));
      if (u.$("#ovx")) u.$("#ovx").onclick = () => host.closeOverlay();
      u.$("#snd").onclick = () => host.setSound(st.sound === false);
      u.$("#next").onclick = async () => {
        if (st.phase === "open" && !(await u.confirm("Bước hiện tại đang nhận bài. Khoá và chuyển bước?", "Chuyển"))) return;
        host.next();
      };
    }
    // Bảng trực tiếp
    const lp = u.$("#livep");
    if (step && L360.types[step.type] && L360.types[step.type].host) {
      lp.classList.remove("hidden");
      const ctx = {
        host,
        data: Object.assign({ subs: {}, gsubs: {}, roster: {}, pub: {} }, d),
        step,
        state: st,
        key,
        subs: host.subsFor(key),
        gsubs: host.gsubsFor(key),
        joined: joined.length,
        joinedCodes: joined.map(([c]) => c),
        groups,
        item: d.pub && d.pub.items && d.pub.items[key],
        nameOf: (c) => (d.roster && d.roster[c] && d.roster[c].name) || c
      };
      lp.innerHTML = `<h3>${step.type === "slide" ? "Trang đang chiếu" : step.type === "crossword" ? "Ô chữ" : "Theo dõi trực tiếp"}</h3><div id="lpb"></div>`;
      L360.types[step.type].host(u.$("#lpb"), ctx);
      u.$$(".host-prev", lp).forEach((x) => L360.Design.apply(host.pack, x));
    } else lp.classList.add("hidden");
    // Lưới lớp học
    const gm = !!(host.type && host.type.groupMode);
    const subs = key ? (gm ? {} : host.subsFor(key)) : {};
    const gsubs = key && gm ? host.gsubsFor(key) : {};
    const gmap = Object.fromEntries(groups.map((g) => [g.id, g]));
    const codes = Room.codes(meta.classSize);
    const nDone = step && !host.type.noSubmit ? (gm ? Object.keys(gsubs).length : Object.keys(subs).length) : null;
    u.$("#seats").innerHTML = `<div class="row"><h3 class="grow" style="margin:0">Lưới lớp học</h3><span class="pill">${joined.length}/${meta.classSize} vào lớp</span>${
      nDone != null ? `<span class="pill ok">${nDone} ${gm ? "nhóm" : "HS"} đã nộp</span>` : ""
    }</div>
      <div class="seat-grid" style="margin-top:10px">${codes
        .map((c) => {
          const r = d.roster && d.roster[c];
          const on = r && r.uid;
          const g = on && gmap[r.group];
          const done = on && (gm ? gsubs[r.group] : subs[c]);
          const off = on && !Room.online(d, c);
          return `<button class="seat ${on ? "in" : ""} ${done ? "done" : ""} ${off ? "off" : ""}" data-seat="${c}" style="${g ? `border-color:${g.color}` : ""}">${c}<span class="nm">${u.esc((r && r.name) || "")}</span></button>`;
        })
        .join("")}</div>
      <p class="tiny muted" style="margin-top:8px">Xám: chưa vào · viền màu: nhóm · xanh: đã nộp · chấm đỏ: mất kết nối. Bấm vào ô để đổi nhóm hoặc giải phóng mã.</p>
      <div class="col" style="gap:6px;margin-top:8px">${groups
        .map((g) => `<div class="row nowrap">${ui.gbadge(g)}<span class="small">${joined.filter(([, r]) => r.group === g.id).length} học sinh</span></div>`)
        .join("")}</div>`;
    u.$$("[data-seat]").forEach((b) => (b.onclick = () => seatModal(b.dataset.seat)));
  });

  function seatModal(code) {
    const r = (host.data.roster || {})[code];
    const groups = host.meta.groups || [];
    const m = u.modal(`<h2>${code}${r && r.name ? " · " + u.esc(r.name) : ""}</h2>
      ${r && r.uid ? `<p class="muted">${Room.online(host.data, code) ? "Đang kết nối" : "Mất kết nối"}</p>` : `<p class="muted">Chưa vào lớp.</p>`}
      ${
        r
          ? `<label class="field">Nhóm<select id="mg">${groups.map((g) => `<option value="${g.id}" ${r.group === g.id ? "selected" : ""}>${u.esc(g.name)}</option>`).join("")}</select></label>
      <label class="row small" style="margin-top:12px"><input type="checkbox" id="rel"> Giải phóng mã (học sinh đổi máy hoặc vào nhầm mã)</label>`
          : ""
      }
      <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn" data-close>Đóng</button>${r ? `<button class="btn primary" id="do">Thực hiện</button>` : ""}</div>`);
    if (!r) return;
    u.$("#do", m.el).onclick = async () => {
      const g = u.$("#mg", m.el).value;
      if (g !== r.group) await host.moveGroup(code, g);
      if (u.$("#rel", m.el).checked) await host.releaseCode(code);
      m.close();
    };
  }

  (async function init() {
    await S.ready;
    teacher = await L360.Auth.requireTeacher(app);
    const room = (u.qs("phong") || "").toUpperCase();
    if (room) {
      const meta = await S.get(`rooms/${room}/meta`).catch(() => null);
      if (meta && meta.teacherUid === teacher.uid) return resume(room);
    }
    setupView();
  })();
})();
