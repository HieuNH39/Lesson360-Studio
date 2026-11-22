/* Mẫu hoạt động cơ bản: Trình chiếu, Trắc nghiệm nhanh, Hai vòng (học từ bạn), Trả lời ngắn / Phiếu thoát.

   Hợp đồng chung của một mẫu hoạt động (L360.registerType):
   - type, label, desc, icon, fields (cho trình soạn), template() – bước mẫu
   - normalize(step), validate(step, err, warn)
   - subKey(step, state), keys(step, meta), count(step), timerFor(step, state)
   - publicPayload(step, state)  -> nội dung phát cho học sinh (không có đáp án)
   - answerPayload(step, state)  -> đáp án, công bố khi giáo viên bấm "Công bố"
   - isCorrect(step, key, value), points(step), describe(step, key, value)
   - student.input(el, ctx) / student.result(el, ctx) / student.render(el, ctx)
   - screen(el, ctx), host(el, ctx), controls(ctx)
   ctx học sinh: {code, me, group, groups, step, state, key, item, answer, sub, submit(v), gsub, gsubmit(v), featured, awards, gwork, gworkSet, gworkPush, expo, myScore}
   ctx màn chiếu: {data, state, step, key, item, answer, subs, gsubs, joined, groups, featured, mode}
   ctx giáo viên: {host, data, step (đầy đủ, có đáp án), state, key, subs, gsubs, joined, groups} */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;

  // Văn bản ngắn có gạch đầu dòng "- " và **đậm**.
  ui.md = (text) => {
    const lines = String(text || "").split(/\r?\n/);
    let out = "";
    let inList = false;
    lines.forEach((ln) => {
      const m = ln.match(/^\s*[-•*]\s+(.*)$/);
      if (m) {
        if (!inList) {
          out += "<ul>";
          inList = true;
        }
        out += `<li>${u.rich(m[1])}</li>`;
      } else {
        if (inList) {
          out += "</ul>";
          inList = false;
        }
        if (ln.trim()) out += `<p>${u.rich(ln)}</p>`;
      }
    });
    if (inList) out += "</ul>";
    return out;
  };

  const countBy = (subs, n, pick) => {
    const arr = Array(n).fill(0);
    u.vals(subs).forEach((s) => {
      const v = pick ? pick(s.v) : s.v;
      if (typeof v === "number" && arr[v] != null) arr[v]++;
    });
    return arr;
  };
  const mediaFields = [
    { key: "media.image", label: "Ảnh (đường dẫn)", kind: "text", hint: "Ảnh có giấy phép mở, ví dụ Wikimedia Commons" },
    { key: "media.caption", label: "Chú thích ảnh", kind: "text" },
    { key: "media.credit", label: "Nguồn ảnh", kind: "text" },
    { key: "media.video", label: "Video (đường dẫn)", kind: "text" },
    { key: "media.link", label: "Đường dẫn mở rộng", kind: "text" }
  ];
  L360.mediaFields = mediaFields;

  /* ---------------- Trình chiếu ---------------- */
  L360.registerType({
    type: "slide",
    label: "Trình chiếu nội dung",
    icon: "▤",
    desc: "Chiếu khái niệm, tư liệu, ghi nhớ; học sinh xem cùng trên máy. Không nộp bài.",
    noSubmit: true,
    releaseOnEnter: true,
    fields: [{ key: "body", label: "Nội dung", kind: "textarea", hint: "Mỗi ý một dòng; dòng bắt đầu bằng - là gạch đầu dòng; **chữ đậm**" }].concat(mediaFields),
    template: () => ({ type: "slide", title: "Ghi nhớ", minutes: 2, body: "- Ý chính thứ nhất\n- Ý chính thứ hai", script: "" }),
    validate(s, err) {
      if (!s.body && !(s.media && s.media.image)) err("Trình chiếu cần nội dung hoặc ảnh.");
    },
    publicPayload: (s) => ({ title: s.title, body: s.body || "", media: s.media || null }),
    student: {
      render(el, ctx) {
        const it = ctx.item || {};
        el.innerHTML = `<div class="card"><h2>${u.esc(ctx.step.title)}</h2>${ui.media(it.media)}<div class="md">${ui.md(it.body)}</div></div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item || {};
      const hasImg = it.media && it.media.image;
      el.innerHTML = `<div class="${hasImg ? "grid g2" : ""}" style="align-items:center;height:100%">
        <div class="md scr-text">${ui.md(it.body)}</div>${hasImg ? `<div>${ui.media(it.media, { big: true })}</div>` : ""}</div>`;
    },
    host(el, ctx) {
      el.innerHTML = `<div class="md small">${ui.md(ctx.step.body)}</div>${ui.media(ctx.step.media)}`;
    }
  });

  /* ---------------- Trắc nghiệm nhanh ---------------- */
  L360.registerType({
    type: "quiz",
    label: "Trắc nghiệm nhanh",
    icon: "✓",
    desc: "Chuỗi câu hỏi 4 lựa chọn, mỗi câu có giờ; tự khoá khi hết giờ hoặc cả lớp đã nộp; có bảng xếp hạng. Không tính tốc độ.",
    autoLockWhenAll: true,
    fields: [
      { key: "timer", label: "Giây cho mỗi câu", kind: "number", hint: "Mặc định 20" },
      { key: "questions", label: "Câu hỏi", kind: "questions" }
    ],
    template: () => ({
      type: "quiz",
      title: "Thử thách nhanh",
      minutes: 5,
      timer: 20,
      questions: [{ q: "Câu hỏi?", options: ["Phương án A", "Phương án B", "Phương án C", "Phương án D"], answer: 0, explain: "Giải thích ngắn." }]
    }),
    normalize(s) {
      s.questions = (s.questions || []).map((q) => Object.assign({ options: [], answer: 0, explain: "" }, q));
      s.timer = Number(s.timer) || 20;
    },
    validate(s, err, warn) {
      if (!s.questions || !s.questions.length) err("Chưa có câu hỏi.");
      (s.questions || []).forEach((q, i) => {
        if (!q.q) err(`Câu ${i + 1} chưa có nội dung.`);
        if (!Array.isArray(q.options) || q.options.length < 2) err(`Câu ${i + 1} cần ít nhất 2 phương án.`);
        else if (!(q.answer >= 0 && q.answer < q.options.length)) err(`Câu ${i + 1}: đáp án (answer) phải là số thứ tự 0–${q.options.length - 1}.`);
        if (!q.explain) warn(`Câu ${i + 1} chưa có giải thích đáp án.`);
      });
      if ((s.questions || []).length > 10) warn("Nhiều hơn 10 câu – cân nhắc tách thành 2 hoạt động.");
    },
    count: (s) => (s.questions || []).length,
    subKey: (s, st) => `${s.id}__q${st.q || 0}`,
    keys: (s) => (s.questions || []).map((q, i) => ({ key: `${s.id}__q${i}`, label: `${s.title} – Câu ${i + 1}` })),
    timerFor: (s) => Number(s.timer) || 20,
    publicPayload(s, st) {
      const i = st.q || 0;
      const q = s.questions[i] || {};
      return { q: i, total: s.questions.length, text: q.q || "", options: q.options || [], image: q.image || "" };
    },
    answerPayload(s, st) {
      const q = s.questions[st.q || 0] || {};
      return { answer: q.answer, explain: q.explain || "" };
    },
    isCorrect(s, key, v) {
      const i = Number(String(key).split("__q")[1]);
      const q = s.questions[i];
      return q ? v === q.answer : null;
    },
    points: () => 100,
    describe(s, key, v) {
      return typeof v === "number" ? u.letter(v) : "";
    },
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        let sel = null;
        const draw = () => {
          el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Câu ${it.q + 1}/${it.total}</span><span class="spacer"></span>${ui.timer()}</div>
          <h2 style="margin-top:12px">${u.rich(it.text)}</h2>${it.image ? ui.media({ image: it.image }) : ""}
          ${ui.options(it.options || [], { selected: sel })}
          <button class="btn primary lg block" style="margin-top:16px" data-send ${sel == null ? "disabled" : ""}>Gửi đáp án</button>
          <p class="small muted center" style="margin-top:8px">Đây là cơ hội kiểm tra điều mình hiểu, không phải chạy đua tốc độ.</p></div>`;
          u.$$("[data-opt]", el).forEach((b) => (b.onclick = () => ((sel = Number(b.dataset.opt)), draw())));
          u.$("[data-send]", el).onclick = () => sel != null && ctx.submit(sel);
        };
        draw();
      },
      result(el, ctx) {
        const it = ctx.item || {};
        const ans = ctx.answer;
        const mine = ctx.sub ? ctx.sub.v : null;
        const ok = ans && mine === ans.answer;
        el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Câu ${it.q + 1}/${it.total}</span><span class="spacer"></span>
          ${ans ? (mine == null ? `<span class="pill warn">Em chưa trả lời</span>` : ok ? `<span class="pill ok">Đúng · +100</span>` : `<span class="pill bad">Chưa đúng</span>`) : `<span class="pill">Đã khoá</span>`}</div>
          <h2 style="margin-top:12px">${u.rich(it.text)}</h2>
          ${ui.options(it.options || [], { selected: mine, answer: ans ? ans.answer : null, mine, disabled: true })}
          ${ans && ans.explain ? `<div class="card flat" style="margin-top:14px;background:var(--paper)"><b>Giải thích.</b> ${u.rich(ans.explain)}</div>` : ""}
          ${ans ? `<p class="center" style="margin-top:12px">Điểm của em: <b>${ctx.myScore || 0}</b></p>` : `<p class="center muted" style="margin-top:12px">Chờ giáo viên công bố đáp án.</p>`}</div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item;
      const st = ctx.state;
      const s = ctx.step;
      if (!it || st.phase === "observe") {
        el.innerHTML = `<div class="scr-center"><div class="pill accent" style="font-size:1.2rem">${s.count} câu hỏi · ${u.esc(s.title)}</div>
          <h1 style="font-size:3.2rem;margin-top:20px">Sẵn sàng câu ${(st.q || 0) + 1}</h1><p class="muted" style="font-size:1.4rem">${u.esc(s.instructions || "Mỗi câu có thời gian riêng. Điểm không tính tốc độ.")}</p></div>`;
        return;
      }
      const cnt = countBy(ctx.subs, (it.options || []).length);
      const n = Object.keys(ctx.subs || {}).length;
      const ans = ctx.answer;
      const showDist = ans || ctx.mode === "live";
      el.innerHTML = `<div class="row"><span class="pill accent" style="font-size:1.05rem">Câu ${it.q + 1}/${it.total}</span></div>
        <h1 class="scr-q">${u.rich(it.text)}</h1>
        ${
          showDist
            ? ui.bars(
                (it.options || []).map((o, i) => ({ label: `${u.letter(i)}. ${u.esc(o)}`, value: cnt[i], correct: ans && ans.answer === i, dim: ans && ans.answer !== i })),
                { total: n || 1 }
              ) + (ans && ans.explain ? `<div class="scr-explain"><b>Giải thích.</b> ${u.rich(ans.explain)}</div>` : "")
            : `<div class="scr-opts">${(it.options || []).map((o, i) => `<div class="scr-opt"><span class="k">${u.letter(i)}</span>${u.rich(o)}</div>`).join("")}</div>`
        }`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const q = s.questions[ctx.state.q || 0] || {};
      const cnt = countBy(ctx.subs, (q.options || []).length);
      const n = Object.keys(ctx.subs || {}).length;
      el.innerHTML = `<p class="small muted">Câu ${(ctx.state.q || 0) + 1}/${s.questions.length} · đáp án <b>${u.letter(q.answer)}</b></p>
        <p><b>${u.rich(q.q)}</b></p>${ui.bars(
          (q.options || []).map((o, i) => ({ label: `${u.letter(i)}. ${u.esc(o)}`, value: cnt[i], correct: i === q.answer })),
          { total: n || 1 }
        )}`;
    },
    controls(ctx) {
      const { host, state, step } = ctx;
      const q = state.q || 0;
      const last = q >= step.questions.length - 1;
      const c = [];
      if (state.phase === "observe") c.push({ label: `▶ Mở câu ${q + 1}`, cls: "primary", fn: () => host.open() });
      if (state.phase === "open") c.push({ label: "■ Khoá", cls: "dark", fn: () => host.lock() }, { label: "+10 giây", fn: () => host.addTime(10) });
      if (state.phase === "locked") c.push({ label: "✓ Công bố đáp án", cls: "ok", fn: () => host.reveal() });
      if (state.phase === "revealed") {
        if (!last) c.push({ label: `Câu tiếp theo (${q + 2}) ›`, cls: "primary", fn: () => host.setQ(q + 1, true) });
        else c.push({ label: "🏆 Bảng xếp hạng", cls: "primary", fn: () => host.setScreen("board") });
      }
      if (q > 0 && state.phase !== "open") c.push({ label: "‹ Câu trước", fn: () => host.setQ(q - 1, false) });
      return c;
    }
  });

  /* ---------------- Hai vòng – học từ bạn ---------------- */
  L360.registerType({
    type: "poll2",
    label: "Hai vòng – học từ bạn",
    icon: "⇄",
    desc: "Vòng 1 tự chọn → trao đổi cặp → vòng 2 giữ hoặc đổi → công bố. Màn chiếu so sánh hai vòng: minh chứng học sinh tiến bộ ngay trong tiết.",
    autoLockWhenAll: false,
    fields: [
      { key: "question", label: "Câu hỏi", kind: "textarea" },
      { key: "options", label: "Phương án", kind: "options" },
      { key: "explain", label: "Giải thích đáp án", kind: "textarea" },
      { key: "card", label: "Thẻ ghi nhớ sau khi công bố", kind: "textarea" },
      { key: "timer", label: "Giây vòng 1, vòng 2", kind: "pair", hint: "Ví dụ 60 và 45" }
    ],
    template: () => ({
      type: "poll2",
      title: "Em chọn gì?",
      minutes: 4,
      question: "Câu hỏi khái niệm dễ nhầm?",
      options: ["Phương án A", "Phương án B"],
      answer: 1,
      explain: "",
      card: "",
      timer: [60, 45]
    }),
    normalize(s) {
      s.options = s.options || [];
      if (!Array.isArray(s.timer)) s.timer = [Number(s.timer) || 60, 45];
    },
    validate(s, err, warn) {
      if (!s.question) err("Chưa có câu hỏi.");
      if (!Array.isArray(s.options) || s.options.length < 2) err("Cần ít nhất 2 phương án.");
      if (s.answer != null && !(s.answer >= 0 && s.answer < (s.options || []).length)) err("Đáp án (answer) không khớp số phương án.");
      if (s.answer == null) warn("Không có đáp án đúng – hoạt động sẽ chạy như thăm dò ý kiến.");
    },
    subKey: (s, st) => `${s.id}__r${st.round === 2 ? 2 : 1}`,
    keys: (s) => [
      { key: `${s.id}__r1`, label: `${s.title} – vòng 1` },
      { key: `${s.id}__r2`, label: `${s.title} – vòng 2` }
    ],
    timerFor: (s, st) => (st.round === 2 ? Number(s.timer[1]) || 45 : Number(s.timer[0]) || 60),
    publicPayload: (s, st) => ({ question: s.question, options: s.options, round: st.round === 2 ? 2 : 1 }),
    answerPayload: (s) => ({ answer: s.answer == null ? null : s.answer, explain: s.explain || "", card: s.card || "" }),
    isCorrect: (s, key, v) => (s.answer == null ? null : v === s.answer),
    describe: (s, key, v) => (typeof v === "number" ? u.letter(v) : ""),
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        const prev = ctx.mine ? ctx.mine[`${ctx.step.id}__r1`] : null;
        let sel = it.round === 2 && typeof prev === "number" ? prev : null;
        const draw = () => {
          el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Vòng ${it.round}</span><span class="spacer"></span>${ui.timer()}</div>
            ${it.round === 2 ? `<p class="small" style="margin-top:10px;background:var(--warn-bg);padding:8px 12px;border-radius:10px">Sau khi trao đổi với bạn: giữ hoặc đổi lựa chọn của em.</p>` : ""}
            <h2 style="margin-top:12px">${u.rich(it.question)}</h2>${ui.options(it.options || [], { selected: sel })}
            <button class="btn primary lg block" style="margin-top:16px" data-send ${sel == null ? "disabled" : ""}>Gửi lựa chọn</button></div>`;
          u.$$("[data-opt]", el).forEach((b) => (b.onclick = () => ((sel = Number(b.dataset.opt)), draw())));
          u.$("[data-send]", el).onclick = () => sel != null && ctx.submit(sel);
        };
        draw();
      },
      result(el, ctx) {
        const it = ctx.item || {};
        const ans = ctx.answer;
        const mine = ctx.sub ? ctx.sub.v : null;
        const has = ans && ans.answer != null;
        el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Vòng ${it.round}</span><span class="spacer"></span>${
          has ? (mine === ans.answer ? `<span class="pill ok">Chính xác</span>` : `<span class="pill bad">Chưa chính xác</span>`) : ans ? "" : `<span class="pill">Đã khoá</span>`
        }</div><h2 style="margin-top:12px">${u.rich(it.question)}</h2>
          ${ui.options(it.options || [], { selected: mine, answer: has ? ans.answer : null, mine, disabled: true })}
          ${ans && ans.explain ? `<div class="card flat" style="margin-top:14px;background:var(--paper)"><b>Giải thích.</b> ${u.rich(ans.explain)}</div>` : ""}
          ${ans && ans.card ? `<div class="card flat" style="margin-top:12px;border-color:var(--accent)"><b>Thẻ ghi nhớ</b><div class="md">${ui.md(ans.card)}</div></div>` : ""}
          ${!ans ? `<p class="center muted" style="margin-top:12px">${it.round === 1 ? "Trao đổi với bạn bên cạnh: vì sao em chọn như vậy?" : "Chờ giáo viên công bố."}</p>` : ""}</div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item;
      const s = ctx.step;
      const d = ctx.data;
      const st = ctx.state;
      const opts = (it && it.options) || [];
      const k1 = `${s.id}__r1`;
      const k2 = `${s.id}__r2`;
      const s1 = (d.subs && d.subs[k1]) || {};
      const s2 = (d.subs && d.subs[k2]) || {};
      const ans = (d.pub && d.pub.answers && (d.pub.answers[k2] || d.pub.answers[k1])) || null;
      if (!it) {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:3rem">${u.esc(s.title)}</h1><p class="muted" style="font-size:1.4rem">${u.esc(s.instructions || "Chuẩn bị suy nghĩ độc lập ở vòng 1.")}</p></div>`;
        return;
      }
      const n1 = Object.keys(s1).length;
      const n2 = Object.keys(s2).length;
      const c1 = countBy(s1, opts.length);
      const c2 = countBy(s2, opts.length);
      let body;
      if (ans || (st.round === 2 && (st.phase !== "open" || ctx.mode === "live")))
        body = ui.pairBars(opts.map((o, i) => `${u.letter(i)}. ${u.esc(o)}`), c1, c2, n1 || 1, n2 || 1, ans ? ans.answer : null);
      else if (ctx.mode === "live" || st.phase === "locked")
        body = ui.bars(opts.map((o, i) => ({ label: `${u.letter(i)}. ${u.esc(o)}`, value: c1[i] })), { total: n1 || 1 });
      else body = `<div class="scr-opts">${opts.map((o, i) => `<div class="scr-opt"><span class="k">${u.letter(i)}</span>${u.rich(o)}</div>`).join("")}</div>`;
      el.innerHTML = `<div class="row"><span class="pill accent" style="font-size:1.05rem">Vòng ${st.round === 2 ? 2 : 1}</span>${
        n1 ? `<span class="pill">Vòng 1: ${n1} lượt</span>` : ""
      }${n2 ? `<span class="pill">Vòng 2: ${n2} lượt</span>` : ""}</div><h1 class="scr-q">${u.rich(it.question)}</h1>${body}
      ${
        ans && (ans.explain || ans.card)
          ? `<div class="grid ${ans.explain && ans.card ? "g2" : ""}" style="gap:16px">${ans.explain ? `<div class="scr-explain"><b>Giải thích.</b> ${u.rich(ans.explain)}</div>` : ""}${
              ans.card ? `<div class="scr-explain" style="border-color:var(--accent)"><b>Thẻ ghi nhớ.</b> ${ui.md(ans.card)}</div>` : ""
            }</div>`
          : ""
      }`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const d = ctx.data;
      const s1 = (d.subs && d.subs[`${s.id}__r1`]) || {};
      const s2 = (d.subs && d.subs[`${s.id}__r2`]) || {};
      el.innerHTML = `<p class="small muted">Đáp án: <b>${s.answer == null ? "không có (thăm dò)" : u.letter(s.answer)}</b></p>${ui.pairBars(
        s.options.map((o, i) => `${u.letter(i)}. ${u.esc(o)}`),
        countBy(s1, s.options.length),
        countBy(s2, s.options.length),
        Object.keys(s1).length || 1,
        Object.keys(s2).length || 1,
        s.answer
      )}`;
    },
    controls(ctx) {
      const { host, state } = ctx;
      const c = [];
      const r = state.round === 2 ? 2 : 1;
      if (state.phase === "observe") c.push({ label: "▶ Mở vòng 1", cls: "primary", fn: () => host.open() });
      if (state.phase === "open")
        c.push({ label: "■ Khoá", cls: "dark", fn: () => host.lock() }, { label: "+15 giây", fn: () => host.addTime(15) });
      if (state.phase === "locked" && r === 1)
        c.push({ label: "↻ Mở vòng 2", cls: "primary", fn: () => host.round2() }, { label: "✓ Công bố ngay", fn: () => host.reveal() });
      if (state.phase === "locked" && r === 2) c.push({ label: "✓ Công bố đáp án", cls: "ok", fn: () => host.reveal() });
      return c;
    }
  });

  /* ---------------- Trả lời ngắn / Phiếu thoát ---------------- */
  L360.registerType({
    type: "text",
    label: "Trả lời ngắn / Phiếu thoát",
    icon: "✎",
    desc: "Học sinh viết câu trả lời ngắn có giới hạn từ; tự đánh giá 3 mức; giáo viên gắn ★ bài hay để chiếu; màn chiếu có đám mây từ.",
    fields: [
      { key: "question", label: "Câu hỏi / nhiệm vụ", kind: "textarea" },
      { key: "maxWords", label: "Giới hạn số từ", kind: "number" },
      { key: "placeholder", label: "Câu mở đầu gợi ý", kind: "text", hint: "Ví dụ: Tôi muốn thế hệ tương lai hiểu rằng…" },
      { key: "selfAssess", label: "Có tự đánh giá 3 mức", kind: "bool" },
      { key: "askDoubt", label: "Hỏi điều còn băn khoăn", kind: "bool" },
      { key: "sample", label: "Gợi ý đáp án (công bố sau)", kind: "textarea" },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({ type: "text", title: "Phiếu thoát", minutes: 3, question: "Điều quan trọng nhất em học được hôm nay là gì?", maxWords: 40, selfAssess: true, askDoubt: true, timer: 120 }),
    normalize(s) {
      s.maxWords = Number(s.maxWords) || 40;
    },
    validate(s, err) {
      if (!s.question) err("Chưa có câu hỏi.");
    },
    publicPayload: (s) => ({
      question: s.question,
      maxWords: s.maxWords,
      placeholder: s.placeholder || "",
      selfAssess: !!s.selfAssess,
      selfLabels: s.selfLabels || ["Chưa vững", "Khá vững", "Rất vững"],
      askDoubt: !!s.askDoubt
    }),
    answerPayload: (s) => ({ sample: s.sample || "" }),
    describe: (s, key, v) => (v ? `${v.text || ""}${v.level ? ` [tự đánh giá ${v.level}/3]` : ""}${v.doubt ? ` [băn khoăn: ${v.doubt}]` : ""}` : ""),
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        const prev = (ctx.sub && ctx.sub.v) || {};
        let level = prev.level || 0;
        el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Viết ngắn</span><span class="spacer"></span>${ui.timer()}</div>
          <h2 style="margin-top:12px">${u.rich(it.question)}</h2>
          ${ui.textarea("ta", { value: prev.text || it.placeholder || "", max: it.maxWords, rows: 5 })}
          ${
            it.selfAssess
              ? `<p style="margin:14px 0 6px;font-weight:650">Em tự đánh giá mức hiểu bài:</p><div class="chips">${it.selfLabels
                  .map((l, i) => `<button class="chip ${level === i + 1 ? "sel" : ""}" data-lv="${i + 1}">${i + 1}. ${u.esc(l)}</button>`)
                  .join("")}</div>`
              : ""
          }
          ${it.askDoubt ? `<label class="field" style="margin-top:14px">Điều em còn băn khoăn (không bắt buộc)<input type="text" id="doubt" maxlength="160" value="${u.esc(prev.doubt || "")}"></label>` : ""}
          <button class="btn primary lg block" style="margin-top:16px" data-send>Gửi</button></div>`;
        ui.bindWordCount(el);
        u.$$("[data-lv]", el).forEach(
          (b) =>
            (b.onclick = () => {
              level = Number(b.dataset.lv);
              u.$$("[data-lv]", el).forEach((x) => x.classList.toggle("sel", x === b));
            })
        );
        u.$("[data-send]", el).onclick = () => {
          const text = u.$("#ta", el).value.trim();
          if (!text || text === it.placeholder.trim()) return u.toast("Em hãy viết câu trả lời.", "bad");
          if (u.words(text) > it.maxWords) return u.toast(`Tối đa ${it.maxWords} từ.`, "bad");
          if (it.selfAssess && !level) return u.toast("Chọn mức tự đánh giá.", "bad");
          const v = { text };
          if (level) v.level = level;
          const d = u.$("#doubt", el);
          if (d && d.value.trim()) v.doubt = d.value.trim();
          ctx.submit(v);
        };
      },
      result(el, ctx) {
        const it = ctx.item || {};
        const v = (ctx.sub && ctx.sub.v) || null;
        const ans = ctx.answer;
        el.innerHTML = `<div class="card"><h2>${u.rich(it.question)}</h2>
          ${v ? `<div class="card flat" style="background:var(--paper)"><div class="small muted">Câu trả lời của em</div>${u.rich(v.text)}</div>` : `<p class="muted">Em chưa nộp bài này.</p>`}
          ${ctx.featured ? `<p style="margin-top:10px"><span class="pill ok">★ Giáo viên đã chọn bài của em để chiếu</span></p>` : ""}
          ${ans && ans.sample ? `<div class="card flat" style="margin-top:12px;border-color:var(--accent)"><b>Gợi ý đáp án.</b><div class="md">${ui.md(ans.sample)}</div></div>` : ""}</div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item;
      if (!it) {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:3rem">${u.esc(ctx.step.title)}</h1><p class="muted" style="font-size:1.4rem">${u.esc(ctx.step.instructions || "")}</p></div>`;
        return;
      }
      const texts = u.vals(ctx.subs).map((s) => s.v && s.v.text);
      const feat = u.vals(ctx.featured).filter((x) => typeof x === "string");
      const ans = ctx.answer;
      let lv = "";
      if (it.selfAssess) {
        const c = [0, 0, 0];
        u.vals(ctx.subs).forEach((s) => s.v && s.v.level && c[s.v.level - 1]++);
        if (c.some(Boolean)) lv = `<h3 style="margin-top:18px">Tự đánh giá</h3>` + ui.bars(it.selfLabels.map((l, i) => ({ label: `${i + 1}. ${l}`, value: c[i] })), { total: texts.length || 1 });
      }
      el.innerHTML = `<h1 class="scr-q">${u.rich(it.question)}</h1>
        ${feat.length ? `<div class="scr-feats">${feat.map((t) => `<blockquote class="scr-feat">“${u.esc(t)}”</blockquote>`).join("")}</div>` : ""}
        ${ctx.mode === "live" || ctx.state.phase !== "open" ? ui.cloud(texts) : `<p class="muted center" style="font-size:1.3rem">Học sinh đang viết…</p>`}
        ${lv}${ans && ans.sample ? `<div class="scr-explain"><b>Gợi ý.</b> ${ui.md(ans.sample)}</div>` : ""}`;
    },
    host(el, ctx) {
      const { host, data, key } = ctx;
      const roster = data.roster || {};
      const feats = (data.pub && data.pub.featured && data.pub.featured[key]) || {};
      const list = u.entries(ctx.subs).sort((a, b) => a[0].localeCompare(b[0]));
      el.innerHTML = list.length
        ? `<div class="col" style="gap:8px">${list
            .map(
              ([c, s]) => `<div class="row nowrap" style="align-items:flex-start;border-bottom:1px solid var(--line);padding-bottom:8px">
          <button class="btn sm ${feats[c] ? "primary" : ""}" data-feat="${c}" title="Gắn ★ để chiếu">★</button>
          <div class="grow"><b>${c}</b> <span class="muted small">${u.esc((roster[c] || {}).name || "")}${s.v && s.v.level ? ` · tự đánh giá ${s.v.level}/3` : ""}</span><br>${u.esc(
                (s.v && s.v.text) || ""
              )}${s.v && s.v.doubt ? `<br><span class="small" style="color:var(--warn)">Băn khoăn: ${u.esc(s.v.doubt)}</span>` : ""}</div></div>`
            )
            .join("")}</div>`
        : `<p class="muted">Chưa có bài nộp.</p>`;
      u.$$("[data-feat]", el).forEach((b) => (b.onclick = () => host.feature(key, b.dataset.feat, (ctx.subs[b.dataset.feat].v || {}).text)));
    }
  });
})();
