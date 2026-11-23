/* Trò chơi Ô chữ (hàng ngang – từ khoá hàng dọc) và Video có câu hỏi xen giữa (EduHistory Studio, YouTube, tệp mp4). */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;
  const B = L360.blocks;
  const Q = () => L360.types.quiz;

  // Chữ in hoa không dấu, bỏ khoảng trắng: "Ai Cập" → "AICAP".
  const up = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[đĐ]/g, "D")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  L360.upWord = up;

  /* ---------------- Ô chữ ---------------- */
  L360.registerType({
    type: "crossword",
    label: "Trò chơi ô chữ",
    icon: "▦",
    desc: "Ô chữ hàng ngang có từ khoá hàng dọc: giáo viên chọn hàng, học sinh nhập đáp án trên máy, màn chiếu lật chữ. Hợp cho khởi động hoặc củng cố.",
    autoLockWhenAll: true,
    fields: [
      { key: "keyword", label: "Từ khoá hàng dọc", kind: "text", hint: "Viết hoa không dấu, ví dụ VANMINH" },
      { key: "keyClue", label: "Gợi ý cho từ khoá", kind: "text" },
      { key: "rows", label: "Các hàng ngang", kind: "cwrows" },
      { key: "timer", label: "Giây mỗi hàng", kind: "number" }
    ],
    template: () => ({
      type: "crossword",
      phase: "khoi-dong",
      title: "Giải ô chữ",
      minutes: 6,
      keyword: "SUHOC",
      keyClue: "Ngành khoa học nghiên cứu quá khứ loài người",
      timer: 30,
      rows: [
        { answer: "SUKIEN", clue: "Điều đã xảy ra trong quá khứ (6 chữ cái)" },
        { answer: "BAOTANG", clue: "Nơi lưu giữ hiện vật (7 chữ cái)" },
        { answer: "HIENVAT", clue: "Đồ vật người xưa để lại (7 chữ cái)" },
        { answer: "TULIEU", clue: "Nguồn để biết về quá khứ (6 chữ cái)" },
        { answer: "CODAI", clue: "Rất xa xưa (5 chữ cái)" }
      ]
    }),
    normalize(s) {
      s.keyword = up(s.keyword);
      s.timer = Number(s.timer) || 30;
      s.rows = (s.rows || []).map((r, i) => {
        const a = up(r.answer);
        let k = Number.isInteger(r.key) ? r.key : -1;
        if (!(k >= 0 && a[k] === s.keyword[i])) k = a.indexOf(s.keyword[i]);
        return { answer: a, clue: String(r.clue || ""), key: k };
      });
    },
    validate(s, err, warn) {
      if (!s.keyword) err("Chưa có từ khoá hàng dọc.");
      if (!s.rows || !s.rows.length) err("Chưa có hàng ngang.");
      if (s.keyword && s.rows && s.rows.length !== s.keyword.length) err(`Từ khoá có ${s.keyword.length} chữ nhưng có ${s.rows.length} hàng ngang – mỗi hàng góp 1 chữ cho từ khoá.`);
      (s.rows || []).forEach((r, i) => {
        if (!r.answer) err(`Hàng ${i + 1} chưa có đáp án.`);
        else if (r.key < 0) err(`Hàng ${i + 1} (${r.answer}) không chứa chữ "${s.keyword[i] || "?"}" của từ khoá.`);
        if (!r.clue) err(`Hàng ${i + 1} chưa có gợi ý.`);
        if (r.answer && r.answer.length > 14) warn(`Hàng ${i + 1} dài hơn 14 chữ cái – khó nhìn trên màn chiếu.`);
      });
    },
    count: (s) => (s.rows || []).length + 1,
    subKey: (s, st) => `${s.id}__q${st.q || 0}`,
    keys: (s) => (s.rows || []).map((r, i) => ({ key: `${s.id}__q${i}`, label: `${s.title} – hàng ${i + 1}` })).concat([{ key: `${s.id}__q${(s.rows || []).length}`, label: `${s.title} – từ khoá` }]),
    timerFor: (s, st) => ((st.q || 0) >= s.rows.length ? Number(s.keyTimer) || 60 : Number(s.timer) || 30),
    publicPayload(s, st) {
      const q = st.q || 0;
      const n = s.rows.length;
      const isKey = q >= n;
      return { q, total: n, isKey, len: isKey ? s.keyword.length : s.rows[q].answer.length, clue: isKey ? s.keyClue || "Từ khoá hàng dọc" : s.rows[q].clue, layout: s.rows.map((r) => ({ len: r.answer.length, key: r.key })) };
    },
    answerPayload(s, st) {
      const q = st.q || 0;
      const isKey = q >= s.rows.length;
      return { answer: isKey ? s.keyword : s.rows[q].answer, row: q, isKey, ghiBai: isKey ? s.ghiBai || "" : "" };
    },
    isCorrect(s, key, v) {
      const q = Number(String(key).split("__q")[1]);
      const a = q >= s.rows.length ? s.keyword : (s.rows[q] || {}).answer;
      return a ? up(v) === a : null;
    },
    points(s, key, v) {
      const q = Number(String(key).split("__q")[1]);
      return this.isCorrect(s, key, v) ? (q >= s.rows.length ? 200 : 100) : 0;
    },
    describe: (s, key, v) => String(v || ""),
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        const draw = (val) => {
          const w = up(val);
          el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">${it.isKey ? "Từ khoá hàng dọc" : `Hàng ngang ${it.q + 1}/${it.total}`}</span><span class="spacer"></span>${ui.timer()}</div>
            <h2 style="margin-top:12px">${u.rich(it.clue)}</h2>
            <div class="row" style="gap:6px;margin:12px 0">${Array.from({ length: it.len }, (_, i) => `<span class="cw-c" style="width:38px;height:42px;border:2px solid var(--line-2);border-radius:9px;display:grid;place-items:center;font-weight:800;background:#fff;color:var(--ink)">${u.esc(w[i] || "")}</span>`).join("")}</div>
            <label class="field">Đáp án (${it.len} chữ cái, không cần dấu)<input id="cwi" type="text" autocomplete="off" autocapitalize="characters" value="${u.esc(val || "")}" style="font-size:1.3rem;font-weight:800;letter-spacing:.12em;text-transform:uppercase"></label>
            <button class="btn primary lg block" style="margin-top:14px" data-send>Gửi đáp án</button></div>`;
          const inp = u.$("#cwi", el);
          inp.focus();
          inp.setSelectionRange(inp.value.length, inp.value.length);
          inp.oninput = () => draw(inp.value);
          inp.onkeydown = (e) => e.key === "Enter" && send();
          u.$("[data-send]", el).onclick = send;
        };
        const send = () => {
          const v = up(u.$("#cwi", el).value);
          if (!v) return u.toast("Nhập đáp án.", "bad");
          if (v.length !== it.len) return u.toast(`Đáp án cần ${it.len} chữ cái (em đang có ${v.length}).`, "bad");
          ctx.submit(v);
        };
        draw("");
      },
      result(el, ctx) {
        const it = ctx.item || {};
        const ans = ctx.answer;
        const mine = ctx.sub ? ctx.sub.v : null;
        const ok = ans && up(mine) === ans.answer;
        el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">${it.isKey ? "Từ khoá" : `Hàng ${it.q + 1}`}</span><span class="spacer"></span>${
          ans ? (ok ? `<span class="pill ok">Chính xác · +${it.isKey ? 200 : 100}</span>` : `<span class="pill bad">Chưa đúng</span>`) : `<span class="pill">Đã khoá</span>`
        }</div><h2 style="margin-top:12px">${u.rich(it.clue)}</h2><p>Em trả lời: <b style="letter-spacing:.1em">${u.esc(mine || "–")}</b></p>${ans ? `<p>Đáp án: <b style="letter-spacing:.1em;color:var(--ok)">${u.esc(ans.answer)}</b></p>` : `<p class="muted">Chờ giáo viên lật ô chữ.</p>`}${
          ans && ans.ghiBai ? B.one({ kind: "note", text: ans.ghiBai }) : ""
        }</div>`;
      }
    },
    screen(el, ctx) {
      const s = ctx.step;
      const st = ctx.state;
      const it = ctx.item;
      const answers = (ctx.data.pub && ctx.data.pub.answers) || {};
      const layout = (it && it.layout) || [];
      if (!layout.length) {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:3rem">${u.esc(s.title)}</h1><p class="muted" style="font-size:1.4rem">${u.esc(s.instructions || "Giải các hàng ngang để tìm từ khoá hàng dọc.")}</p></div>`;
        return;
      }
      const maxK = Math.max(...layout.map((r) => r.key));
      const maxR = Math.max(...layout.map((r) => r.len - r.key));
      const width = maxK + maxR;
      const n = layout.length;
      const keyAns = answers[`${s.id}__q${n}`];
      const q = st.q || 0;
      const rows = layout
        .map((r, i) => {
          const a = answers[`${s.id}__q${i}`];
          const off = maxK - r.key;
          const cells = Array.from({ length: width }, (_, c) => {
            const j = c - off;
            if (j < 0 || j >= r.len) return `<span class="cw-c blank"></span>`;
            return `<span class="cw-c ${j === r.key ? "key" : ""}">${a ? u.esc(a.answer[j]) : keyAns && j === r.key ? u.esc(keyAns.answer[i]) : ""}</span>`;
          }).join("");
          return `<div class="cw-row ${a ? "done" : ""} ${i === q && !it.isKey ? "cur" : ""}"><span class="cw-n">${i + 1}</span>${cells}</div>`;
        })
        .join("");
      const cnt = Object.keys(ctx.subs || {}).length;
      el.innerHTML = `<div class="cw">${rows}</div>${
        it.isKey
          ? `<div class="cw-key">Từ khoá hàng dọc (${it.len} chữ cái): ${keyAns ? `<b>${u.esc(keyAns.answer)}</b>` : `<span class="muted">${u.esc(it.clue)}</span>`}</div>`
          : st.phase !== "observe"
          ? `<div class="cw-clue">${u.rich(it.clue)} <span class="muted" style="font-weight:500">(${it.len} chữ cái)</span></div>`
          : ""
      }${ctx.mode === "live" && cnt ? `<p class="center muted" style="margin-top:10px">${cnt} học sinh đã trả lời</p>` : ""}`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const answers = (ctx.data.pub && ctx.data.pub.answers) || {};
      const q = ctx.state.q || 0;
      const ok = u.vals(ctx.subs).filter((x) => up(x.v) === (q >= s.rows.length ? s.keyword : (s.rows[q] || {}).answer)).length;
      el.innerHTML = `<p class="small muted">Chọn hàng để mở · ${ok}/${Object.keys(ctx.subs || {}).length} đúng ở lượt này</p><div class="col" style="gap:6px">${s.rows
        .map(
          (r, i) => `<button class="btn sm ${i === q ? "primary" : ""}" data-row="${i}" style="justify-content:flex-start">${answers[`${s.id}__q${i}`] ? "✓" : i + 1}. ${u.esc(r.answer)} — <span class="small" style="font-weight:500">${u.esc(r.clue)}</span></button>`
        )
        .join("")}<button class="btn sm ${q >= s.rows.length ? "primary" : ""}" data-row="${s.rows.length}">★ Từ khoá: ${u.esc(s.keyword)}</button></div>`;
      u.$$("[data-row]", el).forEach(
        (b) =>
          (b.onclick = async () => {
            if (ctx.state.phase === "open" && !(await u.confirm("Hàng hiện tại đang nhận bài. Chuyển hàng?", "Chuyển"))) return;
            ctx.host.setQ(Number(b.dataset.row), false);
          })
      );
    },
    controls(ctx) {
      const { host, state, step } = ctx;
      const q = state.q || 0;
      const n = step.rows.length;
      const answers = (host.data.pub && host.data.pub.answers) || {};
      const c = [];
      if (state.phase === "observe") c.push({ label: q >= n ? "▶ Mở từ khoá" : `▶ Mở hàng ${q + 1}`, cls: "primary", fn: () => host.open() });
      if (state.phase === "open") c.push({ label: "■ Khoá", cls: "dark", fn: () => host.lock() }, { label: "+15 giây", fn: () => host.addTime(15) });
      if (state.phase === "locked") c.push({ label: "✓ Lật ô chữ", cls: "ok", fn: () => host.reveal() });
      if (state.phase === "revealed") {
        const next = step.rows.findIndex((r, i) => i !== q && !answers[`${step.id}__q${i}`]);
        if (next >= 0) c.push({ label: `Hàng ${next + 1} ›`, cls: "primary", fn: () => host.setQ(next, true) });
        if (q < n) c.push({ label: "★ Đoán từ khoá", fn: () => host.setQ(n, true) });
        if (q >= n || next < 0) c.push({ label: "🏆 Bảng xếp hạng", fn: () => host.setScreen("board") });
      }
      return c;
    }
  });

  /* ---------------- Video có câu hỏi xen giữa ---------------- */
  const cpOf = (s) => (Array.isArray(s.questions) ? s.questions : []);
  const fmt = (t) => u.fmtSec(Number(t) || 0);
  L360.registerType({
    type: "video",
    label: "Video có câu hỏi",
    icon: "▶",
    desc: "Chiếu video (EduHistory Studio, YouTube, tệp mp4); đến mốc thời gian, video dừng và học sinh trả lời câu hỏi trên máy rồi xem tiếp.",
    autoLockWhenAll: true,
    fields: [
      { key: "source", label: "Nguồn video", kind: "video", hint: "Mã EduHistory (VD L6-B12-02), đường dẫn YouTube hoặc tệp .mp4" },
      { key: "questions", label: "Câu hỏi tại các mốc (t = giây)", kind: "questions" },
      { key: "timer", label: "Giây cho mỗi câu", kind: "number" }
    ],
    template: () => ({ type: "video", phase: "khoi-dong", title: "Xem và trả lời", minutes: 5, source: { url: "" }, timer: 25, questions: [{ t: 30, kind: "mcq", q: "Câu hỏi?", options: ["A", "B", "C", "D"], answer: 0, explain: "" }] }),
    normalize(s) {
      if (typeof s.source === "string") s.source = /^L\d-/.test(s.source) ? { edu: s.source } : { url: s.source };
      s.source = Object.assign({}, s.source || {});
      Q().normalize(s);
      s.questions.forEach((q) => (q.t = Math.max(0, Number(q.t) || 0)));
      s.questions.sort((a, b) => a.t - b.t);
    },
    validate(s, err, warn) {
      if (!s.source || !(s.source.edu || s.source.url)) err("Chưa có nguồn video (mã EduHistory hoặc đường dẫn).");
      if (s.source && s.source.edu && L360.Edu && !L360.Edu.tap(s.source.edu)) warn(`Không tìm thấy video EduHistory "${s.source.edu}" trong danh mục.`);
      if (cpOf(s).length) Q().validate(s, err, warn);
    },
    count: (s) => cpOf(s).length,
    subKey: (s, st) => `${s.id}__q${st.q || 0}`,
    keys: (s) => cpOf(s).map((q, i) => ({ key: `${s.id}__q${i}`, label: `${s.title} – câu ${i + 1} (${fmt(q.t)})` })),
    timerFor: (s, st) => Q().timerFor(s, st),
    publicPayload(s, st) {
      const v = L360.videoSource(s.source || {});
      const base = { video: { kind: v.kind, url: v.url, page: v.page, poster: v.poster || "", vertical: !!v.vertical, title: v.title || s.title, src: s.source }, cps: cpOf(s).map((q) => q.t) };
      return cpOf(s).length ? Object.assign(base, Q().publicPayload(s, st)) : base;
    },
    answerPayload: (s, st) => (cpOf(s).length ? Q().answerPayload(s, st) : null),
    isCorrect: (s, key, v) => Q().isCorrect(s, key, v),
    points: (s, key, v) => Q().points(s, key, v),
    describe: (s, key, v) => Q().describe(s, key, v),
    releaseOnEnter: true,
    student: {
      input(el, ctx) {
        return Q().student.input(el, ctx);
      },
      result(el, ctx) {
        return Q().student.result(el, ctx);
      },
      render(el, ctx) {
        const it = ctx.item || {};
        const st = ctx.state;
        if (it.text && st.phase !== "observe") {
          if (st.phase === "open" && !ctx.sub) return Q().student.input(el, ctx);
          if (st.phase === "open") return (el.innerHTML = ui.done("Đã nộp ✓", "Chờ giáo viên công bố rồi xem tiếp video."));
          return Q().student.result(el, ctx);
        }
        const v = it.video || {};
        el.innerHTML = `<div class="card center"><div style="font-size:2.2rem;color:var(--accent)">${L360.icon("video")}</div><h2>${u.esc(v.title || ctx.step.title)}</h2>
          <p class="muted">Xem video trên màn chiếu. Khi video dừng, câu hỏi sẽ hiện trên máy của em.</p>${v.poster ? `<img src="${u.esc(v.poster)}" alt="" style="max-height:240px;border-radius:14px">` : ""}
          ${v.page ? `<p class="small" style="margin-top:10px"><a href="${u.esc(v.page)}" target="_blank" rel="noopener">Xem lại sau giờ học ↗</a></p>` : ""}</div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item || {};
      const st = ctx.state;
      const v = it.video || {};
      const src = (v.src && (v.src.edu || v.src.url)) || "";
      let wrap = u.$(".vwrap", el);
      if (!wrap || wrap.dataset.src !== src) {
        const emb = L360.videoSource(v.src || {});
        el.innerHTML = `<div class="vgrid" style="display:grid;grid-template-columns:${v.vertical ? "420px 1fr" : "1fr"};gap:24px;height:100%;align-items:center"><div class="vwrap blk-vid ${v.vertical ? "vert" : ""}" data-src="${u.esc(src)}" style="${v.vertical ? "height:720px;aspect-ratio:9/16" : ""}">${emb.embed || ""}</div><div class="vq"></div></div>`;
        wrap = u.$(".vwrap", el);
        const vid = u.$("video", wrap);
        if (vid) {
          vid.dataset.asked = "";
          vid.addEventListener("timeupdate", () => {
            const cps = (wrap._cps || []).map(Number);
            const asked = new Set((vid.dataset.asked || "").split(",").filter(Boolean).map(Number));
            const i = cps.findIndex((t, k) => !asked.has(k) && vid.currentTime >= t - 0.15 && vid.currentTime < t + 2);
            if (i >= 0) {
              vid.pause();
              asked.add(i);
              vid.dataset.asked = [...asked].join(",");
              const q = u.$(".vq", el);
              if (q && !q.dataset.busy) q.innerHTML = `<div class="scr-center"><div class="pill accent" style="font-size:1.2rem">Câu hỏi ${i + 1}</div><h1 style="font-size:2.6rem;margin-top:14px">Dừng lại suy nghĩ!</h1><p class="muted">Chờ giáo viên mở câu hỏi.</p></div>`;
            }
          });
        }
      }
      wrap._cps = it.cps || [];
      // Lệnh phát / dừng từ giáo viên.
      const cmd = st.vcmd;
      if (cmd && wrap._n !== cmd.n) {
        wrap._n = cmd.n;
        const vid = u.$("video", wrap);
        const ifr = u.$("iframe", wrap);
        const yt = (func, args = []) => ifr && ifr.contentWindow && ifr.contentWindow.postMessage(JSON.stringify({ event: "command", func, args }), "*");
        if (cmd.c === "pause") {
          if (vid) {
            vid.pause();
            if (cmd.t != null) vid.currentTime = cmd.t;
          }
          yt("pauseVideo");
          if (cmd.t != null) yt("seekTo", [cmd.t, true]);
        }
        if (cmd.c === "play") {
          if (vid) {
            if (cmd.t != null) vid.currentTime = cmd.t;
            vid.play().catch(() => {});
          }
          if (cmd.t != null) yt("seekTo", [cmd.t, true]);
          yt("playVideo");
        }
      }
      const vq = u.$(".vq", el);
      if (it.text && st.phase !== "observe") {
        vq.dataset.busy = "1";
        Q().screen(vq, ctx);
      } else if (vq.dataset.busy || !vq.innerHTML) {
        delete vq.dataset.busy;
        vq.innerHTML = `<div class="scr-center"><h1 style="font-size:2.4rem">${u.esc(v.title || ctx.step.title)}</h1>${
          (it.cps || []).length ? `<p class="muted">${it.cps.length} câu hỏi xen giữa · ${it.cps.map(fmt).join(" · ")}</p>` : ""
        }<p class="small muted">${v.kind === "mp4" && /EduHistory/.test(v.url || "") ? "Video: EduHistory Studio" : ""}</p></div>`;
      }
    },
    host(el, ctx) {
      const s = ctx.step;
      const cps = cpOf(s);
      el.innerHTML = cps.length
        ? `<div class="col" style="gap:6px">${cps
            .map((q, i) => `<button class="btn sm ${i === (ctx.state.q || 0) ? "primary" : ""}" data-cp="${i}" style="justify-content:flex-start">⏸ ${fmt(q.t)} · Câu ${i + 1}: ${u.esc(String(q.q).slice(0, 60))}</button>`)
            .join("")}</div>`
        : `<p class="muted small">Video không có câu hỏi xen giữa.</p>`;
      u.$$("[data-cp]", el).forEach(
        (b) =>
          (b.onclick = () => {
            const i = Number(b.dataset.cp);
            ctx.host.askAt(i, cps[i].t);
          })
      );
    },
    controls(ctx) {
      const { host, state, step } = ctx;
      const cps = cpOf(step);
      const q = state.q || 0;
      const c = [{ label: "▶ Phát", cls: "primary", fn: () => host.videoCmd("play", null) }, { label: "⏸ Dừng", fn: () => host.videoCmd("pause", null) }];
      if (!cps.length) return c;
      if (state.phase === "observe") c.push({ label: `❓ Hỏi câu ${q + 1} (${fmt(cps[q].t)})`, cls: "dark", fn: () => host.askAt(q, cps[q].t) });
      if (state.phase === "open") c.push({ label: "■ Khoá", cls: "dark", fn: () => host.lock() });
      if (state.phase === "locked") c.push({ label: "✓ Công bố", cls: "ok", fn: () => host.reveal() });
      if (state.phase === "revealed") {
        if (q < cps.length - 1) c.push({ label: `▶ Xem tiếp đến câu ${q + 2}`, cls: "primary", fn: () => host.videoResume(q + 1) });
        else c.push({ label: "▶ Xem tiếp đến hết", cls: "primary", fn: () => host.videoCmd("play", null) });
      }
      return c;
    }
  });

  // Điểm tính từ đáp án đã công bố (máy học sinh, màn chiếu).
  L360.pointsFromAnswer = (type, ans, v) => {
    if (!ans || v == null) return 0;
    if (type === "quiz" || type === "video") return L360.quizPoints(ans, v);
    if (type === "crossword") return up(v) === ans.answer ? (ans.isKey ? 200 : 100) : 0;
    return 0;
  };
})();
