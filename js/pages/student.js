/* Trang học sinh (laptop / iPad): vào lớp bằng mã phòng + mã học sinh – không cần tài khoản;
   làm nhiệm vụ theo bước giáo viên điều khiển; tự có "Vở ghi" gom các nội dung cần ghi bài. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ui = L360.ui;
  const S = L360.store;
  const Room = L360.Room;
  const B = L360.blocks;
  const app = u.$("#app");
  document.body.classList.add("lesson");

  let R = (u.qs("phong") || u.qs("room") || "").toUpperCase().trim();
  let code = null;
  let meta = null;
  let pubMeta = null;
  let state = null;
  let roster = {};
  const live = {};
  const watches = {};
  let mine = {};
  let pts = {};
  let nb = []; // vở ghi: [{k, t, x}]
  let lastKey = "";
  let connected = true;

  const loadLocal = () => {
    try {
      mine = JSON.parse(localStorage.getItem("l360:mine:" + R) || "{}");
      pts = JSON.parse(localStorage.getItem("l360:pts:" + R) || "{}");
      nb = JSON.parse(localStorage.getItem("l360:nb:" + R) || "[]");
    } catch (e) {}
  };
  const saveLocal = () => {
    localStorage.setItem("l360:mine:" + R, JSON.stringify(mine));
    localStorage.setItem("l360:pts:" + R, JSON.stringify(pts));
    localStorage.setItem("l360:nb:" + R, JSON.stringify(nb));
  };
  // Nút mở SGK đúng trang của bài (không tính là rời bài khi đang ở chế độ tự học).
  function sgkBtn() {
    const b = (pubMeta && pubMeta.bai) || {};
    const C = L360.Curr;
    const l = b.key && C ? C.lesson(b.key) : null;
    const url = l ? C.lessonUrl(l) : "";
    return url ? `<a class="pill sgk-pill" href="${u.esc(url)}" target="_blank" rel="noopener" data-allow-leave title="Mở SGK trang ${u.esc(l.trang || "")}">${L360.icon("sgk")} SGK${l.trang ? " tr." + l.trang : ""}</a>` : "";
  }
  // Góp ý nhanh cuối tiết (2 chạm, không bắt buộc) – minh chứng mức hứng thú và mức hiểu bài của học sinh.
  const fbSel = {};
  function fbCard() {
    if (!code) return "";
    if (fbSel.vui && fbSel.hieu) return `<div class="card fb-card" id="fbCard" style="margin-top:14px"><p class="center" style="margin:0;font-weight:700">Cảm ơn em đã góp ý! 💙</p></div>`;
    const q = (k, title, opts) =>
      `<p class="fb-q">${title}</p><div class="fb-opts">${opts.map(([v, e, t]) => `<button class="fb-o ${fbSel[k] === v ? "on" : ""}" data-fbq="${k}" data-v="${v}"><span>${e}</span>${t}</button>`).join("")}</div>`;
    return `<div class="card fb-card" id="fbCard" style="margin-top:14px"><h2 style="margin:0 0 4px">Góp ý nhanh</h2><p class="small muted" style="margin:0 0 6px">Không bắt buộc · chỉ cần 2 chạm</p>${q("vui", "Em thấy tiết học hôm nay thế nào?", [
      [4, "😍", "Rất thích"],
      [3, "🙂", "Thích"],
      [2, "😐", "Bình thường"],
      [1, "🙁", "Chưa thích"]
    ])}${q("hieu", "Em hiểu bài ở mức nào?", [
      [3, "✅", "Hiểu hết"],
      [2, "👍", "Hiểu phần lớn"],
      [1, "🤔", "Còn chưa hiểu"]
    ])}</div>`;
  }
  function addNote(k, t, x) {
    if (!x || nb.some((n) => n.k === k)) return;
    nb.push({ k, t, x });
    saveLocal();
    nbButton(true);
  }

  function watch(name, path, fn) {
    if (watches[name] && watches[name].path === path) return;
    unwatch(name);
    watches[name] = { path, off: S.on(path, fn) };
  }
  function unwatch(name) {
    if (watches[name]) {
      watches[name].off();
      delete watches[name];
    }
  }

  /* ---------- Vào lớp ---------- */
  function joinView(msg) {
    const groups = (meta && meta.groups) || [];
    const codes = meta ? Room.codes(meta.classSize) : [];
    const saved = (R && Room.Student.saved(R)) || {};
    app.innerHTML = `<div class="ds-pat"></div><div class="wrap" style="max-width:620px;position:relative;z-index:1">
      <div class="row" style="justify-content:center;margin:8px 0 18px;gap:14px"><img src="assets/img/logo-l360.svg" alt="Lesson 360°" style="height:46px"><img src="assets/img/logo-hsh-muc.png" alt="Học Sử Hữu Hiệu" style="height:40px"></div>
      <div class="card"><h1 style="font-size:1.6rem">Vào lớp học</h1>
      ${meta ? `<p class="muted">${u.esc(meta.title)}${meta.label ? ` · ${u.esc(meta.label)}` : ""}${meta.className ? ` · Lớp ${u.esc(meta.className)}` : ""}</p>` : `<p class="muted">Nhập mã phòng trên màn chiếu.</p>`}
      ${msg ? `<p class="pill bad" style="white-space:normal">${u.esc(msg)}</p>` : ""}
      <label class="field">Mã phòng<input id="room" type="text" autocomplete="off" autocapitalize="characters" value="${u.esc(R)}" placeholder="VD: K7Q2M" style="text-transform:uppercase;font-weight:700;letter-spacing:.08em"></label>
      ${
        meta
          ? `<p style="margin:14px 0 6px;font-weight:650">Mã học sinh của em <span class="muted small">(theo số thứ tự giáo viên đã quy ước)</span></p>
        <div class="seat-grid" id="codes">${codes
          .map((c) => {
            const r = roster[c];
            const taken = r && r.uid && r.uid !== (S.auth.user && S.auth.user.uid);
            return `<button class="seat ${taken ? "" : "in"} ${saved.code === c ? "done" : ""}" data-code="${c}" ${taken ? "disabled title='Đã có bạn dùng'" : ""}>${c}</button>`;
          })
          .join("")}</div>
        <label class="field" style="margin-top:14px">Tên gọi <span class="hint">không bắt buộc, tối đa 20 kí tự</span><input id="nm" type="text" maxlength="20" value="${u.esc(saved.name || "")}"></label>
        ${groups.length ? `<p style="margin:14px 0 6px;font-weight:650">Nhóm</p><div class="chips" id="grp">${groups.map((g) => `<button class="chip ${saved.group === g.id ? "sel" : ""}" data-g="${g.id}" style="border-color:${g.color}">${u.esc(g.name)}</button>`).join("")}</div>` : ""}
        <button class="btn primary lg block" style="margin-top:18px" id="go">Vào lớp</button>`
          : `<button class="btn primary lg block" style="margin-top:14px" id="find">Tiếp tục</button>`
      }</div>
      <p class="center small muted" style="margin-top:14px">${u.esc(L360.cfg.school)} · Lesson 360° Studio · Không cần tài khoản – em chỉ dùng mã số.</p></div>`;
    let pick = saved.code || null;
    let grp = saved.group || null;
    const roomInput = u.$("#room");
    roomInput.addEventListener("change", () => openRoom(roomInput.value.toUpperCase().trim()));
    if (u.$("#find")) u.$("#find").onclick = () => openRoom(roomInput.value.toUpperCase().trim());
    u.$$("[data-code]").forEach(
      (b) =>
        (b.onclick = () => {
          pick = b.dataset.code;
          u.$$("[data-code]").forEach((x) => x.classList.toggle("done", x === b));
        })
    );
    u.$$("[data-g]").forEach(
      (b) =>
        (b.onclick = () => {
          grp = b.dataset.g;
          u.$$("[data-g]").forEach((x) => x.classList.toggle("sel", x === b));
        })
    );
    if (u.$("#go"))
      u.$("#go").onclick = async () => {
        if (!pick) return u.toast("Chọn mã học sinh của em.", "bad");
        if (groups.length && !grp) return u.toast("Chọn nhóm của em.", "bad");
        u.$("#go").disabled = true;
        try {
          await Room.Student.join(R, pick, u.$("#nm").value.trim(), grp);
          code = pick;
          startClass();
        } catch (e) {
          u.$("#go").disabled = false;
          u.toast(e.message || "Không vào được lớp.", "bad", 4500);
        }
      };
  }

  async function openRoom(r) {
    if (!r) return;
    R = r;
    history.replaceState(null, "", `?phong=${encodeURIComponent(R)}${/che-do=dien-tap/.test(location.search) ? "&che-do=dien-tap" : ""}`);
    loadLocal();
    await S.auth.signInStudent();
    meta = await S.get(`rooms/${R}/meta`);
    if (!meta) return joinView(`Không tìm thấy phòng ${R}.`);
    watch("roster", `rooms/${R}/roster`, (v) => {
      roster = v || {};
      if (!code) refreshCodes();
      else render();
    });
    const saved = Room.Student.saved(R);
    const uid = S.auth.user && S.auth.user.uid;
    const cur = saved && (await S.get(`rooms/${R}/roster/${saved.code}`));
    if (saved && cur && cur.uid === uid && meta.status !== "ended") {
      code = saved.code;
      return startClass();
    }
    joinView();
  }
  function refreshCodes() {
    if (!u.$("#codes")) return joinView();
    const uid = S.auth.user && S.auth.user.uid;
    u.$$("[data-code]").forEach((b) => {
      const r = roster[b.dataset.code];
      const taken = r && r.uid && r.uid !== uid;
      b.disabled = !!taken;
      b.classList.toggle("in", !taken);
    });
  }

  /* ---------- Vở ghi ---------- */
  function nbButton(bump) {
    let b = u.$("#nbb");
    if (!b) {
      b = document.createElement("button");
      b.id = "nbb";
      b.className = "nb-btn";
      b.onclick = openNotebook;
      document.body.appendChild(b);
    }
    b.innerHTML = `${L360.icon("ghiBai")} Vở ghi <b>${nb.length}</b>`;
    if (bump) {
      b.animate([{ transform: "scale(1)" }, { transform: "scale(1.15)" }, { transform: "scale(1)" }], { duration: 450 });
      u.toast("Đã thêm vào Vở ghi ✎", "ok", 1600);
    }
  }
  function openNotebook() {
    const d = document.createElement("div");
    d.className = "modal-bg";
    d.innerHTML = `<div class="nb-drawer"><div class="nb-head">${L360.icon("ghiBai")}<b class="grow">Vở ghi – ${u.esc((pubMeta && pubMeta.title) || "")}</b><button class="btn sm" id="nbp">${L360.icon("print")} In</button><button class="btn sm" id="nbx">Đóng</button></div>
      <div class="nb-body">${nb.length ? nb.map((n) => `<div class="nb-item"><div class="t">${u.esc(n.t)}</div><div class="md">${ui.md(n.x)}</div></div>`).join("") : `<p class="muted">Chưa có nội dung. Khi thấy biểu tượng ✎ “Ghi vào vở”, nội dung sẽ tự vào đây.</p>`}</div></div>`;
    document.body.appendChild(d);
    const close = () => d.remove();
    d.onclick = (e) => e.target === d && close();
    u.$("#nbx", d).onclick = close;
    u.$("#nbp", d).onclick = () => {
      const w = window.open("", "_blank");
      w.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Vở ghi</title><link rel="stylesheet" href="${location.href.replace(/hocsinh\.html.*$/, "")}assets/css/l360.css"></head><body style="background:#fff"><main class="wrap" style="max-width:760px"><h1>Vở ghi</h1><p class="muted">${u.esc(
        [(pubMeta || {}).subject, (pubMeta || {}).label, (pubMeta || {}).title].filter(Boolean).join(" · ")
      )} · ${u.esc(code || "")}</p>${nb.map((n) => `<h3>${u.esc(n.t)}</h3><div class="md">${ui.md(n.x)}</div>`).join("")}<p class="no-print"><button class="btn primary" onclick="print()">In / Lưu PDF</button></p></main></body></html>`);
      w.document.close();
    };
  }

  /* ---------- Trong giờ học ---------- */
  function startClass() {
    S.presence(`rooms/${R}/presence/${code}`, { on: true });
    // Chế độ tự học (giáo viên có thể tắt khi mở phòng).
    if (L360.Lock && !(meta && meta.lock === false)) L360.Lock.enable({ report: (v) => S.set(`rooms/${R}/focus/${code}`, v).catch(() => {}) });
    if (S.onConnection) S.onConnection((c) => ((connected = c), setConn()));
    watch("pubmeta", `rooms/${R}/pub/meta`, (v) => {
      pubMeta = v;
      if (v) L360.Design.apply(v);
      render();
    });
    watch("meta", `rooms/${R}/meta`, (v) => ((meta = v || meta), render()));
    watch("awards", `rooms/${R}/pub/awards`, (v) => ((live.awards = v || {}), render()));
    watch("homework", `rooms/${R}/pub/homework`, (v) => ((live.homework = v || null), lastRender === "end" && ((lastRender = ""), render())));
    watch("notes", `rooms/${R}/pub/notes`, (v) => {
      u.entries(v).forEach(([k, n]) => n && addNote("n:" + k, n.t || "Ghi nhớ", n.x || ""));
    });
    watch("state", `rooms/${R}/state`, (v) => {
      state = v || { step: -1 };
      ui.timerState = state;
      rewire();
      render();
    });
    app.innerHTML = `<div class="ds-pat"></div><div class="topbar" style="gap:10px"><img src="assets/img/logo-l360.svg" alt="" style="height:32px"><div class="grow" style="min-width:0"><div style="font-weight:800" class="ellipsis" id="ttl"></div>
      <div class="small muted" id="who"></div></div><span id="conn"></span></div><main class="wrap" style="max-width:1040px;padding-top:16px;position:relative;z-index:1"><div id="stepHead"></div><div id="main"></div></main>`;
    nbButton(false);
  }
  function setConn() {
    const el = u.$("#conn");
    if (el) el.innerHTML = connected ? `<span class="pill ok"><span class="dot"></span>Đã kết nối</span>` : `<span class="pill bad"><span class="dot"></span>Mất mạng – bài sẽ tự gửi lại</span>`;
  }
  const curStep = () => (pubMeta && state && state.step >= 0 ? pubMeta.steps[state.step] : null);
  const myGroup = () => {
    const g = roster[code] && roster[code].group;
    return ((meta && meta.groups) || []).find((x) => x.id === g) || null;
  };
  function rewire() {
    const step = curStep();
    if (!step) {
      ["item", "answer", "sub", "feat", "gsub", "gwork", "expo"].forEach(unwatch);
      return;
    }
    const key = L360.subKey(step, state);
    const g = myGroup();
    watch("item", `rooms/${R}/pub/items/${key}`, (v) => ((live.item = v), render()));
    watch("answer", `rooms/${R}/pub/answers/${key}`, (v) => {
      live.answer = v;
      if (v && mine[key] != null && L360.pointsFromAnswer) {
        pts[key] = L360.pointsFromAnswer(step.type, v, mine[key]);
        saveLocal();
      }
      render();
    });
    watch("sub", `rooms/${R}/subs/${key}/${code}`, (v) => {
      live.sub = v;
      if (v) {
        mine[key] = v.v;
        saveLocal();
      }
      render();
    });
    watch("feat", `rooms/${R}/pub/featured/${key}/${code}`, (v) => ((live.featured = v), render()));
    if (step.groupMode && g) {
      watch("gsub", `rooms/${R}/gsubs/${key}/${g.id}`, (v) => ((live.gsub = v), render()));
      watch("gwork", `rooms/${R}/gwork/${step.id}/${g.id}`, (v) => ((live.gwork = v || {}), render()));
    } else {
      unwatch("gsub");
      unwatch("gwork");
      live.gsub = null;
      live.gwork = null;
    }
    if (step.type === "expo") watch("expo", `rooms/${R}/pub/expo/${step.id}`, (v) => ((live.expo = v), render()));
    else unwatch("expo");
    if (key !== lastKey) {
      live.item = live.answer = live.sub = live.featured = null;
      lastKey = key;
    }
  }
  const myScore = () => Object.values(pts).reduce((a, b) => a + b, 0);
  const nameOf = (c) => (roster[c] && roster[c].name ? `${roster[c].name} (${c})` : c);

  let lastRender = "";
  const render = u.throttleRaf(() => {
    if (!code || !u.$("#main")) return;
    const g = myGroup();
    u.$("#ttl").textContent = [(pubMeta && pubMeta.label) || "", (meta && meta.title) || ""].filter(Boolean).join(" · ");
    u.$("#who").innerHTML = `${code}${roster[code] && roster[code].name ? " · " + u.esc(roster[code].name) : ""} ${g ? ui.gbadge(g) : ""}`;
    setConn();
    const main = u.$("#main");
    const head = u.$("#stepHead");
    if (roster[code] && roster[code].uid && S.auth.user && roster[code].uid !== S.auth.user.uid) {
      main.innerHTML = ui.wait("Mã của em đang dùng trên thiết bị khác", "Hãy báo giáo viên.");
      return;
    }
    if (roster[code] && !roster[code].uid) {
      code = null;
      return joinView("Giáo viên đã giải phóng mã của em. Hãy vào lại.");
    }
    if (!state || !pubMeta || state.step < 0) {
      head.innerHTML = "";
      main.innerHTML = ui.wait("Chờ giáo viên bắt đầu", "Em đã vào lớp. Hãy nhìn lên màn chiếu.");
      lastRender = "lobby";
      return;
    }
    if (state.step >= pubMeta.steps.length) {
      head.innerHTML = "";
      // Hết tiết: tắt chế độ tự học (không còn tính rời bài).
      if (L360.Lock && L360.Lock.active) L360.Lock.disable();
      const hw = live.homework;
      main.innerHTML = `<div class="card center" style="padding:30px"><h1>Cảm ơn em!</h1><p class="muted">Tiết học đã kết thúc.</p>${Object.keys(pts).length ? `<p style="font-size:1.3rem">Điểm của em: <b>${myScore()}</b></p>` : ""}${
        nb.length ? `<button class="btn primary" id="onb">${L360.icon("ghiBai")} Xem lại Vở ghi (${nb.length})</button>` : ""
      }</div>${
        hw && (hw.tasks || []).length
          ? `<div class="card" style="margin-top:14px;border-left:6px solid #E8930C"><h2 style="margin:0 0 6px">Nhiệm vụ về nhà</h2><ol style="margin:0;padding-left:22px;line-height:1.5">${hw.tasks.map((t) => `<li>${u.esc(t)}</li>`).join("")}</ol>${
              hw.prepare ? `<p style="margin:10px 0 0"><b style="color:#1E8E5A">Chuẩn bị cho tiết sau:</b> ${u.esc(hw.prepare)}</p>` : ""
            }</div>`
          : ""
      }${fbCard()}`;
      if (u.$("#onb")) u.$("#onb").onclick = openNotebook;
      u.$$("[data-fbq]").forEach(
        (b) =>
          (b.onclick = async () => {
            fbSel[b.dataset.fbq] = Number(b.dataset.v);
            u.$$(`[data-fbq="${b.dataset.fbq}"]`).forEach((x) => x.classList.toggle("on", x === b));
            try {
              await S.set(`rooms/${R}/fb/${code}`, Object.assign({}, fbSel, { t: S.TS }));
            } catch (e) {}
            if (fbSel.vui && fbSel.hieu) {
              const c = u.$("#fbCard");
              if (c) c.innerHTML = `<p class="center" style="margin:0;font-weight:700">Cảm ơn em đã góp ý! 💙</p>`;
            }
          })
      );
      lastRender = "end";
      return;
    }
    const step = curStep();
    const T = L360.types[step.type] || {};
    const key = L360.subKey(step, state);
    // Bài giảng: nội dung ghi vở của trang đang chiếu tự vào Vở ghi.
    if (step.type === "slide" && live.item && live.item.pages) {
      const pg = live.item.pages[state.page || 0];
      B.notes(pg)
        .filter((n) => n.kind === "note")
        .forEach((n, i) =>
          n.heading
            ? addNote(`${step.id}#${state.page || 0}#${i}`, n.heading === "chude" ? "Chủ đề" : n.heading === "tenbai" ? "Tên bài" : "Đề mục", n.title)
            : addNote(`${step.id}#${state.page || 0}#${i}`, `${step.title}${pg.title ? " – " + pg.title : ""}`, n.text)
        );
    }
    const ctx = {
      code,
      me: roster[code],
      group: g,
      groups: (meta && meta.groups) || [],
      step,
      state,
      key,
      item: live.item,
      answer: live.answer,
      sub: live.sub || (mine[key] != null ? { v: mine[key], pending: true } : null),
      mine,
      featured: live.featured,
      awards: live.awards,
      gsub: live.gsub,
      gwork: live.gwork,
      expo: live.expo,
      myScore: myScore(),
      nameOf,
      submit: (v) => {
        mine[key] = v;
        saveLocal();
        lastRender = "";
        render();
        return Room.Student.submit(R, key, code, v).catch(() => {
          delete mine[key];
          saveLocal();
          lastRender = "";
          render();
          u.toast("Chưa gửi được – có thể đã hết giờ nộp bài.", "bad");
        });
      },
      gsubmit: (v) => (g ? Room.Student.gsubmit(R, key, g.id, code, v).catch(() => u.toast("Chưa gửi được.", "bad")) : null),
      gworkSet: (p, v) => S.set(`rooms/${R}/gwork/${step.id}/${g.id}/${p}`, v).catch(() => u.toast("Nhiệm vụ đã khoá.", "bad")),
      gworkPush: (p, v) => S.push(`rooms/${R}/gwork/${step.id}/${g.id}/${p}`, v).catch(() => u.toast("Nhiệm vụ đã khoá.", "bad"))
    };
    head.innerHTML = `<div class="row" style="margin-bottom:12px"><span class="ph ph-${step.phase}">${u.esc(L360.phase(step.phase).name)}</span><span class="pill">${state.step + 1}/${pubMeta.steps.length}</span><b class="grow ellipsis">${u.esc(step.title)}</b>${
      step.ghiBai ? `<span class="ghi-badge">${L360.icon("ghiBai")} Ghi vở</span>` : ""
    }<span class="pill ${state.phase === "open" ? "ok" : ""}">${ui.phaseLabel(state, step)}</span>${sgkBtn()}</div>`;
    const rk = JSON.stringify([state.step, state.phase, state.q, state.round, state.page, !!ctx.sub, !!live.answer, !!live.item, !!live.featured, g && g.id, step.type === "expo" ? !!live.expo : 0, live.item && live.item.text]);
    if (rk === lastRender && T.student && T.student.update) return ctx.item ? T.student.update(main, ctx) : undefined;
    if (rk === lastRender) return;
    lastRender = rk;
    main._editing = false;
    if (step.groupMode && !g) return (main.innerHTML = ui.wait("Em chưa có nhóm", "Hãy báo giáo viên xếp nhóm cho em."));
    if (T.student && T.student.render) {
      if (!ctx.item && !T.releaseOnEnter && step.type !== "expo") return (main.innerHTML = ui.wait("Quan sát và lắng nghe", step.instructions || "Giáo viên sắp giao nhiệm vụ."));
      return T.student.render(main, ctx);
    }
    if (!ctx.item || state.phase === "observe") return (main.innerHTML = ui.wait("Quan sát và lắng nghe", step.instructions || "Giáo viên sắp mở câu hỏi."));
    if (state.phase === "open" && !ctx.sub) return T.student.input(main, ctx);
    if (state.phase === "open" && ctx.sub) {
      const editable = !["quiz", "poll2", "crossword"].includes(step.type);
      main.innerHTML = ui.done(ctx.sub.pending ? "Đã nộp – đang gửi…" : "Đã nộp ✓", "Chờ giáo viên mở câu tiếp theo.") + (editable ? `<p class="center"><button class="btn" id="edit">Sửa câu trả lời</button></p>` : "");
      if (editable) u.$("#edit").onclick = () => T.student.input(main, ctx);
      return;
    }
    T.student.result(main, ctx);
  });

  (async function init() {
    await S.ready;
    if (R) openRoom(R);
    else joinView();
  })();
})();
