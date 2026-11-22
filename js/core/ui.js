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

  ui.options = (options, { selected, answer, disabled, multi, name = "opt", mine } = {}) =>
    `<div class="opts">${options
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
      out += `<figure style="margin:0 0 12px"><img src="${u.esc(m.image)}" alt="${u.esc(m.caption || "")}" loading="lazy" style="width:100%;max-height:${big ? "52vh" : "320px"};object-fit:contain;border-radius:12px;background:#EFE7D8">${
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
  ui.timer = () => `<span class="timer" data-timer>–:–</span>`;
  setInterval(() => {
    const st = ui.timerState;
    const els = document.querySelectorAll("[data-timer]");
    if (!els.length) return;
    const rem = L360.Room ? L360.Room.remaining(st) : null;
    els.forEach((el) => {
      if (rem == null) {
        el.textContent = st && st.phase === "open" ? "∞" : "–:–";
        el.classList.remove("low");
      } else {
        el.textContent = u.fmtSec(rem);
        el.classList.toggle("low", rem <= 10);
      }
    });
    document.querySelectorAll("[data-clock]").forEach((el) => {
      const s0 = st && st.startedAt;
      el.textContent = s0 ? u.fmtSec((L360.store.now() - s0) / 1000) : "0:00";
    });
  }, 250);

  ui.phaseLabel = (st, step) => {
    if (!step) return "";
    if (step.noSubmit) return "Trình chiếu";
    return { observe: "Quan sát", open: "Đang nhận bài", locked: "Đã khoá", revealed: "Đã công bố" }[st.phase] || "";
  };

  L360.ui = ui;
})();
