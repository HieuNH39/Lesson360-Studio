/* Lịch & ghi chú của giáo viên: dữ liệu, lặp lại, nhắc hạn.
   Dữ liệu riêng từng người ở mine/<uid>/lich: i (các mục), cats (nhóm màu), ack (nhắc đã tắt), sn (nhắc hoãn), opt.
   Trên mọi trang có tài khoản giáo viên: nút chuông báo số việc cần chú ý và thông báo nhỏ ở góc phải dưới khi sắp đến hạn.
   Thông báo chỉ hiện khi ứng dụng đang mở; muốn nhắc trên điện thoại thì xuất lịch (.ics) sang Google Calendar. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const pad = (n) => String(n).padStart(2, "0");

  const PALETTE = ["#2F6FDB", "#0EA5E9", "#0C9A9A", "#1E8E5A", "#65A30D", "#EAB308", "#E8930C", "#D2453B", "#E0457B", "#8A5A2B", "#6B7A90"];
  const CATS = [
    { id: "day", name: "Giảng dạy", color: "#2F6FDB" },
    { id: "hop", name: "Họp", color: "#E8930C" },
    { id: "hoso", name: "Hồ sơ – Báo cáo", color: "#1E8E5A" },
    { id: "de", name: "Kiểm tra – Đề", color: "#D2453B" },
    { id: "cn", name: "Chủ nhiệm", color: "#0C9A9A" },
    { id: "canhan", name: "Cá nhân", color: "#6B7A90" }
  ];
  const KINDS = { viec: "Hạn chót", lich: "Lịch làm việc", note: "Ghi chú" };
  const REM = [
    [0, "Lúc đến hạn"],
    [15, "15 phút"],
    [30, "30 phút"],
    [60, "1 giờ"],
    [1440, "1 ngày"],
    [4320, "3 ngày"],
    [10080, "1 tuần"]
  ];
  const REP = { "": "Không lặp", d: "Hằng ngày", w: "Hằng tuần", "2w": "2 tuần một lần", m: "Hằng tháng" };
  const WD = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const WDS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  /* ---------- Ngày giờ (theo giờ máy, ngày dạng YYYY-MM-DD) ---------- */
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const D = (s) => {
    const [y, m, d] = String(s).split("-").map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  };
  const today = () => iso(new Date());
  const addDays = (s, n) => {
    const d = D(s);
    d.setDate(d.getDate() + n);
    return iso(d);
  };
  const addMonths = (s, n, dom) => {
    const d = D(s);
    const day = dom || d.getDate();
    const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
    t.setDate(Math.min(day, new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()));
    return iso(t);
  };
  const diffDays = (a, b) => Math.round((D(b) - D(a)) / 86400000);
  const mondayOf = (s) => addDays(s, -((D(s).getDay() + 6) % 7));
  const at = (day, tm) => {
    const d = D(day);
    if (tm) {
      const [h, m] = tm.split(":").map(Number);
      d.setHours(h || 0, m || 0, 0, 0);
    }
    return d.getTime();
  };
  const okTm = (t) => /^\d{2}:\d{2}$/.test(t || "");
  const okDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || "");

  /* ---------- Mục lịch ---------- */
  const FIELDS = ["k", "t", "d", "cat", "color", "day", "tm", "end", "day2", "loc", "rep", "until", "rem", "imp", "pin", "ck", "done", "dn", "ex", "src", "at", "up"];
  function norm(id, raw) {
    const it = Object.assign({}, raw || {});
    it.id = id;
    if (!KINDS[it.k]) it.k = it.day ? "viec" : "note";
    it.t = String(it.t || "");
    it.d = String(it.d || "");
    it.day = okDay(it.day) ? it.day : "";
    it.tm = okTm(it.tm) ? it.tm : "";
    it.end = okTm(it.end) ? it.end : "";
    it.day2 = okDay(it.day2) && it.day2 > it.day && !it.rep ? it.day2 : "";
    it.rep = REP[it.rep] !== undefined && it.day ? it.rep || "" : "";
    it.until = okDay(it.until) ? it.until : "";
    it.ck = Array.isArray(it.ck) ? it.ck.filter((c) => c && c.t != null).map((c) => ({ t: String(c.t), x: !!c.x })) : u.vals(it.ck).filter((c) => c && c.t != null);
    return it;
  }
  const itemsOf = (data) => u.entries(data && data.i).map(([id, x]) => norm(id, x));
  const cats = (data) => {
    const c = data && data.cats;
    if (!c || typeof c !== "object") return CATS.map((x) => Object.assign({}, x));
    return u
      .entries(c)
      .map(([id, x]) => ({ id, name: String((x && x.name) || "Nhóm"), color: (x && x.color) || "#6B7A90", o: (x && x.o) || 0 }))
      .sort((a, b) => a.o - b.o);
  };
  const catOf = (data, id) => cats(data).find((c) => c.id === id) || { id: "", name: "Chưa phân nhóm", color: "#6B7A90" };
  // Ghi chú chưa chọn nhóm, màu: vàng giấy nhớ.
  const colorOf = (data, it) => it.color || (!it.cat && it.k === "note" ? "#EAB308" : catOf(data, it.cat).color);
  // Nhắc trước bao nhiêu phút (chuỗi "1440,60"; chuỗi rỗng = không nhắc; chưa đặt = mặc định theo loại).
  function remOf(it) {
    if (typeof it.rem === "string") return it.rem === "" ? [] : it.rem.split(",").map(Number).filter((n) => n >= 0);
    if (it.k === "viec") return it.tm ? [1440, 60] : [1440];
    if (it.k === "lich") return it.tm ? [30] : [0];
    return it.day ? [0] : [];
  }

  /* Các lần xuất hiện của một mục trong khoảng [from, to]. base = ngày gốc của lần đó (sự kiện nhiều ngày). */
  function occurrences(it, from, to) {
    const out = [];
    if (!it.day) return out;
    const push = (day, base) => {
      base = base || day;
      if (it.ex && it.ex[base]) return;
      out.push({ it, day, base, key: it.id + "_" + base.replace(/-/g, "") });
    };
    if (!it.rep) {
      if (it.day2) {
        for (let d = it.day > from ? it.day : from; d <= it.day2 && d <= to; d = addDays(d, 1)) push(d, it.day);
      } else if (it.day >= from && it.day <= to) push(it.day);
      return out;
    }
    const until = it.until && it.until < to ? it.until : to;
    if (it.rep === "m") {
      const dom = D(it.day).getDate();
      let n = 0;
      if (it.day < from) n = Math.max(0, (D(from).getFullYear() - D(it.day).getFullYear()) * 12 + D(from).getMonth() - D(it.day).getMonth() - 1);
      for (let d = addMonths(it.day, n, dom), g = 0; d <= until && g < 400; g++, n++, d = addMonths(it.day, n, dom)) if (d >= from) push(d);
    } else {
      const step = it.rep === "d" ? 1 : it.rep === "w" ? 7 : 14;
      let d = it.day < from ? addDays(it.day, Math.ceil(diffDays(it.day, from) / step) * step) : it.day;
      for (let g = 0; d <= until && g < 800; g++, d = addDays(d, step)) push(d);
    }
    return out;
  }
  const isDone = (o) => o.it.k === "viec" && (o.it.rep ? !!(o.it.dn && o.it.dn[o.base]) : !!o.it.done);
  const startMs = (o) => at(o.base, o.it.tm);
  const dueMs = (o) => (o.it.tm ? at(o.base, o.it.tm) : at(o.base) + 86400000 - 1);
  function endMs(o) {
    const it = o.it;
    const day = it.day2 || o.base;
    if (it.end && (it.day2 || it.end > it.tm)) return at(day, it.end);
    if (it.tm) return at(o.base, it.tm) + 3600000;
    return at(day) + 86400000 - 1;
  }
  function status(o, now = Date.now()) {
    if (o.it.k === "viec") {
      if (isDone(o)) return "done";
      if (now > dueMs(o)) return "over";
    }
    if (o.it.k === "lich" && now > endMs(o)) return "past";
    return o.day === iso(new Date(now)) ? "today" : "soon";
  }
  const span = (ms) => {
    const a = Math.abs(ms);
    if (a < 3600000) return Math.max(1, Math.round(a / 60000)) + " phút";
    if (a < 86400000) return Math.round(a / 3600000) + " giờ";
    return Math.round(a / 86400000) + " ngày";
  };
  // "Còn 2 giờ", "Quá hạn 1 ngày", "Sau 30 phút", "Đang diễn ra".
  function rel(o, now = Date.now()) {
    const it = o.it;
    const t0 = iso(new Date(now));
    if (!o.base) return it.done ? "Đã xong" : "Chưa có ngày";
    if (it.k === "viec") {
      if (isDone(o)) return "Đã xong";
      const due = dueMs(o);
      if (now > due) return "Quá hạn " + span(now - due);
      if (!it.tm) return o.base === t0 ? "Hạn hôm nay" : o.base === addDays(t0, 1) ? "Hạn ngày mai" : "Còn " + diffDays(t0, o.base) + " ngày";
      return "Còn " + span(due - now);
    }
    const st = startMs(o);
    if (now >= st) return now < endMs(o) ? "Đang diễn ra" : "Đã qua";
    if (!it.tm) return o.base === t0 ? "Hôm nay" : o.base === addDays(t0, 1) ? "Ngày mai" : "Sau " + diffDays(t0, o.base) + " ngày";
    return "Sau " + span(st - now);
  }
  function dayLabel(day, withYear) {
    const t = today();
    if (day === t) return "Hôm nay";
    if (day === addDays(t, 1)) return "Ngày mai";
    if (day === addDays(t, -1)) return "Hôm qua";
    const d = D(day);
    return `${WD[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}${withYear || d.getFullYear() !== new Date().getFullYear() ? "/" + d.getFullYear() : ""}`;
  }
  const dmy = (day) => (day ? day.split("-").reverse().join("/") : "");
  function whenLabel(o) {
    const it = o.it;
    let s = dayLabel(o.day);
    if (it.tm) s += " · " + it.tm + (it.end && it.k === "lich" && !it.day2 ? "–" + it.end : "");
    if (it.day2 && it.k === "lich") s = `${dmy(it.day).slice(0, 5)} – ${dmy(it.day2).slice(0, 5)}` + (it.tm ? " · " + it.tm : "");
    return s;
  }

  /* ---------- Nhắc hạn ---------- */
  // Mốc nhắc của một lần: có giờ thì trước giờ đó; cả ngày thì lúc 7:00 (nhắc trước ≥ 1 ngày lùi theo ngày).
  function fires(o) {
    const it = o.it;
    const anchor = it.tm ? at(o.base, it.tm) : at(o.base, "07:00");
    const m = new Map();
    remOf(it).forEach((off) => {
      const t = it.tm || off >= 1440 ? anchor - off * 60000 : anchor;
      if (!m.has(t) || m.get(t) < off) m.set(t, off);
    });
    return [...m].map(([t, off]) => ({ t, off })).sort((a, b) => a.t - b.t);
  }
  // Nhắc đang đến lúc hiện: mỗi lần chỉ hiện mốc gần nhất; việc quá hạn nhắc thêm một lần (trong 14 ngày).
  function alerts(data, now = Date.now()) {
    const t0 = iso(new Date(now));
    const ack = (data && data.ack) || {};
    const sn = (data && data.sn) || {};
    const out = [];
    itemsOf(data).forEach((it) => {
      if (!remOf(it).length) return;
      occurrences(it, addDays(t0, -14), addDays(t0, 8)).forEach((o) => {
        if (o.day !== o.base || isDone(o)) return;
        if (it.k !== "viec" && now > endMs(o)) return;
        let key;
        let kind;
        if (it.k === "viec" && now > dueMs(o)) {
          if ((it.at || 0) > dueMs(o)) return;
          key = o.key + "_q";
          kind = "over";
        } else {
          // Mốc nhắc đã qua trước khi tạo mục thì bỏ (như Google Calendar).
          const fs = fires(o).filter((f) => f.t <= now && f.t >= (it.at || 0) - 60000);
          if (!fs.length) return;
          key = o.key + "_" + fs[fs.length - 1].off;
          kind = "soon";
        }
        if (ack[key] || (sn[key] && sn[key] > now)) return;
        out.push({ o, key, kind });
      });
    });
    return out.sort((a, b) => (a.kind === b.kind ? dueMs(a.o) - dueMs(b.o) : a.kind === "over" ? -1 : 1));
  }
  // Danh sách cho nút chuông: quá hạn, hôm nay, 7 ngày tới.
  function attention(data, now = Date.now()) {
    const t0 = iso(new Date(now));
    const r = { over: [], today: [], next: [] };
    itemsOf(data).forEach((it) => {
      if (it.k === "note" && !it.day) return;
      occurrences(it, addDays(t0, -60), addDays(t0, 7)).forEach((o) => {
        if (o.day !== o.base && o.day !== t0) return;
        const st = status(o, now);
        if (st === "done" || st === "past") return;
        if (st === "over") r.over.push(o);
        else if (o.day === t0) r.today.push(o);
        else if (o.day > t0) r.next.push(o);
      });
    });
    const by = (a, b) => (a.day === b.day ? (a.it.tm || "99") < (b.it.tm || "99") ? -1 : 1 : a.day < b.day ? -1 : 1);
    r.over.sort(by);
    r.today.sort(by);
    r.next.sort(by);
    return r;
  }

  /* ---------- Thêm nhanh bằng câu tiếng Việt ----------
     "Nộp kế hoạch tuần thứ 6 16h #hồ sơ" → hạn Thứ Sáu tới 16:00, nhóm Hồ sơ – Báo cáo. */
  const WDN = { "2": 1, hai: 1, "3": 2, ba: 2, "4": 3, tư: 3, tu: 3, "5": 4, năm: 4, "6": 5, sáu: 5, sau: 5, "7": 6, bảy: 6, bay: 6 };
  const END = "(?=[\\s,.;!]|$)";
  function parseQuick(text, catsList, base = new Date()) {
    let s = " " + String(text || "").replace(/\s+/g, " ").trim() + " ";
    const r = { t: "", day: "", tm: "", rep: "", cat: "", imp: false, hint: [] };
    const take = (re, fn) => {
      const m = s.match(re);
      if (!m) return false;
      s = s.slice(0, m.index) + " " + s.slice(m.index + m[0].length);
      fn(m);
      return true;
    };
    const t0 = iso(base);
    let period = "";
    take(new RegExp("\\s(?:2|hai)\\s*tuần\\s*(?:một|1)\\s*lần" + END, "i"), () => (r.rep = "2w")) ||
      take(new RegExp("\\s(?:hằng|hàng|mỗi)\\s+ngày" + END, "i"), () => (r.rep = "d")) ||
      take(new RegExp("\\s(?:hằng|hàng|mỗi)\\s+tuần" + END, "i"), () => (r.rep = "w")) ||
      take(new RegExp("\\s(?:hằng|hàng|mỗi)\\s+tháng" + END, "i"), () => (r.rep = "m"));
    take(new RegExp("\\s(?:\\(?quan trọng\\)?|!)" + END, "i"), () => (r.imp = true));
    // #nhóm: thử ghép tối đa 4 từ sau dấu # để khớp tên nhóm dài nhất ("#hồ sơ" → Hồ sơ – Báo cáo).
    const hm = s.match(/\s#(\S+(?:\s+[^\s#]+){0,3})/);
    if (hm) {
      const flat = (x) => u.slug(x).replace(/-/g, "");
      const words = hm[1].split(/\s+/);
      const list = (catsList || []).map((x) => [x, flat(x.name)]);
      let used = 1;
      for (let n = words.length; n >= 1; n--) {
        const k = flat(words.slice(0, n).join(" "));
        const c = k && (list.find(([, nm]) => nm === k) || list.find(([, nm]) => nm.startsWith(k)));
        if (c) {
          r.cat = c[0].id;
          used = n;
          break;
        }
      }
      const tagText = "#" + words.slice(0, used).join(" ");
      const i = s.indexOf(tagText, hm.index);
      s = s.slice(0, i) + " " + s.slice(i + tagText.length);
    }
    // Ngày
    take(new RegExp("\\s(?:vào\\s+)?(sáng|trưa|chiều|tối)?\\s*(hôm nay|hnay)" + END, "i"), (m) => ((r.day = t0), (period = m[1] || ""))) ||
      take(new RegExp("\\s(?:vào\\s+)?(?:(sáng|trưa|chiều|tối)\\s*(?:ngày\\s+)?mai|(?:(sáng|trưa|chiều|tối)\\s+)?ngày mai)" + END, "i"), (m) => {
        r.day = addDays(t0, 1);
        period = m[1] || m[2] || "";
      }) ||
      take(new RegExp("\\s(?:ngày kia|ngày mốt|mốt)" + END, "i"), () => (r.day = addDays(t0, 2))) ||
      take(new RegExp("\\s(?:hôm qua)" + END, "i"), () => (r.day = addDays(t0, -1))) ||
      take(new RegExp("\\s(?:vào\\s+)?(sáng|trưa|chiều|tối)?\\s*(tuần (?:sau|tới)\\s+)?(?:thứ\\s*(2|3|4|5|6|7|hai|ba|tư|tu|năm|sáu|sau|bảy|bay)|t([2-7])|(chủ nhật|cn))(\\s+tuần (?:sau|tới))?" + END, "i"), (m) => {
        const wd = m[5] ? 0 : WDN[(m[3] || m[4] || "").toLowerCase()];
        const next = !!(m[2] || m[6]);
        const mon = mondayOf(t0);
        const off = (wd + 6) % 7;
        if (next) r.day = addDays(mon, 7 + off);
        else {
          let d = addDays(mon, off);
          if (d < t0) d = addDays(d, 7);
          r.day = d;
        }
        period = m[1] || "";
      }) ||
      take(new RegExp("\\s(?:ngày\\s+)?(\\d{1,2})[/.-](\\d{1,2})(?:[/.-](\\d{2,4}))?" + END), (m) => {
        const d = Number(m[1]);
        const mo = Number(m[2]);
        let y = m[3] ? Number(m[3]) : base.getFullYear();
        if (y < 100) y += 2000;
        if (d < 1 || d > 31 || mo < 1 || mo > 12) return;
        let day = `${y}-${pad(mo)}-${pad(d)}`;
        if (!m[3] && day < addDays(t0, -60)) day = `${y + 1}-${pad(mo)}-${pad(d)}`;
        r.day = day;
      }) ||
      take(new RegExp("\\s(?:cuối tháng)" + END, "i"), () => (r.day = addDays(addMonths(t0.slice(0, 8) + "01", 1), -1)));
    // Giờ
    take(new RegExp("\\s(?:lúc\\s*|vào\\s*)?(\\d{1,2})\\s*(?:h|giờ|g|:)\\s*(\\d{1,2})?\\s*(?:p|phút)?\\s*(sáng|trưa|chiều|tối)?" + END, "i"), (m) => {
      let h = Number(m[1]);
      const mi = Number(m[2] || 0);
      const p = (m[3] || period || "").toLowerCase();
      if ((p === "chiều" || p === "tối") && h < 12) h += 12;
      if (p === "trưa" && h < 11) h += 12;
      if (h > 23 || mi > 59) return;
      r.tm = `${pad(h)}:${pad(mi)}`;
    });
    if (!r.tm && period) r.tm = { sáng: "07:30", trưa: "11:30", chiều: "14:00", tối: "19:30" }[period.toLowerCase()] || "";
    r.t = s
      .replace(/\s+(lúc|vào|hạn|ngày|deadline)\s*$/i, " ")
      .replace(/\s+/g, " ")
      .replace(/^[\s,.;:–-]+|[\s,.;:–-]+$/g, "")
      .trim();
    if (r.t) r.t = r.t.charAt(0).toUpperCase() + r.t.slice(1);
    if (r.day) r.hint.push(dayLabel(r.day, false) + (r.tm ? " · " + r.tm : ""));
    if (r.rep) r.hint.push(REP[r.rep]);
    if (r.cat) r.hint.push((catsList.find((c) => c.id === r.cat) || {}).name);
    if (r.imp) r.hint.push("Quan trọng");
    return r;
  }

  /* ---------- Lưu ---------- */
  const path = (uid) => `mine/${uid}/lich`;
  const newId = () => Date.now().toString(36) + u.uid(5);
  async function save(uid, it) {
    const id = it.id || newId();
    const clean = {};
    FIELDS.forEach((f) => {
      const v = it[f];
      if (v === undefined || v === null || v === false || (v === "" && f !== "rem") || (Array.isArray(v) && !v.length)) return;
      if (typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length) return;
      clean[f] = v;
    });
    if (clean.ck) clean.ck = clean.ck.map((c) => ({ t: String(c.t || "").slice(0, 300), x: !!c.x }));
    clean.t = String(clean.t || "").slice(0, 300);
    clean.at = it.at || Date.now();
    clean.up = Date.now();
    await L360.store.set(`${path(uid)}/i/${id}`, clean);
    return id;
  }
  const remove = (uid, id) => L360.store.remove(`${path(uid)}/i/${id}`);
  const setDone = (uid, o, val) =>
    o.it.rep ? L360.store.set(`${path(uid)}/i/${o.it.id}/dn/${o.base}`, val ? Date.now() : null) : L360.store.set(`${path(uid)}/i/${o.it.id}/done`, val ? Date.now() : null);
  const ack = (uid, key) => L360.store.set(`${path(uid)}/ack/${key}`, Date.now());
  const snooze = (uid, key, until) => L360.store.set(`${path(uid)}/sn/${key}`, until);
  // Dọn dấu nhắc cũ hơn 45 ngày.
  function prune(uid, data) {
    const lim = Date.now() - 45 * 86400000;
    const up = {};
    u.entries(data && data.ack).forEach(([k, v]) => v < lim && (up["ack/" + k] = null));
    u.entries(data && data.sn).forEach(([k, v]) => v < Date.now() - 86400000 && (up["sn/" + k] = null));
    if (Object.keys(up).length) L360.store.update(path(uid), up).catch(() => {});
  }

  /* ---------- Xuất lịch (.ics) cho Google Calendar, điện thoại ---------- */
  function ics(data) {
    const esc = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
    const dt = (day, tm) => day.replace(/-/g, "") + (tm ? "T" + tm.replace(":", "") + "00" : "");
    const plus = (tm, mins) => {
      const [h, m] = tm.split(":").map(Number);
      const t = Math.min(23 * 60 + 59, h * 60 + m + mins);
      return pad(Math.floor(t / 60)) + ":" + pad(t % 60);
    };
    const now = new Date();
    const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lesson 360 Studio//Lich//VI", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Lịch Lesson 360°", "X-WR-TIMEZONE:Asia/Ho_Chi_Minh"];
    L.push("BEGIN:VTIMEZONE", "TZID:Asia/Ho_Chi_Minh", "BEGIN:STANDARD", "DTSTART:19700101T000000", "TZOFFSETFROM:+0700", "TZOFFSETTO:+0700", "TZNAME:ICT", "END:STANDARD", "END:VTIMEZONE");
    const TZ = ";TZID=Asia/Ho_Chi_Minh:";
    let n = 0;
    itemsOf(data).forEach((it) => {
      if (!it.day || (it.k === "viec" && !it.rep && it.done)) return;
      n++;
      const c = catOf(data, it.cat);
      L.push("BEGIN:VEVENT", "UID:" + it.id + "@lesson360-studio", "DTSTAMP:" + stamp, "SUMMARY:" + esc((it.k === "viec" ? "[Hạn] " : "") + it.t));
      const last = it.day2 || it.day;
      if (it.tm) {
        const e = it.end && (it.day2 || it.end > it.tm) ? it.end : plus(it.tm, it.k === "lich" ? 60 : 30);
        L.push("DTSTART" + TZ + dt(it.day, it.tm), "DTEND" + TZ + dt(last, e));
      } else L.push("DTSTART;VALUE=DATE:" + dt(it.day), "DTEND;VALUE=DATE:" + dt(addDays(last, 1)));
      if (it.rep) L.push("RRULE:" + { d: "FREQ=DAILY", w: "FREQ=WEEKLY", "2w": "FREQ=WEEKLY;INTERVAL=2", m: "FREQ=MONTHLY" }[it.rep] + (it.until ? ";UNTIL=" + (it.tm ? dt(it.until) + "T165959Z" : dt(it.until)) : ""));
      u.entries(it.ex).forEach(([d]) => L.push(it.tm ? "EXDATE" + TZ + dt(d, it.tm) : "EXDATE;VALUE=DATE:" + dt(d)));
      if (it.loc) L.push("LOCATION:" + esc(it.loc));
      if (it.d) L.push("DESCRIPTION:" + esc(it.d));
      L.push("CATEGORIES:" + esc(c.name));
      remOf(it).forEach((off) => L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + esc(it.t), "TRIGGER:-PT" + (it.tm ? off : Math.max(0, off - 420)) + "M", "END:VALARM"));
      L.push("END:VEVENT");
    });
    L.push("END:VCALENDAR");
    // Gấp dòng dài quá 75 byte theo chuẩn iCalendar.
    const enc = new TextEncoder();
    const fold = (line) => {
      const out = [];
      let cur = "";
      let bytes = 0;
      for (const ch of line) {
        const b = enc.encode(ch).length;
        if (bytes + b > (out.length ? 74 : 75)) {
          out.push(cur);
          cur = "";
          bytes = 0;
        }
        cur += ch;
        bytes += b;
      }
      out.push(cur);
      return out.join("\r\n ");
    };
    return { text: L.map(fold).join("\r\n") + "\r\n", count: n };
  }

  /* ---------- Chuông nhắc và thông báo nhỏ trên mọi trang ---------- */
  const N = { uid: null, data: {}, off: null, timer: null, watchers: [], os: new Set(), pruned: false, t: null };
  const osOn = () => {
    try {
      return localStorage.getItem("l360:nhac:os") === "1" && "Notification" in window && Notification.permission === "granted";
    } catch (e) {
      return false;
    }
  };
  const dt = () => (/che-do=dien-tap/.test(location.search) ? "?che-do=dien-tap" : "");
  const link = (id) => `lich.html${dt()}${dt() ? "&" : "?"}muc=${encodeURIComponent(id)}`;
  function start(t) {
    if (!t || !t.uid || !L360.store) return;
    N.t = t;
    mountBell();
    if (N.uid === t.uid) return refresh();
    N.uid = t.uid;
    if (N.off) N.off();
    N.off = L360.store.on(path(t.uid), (v) => {
      N.data = v || {};
      if (!N.pruned) {
        N.pruned = true;
        prune(t.uid, N.data);
      }
      refresh();
      N.watchers.forEach((cb) => {
        try {
          cb(N.data);
        } catch (e) {
          console.error(e);
        }
      });
    });
    clearInterval(N.timer);
    N.timer = setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", () => !document.hidden && refresh());
  }
  function watch(cb) {
    N.watchers.push(cb);
    if (N.uid) setTimeout(() => cb(N.data), 0);
    return () => (N.watchers = N.watchers.filter((x) => x !== cb));
  }
  function mountBell() {
    if (u.$("#nhBell")) return;
    const um = u.$("#umenu");
    if (!um) return;
    um.insertAdjacentHTML("beforebegin", `<button class="btn sm ghost nh-bell" id="nhBell" title="Lịch & việc sắp đến hạn">${L360.icon("bell")}<span class="nh-badge hidden"></span></button>`);
    u.$("#nhBell").onclick = (e) => {
      e.stopPropagation();
      togglePop();
    };
  }
  function refresh() {
    if (!N.uid) return;
    const now = Date.now();
    const att = attention(N.data, now);
    const b = u.$("#nhBell .nh-badge");
    const n = att.over.length + att.today.length;
    if (b) {
      b.textContent = n > 99 ? "99+" : n;
      b.classList.toggle("hidden", !n);
      b.classList.toggle("over", !!att.over.length);
      u.$("#nhBell").title = n ? `${att.over.length ? att.over.length + " việc quá hạn · " : ""}${att.today.length} việc hôm nay – bấm để xem` : "Lịch & việc sắp đến hạn";
    }
    if (u.$("#nhPop")) drawPop();
    drawStack(alerts(N.data, now), now);
  }
  const kindLabel = (a) => (a.kind === "over" ? "Quá hạn" : a.o.it.k === "viec" ? "Sắp đến hạn" : a.o.it.k === "lich" ? "Sắp diễn ra" : "Nhắc ghi chú");
  function drawStack(list, now) {
    let box = u.$("#nhStack");
    // Đang dạy trực tiếp (màn điều khiển tiết học): chỉ báo ở chuông, không bật thông báo.
    if (u.$("#scr") || document.documentElement.classList.contains("present")) list = [];
    if (!list.length) {
      if (box) box.remove();
      return;
    }
    if (!box) {
      box = document.createElement("div");
      box.id = "nhStack";
      box.className = "nh-stack no-print";
      box.setAttribute("role", "status");
      box.setAttribute("aria-live", "polite");
      document.body.appendChild(box);
    }
    const show = list.slice(0, 3);
    const keys = show.map((a) => a.key).join("|") + "|" + list.length;
    if (box.dataset.keys === keys) {
      u.$$(".nh-when", box).forEach((el, i) => show[i] && (el.textContent = whenLabel(show[i].o) + " · " + rel(show[i].o, now)));
      return;
    }
    box.dataset.keys = keys;
    box.innerHTML =
      show
        .map((a) => {
          const it = a.o.it;
          const c = colorOf(N.data, it);
          const acts =
            it.k === "viec"
              ? `<button class="btn sm ok" data-a="done">${L360.icon("check")} Đã xong</button><button class="btn sm" data-a="${a.kind === "over" ? "tmr" : "1h"}">${a.kind === "over" ? "Nhắc ngày mai" : "Nhắc sau 1 giờ"}</button>`
              : `<button class="btn sm" data-a="ok">Đã biết</button>${it.tm && startMs(a.o) - now > 20 * 60000 ? `<button class="btn sm" data-a="15m">Nhắc sau 15 phút</button>` : ""}`;
          return `<div class="nh-card ${a.kind}" data-key="${u.esc(a.key)}" style="--c:${c}">
            <div class="nh-k">${L360.icon(a.kind === "over" ? "flag" : it.k === "lich" ? "cal" : "bell")}${kindLabel(a)} · ${u.esc(catOf(N.data, it.cat).name)}</div>
            <a class="nh-t" href="${link(it.id)}">${u.esc(it.t || "(Không có tiêu đề)")}</a>
            <div class="nh-when small">${u.esc(whenLabel(a.o) + " · " + rel(a.o, now))}</div>
            <div class="nh-act">${acts}</div>
            <button class="nh-x" data-a="x" title="Tắt nhắc này" aria-label="Tắt nhắc này">×</button></div>`;
        })
        .join("") + (list.length > 3 ? `<button class="nh-more" data-a="pop">+ ${list.length - 3} nhắc khác</button>` : "");
    u.$$("[data-a]", box).forEach(
      (btn) =>
        (btn.onclick = (e) => {
          const act = btn.dataset.a;
          if (act === "pop") return e.stopPropagation(), togglePop(true);
          const card = btn.closest(".nh-card");
          const a = list.find((x) => x.key === card.dataset.key);
          if (!a) return;
          card.classList.add("bye");
          if (act === "done") setDone(N.uid, a.o, true).then(() => u.toast("Đã đánh dấu xong: " + a.o.it.t, "ok"));
          else if (act === "1h") snooze(N.uid, a.key, Date.now() + 3600000);
          else if (act === "15m") snooze(N.uid, a.key, Date.now() + 15 * 60000);
          else if (act === "tmr") snooze(N.uid, a.key, at(addDays(today(), 1), "07:00"));
          else ack(N.uid, a.key);
        })
    );
    // Thông báo của trình duyệt khi đang mở tab khác (nếu thầy cô bật).
    if (document.hidden && osOn())
      show.forEach((a) => {
        if (N.os.has(a.key)) return;
        N.os.add(a.key);
        try {
          const nt = new Notification("Lesson 360° – " + kindLabel(a), { body: `${a.o.it.t}\n${whenLabel(a.o)} · ${rel(a.o)}`, icon: "assets/img/favicon-32.png", tag: a.key });
          nt.onclick = () => (window.focus(), nt.close());
        } catch (e) {}
      });
  }
  function rowHtml(o, now) {
    const it = o.it;
    const st = status(o, now);
    return `<div class="nh-row ${st}" style="--c:${colorOf(N.data, it)}">${
      it.k === "viec" ? `<button class="nh-chk" data-done="${u.esc(o.key)}" title="Đánh dấu đã xong">${L360.icon("box")}</button>` : `<span class="nh-dot"></span>`
    }<a href="${link(it.id)}" class="grow"><b class="ellipsis">${it.imp ? "★ " : ""}${u.esc(it.t || "(Không có tiêu đề)")}</b><span class="tiny muted">${u.esc(whenLabel(o))} · <span class="${st === "over" ? "nh-red" : ""}">${u.esc(rel(o, now))}</span></span></a></div>`;
  }
  function drawPop() {
    const pop = u.$("#nhPop");
    if (!pop) return;
    const now = Date.now();
    const att = attention(N.data, now);
    const sec = (title, arr, cls) => (arr.length ? `<div class="nh-sec ${cls || ""}">${title} <span>${arr.length}</span></div>${arr.slice(0, 8).map((o) => rowHtml(o, now)).join("")}${arr.length > 8 ? `<a class="tiny" href="lich.html${dt()}">… và ${arr.length - 8} mục khác</a>` : ""}` : "");
    const body = sec("Quá hạn", att.over, "red") + sec("Hôm nay", att.today) + sec("7 ngày tới", att.next);
    u.$(".nh-list", pop).innerHTML = body || `<p class="small muted center" style="margin:18px 0">Chưa có việc nào sắp đến hạn.</p>`;
    u.$$("[data-done]", pop).forEach((b) => {
      b.onclick = () => {
        const all = [...att.over, ...att.today, ...att.next];
        const o = all.find((x) => x.key === b.dataset.done);
        if (o) setDone(N.uid, o, true).then(() => u.toast("Đã xong: " + o.it.t, "ok"));
      };
    });
  }
  function togglePop(force) {
    let pop = u.$("#nhPop");
    if (pop && !force) return closePop();
    if (!pop) {
      pop = u.html(`<div class="nh-pop card no-print" id="nhPop" role="dialog" aria-label="Việc sắp đến hạn">
        <div class="row nowrap" style="gap:8px"><b style="font-size:1.02rem">Việc cần chú ý</b><span class="spacer"></span><a class="btn sm" href="lich.html${dt()}">${L360.icon("cal")} Mở lịch</a></div>
        <form class="nh-qa"><input type="text" placeholder="Thêm nhanh: Nộp báo cáo thứ 6 16h" aria-label="Thêm nhanh việc"><button class="btn sm primary" title="Thêm">${L360.icon("plus")}</button></form>
        <div class="tiny muted nh-qp">Gõ kèm ngày giờ: hôm nay, ngày mai, thứ 6, 15/12, 16h30, hằng tuần, #họp</div>
        <div class="nh-list"></div></div>`);
      document.body.appendChild(pop);
      const inp = u.$(".nh-qa input", pop);
      const hint = u.$(".nh-qp", pop);
      inp.oninput = () => {
        const p = parseQuick(inp.value, cats(N.data));
        hint.textContent = inp.value.trim() ? (p.day ? "→ " + KINDS.viec + ": " : "→ Ghi chú") + p.hint.join(" · ") : "Gõ kèm ngày giờ: hôm nay, ngày mai, thứ 6, 15/12, 16h30, hằng tuần, #họp";
      };
      u.$(".nh-qa", pop).onsubmit = async (e) => {
        e.preventDefault();
        const p = parseQuick(inp.value, cats(N.data));
        if (!p.t) return;
        await save(N.uid, { k: p.day ? "viec" : "note", t: p.t, day: p.day, tm: p.tm, rep: p.rep, cat: p.cat || (p.day ? "" : ""), imp: p.imp });
        inp.value = "";
        inp.oninput();
        u.toast(p.day ? "Đã thêm việc: " + p.t : "Đã thêm ghi chú: " + p.t, "ok");
      };
      setTimeout(() => inp.focus(), 30);
      document.addEventListener("click", outside, true);
      document.addEventListener("keydown", esc);
    }
    drawPop();
  }
  function outside(e) {
    const pop = u.$("#nhPop");
    if (pop && !pop.contains(e.target) && !e.target.closest("#nhBell") && !e.target.closest(".nh-stack")) closePop();
  }
  function esc(e) {
    if (e.key === "Escape") closePop();
  }
  function closePop() {
    const pop = u.$("#nhPop");
    if (pop) pop.remove();
    document.removeEventListener("click", outside, true);
    document.removeEventListener("keydown", esc);
  }

  L360.Lich = {
    PALETTE,
    CATS,
    KINDS,
    REM,
    REP,
    WD,
    WDS,
    iso,
    D,
    today,
    addDays,
    addMonths,
    diffDays,
    mondayOf,
    at,
    dmy,
    norm,
    itemsOf,
    cats,
    catOf,
    colorOf,
    remOf,
    occurrences,
    isDone,
    startMs,
    dueMs,
    endMs,
    status,
    rel,
    dayLabel,
    whenLabel,
    fires,
    alerts,
    attention,
    parseQuick,
    path,
    newId,
    save,
    remove,
    setDone,
    ack,
    snooze,
    ics
  };
  L360.Nhac = { start, watch, refresh, osOn, get data() { return N.data; }, get uid() { return N.uid; } };
})();
