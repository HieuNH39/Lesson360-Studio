/* Mẫu hoạt động tương tác: Chọn thẻ + giả thuyết, Ghép nối, Sắp xếp trình tự. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;

  // Thứ tự xáo trộn cố định theo bước (mọi máy giống nhau), không trùng thứ tự gốc.
  const perm = (s, n) => {
    const idx = Array.from({ length: n }, (_, i) => i);
    let p = u.shuffle(idx, `${s.id}|${s.title}|${n}`);
    if (n > 1 && p.every((v, i) => v === i)) p = p.slice(1).concat(p[0]);
    return p; // p[pos] = chỉ số gốc
  };

  /* ---------------- Chọn thẻ + giả thuyết ---------------- */
  L360.registerType({
    type: "cards",
    label: "Chọn thẻ + giả thuyết",
    icon: "▦",
    desc: "Học sinh chọn tối đa N thẻ (yếu tố, nguyên nhân, đặc điểm…) và viết giả thuyết ngắn; màn chiếu hiện tần suất các thẻ.",
    fields: [
      { key: "question", label: "Câu hỏi", kind: "textarea" },
      { key: "cards", label: "Các thẻ", kind: "list" },
      { key: "maxPick", label: "Số thẻ tối đa được chọn", kind: "number" },
      { key: "textPrompt", label: "Yêu cầu viết (để trống nếu không cần)", kind: "text" },
      { key: "maxWords", label: "Giới hạn từ", kind: "number" },
      { key: "conclusion", label: "Kết luận công bố cuối hoạt động", kind: "textarea" },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({
      type: "cards",
      title: "Chọn thẻ",
      minutes: 3,
      question: "Những yếu tố nào…?",
      cards: ["Yếu tố 1", "Yếu tố 2", "Yếu tố 3", "Yếu tố 4"],
      maxPick: 3,
      textPrompt: "Viết giả thuyết của em",
      maxWords: 30,
      conclusion: "",
      timer: 90
    }),
    normalize(s) {
      s.cards = (s.cards || []).map((c) => (typeof c === "string" ? c : c.text || ""));
      s.maxPick = Number(s.maxPick) || Math.min(3, s.cards.length);
      s.maxWords = Number(s.maxWords) || 30;
    },
    validate(s, err) {
      if (!s.question) err("Chưa có câu hỏi.");
      if (!s.cards || s.cards.length < 2) err("Cần ít nhất 2 thẻ.");
    },
    publicPayload: (s) => ({ question: s.question, cards: s.cards, maxPick: s.maxPick, textPrompt: s.textPrompt || "", maxWords: s.maxWords }),
    answerPayload: (s) => ({ conclusion: s.conclusion || "" }),
    describe: (s, key, v) => (v ? `${(v.picks || []).map((i) => s.cards[i]).join("; ")}${v.text ? ` | ${v.text}` : ""}` : ""),
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        const prev = (ctx.sub && ctx.sub.v) || {};
        let picks = (prev.picks || []).slice();
        const draw = () => {
          const text = u.$("#ta", el) ? u.$("#ta", el).value : prev.text || "";
          el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Chọn tối đa ${it.maxPick} thẻ</span><span class="spacer"></span>${ui.timer()}</div>
          <h2 style="margin-top:12px">${u.rich(it.question)}</h2>
          <div class="chips">${it.cards.map((c, i) => `<button class="chip ${picks.includes(i) ? "sel" : ""}" data-c="${i}">${u.esc(c)}</button>`).join("")}</div>
          ${it.textPrompt ? `<p style="margin:16px 0 6px;font-weight:650">${u.esc(it.textPrompt)}</p>${ui.textarea("ta", { value: text, max: it.maxWords, rows: 3 })}` : ""}
          <button class="btn primary lg block" style="margin-top:16px" data-send>Gửi</button></div>`;
          ui.bindWordCount(el);
          u.$$("[data-c]", el).forEach(
            (b) =>
              (b.onclick = () => {
                const i = Number(b.dataset.c);
                if (picks.includes(i)) picks = picks.filter((x) => x !== i);
                else if (picks.length < it.maxPick) picks.push(i);
                else return u.toast(`Chỉ chọn tối đa ${it.maxPick} thẻ.`);
                draw();
              })
          );
          u.$("[data-send]", el).onclick = () => {
            if (!picks.length) return u.toast("Hãy chọn ít nhất 1 thẻ.", "bad");
            const t = u.$("#ta", el) ? u.$("#ta", el).value.trim() : "";
            if (it.textPrompt && !t) return u.toast("Hãy viết giả thuyết của em.", "bad");
            if (u.words(t) > it.maxWords) return u.toast(`Tối đa ${it.maxWords} từ.`, "bad");
            ctx.submit({ picks: picks.slice().sort((a, b) => a - b), text: t });
          };
        };
        draw();
      },
      result(el, ctx) {
        const it = ctx.item || {};
        const v = (ctx.sub && ctx.sub.v) || {};
        el.innerHTML = `<div class="card"><h2>${u.rich(it.question)}</h2>
          <div class="chips">${(it.cards || []).map((c, i) => `<span class="chip ${(v.picks || []).includes(i) ? "sel" : ""}">${u.esc(c)}</span>`).join("")}</div>
          ${v.text ? `<div class="card flat" style="margin-top:12px;background:var(--paper)">${u.rich(v.text)}</div>` : ""}
          ${ctx.featured ? `<p style="margin-top:10px"><span class="pill ok">★ Bài của em được chọn để chiếu</span></p>` : ""}
          ${ctx.answer && ctx.answer.conclusion ? `<div class="card flat" style="margin-top:12px;border-color:var(--accent)"><b>Kết luận.</b><div class="md">${ui.md(ctx.answer.conclusion)}</div></div>` : ""}</div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item;
      if (!it) {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:3rem">${u.esc(ctx.step.title)}</h1><p class="muted" style="font-size:1.4rem">${u.esc(ctx.step.instructions || "")}</p></div>`;
        return;
      }
      const cnt = Array(it.cards.length).fill(0);
      const subs = u.vals(ctx.subs);
      subs.forEach((s) => ((s.v && s.v.picks) || []).forEach((i) => cnt[i] != null && cnt[i]++));
      const order = cnt.map((c, i) => [c, i]).sort((a, b) => b[0] - a[0]);
      const feat = u.vals(ctx.featured).filter((x) => typeof x === "string");
      const show = ctx.mode === "live" || ctx.state.phase !== "open";
      el.innerHTML = `<h1 class="scr-q">${u.rich(it.question)}</h1>
        ${
          show
            ? ui.bars(order.map(([c, i]) => ({ label: u.esc(it.cards[i]), value: c })), { total: subs.length || 1 })
            : `<div class="chips" style="justify-content:center">${it.cards.map((c) => `<span class="chip" style="font-size:1.2rem">${u.esc(c)}</span>`).join("")}</div>`
        }
        ${feat.length ? `<div class="scr-feats">${feat.map((t) => `<blockquote class="scr-feat">“${u.esc(t)}”</blockquote>`).join("")}</div>` : ""}
        ${ctx.answer && ctx.answer.conclusion ? `<div class="scr-explain"><b>Kết luận.</b> ${ui.md(ctx.answer.conclusion)}</div>` : ""}`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const { host, data, key } = ctx;
      const feats = (data.pub && data.pub.featured && data.pub.featured[key]) || {};
      const cnt = Array(s.cards.length).fill(0);
      u.vals(ctx.subs).forEach((x) => ((x.v && x.v.picks) || []).forEach((i) => cnt[i] != null && cnt[i]++));
      el.innerHTML =
        ui.bars(
          s.cards.map((c, i) => ({ label: u.esc(c), value: cnt[i] })),
          { total: Object.keys(ctx.subs).length || 1 }
        ) +
        `<h3 style="margin-top:14px">Giả thuyết</h3>` +
        (u
          .entries(ctx.subs)
          .filter(([, x]) => x.v && x.v.text)
          .map(
            ([c, x]) =>
              `<div class="row nowrap" style="align-items:flex-start;margin-bottom:8px"><button class="btn sm ${feats[c] ? "primary" : ""}" data-feat="${c}">★</button><div><b>${c}</b>: ${u.esc(x.v.text)}</div></div>`
          )
          .join("") || `<p class="muted small">Chưa có giả thuyết.</p>`);
      u.$$("[data-feat]", el).forEach((b) => (b.onclick = () => host.feature(key, b.dataset.feat, ctx.subs[b.dataset.feat].v.text)));
    }
  });

  /* ---------------- Ghép nối ---------------- */
  L360.registerType({
    type: "match",
    label: "Ghép nối",
    icon: "⇋",
    desc: "Ghép mỗi ý ở cột trái với một ý ở cột phải (thứ tự cột phải được xáo trộn); có thể yêu cầu viết 1 câu giải thích.",
    fields: [
      { key: "question", label: "Yêu cầu", kind: "textarea" },
      { key: "pairs", label: "Các cặp đúng (trái – phải)", kind: "pairs" },
      { key: "whyPrompt", label: "Yêu cầu giải thích (để trống nếu không cần)", kind: "text" },
      { key: "explain", label: "Giải thích sau khi công bố", kind: "textarea" },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({
      type: "match",
      title: "Ghép nối",
      minutes: 4,
      question: "Ghép mỗi … với … phù hợp.",
      pairs: [
        { left: "Ý trái 1", right: "Ý phải 1" },
        { left: "Ý trái 2", right: "Ý phải 2" },
        { left: "Ý trái 3", right: "Ý phải 3" }
      ],
      whyPrompt: "",
      explain: "",
      timer: 120
    }),
    validate(s, err) {
      if (!s.pairs || s.pairs.length < 2) err("Cần ít nhất 2 cặp.");
      (s.pairs || []).forEach((p, i) => (!p.left || !p.right) && err(`Cặp ${i + 1} thiếu nội dung.`));
    },
    publicPayload(s) {
      const p = perm(s, s.pairs.length);
      return { question: s.question || "", lefts: s.pairs.map((x) => x.left), rights: p.map((i) => s.pairs[i].right), whyPrompt: s.whyPrompt || "" };
    },
    answerPayload(s) {
      const p = perm(s, s.pairs.length);
      // map[trái i] = vị trí của vế phải đúng trong danh sách đã xáo
      return { map: s.pairs.map((_, i) => p.indexOf(i)), explain: s.explain || "" };
    },
    isCorrect(s, key, v) {
      if (!v || !Array.isArray(v.m)) return false;
      const p = perm(s, s.pairs.length);
      return s.pairs.every((_, i) => v.m[i] === p.indexOf(i));
    },
    describe(s, key, v) {
      if (!v || !v.m) return "";
      return v.m.map((r, i) => `${i + 1}→${r == null ? "?" : u.letter(r)}`).join("; ") + (v.why ? ` | ${v.why}` : "");
    },
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        const prev = (ctx.sub && ctx.sub.v) || {};
        el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Ghép nối</span><span class="spacer"></span>${ui.timer()}</div>
          <h2 style="margin-top:12px">${u.rich(it.question)}</h2>
          <div class="col">${it.lefts
            .map(
              (l, i) => `<label class="field"><span>${i + 1}. ${u.esc(l)}</span><select data-m="${i}"><option value="">– chọn –</option>${it.rights
                .map((r, j) => `<option value="${j}" ${prev.m && prev.m[i] === j ? "selected" : ""}>${u.letter(j)}. ${u.esc(r)}</option>`)
                .join("")}</select></label>`
            )
            .join("")}</div>
          ${it.whyPrompt ? `<label class="field" style="margin-top:14px">${u.esc(it.whyPrompt)}<textarea id="why" rows="2">${u.esc(prev.why || "")}</textarea></label>` : ""}
          <button class="btn primary lg block" style="margin-top:16px" data-send>Gửi</button></div>`;
        u.$("[data-send]", el).onclick = async () => {
          const m = u.$$("[data-m]", el).map((s) => (s.value === "" ? null : Number(s.value)));
          if (m.some((x) => x == null)) return u.toast("Hãy ghép đủ tất cả các ý.", "bad");
          if (new Set(m).size < m.length && !(await u.confirm("Có ý ở cột phải được dùng hai lần. Em vẫn gửi chứ?", "Vẫn gửi"))) return;
          const v = { m };
          const w = u.$("#why", el);
          if (w && w.value.trim()) v.why = w.value.trim();
          ctx.submit(v);
        };
      },
      result(el, ctx) {
        const it = ctx.item || {};
        const v = (ctx.sub && ctx.sub.v) || {};
        const ans = ctx.answer;
        el.innerHTML = `<div class="card"><h2>${u.rich(it.question)}</h2><div class="col" style="gap:8px">${it.lefts
          .map((l, i) => {
            const mine = v.m ? v.m[i] : null;
            const ok = ans ? mine === ans.map[i] : null;
            return `<div class="card flat" style="padding:10px 14px;${ok === true ? "border-color:var(--ok);background:var(--ok-bg)" : ok === false ? "border-color:var(--bad);background:var(--bad-bg)" : ""}">
              <b>${i + 1}. ${u.esc(l)}</b><br>→ ${mine == null ? "<i>chưa ghép</i>" : `${u.letter(mine)}. ${u.esc(it.rights[mine])}`}
              ${ans && !ok ? `<br><span class="small" style="color:var(--ok)">Đúng: ${u.letter(ans.map[i])}. ${u.esc(it.rights[ans.map[i]])}</span>` : ""}</div>`;
          })
          .join("")}</div>${ans && ans.explain ? `<div class="card flat" style="margin-top:12px;background:var(--paper)"><b>Giải thích.</b> ${ui.md(ans.explain)}</div>` : ""}</div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item;
      if (!it) {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:3rem">${u.esc(ctx.step.title)}</h1></div>`;
        return;
      }
      const subs = u.vals(ctx.subs);
      const ans = ctx.answer;
      const rate = (i) => (ans ? u.pct(subs.filter((s) => s.v && s.v.m && s.v.m[i] === ans.map[i]).length, subs.length) : null);
      el.innerHTML = `<h1 class="scr-q">${u.rich(it.question)}</h1>
        <div class="grid g2" style="gap:28px"><div class="col">${it.lefts
          .map(
            (l, i) => `<div class="scr-opt"><span class="k">${i + 1}</span><span class="grow">${u.esc(l)}</span>${
              ans ? `<span class="pill ${rate(i) >= 70 ? "ok" : rate(i) >= 40 ? "warn" : "bad"}" style="font-size:1rem">→ ${u.letter(ans.map[i])} · ${rate(i)}% đúng</span>` : ""
            }</div>`
          )
          .join("")}</div>
        <div class="col">${it.rights.map((r, j) => `<div class="scr-opt"><span class="k">${u.letter(j)}</span>${u.esc(r)}</div>`).join("")}</div></div>
        ${ans && ans.explain ? `<div class="scr-explain">${ui.md(ans.explain)}</div>` : ""}`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const p = perm(s, s.pairs.length);
      const subs = u.vals(ctx.subs);
      el.innerHTML = `<p class="small muted">Đáp án: ${s.pairs.map((_, i) => `${i + 1}→${u.letter(p.indexOf(i))}`).join(" · ")}</p>${ui.bars(
        s.pairs.map((x, i) => ({ label: `${i + 1}. ${u.esc(x.left)}`, value: subs.filter((v) => v.v && v.v.m && v.v.m[i] === p.indexOf(i)).length, correct: true })),
        { total: subs.length || 1 }
      )}`;
    }
  });

  /* ---------------- Sắp xếp trình tự ---------------- */
  L360.registerType({
    type: "order",
    label: "Sắp xếp trình tự",
    icon: "↕",
    desc: "Sắp xếp sự kiện, bước, giai đoạn theo đúng thứ tự (trục thời gian, quy trình). Nhập các mục theo thứ tự ĐÚNG; hệ thống tự xáo trộn.",
    fields: [
      { key: "question", label: "Yêu cầu", kind: "textarea" },
      { key: "items", label: "Các mục theo thứ tự đúng", kind: "list" },
      { key: "explain", label: "Giải thích sau khi công bố", kind: "textarea" },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({ type: "order", title: "Sắp xếp trình tự", minutes: 3, question: "Sắp xếp các sự kiện theo trình tự thời gian.", items: ["Sự kiện 1", "Sự kiện 2", "Sự kiện 3", "Sự kiện 4"], explain: "", timer: 90 }),
    validate(s, err) {
      if (!s.items || s.items.length < 3) err("Cần ít nhất 3 mục.");
    },
    publicPayload(s) {
      const p = perm(s, s.items.length);
      return { question: s.question || "", items: p.map((i) => s.items[i]) };
    },
    answerPayload(s) {
      const p = perm(s, s.items.length);
      return { seq: s.items.map((_, i) => p.indexOf(i)), explain: s.explain || "" };
    },
    isCorrect(s, key, v) {
      if (!Array.isArray(v)) return false;
      const p = perm(s, s.items.length);
      return v.length === s.items.length && v.every((pos, k) => p[pos] === k);
    },
    describe: (s, key, v) => (Array.isArray(v) ? v.map((x) => u.letter(x)).join("-") : ""),
    student: {
      input(el, ctx) {
        const it = ctx.item || {};
        let seq = Array.isArray(ctx.sub && ctx.sub.v) ? ctx.sub.v.slice() : it.items.map((_, i) => i);
        const draw = () => {
          el.innerHTML = `<div class="card"><div class="row"><span class="pill accent">Sắp xếp</span><span class="spacer"></span>${ui.timer()}</div>
            <h2 style="margin-top:12px">${u.rich(it.question)}</h2><p class="small muted">Dùng ▲ ▼ để đổi vị trí. Mục đầu tiên là sớm nhất / bước đầu tiên.</p>
            <div class="col" style="gap:8px">${seq
              .map(
                (pos, k) => `<div class="row nowrap card flat" style="padding:8px 10px;gap:8px"><b style="width:24px">${k + 1}</b><span class="grow">${u.esc(it.items[pos])}</span>
                <button class="btn sm" data-up="${k}" ${k === 0 ? "disabled" : ""} aria-label="Lên">▲</button><button class="btn sm" data-dn="${k}" ${k === seq.length - 1 ? "disabled" : ""} aria-label="Xuống">▼</button></div>`
              )
              .join("")}</div>
            <button class="btn primary lg block" style="margin-top:16px" data-send>Gửi thứ tự</button></div>`;
          u.$$("[data-up]", el).forEach((b) => (b.onclick = () => swap(Number(b.dataset.up), -1)));
          u.$$("[data-dn]", el).forEach((b) => (b.onclick = () => swap(Number(b.dataset.dn), 1)));
          u.$("[data-send]", el).onclick = () => ctx.submit(seq.slice());
        };
        const swap = (k, d) => {
          const j = k + d;
          [seq[k], seq[j]] = [seq[j], seq[k]];
          draw();
        };
        draw();
      },
      result(el, ctx) {
        const it = ctx.item || {};
        const v = Array.isArray(ctx.sub && ctx.sub.v) ? ctx.sub.v : [];
        const ans = ctx.answer;
        el.innerHTML = `<div class="card"><h2>${u.rich(it.question)}</h2><div class="grid g2"><div><div class="small muted">Thứ tự của em</div><ol>${v
          .map((pos, k) => `<li style="${ans ? (ans.seq[k] === pos ? "color:var(--ok)" : "color:var(--bad)") : ""}">${u.esc(it.items[pos])}</li>`)
          .join("")}</ol></div>${ans ? `<div><div class="small muted">Thứ tự đúng</div><ol>${ans.seq.map((pos) => `<li>${u.esc(it.items[pos])}</li>`).join("")}</ol></div>` : ""}</div>
          ${ans && ans.explain ? `<div class="card flat" style="background:var(--paper)">${ui.md(ans.explain)}</div>` : ""}</div>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item;
      if (!it) {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:3rem">${u.esc(ctx.step.title)}</h1></div>`;
        return;
      }
      const ans = ctx.answer;
      const subs = u.vals(ctx.subs).map((s) => s.v).filter(Array.isArray);
      if (ans) {
        const full = u.pct(subs.filter((v) => v.every((p, k) => ans.seq[k] === p)).length, subs.length);
        el.innerHTML = `<h1 class="scr-q">${u.rich(it.question)}</h1><p class="pill ${full >= 70 ? "ok" : full >= 40 ? "warn" : "bad"}" style="font-size:1.1rem">${full}% học sinh sắp xếp đúng hoàn toàn</p>
          <div class="col" style="margin-top:14px">${ans.seq
            .map((pos, k) => `<div class="scr-opt"><span class="k">${k + 1}</span><span class="grow">${u.esc(it.items[pos])}</span><span class="pill">${u.pct(subs.filter((v) => v[k] === pos).length, subs.length)}% đặt đúng vị trí</span></div>`)
            .join("")}</div>${ans.explain ? `<div class="scr-explain">${ui.md(ans.explain)}</div>` : ""}`;
      } else
        el.innerHTML = `<h1 class="scr-q">${u.rich(it.question)}</h1><div class="col">${it.items
          .map((t, j) => `<div class="scr-opt"><span class="k">${u.letter(j)}</span>${u.esc(t)}</div>`)
          .join("")}</div>`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const subs = u.vals(ctx.subs);
      const ok = subs.filter((x) => L360.types.order.isCorrect(s, s.id, x.v)).length;
      el.innerHTML = `<p class="small muted">Thứ tự đúng: ${s.items.map((t, i) => `${i + 1}. ${u.esc(t)}`).join(" · ")}</p>${ui.bars([{ label: "Sắp xếp đúng hoàn toàn", value: ok, correct: true }], {
        total: subs.length || 1
      })}`;
    }
  });
})();
