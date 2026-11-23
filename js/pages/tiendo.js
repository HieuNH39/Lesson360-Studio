/* Trang Tiến độ: tổ trưởng và quản trị viên theo dõi tiến độ của cả tổ – soạn bài theo Phụ lục 1,
   dạy trên hệ thống, báo giảng CSDL; giáo viên xem tiến độ của chính mình. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const S = L360.store;
  const C = L360.Curr;
  const P = L360.Ppct;
  const app = u.$("#app");
  let teacher = null;
  const st = { nam: P.yearNow(), mon: "", lop: "" };

  const bar = (v, max, cls = "") => `<div class="td-bar ${cls}"><i style="width:${max ? Math.min(100, Math.round((v / max) * 100)) : 0}%"></i></div>`;
  const weekKey = (t) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.getTime();
  };

  async function load() {
    const lead = teacher.isLeader || teacher.isAdmin;
    const teachers = lead && !L360.isLocal ? (await S.get("teachers").catch(() => null)) || {} : { [teacher.uid]: { name: teacher.name, email: teacher.email, subjects: teacher.subjects, avatar: teacher.avatar } };
    const meta = (await S.get("lib/meta").catch(() => null)) || {};
    let sessions = {};
    if (lead) sessions = (await S.get("sessions").catch(() => null)) || {};
    else sessions = (await S.query("sessions", "teacherUid", teacher.uid).catch(() => null)) || {};
    let reports = {};
    if (lead) reports = (await S.get("baogiang/reports").catch(() => null)) || {};
    else reports = { [teacher.uid]: (await S.get(`baogiang/reports/${teacher.uid}`).catch(() => null)) || {} };
    const docs = await P.list(st.nam);
    return { lead, teachers, meta: u.vals(meta).filter((m) => m && m.by), sessions: u.vals(sessions).filter((x) => x && x.startedAt), reports, docs };
  }

  async function draw() {
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(teacher)}`, { sub: "Tiến độ của tổ", nav: "tiendo" }) +
      `<main class="wrap" style="max-width:1280px"><p class="muted">Đang tổng hợp…</p></main>` +
      L360.shell.footer();
    L360.shell.bindUserMenu(teacher);
    const d = await load();
    const nam = st.nam;
    const since = Date.now() - 30 * 864e5;
    // Phủ Phụ lục 1: số bài trong PL1 đã có ít nhất một tiết học trong thư viện trường.
    const docs = d.docs.filter((x) => (!st.mon || x.mon === st.mon) && (!st.lop || String(x.lop) === st.lop));
    const cover = [];
    for (const x of docs.slice(0, 60)) {
      const doc = await P.get(x.id, nam).catch(() => null);
      if (!doc) continue;
      const bai = doc.bai.filter((b) => !P.isExtra || !P.isExtra(b));
      const keys = new Set(d.meta.map((m) => m.k));
      const done = bai.filter((b) => keys.has(P.baiKey(doc, b)) || (b.key && keys.has(b.key))).length;
      cover.push({ id: x.id, name: `${x.cd ? "Chuyên đề " : ""}${C.subjectName(x.mon, x.lop)} ${x.lop}`, total: bai.length, done, tiet: doc.tongTiet || x.tongTiet || 0 });
    }
    // Từng giáo viên.
    const rows = Object.entries(d.teachers)
      .map(([uid, t]) => {
        const mine = d.meta.filter((m) => m.by === uid);
        const ses = d.sessions.filter((s) => s.teacherUid === uid);
        const rep = u.vals(d.reports[uid] && d.reports[uid][nam]).filter(Boolean);
        const weeks = rep.map((r) => Number(r.tuan) || 0).filter(Boolean);
        const part = ses.map((s) => s.participation).filter((v) => v != null);
        return {
          uid,
          t,
          soan: mine.length,
          soan30: mine.filter((m) => (m.up || 0) > since).length,
          day: ses.length,
          day30: ses.filter((s) => s.startedAt > since).length,
          last: ses.reduce((a, s) => Math.max(a, s.startedAt), 0),
          part: part.length ? Math.round(part.reduce((a, b) => a + b, 0) / part.length) : null,
          bgWeeks: weeks.length,
          bgLast: weeks.length ? Math.max(...weeks) : 0
        };
      })
      .sort((a, b) => b.soan + b.day - (a.soan + a.day) || String(a.t.name).localeCompare(String(b.t.name), "vi"));
    const maxS = Math.max(1, ...rows.map((r) => r.soan));
    const maxD = Math.max(1, ...rows.map((r) => r.day));
    // Hoạt động 8 tuần gần nhất (tiết dạy trên hệ thống + tiết soạn).
    const wk = [];
    for (let i = 7; i >= 0; i--) wk.push(weekKey(Date.now() - i * 7 * 864e5));
    const byW = wk.map((w) => ({ w, day: d.sessions.filter((s) => weekKey(s.startedAt) === w).length, soan: d.meta.filter((m) => m.up && weekKey(m.up) === w).length }));
    const maxW = Math.max(1, ...byW.map((x) => x.day + x.soan));
    const tot = { soan: d.meta.length, day: d.sessions.length, gv: rows.filter((r) => r.soan || r.day).length, cover: cover.reduce((a, c) => a + c.done, 0), coverT: cover.reduce((a, c) => a + c.total, 0) };
    const mons = [...new Set(d.docs.map((x) => x.mon))];
    app.querySelector("main").innerHTML = `<div class="row" style="align-items:flex-end;gap:12px;margin-bottom:14px"><div class="grow"><h1 style="margin:0">Tiến độ ${d.lead ? "của tổ" : "của tôi"}</h1>
        <p class="muted" style="margin:4px 0 0">${d.lead ? "Theo dõi soạn bài theo Phụ lục 1, dạy học trên hệ thống và báo giảng CSDL của từng giáo viên." : "Tiến độ soạn bài, dạy học và báo giảng của thầy cô. Tổ trưởng và quản trị viên xem được cả tổ."}</p></div>
        <span class="pill">Năm học ${u.esc(nam.replace("-", "–"))}</span></div>
      <div class="grid g4 td-kpi"><div class="card"><b>${tot.soan}</b><span>tiết học trong thư viện</span></div><div class="card"><b>${tot.day}</b><span>tiết đã dạy trên hệ thống</span></div>
        <div class="card"><b>${tot.coverT ? Math.round((tot.cover / tot.coverT) * 100) : 0}%</b><span>bài trong Phụ lục 1 đã có tiết học (${tot.cover}/${tot.coverT})</span></div><div class="card"><b>${tot.gv}/${rows.length}</b><span>giáo viên đã sử dụng</span></div></div>
      <section class="card" style="margin-top:16px"><h2>8 tuần gần đây</h2><div class="td-weeks">${byW
        .map((x) => `<div class="td-w" title="${x.day} tiết dạy · ${x.soan} tiết soạn"><div class="td-col"><i class="d" style="height:${(x.day / maxW) * 100}%"></i><i class="s" style="height:${(x.soan / maxW) * 100}%"></i></div><span>${new Date(x.w).getDate()}/${new Date(x.w).getMonth() + 1}</span></div>`)
        .join("")}</div><div class="row small muted" style="gap:14px;margin-top:6px"><span><i class="td-dot d"></i> Tiết dạy trên hệ thống</span><span><i class="td-dot s"></i> Tiết soạn mới</span></div></section>
      <section class="card" style="margin-top:16px"><h2>Giáo viên</h2><div class="tbl-wrap"><table class="t td-tbl"><tr><th>Giáo viên</th><th>Soạn bài</th><th>Dạy trên hệ thống</th><th class="num">Tham gia TB</th><th>Báo giảng ${u.esc(nam.replace("-", "–"))}</th></tr>${rows
        .map(
          (r) => `<tr><td><div class="row nowrap" style="gap:10px">${L360.shell.avatar(r.t, 34)}<div><b>${u.esc(r.t.name || r.t.email || "")}</b><div class="tiny muted">${u.esc((r.t.subjects || []).map((s) => C.subjectName(s)).join(", "))}</div></div></div></td>
          <td><b>${r.soan}</b> tiết <span class="tiny muted">(${r.soan30} trong 30 ngày)</span>${bar(r.soan, maxS)}</td>
          <td><b>${r.day}</b> tiết <span class="tiny muted">${r.last ? "· gần nhất " + u.fmtDate(r.last) : ""}</span>${bar(r.day, maxD, "d")}</td>
          <td class="num">${r.part == null ? "–" : r.part + "%"}</td>
          <td>${r.bgWeeks ? `<b>Tuần ${r.bgLast}</b> <span class="tiny muted">(${r.bgWeeks} tuần đã báo)</span>` : `<span class="tiny muted">Chưa báo trên hệ thống</span>`}</td></tr>`
        )
        .join("")}</table></div></section>
      <section class="card" style="margin-top:16px"><div class="row"><h2 class="grow" style="margin:0">Soạn bài theo Phụ lục 1</h2>
        <select id="fMon"><option value="">Mọi môn</option>${mons.map((m) => `<option value="${m}" ${st.mon === m ? "selected" : ""}>${u.esc(C.subjectName(m))}</option>`).join("")}</select>
        <select id="fLop"><option value="">Mọi lớp</option>${[6, 7, 8, 9, 10, 11, 12].map((l) => `<option ${st.lop === String(l) ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        <div class="td-cover">${cover
          .map((c) => `<a class="td-cv" href="ppct.html?nam=${u.esc(nam)}&bang=${u.esc(c.id)}"><div class="row nowrap"><b class="grow ellipsis">${u.esc(c.name)}</b><span class="small">${c.done}/${c.total} bài</span></div>${bar(c.done, c.total, c.done >= c.total ? "ok" : "")}</a>`)
          .join("") || `<p class="muted">Chưa có Phụ lục 1 cho năm học này.</p>`}</div></section>`;
    u.$("#fMon").onchange = (e) => ((st.mon = e.target.value), draw());
    u.$("#fLop").onchange = (e) => ((st.lop = e.target.value), draw());
  }

  (async function init() {
    teacher = await L360.Auth.requireTeacher(app, { title: "Đăng nhập để xem tiến độ" });
    const ys = await P.years().catch(() => []);
    if (ys.length && !ys.includes(st.nam)) st.nam = ys[0];
    draw();
  })();
})();
