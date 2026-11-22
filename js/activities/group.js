/* Mẫu hoạt động theo nhóm: Nhiệm vụ nhóm (hồ sơ chuyên gia), Triển lãm – nhận xét chéo, Lựa chọn / đấu giá của nhóm. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;

  const resFor = (s, gIndex) => (s.resources || []).filter((r) => !r.for || !r.for.length || r.for.includes(gIndex + 1));
  const resHtml = (list) =>
    list.length
      ? list
          .map(
            (r) => `<div class="card flat" style="margin-bottom:10px"><h3>${u.esc(r.title || "Tư liệu")}</h3>${ui.media({
              image: r.image,
              caption: r.caption,
              credit: r.credit,
              link: r.link,
              linkTitle: r.linkTitle
            })}<div class="md">${ui.md(r.body || r.text || "")}</div></div>`
          )
          .join("")
      : `<p class="muted">Nhóm em dùng sách giáo khoa và tư liệu giáo viên phát.</p>`;

  /* ---------------- Nhiệm vụ nhóm – hồ sơ chuyên gia ---------------- */
  L360.registerType({
    type: "groupwork",
    label: "Nhiệm vụ nhóm (hồ sơ)",
    icon: "◫",
    desc: "Mỗi nhóm có tư liệu riêng, phân vai, thành viên gửi đóng góp, Thư kí soạn hồ sơ theo các mục A, B, C… rồi nộp. Giáo viên theo dõi tiến độ từng nhóm.",
    groupMode: true,
    fields: [
      { key: "task", label: "Nhiệm vụ của nhóm", kind: "textarea" },
      { key: "roles", label: "Các vai trong nhóm (vai đầu tiên là Thư kí)", kind: "list" },
      { key: "fields", label: "Các mục của hồ sơ", kind: "fieldsList" },
      { key: "resources", label: "Tư liệu (JSON nâng cao)", kind: "json", hint: '[{"title":"…","body":"…","image":"","credit":"","for":[1]}] – "for" là số thứ tự nhóm, để trống = mọi nhóm' },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({
      type: "groupwork",
      title: "Nghiên cứu nhóm",
      minutes: 12,
      task: "Đọc tư liệu, thảo luận và hoàn thành hồ sơ nhóm.",
      roles: ["Thư kí", "Trưởng nhóm", "Người tìm tư liệu", "Người thuyết trình"],
      fields: [
        { key: "A", label: "Thông tin chính" },
        { key: "B", label: "Ý nghĩa" }
      ],
      resources: [{ title: "Tư liệu chung", body: "Đọc SGK trang …" }],
      timer: 600
    }),
    normalize(s) {
      s.roles = (s.roles || ["Thư kí"]).map(String);
      s.fields = (s.fields || []).map((f, i) => (typeof f === "string" ? { key: u.letter(i), label: f } : Object.assign({ key: u.letter(i) }, f)));
      s.timer = Number(s.timer) || 600;
    },
    validate(s, err, warn) {
      if (!s.fields || !s.fields.length) err("Hồ sơ cần ít nhất 1 mục.");
      if (!s.task) warn("Chưa ghi nhiệm vụ của nhóm.");
    },
    keys: (s) => [{ key: s.id, label: s.title }],
    publicPayload: (s) => ({ task: s.task || "", roles: s.roles, fields: s.fields, resources: s.resources || [] }),
    answerPayload: () => null,
    describe: (s, key, v) => (v && v.fields ? s.fields.map((f) => `${f.key}. ${f.label}: ${v.fields[f.key] || ""}`).join(" | ") : ""),
    student: {
      render(el, ctx) {
        const it = ctx.item || {};
        const gi = ctx.groups.findIndex((g) => g.id === (ctx.group && ctx.group.id));
        const st = ctx.state;
        el.innerHTML = `<div class="card"><div class="row">${ui.gbadge(ctx.group)}<span class="pill accent">Nhiệm vụ nhóm</span><span class="spacer"></span>${ui.timer()}</div>
          <p style="margin-top:10px">${u.rich(it.task)}</p>
          <div class="tabs" role="tablist"><button class="tab on" data-tab="res">Tư liệu</button><button class="tab" data-tab="role">Vai trò</button><button class="tab" data-tab="dos">Hồ sơ</button></div>
          <div data-pane="res">${resHtml(resFor(it, gi))}</div>
          <div data-pane="role" class="hidden"><div data-live="roles"></div></div>
          <div data-pane="dos" class="hidden"><div data-live="dos"></div></div></div>`;
        u.$$("[data-tab]", el).forEach(
          (b) =>
            (b.onclick = () => {
              u.$$("[data-tab]", el).forEach((x) => x.classList.toggle("on", x === b));
              u.$$("[data-pane]", el).forEach((p) => p.classList.toggle("hidden", p.dataset.pane !== b.dataset.tab));
            })
        );
        el._gw = { tab: "res", drafts: {} };
        L360.types.groupwork.student.update(el, ctx, true);
        if (st.phase !== "open") u.$$("input,textarea,button[data-act]", el).forEach((x) => (x.disabled = true));
      },
      update(el, ctx, first) {
        if (!ctx.item) return;
        const it = ctx.item;
        const gw = ctx.gwork || {};
        const roles = gw.roles || {};
        const sec = gw.sec || "";
        const isSec = sec === ctx.code;
        const open = ctx.state.phase === "open";
        const submitted = ctx.gsub && ctx.gsub.v;
        // Vai trò
        const rEl = u.$('[data-live="roles"]', el);
        if (rEl) {
          rEl.innerHTML = `<p class="small muted">Chọn vai của em. Vai “${u.esc(it.roles[0])}” do một bạn đảm nhận để soạn và nộp hồ sơ.</p>
            <div class="col" style="gap:8px">${it.roles
              .map((r, i) => {
                const who = Object.keys(roles).filter((c) => roles[c] === i);
                const mine = roles[ctx.code] === i;
                const holder = i === 0 ? (sec ? [sec] : []) : who;
                return `<button class="opt ${mine || (i === 0 && isSec) ? "sel" : ""}" data-act="role" data-r="${i}" ${!open ? "disabled" : ""}><span class="k">${i + 1}</span><span class="grow">${u.esc(
                  r
                )}</span><span class="small muted">${holder.map((c) => u.esc(ctx.nameOf(c))).join(", ")}</span></button>`;
              })
              .join("")}</div>`;
          u.$$('[data-act="role"]', rEl).forEach(
            (b) =>
              (b.onclick = async () => {
                const r = Number(b.dataset.r);
                if (r === 0) {
                  if (sec && sec !== ctx.code) return u.toast(`${ctx.nameOf(sec)} đang là ${it.roles[0]}.`);
                  await ctx.gworkSet("sec", ctx.code);
                }
                await ctx.gworkSet(`roles/${ctx.code}`, r);
              })
          );
        }
        // Hồ sơ
        const dEl = u.$('[data-live="dos"]', el);
        if (!dEl) return;
        const contrib = u.entries(gw.contrib).sort((a, b) => (a[1].t || 0) - (b[1].t || 0));
        const draft = gw.draft || {};
        if (submitted) {
          dEl.innerHTML = `<div class="pill ok">✓ Nhóm đã nộp hồ sơ</div>${it.fields
            .map((f) => `<div class="card flat" style="margin-top:8px"><b>${f.key}. ${u.esc(f.label)}</b><div>${u.rich(submitted.fields[f.key] || "")}</div></div>`)
            .join("")}`;
          return;
        }
        if (isSec) {
          // Thư kí: giữ nguyên ô đang gõ, chỉ cập nhật danh sách đóng góp.
          if (!dEl.dataset.sec) {
            dEl.dataset.sec = "1";
            dEl.innerHTML = `<p class="small">Em là <b>${u.esc(it.roles[0])}</b>: soạn hồ sơ từ đóng góp của các bạn rồi bấm Nộp.</p>
              ${it.fields
                .map(
                  (f) => `<label class="field" style="margin-top:10px">${f.key}. ${u.esc(f.label)}${f.hint ? `<span class="hint">${u.esc(f.hint)}</span>` : ""}
                <textarea rows="3" data-f="${f.key}">${u.esc(draft[f.key] || "")}</textarea></label>`
                )
                .join("")}
              <h3 style="margin-top:16px">Đóng góp của thành viên</h3><div data-live="contrib"></div>
              <button class="btn primary lg block" style="margin-top:14px" data-act="send">Nộp hồ sơ nhóm</button>`;
            const save = u.debounce((k, v) => ctx.gworkSet(`draft/${k}`, v), 700);
            u.$$("[data-f]", dEl).forEach((ta) => ta.addEventListener("input", () => save(ta.dataset.f, ta.value)));
            u.$('[data-act="send"]', dEl).onclick = async () => {
              const fields = {};
              u.$$("[data-f]", dEl).forEach((ta) => (fields[ta.dataset.f] = ta.value.trim()));
              const empty = it.fields.filter((f) => !fields[f.key]).map((f) => f.key);
              if (empty.length && !(await u.confirm(`Mục ${empty.join(", ")} còn trống. Vẫn nộp hồ sơ?`, "Nộp"))) return;
              await ctx.gsubmit({ fields });
              u.toast("Đã nộp hồ sơ nhóm.", "ok");
            };
          }
          const cEl = u.$('[data-live="contrib"]', dEl);
          cEl.innerHTML = contrib.length
            ? contrib
                .map(
                  ([id, c]) => `<div class="card flat" style="padding:10px 12px;margin-bottom:6px"><span class="pill">${u.esc(c.field)}</span> <b>${u.esc(ctx.nameOf(c.code))}</b>: ${u.esc(
                    c.text
                  )} <button class="btn sm" data-ins="${id}">Chèn vào mục ${u.esc(c.field)}</button></div>`
                )
                .join("")
            : `<p class="muted small">Chưa có đóng góp.</p>`;
          u.$$("[data-ins]", cEl).forEach(
            (b) =>
              (b.onclick = () => {
                const c = gw.contrib[b.dataset.ins];
                const ta = u.$(`[data-f="${c.field}"]`, dEl);
                if (!ta) return;
                ta.value = (ta.value ? ta.value.trim() + "\n" : "") + c.text;
                ta.dispatchEvent(new Event("input"));
              })
          );
        } else {
          if (!dEl.dataset.mem) {
            dEl.dataset.mem = "1";
            dEl.innerHTML = `<p class="small">${sec ? `<b>${u.esc(ctx.nameOf(sec))}</b> là ${u.esc(it.roles[0])} của nhóm.` : `Nhóm chưa có ${u.esc(it.roles[0])} – vào tab Vai trò để nhận.`} Gửi ý của em vào một mục:</p>
              <div class="row"><select data-cf style="max-width:140px">${it.fields.map((f) => `<option value="${f.key}">Mục ${f.key}</option>`).join("")}</select>
              <span class="small muted grow" data-cl></span></div>
              <textarea rows="3" data-ct style="margin-top:8px" placeholder="Ý của em…"></textarea>
              <button class="btn primary block" style="margin-top:8px" data-act="contrib">Gửi đóng góp</button>
              <h3 style="margin-top:16px">Bản hồ sơ nhóm đang soạn</h3><div data-live="draft"></div>`;
            const sel = u.$("[data-cf]", dEl);
            const lab = () => (u.$("[data-cl]", dEl).textContent = (it.fields.find((f) => f.key === sel.value) || {}).label || "");
            sel.onchange = lab;
            lab();
            u.$('[data-act="contrib"]', dEl).onclick = async () => {
              const t = u.$("[data-ct]", dEl).value.trim();
              if (!t) return;
              await ctx.gworkPush("contrib", { code: ctx.code, field: sel.value, text: t.slice(0, 600), t: L360.store.TS });
              u.$("[data-ct]", dEl).value = "";
              u.toast("Đã gửi cho Thư kí.", "ok");
            };
          }
          const pv = u.$('[data-live="draft"]', dEl);
          pv.innerHTML = it.fields.map((f) => `<div class="small" style="margin-bottom:6px"><b>${f.key}. ${u.esc(f.label)}:</b> ${u.esc(draft[f.key] || "…")}</div>`).join("");
        }
        if (!open) u.$$("textarea,select,button[data-act]", el).forEach((x) => (x.disabled = true));
      }
    },
    screen(el, ctx) {
      const s = ctx.step;
      const it = ctx.item;
      const d = ctx.data;
      const gws = (d.gwork && d.gwork[s.id]) || {};
      const fields = (it && it.fields) || [];
      el.innerHTML = `<p class="scr-sub">${u.esc((it && it.task) || s.instructions || "")}</p><div class="grid" style="grid-template-columns:repeat(${ctx.groups.length},minmax(0,1fr));gap:14px">${ctx.groups
        .map((g) => {
          const gw = gws[g.id] || {};
          const mem = ctx.joinedCodes.filter((c) => (d.roster[c] || {}).group === g.id);
          const sub = ctx.gsubs && ctx.gsubs[g.id];
          const filled = fields.filter((f) => (sub ? sub.v.fields[f.key] : (gw.draft || {})[f.key]));
          return `<div class="card" style="border-top:6px solid ${g.color}"><h2 style="color:${g.color}">${u.esc(g.name)}</h2>
            <p class="small">Thành viên: <b>${mem.length}</b> · Đã nhận vai: <b>${Object.keys(gw.roles || {}).length}</b></p>
            <p class="small">Thư kí: <b>${gw.sec ? u.esc(ctx.nameOf(gw.sec)) : "chưa có"}</b> · Đóng góp: <b>${Object.keys(gw.contrib || {}).length}</b></p>
            <div class="row" style="gap:6px">${fields.map((f) => `<span class="pill ${filled.includes(f) ? "ok" : ""}">${f.key}</span>`).join("")}</div>
            <p style="margin-top:10px">${sub ? `<span class="pill ok">✓ Đã nộp</span>` : `<span class="pill warn">Đang soạn</span>`}</p></div>`;
        })
        .join("")}</div>`;
    },
    host(el, ctx) {
      L360.types.groupwork.screen(el, ctx);
      const s = ctx.step;
      const gws = (ctx.data.gwork && ctx.data.gwork[s.id]) || {};
      el.insertAdjacentHTML(
        "beforeend",
        `<h3 style="margin-top:14px">Đổi Thư kí</h3><div class="row">${ctx.groups
          .map((g) => {
            const mem = ctx.joinedCodes.filter((c) => (ctx.data.roster[c] || {}).group === g.id);
            return `<label class="field small" style="min-width:140px">${u.esc(g.name)}<select data-sec="${g.id}"><option value="">–</option>${mem
              .map((c) => `<option ${(gws[g.id] || {}).sec === c ? "selected" : ""}>${c}</option>`)
              .join("")}</select></label>`;
          })
          .join("")}</div>`
      );
      u.$$("[data-sec]", el).forEach((sel) => (sel.onchange = () => sel.value && ctx.host.setSecretary(s.id, sel.dataset.sec, sel.value)));
    },
    controls(ctx) {
      const { host, state } = ctx;
      const c = [];
      if (state.phase === "observe") c.push({ label: "▶ Mở nhiệm vụ", cls: "primary", fn: () => host.open() });
      if (state.phase === "open")
        c.push({ label: "■ Khoá nộp bài", cls: "dark", fn: () => host.lock() }, { label: "+30 giây", fn: () => host.addTime(30) }, { label: "+1 phút", fn: () => host.addTime(60) });
      if (state.phase === "locked") c.push({ label: "↻ Mở lại", fn: () => host.reopen() });
      return c;
    }
  });

  /* ---------------- Triển lãm – nhận xét chéo ---------------- */
  const DEFAULT_CRIT = ["Nội dung chính xác", "Trình bày rõ ràng", "Có điểm mới, sáng tạo"];
  L360.registerType({
    type: "expo",
    label: "Triển lãm – nhận xét chéo",
    icon: "◩",
    desc: "Lần lượt chiếu hồ sơ của từng nhóm (mặc định 75 giây/nhóm); các bạn nhóm khác chấm 3 tiêu chí và đặt câu hỏi.",
    releaseOnEnter: false,
    fields: [
      { key: "source", label: "Lấy hồ sơ từ bước (id)", kind: "text", hint: "Để trống: nhiệm vụ nhóm gần nhất phía trước" },
      { key: "perGroupSec", label: "Giây cho mỗi nhóm", kind: "number" },
      { key: "criteria", label: "Tiêu chí chấm (1–5 sao)", kind: "list" },
      { key: "askQuestion", label: "Cho đặt câu hỏi", kind: "bool" }
    ],
    template: () => ({ type: "expo", title: "Triển lãm hồ sơ", minutes: 7, perGroupSec: 75, criteria: DEFAULT_CRIT.slice(), askQuestion: true }),
    normalize(s) {
      s.perGroupSec = Number(s.perGroupSec) || 75;
      s.criteria = s.criteria && s.criteria.length ? s.criteria : DEFAULT_CRIT.slice();
    },
    count: () => 0,
    subKey: (s, st) => `${s.id}__g${st.q || 0}`,
    keys: (s, meta) => ((meta && meta.groups) || []).map((g, i) => ({ key: `${s.id}__g${i}`, label: `${s.title} – ${g.name}` })),
    timerFor: (s) => s.perGroupSec,
    async onEnter(host, s) {
      const src = s.source ? host.pack.steps.find((x) => x.id === s.source) : host.pack.steps.slice(0, host.state.step).reverse().find((x) => x.type === "groupwork");
      if (!src) return;
      const gsubs = (host.data.gsubs && host.data.gsubs[src.id]) || {};
      const gws = (host.data.gwork && host.data.gwork[src.id]) || {};
      const out = { fields: src.fields, groups: {} };
      (host.meta.groups || []).forEach((g) => {
        const sub = gsubs[g.id];
        out.groups[g.id] = (sub && sub.v && sub.v.fields) || (gws[g.id] && gws[g.id].draft) || {};
      });
      await L360.store.set(`rooms/${host.room}/pub/expo/${s.id}`, out);
    },
    publicPayload: (s, st) => ({ g: st.q || 0, criteria: s.criteria, askQuestion: !!s.askQuestion }),
    answerPayload: () => null,
    describe: (s, key, v) => (v ? `${(v.scores || []).join("/")}${v.q ? ` | Hỏi: ${v.q}` : ""}` : ""),
    student: {
      render(el, ctx) {
        const st = ctx.state;
        const expo = ctx.expo || { groups: {}, fields: [] };
        if (st.phase === "observe") {
          el.innerHTML = ui.wait("Triển lãm sắp bắt đầu", "Các nhóm lần lượt báo cáo. Em chấm nhóm bạn theo 3 tiêu chí.");
          return;
        }
        const g = ctx.groups[st.q || 0];
        const dossier = expo.groups[g.id] || {};
        const card = `<div class="card" style="border-top:6px solid ${g.color};margin-bottom:14px"><h2 style="color:${g.color}">${u.esc(g.name)}</h2>${(expo.fields || [])
          .map((f) => `<p><b>${f.key}. ${u.esc(f.label)}:</b> ${u.rich(dossier[f.key] || "…")}</p>`)
          .join("")}</div>`;
        if (ctx.group && ctx.group.id === g.id) {
          el.innerHTML = card + ui.wait("Nhóm em đang báo cáo", "Các bạn nhóm khác đang chấm và đặt câu hỏi.");
          return;
        }
        if (ctx.sub || st.phase !== "open") {
          el.innerHTML = card + (ctx.sub ? ui.done("Đã gửi nhận xét", "Chờ nhóm tiếp theo.") : ui.wait("Đã hết lượt chấm nhóm này"));
          return;
        }
        const it = ctx.item;
        if (!it) {
          el.innerHTML = card + ui.wait("Chuẩn bị nhận xét", "Lắng nghe nhóm bạn báo cáo.");
          return;
        }
        const sc = it.criteria.map(() => 0);
        const draw = () => {
          el.innerHTML =
            card +
            `<div class="card"><div class="row"><b>Nhận xét ${u.esc(g.name)}</b><span class="spacer"></span>${ui.timer()}</div>${it.criteria
              .map(
                (c, i) => `<p style="margin:12px 0 6px;font-weight:650">${u.esc(c)}</p><div class="chips">${[1, 2, 3, 4, 5]
                  .map((n) => `<button class="chip ${sc[i] >= n ? "sel" : ""}" data-s="${i}" data-n="${n}">${n}★</button>`)
                  .join("")}</div>`
              )
              .join("")}
            ${it.askQuestion ? `<label class="field" style="margin-top:12px">Câu hỏi cho nhóm bạn (không bắt buộc)<input type="text" id="q" maxlength="160"></label>` : ""}
            <button class="btn primary lg block" style="margin-top:14px" data-send>Gửi nhận xét</button></div>`;
          u.$$("[data-s]", el).forEach((b) => (b.onclick = () => ((sc[Number(b.dataset.s)] = Number(b.dataset.n)), draw())));
          u.$("[data-send]", el).onclick = () => {
            if (sc.some((x) => !x)) return u.toast("Chấm đủ các tiêu chí.", "bad");
            const v = { scores: sc.slice() };
            const q = u.$("#q", el);
            if (q && q.value.trim()) v.q = q.value.trim();
            ctx.submit(v);
          };
        };
        draw();
      }
    },
    screen(el, ctx) {
      const st = ctx.state;
      const s = ctx.step;
      const expo = (ctx.data.pub && ctx.data.pub.expo && ctx.data.pub.expo[s.id]) || { groups: {}, fields: [] };
      if (st.phase === "observe") {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:3rem">Triển lãm hồ sơ</h1><p class="muted" style="font-size:1.4rem">${ctx.groups.length} nhóm lần lượt báo cáo · các bạn nhóm khác chấm theo tiêu chí</p></div>`;
        return;
      }
      const g = ctx.groups[st.q || 0];
      const dossier = expo.groups[g.id] || {};
      const subs = u.vals(ctx.subs);
      const crit = (ctx.item && ctx.item.criteria) || DEFAULT_CRIT;
      el.innerHTML = `<div class="grid" style="grid-template-columns:2fr 1fr;gap:24px;height:100%">
        <div class="card" style="border-top:8px solid ${g.color};font-size:1.25rem"><h1 style="color:${g.color}">${u.esc(g.name)}</h1>${(expo.fields || [])
          .map((f) => `<p><b>${f.key}. ${u.esc(f.label)}:</b> ${u.rich(dossier[f.key] || "…")}</p>`)
          .join("")}</div>
        <div><h3>Nhận xét của các bạn (${subs.length})</h3>${crit
          .map((c, i) => `<p style="margin:6px 0">${u.esc(c)}: <b>${subs.length ? u.round1(u.avg(subs.map((x) => x.v.scores[i]))) : "–"}</b>/5</p>`)
          .join("")}${subs
          .filter((x) => x.v.q)
          .slice(-4)
          .map((x) => `<blockquote class="scr-feat" style="font-size:1rem">${u.esc(x.v.q)}</blockquote>`)
          .join("")}</div></div>`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const d = ctx.data;
      el.innerHTML = `<table class="t"><tr><th>Nhóm</th>${s.criteria.map((c) => `<th class="num">${u.esc(c)}</th>`).join("")}<th class="num">Lượt</th></tr>${ctx.groups
        .map((g, i) => {
          const subs = u.vals(d.subs && d.subs[`${s.id}__g${i}`]);
          return `<tr><td>${ui.gbadge(g)}</td>${s.criteria.map((c, k) => `<td class="num">${subs.length ? u.round1(u.avg(subs.map((x) => x.v.scores[k]))) : "–"}</td>`).join("")}<td class="num">${subs.length}</td></tr>`;
        })
        .join("")}</table>`;
    },
    controls(ctx) {
      const { host, state, groups } = ctx;
      const q = state.q || 0;
      const c = [];
      if (state.phase === "observe") c.push({ label: "Mời nhóm đầu tiên ›", cls: "primary", fn: () => host.setQ(0, true) });
      else {
        if (q < groups.length - 1) c.push({ label: `Nhóm tiếp theo (${groups[q + 1].name}) ›`, cls: "primary", fn: () => host.setQ(q + 1, true) });
        else if (state.phase === "open") c.push({ label: "Kết thúc triển lãm", cls: "dark", fn: () => host.lock() });
        if (state.phase === "open") c.push({ label: "+30 giây", fn: () => host.addTime(30) });
      }
      return c;
    }
  });

  /* ---------------- Lựa chọn của nhóm / đấu giá ---------------- */
  L360.registerType({
    type: "auction",
    label: "Lựa chọn của nhóm (đấu giá)",
    icon: "⚖",
    desc: "Mỗi nhóm chọn 1 mục (di sản, phương án, giả thuyết…), đặt mức ưu tiên/giá trong ngân sách và nêu lí do; giáo viên trao quyền cho nhóm thuyết phục nhất.",
    groupMode: true,
    fields: [
      { key: "question", label: "Yêu cầu", kind: "textarea" },
      { key: "items", label: "Các mục để chọn (JSON nâng cao)", kind: "json", hint: '[{"title":"…","text":"…","image":"","credit":""}]' },
      { key: "budget", label: "Ngân sách tối đa", kind: "number" },
      { key: "min", label: "Mức tối thiểu", kind: "number" },
      { key: "stepBy", label: "Bước giá", kind: "number" },
      { key: "timer", label: "Thời gian (giây)", kind: "number" }
    ],
    template: () => ({
      type: "auction",
      title: "Phiên đấu giá",
      minutes: 5,
      question: "Nhóm em chọn mục nào? Đặt giá và nêu lí do.",
      items: [{ title: "Mục 1", text: "" }, { title: "Mục 2", text: "" }, { title: "Mục 3", text: "" }],
      budget: 100,
      min: 10,
      stepBy: 5,
      timer: 120
    }),
    normalize(s) {
      s.items = (s.items || []).map((x) => (typeof x === "string" ? { title: x } : x));
      s.budget = Number(s.budget) || 100;
      s.min = Number(s.min) || 10;
      s.stepBy = Number(s.stepBy) || 5;
    },
    validate(s, err) {
      if (!s.items || s.items.length < 2) err("Cần ít nhất 2 mục để chọn.");
    },
    keys: (s) => [{ key: s.id, label: s.title }],
    publicPayload: (s) => ({ question: s.question || "", items: s.items, budget: s.budget, min: s.min, stepBy: s.stepBy }),
    answerPayload: () => null,
    describe: (s, key, v) => (v ? `${(s.items[v.item] || {}).title || ""} – ${v.amount} – ${v.reason || ""}` : ""),
    student: {
      render(el, ctx) {
        const it = ctx.item || {};
        const st = ctx.state;
        const cur = ctx.gsub && ctx.gsub.v;
        let item = cur ? cur.item : null;
        let amount = cur ? cur.amount : it.min;
        const award = ctx.awards && ctx.awards[ctx.step.id];
        const cards = (sel, dis) =>
          `<div class="grid g2" style="gap:10px">${it.items
            .map(
              (x, i) => `<button class="opt ${sel === i ? "sel" : ""}" data-i="${i}" ${dis ? "disabled" : ""} style="flex-direction:column;align-items:stretch">${
                x.image ? `<img src="${u.esc(x.image)}" alt="" style="height:110px;object-fit:cover;border-radius:10px">` : ""
              }<b>${u.esc(x.title)}</b>${x.text ? `<span class="small muted">${u.esc(x.text)}</span>` : ""}</button>`
            )
            .join("")}</div>`;
        if (st.phase !== "open") {
          el.innerHTML = `<div class="card"><h2>${u.rich(it.question)}</h2>${cards(item, true)}${
            cur ? `<p style="margin-top:12px">Nhóm em: <b>${u.esc(it.items[cur.item].title)}</b> · ${cur.amount} · ${u.esc(cur.reason || "")}</p>` : `<p class="muted">Nhóm em chưa gửi lựa chọn.</p>`
          }${award ? `<p class="pill ${award === (ctx.group || {}).id ? "ok" : ""}" style="margin-top:8px">Quyền giới thiệu: ${u.esc((ctx.groups.find((g) => g.id === award) || {}).name || "")}</p>` : ""}</div>`;
          return;
        }
        const draw = () => {
          const reason = u.$("#rs", el) ? u.$("#rs", el).value : cur ? cur.reason : "";
          el.innerHTML = `<div class="card"><div class="row">${ui.gbadge(ctx.group)}<span class="pill accent">Đại diện nhóm gửi</span><span class="spacer"></span>${ui.timer()}</div>
            <h2 style="margin-top:12px">${u.rich(it.question)}</h2>${cards(item)}
            <label class="field" style="margin-top:14px">Mức giá (${it.min}–${it.budget})<input type="range" id="am" min="${it.min}" max="${it.budget}" step="${it.stepBy}" value="${amount}"><b style="font-size:1.4rem" id="amv">${amount}</b></label>
            <label class="field" style="margin-top:10px">Lí do của nhóm (bắt buộc)<textarea id="rs" rows="2">${u.esc(reason || "")}</textarea></label>
            <button class="btn primary lg block" style="margin-top:12px" data-send>${cur ? "Cập nhật lựa chọn của nhóm" : "Gửi lựa chọn của nhóm"}</button>
            <div data-live="gs" class="small" style="margin-top:10px"></div></div>`;
          u.$$("[data-i]", el).forEach((b) => (b.onclick = () => ((item = Number(b.dataset.i)), draw())));
          u.$("#am", el).oninput = (e) => ((amount = Number(e.target.value)), (u.$("#amv", el).textContent = amount));
          u.$("[data-send]", el).onclick = () => {
            const rs = u.$("#rs", el).value.trim();
            if (item == null) return u.toast("Chọn một mục.", "bad");
            if (!rs) return u.toast("Nhóm cần nêu lí do.", "bad");
            ctx.gsubmit({ item, amount, reason: rs.slice(0, 300) });
            u.toast("Đã gửi cho cả nhóm.", "ok");
          };
          L360.types.auction.student.update(el, ctx);
        };
        draw();
      },
      update(el, ctx) {
        const box = u.$('[data-live="gs"]', el);
        const cur = ctx.gsub && ctx.gsub.v;
        const it = ctx.item || {};
        if (box)
          box.innerHTML = cur
            ? `<span class="pill ok">Nhóm đã gửi</span> ${u.esc(it.items[cur.item].title)} · ${cur.amount} · bởi ${u.esc(ctx.nameOf(ctx.gsub.by))}`
            : `<span class="muted">Nhóm chưa gửi.</span>`;
      }
    },
    screen(el, ctx) {
      const it = ctx.item;
      const s = ctx.step;
      if (!it) {
        el.innerHTML = `<div class="scr-center"><h1 style="font-size:3rem">${u.esc(s.title)}</h1><p class="muted" style="font-size:1.4rem">${u.esc(s.instructions || "")}</p></div>`;
        return;
      }
      const award = ctx.data.pub && ctx.data.pub.awards && ctx.data.pub.awards[s.id];
      const bids = ctx.gsubs || {};
      el.innerHTML = `<h1 class="scr-q">${u.rich(it.question)}</h1><div class="grid" style="grid-template-columns:repeat(${Math.min(it.items.length, 5)},minmax(0,1fr));gap:14px">${it.items
        .map((x, i) => {
          const on = ctx.groups.filter((g) => bids[g.id] && bids[g.id].v.item === i);
          return `<div class="card" style="padding:14px">${x.image ? `<img src="${u.esc(x.image)}" alt="" style="height:120px;width:100%;object-fit:cover;border-radius:10px">` : ""}<h3 style="margin-top:8px">${u.esc(
            x.title
          )}</h3><div class="col" style="gap:6px">${on
            .map(
              (g) =>
                `<div class="row nowrap" style="gap:6px">${ui.gbadge(g)}<b>${bids[g.id].v.amount}</b>${award === g.id ? `<span class="pill ok">Quyền giới thiệu</span>` : ""}</div>${
                  ctx.state.phase !== "open" ? `<div class="small muted">${u.esc(bids[g.id].v.reason || "")}</div>` : ""
                }`
            )
            .join("")}</div></div>`;
        })
        .join("")}</div>`;
    },
    host(el, ctx) {
      const s = ctx.step;
      const bids = ctx.gsubs || {};
      const award = ctx.data.pub && ctx.data.pub.awards && ctx.data.pub.awards[s.id];
      el.innerHTML = `<table class="t"><tr><th>Nhóm</th><th>Chọn</th><th class="num">Giá</th><th>Lí do</th><th></th></tr>${ctx.groups
        .map((g) => {
          const b = bids[g.id] && bids[g.id].v;
          return `<tr><td>${ui.gbadge(g)}</td><td>${b ? u.esc(s.items[b.item].title) : "–"}</td><td class="num">${b ? b.amount : ""}</td><td class="small">${b ? u.esc(b.reason) : ""}</td>
            <td><button class="btn sm ${award === g.id ? "ok" : ""}" data-aw="${g.id}">${award === g.id ? "✓ Đã trao" : "Trao quyền"}</button></td></tr>`;
        })
        .join("")}</table>`;
      u.$$("[data-aw]", el).forEach((b) => (b.onclick = () => ctx.host.award(s.id, b.dataset.aw)));
    }
  });
})();
