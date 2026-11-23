/* INSIGHT – Dữ liệu 360: minh chứng tự động từ các tiết dạy.
   Giáo viên thấy tiết của mình; tổ trưởng thấy cả tổ và ghi phiếu nhận xét tiết dạy (tiêu chí CV 5512). */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const S = L360.store;
  const app = u.$("#app");
  let teacher = null;
  let all = [];
  let reviews = {};
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
        <span class="spacer"></span><button class="btn" id="csv">${L360.icon("download")} CSV</button><button class="btn primary" id="prt">${L360.icon("print")} In báo cáo</button></div></section>
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
      <section class="card" style="margin-top:16px"><h3>Nhật ký tiết học</h3><table class="t"><tr><th>Ngày</th><th>Giáo viên</th><th>Lớp</th><th>Bài học</th><th class="num">HS</th><th class="num">Tham gia</th><th class="num">Đúng</th><th>Ghi chú</th><th class="no-print">Nhận xét của tổ</th></tr>${list
        .map(
          (s) => `<tr><td>${u.fmtDate(s.startedAt)}</td><td>${u.esc(s.teacherName)}</td><td>${u.esc(s.className || "")}</td><td>${u.esc(s.title)}<br><span class="tiny muted">${u.esc(s.subject)} ${u.esc(
            s.grade
          )}${s.mode === "local" ? " · diễn tập" : ""}</span></td><td class="num">${s.joined}</td><td class="num">${fmtPct(s.participation)}</td><td class="num">${fmtPct(s.correctRate)}</td><td class="small">${u.esc(
            (s.feedback && s.feedback.note) || ""
          )}</td><td class="no-print">${reviews[s.sid] ? `<button class="btn sm" data-rv="${u.esc(s.sid)}">${L360.icon("doc")} ${u.esc(reviews[s.sid].xep || "Xem")}</button>` : teacher.isLeader && s.teacherUid !== teacher.uid ? `<button class="btn sm primary" data-rv="${u.esc(s.sid)}">Nhận xét</button>` : teacher.isLeader ? `<button class="btn sm ghost" data-rv="${u.esc(s.sid)}">Tự nhận xét</button>` : `<span class="tiny muted">–</span>`}</td></tr>`
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
    u.$$("[data-rv]").forEach((b) => (b.onclick = () => review(all.find((x) => x.sid === b.dataset.rv))));
  }

  /* ---------- Phiếu nhận xét tiết dạy (tổ trưởng) ---------- */
  const TIEU_CHI = [
    ["Kế hoạch và tài liệu dạy học", ["Mức độ phù hợp của chuỗi hoạt động học với mục tiêu, nội dung và phương pháp dạy học được sử dụng.", "Mức độ rõ ràng của mục tiêu, nội dung, kĩ thuật tổ chức và sản phẩm cần đạt được của mỗi nhiệm vụ học tập.", "Mức độ phù hợp của thiết bị dạy học và học liệu được sử dụng để tổ chức các hoạt động học của học sinh.", "Mức độ hợp lí của phương án kiểm tra, đánh giá trong quá trình tổ chức hoạt động học của học sinh."]],
    ["Tổ chức hoạt động học cho học sinh", ["Mức độ sinh động, hấp dẫn học sinh của phương pháp và hình thức chuyển giao nhiệm vụ học tập.", "Khả năng theo dõi, quan sát, phát hiện kịp thời những khó khăn của học sinh.", "Mức độ phù hợp, hiệu quả của các biện pháp hỗ trợ và khuyến khích học sinh hợp tác, giúp đỡ nhau khi thực hiện nhiệm vụ học tập.", "Mức độ hiệu quả hoạt động của giáo viên trong việc tổng hợp, phân tích, đánh giá kết quả hoạt động và quá trình thảo luận của học sinh."]],
    ["Hoạt động của học sinh", ["Khả năng tiếp nhận và sẵn sàng thực hiện nhiệm vụ học tập của tất cả học sinh trong lớp.", "Mức độ tích cực, chủ động, sáng tạo, hợp tác của học sinh trong việc thực hiện các nhiệm vụ học tập.", "Mức độ tham gia tích cực của học sinh trong trình bày, trao đổi, thảo luận về kết quả thực hiện nhiệm vụ học tập.", "Mức độ đúng đắn, chính xác, phù hợp của các kết quả thực hiện nhiệm vụ học tập của học sinh."]]
  ];
  const MUC = ["Tốt", "Khá", "Đạt", "Chưa đạt"];
  async function review(s) {
    if (!s) return;
    const r = reviews[s.sid] || {};
    const can = teacher.isLeader && (!r.by || r.by === teacher.uid);
    let n = 0;
    const m = u.modal(
      `<div class="row"><h2 class="grow" style="margin:0">Phiếu nhận xét tiết dạy</h2><button class="btn sm ghost" data-close>Đóng</button></div>
      <p class="small muted">${u.esc(s.teacherName)} · ${u.esc(s.className || "")} · ${u.esc(s.label || "")} ${u.esc(s.title)} · ${u.fmtDate(s.startedAt)}<br>Tiêu chí đánh giá bài dạy theo CV 5512/BGDĐT-GDTrH. Số liệu học sinh của tiết: tham gia ${fmtPct(s.participation)}, trả lời đúng ${fmtPct(s.correctRate)}.</p>
      <table class="t small"><tr><th>Nội dung</th><th>Tiêu chí</th>${MUC.map((x) => `<th class="num">${x}</th>`).join("")}</tr>${TIEU_CHI.map(([g, list]) =>
        list
          .map((t, j) => {
            const i = n++;
            return `<tr>${j === 0 ? `<td rowspan="${list.length}"><b>${g}</b></td>` : ""}<td>${i + 1}. ${t}</td>${MUC.map((x) => `<td class="num"><input type="radio" name="tc${i}" value="${x}" ${(r.muc || [])[i] === x ? "checked" : ""} ${can ? "" : "disabled"}></td>`).join("")}</tr>`;
          })
          .join("")
      ).join("")}</table>
      <div class="grid g3" style="margin-top:10px"><label class="field">Ưu điểm<textarea id="uu" rows="3" ${can ? "" : "readonly"}>${u.esc(r.uu || "")}</textarea></label><label class="field">Hạn chế<textarea id="han" rows="3" ${can ? "" : "readonly"}>${u.esc(r.han || "")}</textarea></label><label class="field">Đề xuất<textarea id="de" rows="3" ${can ? "" : "readonly"}>${u.esc(r.de || "")}</textarea></label></div>
      <div class="row" style="margin-top:10px"><label class="field">Xếp loại chung<select id="xep" ${can ? "" : "disabled"}><option value="">–</option>${MUC.map((x) => `<option ${r.xep === x ? "selected" : ""}>${x}</option>`).join("")}</select></label>
        <span class="spacer"></span>${r.byName ? `<span class="small muted">Người nhận xét: ${u.esc(r.byName)}${r.at ? " · " + u.fmtDate(r.at) : ""}</span>` : ""}<button class="btn" onclick="print()">${L360.icon("print")} In</button>${can ? `<button class="btn primary" id="rvok">Lưu phiếu</button>` : ""}</div>`,
      { wide: true }
    );
    if (!can) return;
    u.$("#rvok", m.el).onclick = async () => {
      const muc = Array.from({ length: n }, (_, i) => (u.$(`input[name=tc${i}]:checked`, m.el) || {}).value || "");
      const rec = { by: teacher.uid, byName: teacher.name || teacher.email || "", at: S.TS, teacherUid: s.teacherUid, muc, uu: u.$("#uu", m.el).value.trim(), han: u.$("#han", m.el).value.trim(), de: u.$("#de", m.el).value.trim(), xep: u.$("#xep", m.el).value };
      try {
        await S.set(`reviews/${s.sid}`, rec);
        reviews[s.sid] = Object.assign({}, rec, { at: Date.now() });
        m.close();
        u.toast("Đã lưu phiếu nhận xét.", "ok");
        draw();
      } catch (e) {
        u.toast("Không lưu được: " + (e.message || e), "bad");
      }
    };
  }

  (async function init() {
    await S.ready;
    teacher = await L360.Auth.requireTeacher(app, { title: "Dữ liệu 360 – đăng nhập" });
    const lead = teacher.isLeader;
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(teacher)}`, { sub: "Dữ liệu 360 – minh chứng tiết dạy", nav: "dulieu" }) +
      `<main class="wrap"><div class="row"><div class="grow"><h1 style="margin:0">${lead ? "Dữ liệu của tổ" : "Dữ liệu tiết dạy của tôi"}</h1><p class="muted" style="margin:4px 0 0">${
        lead ? "Tổ trưởng xem toàn bộ tiết dạy của tổ và ghi phiếu nhận xét." : "Minh chứng tự động từ các tiết thầy cô dạy bằng Lesson 360°. Tổ trưởng xem được để nhận xét, đánh giá."
      } · ${u.esc(L360.cfg.school)}</p></div>
      <span class="small muted print-only">In lúc ${u.fmtDateTime(Date.now())}</span></div><div id="body" style="margin-top:14px"><p class="muted">Đang tải…</p></div></main>` +
      L360.shell.footer();
    L360.shell.bindUserMenu(teacher);
    if (!lead) F.mine = false;
    const loadReviews = async () => {
      if (lead) reviews = (await S.get("reviews").catch(() => null)) || {};
      else {
        reviews = {};
        await Promise.all(all.map(async (x) => {
          const r = await S.get(`reviews/${x.sid}`).catch(() => null);
          if (r) reviews[x.sid] = r;
        }));
      }
    };
    if (lead)
      S.on("sessions", async (v) => {
        all = u.vals(v).filter((s) => s && s.startedAt);
        await loadReviews();
        draw();
      });
    else {
      const v = await S.query("sessions", "teacherUid", teacher.uid).catch(() => ({}));
      all = u.vals(v).filter((s) => s && s.startedAt);
      await loadReviews();
      draw();
    }
  })();
})();
