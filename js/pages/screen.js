/* Màn chiếu: chạy theo bảng điều khiển giáo viên; hiển thị nội dung, kết quả trực tiếp, bảng xếp hạng, bài nổi bật. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;
  const S = L360.store;
  const Room = L360.Room;
  const R = (u.qs("phong") || "").toUpperCase();
  const stage = u.$("#stage");
  let data = {};

  function fit() {
    const k = Math.min(window.innerWidth / 1600, window.innerHeight / 900);
    stage.style.transform = `translate(-50%,-50%) scale(${k})`;
  }
  window.addEventListener("resize", fit);
  fit();

  const joinUrl = () => {
    const base = location.href.replace(/manchieu\.html.*$/, "");
    return `${base}hocsinh.html?phong=${encodeURIComponent(R)}${/che-do=dien-tap/.test(location.search) ? "&che-do=dien-tap" : ""}`;
  };

  function headHtml(meta, pm, st) {
    const step = pm && st.step >= 0 ? pm.steps[st.step] : null;
    const label = step ? `Hoạt động ${st.step + 1}/${pm.steps.length}` : st.step < 0 ? "Phòng chờ" : "Tổng kết";
    return `<img src="assets/img/logo-hsh-trang.png" alt="Học Sử Hữu Hiệu"><div class="t"><small>LESSON 360° · ${u.esc([meta.subject, meta.grade ? "lớp " + meta.grade : ""].filter(Boolean).join(" "))} · ${label}</small>
      <b>${u.esc(step ? step.title : meta.title || "")}</b></div><div class="cartouche"><small>MÃ PHÒNG</small><b>${u.esc(R)}</b></div>`;
  }
  function progHtml(pm, st) {
    if (!pm) return "";
    return pm.steps
      .map((s, i) => `<div class="st ${i < st.step ? "done" : i === st.step ? "cur" : ""}" title="${u.esc(s.title)}"><span class="nd"></span>${i < pm.steps.length - 1 ? '<span class="ln"></span>' : ""}</div>`)
      .join("");
  }

  function lobby(el, meta) {
    const joined = Room.joined(data);
    const groups = meta.groups || [];
    el.innerHTML = `<div class="grid" style="grid-template-columns:460px 1fr;gap:40px;height:100%;align-items:center">
      <div class="center lobby-qr">${u.qr(joinUrl(), 8)}<p style="font-size:20px;margin-top:10px;word-break:break-all">${u.esc(joinUrl())}</p></div>
      <div><h1 style="font-size:52px;margin-bottom:6px">${u.esc(meta.title)}</h1><p class="scr-sub">${meta.className ? "Lớp " + u.esc(meta.className) + " · " : ""}Quét mã QR hoặc mở đường dẫn, chọn mã học sinh và nhóm.</p>
      <div class="row" style="margin:24px 0;gap:30px"><div><div class="big-n">${joined.length}/${meta.classSize}</div><div class="muted">học sinh đã vào lớp</div></div></div>
      <div class="grid" style="grid-template-columns:repeat(${Math.max(1, groups.length)},1fr);gap:12px">${groups
        .map((g) => `<div class="card center" style="border-top:6px solid ${g.color};padding:14px"><b style="color:${g.color}">${u.esc(g.name)}</b><div class="big-n" style="font-size:44px">${
          joined.filter(([, r]) => r.group === g.id).length
        }</div></div>`)
        .join("")}</div></div></div>`;
  }
  function board(el) {
    // Màn chiếu không giữ đáp án gốc: tính điểm từ đáp án đã công bố.
    const pm = data.pub && data.pub.meta;
    const answers = (data.pub && data.pub.answers) || {};
    const roster = data.roster || {};
    const scores = {};
    (pm ? pm.steps : []).forEach((s) => {
      if (s.type !== "quiz") return;
      for (let i = 0; i < (s.count || 0); i++) {
        const key = `${s.id}__q${i}`;
        const a = answers[key];
        if (!a) continue;
        u.entries(data.subs && data.subs[key]).forEach(([c, x]) => {
          scores[c] = (scores[c] || 0) + (x.v === a.answer ? 100 : 0);
        });
      }
    });
    const list = Object.keys(roster)
      .filter((c) => roster[c].uid)
      .map((c) => ({ c, n: roster[c].name || c, g: roster[c].group, p: scores[c] || 0 }))
      .sort((a, b) => b.p - a.p);
    const groups = (data.meta.groups || []).map((g) => {
      const m = list.filter((x) => x.g === g.id);
      return Object.assign({}, g, { avg: m.length ? Math.round(m.reduce((s, x) => s + x.p, 0) / m.length) : 0 });
    });
    groups.sort((a, b) => b.avg - a.avg);
    const gmap = Object.fromEntries((data.meta.groups || []).map((g) => [g.id, g]));
    el.innerHTML = `<div class="grid" style="grid-template-columns:1.2fr 1fr;gap:34px"><div><h2 style="font-size:32px">Bảng xếp hạng</h2>${list
      .slice(0, 8)
      .map(
        (x, i) => `<div class="board-row"><b style="font-size:30px;color:${i < 3 ? "var(--accent)" : "var(--muted)"}">${i + 1}</b><span>${u.esc(x.n)} ${gmap[x.g] ? ui.gbadge(gmap[x.g]) : ""}</span><b class="right">${x.p}</b></div>`
      )
      .join("")}</div><div><h2 style="font-size:32px">Điểm trung bình nhóm</h2>${ui.bars(
      groups.map((g) => ({ label: u.esc(g.name), value: g.avg, color: g.color })),
      { showPct: false }
    )}<p class="muted" style="margin-top:20px">Điểm không tính tốc độ – chỉ tính câu trả lời đúng.</p></div></div>`;
  }
  function featured(el, key) {
    const f = u.vals(data.pub && data.pub.featured && data.pub.featured[key]).filter((x) => typeof x === "string");
    el.innerHTML = f.length
      ? `<h2 style="font-size:32px">Bài nổi bật</h2><div class="scr-feats">${f.map((t) => `<blockquote class="scr-feat">“${u.esc(t)}”</blockquote>`).join("")}</div>`
      : `<div class="scr-center"><h2>Chưa có bài được gắn ★</h2></div>`;
  }
  function summary(el) {
    const sid = data.meta && data.meta.sid;
    const show = (s) => {
      if (!s) {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:56px">Cảm ơn các em!</h1><p class="scr-sub">${u.esc(data.meta.title || "")}</p></div>`;
        return;
      }
      el.innerHTML = `<h1 style="font-size:40px">Tổng kết tiết học</h1><div class="grid g4" style="margin:18px 0">
        <div class="kpi"><b>${s.joined}</b><span>học sinh tham gia</span></div>
        <div class="kpi"><b>${s.participation == null ? "–" : s.participation + "%"}</b><span>tỉ lệ nộp bài trung bình</span></div>
        <div class="kpi"><b>${s.correctRate == null ? "–" : s.correctRate + "%"}</b><span>trả lời đúng (câu có đáp án)</span></div>
        <div class="kpi"><b>${s.interactive}</b><span>lượt hoạt động tương tác</span></div></div>
        ${
          s.peer && s.peer.length
            ? `<h2>Học từ bạn: vòng 1 → vòng 2</h2>${s.peer.map((p) => `<p style="font-size:26px">${u.esc(p.title)}: <b>${p.r1}%</b> → <b style="color:var(--ok)">${p.r2}%</b> trả lời đúng</p>`).join("")}`
            : ""
        }
        ${s.hard && s.hard.length ? `<h2 style="margin-top:14px">Cần củng cố</h2>${s.hard.map((h) => `<p style="font-size:22px">${u.esc(h.label)} – ${h.correct}% đúng</p>`).join("")}` : ""}`;
    };
    if (sid) S.get(`sessions/${sid}`).then((x) => (show(x), fitMain(u.$("#sm"), el)));
    else show(null);
  }

  // Nội dung dài: tự thu nhỏ để không bị cắt trên màn chiếu.
  function fitMain(box, inner) {
    inner.style.zoom = 1;
    const avail = box.clientHeight - 56;
    const need = inner.scrollHeight;
    if (need > avail) inner.style.zoom = Math.max(0.6, avail / need);
  }
  const render = u.throttleRaf(() => {
    const meta = data.meta;
    if (!meta) {
      stage.innerHTML = `<div class="scr-center" style="grid-row:1/4"><h1>Đang chờ phòng ${u.esc(R)}…</h1><p class="muted">Mở màn chiếu từ bảng điều khiển giáo viên (đã đăng nhập).</p></div>`;
      return;
    }
    const pm = data.pub && data.pub.meta;
    const st = data.state || { step: -1 };
    ui.timerState = st;
    L360.shell.theme(pm && pm.theme);
    if (!stage.querySelector(".s-head"))
      stage.innerHTML = `<div class="s-head"></div><div class="s-prog"></div><div class="s-body"><div class="s-main" id="sm"></div><aside class="s-side" id="side"></aside></div>`;
    u.$(".s-head", stage).innerHTML = headHtml(meta, pm, st);
    u.$(".s-prog", stage).innerHTML = progHtml(pm, st);
    const mainBox = u.$("#sm", stage);
    if (!u.$("#smi", mainBox)) mainBox.innerHTML = `<div id="smi"></div>`;
    const main = u.$("#smi", mainBox);
    main.style.zoom = 1;
    const side = u.$("#side", stage);
    requestAnimationFrame(() => fitMain(mainBox, main));
    const step = pm && st.step >= 0 ? pm.steps[st.step] : null;
    const joined = Room.joined(data);
    const groups = meta.groups || [];
    // Cột thông số
    let key = null;
    let n = 0;
    let denom = joined.length;
    if (step) {
      key = L360.subKey(step, st);
      n = step.groupMode ? Object.keys((data.gsubs && data.gsubs[key]) || {}).length : Object.keys((data.subs && data.subs[key]) || {}).length;
      if (step.groupMode) denom = groups.length;
    }
    const rem = Room.remaining(st);
    const p = rem != null && st.dur ? Math.max(0, Math.min(100, (rem / st.dur) * 100)) : 0;
    side.innerHTML = `<div class="sun" style="--p:${p}%">${ui.timer()}</div>
      ${step && !step.noSubmit ? `<div><div class="lbl">${step.groupMode ? "Nhóm đã nộp" : "Đã nộp"}</div><div class="big-n">${n}/${denom}</div></div>` : `<div><div class="lbl">Sĩ số</div><div class="big-n">${joined.length}</div></div>`}
      <div><div class="lbl">Pha</div><div style="font-size:24px;font-weight:700">${step ? ui.phaseLabel(st, step) : st.step < 0 ? "Phòng chờ" : "Kết thúc"}</div></div>
      <div style="margin-top:auto"><div class="lbl">Tiết học</div><div style="font-size:30px;font-weight:800" data-clock>0:00</div></div>`;
    if (st.step < 0) return lobby(main, meta);
    if (!step) return summary(main);
    if (st.screen === "board") return board(main);
    if (st.screen === "featured") return featured(main, key);
    const T = L360.types[step.type];
    if (!T || !T.screen) return (main.innerHTML = `<h1>${u.esc(step.title)}</h1>`);
    const ctx = {
      data: Object.assign({ subs: {}, gsubs: {}, roster: {}, pub: {} }, data),
      state: st,
      step,
      key,
      item: data.pub && data.pub.items && data.pub.items[key],
      answer: data.pub && data.pub.answers && data.pub.answers[key],
      subs: (data.subs && data.subs[key]) || {},
      gsubs: (data.gsubs && data.gsubs[key]) || {},
      joined: joined.length,
      joinedCodes: joined.map(([c]) => c),
      groups,
      featured: data.pub && data.pub.featured && data.pub.featured[key],
      mode: st.screen === "live" ? "live" : "content",
      nameOf: (c) => (data.roster && data.roster[c] && data.roster[c].name) || c
    };
    T.screen(main, ctx);
  });

  (async function init() {
    await S.ready;
    if (!R) {
      stage.innerHTML = `<div class="scr-center" style="grid-row:1/4"><h1>Thiếu mã phòng</h1></div>`;
      return;
    }
    S.on(`rooms/${R}`, (v) => {
      data = v || {};
      render();
    });
    setInterval(() => {
      const st = data.state;
      if (st && st.phase === "open") render();
    }, 1000);
  })();
})();
