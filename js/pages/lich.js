/* Trang "Lịch & ghi chú": lịch làm việc, hạn chót (deadline), ghi chú kiểu giấy nhớ; nhóm màu; nhắc trước khi đến hạn.
   Xem theo: Sắp tới · Tuần · Tháng · Ghi chú. Dữ liệu riêng của từng giáo viên (mine/<uid>/lich). */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const ic = L360.icon;
  const L = L360.Lich;
  const app = u.$("#app");
  const LS = (k, v) => {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch (e) {}
    return null;
  };
  const VIEWS = [
    ["agenda", "Sắp tới"],
    ["week", "Tuần"],
    ["month", "Tháng"],
    ["notes", "Ghi chú"]
  ];
  let teacher = null;
  let data = {};
  let loaded = false;
  let occMap = {};
  const st = {
    view: VIEWS.some((v) => v[0] === LS("l360:lich:view")) ? LS("l360:lich:view") : "agenda",
    cur: L.today(),
    q: "",
    hide: new Set((LS("l360:lich:hide") || "").split(",").filter(Boolean)),
    kind: "viec",
    done: false
  };
  const uid = () => teacher.uid;
  const catList = () => L.cats(data);
  const tint = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    const mix = (c) => Math.round(c * a + 255 * (1 - a));
    return `rgb(${mix(n >> 16)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
  };
  const match = (it) => {
    if (st.hide.has(it.cat || "")) return false;
    if (!st.q) return true;
    return u.fold([it.t, it.d, it.loc, (it.ck || []).map((c) => c.t).join(" "), L.catOf(data, it.cat).name].join(" ")).includes(u.fold(st.q));
  };
  const items = () => L.itemsOf(data).filter(match);
  const byTime = (a, b) => (a.day !== b.day ? (a.day < b.day ? -1 : 1) : (a.it.tm || "") !== (b.it.tm || "") ? ((a.it.tm || "") < (b.it.tm || "") ? -1 : 1) : (b.it.imp ? 1 : 0) - (a.it.imp ? 1 : 0));
  const occIn = (from, to, all) => {
    const out = [];
    items().forEach((it) => (all || it.k !== "note" || it.day) && L.occurrences(it, from, to).forEach((o) => out.push(o)));
    out.forEach((o) => (occMap[o.key + "@" + o.day] = o));
    return out.sort(byTime);
  };

  /* ---------- Khung trang ---------- */
  function render() {
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(teacher)}`, { sub: "Lịch & ghi chú", nav: "lich" }) +
      `<main class="wrap lc" style="max-width:1280px">
        <div class="row lc-head"><div class="grow"><h1 style="margin-bottom:2px">Lịch & ghi chú</h1><p class="muted" style="margin:0">Lịch làm việc, hạn chót và ghi chú của riêng thầy cô. Ứng dụng nhắc ở góc màn hình khi sắp đến hạn.</p></div>
          <div class="row nowrap" style="gap:8px"><button class="btn" id="lcSet">${ic("layers")} Nhóm màu & nhắc</button><button class="btn primary" id="lcNew">${ic("plus")} Thêm mới</button></div></div>
        <form class="card lc-qa" id="lcQa" autocomplete="off">
          <div class="seg sm" id="lcKind">${Object.entries(L.KINDS)
            .map(([k, n]) => `<button type="button" data-k="${k}" class="${st.kind === k ? "on" : ""}">${n}</button>`)
            .join("")}</div>
          <input type="text" id="lcQi" placeholder="Thêm nhanh – ví dụ: Nộp kế hoạch tuần thứ 6 16h #hồ sơ" aria-label="Thêm nhanh">
          <button class="btn primary" id="lcQb">${ic("plus")} Thêm</button>
          <div class="tiny muted lc-qp" id="lcQp"></div>
        </form>
        <div class="row lc-bar">
          <div class="seg" id="lcView">${VIEWS.map(([k, n]) => `<button data-v="${k}" class="${st.view === k ? "on" : ""}">${n}</button>`).join("")}</div>
          <div class="row nowrap lc-nav" id="lcNav"></div>
          <span class="spacer"></span>
          <div class="lc-search">${ic("search")}<input type="search" id="lcQ" placeholder="Tìm…" value="${u.esc(st.q)}" aria-label="Tìm trong lịch và ghi chú"></div>
        </div>
        <div class="lc-cats" id="lcCats"></div>
        <div id="lcMain"><p class="muted">Đang tải…</p></div>
      </main>` +
      L360.shell.footer();
    L360.shell.bindUserMenu(teacher);
    bindTop();
    hint();
  }
  function hint() {
    const v = u.$("#lcQi").value;
    const p = L.parseQuick(v, catList());
    u.$("#lcQp").innerHTML = v.trim()
      ? `→ <b>${u.esc(L.KINDS[kindFor(p)])}</b>: ${u.esc(p.t || "…")}${p.hint.length ? " · " + u.esc(p.hint.join(" · ")) : ""}`
      : `Gõ kèm ngày giờ để ứng dụng tự hiểu: <i>hôm nay, ngày mai, chiều mai, thứ 6, thứ 2 tuần sau, 15/12, 16h30, hằng tuần, #họp, !</i> (quan trọng)`;
  }
  const kindFor = (p) => (st.kind === "note" ? "note" : st.kind === "lich" ? "lich" : "viec");
  function bindTop() {
    u.$$("#lcKind button").forEach((b) => (b.onclick = () => ((st.kind = b.dataset.k), u.$$("#lcKind button").forEach((x) => x.classList.toggle("on", x === b)), hint())));
    u.$("#lcQi").oninput = hint;
    u.$("#lcQa").onsubmit = async (e) => {
      e.preventDefault();
      const v = u.$("#lcQi").value.trim();
      if (!v) return;
      const p = L.parseQuick(v, catList());
      const k = kindFor(p);
      if (k === "lich" && !p.day) p.day = st.view === "agenda" || st.view === "notes" ? L.today() : st.cur;
      await L.save(uid(), { k, t: p.t || v, day: p.day, tm: p.tm, rep: p.rep, cat: p.cat || (k === "lich" ? "hop" : ""), imp: p.imp });
      u.$("#lcQi").value = "";
      hint();
      u.toast(`Đã thêm ${L.KINDS[k].toLowerCase()}: ${p.t || v}`, "ok");
    };
    u.$$("#lcView button").forEach(
      (b) =>
        (b.onclick = () => {
          st.view = b.dataset.v;
          LS("l360:lich:view", st.view);
          u.$$("#lcView button").forEach((x) => x.classList.toggle("on", x === b));
          if (st.view === "notes") st.kind = "note";
          else if (st.kind === "note") st.kind = "viec";
          u.$$("#lcKind button").forEach((x) => x.classList.toggle("on", x.dataset.k === st.kind));
          hint();
          draw();
        })
    );
    u.$("#lcQ").oninput = u.debounce((e) => ((st.q = e.target.value.trim()), draw()), 160);
    u.$("#lcNew").onclick = () => edit(null, { k: st.view === "notes" ? "note" : "viec", day: st.view === "notes" ? "" : st.view === "agenda" ? L.today() : st.cur });
    u.$("#lcSet").onclick = settings;
    const m = u.$("#lcMain");
    m.addEventListener("click", onMain);
  }

  /* ---------- Vẽ theo chế độ xem ---------- */
  function draw() {
    if (!loaded) return;
    occMap = {};
    drawCats();
    drawNav();
    const m = u.$("#lcMain");
    if (st.view === "week") m.innerHTML = week();
    else if (st.view === "month") m.innerHTML = month();
    else if (st.view === "notes") m.innerHTML = notes();
    else m.innerHTML = agenda();
  }
  function drawCats() {
    const cs = catList();
    u.$("#lcCats").innerHTML = `<span class="tiny muted" style="font-weight:700">Nhóm:</span>` + cs
      .map((c) => `<button class="lc-cf ${st.hide.has(c.id) ? "off" : ""}" data-cf="${c.id}" style="--c:${c.color}" title="${st.hide.has(c.id) ? "Hiện" : "Ẩn"} nhóm ${u.esc(c.name)}"><i></i>${u.esc(c.name)}</button>`)
      .join("");
    u.$$("[data-cf]").forEach(
      (b) =>
        (b.onclick = () => {
          const id = b.dataset.cf;
          st.hide.has(id) ? st.hide.delete(id) : st.hide.add(id);
          LS("l360:lich:hide", [...st.hide].join(",") || null);
          draw();
        })
    );
  }
  function drawNav() {
    const nav = u.$("#lcNav");
    if (st.view !== "week" && st.view !== "month") return (nav.innerHTML = "");
    let label;
    if (st.view === "week") {
      const a = L.mondayOf(st.cur);
      const b = L.addDays(a, 6);
      label = `${L.dmy(a).slice(0, 5)} – ${L.dmy(b)}`;
    } else {
      const d = L.D(st.cur);
      label = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
    }
    nav.innerHTML = `<button class="btn sm ghost" data-nv="-1" title="Trước">‹</button><button class="btn sm" data-nv="0">Hôm nay</button><button class="btn sm ghost" data-nv="1" title="Sau">›</button><b class="lc-nl">${label}</b>`;
    u.$$("[data-nv]", nav).forEach(
      (b) =>
        (b.onclick = () => {
          const n = Number(b.dataset.nv);
          st.cur = !n ? L.today() : st.view === "week" ? L.addDays(st.cur, 7 * n) : L.addMonths(st.cur.slice(0, 8) + "01", n);
          draw();
        })
    );
  }
  const timeCell = (it) => (it.tm ? `<b>${it.tm}</b>${it.k === "lich" && it.end && !it.day2 ? `<small>${it.end}</small>` : ""}` : `<small>${it.k === "lich" ? "Cả ngày" : "Trong ngày"}</small>`);
  function metaHtml(it, o) {
    const m = [];
    if (it.loc) m.push(`${ic("pin")}${u.esc(it.loc)}`);
    if (it.rep) m.push(`${ic("repeat")}${u.esc(L.REP[it.rep])}`);
    if (it.day2) m.push(`${L.dmy(it.day).slice(0, 5)} – ${L.dmy(it.day2).slice(0, 5)}`);
    if (it.src && it.src.gc) m.push(`${ic("note")}Từ ghi chép họp`);
    if (it.d) m.push(u.esc(it.d.replace(/\s+/g, " ").slice(0, 90)));
    return m.length ? `<span class="tiny muted lc-meta">${m.join('<span class="lc-sep">·</span>')}</span>` : "";
  }
  function row(o, now, withDay) {
    const it = o.it;
    const s = L.status(o, now);
    const c = L.colorOf(data, it);
    const lead =
      it.k === "viec"
        ? `<button class="lc-chk ${s === "done" ? "on" : ""}" data-chk="${u.esc(o.key + "@" + o.day)}" title="${s === "done" ? "Bỏ đánh dấu xong" : "Đánh dấu đã xong"}">${ic(s === "done" ? "checkBox" : "box")}</button>`
        : `<span class="lc-ki">${ic(it.k === "lich" ? "cal" : "note")}</span>`;
    return `<div class="lc-row st-${s}" style="--c:${c}" data-open="${u.esc(it.id)}" data-base="${o.base}">${lead}
      <div class="lc-tm">${withDay ? `<small>${u.esc(L.dayLabel(o.day))}</small>` : ""}${timeCell(it)}</div>
      <div class="grow lc-tx"><b>${it.imp ? '<span class="lc-star" title="Quan trọng">★</span> ' : ""}${u.esc(it.t || "(Không có tiêu đề)")}</b>${metaHtml(it, o)}</div>
      <span class="lc-cat" style="--c:${c}">${u.esc(L.catOf(data, it.cat).name)}</span><span class="lc-rel ${s}">${u.esc(L.rel(o, now))}</span></div>`;
  }
  function agenda() {
    const now = Date.now();
    const t0 = L.today();
    const sec = (title, list, cls, withDay) =>
      list.length ? `<section class="lc-sec ${cls || ""}"><h3>${title} <span class="pill sm">${list.length}</span></h3>${list.map((o) => row(o, now, withDay)).join("")}</section>` : "";
    // Quá hạn: việc chưa xong trong 60 ngày qua.
    const over = occIn(L.addDays(t0, -60), L.addDays(t0, -0)).filter((o) => o.day === o.base && L.status(o, now) === "over");
    const doneRecent = st.done ? occIn(L.addDays(t0, -14), L.addDays(t0, 14)).filter((o) => o.day === o.base && L.status(o, now) === "done") : [];
    const soon = occIn(t0, L.addDays(t0, 13)).filter((o) => {
      const s = L.status(o, now);
      return s !== "done" && s !== "over" && !(s === "past" && o.day !== t0);
    });
    const later = [];
    const seen = new Set();
    occIn(L.addDays(t0, 14), L.addDays(t0, 120)).forEach((o) => {
      if (o.day !== o.base || seen.has(o.it.id) || L.isDone(o)) return;
      seen.add(o.it.id);
      later.push(o);
    });
    const nodate = items()
      .filter((it) => it.k === "viec" && !it.day && !it.done)
      .map((it) => ({ it, day: "", base: "", key: it.id + "_" }));
    nodate.forEach((o) => (occMap[o.key + "@"] = o));
    const days = {};
    soon.forEach((o) => (days[o.day] = days[o.day] || []).push(o));
    const dayHtml = Object.keys(days)
      .sort()
      .map((d) => sec(`${u.esc(L.dayLabel(d))}${d === t0 || d === L.addDays(t0, 1) ? ` <small class="muted">${u.esc(L.dayLabel(d, false).replace(/^(Hôm nay|Ngày mai)$/, L.WD[L.D(d).getDay()] + ", " + L.dmy(d).slice(0, 5)))}</small>` : ""}`, days[d], d === t0 ? "today" : ""))
      .join("");
    const list =
      sec("Quá hạn", over, "red", true) +
      (dayHtml || (over.length ? "" : `<div class="empty">Chưa có việc nào trong 2 tuần tới. Gõ vào ô “Thêm nhanh” ở trên để thêm.</div>`)) +
      sec("Sau đó", later, "", true) +
      sec("Việc chưa có ngày", nodate, "") +
      (st.done ? sec("Đã xong gần đây", doneRecent, "done", true) : "");
    const att = L.attention({ i: Object.fromEntries(items().map((it) => [it.id, it])) }, now);
    const wk = occIn(t0, L.addDays(L.mondayOf(t0), 6)).filter((o) => o.it.k === "viec" && !L.isDone(o) && o.day === o.base);
    return `<div class="lc-ag"><div class="lc-ag-main">${list}
        <button class="btn sm ghost" id="lcDone" style="margin-top:6px">${st.done ? "Ẩn việc đã xong" : "Hiện việc đã xong gần đây"}</button></div>
      <aside class="lc-ag-side">
        <div class="card lc-sum"><div><b class="${att.over.length ? "red" : ""}">${att.over.length}</b><span>Quá hạn</span></div><div><b>${att.today.length}</b><span>Hôm nay</span></div><div><b>${wk.length}</b><span>Hạn tuần này</span></div></div>
        <div class="card lc-mini">${mini(st.cur)}</div>
        <div class="card small muted" style="padding:14px 16px"><b style="color:var(--ink)">Nhắc hạn</b><br>Khi sắp đến hạn, thông báo nhỏ hiện ở góc phải dưới trên mọi trang của ứng dụng; nút chuông ở góc trên báo số việc cần chú ý. Muốn nhắc cả trên điện thoại: “Nhóm màu & nhắc” → Xuất lịch sang Google Calendar.</div>
      </aside></div>`;
  }
  function mini(cur) {
    const d = L.D(cur);
    const first = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const start = L.mondayOf(first);
    const occ = occIn(start, L.addDays(start, 41));
    const has = {};
    occ.forEach((o) => !L.isDone(o) && ((has[o.day] = has[o.day] || []).length < 3) && has[o.day].push(L.colorOf(data, o.it)));
    const t0 = L.today();
    let cells = "";
    for (let i = 0; i < 42; i++) {
      const day = L.addDays(start, i);
      const out = day.slice(0, 7) !== first.slice(0, 7);
      cells += `<button class="lc-md ${out ? "out" : ""} ${day === t0 ? "now" : ""}" data-wk="${day}" title="${u.esc(L.dayLabel(day, true))}"><span>${Number(day.slice(8))}</span><i>${(has[day] || []).map((c) => `<em style="background:${c}"></em>`).join("")}</i></button>`;
    }
    return `<div class="row nowrap" style="justify-content:space-between;margin-bottom:6px"><button class="btn sm ghost" data-mn="-1">‹</button><b>Tháng ${d.getMonth() + 1}/${d.getFullYear()}</b><button class="btn sm ghost" data-mn="1">›</button></div>
      <div class="lc-mgrid">${["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((x) => `<span class="lc-mh">${x}</span>`).join("")}${cells}</div>`;
  }
  function week() {
    const now = Date.now();
    const a = L.mondayOf(st.cur);
    const occ = occIn(a, L.addDays(a, 6));
    const t0 = L.today();
    let cols = "";
    for (let i = 0; i < 7; i++) {
      const day = L.addDays(a, i);
      const list = occ.filter((o) => o.day === day);
      const dd = L.D(day);
      cols += `<div class="lc-wd ${day === t0 ? "now" : ""} ${i > 4 ? "we" : ""}"><div class="lc-wh"><span>${L.WDS[dd.getDay()]}</span><b>${dd.getDate()}</b><small>/${dd.getMonth() + 1}</small></div>
        <div class="lc-wl">${list
          .map((o) => {
            const it = o.it;
            const s = L.status(o, now);
            return `<div class="lc-wc st-${s} k-${it.k}" style="--c:${L.colorOf(data, it)}" data-open="${u.esc(it.id)}" data-base="${o.base}">${
              it.k === "viec" ? `<button class="lc-chk sm ${s === "done" ? "on" : ""}" data-chk="${u.esc(o.key + "@" + o.day)}" title="Đánh dấu xong">${ic(s === "done" ? "checkBox" : "box")}</button>` : ""
            }<div class="grow"><small>${it.tm ? it.tm + (it.k === "lich" && it.end && !it.day2 ? "–" + it.end : "") : it.k === "lich" ? "Cả ngày" : it.k === "note" ? "Ghi chú" : "Hạn trong ngày"}</small><b>${it.imp ? "★ " : ""}${u.esc(it.t || "(Không có tiêu đề)")}</b>${it.loc ? `<span class="tiny">${u.esc(it.loc)}</span>` : ""}</div></div>`;
          })
          .join("")}<button class="lc-add" data-add="${day}" title="Thêm vào ${u.esc(L.dayLabel(day, true))}">${ic("plus")}</button></div></div>`;
    }
    return `<div class="lc-week">${cols}</div>`;
  }
  function month() {
    const now = Date.now();
    const d = L.D(st.cur);
    const first = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    const start = L.mondayOf(first);
    const last = L.addDays(L.addMonths(first, 1), -1);
    const rows = Math.ceil((L.diffDays(start, last) + 1) / 7);
    const occ = occIn(start, L.addDays(start, rows * 7 - 1));
    const t0 = L.today();
    let cells = "";
    for (let i = 0; i < rows * 7; i++) {
      const day = L.addDays(start, i);
      const list = occ.filter((o) => o.day === day);
      cells += `<div class="lc-mc ${day.slice(0, 7) !== first.slice(0, 7) ? "out" : ""} ${day === t0 ? "now" : ""}" data-day="${day}"><div class="lc-mn"><span>${Number(day.slice(8))}</span></div>
        ${list
          .slice(0, 3)
          .map((o) => {
            const it = o.it;
            const s = L.status(o, now);
            return `<button class="lc-mchip st-${s} k-${it.k}" style="--c:${L.colorOf(data, it)}" data-open="${u.esc(it.id)}" data-base="${o.base}" title="${u.esc(it.t)}">${it.k === "viec" ? (s === "done" ? "✓ " : "◻ ") : it.tm ? it.tm + " " : ""}${u.esc(it.t || "…")}</button>`;
          })
          .join("")}${list.length > 3 ? `<span class="lc-mmore">+${list.length - 3} mục</span>` : ""}</div>`;
    }
    return `<div class="lc-month"><div class="lc-mhead">${["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"].map((x) => `<span>${x}</span>`).join("")}</div><div class="lc-mbody" style="grid-template-rows:repeat(${rows},minmax(112px,auto))">${cells}</div></div>`;
  }
  function notes() {
    const list = items().filter((it) => it.k === "note");
    const card = (it) => {
      const c = L.colorOf(data, it);
      const ck = it.ck || [];
      return `<article class="lc-note" style="--c:${c};--bg:${tint(c, 0.13)}" data-open="${u.esc(it.id)}" data-base="${it.day}">
        <button class="lc-pin ${it.pin ? "on" : ""}" data-pin="${u.esc(it.id)}" title="${it.pin ? "Bỏ ghim" : "Ghim lên đầu"}">${ic(it.pin ? "flagOn" : "flag")}</button>
        ${it.t ? `<h4>${u.esc(it.t)}</h4>` : ""}${it.d ? `<p>${u.esc(it.d)}</p>` : ""}
        ${ck.length ? `<ul class="lc-ck">${ck.map((x, i) => `<li class="${x.x ? "x" : ""}"><button data-ck="${u.esc(it.id)}:${i}">${ic(x.x ? "checkBox" : "box")}</button><span>${u.esc(x.t)}</span></li>`).join("")}</ul>` : ""}
        <div class="lc-nf"><span class="lc-cat" style="--c:${c}">${u.esc(L.catOf(data, it.cat).name)}</span>${it.day ? `<span class="tiny">${ic("bell")} ${u.esc(L.dayLabel(it.day))}${it.tm ? " " + it.tm : ""}</span>` : ""}<span class="spacer"></span><span class="tiny muted">${u.fmtDate(it.up || it.at)}</span></div></article>`;
    };
    const pin = list.filter((x) => x.pin).sort((a, b) => (b.up || 0) - (a.up || 0));
    const rest = list.filter((x) => !x.pin).sort((a, b) => (b.up || 0) - (a.up || 0));
    if (!list.length) return `<div class="empty">Chưa có ghi chú. Chọn “Ghi chú” ở ô Thêm nhanh rồi gõ nội dung – ví dụ: <i>Ý tưởng chuyên đề tháng 12</i>.</div>`;
    return (pin.length ? `<h3 class="lc-nh">Đã ghim</h3><div class="lc-notes">${pin.map(card).join("")}</div>` : "") + (rest.length ? `${pin.length ? `<h3 class="lc-nh">Khác</h3>` : ""}<div class="lc-notes">${rest.map(card).join("")}</div>` : "");
  }

  /* ---------- Thao tác ---------- */
  function onMain(e) {
    const t = e.target;
    const chk = t.closest("[data-chk]");
    if (chk) {
      e.stopPropagation();
      const o = occMap[chk.dataset.chk];
      if (!o) return;
      const done = !L.isDone(o);
      L.setDone(uid(), o, done).then(() => done && u.toast("Đã xong: " + o.it.t, "ok"));
      return;
    }
    const ckb = t.closest("[data-ck]");
    if (ckb) {
      e.stopPropagation();
      const [id, i] = ckb.dataset.ck.split(":");
      const it = L.itemsOf(data).find((x) => x.id === id);
      if (!it) return;
      const ck = it.ck.map((x, j) => (j === Number(i) ? { t: x.t, x: !x.x } : x));
      L360.store.set(`${L.path(uid())}/i/${id}/ck`, ck);
      return;
    }
    const pin = t.closest("[data-pin]");
    if (pin) {
      e.stopPropagation();
      const it = L.itemsOf(data).find((x) => x.id === pin.dataset.pin);
      if (it) L360.store.set(`${L.path(uid())}/i/${it.id}/pin`, it.pin ? null : true);
      return;
    }
    const add = t.closest("[data-add]");
    if (add) return edit(null, { k: "viec", day: add.dataset.add });
    const mn = t.closest("[data-mn]");
    if (mn) return (st.cur = L.addMonths(st.cur.slice(0, 8) + "01", Number(mn.dataset.mn))), draw();
    const wk = t.closest("[data-wk]");
    if (wk) {
      st.cur = wk.dataset.wk;
      st.view = "week";
      LS("l360:lich:view", "week");
      u.$$("#lcView button").forEach((x) => x.classList.toggle("on", x.dataset.v === "week"));
      return draw();
    }
    if (t.closest("#lcDone")) return (st.done = !st.done), draw();
    const op = t.closest("[data-open]");
    if (op) {
      const it = L.itemsOf(data).find((x) => x.id === op.dataset.open);
      if (it) edit(it, { base: op.dataset.base });
      return;
    }
    const cell = t.closest("[data-day]");
    if (cell) dayModal(cell.dataset.day);
  }
  function dayModal(day) {
    const now = Date.now();
    const list = occIn(day, day, true);
    const m = u.modal(`<h2 style="margin-top:0">${u.esc(L.dayLabel(day, true))}</h2><div class="lc-dm">${list.length ? list.map((o) => row(o, now)).join("") : `<p class="muted">Chưa có mục nào trong ngày này.</p>`}</div>
      <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn" data-k="lich">${ic("cal")} Thêm lịch làm việc</button><button class="btn primary" data-k="viec">${ic("plus")} Thêm hạn chót</button></div>`);
    m.el.addEventListener("click", (e) => {
      const k = e.target.closest("[data-k]");
      if (k) return m.close(), edit(null, { k: k.dataset.k, day });
      if (e.target.closest("[data-chk]")) return onMain(e), setTimeout(() => (m.close(), dayModal(day)), 250);
      const op = e.target.closest("[data-open]");
      if (op) {
        const it = L.itemsOf(data).find((x) => x.id === op.dataset.open);
        m.close();
        if (it) edit(it, { base: op.dataset.base });
      }
    });
  }

  /* ---------- Hộp sửa một mục ---------- */
  function edit(it, { k, day, base } = {}) {
    const isNew = !it;
    const f = isNew ? { k: k || "viec", t: "", d: "", day: day || "", tm: "", end: "", day2: "", loc: "", cat: k === "lich" ? "hop" : "", rep: "", until: "", imp: false, pin: false, ck: [], color: "" } : u.clone(it);
    if (isNew) f.rem = undefined;
    let rem = new Set(L.remOf(f));
    let remTouched = !isNew && typeof it.rem === "string";
    const occ = !isNew && it.rep && base ? { it, day: base, base, key: it.id + "_" + base.replace(/-/g, "") } : null;
    const m = u.modal(`<div class="lc-ed"></div>`, { wide: false });
    const box = u.$(".lc-ed", m.el);
    function read() {
      const g = (s) => {
        const el = u.$(s, box);
        return el ? el.value : undefined;
      };
      ["t", "d", "day", "tm", "end", "day2", "loc", "rep", "until"].forEach((x) => {
        const v = g("#ed_" + x);
        if (v !== undefined) f[x] = v.trim ? (x === "d" ? v : v.trim()) : v;
      });
      const imp = u.$("#ed_imp", box);
      if (imp) f.imp = imp.checked;
      const pin = u.$("#ed_pin", box);
      if (pin) f.pin = pin.checked;
      const rows = u.$$(".ed-ck-row", box);
      if (rows.length || u.$("#edCk", box)) f.ck = rows.map((r) => ({ t: u.$("input[type=text]", r).value, x: u.$("input[type=checkbox]", r).checked })).filter((c) => c.t.trim());
    }
    function draw() {
      const cs = catList();
      const remOpts = f.tm || f.k === "lich" ? L.REM : L.REM.filter(([n]) => n === 0 || n >= 1440);
      box.innerHTML = `<h2 style="margin:0 0 12px">${isNew ? "Thêm mới" : "Sửa " + L.KINDS[f.k].toLowerCase()}</h2>
        <div class="seg" id="edK" style="margin-bottom:14px">${Object.entries(L.KINDS)
          .map(([kk, n]) => `<button type="button" data-k="${kk}" class="${f.k === kk ? "on" : ""}">${n}</button>`)
          .join("")}</div>
        ${occ ? `<div class="lc-occ small">${ic("repeat")} Lần ngày <b>${L.dmy(occ.base)}</b> trong chuỗi “${u.esc(L.REP[it.rep])}”. Sửa ở đây là sửa cả chuỗi.</div>` : ""}
        <label class="field">Tiêu đề<input type="text" id="ed_t" value="${u.esc(f.t)}" maxlength="300" placeholder="${f.k === "viec" ? "Ví dụ: Nộp kế hoạch dạy học tuần 14" : f.k === "lich" ? "Ví dụ: Họp tổ chuyên môn" : "Ví dụ: Ý tưởng chuyên đề tháng 12"}"></label>
        <div class="lc-edg">
          <label class="field">${f.k === "viec" ? "Hạn ngày" : f.k === "lich" ? "Ngày" : "Nhắc vào ngày (tuỳ chọn)"}<input type="date" id="ed_day" value="${f.day}"></label>
          <label class="field">${f.k === "lich" ? "Từ giờ" : "Lúc"}<input type="time" id="ed_tm" value="${f.tm}"></label>
          ${f.k === "lich" ? `<label class="field">Đến giờ<input type="time" id="ed_end" value="${f.end}"></label>` : ""}
          ${f.k === "lich" && !f.rep ? `<label class="field">Đến ngày (nhiều ngày)<input type="date" id="ed_day2" value="${f.day2}"></label>` : ""}
        </div>
        ${f.k === "lich" ? `<label class="field">Địa điểm<input type="text" id="ed_loc" value="${u.esc(f.loc)}" maxlength="160" placeholder="Phòng họp tổ, Hội trường, Google Meet…"></label>` : ""}
        <div class="field"><span>Nhóm</span><div class="lc-catpick">${cs
          .map((c) => `<button type="button" class="lc-cp ${f.cat === c.id ? "on" : ""}" data-cat="${c.id}" style="--c:${c.color}"><i></i>${u.esc(c.name)}</button>`)
          .join("")}</div></div>
        ${f.k === "note" ? `<div class="field"><span>Màu thẻ</span><div class="lc-sw"><button type="button" data-col="" class="${!f.color ? "on" : ""}" title="Theo màu nhóm">A</button>${L.PALETTE.map((c) => `<button type="button" data-col="${c}" class="${f.color === c ? "on" : ""}" style="background:${c}" title="${c}"></button>`).join("")}</div></div>` : ""}
        ${f.day ? `<div class="field"><span>Nhắc trước</span><div class="lc-rem">${remOpts.map(([n, lab]) => `<button type="button" data-rem="${n}" class="${rem.has(n) ? "on" : ""}">${lab}</button>`).join("")}<button type="button" data-rem="none" class="${!rem.size ? "on" : ""}">Không nhắc</button></div></div>` : ""}
        ${f.day ? `<div class="lc-edg"><label class="field">Lặp lại<select id="ed_rep">${Object.entries(L.REP).map(([kk, n]) => `<option value="${kk}" ${f.rep === kk ? "selected" : ""}>${n}</option>`).join("")}</select></label>${f.rep ? `<label class="field">Lặp đến ngày (tuỳ chọn)<input type="date" id="ed_until" value="${f.until}"></label>` : ""}</div>` : ""}
        <label class="field">${f.k === "note" ? "Nội dung" : "Ghi chú thêm"}<textarea id="ed_d" rows="${f.k === "note" ? 5 : 3}" maxlength="5000" placeholder="${f.k === "note" ? "Viết ghi chú…" : "Chi tiết, tài liệu cần chuẩn bị…"}">${u.esc(f.d)}</textarea></label>
        ${f.k === "note" ? `<div class="field"><span>Danh sách việc</span><div id="edCk">${(f.ck || []).map(ckRow).join("")}</div><button type="button" class="btn sm ghost" id="edCkAdd">${ic("plus")} Thêm dòng</button></div>` : ""}
        <div class="row" style="gap:18px;margin:4px 0 0">${f.k !== "note" ? `<label class="row nowrap small" style="gap:6px"><input type="checkbox" id="ed_imp" ${f.imp ? "checked" : ""}> ★ Quan trọng</label>` : `<label class="row nowrap small" style="gap:6px"><input type="checkbox" id="ed_pin" ${f.pin ? "checked" : ""}> Ghim lên đầu</label>`}</div>
        ${it && it.src && it.src.gc ? `<p class="small" style="margin:10px 0 0"><a href="ghichep.html${/che-do=dien-tap/.test(location.search) ? "?che-do=dien-tap&" : "?"}id=${encodeURIComponent(it.src.gc)}">${ic("note")} Mở ghi chép cuộc họp liên quan</a></p>` : ""}
        <div class="row lc-edb">${
          isNew
            ? ""
            : `<button type="button" class="btn ghost" id="edDel" style="color:var(--bad)">${ic("trash")} Xoá</button>${occ ? `<button type="button" class="btn ghost" id="edSkip">Bỏ lần này</button>` : ""}`
        }<span class="spacer"></span><button type="button" class="btn" data-close>Huỷ</button><button type="button" class="btn primary" id="edSave">${ic("save")} Lưu</button></div>`;
      u.$$("#edK button", box).forEach((b) => (b.onclick = () => (read(), (f.k = b.dataset.k), !remTouched && (rem = new Set(L.remOf(Object.assign({}, f, { rem: undefined })))), draw())));
      u.$$("[data-cat]", box).forEach((b) => (b.onclick = () => ((f.cat = f.cat === b.dataset.cat ? "" : b.dataset.cat), u.$$("[data-cat]", box).forEach((x) => x.classList.toggle("on", x.dataset.cat === f.cat)))));
      u.$$("[data-col]", box).forEach((b) => (b.onclick = () => ((f.color = b.dataset.col), u.$$("[data-col]", box).forEach((x) => x.classList.toggle("on", x === b)))));
      u.$$("[data-rem]", box).forEach(
        (b) =>
          (b.onclick = () => {
            remTouched = true;
            if (b.dataset.rem === "none") rem.clear();
            else {
              const n = Number(b.dataset.rem);
              rem.has(n) ? rem.delete(n) : rem.add(n);
            }
            u.$$("[data-rem]", box).forEach((x) => x.classList.toggle("on", x.dataset.rem === "none" ? !rem.size : rem.has(Number(x.dataset.rem))));
          })
      );
      ["#ed_day", "#ed_tm", "#ed_rep"].forEach((s) => {
        const el = u.$(s, box);
        if (!el) return;
        el.onchange = () => {
          const had = { day: f.day, tm: f.tm, rep: f.rep };
          read();
          if (!remTouched) rem = new Set(L.remOf(Object.assign({}, f, { rem: undefined })));
          if (!!had.day !== !!f.day || !!had.tm !== !!f.tm || !!had.rep !== !!f.rep) draw();
        };
      });
      const ca = u.$("#edCkAdd", box);
      if (ca)
        ca.onclick = () => {
          u.$("#edCk", box).insertAdjacentHTML("beforeend", ckRow({ t: "", x: false }));
          bindCk();
          const ins = u.$$("#edCk input[type=text]", box);
          ins[ins.length - 1].focus();
        };
      bindCk();
      u.$("#edSave", box).onclick = save;
      const del = u.$("#edDel", box);
      if (del)
        del.onclick = async () => {
          if (!(await u.confirm(it.rep ? `Xoá **cả chuỗi lặp** “${it.t}”? (Muốn bỏ một lần, dùng nút “Bỏ lần này”.)` : `Xoá “${it.t || "mục này"}”?`, "Xoá"))) return;
          await L.remove(uid(), it.id);
          m.close();
          u.toast("Đã xoá.", "ok");
        };
      const sk = u.$("#edSkip", box);
      if (sk)
        sk.onclick = async () => {
          await L360.store.set(`${L.path(uid())}/i/${it.id}/ex/${occ.base}`, true);
          m.close();
          u.toast(`Đã bỏ lần ngày ${L.dmy(occ.base)}.`, "ok");
        };
      u.$("#ed_t", box).addEventListener("keydown", (e) => e.key === "Enter" && (e.preventDefault(), save()));
      setTimeout(() => isNew && u.$("#ed_t", box) && u.$("#ed_t", box).focus(), 40);
    }
    function ckRow(c) {
      return `<div class="ed-ck-row row nowrap"><input type="checkbox" ${c.x ? "checked" : ""}><input type="text" value="${u.esc(c.t)}" maxlength="300" placeholder="Việc…"><button type="button" class="btn sm ghost" data-rmck title="Bỏ dòng">✕</button></div>`;
    }
    function bindCk() {
      u.$$("[data-rmck]", box).forEach((b) => (b.onclick = () => b.closest(".ed-ck-row").remove()));
      u.$$(".ed-ck-row input[type=text]", box).forEach(
        (inp) =>
          (inp.onkeydown = (e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            u.$("#edCkAdd", box).click();
          })
      );
    }
    async function save() {
      read();
      if (!f.t.trim() && !(f.k === "note" && (f.d.trim() || (f.ck || []).length))) return u.toast("Nhập tiêu đề.", "bad");
      if (f.k === "lich" && !f.day) return u.toast("Lịch làm việc cần có ngày.", "bad");
      if (f.k === "lich" && f.end && f.tm && !f.day2 && f.end <= f.tm) return u.toast("Giờ kết thúc phải sau giờ bắt đầu.", "bad");
      if (f.day2 && f.day2 <= f.day) f.day2 = "";
      if (f.until && f.until < f.day) return u.toast("Ngày “lặp đến” phải sau ngày bắt đầu.", "bad");
      const out = Object.assign({}, isNew ? {} : it, f);
      if (out.k !== "lich") Object.assign(out, { end: "", day2: "", loc: "" });
      if (out.k !== "note") Object.assign(out, { pin: false, ck: [], color: "" });
      if (out.k !== "viec") Object.assign(out, { done: null, dn: null });
      if (!out.day) Object.assign(out, { rep: "", until: "", tm: out.k === "lich" ? out.tm : "" });
      if (!out.rep) out.until = "";
      out.rem = remTouched || !isNew ? [...rem].sort((a, b) => b - a).join(",") : undefined;
      if (!out.day) out.rem = undefined;
      delete out.id;
      try {
        await L.save(uid(), Object.assign(out, { id: isNew ? undefined : it.id }));
        m.close();
        u.toast(isNew ? "Đã thêm." : "Đã lưu.", "ok");
        if (isNew && out.day && st.view !== "notes" && out.day !== st.cur && (st.view === "week" || st.view === "month")) {
          st.cur = out.day;
          draw();
        }
      } catch (e) {
        console.warn(e);
        u.toast("Chưa lưu được – kiểm tra kết nối mạng.", "bad");
      }
    }
    draw();
  }

  /* ---------- Nhóm màu, thông báo, xuất lịch ---------- */
  function settings() {
    let cs = catList().map((c) => Object.assign({}, c));
    const m = u.modal(`<div class="lc-st"></div>`);
    const box = u.$(".lc-st", m.el);
    const os = L360.Nhac.osOn();
    function draw() {
      box.innerHTML = `<h2 style="margin-top:0">Nhóm màu & nhắc</h2>
        <h3>Nhóm màu</h3><p class="small muted" style="margin-top:-4px">Mỗi nhóm một màu để nhận ra ngay trên lịch: giảng dạy, họp, hồ sơ, đề kiểm tra…</p>
        <div class="col" style="gap:8px">${cs
          .map(
            (c, i) => `<div class="lc-cr row nowrap"><span class="lc-cdot" style="background:${c.color}"></span><input type="text" data-cn="${i}" value="${u.esc(c.name)}" maxlength="40">
            <div class="lc-sw sm">${L.PALETTE.map((p) => `<button type="button" data-cc="${i}" data-col="${p}" class="${c.color === p ? "on" : ""}" style="background:${p}" title="${p}"></button>`).join("")}</div>
            <button type="button" class="btn sm ghost" data-cd="${i}" title="Xoá nhóm">${ic("trash")}</button></div>`
          )
          .join("")}</div>
        <button type="button" class="btn sm" id="stAdd" style="margin-top:8px">${ic("plus")} Thêm nhóm</button>
        <h3 style="margin-top:20px">Thông báo</h3>
        <label class="row nowrap small" style="gap:8px"><input type="checkbox" id="stOs" ${os ? "checked" : ""}> Hiện cả thông báo của trình duyệt khi đang mở tab khác</label>
        <p class="tiny muted">Ứng dụng nhắc khi đang mở (trên bất kì trang nào của Lesson 360°). Muốn được nhắc cả khi tắt máy tính, xuất lịch sang Google Calendar trên điện thoại.</p>
        <h3 style="margin-top:20px">Xuất lịch</h3>
        <p class="small muted" style="margin-top:-4px">Tải tệp .ics rồi nhập vào Google Calendar (calendar.google.com → Cài đặt → Nhập và xuất) hoặc mở trên điện thoại. Hạn chót, lịch làm việc, lặp lại và nhắc trước đều được giữ.</p>
        <button type="button" class="btn" id="stIcs">${ic("download")} Tải lịch (.ics)</button>
        <div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn" data-close>Đóng</button><button class="btn primary" id="stSave">${ic("save")} Lưu nhóm màu</button></div>`;
      u.$$("[data-cn]", box).forEach((inp) => (inp.oninput = () => (cs[Number(inp.dataset.cn)].name = inp.value)));
      u.$$("[data-cc]", box).forEach((b) => (b.onclick = () => ((cs[Number(b.dataset.cc)].color = b.dataset.col), draw())));
      u.$$("[data-cd]", box).forEach(
        (b) =>
          (b.onclick = () => {
            const c = cs[Number(b.dataset.cd)];
            const n = L.itemsOf(data).filter((x) => x.cat === c.id).length;
            if (n && !confirm(`Nhóm “${c.name}” đang có ${n} mục. Xoá nhóm thì các mục này thành “Chưa phân nhóm”. Tiếp tục?`)) return;
            cs.splice(Number(b.dataset.cd), 1);
            draw();
          })
      );
      u.$("#stAdd", box).onclick = () => {
        const used = new Set(cs.map((c) => c.color));
        cs.push({ id: "c" + u.uid(5), name: "Nhóm mới", color: L.PALETTE.find((p) => !used.has(p)) || L.PALETTE[0] });
        draw();
        const ins = u.$$("[data-cn]", box);
        ins[ins.length - 1].select();
      };
      u.$("#stOs", box).onchange = async (e) => {
        if (!e.target.checked) return LS("l360:nhac:os", null);
        if (!("Notification" in window)) {
          e.target.checked = false;
          return u.toast("Trình duyệt này không hỗ trợ thông báo.", "bad");
        }
        const p = await Notification.requestPermission();
        if (p === "granted") {
          LS("l360:nhac:os", "1");
          u.toast("Đã bật thông báo của trình duyệt.", "ok");
        } else {
          e.target.checked = false;
          u.toast("Trình duyệt chưa cho phép thông báo – bấm biểu tượng ổ khoá cạnh địa chỉ trang để cho phép.", "bad", 6000);
        }
      };
      u.$("#stIcs", box).onclick = () => {
        const r = L.ics(data);
        if (!r.count) return u.toast("Chưa có mục nào có ngày để xuất.", "bad");
        u.download("Lich-Lesson360.ics", r.text, "text/calendar;charset=utf-8");
        u.toast(`Đã tải ${r.count} mục lịch.`, "ok");
      };
      u.$("#stSave", box).onclick = async () => {
        if (cs.some((c) => !c.name.trim())) return u.toast("Nhóm cần có tên.", "bad");
        const out = {};
        cs.forEach((c, i) => (out[c.id] = { name: c.name.trim().slice(0, 40), color: c.color, o: i + 1 }));
        await L360.store.set(`${L.path(uid())}/cats`, Object.keys(out).length ? out : { canhan: { name: "Cá nhân", color: "#6B7A90", o: 1 } });
        m.close();
        u.toast("Đã lưu nhóm màu.", "ok");
      };
    }
    draw();
  }

  (async function init() {
    teacher = await L360.Auth.requireTeacher(app, { title: "Đăng nhập để dùng Lịch & ghi chú" });
    render();
    const want = u.qs("muc");
    L360.Nhac.watch((v) => {
      data = v || {};
      loaded = true;
      draw();
      if (want && !init.opened) {
        init.opened = true;
        const it = L.itemsOf(data).find((x) => x.id === want);
        if (it) {
          if (it.day && st.view !== "notes") st.cur = it.day;
          const nx = it.rep ? L.occurrences(it, L.today(), L.addDays(L.today(), 400))[0] : null;
          edit(it, { base: nx ? nx.base : it.day });
        }
      }
    });
    // Sang ngày mới khi để trang mở qua đêm: vẽ lại.
    setInterval(() => loaded && !u.$(".modal-bg") && draw(), 60000);
  })();
})();
