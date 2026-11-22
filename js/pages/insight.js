/* INSIGHT – Dữ liệu 360: tổng hợp minh chứng các tiết học cho giáo viên, tổ trưởng và Ban Giám hiệu. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const S = L360.store;
  const app = u.$("#app");
  let teacher = null;
  let all = [];
  const F = { from: "", to: "", subject: "", teacher: "", cls: "", mine: false };

  const weekKey = (ms) => {
    const d = new Date(ms);
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const fmtPct = (x) => (x == null ? "–" : Math.round(x) + "%");
  const fmt1 = (x) => (x == null ? "–" : (Math.round(x * 10) / 10).toLocaleString("vi-VN"));
  const uniq = (arr) => Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b, "vi"));

  function filtered() {
    return all.filter((s) => {
      if (F.from && s.day < F.from) return false;
      if (F.to && s.day > F.to) return false;
      if (F.subject && s.subject !== F.subject) return false;
      if (F.teacher && s.teacherName !== F.teacher) return false;
      if (F.cls && s.className !== F.cls) return false;
      if (F.mine && s.teacherUid !== teacher.uid) return false;
      return true;
    });
  }
  function kpis(list) {
    const pm = list.map((s) => s.prepMinutes).filter((x) => x);
    const peer = list.flatMap((s) => s.peer || []);
    return {
      sessions: list.length,
      teachers: uniq(list.map((s) => s.teacherName)).length,
      classes: uniq(list.map((s) => s.className)).length,
      students: list.reduce((a, s) => a + (s.joined || 0), 0),
      part: u.avg(list.map((s) => s.participation)),
      correct: u.avg(list.map((s) => s.correctRate)),
      prep: u.avg(pm),
      prepN: pm.length,
      ease: u.avg(list.map((s) => s.feedback && s.feedback.ease)),
      engage: u.avg(list.map((s) => s.feedback && s.feedback.engage)),
      r1: u.avg(peer.map((p) => p.r1)),
      r2: u.avg(peer.map((p) => p.r2)),
      peerN: peer.length
    };
  }
  const barRows = (rows, max, fmt = (v) => v) =>
    `<div class="bars">${rows
      .map(
        (r) => `<div class="bar"><div class="bar-label"><span>${r.label}</span><span class="v">${fmt(r.value)}</span></div><div class="bar-track"><div class="bar-fill" style="width:${
          max ? Math.round(((r.value || 0) / max) * 100) : 0
        }%;background:var(--accent)"></div></div></div>`
      )
      .join("")}</div>`;

  function draw() {
    const list = filtered().sort((a, b) => b.startedAt - a.startedAt);
    const k = kpis(list);
    const subjects = uniq(all.map((s) => s.subject));
    const teachers = uniq(all.map((s) => s.teacherName));
    const classes = uniq(all.map((s) => s.className));
    // Theo tuần
    const weeks = {};
    list.forEach((s) => (weeks[weekKey(s.startedAt)] = (weeks[weekKey(s.startedAt)] || 0) + 1));
    const wk = Object.keys(weeks)
      .map(Number)
      .sort((a, b) => a - b)
      .slice(-12);
    // Theo môn, theo GV
    const group = (key) => {
      const m = {};
      list.forEach((s) => (m[s[key] || "(chưa ghi)"] = (m[s[key] || "(chưa ghi)"] || []).concat(s)));
      return Object.entries(m)
        .map(([name, ss]) => ({ name, ss, k: kpis(ss) }))
        .sort((a, b) => b.ss.length - a.ss.length);
    };
    const bySub = group("subject");
    const byT = group("teacherName");
    const hard = list
      .flatMap((s) => (s.hard || []).map((h) => Object.assign({ title: s.title, cls: s.className, day: s.day }, h)))
      .sort((a, b) => a.correct - b.correct)
      .slice(0, 10);

    u.$("#body").innerHTML = `
      <section class="card no-print"><div class="row" style="align-items:flex-end">
        <label class="field">Từ ngày<input type="date" data-f="from" value="${F.from}"></label><label class="field">Đến ngày<input type="date" data-f="to" value="${F.to}"></label>
        <label class="field">Môn<select data-f="subject"><option value="">Tất cả</option>${subjects.map((x) => `<option ${F.subject === x ? "selected" : ""}>${u.esc(x)}</option>`).join("")}</select></label>
        <label class="field">Giáo viên<select data-f="teacher"><option value="">Tất cả</option>${teachers.map((x) => `<option ${F.teacher === x ? "selected" : ""}>${u.esc(x)}</option>`).join("")}</select></label>
        <label class="field">Lớp<select data-f="cls"><option value="">Tất cả</option>${classes.map((x) => `<option ${F.cls === x ? "selected" : ""}>${u.esc(x)}</option>`).join("")}</select></label>
        <label class="row small" style="align-self:flex-end"><input type="checkbox" data-f="mine" ${F.mine ? "checked" : ""}> Chỉ tiết của tôi</label>
        <span class="spacer"></span><button class="btn" id="csv">⬇ CSV</button><button class="btn primary" id="prt">🖨 Báo cáo BGH</button></div></section>
      ${
        !list.length
          ? `<section class="card center" style="margin-top:16px;padding:40px"><h2>Chưa có tiết học nào</h2><p class="muted">Số liệu được ghi tự động khi giáo viên bấm <b>Kết thúc tiết & lưu</b> trên bảng điều khiển.${
              L360.isLocal ? " Đang ở chế độ Diễn tập: chỉ thấy các tiết đã chạy thử trên máy này." : ""
            }</p></section>`
          : `
      <div class="grid g4" style="margin-top:16px">
        <div class="card center"><div class="small muted">Tiết học đã dạy</div><div style="font-size:2.4rem;font-weight:800">${k.sessions}</div><div class="small">${k.teachers} giáo viên · ${k.classes} lớp</div></div>
        <div class="card center"><div class="small muted">Lượt học sinh tham gia</div><div style="font-size:2.4rem;font-weight:800">${k.students.toLocaleString("vi-VN")}</div><div class="small">tỉ lệ nộp bài TB ${fmtPct(k.part)}</div></div>
        <div class="card center"><div class="small muted">Trả lời đúng (câu có đáp án)</div><div style="font-size:2.4rem;font-weight:800">${fmtPct(k.correct)}</div><div class="small">${
              k.peerN ? `Học từ bạn: ${fmtPct(k.r1)} → <b style="color:var(--ok)">${fmtPct(k.r2)}</b>` : "&nbsp;"
            }</div></div>
        <div class="card center"><div class="small muted">Thời gian soạn 1 tiết với AI</div><div style="font-size:2.4rem;font-weight:800">${k.prep == null ? "–" : Math.round(k.prep) + "′"}</div><div class="small">${
              k.prepN ? `trung bình ${k.prepN} tiết có ghi nhận` : "chưa ghi nhận"
            } · dễ dùng ${fmt1(k.ease)}/5</div></div></div>
      <div class="grid g2" style="margin-top:16px">
        <section class="card"><h3>Số tiết theo tuần</h3>${barRows(
          wk.map((w) => ({ label: "Tuần từ " + u.fmtDate(w), value: weeks[w] })),
          Math.max(...wk.map((w) => weeks[w]))
        )}</section>
        <section class="card"><h3>Theo môn học</h3><table class="t"><tr><th>Môn</th><th class="num">Tiết</th><th class="num">Lượt HS</th><th class="num">Tham gia</th><th class="num">Đúng</th></tr>${bySub
          .map((r) => `<tr><td>${u.esc(r.name)}</td><td class="num">${r.ss.length}</td><td class="num">${r.k.students}</td><td class="num">${fmtPct(r.k.part)}</td><td class="num">${fmtPct(r.k.correct)}</td></tr>`)
          .join("")}</table></section></div>
      <section class="card" style="margin-top:16px"><h3>Theo giáo viên</h3><table class="t"><tr><th>Giáo viên</th><th>Môn</th><th class="num">Tiết</th><th class="num">Lượt HS</th><th class="num">Tham gia</th><th class="num">Đúng</th><th class="num">Soạn (phút)</th><th class="num">Dễ dùng</th><th class="num">HS hứng thú</th></tr>${byT
        .map(
          (r) => `<tr><td>${u.esc(r.name)}</td><td>${u.esc(uniq(r.ss.map((s) => s.subject)).join(", "))}</td><td class="num">${r.ss.length}</td><td class="num">${r.k.students}</td><td class="num">${fmtPct(
            r.k.part
          )}</td><td class="num">${fmtPct(r.k.correct)}</td><td class="num">${r.k.prep == null ? "–" : Math.round(r.k.prep)}</td><td class="num">${fmt1(r.k.ease)}</td><td class="num">${fmt1(r.k.engage)}</td></tr>`
        )
        .join("")}</table></section>
      <section class="card" style="margin-top:16px"><h3>Nội dung học sinh sai nhiều – cần củng cố</h3>${
        hard.length
          ? `<table class="t"><tr><th>Câu / hoạt động</th><th>Bài</th><th>Lớp</th><th>Ngày</th><th class="num">Đúng</th></tr>${hard
              .map((h) => `<tr><td>${u.esc(h.label)}</td><td class="small">${u.esc(h.title)}</td><td>${u.esc(h.cls || "")}</td><td>${u.esc(h.day)}</td><td class="num"><span class="pill ${h.correct < 50 ? "bad" : "warn"}">${h.correct}%</span></td></tr>`)
              .join("")}</table>`
          : `<p class="muted">Chưa có câu hỏi có đáp án.</p>`
      }</section>
      <section class="card" style="margin-top:16px"><h3>Nhật ký tiết học</h3><table class="t"><tr><th>Ngày</th><th>Giáo viên</th><th>Lớp</th><th>Bài học</th><th class="num">HS</th><th class="num">Tham gia</th><th class="num">Đúng</th><th>Ghi chú</th></tr>${list
        .map(
          (s) => `<tr><td>${u.fmtDate(s.startedAt)}</td><td>${u.esc(s.teacherName)}</td><td>${u.esc(s.className || "")}</td><td>${u.esc(s.title)}<br><span class="tiny muted">${u.esc(s.subject)} ${u.esc(
            s.grade
          )}${s.mode === "local" ? " · diễn tập" : ""}</span></td><td class="num">${s.joined}</td><td class="num">${fmtPct(s.participation)}</td><td class="num">${fmtPct(s.correctRate)}</td><td class="small">${u.esc(
            (s.feedback && s.feedback.note) || ""
          )}</td></tr>`
        )
        .join("")}</table></section>`
      }`;
    u.$$("[data-f]").forEach(
      (el) =>
        (el.onchange = () => {
          F[el.dataset.f] = el.type === "checkbox" ? el.checked : el.value;
          draw();
        })
    );
    u.$("#csv").onclick = () => {
      const rows = [["Ngày", "Giáo viên", "Môn", "Lớp (khối)", "Lớp", "Bài học", "Sĩ số", "HS tham gia", "Tỉ lệ nộp bài TB (%)", "Đúng (%)", "Soạn (phút)", "AI", "Dễ dùng (1-5)", "Hứng thú (1-5)", "Chế độ", "Ghi chú"]];
      list.forEach((s) =>
        rows.push([
          s.day,
          s.teacherName,
          s.subject,
          s.grade,
          s.className,
          s.title,
          s.classSize,
          s.joined,
          s.participation,
          s.correctRate,
          s.prepMinutes || "",
          s.aiTool || "",
          s.feedback ? s.feedback.ease : "",
          s.feedback ? s.feedback.engage : "",
          s.mode,
          (s.feedback && s.feedback.note) || ""
        ])
      );
      u.download(`L360_du-lieu-tiet-hoc_${u.isoDay(Date.now())}.csv`, u.csv(rows), "text/csv;charset=utf-8");
    };
    u.$("#prt").onclick = () => print();
  }

  (async function init() {
    await S.ready;
    teacher = await L360.Auth.requireTeacher(app, { title: "Dữ liệu 360 – đăng nhập" });
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}<a class="btn sm" href="studio.html">Soạn bài</a><a class="btn sm" href="giaovien.html">Dạy</a>`, { sub: "INSIGHT – Dữ liệu 360" }) +
      `<main class="wrap"><div class="row"><div class="grow"><h1 style="margin:0">Dữ liệu 360</h1><p class="muted" style="margin:4px 0 0">Minh chứng học tập tự động từ các tiết dạy bằng Lesson 360° · ${u.esc(L360.cfg.school)}</p></div>
      <span class="small muted print-only">In lúc ${u.fmtDateTime(Date.now())}</span></div><div id="body" style="margin-top:14px"><p class="muted">Đang tải…</p></div></main>` +
      L360.shell.footer();
    S.on("sessions", (v) => {
      all = u.vals(v).filter((s) => s && s.startedAt);
      draw();
    });
  })();
})();
