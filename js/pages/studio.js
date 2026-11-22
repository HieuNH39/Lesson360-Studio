/* Studio: thư viện gói bài học, tạo bài bằng trợ lý AI (Lesson Architect), trình soạn, in phiếu học tập và kịch bản. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;
  const S = L360.store;
  const Pack = L360.Pack;
  const app = u.$("#app");
  let teacher = null;
  let tab = u.qs("tab") || "lib";
  let cur = null; // gói đang soạn
  let dirty = false;

  const AI_LINKS = [
    ["Claude", "https://claude.ai/new"],
    ["ChatGPT", "https://chatgpt.com/"],
    ["Gemini", "https://gemini.google.com/app"]
  ];

  function frame() {
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}<a class="btn sm" href="giaovien.html">Dạy</a><a class="btn sm" href="insight.html">Dữ liệu</a>`, { sub: "Studio soạn bài" }) +
      `<main class="wrap"><div class="tabs no-print">${[
        ["lib", "Thư viện bài học"],
        ["ai", "✦ Tạo bài bằng AI"],
        ["edit", "Soạn & chỉnh sửa"],
        ["print", "In phiếu & kịch bản"]
      ]
        .map(([k, l]) => `<button class="tab ${tab === k ? "on" : ""}" data-tab="${k}">${l}</button>`)
        .join("")}</div><div id="pane"></div></main>` +
      L360.shell.footer();
    u.$$("[data-tab]").forEach((b) => (b.onclick = () => go(b.dataset.tab)));
    render();
  }
  async function go(t) {
    if (tab === "edit" && t !== "edit" && dirty && !(await u.confirm("Bài đang sửa chưa lưu. Rời trình soạn?", "Rời đi"))) return;
    tab = t;
    history.replaceState(null, "", `?tab=${t}${cur ? "&id=" + encodeURIComponent(cur.id) : ""}`);
    u.$$("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
    render();
  }
  function render() {
    const pane = u.$("#pane");
    if (tab === "lib") return library(pane);
    if (tab === "ai") return aiPane(pane);
    if (tab === "edit") return editor(pane);
    if (tab === "print") return printPane(pane);
  }

  /* ---------------- Thư viện ---------------- */
  async function library(pane) {
    const all = L360.Library.all();
    pane.innerHTML = `<div class="row" style="margin-bottom:16px"><h1 class="grow" style="margin:0">Thư viện bài học</h1>
      <button class="btn primary" id="toAi">✦ Tạo bài bằng AI</button><button class="btn" id="blank">+ Bài trống</button>
      <label class="btn">⬆ Nhập tệp JSON<input type="file" accept=".json,application/json" id="imp" hidden></label></div>
      <div class="grid g3" id="cards">${all
        .map((p) => {
          const sm = Pack.summary(p);
          return `<article class="card" style="display:flex;flex-direction:column;gap:8px">
            <div class="row">${p._sample ? `<span class="pill">Bài mẫu</span>` : `<span class="pill ok">Của tôi</span>`}${p.meta && p.meta.prepMinutes ? `<span class="pill accent">Soạn ${p.meta.prepMinutes} phút</span>` : ""}</div>
            <h3 style="margin:0">${u.esc(p.title)}</h3>
            <div class="small muted">${u.esc([p.subject, p.grade && "lớp " + p.grade].filter(Boolean).join(" · "))}<br>${u.esc(p.lessonRef || "")}</div>
            <div class="small">${sm.steps} hoạt động · ${sm.minutes} phút</div>
            <div class="row" style="margin-top:auto;gap:6px"><a class="btn sm primary" href="giaovien.html?pack=${encodeURIComponent(p.id)}">Dạy</a>
              <button class="btn sm" data-edit="${u.esc(p.id)}">${p._sample ? "Nhân bản để sửa" : "Sửa"}</button>
              <button class="btn sm" data-print="${u.esc(p.id)}">In</button><button class="btn sm" data-json="${u.esc(p.id)}">JSON</button>
              ${!p._sample ? `<button class="btn sm ghost" data-del="${u.esc(p.id)}" title="Xoá">✕</button>` : ""}
              ${!p._sample && !L360.isLocal ? `<button class="btn sm ghost" data-share="${u.esc(p.id)}">Chia sẻ cho trường</button>` : ""}</div></article>`;
        })
        .join("")}</div>`;
    u.$("#toAi").onclick = () => go("ai");
    u.$("#blank").onclick = () => {
      cur = Pack.normalize({ title: "Bài học mới", subject: teacher.subject || "", grade: "", duration: 45, steps: [L360.types.slide.template()] });
      cur.id = "bai-" + u.uid(6);
      dirty = true;
      go("edit");
    };
    u.$("#imp").onchange = async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const p = Pack.parse(await f.text());
        const v = Pack.validate(p);
        if (v.errors.length) return u.toast("Tệp còn lỗi: " + v.errors[0], "bad", 5000);
        L360.Library.save(v.pack);
        u.toast("Đã nhập vào thư viện.", "ok");
        library(pane);
      } catch (err) {
        u.toast("Không đọc được tệp JSON.", "bad");
      }
    };
    u.$$("[data-edit]").forEach(
      (b) =>
        (b.onclick = () => {
          const p = u.clone(L360.Library.get(b.dataset.edit));
          if (p._sample) {
            delete p._sample;
            p.id = p.id + "-" + u.uid(4);
            p.title = p.title + " (bản của tôi)";
          }
          cur = Pack.normalize(p);
          dirty = !!b.textContent.includes("Nhân bản");
          go("edit");
        })
    );
    u.$$("[data-print]").forEach((b) => (b.onclick = () => ((cur = Pack.normalize(L360.Library.get(b.dataset.print))), go("print"))));
    u.$$("[data-json]").forEach(
      (b) =>
        (b.onclick = () => {
          const p = L360.Library.get(b.dataset.json);
          const out = u.clone(p);
          delete out._sample;
          u.download(`${p.id}.l360.json`, JSON.stringify(out, null, 2), "application/json");
        })
    );
    u.$$("[data-del]").forEach(
      (b) =>
        (b.onclick = async () => {
          if (!(await u.confirm("Xoá bài học này khỏi thư viện trên máy?", "Xoá"))) return;
          L360.Library.remove(b.dataset.del);
          library(pane);
        })
    );
    u.$$("[data-share]").forEach(
      (b) =>
        (b.onclick = async () => {
          const p = L360.Library.get(b.dataset.share);
          await S.set(`library/${p.id}`, { pack: p, owner: teacher.uid, ownerName: teacher.name, subject: p.subject, grade: p.grade, title: p.title, t: S.TS });
          u.toast("Đã chia sẻ lên thư viện của trường.", "ok");
        })
    );
  }

  /* ---------------- Tạo bài bằng AI ---------------- */
  function aiPane(pane) {
    const saved = JSON.parse(localStorage.getItem("l360:aiopts") || "{}");
    const o = Object.assign({ subject: teacher.subject || "", grade: "", duration: 45, groups: 4, size: 30, tool: "Claude", group: true, quiz: true, peer: true, explore: false, site: "" }, saved);
    pane.innerHTML = `<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:20px">
      <section class="card"><span class="pill accent">Bước 1</span><h2 style="margin-top:8px">Thông tin tiết học</h2>
        <div class="grid g2"><label class="field">Môn<input id="o-subject" type="text" value="${u.esc(o.subject)}"></label><label class="field">Lớp<input id="o-grade" type="text" value="${u.esc(o.grade)}"></label>
        <label class="field">Thời lượng (phút)<input id="o-duration" type="number" value="${o.duration}"></label><label class="field">Số nhóm<input id="o-groups" type="number" min="2" max="6" value="${o.groups}"></label></div>
        <div class="col" style="gap:6px;margin-top:12px">
          <label class="row small"><input type="checkbox" id="o-peer" ${o.peer ? "checked" : ""}> Có hoạt động hai vòng – học từ bạn</label>
          <label class="row small"><input type="checkbox" id="o-group" ${o.group ? "checked" : ""}> Có 1 nhiệm vụ nhóm + triển lãm</label>
          <label class="row small"><input type="checkbox" id="o-quiz" ${o.quiz ? "checked" : ""}> Có trò chơi trắc nghiệm nhanh</label>
          <label class="row small"><input type="checkbox" id="o-explore" ${o.explore ? "checked" : ""}> Có khám phá di sản Kinh Bắc (Heritage Lens)</label>
          <select id="o-site">${[`<option value="">– di tích phù hợp nhất –</option>`]
            .concat(L360.heritage.SITES.map((s) => `<option value="${s.id}" ${o.site === s.id ? "selected" : ""}>${u.esc(s.name)}</option>`))
            .join("")}</select></div>
        <hr><span class="pill accent">Bước 2</span><h2 style="margin-top:8px">Gửi giáo án cho trợ lý AI</h2>
        <ol class="small" style="padding-left:18px"><li>Bấm <b>Sao chép lời nhắc</b>.</li><li>Mở trợ lý AI, <b>đính kèm tệp giáo án</b> (Word/PDF) hoặc dán nội dung, dán lời nhắc rồi gửi.</li><li>Sao chép khối JSON trợ lý trả về, dán vào Bước 3.</li></ol>
        <div class="row"><button class="btn primary" id="copyP">Sao chép lời nhắc</button>${AI_LINKS.map(([n, l]) => `<a class="btn sm" href="${l}" target="_blank" rel="noopener">${n} ↗</a>`).join("")}</div>
        <p class="small muted" style="margin-top:10px">Dùng Claude? Cài skill <b>lesson-architect</b> (thư mục <span class="kbd">skill/</span>) rồi chỉ cần viết: “Dùng skill lesson-architect chuyển giáo án này”.</p>
        <details style="margin-top:8px"><summary class="small">Xem lời nhắc</summary><pre id="pv" style="white-space:pre-wrap;font-size:.78rem;max-height:300px;overflow:auto;background:var(--paper);padding:10px;border-radius:10px"></pre></details></section>
      <section class="card"><span class="pill accent">Bước 3</span><h2 style="margin-top:8px">Dán kết quả và kiểm tra</h2>
        <textarea id="res" rows="14" placeholder="Dán toàn bộ câu trả lời của trợ lý AI (có khối \`\`\`json\`\`\`) vào đây…"></textarea>
        <div class="row" style="margin-top:10px"><button class="btn primary" id="check">Kiểm tra gói bài học</button><span class="small muted" id="timer"></span></div>
        <div id="out" style="margin-top:12px"></div></section></div>`;
    const read = () => {
      const v = (id) => u.$("#o-" + id).value;
      const c = (id) => u.$("#o-" + id).checked;
      const r = { subject: v("subject"), grade: v("grade"), duration: Number(v("duration")) || 45, groups: Number(v("groups")) || 4, size: 30, peer: c("peer"), group: c("group"), quiz: c("quiz"), explore: c("explore"), site: v("site") };
      localStorage.setItem("l360:aiopts", JSON.stringify(r));
      return r;
    };
    const showPrompt = () => (u.$("#pv").textContent = L360.Architect.prompt(read()));
    u.$$("[id^=o-]").forEach((el) => el.addEventListener("change", showPrompt));
    showPrompt();
    const tick = () => {
      const t0 = Number(localStorage.getItem("l360:aiStart"));
      u.$("#timer") && (u.$("#timer").textContent = t0 ? `Đã ${Math.max(1, Math.round((Date.now() - t0) / 60000))} phút kể từ khi sao chép lời nhắc` : "");
    };
    tick();
    const th = setInterval(() => (u.$("#timer") ? tick() : clearInterval(th)), 20000);
    u.$("#copyP").onclick = async () => {
      const ok = await u.copy(L360.Architect.prompt(read()));
      localStorage.setItem("l360:aiStart", String(Date.now()));
      tick();
      u.toast(ok ? "Đã sao chép lời nhắc. Dán vào trợ lý AI cùng giáo án." : "Không sao chép được – mở “Xem lời nhắc” để chép tay.", ok ? "ok" : "bad");
    };
    u.$("#check").onclick = () => {
      const out = u.$("#out");
      let raw;
      try {
        raw = Pack.parse(u.$("#res").value);
      } catch (e) {
        out.innerHTML = `<p class="pill bad" style="white-space:normal">Không tìm thấy JSON hợp lệ. Hãy sao chép cả khối \`\`\`json … \`\`\`.</p>`;
        return;
      }
      const v = Pack.validate(raw);
      const sm = v.pack ? Pack.summary(v.pack) : null;
      out.innerHTML = `${v.errors.length ? `<div class="card flat" style="border-color:var(--bad)"><b style="color:var(--bad)">${v.errors.length} lỗi cần sửa</b><ul class="small">${v.errors.map((e) => `<li>${u.esc(e)}</li>`).join("")}</ul>
          <button class="btn sm" id="fix">Sao chép lời nhắc sửa lỗi</button></div>` : `<p class="pill ok">✓ Gói bài học hợp lệ</p>`}
        ${v.warnings.length ? `<details style="margin-top:8px"><summary class="small">${v.warnings.length} lưu ý</summary><ul class="small">${v.warnings.map((e) => `<li>${u.esc(e)}</li>`).join("")}</ul></details>` : ""}
        ${
          sm
            ? `<h3 style="margin-top:12px">${u.esc(v.pack.title)}</h3><p class="small muted">${u.esc([v.pack.subject, v.pack.grade && "lớp " + v.pack.grade].filter(Boolean).join(" · "))} · ${sm.steps} hoạt động · ${sm.minutes} phút</p>
          <ol class="small">${v.pack.steps.map((s) => `<li><b>${u.esc(s.title)}</b> – ${u.esc((L360.types[s.type] || {}).label || s.type)} · ${s.minutes || 0}′</li>`).join("")}</ol>`
            : ""
        }
        ${!v.errors.length ? `<div class="row"><button class="btn primary" id="save">Lưu vào thư viện</button><button class="btn" id="open">Mở trong trình soạn</button></div>` : ""}`;
      if (u.$("#fix")) u.$("#fix").onclick = async () => (await u.copy(L360.Architect.fixPrompt(v.errors, v.warnings))) && u.toast("Đã sao chép – dán vào trợ lý AI.", "ok");
      const finish = (thenEdit) => {
        const t0 = Number(localStorage.getItem("l360:aiStart"));
        const mins = t0 ? Math.max(1, Math.round((Date.now() - t0) / 60000)) : "";
        const m = u.modal(`<h2>Lưu bài học</h2><p class="muted">Ghi lại thời gian soạn để làm minh chứng “giảm tải cho giáo viên”.</p>
          <label class="field">Thời gian soạn bài (phút)<span class="hint">Từ lúc gửi giáo án cho AI đến khi bài sẵn sàng, gồm cả thời gian thầy/cô kiểm tra lại.</span><input id="pm" type="number" min="1" value="${mins}"></label>
          <label class="field" style="margin-top:10px">Trợ lý AI đã dùng<select id="tool">${["Claude", "ChatGPT", "Gemini", "Khác"].map((t) => `<option>${t}</option>`).join("")}</select></label>
          <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn" data-close>Huỷ</button><button class="btn primary" id="ok">Lưu</button></div>`);
        u.$("#ok", m.el).onclick = () => {
          const p = v.pack;
          p.meta = Object.assign({}, p.meta, { madeWithAI: true, aiTool: u.$("#tool", m.el).value, prepMinutes: Number(u.$("#pm", m.el).value) || null, createdAt: Date.now(), createdBy: teacher.name });
          if (L360.Library.list().find((x) => x.id === p.id)) p.id = p.id + "-" + u.uid(3);
          cur = L360.Library.save(p);
          localStorage.removeItem("l360:aiStart");
          m.close();
          u.toast("Đã lưu vào thư viện.", "ok");
          dirty = false;
          go(thenEdit ? "edit" : "lib");
        };
      };
      if (u.$("#save")) u.$("#save").onclick = () => finish(false);
      if (u.$("#open")) u.$("#open").onclick = () => finish(true);
    };
  }

  /* ---------------- Trình soạn ---------------- */
  const getP = (o, path) => path.split(".").reduce((a, k) => (a == null ? undefined : a[k]), o);
  const setP = (o, path, v) => {
    const ks = path.split(".");
    let c = o;
    ks.slice(0, -1).forEach((k) => (c = c[k] = c[k] && typeof c[k] === "object" ? c[k] : {}));
    if (v === "" || v == null) delete c[ks[ks.length - 1]];
    else c[ks[ks.length - 1]] = v;
  };

  function fieldHtml(s, f, si) {
    const val = getP(s, f.key);
    const id = `f-${si}-${f.key.replace(/\./g, "_")}`;
    const lab = `${u.esc(f.label)}${f.hint ? `<span class="hint">${u.esc(f.hint)}</span>` : ""}`;
    const d = `data-si="${si}" data-k="${f.key}" data-kind="${f.kind}"`;
    switch (f.kind) {
      case "textarea":
        return `<label class="field">${lab}<textarea ${d} rows="3">${u.esc(val || "")}</textarea></label>`;
      case "number":
        return `<label class="field">${lab}<input type="number" ${d} value="${val == null ? "" : u.esc(val)}"></label>`;
      case "bool":
        return `<label class="row small"><input type="checkbox" ${d} ${val ? "checked" : ""}> ${u.esc(f.label)}</label>`;
      case "select":
        return `<label class="field">${lab}<select ${d}>${f.options.map(([v, l]) => `<option value="${v}" ${val === v ? "selected" : ""}>${u.esc(l)}</option>`).join("")}</select></label>`;
      case "list":
        return `<label class="field">${lab}<span class="hint">Mỗi dòng một mục</span><textarea ${d} rows="4">${u.esc((val || []).join("\n"))}</textarea></label>`;
      case "pair":
        return `<label class="field">${lab}<div class="row nowrap"><input type="number" ${d} data-i="0" value="${(val || [])[0] || ""}"><input type="number" ${d} data-i="1" value="${(val || [])[1] || ""}"></div></label>`;
      case "site":
        return `<label class="field">${lab}<select ${d}><option value="">–</option>${L360.heritage.SITES.map((x) => `<option value="${x.id}" ${val === x.id ? "selected" : ""}>${u.esc(x.name)}</option>`).join("")}</select></label>`;
      case "options": {
        const opts = val || [];
        return `<div class="field"><span>${lab}<span class="hint">Chọn nút tròn ở phương án đúng</span></span>${opts
          .map(
            (o, i) => `<div class="row nowrap" style="margin-bottom:6px"><input type="radio" name="${id}" data-si="${si}" data-ans="${i}" ${s.answer === i ? "checked" : ""} title="Đáp án đúng"><b>${u.letter(i)}</b>
            <input type="text" data-si="${si}" data-opt="${i}" value="${u.esc(o)}"><button class="btn sm ghost" data-optdel="${i}" data-si="${si}">✕</button></div>`
          )
          .join("")}<div class="row"><button class="btn sm" data-optadd data-si="${si}">+ Phương án</button>${
          s.type === "poll2" ? `<label class="row small"><input type="radio" name="${id}" data-si="${si}" data-ans="-1" ${s.answer == null ? "checked" : ""}> Không có đáp án (thăm dò ý kiến)</label>` : ""
        }</div></div>`;
      }
      case "questions":
        return `<div class="field"><span>${lab}</span>${(val || [])
          .map(
            (q, qi) => `<div class="card flat" style="padding:12px;margin-bottom:8px"><div class="row"><b>Câu ${qi + 1}</b><span class="spacer"></span><button class="btn sm ghost" data-qdel="${qi}" data-si="${si}">Xoá câu</button></div>
            <textarea rows="2" data-si="${si}" data-q="${qi}" data-qf="q">${u.esc(q.q || "")}</textarea>
            ${(q.options || [])
              .map(
                (o, oi) => `<div class="row nowrap" style="margin-top:6px"><input type="radio" name="${id}-${qi}" data-si="${si}" data-q="${qi}" data-qans="${oi}" ${q.answer === oi ? "checked" : ""}><b>${u.letter(oi)}</b>
                <input type="text" data-si="${si}" data-q="${qi}" data-qopt="${oi}" value="${u.esc(o)}"></div>`
              )
              .join("")}
            <input type="text" style="margin-top:6px" placeholder="Giải thích đáp án" data-si="${si}" data-q="${qi}" data-qf="explain" value="${u.esc(q.explain || "")}"></div>`
          )
          .join("")}<button class="btn sm" data-qadd data-si="${si}">+ Câu hỏi</button></div>`;
      case "pairs":
        return `<div class="field"><span>${lab}</span>${(val || [])
          .map(
            (p, pi) => `<div class="row nowrap" style="margin-bottom:6px"><input type="text" data-si="${si}" data-pair="${pi}" data-side="left" value="${u.esc(p.left)}"><span>↔</span>
            <input type="text" data-si="${si}" data-pair="${pi}" data-side="right" value="${u.esc(p.right)}"><button class="btn sm ghost" data-pdel="${pi}" data-si="${si}">✕</button></div>`
          )
          .join("")}<button class="btn sm" data-padd data-si="${si}">+ Cặp</button></div>`;
      case "fieldsList":
        return `<label class="field">${lab}<span class="hint">Mỗi dòng: Mã | Tên mục | Gợi ý</span><textarea data-si="${si}" data-k="${f.key}" data-kind="fieldsList" rows="5">${u.esc(
          (val || []).map((x) => [x.key, x.label, x.hint || ""].join(" | ")).join("\n")
        )}</textarea></label>`;
      case "json":
        return `<label class="field">${lab}<textarea class="mono" data-si="${si}" data-k="${f.key}" data-kind="json" rows="6" style="font-family:ui-monospace,Menlo,monospace;font-size:.8rem">${u.esc(
          JSON.stringify(val || [], null, 1)
        )}</textarea></label>`;
      default:
        return `<label class="field">${lab}<input type="text" ${d} value="${u.esc(val || "")}"></label>`;
    }
  }

  function editor(pane) {
    if (!cur) {
      const id = u.qs("id");
      const found = id && L360.Library.get(id);
      if (found && !found._sample) cur = Pack.normalize(found);
    }
    if (!cur) {
      pane.innerHTML = `<div class="card center"><h2>Chưa chọn bài học</h2><p class="muted">Chọn “Sửa” trong Thư viện, tạo bài bằng AI, hoặc tạo bài trống.</p><button class="btn primary" id="b1">Về thư viện</button></div>`;
      u.$("#b1").onclick = () => go("lib");
      return;
    }
    const p = cur;
    pane.innerHTML = `<div class="grid" style="grid-template-columns:minmax(0,1fr) 320px;gap:20px;align-items:start">
      <div class="col" style="min-width:0">
        <section class="card"><h2>Thông tin bài học</h2><div class="grid g2">
          <label class="field">Tên bài<input type="text" data-pk="title" value="${u.esc(p.title)}"></label>
          <label class="field">Bài trong SGK<input type="text" data-pk="lessonRef" value="${u.esc(p.lessonRef || "")}"></label>
          <label class="field">Môn<input type="text" data-pk="subject" value="${u.esc(p.subject)}"></label>
          <label class="field">Lớp<input type="text" data-pk="grade" value="${u.esc(p.grade)}"></label>
          <label class="field">Thời lượng (phút)<input type="number" data-pk="duration" value="${p.duration}"></label>
          <label class="field">Màu chủ đạo<input type="color" data-pk="theme.accent" value="${u.esc(p.theme.accent || "#B3372B")}" style="min-height:46px"></label></div>
          <label class="field" style="margin-top:10px">Mục tiêu (mỗi dòng một mục tiêu)<textarea data-pk="objectives" rows="3">${u.esc(p.objectives.join("\n"))}</textarea></label>
          <label class="field" style="margin-top:10px">Tên nhóm (mỗi dòng một nhóm, tối đa 6; để trống dùng “Nhóm 1, 2…”)<textarea data-pk="groups" rows="2">${u.esc((p.groups || []).map((g) => g.name).join("\n"))}</textarea></label></section>
        <div id="stepsEd" class="col"></div>
        <section class="card"><h3>Thêm hoạt động</h3><div class="grid g3">${L360.typeOrder
          .map((t) => {
            const T = L360.types[t];
            return `<button class="opt" data-add="${t}" style="flex-direction:column;align-items:flex-start"><b>${T.icon} ${u.esc(T.label)}</b><span class="small muted" style="font-weight:400">${u.esc(T.desc)}</span></button>`;
          })
          .join("")}</div></section></div>
      <aside class="card" style="position:sticky;top:80px"><h3>Kiểm tra</h3><div id="val"></div>
        <div class="col" style="margin-top:12px"><button class="btn primary" id="saveB">Lưu vào thư viện</button><button class="btn" id="teach">Lưu & dạy thử (Diễn tập)</button>
        <button class="btn" id="dl">Tải JSON</button><button class="btn" id="pr">In phiếu & kịch bản</button></div></aside></div>`;
    drawSteps();
    validate();
    u.$$("[data-pk]", pane).forEach((el) =>
      el.addEventListener("input", () => {
        const k = el.dataset.pk;
        let v = el.value;
        if (k === "objectives") v = v.split("\n").map((x) => x.trim()).filter(Boolean);
        else if (k === "groups") {
          const names = v.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 6);
          v = names.length ? names.map((n, i) => Object.assign({}, (p.groups || [])[i] || {}, { name: n })) : null;
        } else if (k === "duration") v = Number(v) || 45;
        setP(p, k, v);
        if (k === "groups" && v == null) p.groups = null;
        changed();
      })
    );
    u.$$("[data-add]", pane).forEach(
      (b) =>
        (b.onclick = () => {
          const s = L360.types[b.dataset.add].template();
          s.id = "s" + u.uid(4);
          p.steps.push(s);
          changed();
          drawSteps(p.steps.length - 1);
          setTimeout(() => u.$(`[data-step="${p.steps.length - 1}"]`).scrollIntoView({ behavior: "smooth", block: "center" }), 50);
        })
    );
    u.$("#saveB").onclick = save;
    u.$("#teach").onclick = () => save() && (location.href = `giaovien.html?pack=${encodeURIComponent(cur.id)}&che-do=dien-tap`);
    u.$("#dl").onclick = () => u.download(`${cur.id}.l360.json`, JSON.stringify(cur, null, 2), "application/json");
    u.$("#pr").onclick = () => go("print");
  }
  let openStep = 0;
  function drawSteps(focus) {
    if (focus != null) openStep = focus;
    const p = cur;
    const box = u.$("#stepsEd");
    box.innerHTML = p.steps
      .map((s, i) => {
        const T = L360.types[s.type] || { label: s.type, fields: [] };
        const open = i === openStep;
        return `<section class="card" data-step="${i}"><div class="row nowrap"><span class="pill">${i + 1}</span><b class="grow" style="cursor:pointer" data-toggle="${i}">${T.icon || ""} ${u.esc(s.title)} <span class="small muted">· ${u.esc(
          T.label
        )} · ${s.minutes || 0}′</span></b>
          <button class="btn sm ghost" data-mv="${i}" data-d="-1" ${i === 0 ? "disabled" : ""} title="Lên">▲</button><button class="btn sm ghost" data-mv="${i}" data-d="1" ${i === p.steps.length - 1 ? "disabled" : ""} title="Xuống">▼</button>
          <button class="btn sm ghost" data-dup="${i}" title="Nhân bản">⧉</button><button class="btn sm ghost" data-rm="${i}" title="Xoá">✕</button></div>
          ${
            open
              ? `<div class="col" style="margin-top:12px"><div class="grid g2"><label class="field">Tên hoạt động<input type="text" data-si="${i}" data-k="title" data-kind="text" value="${u.esc(s.title)}"></label>
            <label class="field">Số phút<input type="number" data-si="${i}" data-k="minutes" data-kind="number" value="${s.minutes || ""}"></label></div>
            <label class="field">Nhiệm vụ cho học sinh (1 câu)<input type="text" data-si="${i}" data-k="instructions" data-kind="text" value="${u.esc(s.instructions || "")}"></label>
            <label class="field">Lời dẫn gợi ý cho giáo viên<textarea data-si="${i}" data-k="script" data-kind="textarea" rows="2">${u.esc(s.script || "")}</textarea></label>
            ${(T.fields || []).map((f) => fieldHtml(s, f, i)).join("")}
            <details><summary class="small">JSON nâng cao của bước này</summary><textarea class="mono" data-raw="${i}" rows="8" style="font-family:ui-monospace,Menlo,monospace;font-size:.8rem">${u.esc(
                JSON.stringify(s, null, 1)
              )}</textarea><button class="btn sm" data-rawapply="${i}">Áp dụng JSON</button></details></div>`
              : ""
          }</section>`;
      })
      .join("");
    bindSteps(box);
  }
  function bindSteps(box) {
    const p = cur;
    const S0 = (el) => p.steps[Number(el.dataset.si)];
    u.$$("[data-toggle]", box).forEach((b) => (b.onclick = () => drawSteps(openStep === Number(b.dataset.toggle) ? -1 : Number(b.dataset.toggle))));
    u.$$("[data-mv]", box).forEach(
      (b) =>
        (b.onclick = () => {
          const i = Number(b.dataset.mv);
          const j = i + Number(b.dataset.d);
          [p.steps[i], p.steps[j]] = [p.steps[j], p.steps[i]];
          changed();
          drawSteps(j);
        })
    );
    u.$$("[data-dup]", box).forEach(
      (b) =>
        (b.onclick = () => {
          const i = Number(b.dataset.dup);
          const c = u.clone(p.steps[i]);
          c.id = "s" + u.uid(4);
          p.steps.splice(i + 1, 0, c);
          changed();
          drawSteps(i + 1);
        })
    );
    u.$$("[data-rm]", box).forEach(
      (b) =>
        (b.onclick = async () => {
          if (!(await u.confirm("Xoá hoạt động này?", "Xoá"))) return;
          p.steps.splice(Number(b.dataset.rm), 1);
          changed();
          drawSteps(-1);
        })
    );
    // Trường thường
    u.$$("[data-k]", box).forEach((el) =>
      el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input", () => {
        const s = S0(el);
        const k = el.dataset.k;
        const kind = el.dataset.kind;
        let v = el.value;
        if (kind === "number") v = v === "" ? null : Number(v);
        if (kind === "bool") v = el.checked;
        if (kind === "list") v = v.split("\n").map((x) => x.trim()).filter(Boolean);
        if (kind === "pair") {
          const arr = Array.isArray(s[k]) ? s[k].slice() : [0, 0];
          arr[Number(el.dataset.i)] = Number(v) || 0;
          v = arr;
        }
        if (kind === "fieldsList")
          v = v
            .split("\n")
            .map((ln) => ln.split("|").map((x) => x.trim()))
            .filter((a) => a[0] || a[1])
            .map((a, i) => ({ key: a[0] || u.letter(i), label: a[1] || "", hint: a[2] || "" }));
        if (kind === "json") {
          try {
            v = JSON.parse(v);
            el.style.borderColor = "";
          } catch (e) {
            el.style.borderColor = "var(--bad)";
            return;
          }
        }
        setP(s, k, v);
        changed();
      })
    );
    // Phương án + đáp án
    u.$$("[data-opt]", box).forEach((el) => el.addEventListener("input", () => ((S0(el).options[Number(el.dataset.opt)] = el.value), changed())));
    u.$$("[data-ans]", box).forEach((el) => el.addEventListener("change", () => ((S0(el).answer = Number(el.dataset.ans) < 0 ? null : Number(el.dataset.ans)), changed())));
    u.$$("[data-optadd]", box).forEach((b) => (b.onclick = () => ((S0(b).options = (S0(b).options || []).concat("")), changed(), drawSteps())));
    u.$$("[data-optdel]", box).forEach(
      (b) =>
        (b.onclick = () => {
          const s = S0(b);
          const i = Number(b.dataset.optdel);
          s.options.splice(i, 1);
          if (s.answer === i) s.answer = 0;
          else if (s.answer > i) s.answer--;
          changed();
          drawSteps();
        })
    );
    // Câu hỏi quiz
    u.$$("[data-qf]", box).forEach((el) => el.addEventListener("input", () => ((S0(el).questions[Number(el.dataset.q)][el.dataset.qf] = el.value), changed())));
    u.$$("[data-qopt]", box).forEach((el) => el.addEventListener("input", () => ((S0(el).questions[Number(el.dataset.q)].options[Number(el.dataset.qopt)] = el.value), changed())));
    u.$$("[data-qans]", box).forEach((el) => el.addEventListener("change", () => ((S0(el).questions[Number(el.dataset.q)].answer = Number(el.dataset.qans)), changed())));
    u.$$("[data-qadd]", box).forEach(
      (b) => (b.onclick = () => (S0(b).questions.push({ q: "", options: ["", "", "", ""], answer: 0, explain: "" }), changed(), drawSteps()))
    );
    u.$$("[data-qdel]", box).forEach((b) => (b.onclick = () => (S0(b).questions.splice(Number(b.dataset.qdel), 1), changed(), drawSteps())));
    // Cặp ghép
    u.$$("[data-pair]", box).forEach((el) => el.addEventListener("input", () => ((S0(el).pairs[Number(el.dataset.pair)][el.dataset.side] = el.value), changed())));
    u.$$("[data-padd]", box).forEach((b) => (b.onclick = () => ((S0(b).pairs = (S0(b).pairs || []).concat({ left: "", right: "" })), changed(), drawSteps())));
    u.$$("[data-pdel]", box).forEach((b) => (b.onclick = () => (S0(b).pairs.splice(Number(b.dataset.pdel), 1), changed(), drawSteps())));
    // JSON thô
    u.$$("[data-rawapply]", box).forEach(
      (b) =>
        (b.onclick = () => {
          const i = Number(b.dataset.rawapply);
          try {
            p.steps[i] = JSON.parse(u.$(`[data-raw="${i}"]`, box).value);
            changed();
            drawSteps(i);
          } catch (e) {
            u.toast("JSON chưa hợp lệ.", "bad");
          }
        })
    );
  }
  const validate = u.debounce(() => {
    const el = u.$("#val");
    if (!el || !cur) return;
    const v = Pack.validate(cur);
    const sm = Pack.summary(Pack.normalize(cur));
    el.innerHTML = `<p class="small">${sm.steps} hoạt động · <b>${sm.minutes}</b>/${cur.duration} phút</p>${
      v.errors.length ? `<p class="pill bad">${v.errors.length} lỗi</p><ul class="small" style="color:var(--bad)">${v.errors.map((e) => `<li>${u.esc(e)}</li>`).join("")}</ul>` : `<p class="pill ok">✓ Chạy được</p>`
    }${v.warnings.length ? `<ul class="small" style="color:var(--warn)">${v.warnings.map((e) => `<li>${u.esc(e)}</li>`).join("")}</ul>` : ""}${dirty ? `<p class="small muted">Có thay đổi chưa lưu.</p>` : ""}`;
  }, 250);
  function changed() {
    dirty = true;
    validate();
  }
  function save() {
    const v = Pack.validate(cur);
    if (v.errors.length) {
      u.toast("Còn lỗi – xem khung Kiểm tra.", "bad");
      return false;
    }
    cur = L360.Library.save(cur);
    dirty = false;
    validate();
    u.toast("Đã lưu.", "ok");
    return true;
  }

  /* ---------------- In phiếu học tập & kịch bản ---------------- */
  const lines = (n) => `<div style="border-bottom:1px dotted #999;height:26px"></div>`.repeat(n);
  function sheetFor(s, i, p) {
    const head = `<h3 style="margin:14px 0 6px">Hoạt động ${i + 1}. ${u.esc(s.title)}</h3>${s.instructions ? `<p class="small"><i>${u.esc(s.instructions)}</i></p>` : ""}`;
    const opts = (o) => `<ol type="A" style="margin:4px 0 8px 18px">${o.map((x) => `<li>${u.esc(x)}</li>`).join("")}</ol>`;
    switch (s.type) {
      case "slide":
        return "";
      case "quiz":
        return head + s.questions.map((q, k) => `<p><b>Câu ${k + 1}.</b> ${u.esc(q.q)}</p>${opts(q.options)}`).join("") + `<p>Đáp án của em: ${s.questions.map((_, k) => `${k + 1}. ___`).join("  ")}</p>`;
      case "poll2":
        return head + `<p>${u.esc(s.question)}</p>${opts(s.options)}<p>Vòng 1: _____ &nbsp;&nbsp; Vòng 2: _____ &nbsp;&nbsp; Lí do đổi/giữ: ____________________</p>`;
      case "cards":
        return head + `<p>${u.esc(s.question)} (chọn tối đa ${s.maxPick})</p><p>${s.cards.map((c) => `☐ ${u.esc(c)}`).join(" &nbsp; ")}</p>${s.textPrompt ? `<p>${u.esc(s.textPrompt)}:</p>${lines(2)}` : ""}`;
      case "text":
        return head + `<p>${u.esc(s.question)}</p>${lines(3)}${s.selfAssess ? `<p>Tự đánh giá: ☐ 1 &nbsp; ☐ 2 &nbsp; ☐ 3</p>` : ""}`;
      case "match": {
        const t = L360.types.match.publicPayload(s);
        return (
          head +
          `<p>${u.esc(s.question)}</p><table class="t"><tr><td style="width:50%">${t.lefts.map((l, k) => `${k + 1}. ${u.esc(l)}`).join("<br>")}</td><td>${t.rights
            .map((r, k) => `${u.letter(k)}. ${u.esc(r)}`)
            .join("<br>")}</td></tr></table><p>Ghép: ${t.lefts.map((_, k) => `${k + 1} → ___`).join("  ")}</p>${s.whyPrompt ? `<p>${u.esc(s.whyPrompt)}</p>${lines(2)}` : ""}`
        );
      }
      case "order": {
        const t = L360.types.order.publicPayload(s);
        return head + `<p>${u.esc(s.question)}</p><p>${t.items.map((x, k) => `${u.letter(k)}. ${u.esc(x)}`).join("<br>")}</p><p>Thứ tự đúng: ${t.items.map(() => "___").join(" → ")}</p>`;
      }
      case "groupwork":
        return head + `<p>${u.esc(s.task || "")}</p><table class="t">${s.fields.map((f) => `<tr><td style="width:32%"><b>${f.key}. ${u.esc(f.label)}</b></td><td style="height:58px"></td></tr>`).join("")}</table>`;
      case "expo": {
        const gs = Pack.groups(p, (p.groups || []).length || 4);
        return head + `<table class="t"><tr><th>Nhóm</th>${s.criteria.map((c) => `<th>${u.esc(c)} (1–5)</th>`).join("")}<th>Câu hỏi</th></tr>${gs
          .map((g) => `<tr><td>${u.esc(g.name)}</td>${s.criteria.map(() => "<td></td>").join("")}<td style="width:30%"></td></tr>`)
          .join("")}</table>`;
      }
      case "auction":
        return head + `<p>${u.esc(s.question)}</p><p>${s.items.map((x, k) => `${k + 1}. ${u.esc(x.title)}`).join(" · ")}</p><p>Nhóm chọn: ______ Giá: ____ Lí do: ______________________</p>`;
      case "explore": {
        const t = L360.types.explore.publicPayload(s);
        return (
          head +
          `<div class="row nowrap" style="align-items:flex-start"><div style="width:110px">${u.qr(t.url, 3)}</div><div><p><b>${u.esc(t.siteName)}</b></p><p>${u.esc(t.mission)}</p>${
            t.answerType === "choice" ? opts(t.options) : lines(3)
          }</div></div>`
        );
      }
      default:
        return head;
    }
  }
  function answersFor(s) {
    switch (s.type) {
      case "quiz":
        return s.questions.map((q, k) => `${k + 1}${u.letter(q.answer)}`).join(" · ");
      case "poll2":
        return s.answer == null ? "Thăm dò ý kiến" : u.letter(s.answer) + (s.explain ? ` – ${s.explain}` : "");
      case "match": {
        const a = L360.types.match.answerPayload(s);
        return a.map.map((r, k) => `${k + 1}→${u.letter(r)}`).join(" · ");
      }
      case "order": {
        const a = L360.types.order.answerPayload(s);
        return a.seq.map((x) => u.letter(x)).join(" → ");
      }
      case "explore":
        return s.answerType === "choice" ? u.letter(s.answer) + (s.explain ? ` – ${s.explain}` : "") : s.explain || "";
      case "cards":
        return s.conclusion || "";
      case "text":
        return s.sample || "";
      default:
        return "";
    }
  }
  function printPane(pane) {
    const all = L360.Library.all();
    const p = cur || all[0];
    if (!p) return (pane.innerHTML = `<p class="muted">Chưa có bài học.</p>`);
    pane.innerHTML = `<div class="row no-print" style="margin-bottom:14px"><select id="pp" style="max-width:420px">${all
      .map((x) => `<option value="${u.esc(x.id)}" ${x.id === p.id ? "selected" : ""}>${u.esc(x.title)}</option>`)
      .join("")}</select>
      <label class="row small"><input type="checkbox" id="c1" checked> Phiếu học tập</label><label class="row small"><input type="checkbox" id="c2" checked> Kịch bản giáo viên + đáp án</label>
      <label class="row small"><input type="checkbox" id="c3"> Thẻ A/B/C/D dự phòng mất mạng</label><button class="btn primary" onclick="print()">In / Lưu PDF</button></div><div id="sheet"></div>`;
    const draw = () => {
      const pk = Pack.normalize(all.find((x) => x.id === u.$("#pp").value) || p);
      cur = pk;
      const head = `<div class="row"><img src="assets/img/logo-hsh-muc.png" style="height:34px"><span class="spacer"></span><span class="small">${u.esc(L360.cfg.school)}</span></div>`;
      let h = "";
      if (u.$("#c1").checked)
        h += `<section class="card page-break">${head}<h2 style="margin-top:10px">PHIẾU HỌC TẬP – ${u.esc(pk.title)}</h2><p>Họ tên: ____________________ Lớp: ______ Mã HS: _____ Nhóm: ______</p>${pk.steps
          .map((s, i) => sheetFor(s, i, pk))
          .join("")}</section>`;
      if (u.$("#c2").checked)
        h += `<section class="card page-break">${head}<h2 style="margin-top:10px">KỊCH BẢN GIÁO VIÊN – ${u.esc(pk.title)}</h2><p class="small">${u.esc(
          [pk.subject, pk.grade && "lớp " + pk.grade, pk.lessonRef].filter(Boolean).join(" · ")
        )} · ${pk.duration} phút</p>${pk.objectives.length ? `<p><b>Mục tiêu:</b></p><ul>${pk.objectives.map((o) => `<li>${u.esc(o)}</li>`).join("")}</ul>` : ""}
          <table class="t"><tr><th>#</th><th>Hoạt động</th><th class="num">Phút</th><th>Lời dẫn và nhiệm vụ</th><th>Đáp án / kết luận</th></tr>${pk.steps
            .map(
              (s, i) => `<tr><td>${i + 1}</td><td><b>${u.esc(s.title)}</b><br><span class="small muted">${u.esc((L360.types[s.type] || {}).label || s.type)}</span></td><td class="num">${s.minutes || ""}</td>
            <td class="small">${u.esc(s.script || "")}${s.instructions ? `<br><i>HS: ${u.esc(s.instructions)}</i>` : ""}</td><td class="small">${u.esc(answersFor(s))}</td></tr>`
            )
            .join("")}</table></section>`;
      if (u.$("#c3").checked)
        h += `<section class="page-break"><div class="grid g2">${["A", "B", "C", "D"]
          .map((k) => `<div class="card center" style="height:240px;display:grid;place-items:center;font-size:150px;font-weight:800">${k}</div>`)
          .join("")}</div></section>`;
      u.$("#sheet").innerHTML = h;
    };
    u.$$("#pp,#c1,#c2,#c3").forEach((el) => (el.onchange = draw));
    draw();
  }

  window.addEventListener("beforeunload", (e) => {
    if (dirty && tab === "edit") {
      e.preventDefault();
      e.returnValue = "";
    }
  });

  (async function init() {
    await S.ready;
    teacher = await L360.Auth.requireTeacher(app, { title: "Studio – đăng nhập giáo viên" });
    const id = u.qs("id");
    if (id) {
      const f = L360.Library.get(id);
      if (f) cur = Pack.normalize(f);
    }
    frame();
  })();
})();
