/* Hoạt động vui học: hình thức trò chơi cho Trắc nghiệm (Mảnh ghép bí ẩn, Hộp quà bí mật, Rung chuông vàng)
   và các loại hoạt động mới: Thẻ ghi nhớ lật, Vòng quay may mắn, Bày tỏ quan điểm (bốn góc), Bảng KWL.
   Mỗi loại chạy được trên lớp (máy giáo viên – màn chiếu – máy học sinh) và có trang PowerPoint tương ứng. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;
  const snd = L360.sound;
  const arr = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]);
  const GC = ["#2F6FDB", "#E8930C", "#1E8E5A", "#D2453B", "#0C9A9A", "#8A5A2B", "#6B7A1F", "#C77700"];

  /* ================= Hình thức trò chơi cho Trắc nghiệm ================= */
  const Q = L360.types.quiz;
  const MODES = [
    ["classic", "Trắc nghiệm thường"],
    ["puzzle", "Mảnh ghép bí ẩn (mở mảnh – đoán bức tranh)"],
    ["gift", "Hộp quà bí mật (chọn hộp – trả lời)"],
    ["rcv", "Rung chuông vàng (sai là dừng cuộc chơi)"]
  ];
  const MODE_NAME = { classic: "Trắc nghiệm", puzzle: "Mảnh ghép bí ẩn", gift: "Hộp quà bí mật", rcv: "Rung chuông vàng" };
  L360.quizModes = MODES;
  L360.quizModeName = (s) => MODE_NAME[(s && s.mode) || "classic"] || MODE_NAME.classic;
  const modeOf = (s) => (MODE_NAME[s && s.mode] ? s.mode : "classic");
  Q.fields = [
    { key: "mode", label: "Hình thức trò chơi", kind: "select", options: MODES },
    { key: "image", label: "Ảnh bí ẩn (Mảnh ghép)", kind: "image", hint: "Đường dẫn ảnh; để trống thì ứng dụng tìm theo từ khoá" },
    { key: "query", label: "Từ khoá tìm ảnh bí ẩn", kind: "text", hint: "Tiếng Anh, ví dụ: Great Pyramid of Giza" },
    { key: "keyword", label: "Đáp án bức tranh / từ khoá", kind: "text" },
    { key: "keyClue", label: "Câu hỏi đoán bức tranh", kind: "text", hint: "Ví dụ: Bức tranh nói về công trình nào?" }
  ].concat(Q.fields.filter((f) => !["mode", "image", "query", "keyword", "keyClue"].includes(f.key)));
  Q.desc += " Có thể chơi theo hình thức Mảnh ghép bí ẩn (mỗi câu đúng mở một mảnh của bức tranh, cuối cùng đoán từ khoá), Hộp quà bí mật (lớp chọn hộp quà, mỗi hộp một câu hỏi) hoặc Rung chuông vàng (trả lời sai là dừng cuộc chơi, ai trụ đến cuối thắng).";
  const n0 = Q.normalize;
  Q.normalize = function (s) {
    n0.call(Q, s);
    s.mode = modeOf(s);
    s.keyword = String(s.keyword || "").trim();
    s.keyClue = String(s.keyClue || "").trim();
    // Mảnh ghép: câu cuối là câu đoán bức tranh (tự thêm nếu có từ khoá).
    if (s.mode === "puzzle" && s.keyword && !s.questions.some((q) => q.kw)) s.questions.push({ kind: "short", q: s.keyClue || "Bức tranh bí ẩn là gì?", answer: s.keyword, accept: [], explain: "", kw: true });
    if (s.mode !== "puzzle") s.questions = s.questions.filter((q) => !q.kw);
  };
  const v0 = Q.validate;
  Q.validate = function (s, err, warn) {
    v0.call(Q, s, err, warn);
    const n = tiles(s).length;
    if (s.mode === "puzzle") {
      if (!s.keyword) warn("Mảnh ghép bí ẩn nên có từ khoá/đáp án bức tranh (keyword).");
      if (n < 4 || n > 12) warn(`Mảnh ghép bí ẩn nên có 4–12 câu (hiện có ${n}).`);
    }
    if (s.mode === "gift" && (n < 3 || n > 12)) warn(`Hộp quà bí mật nên có 3–12 câu (hiện có ${n}).`);
  };
  // Câu thường (không tính câu đoán bức tranh) – mỗi câu là một mảnh ghép / một hộp quà.
  // Màn chiếu chỉ có thông tin công khai của bước (tl = vị trí các câu thường, kwq = vị trí câu đoán bức tranh).
  const tiles = (s) => (Array.isArray(s.questions) ? s.questions.map((q, i) => ({ q, i })).filter((x) => !x.q.kw) : arr(s.tl).map((i) => ({ q: {}, i })));
  const kwIndex = (s) => (Array.isArray(s.questions) ? s.questions.findIndex((q) => q.kw) : s.kwq == null ? -1 : s.kwq);
  const qCount = (s) => (Array.isArray(s.questions) ? s.questions.length : Number(s.count) || 0);
  Q.publicMeta = (s) => {
    const m = modeOf(s);
    if (m === "classic") return {};
    return { mode: m, image: m === "puzzle" ? s.image || "" : "", keyClue: s.keyClue || "", tl: tiles(s).map((t) => t.i), kwq: kwIndex(s) };
  };
  const qKey = (s, i) => `${s.id}__q${i}`;
  const answered = (data, s, i) => !!(data && data.pub && data.pub.answers && data.pub.answers[qKey(s, i)]);
  const gridCols = (n) => (n <= 4 ? 2 : n <= 6 ? 3 : n <= 9 ? 3 : 4);

  // Rung chuông vàng: em nào trả lời sai (hoặc không trả lời) ở câu đã công bố thì dừng cuộc chơi.
  function rcvState(s, data, codes) {
    const out = {};
    const answers = (data.pub && data.pub.answers) || {};
    Array.from({ length: qCount(s) }, (_, i) => i).forEach((i) => {
      const a = answers[qKey(s, i)];
      if (!a) return;
      const subs = (data.subs && data.subs[qKey(s, i)]) || {};
      codes.forEach((c) => {
        if (out[c] != null) return;
        const v = subs[c] && subs[c].v;
        if (v == null || L360.quizPoints(a, v) < 100) out[c] = i;
      });
    });
    return { alive: codes.filter((c) => out[c] == null), out };
  }
  L360.rcvState = rcvState;

  function puzzleBoard(ctx, big) {
    const s = ctx.step;
    const data = ctx.data || {};
    const T = tiles(s);
    const kwq = kwIndex(s);
    const all = kwq >= 0 ? answered(data, s, kwq) : T.every((t) => answered(data, s, t.i));
    const kwAns = kwq >= 0 && all ? (data.pub.answers[qKey(s, kwq)] || {}).answer : s.keyword;
    const cols = gridCols(T.length);
    const cur = ctx.state.q || 0;
    return `<div class="qm-pz ${big ? "big" : ""}"><div class="qm-pic">${s.image ? `<img src="${u.esc(s.image)}" alt="">` : `<div class="qm-noimg">?</div>`}
      <div class="qm-tiles" style="--c:${cols}">${T.map((t, k) => `<div class="qm-tile ${all || answered(data, s, t.i) ? "open" : ""} ${t.i === cur && ctx.state.phase !== "observe" ? "cur" : ""}" style="--g:${GC[k % GC.length]}"><b>${k + 1}</b></div>`).join("")}</div></div>
      ${all && kwAns ? `<div class="qm-key">🖼 ${u.esc(kwAns)}</div>` : `<p class="qm-hint">${u.esc(s.keyClue || "Trả lời đúng để mở từng mảnh ghép, đoán bức tranh bí ẩn!")}</p>`}</div>`;
  }
  function giftBoard(ctx, big) {
    const s = ctx.step;
    const data = ctx.data || {};
    const T = tiles(s);
    const cur = ctx.state.q || 0;
    return `<div class="qm-gift ${big ? "big" : ""}" style="--c:${Math.min(T.length, big ? 6 : 3)}">${T.map((t, k) => {
      const open = answered(data, s, t.i);
      const now = t.i === cur && ctx.state.phase !== "observe" && !open;
      return `<div class="qm-box ${open ? "open" : ""} ${now ? "cur" : ""}" style="--g:${GC[k % GC.length]}"><span class="ic">${open ? "✓" : "🎁"}</span><b>${k + 1}</b></div>`;
    }).join("")}</div>`;
  }
  function rcvPanel(ctx) {
    const s = ctx.step;
    const codes = ctx.joinedCodes || [];
    const r = rcvState(s, ctx.data || {}, codes);
    const lastQ = qCount(s) - 1;
    const done = answered(ctx.data, s, lastQ);
    const names = r.alive.map((c) => (ctx.nameOf ? ctx.nameOf(c) : c));
    return `<div class="qm-rcv"><div class="bell">🔔</div><div class="cnt"><b>${r.alive.length}</b>/${codes.length || 0}</div><div class="lbl">${done ? "bạn trụ vững đến cuối!" : "bạn còn trên sàn thi đấu"}</div>
      ${names.length && (done || names.length <= 14) ? `<div class="qm-names">${names.map((n) => `<span class="chip">${u.esc(n)}</span>`).join("")}</div>` : ""}</div>`;
  }
  const scr0 = Q.screen;
  Q.screen = function (el, ctx) {
    const s = ctx.step;
    const m = modeOf(s);
    if (m === "classic") return scr0.call(Q, el, ctx);
    const st = ctx.state;
    // Chưa mở câu: bảng trò chơi chiếm cả màn chiếu.
    if (st.phase === "observe" && m !== "rcv") {
      el.innerHTML = `<div class="qm-stage"><div class="pill accent" style="font-size:1.2rem">${u.esc(MODE_NAME[m])}${s.title && s.title !== MODE_NAME[m] ? " · " + u.esc(s.title) : ""}</div>${
        m === "puzzle" ? puzzleBoard(ctx, true) : giftBoard(ctx, true)
      }<p class="muted center" style="font-size:1.3rem">${m === "gift" ? "Lớp chọn một hộp quà – mỗi hộp là một câu hỏi bí mật." : "Mỗi câu trả lời đúng mở một mảnh ghép."}</p></div>`;
      return;
    }
    const inner = document.createElement("div");
    scr0.call(Q, inner, ctx);
    el.innerHTML = `<div class="qm qm-m-${m}"><aside class="qm-side">${m === "puzzle" ? puzzleBoard(ctx) : m === "gift" ? giftBoard(ctx) : rcvPanel(ctx)}</aside><div class="qm-main"></div></div>`;
    el.querySelector(".qm-main").append(...inner.childNodes);
  };
  const host0 = Q.host;
  Q.host = function (el, ctx) {
    host0.call(Q, el, ctx);
    const s = ctx.step;
    const m = modeOf(s);
    if (m === "rcv") {
      const r = rcvState(s, ctx.data || {}, ctx.joinedCodes || []);
      el.insertAdjacentHTML(
        "afterbegin",
        `<p class="small"><b>🔔 Rung chuông vàng:</b> còn <b>${r.alive.length}</b>/${(ctx.joinedCodes || []).length} em.${
          Object.keys(r.out).length ? ` Đã dừng: ${Object.entries(r.out).map(([c, i]) => `${u.esc(ctx.nameOf ? ctx.nameOf(c) : c)} (câu ${i + 1})`).join(", ")}.` : ""
        }</p>`
      );
    } else if (m !== "classic") {
      const T = tiles(s);
      const done = T.filter((t) => answered(ctx.data, s, t.i)).length;
      el.insertAdjacentHTML("afterbegin", `<p class="small"><b>${m === "gift" ? "🎁 Hộp quà" : "🧩 Mảnh ghép"}:</b> đã mở ${done}/${T.length}.${m === "puzzle" && s.keyword ? ` Từ khoá: <b>${u.esc(s.keyword)}</b>.` : ""}</p>`);
    }
  };
  const c0 = Q.controls;
  Q.controls = function (ctx) {
    const s = ctx.step;
    let c = c0.call(Q, ctx);
    if (modeOf(s) !== "gift") return c;
    const st = ctx.state;
    if (st.phase !== "observe" && st.phase !== "revealed") return c;
    const data = (ctx.host && ctx.host.data) || {};
    const T = tiles(s);
    const left = T.filter((t) => !answered(data, s, t.i) && !(t.i === (st.q || 0) && st.phase === "revealed"));
    c = c.filter((x) => !/Câu tiếp theo|Câu trước|Mở câu|Bảng xếp hạng/.test(x.label));
    left.forEach((t) => c.push({ label: `🎁 ${T.indexOf(t) + 1}`, cls: "primary", fn: () => ctx.host.setQ(t.i, true) }));
    if (!left.length) c.push({ label: "🏆 Bảng xếp hạng", cls: "primary", fn: () => ctx.host.setScreen("board") });
    return c;
  };

  /* ================= Thẻ ghi nhớ lật ================= */
  const flipOf = (st, s) => (st.flip && st.flip.id === s.id ? arr(st.flip.on) : []);
  L360.registerType({
    type: "flash",
    label: "Thẻ ghi nhớ lật",
    icon: "🂠",
    desc: "Thẻ hai mặt: mặt trước là thuật ngữ/câu hỏi/mốc thời gian, mặt sau là giải thích/đáp án. Giáo viên lật từng thẻ trên màn chiếu; học sinh tự lật thẻ trên máy, đánh dấu thẻ đã nhớ – màn chiếu cho biết thẻ nào cả lớp chưa nhớ để ôn lại.",
    fields: [
      { key: "question", label: "Yêu cầu", kind: "textarea" },
      { key: "pairs", label: "Các thẻ (mặt trước ↔ mặt sau)", kind: "pairs" },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({
      type: "flash",
      phase: "luyen-tap",
      title: "Thẻ ghi nhớ",
      minutes: 4,
      question: "Nhìn mặt trước, nhớ lại mặt sau rồi lật thẻ để kiểm tra.",
      pairs: [
        { left: "Thuật ngữ 1", right: "Giải thích ngắn 1" },
        { left: "Thuật ngữ 2", right: "Giải thích ngắn 2" },
        { left: "Thuật ngữ 3", right: "Giải thích ngắn 3" },
        { left: "Thuật ngữ 4", right: "Giải thích ngắn 4" }
      ],
      timer: 120
    }),
    normalize(s) {
      s.pairs = arr(s.pairs || s.cards)
        .map((p) => (typeof p === "string" ? { left: p, right: "" } : { left: String(p.left || p.front || p.term || ""), right: String(p.right || p.back || p.def || "") }))
        .filter((p) => p.left.trim());
    },
    validate(s, err) {
      if (!s.pairs || s.pairs.length < 2) err("Cần ít nhất 2 thẻ.");
      if ((s.pairs || []).length > 12) err("Tối đa 12 thẻ.");
    },
    publicPayload: (s) => ({ question: s.question || "", fronts: s.pairs.map((p) => p.left), backs: s.pairs.map((p) => p.right) }),
    publicMeta: (s) => ({ question: s.question || "", pairs: s.pairs }),
    describe: (s, key, v) => (v && Array.isArray(v.known) ? `Nhớ ${v.known.length}/${s.pairs.length} thẻ` : ""),
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        const prev = (ctx.sub && ctx.sub.v) || {};
        const known = new Set(arr(prev.known));
        const flipped = new Set();
        const draw = () => {
          el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Thẻ ghi nhớ</span><span class="spacer"></span>${ui.timer()}</div>
            <h2 style="margin-top:12px">${u.rich(it.question || "Lật thẻ để kiểm tra trí nhớ.")}</h2><p class="small muted">Chạm thẻ để lật. Nhớ đúng thì đánh dấu ✓.</p>
            <div class="fc-grid">${arr(it.fronts)
              .map(
                (f, i) => `<div class="fc ${flipped.has(i) ? "flip" : ""}" data-fc="${i}"><div class="fc-in"><div class="fc-f"><b>${i + 1}</b>${u.rich(f)}</div><div class="fc-b">${u.rich(arr(it.backs)[i] || "")}</div></div></div>
                <label class="fc-k row nowrap small"><input type="checkbox" data-kn="${i}" ${known.has(i) ? "checked" : ""}> Em đã nhớ thẻ ${i + 1}</label>`
              )
              .join("")}</div>
            <button class="btn primary lg block" style="margin-top:16px" data-send>Gửi (${known.size}/${arr(it.fronts).length} thẻ đã nhớ)</button></div>`;
          u.$$("[data-fc]", el).forEach((c) => (c.onclick = () => (flipped.has(+c.dataset.fc) ? flipped.delete(+c.dataset.fc) : flipped.add(+c.dataset.fc), c.classList.toggle("flip"))));
          u.$$("[data-kn]", el).forEach((c) => (c.onchange = () => (c.checked ? known.add(+c.dataset.kn) : known.delete(+c.dataset.kn), (u.$("[data-send]", el).textContent = `Gửi (${known.size}/${arr(it.fronts).length} thẻ đã nhớ)`))));
          u.$("[data-send]", el).onclick = () => ctx.submit({ known: [...known].sort((a, b) => a - b) });
        };
        draw();
      },
      result(el, ctx) {
        const it = ctx.item || {};
        const v = (ctx.sub && ctx.sub.v) || {};
        const k = new Set(arr(v.known));
        el.innerHTML = `<div class="card"><h2>${u.rich(it.question || "Thẻ ghi nhớ")}</h2><p>Em đã nhớ <b>${k.size}/${arr(it.fronts).length}</b> thẻ.</p>
          <div class="col" style="gap:8px">${arr(it.fronts)
            .map((f, i) => `<div class="card flat" style="padding:10px 14px;${k.has(i) ? "border-color:var(--ok);background:var(--ok-bg)" : ""}"><b>${i + 1}. ${u.rich(f)}</b><br><span class="small">${u.rich(arr(it.backs)[i] || "")}</span></div>`)
            .join("")}</div></div>`;
      }
    },
    screen(el, ctx) {
      const s = ctx.step;
      const on = new Set(flipOf(ctx.state, s));
      const subs = u.vals(ctx.subs).map((x) => x.v).filter(Boolean);
      const rate = (i) => u.pct(subs.filter((v) => arr(v.known).includes(i)).length, subs.length);
      el.innerHTML = `<h1 class="scr-q">${u.rich(s.question || s.title)}</h1><div class="fc-grid scr" style="--c:${s.pairs.length > 8 ? 4 : s.pairs.length > 4 ? 4 : s.pairs.length}">${s.pairs
        .map(
          (p, i) => `<div class="fc ${on.has(i) ? "flip" : ""}"><div class="fc-in"><div class="fc-f"><b>${i + 1}</b>${u.rich(p.left)}</div><div class="fc-b">${u.rich(p.right)}</div></div>${
            subs.length && ctx.state.phase !== "open" ? `<span class="fc-r pill ${rate(i) >= 70 ? "ok" : rate(i) >= 40 ? "warn" : "bad"}">${rate(i)}% nhớ</span>` : ""
          }</div>`
        )
        .join("")}</div>`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const on = new Set(flipOf(ctx.state, s));
      const subs = u.vals(ctx.subs).map((x) => x.v).filter(Boolean);
      const set = (list) => ctx.host.patchState({ flip: { id: s.id, on: list } });
      el.innerHTML = `<p class="small muted">Bấm để lật thẻ trên màn chiếu.</p><div class="row" style="gap:6px;flex-wrap:wrap">${s.pairs
        .map((p, i) => `<button class="btn sm ${on.has(i) ? "primary" : ""}" data-fl="${i}">${i + 1}. ${u.esc(p.left).slice(0, 24)}</button>`)
        .join("")}<button class="btn sm" data-fla="1">Lật tất cả</button><button class="btn sm ghost" data-fla="0">Úp tất cả</button></div>${ui.bars(
        s.pairs.map((p, i) => ({ label: `${i + 1}. ${u.esc(p.left)}`, value: subs.filter((v) => arr(v.known).includes(i)).length, correct: true })),
        { total: subs.length || 1 }
      )}`;
      u.$$("[data-fl]", el).forEach((b) => (b.onclick = () => {
        const i = Number(b.dataset.fl);
        set(on.has(i) ? [...on].filter((x) => x !== i) : [...on, i]);
      }));
      u.$$("[data-fla]", el).forEach((b) => (b.onclick = () => set(b.dataset.fla === "1" ? s.pairs.map((_, i) => i) : [])));
    }
  });

  /* ================= Vòng quay may mắn ================= */
  const wheelOf = (st, s) => (st.wheel && st.wheel.id === s.id ? st.wheel : null);
  function wheelSvg(items, size) {
    const n = Math.max(2, items.length);
    const R = size / 2;
    const a = (2 * Math.PI) / n;
    const pt = (t, r) => [R + r * Math.sin(t), R - r * Math.cos(t)];
    const segs = items
      .map((t, i) => {
        const [x1, y1] = pt(i * a - a / 2, R - 4);
        const [x2, y2] = pt(i * a + a / 2, R - 4);
        const [tx, ty] = pt(i * a, R * 0.62);
        const lab = String(t).length > 22 ? String(t).slice(0, 21) + "…" : String(t);
        return `<path d="M${R},${R} L${x1},${y1} A${R - 4},${R - 4} 0 ${n <= 2 ? 1 : 0} 1 ${x2},${y2} Z" fill="${GC[i % GC.length]}" stroke="#fff" stroke-width="3"/>
          <text x="${tx}" y="${ty}" transform="rotate(${(i * 360) / n + (n > 4 ? 90 : 0)} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-weight="800" font-size="${Math.max(12, Math.min(26, (size / 16) * (10 / Math.max(10, lab.length)) * 1.6))}">${u.esc(lab)}</text>`;
      })
      .join("");
    return `<svg viewBox="0 0 ${size} ${size}" class="wh-svg">${segs}<circle cx="${R}" cy="${R}" r="${size * 0.08}" fill="#fff" stroke="#0F2742" stroke-width="4"/></svg>`;
  }
  L360.wheelSvg = wheelSvg;
  L360.registerType({
    type: "wheel",
    label: "Vòng quay may mắn",
    icon: "🎡",
    noSubmit: true,
    activity: true,
    releaseOnEnter: true,
    desc: "Vòng quay chia ô (câu hỏi, nhiệm vụ, chủ đề, phần thưởng…). Giáo viên bấm Quay, màn chiếu quay và dừng ngẫu nhiên ở một ô (không lặp ô đã ra); cả lớp cùng thực hiện nội dung của ô đó.",
    fields: [
      { key: "question", label: "Hướng dẫn", kind: "textarea" },
      { key: "items", label: "Các ô của vòng quay", kind: "list", hint: "4–10 ô, mỗi ô ngắn gọn" }
    ],
    template: () => ({ type: "wheel", phase: "khoi-dong", title: "Vòng quay may mắn", minutes: 4, question: "Quay vòng quay để chọn câu hỏi cho cả lớp.", items: ["Câu hỏi 1", "Câu hỏi 2", "Câu hỏi 3", "Câu hỏi 4", "Phần thưởng: +1 điểm", "Câu hỏi 5"] }),
    normalize(s) {
      s.items = arr(s.items)
        .map((x) => (typeof x === "string" ? x : x.text || x.label || ""))
        .map((x) => String(x).trim())
        .filter(Boolean)
        .slice(0, 12);
    },
    validate(s, err) {
      if ((s.items || []).length < 2) err("Vòng quay cần ít nhất 2 ô.");
    },
    publicPayload: (s) => ({ question: s.question || "", items: s.items }),
    publicMeta: (s) => ({ question: s.question || "", items: s.items }),
    student: {
      render(el, ctx) {
        const s = ctx.step;
        const it = ctx.item || {};
        const w = wheelOf(ctx.state, s);
        el.innerHTML = `<div class="card"><span class="pill accent">🎡 Vòng quay may mắn</span><h2 style="margin-top:12px">${u.rich(it.question || "Quan sát vòng quay trên màn chiếu.")}</h2>
          ${w && w.r != null ? `<div class="wh-res">Kết quả: <b>${u.esc(arr(it.items)[w.r] || "")}</b></div>` : `<p class="muted">Chờ giáo viên quay…</p>`}
          <ol class="small">${arr(it.items).map((x, i) => `<li ${w && arr(w.hist).includes(i) ? 'style="opacity:.55;text-decoration:line-through"' : ""}>${u.esc(x)}</li>`).join("")}</ol></div>`;
      }
    },
    screen(el, ctx) {
      const s = ctx.step;
      const w = wheelOf(ctx.state, s);
      let box = el.querySelector(".wh-wrap");
      if (!box || box.dataset.id !== s.id) {
        el.innerHTML = `<div class="wh-wrap" data-id="${u.esc(s.id)}"><div class="wh-l"><h1 class="scr-q">${u.rich(s.question || s.title)}</h1><div class="wh-out"></div><div class="wh-hist"></div></div><div class="wh-r"><div class="wh-ptr">▼</div><div class="wh-rot">${wheelSvg(s.items, 600)}</div></div></div>`;
        box = el.querySelector(".wh-wrap");
        box._n = null;
      }
      const rot = box.querySelector(".wh-rot");
      const out = box.querySelector(".wh-out");
      const show = () => {
        out.innerHTML = w && w.r != null ? `<div class="wh-res big">${u.esc(s.items[w.r] || "")}</div>` : `<p class="muted" style="font-size:1.3rem">Giáo viên bấm “Quay”.</p>`;
        box.querySelector(".wh-hist").innerHTML = w && arr(w.hist).length > 1 ? `<p class="small muted">Đã ra: ${arr(w.hist).map((i) => u.esc(s.items[i] || "")).join(" · ")}</p>` : "";
      };
      if (w && w.n !== box._n) {
        const first = box._n == null;
        box._n = w.n;
        const n = s.items.length;
        // Ô thứ r dừng đúng dưới kim (đỉnh vòng), lệch nhẹ trong ô cho tự nhiên; luôn quay tiếp theo chiều kim đồng hồ.
        const jit = ((u.hash(String(w.n)) % 1000) / 1000 - 0.5) * (360 / n) * 0.6;
        const base = Math.floor((Number(rot.dataset.deg) || 0) / 360) * 360 + 360;
        const to = base + 360 * 5 + ((360 - (w.r * 360) / n) % 360) + jit;
        rot.dataset.deg = to;
        if (first && Date.now() - w.n > 5000) {
          rot.style.transition = "none";
          rot.style.transform = `rotate(${to}deg)`;
          show();
        } else {
          rot.style.transition = "transform 4.2s cubic-bezier(.12,.6,.18,1)";
          rot.style.transform = `rotate(${to}deg)`;
          out.innerHTML = `<p class="muted" style="font-size:1.4rem">Đang quay…</p>`;
          if (ctx.state.sound !== false && snd) snd.drumroll(4);
          clearTimeout(box._t);
          box._t = setTimeout(show, 4300);
        }
      } else if (!w) show();
    },
    host(el, ctx) {
      const s = ctx.step;
      const w = wheelOf(ctx.state, s) || {};
      const hist = arr(w.hist);
      el.innerHTML = `<button class="btn primary lg" data-spin>🎡 Quay</button> <button class="btn sm ghost" data-reset>Làm lại từ đầu</button>
        ${w.r != null ? `<p style="margin-top:10px">Kết quả: <b>${u.esc(s.items[w.r] || "")}</b></p>` : ""}${hist.length ? `<p class="small muted">Đã ra: ${hist.map((i) => u.esc(s.items[i] || "")).join(" · ")}</p>` : ""}`;
      u.$("[data-spin]", el).onclick = () => {
        let pool = s.items.map((_, i) => i).filter((i) => !hist.includes(i));
        let h = hist;
        if (!pool.length) (pool = s.items.map((_, i) => i)), (h = []);
        const r = pool[Math.floor(Math.random() * pool.length)];
        ctx.host.patchState({ wheel: { id: s.id, n: Date.now(), r, hist: h.concat([r]) } });
      };
      u.$("[data-reset]", el).onclick = () => ctx.host.patchState({ wheel: { id: s.id, n: null, r: null, hist: [] } });
    }
  });

  /* ================= Bày tỏ quan điểm (bốn góc) ================= */
  L360.registerType({
    type: "stance",
    label: "Bày tỏ quan điểm (bốn góc)",
    icon: "⚖",
    desc: "Đưa ra một nhận định gây tranh luận; học sinh chọn quan điểm (đồng ý – phân vân – không đồng ý…) và nêu lí do. Màn chiếu hiện tỉ lệ mỗi góc và lập luận tiêu biểu để tranh luận, rồi giáo viên chốt.",
    fields: [
      { key: "question", label: "Nhận định", kind: "textarea" },
      { key: "options", label: "Các quan điểm (góc)", kind: "list", hint: "2–4 lựa chọn" },
      { key: "reasonPrompt", label: "Yêu cầu nêu lí do", kind: "text" },
      { key: "maxWords", label: "Giới hạn từ", kind: "number" },
      { key: "conclusion", label: "Giáo viên chốt sau tranh luận", kind: "textarea" },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({
      type: "stance",
      phase: "khoi-dong",
      title: "Em đứng ở góc nào?",
      minutes: 5,
      question: "Nhận định: …",
      options: ["Hoàn toàn đồng ý", "Đồng ý một phần", "Không đồng ý"],
      reasonPrompt: "Vì sao em chọn như vậy?",
      maxWords: 30,
      conclusion: "",
      timer: 120
    }),
    normalize(s) {
      s.options = arr(s.options).map((x) => String(typeof x === "string" ? x : x.text || x.label || "").trim()).filter(Boolean).slice(0, 4);
      if (s.options.length < 2) s.options = ["Đồng ý", "Phân vân", "Không đồng ý"];
      s.maxWords = Number(s.maxWords) || 30;
    },
    validate(s, err) {
      if (!s.question) err("Chưa có nhận định.");
    },
    publicPayload: (s) => ({ question: s.question, options: s.options, reasonPrompt: s.reasonPrompt || "", maxWords: s.maxWords }),
    publicMeta: (s) => ({ question: s.question, options: s.options }),
    answerPayload: (s) => ({ conclusion: s.conclusion || "" }),
    describe: (s, key, v) => (v ? `${s.options[v.o] || ""}${v.text ? " | " + v.text : ""}` : ""),
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        const prev = (ctx.sub && ctx.sub.v) || {};
        let o = prev.o == null ? null : prev.o;
        const draw = () => {
          const text = u.$("#ta", el) ? u.$("#ta", el).value : prev.text || "";
          el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Bày tỏ quan điểm</span><span class="spacer"></span>${ui.timer()}</div>
            <h2 style="margin-top:12px">${u.rich(it.question)}</h2>
            <div class="st-opts">${arr(it.options).map((x, i) => `<button class="st-opt ${o === i ? "on" : ""}" data-o="${i}" style="--g:${GC[i % GC.length]}">${u.esc(x)}</button>`).join("")}</div>
            ${it.reasonPrompt ? `<p style="margin:16px 0 6px;font-weight:650">${u.esc(it.reasonPrompt)}</p>${ui.textarea("ta", { value: text, max: it.maxWords, rows: 3 })}` : ""}
            <button class="btn primary lg block" style="margin-top:16px" data-send>Gửi</button></div>`;
          ui.bindWordCount(el);
          u.$$("[data-o]", el).forEach((b) => (b.onclick = () => ((o = Number(b.dataset.o)), draw())));
          u.$("[data-send]", el).onclick = () => {
            if (o == null) return u.toast("Hãy chọn quan điểm của em.", "bad");
            const t = u.$("#ta", el) ? u.$("#ta", el).value.trim() : "";
            if (it.reasonPrompt && !t) return u.toast("Hãy nêu lí do.", "bad");
            if (u.words(t) > it.maxWords) return u.toast(`Tối đa ${it.maxWords} từ.`, "bad");
            ctx.submit({ o, text: t });
          };
        };
        draw();
      },
      result(el, ctx) {
        const it = ctx.item || {};
        const v = (ctx.sub && ctx.sub.v) || {};
        el.innerHTML = `<div class="card"><h2>${u.rich(it.question)}</h2><p>Em chọn: <b>${u.esc(arr(it.options)[v.o] || "–")}</b></p>${v.text ? `<div class="card flat" style="background:var(--paper)">${u.rich(v.text)}</div>` : ""}
          ${ctx.answer && ctx.answer.conclusion ? `<div class="card flat" style="margin-top:12px;border-color:var(--accent)"><b>Kết luận.</b><div class="md">${ui.md(ctx.answer.conclusion)}</div></div>` : ""}</div>`;
      }
    },
    screen(el, ctx) {
      const s = ctx.step;
      const subs = u.vals(ctx.subs).map((x) => x.v).filter(Boolean);
      const show = ctx.mode === "live" || ctx.state.phase !== "open";
      const feat = u.vals(ctx.featured).filter((x) => typeof x === "string");
      el.innerHTML = `<h1 class="scr-q">${u.rich(s.question)}</h1><div class="st-corners" style="--n:${s.options.length}">${s.options
        .map((o, i) => {
          const n = subs.filter((v) => v.o === i).length;
          return `<div class="st-c" style="--g:${GC[i % GC.length]}"><div class="st-h">${u.esc(o)}</div>${
            show ? `<div class="st-n">${n}<small> em · ${u.pct(n, subs.length)}%</small></div><div class="st-bar"><i style="width:${u.pct(n, subs.length)}%"></i></div>` : `<div class="st-n muted">?</div>`
          }</div>`;
        })
        .join("")}</div>
        ${feat.length ? `<div class="scr-feats">${feat.map((t) => `<blockquote class="scr-feat">“${u.esc(t)}”</blockquote>`).join("")}</div>` : ""}
        ${ctx.answer && ctx.answer.conclusion ? `<div class="scr-explain"><b>Kết luận.</b> ${ui.md(ctx.answer.conclusion)}</div>` : ""}`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const { host, data, key } = ctx;
      const feats = (data.pub && data.pub.featured && data.pub.featured[key]) || {};
      const subs = u.vals(ctx.subs).map((x) => x.v).filter(Boolean);
      el.innerHTML =
        ui.bars(s.options.map((o, i) => ({ label: u.esc(o), value: subs.filter((v) => v.o === i).length })), { total: subs.length || 1 }) +
        `<h3 style="margin-top:14px">Lí do</h3>` +
        (u
          .entries(ctx.subs)
          .filter(([, x]) => x.v && x.v.text)
          .map(([c, x]) => `<div class="row nowrap" style="align-items:flex-start;margin-bottom:8px"><button class="btn sm ${feats[c] ? "primary" : ""}" data-feat="${c}">★</button><div><b>${c}</b> <span class="pill">${u.esc(s.options[x.v.o] || "")}</span> ${u.esc(x.v.text)}</div></div>`)
          .join("") || `<p class="muted small">Chưa có lí do.</p>`);
      u.$$("[data-feat]", el).forEach((b) => (b.onclick = () => host.feature(key, b.dataset.feat, `${s.options[ctx.subs[b.dataset.feat].v.o] || ""}: ${ctx.subs[b.dataset.feat].v.text}`)));
    }
  });

  /* ================= Bảng KWL ================= */
  const KWL = [
    ["k", "K – Em đã biết", "#2F6FDB"],
    ["w", "W – Em muốn biết", "#E8930C"],
    ["l", "L – Em đã học được", "#1E8E5A"]
  ];
  L360.KWL = KWL;
  L360.registerType({
    type: "kwl",
    label: "Bảng KWL",
    icon: "▥",
    desc: 'Kĩ thuật KWL: đầu giờ (stage "kw") học sinh ghi điều đã biết (K) và muốn biết (W) về chủ đề; cuối giờ (stage "l", trường "from" = id bước KWL đầu giờ) ghi điều đã học được (L). Màn chiếu hiện bảng ba cột bằng thẻ ghi chú của cả lớp.',
    fields: [
      { key: "question", label: "Chủ đề", kind: "textarea" },
      { key: "stage", label: "Thời điểm", kind: "select", options: [["kw", "Đầu giờ: K và W"], ["l", "Cuối giờ: L"]] },
      { key: "from", label: "Mã bước KWL đầu giờ (cho bước cuối giờ)", kind: "text" },
      { key: "maxWords", label: "Giới hạn từ mỗi ô", kind: "number" },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({ type: "kwl", phase: "khoi-dong", title: "Bảng KWL", minutes: 4, question: "Chủ đề: …", stage: "kw", maxWords: 25, timer: 150 }),
    normalize(s) {
      s.stage = s.stage === "l" ? "l" : "kw";
      s.maxWords = Number(s.maxWords) || 25;
    },
    validate(s, err) {
      if (!s.question) err("Chưa có chủ đề.");
    },
    publicPayload: (s) => ({ question: s.question, stage: s.stage, maxWords: s.maxWords }),
    publicMeta: (s) => ({ question: s.question, stage: s.stage, from: s.from || "" }),
    describe: (s, key, v) => (v ? ["k", "w", "l"].filter((k) => v[k]).map((k) => `${k.toUpperCase()}: ${v[k]}`).join(" | ") : ""),
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        const prev = (ctx.sub && ctx.sub.v) || {};
        const cols = it.stage === "l" ? KWL.slice(2) : KWL.slice(0, 2);
        el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Bảng KWL</span><span class="spacer"></span>${ui.timer()}</div><h2 style="margin-top:12px">${u.rich(it.question)}</h2>
          ${cols.map(([k, lab, c]) => `<p style="margin:14px 0 6px;font-weight:700;color:${c}">${lab}</p>${ui.textarea("kw-" + k, { value: prev[k] || "", max: it.maxWords, rows: 3 })}`).join("")}
          <button class="btn primary lg block" style="margin-top:16px" data-send>Gửi</button></div>`;
        ui.bindWordCount(el);
        u.$("[data-send]", el).onclick = () => {
          const v = {};
          for (const [k] of cols) {
            const t = u.$("#kw-" + k, el).value.trim();
            if (!t) return u.toast("Hãy điền đủ các ô.", "bad");
            if (u.words(t) > it.maxWords) return u.toast(`Mỗi ô tối đa ${it.maxWords} từ.`, "bad");
            v[k] = t;
          }
          ctx.submit(v);
        };
      },
      result(el, ctx) {
        const v = (ctx.sub && ctx.sub.v) || {};
        el.innerHTML = `<div class="card"><h2>${u.rich((ctx.item || {}).question || "")}</h2>${KWL.filter(([k]) => v[k]).map(([k, lab, c]) => `<p><b style="color:${c}">${lab}:</b> ${u.esc(v[k])}</p>`).join("")}</div>`;
      }
    },
    screen(el, ctx) {
      const s = ctx.step;
      const mine = u.vals(ctx.subs).map((x) => x.v).filter(Boolean);
      const prev = s.from && ctx.data && ctx.data.subs ? u.vals(ctx.data.subs[s.from] || {}).map((x) => x.v).filter(Boolean) : [];
      const src = { k: s.stage === "kw" ? mine : prev, w: s.stage === "kw" ? mine : prev, l: s.stage === "l" ? mine : [] };
      const show = ctx.mode === "live" || ctx.state.phase !== "open";
      el.innerHTML = `<h1 class="scr-q">${u.rich(s.question)}</h1><div class="kwl">${KWL.map(([k, lab, c]) => {
        const list = src[k].map((v) => v[k]).filter(Boolean);
        const act = s.stage === "kw" ? k !== "l" : k === "l";
        return `<div class="kwl-c ${act ? "act" : ""}" style="--g:${c}"><div class="kwl-h">${lab} <span>${list.length}</span></div><div class="kwl-b">${
          show || !act ? list.slice(-12).map((t) => `<div class="kwl-n">${u.esc(t)}</div>`).join("") : `<p class="muted">Học sinh đang viết…</p>`
        }</div></div>`;
      }).join("")}</div>`;
    },
    host(el, ctx) {
      const subs = u.entries(ctx.subs).filter(([, x]) => x.v);
      el.innerHTML = `<p class="small muted">${subs.length} em đã gửi.</p>${subs.map(([c, x]) => `<div class="small" style="margin-bottom:6px"><b>${c}</b>: ${["k", "w", "l"].filter((k) => x.v[k]).map((k) => `<b>${k.toUpperCase()}</b> ${u.esc(x.v[k])}`).join(" · ")}</div>`).join("")}`;
    }
  });
})();
