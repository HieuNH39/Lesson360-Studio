/* Màn chiếu: chạy theo bảng điều khiển giáo viên; hiển thị nội dung theo phong cách bài học, kết quả trực tiếp,
   bảng xếp hạng, bài nổi bật, gọi tên ngẫu nhiên; có âm thanh cho đồng hồ và hiệu ứng. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;
  const S = L360.store;
  const Room = L360.Room;
  const snd = L360.sound;
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
    const where = step ? `Hoạt động ${st.step + 1}/${pm.steps.length}` : st.step < 0 ? "Phòng chờ" : "Tổng kết";
    const sub = [pm && pm.subject, pm && pm.grade ? "lớp " + pm.grade : "", pm && pm.label, where].filter(Boolean).map(u.esc).join(" · ");
    return `<img class="hsh" src="assets/img/logo-hsh-muc.png" alt="Học Sử Hữu Hiệu"><div class="t"><small>${step ? `<span class="ph ph-${step.phase}">${u.esc(L360.phase(step.phase).name)}</span>` : ""}${sub}</small>
      <b>${u.esc(step ? step.title : (pm && pm.title) || meta.title || "")}</b></div><div class="cartouche"><small>MÃ PHÒNG</small><b>${u.esc(R)}</b></div>`;
  }
  // Thanh tiến trình theo 4 pha.
  function progHtml(pm, st) {
    if (!pm) return "";
    const legend = L360.PHASES.filter((ph) => pm.steps.some((s) => s.phase === ph.id))
      .map((ph) => `<span class="rb-lg ph-${ph.id} ${pm.steps[st.step] && pm.steps[st.step].phase === ph.id ? "on" : ""}">${ph.name}</span>`)
      .join("");
    return `<div class="rb-legend">${legend}</div>${ui.ribbon(pm.steps, st.step)}`;
  }
  function progDots(pm, st) {
    return L360.PHASES.map((ph) => {
      const idx = pm.steps.map((s, i) => [s, i]).filter(([s]) => s.phase === ph.id);
      if (!idx.length) return "";
      const on = idx.some(([, i]) => i === st.step);
      return `<div class="s-ph phc-${ph.id} ${on ? "on" : ""}" style="--n:${idx.length + 1}"><span class="lab">${ph.name}</span><span class="dots">${idx
        .map(([, i]) => `<span class="d ${i < st.step ? "done" : i === st.step ? "cur" : ""}"></span>`)
        .join("")}</span></div>`;
    }).join("");
  }

  function lobby(el, meta, pm) {
    const joined = Room.joined(data);
    const groups = meta.groups || [];
    el.innerHTML = `<div class="grid" style="grid-template-columns:440px 1fr;gap:44px;height:100%;align-items:center">
      <div class="center lobby-qr">${u.qr(joinUrl(), 8)}<p style="font-size:19px;margin-top:12px;word-break:break-all" class="muted">${u.esc(joinUrl())}</p></div>
      <div><div class="row" style="margin-bottom:10px">${pm && pm.label ? `<span class="pill accent" style="font-size:18px">${u.esc(pm.label)}</span>` : ""}${pm && pm.subject ? `<span class="pill" style="font-size:18px">${u.esc(pm.subject)}${pm.grade ? " " + u.esc(pm.grade) : ""}</span>` : ""}</div>
      <h1 style="font-size:54px;margin-bottom:8px">${u.esc((pm && pm.title) || meta.title)}</h1><p class="scr-sub">${meta.className ? "Lớp " + u.esc(meta.className) + " · " : ""}Quét mã QR hoặc mở đường dẫn, chọn mã học sinh và nhóm.</p>
      <div class="row" style="margin:24px 0;gap:30px"><div><div class="big-n">${joined.length}/${meta.classSize}</div><div class="muted">học sinh đã vào lớp</div></div></div>
      <div class="grid" style="grid-template-columns:repeat(${Math.max(1, groups.length)},1fr);gap:12px">${groups
        .map((g) => `<div class="card center s-card" style="border-top:6px solid ${g.color};padding:14px"><b style="color:${g.color}">${u.esc(g.name)}</b><div class="big-n" style="font-size:44px">${joined.filter(([, r]) => r.group === g.id).length}</div></div>`)
        .join("")}</div></div></div>`;
  }
  function scores() {
    const pm = data.pub && data.pub.meta;
    const answers = (data.pub && data.pub.answers) || {};
    const sc = {};
    (pm ? pm.steps : []).forEach((s) => {
      if (!["quiz", "video", "crossword"].includes(s.type)) return;
      for (let i = 0; i < (s.count || 0) + (s.type === "crossword" ? 0 : 0); i++) {
        const key = `${s.id}__q${i}`;
        const a = answers[key];
        if (!a) continue;
        const isKey = s.type === "crossword" && i === s.count - 1;
        u.entries(data.subs && data.subs[key]).forEach(([c, x]) => {
          let p = 0;
          if (s.type === "crossword") p = L360.upWord(x.v) === a.answer ? (isKey ? 200 : 100) : 0;
          else p = L360.quizPoints(a, x.v);
          sc[c] = (sc[c] || 0) + p;
        });
      }
    });
    return sc;
  }
  function board(el) {
    const roster = data.roster || {};
    const sc = scores();
    const list = Object.keys(roster)
      .filter((c) => roster[c].uid)
      .map((c) => ({ c, n: roster[c].name || c, g: roster[c].group, p: sc[c] || 0 }))
      .sort((a, b) => b.p - a.p);
    const groups = (data.meta.groups || []).map((g) => {
      const m = list.filter((x) => x.g === g.id);
      return Object.assign({}, g, { avg: m.length ? Math.round(m.reduce((s, x) => s + x.p, 0) / m.length) : 0 });
    });
    groups.sort((a, b) => b.avg - a.avg);
    const gmap = Object.fromEntries((data.meta.groups || []).map((g) => [g.id, g]));
    el.innerHTML = `<div class="grid" style="grid-template-columns:1.2fr 1fr;gap:34px"><div><h2 style="font-size:34px">${L360.icon("trophy")} Bảng xếp hạng</h2>${list
      .slice(0, 8)
      .map((x, i) => `<div class="board-row"><b style="font-size:30px;color:${i < 3 ? "var(--accent)" : "var(--muted)"}">${i + 1}</b><span>${u.esc(x.n)} ${gmap[x.g] ? ui.gbadge(gmap[x.g]) : ""}</span><b class="right">${x.p}</b></div>`)
      .join("")}</div><div><h2 style="font-size:34px">Điểm trung bình nhóm</h2>${ui.bars(
      groups.map((g) => ({ label: u.esc(g.name), value: g.avg, color: g.color })),
      { showPct: false }
    )}<p class="muted" style="margin-top:20px">Điểm không tính tốc độ – chỉ tính câu trả lời đúng.</p></div></div>`;
  }
  function featured(el, key) {
    const f = u.vals(data.pub && data.pub.featured && data.pub.featured[key]).filter((x) => typeof x === "string");
    el.innerHTML = f.length ? `<h2 style="font-size:34px">Bài nổi bật</h2><div class="scr-feats">${f.map((t) => `<blockquote class="scr-feat">“${u.esc(t)}”</blockquote>`).join("")}</div>` : `<div class="scr-center"><h2>Chưa có bài được gắn ★</h2></div>`;
  }
  // Thẻ "Nhiệm vụ về nhà – chuẩn bị tiết sau" (màn chiếu và học sinh dùng chung giao diện).
  function hwCard(hw) {
    if (!hw || !(hw.tasks || []).length) return "";
    return `<div class="hw-card"><div class="hw-h">${L360.icon("ghiBai")} Nhiệm vụ về nhà</div><ol>${hw.tasks.map((t) => `<li>${u.esc(t)}</li>`).join("")}</ol>${
      hw.prepare ? `<div class="hw-p"><b>Chuẩn bị cho tiết sau:</b> ${u.esc(hw.prepare)}</div>` : ""
    }</div>`;
  }
  function summary(el) {
    const sid = data.meta && data.meta.sid;
    const hw = data.pub && data.pub.homework;
    const show = (s) => {
      if (!s) {
        el.innerHTML = `<div class="scr-end"><div><h1 style="font-size:60px;margin:0">Cảm ơn các em!</h1><p class="scr-sub">${u.esc(data.meta.title || "")}</p><img class="scr-end-logo" src="assets/img/logo-l360-ngang-trong.png" alt="Lesson 360° Studio"></div>${hwCard(hw)}</div>`;
        return;
      }
      el.innerHTML = `<h1 style="font-size:42px">Tổng kết tiết học</h1><div class="grid g4" style="margin:18px 0">
        <div class="kpi"><b>${s.joined}</b><span>học sinh tham gia</span></div>
        <div class="kpi"><b>${s.participation == null ? "–" : s.participation + "%"}</b><span>tỉ lệ nộp bài trung bình</span></div>
        <div class="kpi"><b>${s.correctRate == null ? "–" : s.correctRate + "%"}</b><span>trả lời đúng (câu có đáp án)</span></div>
        <div class="kpi"><b>${s.interactive}</b><span>lượt hoạt động tương tác</span></div></div>
        ${s.peer && s.peer.length ? `<h2>Học từ bạn: vòng 1 → vòng 2</h2>${s.peer.map((p) => `<p style="font-size:26px">${u.esc(p.title)}: <b>${p.r1}%</b> → <b style="color:var(--ok)">${p.r2}%</b> trả lời đúng</p>`).join("")}` : ""}
        ${s.hard && s.hard.length ? `<h2 style="margin-top:14px">Cần củng cố</h2>${s.hard.map((h) => `<p style="font-size:22px">${u.esc(h.label)} – ${h.correct}% đúng</p>`).join("")}` : ""}
        ${hwCard(hw)}`;
    };
    if (sid) S.get(`sessions/${sid}`).then((x) => (show(x), fitMain(u.$("#sm"), el))).catch(() => show(null));
    else show(null);
  }
  // Gọi tên ngẫu nhiên.
  let ovN = 0;
  function overlay() {
    const ov = data.pub && data.pub.overlay;
    let box = u.$("#ov", stage);
    if (!ov) {
      if (box) box.remove();
      ovN = 0;
      return;
    }
    if (ov.n === ovN) return;
    ovN = ov.n;
    if (!box) {
      box = document.createElement("div");
      box.id = "ov";
      box.className = "overlay";
      stage.appendChild(box);
    }
    if (ov.kind === "note") {
      // Ghi vở cỡ lớn: tự chọn cỡ chữ theo lượng chữ (không nhỏ hơn 34px trên màn 1600×900).
      const len = String(ov.text || "").length;
      const fs = Math.max(34, Math.min(54, Math.round(54 - (len - 120) / 12)));
      box.innerHTML = `<div class="ov-note"><div class="ov-note-h">${L360.icon("ghiBai")} ${u.esc(ov.title || "Ghi vào vở")}</div><div class="md" style="font-size:${fs}px">${L360.ui.md(ov.text || "")}</div></div>`;
      snd.page && snd.page();
      return;
    }
    const pool = (ov.pool || []).map((c) => (data.roster && data.roster[c] && data.roster[c].name) || c);
    box.innerHTML = `<div class="ov-card"><div class="k">${L360.icon("dice")} Gọi ngẫu nhiên</div><div class="ov-name spin" id="ovn">…</div><div id="ovg"></div></div>`;
    snd.drumroll(1.6);
    let t = 0;
    const iv = setInterval(() => {
      const el = u.$("#ovn", box);
      if (!el) return clearInterval(iv);
      el.textContent = pool[Math.floor(Math.random() * pool.length)] || "…";
      t += 90;
      if (t >= 1600) {
        clearInterval(iv);
        el.classList.remove("spin");
        el.textContent = ov.name ? `${ov.name}` : ov.code;
        u.$("#ovg", box).innerHTML = `<p class="muted" style="font-size:26px">${u.esc(ov.code)}${ov.name ? "" : ""}</p>${ov.group ? `<span class="gbadge" style="background:${u.esc(ov.color || "#2F6FDB")}">${u.esc(ov.group)}</span>` : ""}`;
      }
    }, 90);
  }

  // Âm thanh theo trạng thái.
  let prev = {};
  let lastSec = null;
  let joinedN = 0;
  function sounds(st, pm) {
    if (st.sound === false) return;
    if (prev.step !== st.step) snd.page();
    if (st.phase === "open" && (prev.phase !== "open" || prev.q !== st.q || prev.round !== st.round)) snd.start();
    if (st.phase === "revealed" && prev.phase !== "revealed") snd.reveal();
    if ((st.phase === "locked" && prev.phase === "open") || (lastSec != null && lastSec > 0 && Room.remaining(st) != null && Room.remaining(st) <= 0)) snd.end();
    if (st.screen === "board" && prev.screen !== "board") snd.award();
    if (pm && st.step >= 0 && prev.step === st.step && prev.page !== st.page && st.page != null) snd.page();
    prev = { step: st.step, phase: st.phase, q: st.q, round: st.round, screen: st.screen, page: st.page };
  }
  let planEnd = "";
  setInterval(() => {
    const st0 = data.state;
    if (st0 && st0.sound !== false && st0.phase !== "open") {
      const at = ui.activityTime(st0);
      const k = st0.step + ":" + st0.stepAt;
      const step = data.pub && data.pub.meta && data.pub.meta.steps[st0.step];
      if (at && at.kind === "plan" && at.rem <= 0 && planEnd !== k && step && !step.noSubmit) {
        planEnd = k;
        snd.end();
      }
    }
  }, 500);
  setInterval(() => {
    const st = data.state;
    if (!st || st.phase !== "open" || st.sound === false) return (lastSec = null);
    const rem = Room.remaining(st);
    if (rem == null) return;
    const sec = Math.ceil(rem);
    if (sec !== lastSec && sec > 0 && sec <= 10) sec <= 5 ? snd.tickHi() : snd.tick();
    lastSec = sec;
  }, 200);
  function unlockBtn() {
    if (snd.ready || u.$("#unl", stage)) return;
    const b = document.createElement("button");
    b.id = "unl";
    b.className = "unlock";
    b.innerHTML = `${L360.icon("soundOn")} Bật âm thanh`;
    b.title = "Bấm để bật âm thanh đồng hồ và hiệu ứng";
    b.onclick = () => {
      snd.unlock();
      snd.join();
      b.remove();
    };
    stage.appendChild(b);
  }
  document.addEventListener("pointerdown", () => snd.unlock(), { once: true });

  function fitMain(box, inner) {
    if (!box || !inner) return;
    inner.style.zoom = 1;
    const avail = box.clientHeight - 52;
    const need = inner.scrollHeight;
    // Không thu nhỏ quá 72% để chữ (nhất là phần ghi vở) vẫn đọc rõ; nội dung dài hơn nên tách trang.
    if (need > avail) inner.style.zoom = Math.max(0.72, avail / need);
  }
  // Chỉ thay nội dung khi HTML thật sự khác: giữ nguyên đồng hồ, thanh tiến trình, logo… giữa các lần cập nhật phòng.
  const put = (el, html) => {
    if (el && el._h !== html) {
      el.innerHTML = html;
      el._h = html;
    }
  };
  const draw = () => {
    const meta = data.meta;
    if (!meta) {
      stage.innerHTML = `<div class="scr-center" style="grid-row:1/4"><h1>Đang chờ phòng ${u.esc(R)}…</h1><p class="muted">Mở màn chiếu từ bảng điều khiển giáo viên (đã đăng nhập).</p></div>`;
      return;
    }
    const pm = data.pub && data.pub.meta;
    const st = data.state || { step: -1 };
    ui.timerState = st;
    ui.timerPlan = pm ? { steps: pm.steps } : null;
    if (pm) L360.Design.apply(pm, stage);
    if (!stage.querySelector(".s-head"))
      stage.innerHTML = `<div class="ds-pat"></div><div class="s-head"></div><div class="s-prog"></div><div class="s-body"><div class="s-main" id="sm"></div><aside class="s-side" id="side"></aside></div>`;
    sounds(st, pm);
    put(u.$(".s-head", stage), headHtml(meta, pm, st));
    put(u.$(".s-prog", stage), progHtml(pm, st));
    const mainBox = u.$("#sm", stage);
    if (!u.$("#smi", mainBox)) mainBox.innerHTML = `<div id="smi"></div>`;
    const main = u.$("#smi", mainBox);
    const side = u.$("#side", stage);
    const step = pm && st.step >= 0 ? pm.steps[st.step] : null;
    const joined = Room.joined(data);
    if (joined.length > joinedN && st.step < 0 && st.sound !== false) snd.join();
    joinedN = joined.length;
    const groups = meta.groups || [];
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
    const item = key && data.pub && data.pub.items && data.pub.items[key];
    const pageNote = step && step.type === "slide" && item && item.pages && L360.blocks.hasNote(item.pages[st.page || 0] || {});
    const note = step && (pageNote || (data.pub && data.pub.notes && data.pub.notes[key]));
    if (!side.querySelector("[data-hg]")) side.innerHTML = `${ui.hourglass()}<div id="sideRest" class="side-rest"></div>`;
    put(u.$("#sideRest", side), `
      ${step && !step.noSubmit ? `<div><div class="lbl">${step.groupMode ? "Nhóm đã nộp" : "Đã nộp"}</div><div class="big-n">${n}/${denom}</div></div>` : `<div><div class="lbl">Sĩ số</div><div class="big-n">${joined.length}</div></div>`}
      ${step ? `<div><div class="lbl">Trạng thái</div><div style="font-size:22px;font-weight:700">${ui.phaseLabel(st, step)}${step.type === "slide" && step.pages > 1 ? ` · trang ${(st.page || 0) + 1}/${step.pages}` : ""}</div></div>` : ""}
      ${note ? `<span class="ghi-badge">${L360.icon("ghiBai")} Ghi vào vở</span>` : step && step.ghiBai ? `<span class="ghi-badge" style="opacity:.6">${L360.icon("ghiBai")} Có nội dung ghi vở</span>` : ""}
      <div class="side-clock"><div class="lbl">Còn lại của tiết</div><div class="big" data-left>${pm ? pm.steps.reduce((a, x) => a + (Number(x.minutes) || 0), 0) || 45 : 45}:00</div><div class="sub">Đã học <span data-clock>0:00</span> / ${pm ? pm.steps.reduce((a, x) => a + (Number(x.minutes) || 0), 0) || 45 : 45} phút</div></div>
      <button class="snd-btn" id="sndb" title="Âm thanh">${L360.icon(st.sound === false || !snd.enabled ? "soundOff" : "soundOn")}</button>`);
    u.$("#sndb", side).onclick = () => {
      snd.unlock();
      snd.setEnabled(!snd.enabled);
      render();
    };
    overlay();
    unlockBtn();
    if (step && step.type !== "video") main.style.zoom = 1;
    requestAnimationFrame(() => step && step.type !== "video" && fitMain(mainBox, main));
    if (st.step < 0) return lobby(main, meta, pm);
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
      item,
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
    if (main.dataset.step !== step.id) {
      main.innerHTML = "";
      main.dataset.step = step.id;
    }
    T.screen(main, ctx);
  };
  // Dựng xong là điền ngay giờ hiện tại (trước khi trình duyệt vẽ) – không lóe số tạm.
  const render = u.throttleRaf(() => {
    draw();
    L360.ui.tick();
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
