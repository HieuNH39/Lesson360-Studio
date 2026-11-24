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
    let survey = {};
    if (lead) survey = (await S.get("pilot/survey").catch(() => null)) || {};
    else {
      const mine = await S.get(`pilot/survey/${teacher.uid}`).catch(() => null);
      if (mine) survey = { [teacher.uid]: mine };
    }
    return { lead, teachers, meta: u.vals(meta).filter((m) => m && m.by), sessions: u.vals(sessions).filter((x) => x && x.startedAt), reports, docs, survey };
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
      ${pilotCard(d)}
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
    bindPilot(d);
    if (location.hash === "#khaosat") setTimeout(() => surveyForm(d), 300);
    u.$("#fMon").onchange = (e) => ((st.mon = e.target.value), draw());
    u.$("#fLop").onchange = (e) => ((st.lop = e.target.value), draw());
  }

  /* ---------- Đo thí điểm: 3 nguồn số liệu, không thêm việc cho giáo viên ----------
     (1) Tự động sau mỗi tiết dạy trên hệ thống: HS tham gia, tỉ lệ đúng, thời gian soạn, GV đánh giá dễ dùng.
     (2) Học sinh góp ý 2 chạm ở màn hình cuối tiết: thích tiết học? hiểu bài ở mức nào?
     (3) Giáo viên làm khảo sát 6 câu (2 phút) một lần, sửa lại được trước khi tổng kết. */
  const FEATS = ["Soạn giáo án (PL4)", "Tiết học tương tác", "Dạy học trên lớp", "Nhận xét học sinh", "Báo giảng", "Thư viện của trường"];
  const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
  const avg1 = (arr) => {
    const v = arr.filter((x) => x != null && !isNaN(x));
    return v.length ? Math.round((v.reduce((a, b) => a + Number(b), 0) / v.length) * 10) / 10 : null;
  };
  function pilotStats(d, from, to) {
    const ses = d.sessions.filter((s) => (!from || s.startedAt >= from) && (!to || s.startedAt <= to));
    let thich = 0,
      nv = 0,
      hieu = 0,
      nh = 0,
      hsN = 0;
    ses.forEach((s) => {
      if (!s.hs) return;
      hsN += s.hs.n || 0;
      const v = s.hs.vui || [];
      const h = s.hs.hieu || [];
      nv += v.reduce((a, b) => a + (b || 0), 0);
      thich += (v[2] || 0) + (v[3] || 0);
      nh += h.reduce((a, b) => a + (b || 0), 0);
      hieu += (h[1] || 0) + (h[2] || 0);
    });
    const sv = u.vals(d.survey).filter((x) => x && x.at);
    const truoc = avg1(sv.map((x) => x.truoc));
    const sau = avg1(sv.map((x) => x.sau));
    return {
      ses,
      gv: new Set(ses.map((s) => s.teacherUid)).size,
      lop: new Set(ses.map((s) => s.className).filter(Boolean)).size,
      hsLuot: ses.reduce((a, s) => a + (s.joined || 0), 0),
      part: avg1(ses.map((s) => s.participation)),
      dung: avg1(ses.map((s) => s.correctRate)),
      prep: avg1(ses.map((s) => s.prepMinutes)),
      prepN: ses.filter((s) => s.prepMinutes).length,
      ease: avg1(ses.map((s) => s.feedback && s.feedback.ease)),
      engage: avg1(ses.map((s) => s.feedback && s.feedback.engage)),
      hsN,
      thich: pct(thich, nv),
      hieu: pct(hieu, nh),
      sv,
      truoc,
      sau,
      tietKiem: truoc && sau && truoc > sau ? Math.round(((truoc - sau) / truoc) * 100) : null,
      de: avg1(sv.map((x) => x.de)),
      ich: avg1(sv.map((x) => x.ich))
    };
  }
  function pilotCard(d) {
    const p = pilotStats(d);
    const mine = d.survey[teacher.uid];
    const k = (v, unit, label) => `<div class="td-pk"><b>${v == null ? "–" : v + unit}</b><span>${label}</span></div>`;
    return `<section class="card td-pilot" id="khaosat" style="margin-top:16px"><div class="row" style="align-items:flex-start;gap:12px"><div class="grow"><h2 style="margin:0">Thí điểm Lesson 360°</h2>
      <p class="small muted" style="margin:4px 0 0">Số liệu tự thu sau mỗi tiết dạy trên hệ thống và từ góp ý 2 chạm của học sinh cuối tiết. Giáo viên chỉ làm thêm một khảo sát 6 câu.</p></div>
      <div class="row" style="gap:8px;flex-wrap:wrap;justify-content:flex-end"><button class="btn ${mine ? "" : "primary"}" id="pvSurvey">${L360.icon(mine ? "check" : "edit")} ${mine ? "Sửa khảo sát của tôi" : "Làm khảo sát (2 phút)"}</button>
      ${d.lead ? `<button class="btn" id="pvXlsx">${L360.icon("download")} Báo cáo thí điểm (Excel)</button>` : ""}</div></div>
      <div class="td-pks">${k(p.ses.length, "", "tiết dạy trên hệ thống")}${k(p.hsLuot, "", "lượt học sinh tham gia")}${k(p.thich, "%", `HS thích tiết học (${p.hsN} góp ý)`)}${k(p.hieu, "%", "HS tự đánh giá hiểu bài")}${k(p.prep, " ph", "soạn 1 tiết với Lesson 360° (TB)")}${k(
      p.tietKiem,
      "%",
      `thời gian soạn tiết kiệm (khảo sát ${p.sv.length} GV)`
    )}</div></section>`;
  }
  function bindPilot(d) {
    if (u.$("#pvSurvey")) u.$("#pvSurvey").onclick = () => surveyForm(d);
    if (u.$("#pvXlsx")) u.$("#pvXlsx").onclick = () => reportForm(d);
  }
  function surveyForm(d) {
    const o = Object.assign({ dung: [] }, d.survey[teacher.uid] || {});
    const sc = (id, v) => `<div class="fb-opts">${[1, 2, 3, 4, 5].map((n) => `<button class="fb-o ${Number(v) === n ? "on" : ""}" data-sc="${id}" data-v="${n}">${n}</button>`).join("")}</div>`;
    const m = u.modal(`<h2>Khảo sát thí điểm (6 câu)</h2><p class="small muted">Trả lời theo trải nghiệm thật của thầy cô. Có thể sửa lại bất cứ lúc nào trước buổi tổng kết.</p>
      <label class="field">1. Trước đây, soạn một tiết (giáo án + bài giảng trình chiếu) mất khoảng bao nhiêu phút?<input id="q1" type="number" min="0" max="1000" value="${o.truoc || ""}" placeholder="VD: 180"></label>
      <label class="field" style="margin-top:10px">2. Khi dùng Lesson 360°, soạn một tiết mất khoảng bao nhiêu phút (kể cả thời gian chỉnh sửa)?<input id="q2" type="number" min="0" max="1000" value="${o.sau || ""}" placeholder="VD: 60"></label>
      <p class="fb-q">3. Lesson 360° dễ dùng ở mức nào? <span class="tiny muted">(1 = rất khó · 5 = rất dễ)</span></p>${sc("de", o.de)}
      <p class="fb-q">4. Lesson 360° hữu ích cho công việc ở mức nào? <span class="tiny muted">(1 = không hữu ích · 5 = rất hữu ích)</span></p>${sc("ich", o.ich)}
      <p class="fb-q">5. Thầy cô dùng những tính năng nào? <span class="tiny muted">(chọn nhiều)</span></p><div class="chips">${FEATS.map((f) => `<button class="chip ${o.dung.includes(f) ? "sel" : ""}" data-ft="${u.esc(f)}">${u.esc(f)}</button>`).join("")}</div>
      <label class="field" style="margin-top:12px">6. Điều cần cải tiến / góp ý khác<textarea id="q6" rows="3">${u.esc(o.gopy || "")}</textarea></label>
      <div class="row" style="justify-content:flex-end;margin-top:16px;gap:8px"><button class="btn" data-close>Đóng</button><button class="btn primary" id="sv">Gửi khảo sát</button></div>`);
    u.$$("[data-sc]", m.el).forEach(
      (b) =>
        (b.onclick = () => {
          o[b.dataset.sc] = Number(b.dataset.v);
          u.$$(`[data-sc="${b.dataset.sc}"]`, m.el).forEach((x) => x.classList.toggle("on", x === b));
        })
    );
    u.$$("[data-ft]", m.el).forEach(
      (b) =>
        (b.onclick = () => {
          const f = b.dataset.ft;
          o.dung = o.dung.includes(f) ? o.dung.filter((x) => x !== f) : o.dung.concat(f);
          b.classList.toggle("sel", o.dung.includes(f));
        })
    );
    u.$("#sv", m.el).onclick = async () => {
      const rec = {
        name: teacher.name || "",
        truoc: Number(u.$("#q1", m.el).value) || null,
        sau: Number(u.$("#q2", m.el).value) || null,
        de: o.de || null,
        ich: o.ich || null,
        dung: o.dung,
        gopy: u.$("#q6", m.el).value.trim().slice(0, 1000),
        at: Date.now()
      };
      if (!rec.truoc || !rec.sau || !rec.de || !rec.ich) return u.toast("Thầy cô trả lời giúp câu 1–4 nhé.", "bad", 3000);
      try {
        await S.set(`pilot/survey/${teacher.uid}`, rec);
        m.close();
        u.toast("Cảm ơn thầy cô đã góp ý!", "ok", 3000);
        draw();
      } catch (e) {
        u.toast("Chưa gửi được: " + ((e && (e.code || e.message)) || e), "bad", 5000);
      }
    };
  }
  function reportForm(d) {
    const first = d.sessions.reduce((a, s) => Math.min(a, s.startedAt), Date.now());
    const m = u.modal(`<h2>Báo cáo thí điểm</h2><p class="small muted">Tệp Excel 3 trang: Tổng hợp · Từng tiết học · Khảo sát giáo viên. Mọi con số lấy thẳng từ hệ thống – dùng làm minh chứng.</p>
      <div class="grid g2"><label class="field">Từ ngày<input id="rf" type="date" value="${u.isoDay(first)}"></label><label class="field">Đến ngày<input id="rt" type="date" value="${u.isoDay(Date.now())}"></label></div>
      <div class="row" style="justify-content:flex-end;margin-top:16px;gap:8px"><button class="btn" data-close>Huỷ</button><button class="btn primary" id="go">${L360.icon("download")} Tải báo cáo</button></div>`);
    u.$("#go", m.el).onclick = async () => {
      const from = new Date(u.$("#rf", m.el).value + "T00:00:00").getTime() || 0;
      const to = new Date(u.$("#rt", m.el).value + "T23:59:59").getTime() || Date.now();
      await exportPilot(d, from, to);
      m.close();
    };
  }
  async function exportPilot(d, from, to) {
    await u.loadScript("js/vendor/xlsx.full.min.js");
    const X = window.XLSX;
    const p = pilotStats(d, from, to);
    const nm = (uid) => (d.teachers[uid] && d.teachers[uid].name) || "";
    const soan = d.meta.filter((x) => (x.up || 0) >= from && (x.up || 0) <= to);
    const bg = Object.values(d.reports || {}).reduce((a, r) => a + u.vals(r && r[st.nam]).filter(Boolean).length, 0);
    const f = (v, unit = "") => (v == null ? "Chưa có số liệu" : v + unit);
    const sum = [
      ["BÁO CÁO THÍ ĐIỂM LESSON 360° STUDIO"],
      [`${L360.cfg.school || ""} – ${L360.cfg.unit || ""}`],
      [`Thời gian: ${u.fmtDate(from)} – ${u.fmtDate(to)} · Xuất ngày ${u.fmtDate(Date.now())}`],
      [],
      ["Chỉ số", "Giá trị", "Nguồn số liệu"],
      ["Giáo viên dạy trên hệ thống", p.gv, "Tổng kết tự động sau mỗi tiết"],
      ["Tiết học mới soạn trong thư viện", soan.length, "Thư viện của trường"],
      ["Tiết dạy trên hệ thống", p.ses.length, "Tổng kết tự động sau mỗi tiết"],
      ["Số lớp", p.lop, "Tổng kết tự động sau mỗi tiết"],
      ["Lượt học sinh tham gia", p.hsLuot, "Tổng kết tự động sau mỗi tiết"],
      ["Tỉ lệ học sinh trả lời các hoạt động (TB)", f(p.part, "%"), "Tổng kết tự động sau mỗi tiết"],
      ["Tỉ lệ trả lời đúng (TB)", f(p.dung, "%"), "Tổng kết tự động sau mỗi tiết"],
      ["Học sinh thích tiết học (Rất thích + Thích)", f(p.thich, "%"), `Góp ý 2 chạm cuối tiết – ${p.hsN} lượt`],
      ["Học sinh tự đánh giá hiểu bài (Hiểu hết + Hiểu phần lớn)", f(p.hieu, "%"), `Góp ý 2 chạm cuối tiết – ${p.hsN} lượt`],
      ["Thời gian soạn 1 tiết với Lesson 360° (TB, phút)", f(p.prep), `Ghi nhận khi kết thúc tiết – ${p.prepN} tiết`],
      ["GV đánh giá dễ dùng sau tiết dạy (1–5)", f(p.ease), "Phiếu kết thúc tiết của giáo viên"],
      ["GV đánh giá học sinh hứng thú (1–5)", f(p.engage), "Phiếu kết thúc tiết của giáo viên"],
      ["Số giáo viên trả lời khảo sát", p.sv.length, "Khảo sát thí điểm 6 câu"],
      ["Thời gian soạn 1 tiết trước đây (TB, phút)", f(p.truoc), "Khảo sát thí điểm – câu 1"],
      ["Thời gian soạn 1 tiết khi dùng Lesson 360° (TB, phút)", f(p.sau), "Khảo sát thí điểm – câu 2"],
      ["Thời gian soạn tiết kiệm được", f(p.tietKiem, "%"), "Tính từ câu 1 và câu 2"],
      ["Mức dễ dùng (1–5)", f(p.de), "Khảo sát thí điểm – câu 3"],
      ["Mức hữu ích (1–5)", f(p.ich), "Khảo sát thí điểm – câu 4"],
      [`Số tuần báo giảng tạo trên hệ thống (năm học ${st.nam})`, bg, "Báo giảng CSDL"]
    ];
    const ws1 = X.utils.aoa_to_sheet(sum);
    ws1["!cols"] = [{ wch: 58 }, { wch: 18 }, { wch: 44 }];
    const head2 = ["Ngày", "Giáo viên", "Lớp", "Môn", "Bài / tiết", "HS tham gia", "Tham gia (%)", "Đúng (%)", "HS góp ý", "HS thích (%)", "HS hiểu bài (%)", "Phút soạn", "GV: dễ dùng", "GV: HS hứng thú", "Ghi chú"];
    const rows2 = p.ses
      .slice()
      .sort((a, b) => a.startedAt - b.startedAt)
      .map((s) => [u.fmtDate(s.startedAt), s.teacherName || nm(s.teacherUid), s.className || "", s.subject || "", s.title || s.label || "", s.joined || 0, s.participation, s.correctRate, s.hs ? s.hs.n : "", s.hs ? s.hs.thich : "", s.hs ? s.hs.hieuBai : "", s.prepMinutes || "", s.feedback ? s.feedback.ease : "", s.feedback ? s.feedback.engage : "", (s.feedback && s.feedback.note) || ""]);
    const ws2 = X.utils.aoa_to_sheet([head2].concat(rows2));
    ws2["!cols"] = [10, 24, 8, 14, 40, 10, 11, 9, 9, 11, 13, 9, 10, 13, 40].map((w) => ({ wch: w }));
    const head3 = ["Giáo viên", "Trước đây (phút/tiết)", "Với Lesson 360° (phút/tiết)", "Tiết kiệm (%)", "Dễ dùng (1–5)", "Hữu ích (1–5)", "Tính năng đã dùng", "Góp ý", "Thời điểm"];
    const rows3 = Object.entries(d.survey)
      .filter(([, x]) => x && x.at)
      .map(([uid, x]) => [x.name || nm(uid), x.truoc, x.sau, x.truoc && x.sau ? Math.round(((x.truoc - x.sau) / x.truoc) * 100) : "", x.de, x.ich, (x.dung || []).join(", "), x.gopy || "", u.fmtDate(x.at)]);
    const ws3 = X.utils.aoa_to_sheet([head3].concat(rows3));
    ws3["!cols"] = [24, 18, 22, 12, 12, 12, 46, 50, 12].map((w) => ({ wch: w }));
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws1, "Tổng hợp");
    X.utils.book_append_sheet(wb, ws2, "Từng tiết học");
    X.utils.book_append_sheet(wb, ws3, "Khảo sát GV");
    const out = X.write(wb, { bookType: "xlsx", type: "array" });
    const dd = (t) => u.isoDay(t).split("-").reverse().join("");
    u.downloadBlob(`BaoCao_ThiDiem_Lesson360_${dd(from)}-${dd(to)}.xlsx`, new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    u.toast("Đã tải báo cáo thí điểm.", "ok");
  }

  (async function init() {
    teacher = await L360.Auth.requireTeacher(app, { title: "Đăng nhập để xem tiến độ" });
    const ys = await P.years().catch(() => []);
    if (ys.length && !ys.includes(st.nam)) st.nam = ys[0];
    draw();
  })();
})();
