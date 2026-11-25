/* Mảnh giao diện dùng chung cho các mẫu hoạt động (học sinh, màn chiếu, giáo viên). */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = {};

  ui.bars = (items, { total, showPct = true } = {}) => {
    const max = total || Math.max(1, ...items.map((i) => i.value || 0));
    return `<div class="bars">${items
      .map((i) => {
        const w = max ? Math.round(((i.value || 0) / max) * 100) : 0;
        const v = showPct && total ? `${i.value || 0} · ${u.pct(i.value || 0, total)}%` : `${i.value || 0}`;
        return `<div class="bar ${i.correct ? "correct" : ""} ${i.dim ? "dim" : ""}">
          <div class="bar-label"><span>${i.correct ? "✓ " : ""}${i.label}</span><span class="v">${v}</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${w}%;${i.color ? `background:${i.color}` : ""}"></div></div></div>`;
      })
      .join("")}</div>`;
  };
  // Hai vòng cạnh nhau (học từ bạn).
  ui.pairBars = (labels, r1, r2, total1, total2, correctIdx) =>
    `<div class="bars">${labels
      .map((lb, i) => {
        const a = r1[i] || 0;
        const b = r2[i] || 0;
        const ok = correctIdx === i;
        return `<div class="bar bar-pair ${ok ? "correct" : ""} ${correctIdx != null && !ok ? "dim" : ""}">
        <div class="bar-label"><span>${ok ? "✓ " : ""}${lb}</span><span class="v">V1 ${u.pct(a, total1)}% · V2 ${u.pct(b, total2)}%</span></div>
        <div class="bar-track" style="height:11px"><div class="bar-fill r1" style="width:${u.pct(a, total1)}%"></div></div>
        <div class="bar-track" style="height:11px"><div class="bar-fill r2" style="width:${u.pct(b, total2)}%"></div></div></div>`;
      })
      .join("")}</div>`;

  ui.options = (options, { selected, answer, disabled, multi, name = "opt", mine, cls = "" } = {}) =>
    `<div class="opts ${cls}">${options
      .map((o, i) => {
        const sel = multi ? (selected || []).includes(i) : selected === i;
        let cls = sel ? "sel" : "";
        if (answer != null) {
          if (i === answer) cls = "right";
          else if (sel || mine === i) cls = "wrong";
        }
        return `<button class="opt ${cls}" data-${name}="${i}" ${disabled ? "disabled" : ""}><span class="k">${u.letter(i)}</span><span>${u.rich(o)}</span></button>`;
      })
      .join("")}</div>`;

  ui.media = (m, { big } = {}) => {
    if (!m) return "";
    let out = "";
    if (m.image)
      out += `<figure style="margin:0 0 12px"><img src="${u.esc(m.image)}" alt="${u.esc(m.caption || "")}" loading="lazy" style="width:100%;max-height:${big ? "52vh" : "320px"};object-fit:contain;border-radius:12px;background:#fff">${
        m.caption || m.credit
          ? `<figcaption class="tiny muted" style="margin-top:4px">${u.esc(m.caption || "")}${m.credit ? ` <i>Nguồn: ${u.esc(m.credit)}</i>` : ""}</figcaption>`
          : ""
      }</figure>`;
    if (m.video) out += `<p><a class="btn sm" href="${u.esc(m.video)}" target="_blank" rel="noopener">▶ Xem video</a> <span class="small muted">${u.esc(m.videoTitle || "")}</span></p>`;
    if (m.link) out += `<p><a class="btn sm" href="${u.esc(m.link)}" target="_blank" rel="noopener">↗ ${u.esc(m.linkTitle || "Mở tư liệu")}</a></p>`;
    return out;
  };

  ui.wait = (title, sub) =>
    `<div class="card center" style="padding:36px 20px"><div style="font-size:2.4rem;line-height:1">⏳</div><h2 style="margin-top:10px">${u.esc(title)}</h2>${sub ? `<p class="muted">${u.esc(sub)}</p>` : ""}</div>`;
  ui.done = (title, sub) =>
    `<div class="card center" style="padding:30px 20px;border-color:var(--ok)"><div style="font-size:2.2rem;line-height:1;color:var(--ok)">✓</div><h2 style="margin-top:8px;color:var(--ok)">${u.esc(
      title || "Đã nộp"
    )}</h2><p class="muted">${u.esc(sub || "Chờ giáo viên mở câu tiếp theo.")}</p></div>`;

  ui.gbadge = (g) => (g ? `<span class="gbadge" style="background:${g.color}">${u.esc(g.name)}</span>` : "");

  ui.cloud = (texts, n = 24) => {
    const top = u.topWords(texts, n);
    if (!top.length) return `<p class="muted">Chưa có câu trả lời.</p>`;
    const max = top[0][1];
    return `<div style="display:flex;flex-wrap:wrap;gap:6px 14px;align-items:baseline;justify-content:center;padding:8px">${top
      .map(
        ([w, c], i) =>
          `<span style="font-size:${(0.95 + (c / max) * 1.6).toFixed(2)}rem;font-weight:${c === max ? 800 : 650};color:${
            i % 3 === 0 ? "var(--accent)" : i % 3 === 1 ? "var(--ink)" : "var(--ink-2)"
          }">${u.esc(w)}</span>`
      )
      .join("")}</div>`;
  };

  ui.textarea = (id, { value = "", max = 40, placeholder = "", rows = 4 } = {}) =>
    `<textarea id="${id}" rows="${rows}" placeholder="${u.esc(placeholder)}" data-maxwords="${max}">${u.esc(value)}</textarea>
     <div class="small muted right" data-wc-for="${id}">0/${max} từ</div>`;
  ui.bindWordCount = (root) => {
    u.$$("textarea[data-maxwords]", root).forEach((ta) => {
      const max = Number(ta.dataset.maxwords);
      const lab = root.querySelector(`[data-wc-for="${ta.id}"]`);
      const upd = () => {
        const n = u.words(ta.value);
        if (lab) {
          lab.textContent = `${n}/${max} từ`;
          lab.style.color = n > max ? "var(--bad)" : "";
        }
      };
      ta.addEventListener("input", upd);
      upd();
    });
  };

  // Đồng hồ: mọi phần tử [data-timer] tự cập nhật theo trạng thái hiện tại.
  ui.timerState = null;
  ui.timerPlan = null; // { steps:[{minutes, phase}], step } – để tính giờ hoạt động và tiến độ cả tiết
  ui.timer = () => `<span class="timer" data-timer>–:–</span>`;
  let hgN = 0;
  // Đồng hồ cát: cát chảy theo thời gian còn lại của hoạt động (thời gian làm bài, hoặc thời lượng dự kiến của bước).
  ui.hourglass = (size) => {
    const id = "hg" + ++hgN;
    const top = "M22 14 H98 C98 58 68 76 62.5 90 H57.5 C52 76 22 58 22 14Z";
    const bot = "M57.5 90 H62.5 C68 104 98 122 98 166 H22 C22 122 52 104 57.5 90Z";
    return `<div class="hg ${size || ""}" data-hg><svg viewBox="0 0 120 180" aria-hidden="true"><defs><clipPath id="${id}t"><path d="${top}"/></clipPath><clipPath id="${id}b"><path d="${bot}"/></clipPath></defs>
      <path class="hg-glass" d="M22 14 H98 C98 58 68 76 62.5 90 C68 104 98 122 98 166 H22 C22 122 52 104 57.5 90 C52 76 22 58 22 14Z"/>
      <rect class="hg-sand" data-hgt clip-path="url(#${id}t)" x="18" y="14" width="84" height="76"/>
      <rect class="hg-sand" data-hgb clip-path="url(#${id}b)" x="18" y="166" width="84" height="0"/>
      <line class="hg-stream" data-hgs x1="60" y1="89" x2="60" y2="165"/>
      <rect class="hg-cap" x="12" y="5" width="96" height="11" rx="5"/><rect class="hg-cap" x="12" y="164" width="96" height="11" rx="5"/></svg>
      <div class="hg-txt"><b data-hgnum>–:–</b><small data-hglbl></small></div></div>`;
  };
  // Thời gian còn lại của hoạt động hiện tại: {rem, total, kind:"open"|"plan"} hoặc null.
  ui.activityTime = (st) => {
    if (!st) return null;
    const rem = L360.Room ? L360.Room.remaining(st) : null;
    if (rem != null) return { rem, total: st.dur, kind: "open" };
    const pl = ui.timerPlan;
    const s = pl && st.step >= 0 && pl.steps[st.step];
    const plan = s ? (Number(s.minutes) || 0) * 60 : 0;
    if (!plan || !st.stepAt) return null;
    return { rem: plan - (L360.store.now() - st.stepAt) / 1000, total: plan, kind: "plan" };
  };
  const fmtSigned = (r) => (r < 0 ? "+" + u.fmtSec(-r) : u.fmtSec(r));
  // Chỉ ghi vào trang khi giá trị thật sự đổi: tránh vẽ lại thừa, chữ số nhảy đúng nhịp từng giây.
  const setText = (el, v) => el.textContent !== v && (el.textContent = v);
  const setCls = (el, c, on) => el.classList.contains(c) !== !!on && el.classList.toggle(c, !!on);
  const setAttr = (el, a, v) => el && el.getAttribute(a) !== v && el.setAttribute(a, v);
  const setVar = (el, k, v) => el.style.getPropertyValue(k) !== v && el.style.setProperty(k, v);
  const all = (sel) => document.querySelectorAll(sel);
  // Cập nhật mọi đồng hồ trên trang. Gọi theo từng khung hình (mượt) và gọi ngay sau khi trang vừa dựng lại
  // (ui.tick()) để phần mới dựng không lóe số tạm "0:00".
  ui.tick = () => {
    const st = ui.timerState;
    const now = L360.store.now();
    const rem = L360.Room ? L360.Room.remaining(st) : null;
    all("[data-timer]").forEach((el) => {
      if (rem == null) {
        setText(el, st && st.phase === "open" ? "∞" : "–:–");
        setCls(el, "low", false);
      } else {
        setText(el, u.fmtSec(Math.max(0, rem)));
        setCls(el, "low", rem <= 10);
      }
    });
    const at = ui.activityTime(st);
    all("[data-hg]").forEach((el) => {
      const f = at ? Math.max(0, Math.min(1, at.rem / Math.max(1, at.total))) : 1;
      setAttr(el.querySelector("[data-hgt]"), "y", (90 - 76 * f).toFixed(2));
      setAttr(el.querySelector("[data-hgt]"), "height", (76 * f).toFixed(2));
      setAttr(el.querySelector("[data-hgb]"), "y", (166 - 76 * (1 - f)).toFixed(2));
      setAttr(el.querySelector("[data-hgb]"), "height", (76 * (1 - f)).toFixed(2));
      setCls(el, "run", !!(at && at.rem > 0));
      setCls(el, "low", !!(at && at.rem > 0 && at.rem <= (at.kind === "open" ? 10 : 30)));
      setCls(el, "over", !!(at && at.rem <= 0));
      setCls(el, "idle", !at);
      const n = el.querySelector("[data-hgnum]");
      if (n) setText(n, at ? (at.kind === "open" ? u.fmtSec(Math.max(0, at.rem)) : fmtSigned(Math.ceil(at.rem))) : "–:–");
      const l = el.querySelector("[data-hglbl]");
      if (l) setText(l, !at ? "Chưa tính giờ" : at.kind === "open" ? (at.rem > 0 ? "Thời gian làm bài" : "Hết giờ!") : at.rem > 0 ? "Thời lượng hoạt động" : "Quá giờ dự kiến");
    });
    const s0 = st && st.startedAt;
    const el0 = s0 ? Math.max(0, (now - s0) / 1000) : 0;
    all("[data-clock]").forEach((el) => setText(el, u.fmtSec(el0)));
    // Dải tiến trình cả tiết: phần đã học tô đậm theo thời gian thực, bước hiện tại tô dần theo số phút dự kiến.
    const pl = ui.timerPlan;
    const total = pl ? pl.steps.reduce((a, s) => a + (Number(s.minutes) || 0) * 60, 0) || 2700 : 2700;
    all("[data-left]").forEach((el) => {
      if (!s0) {
        setText(el, u.fmtSec(total));
        setCls(el, "over", false);
        setCls(el, "low", false);
        return;
      }
      const left = total - el0;
      setText(el, left >= 0 ? u.fmtSec(left) : "+" + u.fmtSec(-left));
      setCls(el, "over", left < 0);
      setCls(el, "low", left >= 0 && left <= 300);
    });
    all("[data-ribbon]").forEach((el) => {
      if (!pl) return;
      const head = el.querySelector(".rb-head");
      if (head) {
        setVar(head, "left", Math.min(100, (el0 / total) * 100).toFixed(2) + "%");
        if (head.hidden !== !s0) head.hidden = !s0;
        setCls(head, "over", !!s0 && el0 > total);
      }
      const pace = el.querySelector("[data-pace]");
      const curSeg = el.querySelector(".rb-seg.cur");
      if (!s0 || !st || st.step < 0) {
        if (curSeg) setVar(curSeg, "--p", "0");
        if (pace) setText(pace, "Chưa bắt đầu"), pace.className !== "rb-pace" && (pace.className = "rb-pace");
        return;
      }
      const before = pl.steps.slice(0, Math.min(st.step, pl.steps.length)).reduce((a, s) => a + (Number(s.minutes) || 0) * 60, 0);
      const cur = st.step < pl.steps.length ? (Number(pl.steps[st.step].minutes) || 0) * 60 : 0;
      const spent = st.stepAt ? Math.max(0, (now - st.stepAt) / 1000) : 0;
      if (curSeg) {
        setVar(curSeg, "--p", cur ? Math.min(1, spent / cur).toFixed(3) : "1");
        setCls(curSeg, "over", !!cur && spent > cur + 30);
      }
      if (!pace) return;
      const diff = el0 - (before + Math.min(cur, spent));
      const m = Math.round(Math.abs(diff) / 60);
      setText(pace, Math.abs(diff) < 60 ? "Đúng tiến độ" : diff > 0 ? `Chậm ${m} phút` : `Nhanh ${m} phút`);
      const cls = "rb-pace " + (Math.abs(diff) < 60 ? "ok" : diff > 0 ? "late" : "early");
      if (pace.className !== cls) pace.className = cls;
    });
  };
  // Chạy theo khung hình của trình duyệt (mượt, tự dừng khi thẻ bị ẩn); khi thẻ ẩn vẫn cập nhật chậm mỗi giây.
  const loop = () => {
    try {
      ui.tick();
    } catch (e) {
      console.warn("Đồng hồ", e);
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  setInterval(() => document.hidden && ui.tick(), 1000);

  // Dải tiến trình tiết học (màn chiếu): mỗi bước một đoạn dài theo số phút, màu theo pha;
  // bước đã xong tô đậm, bước đang dạy tô dần theo thời gian, bước sau để nhạt; kim tròn chỉ thời điểm hiện tại.
  ui.ribbon = (steps, cur) => {
    const total = steps.reduce((a, s) => a + (Number(s.minutes) || 0), 0) || 45;
    return `<div class="rb" data-ribbon><div class="rb-track">${steps
      .map((s, i) => `<span class="rb-seg ph-${s.phase} ${i < cur ? "done" : i === cur ? "cur" : ""}" style="flex:${Math.max(0.6, Number(s.minutes) || 1)}" title="${u.esc(s.title || "")} · ${s.minutes || 0} phút"></span>`)
      .join("")}<span class="rb-head" hidden title="Thời điểm hiện tại của tiết học"><img src="assets/img/logo-l360-mark.svg" alt=""></span></div><div class="rb-info"><span class="rb-k">Đã học</span><b data-clock>0:00</b><span class="rb-sep">·</span><span class="rb-k">Còn</span><b class="rb-left" data-left>${total}:00</b><span class="rb-pace" data-pace></span></div></div>`;
  };

  ui.phaseLabel = (st, step) => {
    if (!step) return "";
    if (step.noSubmit) return step.type === "video" ? "Video" : "Trình chiếu";
    return { observe: "Quan sát", open: "Đang nhận bài", locked: "Đã khoá", revealed: "Đã công bố" }[st.phase] || "";
  };

  L360.ui = ui;
})();
