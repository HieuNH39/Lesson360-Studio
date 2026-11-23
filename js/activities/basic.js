/* Mẫu hoạt động cơ bản: Bài giảng trực quan (nhiều trang, khối hình ảnh – sơ đồ – kết luận – ghi vở),
   Trắc nghiệm (4 lựa chọn · Đúng/Sai 4 ý · Trả lời ngắn), Hai vòng (học từ bạn), Trả lời ngắn / Phiếu thoát.

   Hợp đồng chung của một mẫu hoạt động (L360.registerType):
   - type, label, desc, icon, fields (cho trình soạn), template() – bước mẫu
   - normalize(step), validate(step, err, warn)
   - subKey(step, state), keys(step, meta), count(step), timerFor(step, state)
   - publicPayload(step, state)  -> nội dung phát cho học sinh (không có đáp án)
   - answerPayload(step, state)  -> đáp án, công bố khi giáo viên bấm "Công bố"
   - isCorrect(step, key, value), points(step, key, value), describe(step, key, value)
   - student.input/result/render/update, screen(el, ctx), host(el, ctx), controls(ctx) */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;
  const B = L360.blocks;

  const countBy = (subs, n, pick) => {
    const arr = Array(n).fill(0);
    u.vals(subs).forEach((s) => {
      const v = pick ? pick(s.v) : s.v;
      if (typeof v === "number" && arr[v] != null) arr[v]++;
    });
    return arr;
  };
  L360.countBy = countBy;
  const mediaFields = [
    { key: "media.image", label: "Ảnh (đường dẫn)", kind: "image", hint: "Ảnh có giấy phép mở, ví dụ Wikimedia Commons" },
    { key: "media.caption", label: "Chú thích ảnh", kind: "text" },
    { key: "media.credit", label: "Nguồn ảnh", kind: "text" }
  ];
  L360.mediaFields = mediaFields;

  /* ---------------- Bài giảng trực quan ---------------- */
  const pagesOf = (s) => (Array.isArray(s.pages) && s.pages.length ? s.pages : [{ title: "", blocks: [] }]);
  L360.registerType({
    type: "slide",
    label: "Bài giảng trực quan",
    icon: "▤",
    desc: "Nội dung chính chiếu cho cả lớp: nhiều trang, mỗi trang ghép các khối ảnh, dòng thời gian, sơ đồ tư duy, bảng so sánh, tư liệu, kết luận, ghi vào vở. Học sinh xem cùng trên máy và tự có vở ghi.",
    noSubmit: true,
    releaseOnEnter: true,
    fields: [{ key: "pages", label: "Các trang bài giảng", kind: "pages" }],
    template: () => ({
      type: "slide",
      phase: "hinh-thanh",
      title: "Tìm hiểu kiến thức mới",
      minutes: 6,
      pages: [
        {
          title: "Nội dung 1",
          blocks: [
            { kind: "image", src: "", query: "từ khoá tìm ảnh", caption: "Chú thích", credit: "" },
            { kind: "list", items: ["Ý chính thứ nhất", "Ý chính thứ hai"] },
            { kind: "note", text: "- Điều học sinh cần ghi vào vở" }
          ]
        }
      ],
      script: ""
    }),
    normalize(s) {
      if (!Array.isArray(s.pages) || !s.pages.length) {
        const blocks = [];
        if (s.media && s.media.image) blocks.push({ kind: "image", src: s.media.image, caption: s.media.caption || "", credit: s.media.credit || "" });
        if (s.body) blocks.push({ kind: "text", md: s.body });
        if (s.media && s.media.video) blocks.push({ kind: "video", src: s.media.video, caption: s.media.videoTitle || "" });
        if (s.media && s.media.link) blocks.push({ kind: "text", md: `Tư liệu mở rộng: ${s.media.link}` });
        s.pages = [{ title: "", blocks }];
      }
      s.pages = s.pages.map((pg) => Object.assign({ title: "", blocks: [] }, pg, { blocks: (pg.blocks || []).filter((b) => b && b.kind) }));
    },
    validate(s, err, warn) {
      const pg = pagesOf(s);
      if (!pg.some((p) => (p.blocks || []).length)) err("Bài giảng chưa có nội dung (pages[].blocks).");
      pg.forEach((p, i) =>
        (p.blocks || []).forEach((b) => {
          if (!B || !B.kinds.some(([k]) => k === b.kind)) warn(`Trang ${i + 1}: khối "${b.kind}" không có trong thư viện khối.`);
          if (b.kind === "image" && !b.src) warn(`Trang ${i + 1}: ảnh "${b.query || b.caption || ""}" chưa có đường dẫn – tìm ảnh trong Studio.`);
        })
      );
      if (pg.length > 6) warn("Nhiều hơn 6 trang trong một bước – cân nhắc tách bước.");
    },
    count: (s) => pagesOf(s).length,
    publicPayload: (s) => ({ title: s.title, pages: pagesOf(s) }),
    student: {
      render(el, ctx) {
        const pages = (ctx.item && ctx.item.pages) || [];
        const i = Math.min(pages.length - 1, Math.max(0, ctx.state.page || 0));
        const pg = pages[i] || {};
        el.innerHTML = `<div class="card lesson-card">${pages.length > 1 ? `<div class="row" style="margin-bottom:10px"><span class="pill accent">Trang ${i + 1}/${pages.length}</span>${B.hasNote(pg) ? `<span class="ghi-badge">${L360.icon("ghiBai")} Có nội dung ghi vở</span>` : ""}</div>` : ""}${B.page(pg, { mode: "student" })}</div>`;
      }
    },
    screen(el, ctx) {
      const pages = (ctx.item && ctx.item.pages) || [];
      const i = Math.min(pages.length - 1, Math.max(0, ctx.state.page || 0));
      el.innerHTML = B.page(pages[i] || {}, { mode: "screen" });
    },
    host(el, ctx) {
      const pages = pagesOf(ctx.step);
      const cur = Math.min(pages.length - 1, ctx.state.page || 0);
      el.innerHTML = `<div class="row" style="gap:6px;margin-bottom:10px">${pages
        .map((p, i) => `<button class="btn sm ${i === cur ? "primary" : ""}" data-pg="${i}">${i + 1}. ${u.esc((p.title || "Trang").slice(0, 28))}${B.hasNote(p) ? " ✎" : ""}</button>`)
        .join("")}</div><div class="host-prev">${B.page(pages[cur] || {}, { mode: "host" })}</div>`;
      u.$$("[data-pg]", el).forEach((b) => (b.onclick = () => ctx.host.setPage(Number(b.dataset.pg))));
    },
    controls(ctx) {
      const n = pagesOf(ctx.step).length;
      const p = ctx.state.page || 0;
      const c = [];
      if (n > 1) {
        if (p > 0) c.push({ label: "‹ Trang trước", fn: () => ctx.host.setPage(p - 1) });
        if (p < n - 1) c.push({ label: `Trang ${p + 2}/${n} ›`, cls: "primary", fn: () => ctx.host.setPage(p + 1) });
      }
      return c;
    }
  });

  /* ---------------- Trắc nghiệm: 4 lựa chọn · Đúng/Sai 4 ý · Trả lời ngắn ---------------- */
  const KIND_LABEL = { mcq: "4 lựa chọn", tf: "Đúng/Sai", short: "Trả lời ngắn" };
  const TF_PTS = [0, 10, 25, 50, 100]; // thang điểm phần Đúng/Sai của đề thi tốt nghiệp THPT (×100)
  const normAns = (s) =>
    String(s == null ? "" : s)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[.;:!?]+$/, "");
  const asNum = (s) => {
    const x = String(s == null ? "" : s).trim().replace(/\s/g, "").replace(",", ".");
    return /^-?\d+(\.\d+)?$/.test(x) ? Number(x) : null;
  };
  const shortOk = (ans, v) => {
    const cands = [ans.answer].concat(ans.accept || []).filter((x) => x != null && x !== "");
    const nv = asNum(v);
    return cands.some((c) => {
      const nc = asNum(c);
      if (nv != null && nc != null) return Math.abs(nv - nc) <= (Number(ans.tol) || 1e-9);
      return normAns(c) === normAns(v);
    });
  };
  // Điểm từ đáp án đã công bố (dùng chung cho máy học sinh, màn chiếu, thống kê).
  L360.quizPoints = (ans, v) => {
    if (!ans || v == null) return 0;
    const k = ans.kind || "mcq";
    if (k === "tf") {
      const n = (ans.answers || []).filter((a, i) => Array.isArray(v) && v[i] === a).length;
      return TF_PTS[n] || 0;
    }
    if (k === "short") return shortOk(ans, v) ? 100 : 0;
    return v === ans.answer ? 100 : 0;
  };
  const qKind = (q) => (q.kind === "tf" || q.kind === "short" ? q.kind : "mcq");
  L360.registerType({
    type: "quiz",
    label: "Trắc nghiệm",
    icon: "✓",
    desc: "Chuỗi câu hỏi có giờ: 4 lựa chọn, Đúng/Sai 4 ý (chấm như đề thi tốt nghiệp), trả lời ngắn. Tự khoá khi hết giờ hoặc cả lớp đã nộp; có bảng xếp hạng. Không tính tốc độ.",
    autoLockWhenAll: true,
    fields: [
      { key: "timer", label: "Giây cho mỗi câu", kind: "number", hint: "Mặc định 20 (Đúng/Sai nên 45–60)" },
      { key: "questions", label: "Câu hỏi", kind: "questions" }
    ],
    template: () => ({
      type: "quiz",
      phase: "luyen-tap",
      title: "Thử thách nhanh",
      minutes: 6,
      timer: 20,
      questions: [
        { kind: "mcq", q: "Câu hỏi?", options: ["Phương án A", "Phương án B", "Phương án C", "Phương án D"], answer: 0, explain: "Giải thích ngắn." },
        { kind: "tf", q: "Đọc tư liệu và cho biết mỗi nhận định đúng hay sai.", statements: [{ text: "a) ...", answer: true }, { text: "b) ...", answer: false }, { text: "c) ...", answer: true }, { text: "d) ...", answer: false }], explain: "" },
        { kind: "short", q: "Câu hỏi trả lời ngắn?", answer: "đáp án", accept: [], explain: "" }
      ]
    }),
    normalize(s) {
      s.questions = (s.questions || []).map((q) => {
        q = Object.assign({ explain: "" }, q);
        q.kind = qKind(q);
        if (q.kind === "mcq") q = Object.assign({ options: [], answer: 0 }, q);
        if (q.kind === "tf") q.statements = (q.statements || []).slice(0, 4).map((x) => (typeof x === "string" ? { text: x, answer: true } : { text: String(x.text || ""), answer: !!x.answer }));
        if (q.kind === "short") q.accept = Array.isArray(q.accept) ? q.accept : q.accept ? [q.accept] : [];
        return q;
      });
      s.timer = Number(s.timer) || 20;
    },
    validate(s, err, warn) {
      if (!s.questions || !s.questions.length) err("Chưa có câu hỏi.");
      (s.questions || []).forEach((q, i) => {
        const w = `Câu ${i + 1}`;
        if (!q.q) err(`${w} chưa có nội dung.`);
        if (q.kind === "mcq") {
          if (!Array.isArray(q.options) || q.options.length < 2) err(`${w} cần ít nhất 2 phương án.`);
          else if (!(q.answer >= 0 && q.answer < q.options.length)) err(`${w}: đáp án (answer) phải là số thứ tự 0–${q.options.length - 1}.`);
        }
        if (q.kind === "tf" && (q.statements || []).length !== 4) err(`${w} (Đúng/Sai) cần đúng 4 ý a, b, c, d.`);
        if (q.kind === "short" && (q.answer == null || q.answer === "")) err(`${w} (trả lời ngắn) chưa có đáp án.`);
        if (!q.explain) warn(`${w} chưa có giải thích đáp án.`);
      });
      if ((s.questions || []).length > 12) warn("Nhiều hơn 12 câu – cân nhắc tách thành 2 hoạt động.");
    },
    count: (s) => (s.questions || []).length,
    subKey: (s, st) => `${s.id}__q${st.q || 0}`,
    keys: (s) => (s.questions || []).map((q, i) => ({ key: `${s.id}__q${i}`, label: `${s.title} – Câu ${i + 1}${q.kind !== "mcq" ? ` (${KIND_LABEL[q.kind]})` : ""}` })),
    timerFor: (s, st) => {
      const q = (s.questions || [])[st.q || 0] || {};
      if (q.timer) return Number(q.timer);
      const base = Number(s.timer) || 20;
      return q.kind === "tf" ? Math.max(base, 45) : q.kind === "short" ? Math.max(base, 30) : base;
    },
    publicPayload(s, st) {
      const i = st.q || 0;
      const q = s.questions[i] || {};
      const o = { q: i, total: s.questions.length, kind: q.kind, text: q.q || "", image: q.image || "", source: q.source || "" };
      if (q.kind === "mcq") o.options = q.options || [];
      if (q.kind === "tf") o.statements = (q.statements || []).map((x) => x.text);
      if (q.kind === "short") o.unit = q.unit || "";
      return o;
    },
    answerPayload(s, st) {
      const q = s.questions[st.q || 0] || {};
      const base = { kind: q.kind, explain: q.explain || "", ghiBai: q.ghiBai || "" };
      if (q.kind === "tf") return Object.assign(base, { answers: (q.statements || []).map((x) => !!x.answer) });
      if (q.kind === "short") return Object.assign(base, { answer: q.answer, accept: q.accept || [], tol: q.tol || 0 });
      return Object.assign(base, { answer: q.answer });
    },
    isCorrect(s, key, v) {
      const i = Number(String(key).split("__q")[1]);
      const q = s.questions[i];
      if (!q) return null;
      const ans = this.answerPayload(s, { q: i });
      return q.kind === "tf" ? L360.quizPoints(ans, v) === 100 : L360.quizPoints(ans, v) === 100;
    },
    points(s, key, v) {
      const i = Number(String(key).split("__q")[1]);
      return L360.quizPoints(this.answerPayload(s, { q: i }), v);
    },
    describe(s, key, v) {
      if (Array.isArray(v)) return v.map((x, i) => `${"abcd"[i]}:${x === true ? "Đ" : x === false ? "S" : "-"}`).join(" ");
      return typeof v === "number" ? u.letter(v) : v == null ? "" : String(v);
    },
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        const kind = it.kind || "mcq";
        let sel = kind === "tf" ? [null, null, null, null] : null;
        const head = `<div class="row"><span class="pill accent">Câu ${it.q + 1}/${it.total}</span>${kind !== "mcq" ? `<span class="pill">${KIND_LABEL[kind]}</span>` : ""}<span class="spacer"></span>${ui.timer()}</div>
          <h2 style="margin-top:12px">${u.rich(it.text)}</h2>${it.source ? B.one({ kind: "quote", text: it.source }) : ""}${it.image ? ui.media({ image: it.image }) : ""}`;
        const draw = () => {
          let body = "";
          let ready = false;
          if (kind === "mcq") {
            body = ui.options(it.options || [], { selected: sel, cls: "two" });
            ready = sel != null;
          } else if (kind === "tf") {
            body = `<div class="tf">${(it.statements || [])
              .map((t, i) => `<div class="tf-row"><span class="k">${"abcd"[i]}</span><span>${u.rich(t)}</span><span class="tf-btns"><button class="t ${sel[i] === true ? "on" : ""}" data-tf="${i}:1">Đúng</button><button class="f ${sel[i] === false ? "on" : ""}" data-tf="${i}:0">Sai</button></span></div>`)
              .join("")}</div>`;
            ready = sel.every((x) => x != null);
          } else {
            body = `<label class="field">Câu trả lời${it.unit ? ` (${u.esc(it.unit)})` : ""}<input id="sa" type="text" autocomplete="off" value="${u.esc(sel || "")}" style="font-size:1.2rem;font-weight:700"></label>`;
            ready = !!(sel && String(sel).trim());
          }
          el.innerHTML = `<div class="card">${head}${body}<button class="btn primary lg block" style="margin-top:16px" data-send ${ready ? "" : "disabled"}>Gửi đáp án</button>
            <p class="small muted center" style="margin-top:8px">Đây là cơ hội kiểm tra điều mình hiểu, không phải chạy đua tốc độ.</p></div>`;
          u.$$("[data-opt]", el).forEach((b) => (b.onclick = () => ((sel = Number(b.dataset.opt)), draw())));
          u.$$("[data-tf]", el).forEach(
            (b) =>
              (b.onclick = () => {
                const [i, v] = b.dataset.tf.split(":");
                sel[Number(i)] = v === "1";
                draw();
              })
          );
          const sa = u.$("#sa", el);
          if (sa) {
            sa.oninput = () => {
              sel = sa.value;
              u.$("[data-send]", el).disabled = !sel.trim();
            };
            sa.focus();
            sa.setSelectionRange(sa.value.length, sa.value.length);
            sa.onkeydown = (e) => e.key === "Enter" && sel && sel.trim() && ctx.submit(sel.trim());
          }
          u.$("[data-send]", el).onclick = () => {
            if (kind === "short") return sel && sel.trim() && ctx.submit(sel.trim());
            if (kind === "tf") return sel.every((x) => x != null) && ctx.submit(sel.slice());
            return sel != null && ctx.submit(sel);
          };
        };
        draw();
      },
      result(el, ctx) {
        const it = ctx.item || {};
        const ans = ctx.answer;
        const kind = it.kind || "mcq";
        const mine = ctx.sub ? ctx.sub.v : null;
        const pts = ans ? L360.quizPoints(ans, mine) : 0;
        let body = "";
        if (kind === "mcq") body = ui.options(it.options || [], { selected: mine, answer: ans ? ans.answer : null, mine, disabled: true, cls: "two" });
        else if (kind === "tf")
          body = `<div class="tf">${(it.statements || [])
            .map((t, i) => {
              const m = Array.isArray(mine) ? mine[i] : null;
              const a = ans && ans.answers ? ans.answers[i] : null;
              return `<div class="tf-row ${a == null ? "" : m === a ? "right" : "wrong"}"><span class="k">${"abcd"[i]}</span><span>${u.rich(t)}</span><span class="small"><b>${m == null ? "–" : m ? "Đúng" : "Sai"}</b>${a == null ? "" : ` · đáp án: <b>${a ? "Đúng" : "Sai"}</b>`}</span></div>`;
            })
            .join("")}</div>`;
        else body = `<div class="card flat"><div class="small muted">Em trả lời</div><b style="font-size:1.2rem">${u.esc(mine == null ? "–" : mine)}</b>${ans ? `<div class="small muted" style="margin-top:6px">Đáp án: <b>${u.esc(ans.answer)}</b></div>` : ""}</div>`;
        el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Câu ${it.q + 1}/${it.total}</span><span class="spacer"></span>
          ${ans ? (mine == null ? `<span class="pill warn">Em chưa trả lời</span>` : pts === 100 ? `<span class="pill ok">Đúng · +100</span>` : pts ? `<span class="pill warn">Đúng một phần · +${pts}</span>` : `<span class="pill bad">Chưa đúng</span>`) : `<span class="pill">Đã khoá</span>`}</div>
          <h2 style="margin-top:12px">${u.rich(it.text)}</h2>${body}
          ${ans && ans.explain ? `<div class="card flat" style="margin-top:14px;background:var(--soft)"><b>Giải thích.</b> ${u.rich(ans.explain)}</div>` : ""}
          ${ans && ans.ghiBai ? B.one({ kind: "note", text: ans.ghiBai }) : ""}
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
      const kind = it.kind || "mcq";
      const n = Object.keys(ctx.subs || {}).length;
      const ans = ctx.answer;
      const showDist = ans || ctx.mode === "live";
      let body = "";
      if (kind === "mcq") {
        const cnt = countBy(ctx.subs, (it.options || []).length);
        body = showDist
          ? ui.bars((it.options || []).map((o, i) => ({ label: `${u.letter(i)}. ${u.esc(o)}`, value: cnt[i], correct: ans && ans.answer === i, dim: ans && ans.answer !== i })), { total: n || 1 })
          : `<div class="scr-opts">${(it.options || []).map((o, i) => `<div class="scr-opt"><span class="k">${u.letter(i)}</span>${u.rich(o)}</div>`).join("")}</div>`;
      } else if (kind === "tf") {
        const subs = u.vals(ctx.subs).map((x) => x.v);
        body = `<div class="tf">${(it.statements || [])
          .map((t, i) => {
            const yes = subs.filter((v) => Array.isArray(v) && v[i] === true).length;
            const no = subs.filter((v) => Array.isArray(v) && v[i] === false).length;
            const a = ans && ans.answers ? ans.answers[i] : null;
            return `<div class="tf-row ${a == null ? "" : "right"}" style="font-size:24px"><span class="k">${"abcd"[i]}</span><span>${u.rich(t)}</span><span style="font-size:20px;white-space:nowrap">${
              showDist ? `Đ <b>${u.pct(yes, n || 1)}%</b> · S <b>${u.pct(no, n || 1)}%</b>` : ""
            }${a == null ? "" : ` · <b style="color:var(--ok)">${a ? "ĐÚNG" : "SAI"}</b>`}</span></div>`;
          })
          .join("")}</div>`;
      } else {
        const freq = {};
        u.vals(ctx.subs).forEach((x) => {
          const k = String(x.v || "").trim();
          if (k) freq[k] = (freq[k] || 0) + 1;
        });
        const top = Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8);
        body = showDist
          ? ui.bars(top.map(([k, c]) => ({ label: u.esc(k), value: c, correct: ans && shortOk(ans, k), dim: ans && !shortOk(ans, k) })), { total: n || 1 })
          : `<p class="muted center" style="font-size:1.4rem">Học sinh đang nhập câu trả lời…</p>`;
        if (ans) body += `<div class="scr-explain"><b>Đáp án:</b> ${u.esc(ans.answer)}</div>`;
      }
      el.innerHTML = `<div class="row"><span class="pill accent" style="font-size:1.05rem">Câu ${it.q + 1}/${it.total}</span>${kind !== "mcq" ? `<span class="pill">${KIND_LABEL[kind]}</span>` : ""}</div>
        <h1 class="scr-q">${u.rich(it.text)}</h1>${it.source ? B.one({ kind: "quote", text: it.source }) : ""}${body}
        ${ans && ans.explain ? `<div class="scr-explain"><b>Giải thích.</b> ${u.rich(ans.explain)}</div>` : ""}${ans && ans.ghiBai ? B.one({ kind: "note", text: ans.ghiBai }) : ""}`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const qi = ctx.state.q || 0;
      const q = s.questions[qi] || {};
      const n = Object.keys(ctx.subs || {}).length;
      let body = "";
      if (q.kind === "mcq") {
        const cnt = countBy(ctx.subs, (q.options || []).length);
        body = `<p class="small muted">Đáp án <b>${u.letter(q.answer)}</b></p>` + ui.bars((q.options || []).map((o, i) => ({ label: `${u.letter(i)}. ${u.esc(o)}`, value: cnt[i], correct: i === q.answer })), { total: n || 1 });
      } else if (q.kind === "tf") {
        const subs = u.vals(ctx.subs).map((x) => x.v);
        body = `<table class="t">${(q.statements || [])
          .map((x, i) => `<tr><td><b>${"abcd"[i]}</b> ${u.esc(x.text)}</td><td class="num">${x.answer ? "Đ" : "S"}</td><td class="num">${u.pct(subs.filter((v) => Array.isArray(v) && v[i] === x.answer).length, n || 1)}% đúng</td></tr>`)
          .join("")}</table>`;
      } else {
        const ans = { answer: q.answer, accept: q.accept, tol: q.tol };
        const ok = u.vals(ctx.subs).filter((x) => shortOk(ans, x.v)).length;
        body = `<p class="small muted">Đáp án: <b>${u.esc(q.answer)}</b>${(q.accept || []).length ? ` (chấp nhận: ${u.esc(q.accept.join(", "))})` : ""} · ${ok}/${n} đúng</p><div class="small">${u
          .entries(ctx.subs)
          .map(([c, x]) => `<span class="pill ${shortOk(ans, x.v) ? "ok" : ""}">${c}: ${u.esc(x.v)}</span>`)
          .join(" ")}</div>`;
      }
      el.innerHTML = `<p class="small muted">Câu ${qi + 1}/${s.questions.length} · ${KIND_LABEL[q.kind] || ""}</p><p><b>${u.rich(q.q)}</b></p>${body}`;
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
    template: () => ({ type: "poll2", phase: "hinh-thanh", title: "Em chọn gì?", minutes: 4, question: "Câu hỏi khái niệm dễ nhầm?", options: ["Phương án A", "Phương án B"], answer: 1, explain: "", card: "", timer: [60, 45] }),
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
    answerPayload: (s) => ({ answer: s.answer == null ? null : s.answer, explain: s.explain || "", card: s.card || "", ghiBai: s.ghiBai || "" }),
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
          ${ans && ans.explain ? `<div class="card flat" style="margin-top:14px;background:var(--soft)"><b>Giải thích.</b> ${u.rich(ans.explain)}</div>` : ""}
          ${ans && ans.card ? B.one({ kind: "conclusion", title: "Thẻ ghi nhớ", text: ans.card }) : ""}${ans && ans.ghiBai ? B.one({ kind: "note", text: ans.ghiBai }) : ""}
          ${!ans ? `<p class="center muted" style="margin-top:12px">${it.round === 1 ? "Trao đổi với bạn bên cạnh: vì sao em chọn như vậy?" : "Chờ giáo viên công bố."}</p>` : ""}</div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item;
      const s = ctx.step;
      const d = ctx.data;
      const st = ctx.state;
      const opts = (it && it.options) || [];
      const s1 = (d.subs && d.subs[`${s.id}__r1`]) || {};
      const s2 = (d.subs && d.subs[`${s.id}__r2`]) || {};
      const ans = (d.pub && d.pub.answers && (d.pub.answers[`${s.id}__r2`] || d.pub.answers[`${s.id}__r1`])) || null;
      if (!it) {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:3rem">${u.esc(s.title)}</h1><p class="muted" style="font-size:1.4rem">${u.esc(s.instructions || "Chuẩn bị suy nghĩ độc lập ở vòng 1.")}</p></div>`;
        return;
      }
      const n1 = Object.keys(s1).length;
      const n2 = Object.keys(s2).length;
      const c1 = countBy(s1, opts.length);
      const c2 = countBy(s2, opts.length);
      let body;
      if (ans || (st.round === 2 && (st.phase !== "open" || ctx.mode === "live"))) body = ui.pairBars(opts.map((o, i) => `${u.letter(i)}. ${u.esc(o)}`), c1, c2, n1 || 1, n2 || 1, ans ? ans.answer : null);
      else if (ctx.mode === "live" || st.phase === "locked") body = ui.bars(opts.map((o, i) => ({ label: `${u.letter(i)}. ${u.esc(o)}`, value: c1[i] })), { total: n1 || 1 });
      else body = `<div class="scr-opts">${opts.map((o, i) => `<div class="scr-opt"><span class="k">${u.letter(i)}</span>${u.rich(o)}</div>`).join("")}</div>`;
      el.innerHTML = `<div class="row"><span class="pill accent" style="font-size:1.05rem">Vòng ${st.round === 2 ? 2 : 1}</span>${n1 ? `<span class="pill">Vòng 1: ${n1} lượt</span>` : ""}${
        n2 ? `<span class="pill">Vòng 2: ${n2} lượt</span>` : ""
      }</div><h1 class="scr-q">${u.rich(it.question)}</h1>${body}
      ${
        ans && (ans.explain || ans.card)
          ? `<div class="grid ${ans.explain && ans.card ? "g2" : ""}" style="gap:16px">${ans.explain ? `<div class="scr-explain"><b>Giải thích.</b> ${u.rich(ans.explain)}</div>` : ""}${ans.card ? B.one({ kind: "conclusion", title: "Thẻ ghi nhớ", text: ans.card }) : ""}</div>`
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
      if (state.phase === "open") c.push({ label: "■ Khoá", cls: "dark", fn: () => host.lock() }, { label: "+15 giây", fn: () => host.addTime(15) });
      if (state.phase === "locked" && r === 1) c.push({ label: "↻ Mở vòng 2", cls: "primary", fn: () => host.round2() }, { label: "✓ Công bố ngay", fn: () => host.reveal() });
      if (state.phase === "locked" && r === 2) c.push({ label: "✓ Công bố đáp án", cls: "ok", fn: () => host.reveal() });
      return c;
    }
  });

  /* ---------------- Trả lời ngắn / Phiếu thoát ---------------- */
  L360.registerType({
    type: "text",
    label: "Viết ngắn / Phiếu thoát",
    icon: "✎",
    desc: "Học sinh viết câu trả lời có giới hạn từ (phân tích tư liệu, nêu ý kiến, phiếu thoát); tự đánh giá 3 mức; giáo viên gắn ★ bài hay để chiếu; màn chiếu có đám mây từ.",
    fields: [
      { key: "question", label: "Câu hỏi / nhiệm vụ", kind: "textarea" },
      { key: "source", label: "Tư liệu kèm theo (không bắt buộc)", kind: "textarea" },
      { key: "maxWords", label: "Giới hạn số từ", kind: "number" },
      { key: "placeholder", label: "Câu mở đầu gợi ý", kind: "text", hint: "Ví dụ: Tôi muốn thế hệ tương lai hiểu rằng…" },
      { key: "selfAssess", label: "Có tự đánh giá 3 mức", kind: "bool" },
      { key: "askDoubt", label: "Hỏi điều còn băn khoăn", kind: "bool" },
      { key: "sample", label: "Gợi ý đáp án (công bố sau)", kind: "textarea" },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({ type: "text", phase: "van-dung", title: "Phiếu thoát", minutes: 3, question: "Điều quan trọng nhất em học được hôm nay là gì?", maxWords: 40, selfAssess: true, askDoubt: true, timer: 120 }),
    normalize(s) {
      s.maxWords = Number(s.maxWords) || 40;
    },
    validate(s, err) {
      if (!s.question) err("Chưa có câu hỏi.");
    },
    publicPayload: (s) => ({
      question: s.question,
      source: s.source || "",
      maxWords: s.maxWords,
      placeholder: s.placeholder || "",
      selfAssess: !!s.selfAssess,
      selfLabels: s.selfLabels || ["Chưa vững", "Khá vững", "Rất vững"],
      askDoubt: !!s.askDoubt
    }),
    answerPayload: (s) => ({ sample: s.sample || "", ghiBai: s.ghiBai || "" }),
    describe: (s, key, v) => (v ? `${v.text || ""}${v.level ? ` [tự đánh giá ${v.level}/3]` : ""}${v.doubt ? ` [băn khoăn: ${v.doubt}]` : ""}` : ""),
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        const prev = (ctx.sub && ctx.sub.v) || {};
        let level = prev.level || 0;
        el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Viết ngắn</span><span class="spacer"></span>${ui.timer()}</div>
          <h2 style="margin-top:12px">${u.rich(it.question)}</h2>${it.source ? B.one({ kind: "quote", text: it.source }) : ""}
          ${ui.textarea("ta", { value: prev.text || it.placeholder || "", max: it.maxWords, rows: 5 })}
          ${
            it.selfAssess
              ? `<p style="margin:14px 0 6px;font-weight:650">Em tự đánh giá mức hiểu bài:</p><div class="chips">${it.selfLabels.map((l, i) => `<button class="chip ${level === i + 1 ? "sel" : ""}" data-lv="${i + 1}">${i + 1}. ${u.esc(l)}</button>`).join("")}</div>`
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
          if (!text || text === String(it.placeholder || "").trim()) return u.toast("Em hãy viết câu trả lời.", "bad");
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
          ${v ? `<div class="card flat" style="background:var(--soft)"><div class="small muted">Câu trả lời của em</div>${u.rich(v.text)}</div>` : `<p class="muted">Em chưa nộp bài này.</p>`}
          ${ctx.featured ? `<p style="margin-top:10px"><span class="pill ok">★ Giáo viên đã chọn bài của em để chiếu</span></p>` : ""}
          ${ans && ans.sample ? B.one({ kind: "conclusion", title: "Gợi ý đáp án", text: ans.sample }) : ""}${ans && ans.ghiBai ? B.one({ kind: "note", text: ans.ghiBai }) : ""}</div>`;
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
      el.innerHTML = `<h1 class="scr-q">${u.rich(it.question)}</h1>${it.source && !texts.length ? B.one({ kind: "quote", text: it.source }) : ""}
        ${feat.length ? `<div class="scr-feats">${feat.map((t) => `<blockquote class="scr-feat">“${u.esc(t)}”</blockquote>`).join("")}</div>` : ""}
        ${ctx.mode === "live" || ctx.state.phase !== "open" ? ui.cloud(texts) : `<p class="muted center" style="font-size:1.3rem">Học sinh đang viết…</p>`}
        ${lv}${ans && ans.sample ? B.one({ kind: "conclusion", title: "Gợi ý", text: ans.sample }) : ""}`;
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
          <div class="grow"><b>${c}</b> <span class="muted small">${u.esc((roster[c] || {}).name || "")}${s.v && s.v.level ? ` · tự đánh giá ${s.v.level}/3` : ""}</span><br>${u.esc((s.v && s.v.text) || "")}${
                s.v && s.v.doubt ? `<br><span class="small" style="color:var(--warn)">Băn khoăn: ${u.esc(s.v.doubt)}</span>` : ""
              }</div></div>`
            )
            .join("")}</div>`
        : `<p class="muted">Chưa có bài nộp.</p>`;
      u.$$("[data-feat]", el).forEach((b) => (b.onclick = () => host.feature(key, b.dataset.feat, (ctx.subs[b.dataset.feat].v || {}).text)));
    }
  });
})();
