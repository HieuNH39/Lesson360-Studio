/* Chương trình – Bộ SGK thống nhất: cấp học → môn → lớp → sách → bài (kèm trang SGK để mở đúng trang),
   video EduHistory Studio cho môn Lịch sử. Dữ liệu mục lục ở js/data/sgk.js, video ở js/data/eduhistory.js. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const TH = "https://taphuan.nxbgd.vn/tap-huan/doc-sach/";

  const levels = [
    { id: "thcs", name: "THCS", grades: [6, 7, 8, 9] },
    { id: "thpt", name: "THPT", grades: [10, 11, 12] }
  ];
  // Môn đang triển khai (tổ Khoa học xã hội).
  const subjects = [
    { id: "ngu-van", name: "Ngữ văn", icon: "book", color: "#E9844A", levels: ["thcs", "thpt"] },
    { id: "lich-su", name: "Lịch sử", thcsName: "Lịch sử và Địa lí – phân môn Lịch sử", icon: "flag", color: "#9C6B30", levels: ["thcs", "thpt"] },
    { id: "dia-li", name: "Địa lí", thcsName: "Lịch sử và Địa lí – phân môn Địa lí", icon: "globe", color: "#0C9A9A", levels: ["thcs", "thpt"] },
    { id: "gdcd", name: "Giáo dục công dân", icon: "users", color: "#2F7D4F", levels: ["thcs"] },
    { id: "gdktpl", name: "Giáo dục Kinh tế và Pháp luật", icon: "layers", color: "#1B6CA8", levels: ["thpt"] },
    { id: "gddp", name: "Giáo dục địa phương", icon: "pin", color: "#B3372B", levels: ["thcs", "thpt"], note: "Gộp tài liệu GDĐP tỉnh Bắc Giang và tỉnh Bắc Ninh (chưa có tài liệu thống nhất sau sáp nhập)." }
  ];
  // Môn mở rộng sau khi dự án đạt giải (hiện sẵn để thấy hướng phát triển).
  const future = {
    thcs: ["Toán", "Khoa học tự nhiên", "Tiếng Anh", "Tin học", "Công nghệ", "Hoạt động trải nghiệm, hướng nghiệp", "Giáo dục thể chất", "Âm nhạc", "Mĩ thuật"],
    thpt: ["Toán", "Vật lí", "Hoá học", "Sinh học", "Tiếng Anh", "Tin học", "Công nghệ", "Hoạt động trải nghiệm, hướng nghiệp", "Giáo dục thể chất", "Giáo dục quốc phòng và an ninh", "Âm nhạc", "Mĩ thuật"]
  };
  // Mọi sách của các môn trên trong Bộ SGK thống nhất (đường dẫn đọc sách của NXB Giáo dục Việt Nam).
  const R = [
    ["nv-6-1", 6, "ngu-van", "Ngữ văn 6, tập một", "sgk-ngu-van-6-tap-mot.4699839775"],
    ["nv-6-2", 6, "ngu-van", "Ngữ văn 6, tập hai", "sgk-ngu-van-6-tap-hai.4699846798"],
    ["nv-7-1", 7, "ngu-van", "Ngữ văn 7, tập một", "sgk-ngu-van-7-tap-mot.4699959987"],
    ["nv-7-2", 7, "ngu-van", "Ngữ văn 7, tập hai", "sgk-ngu-van-7-tap-hai.4700000210"],
    ["nv-8-1", 8, "ngu-van", "Ngữ văn 8, tập một", "sgk-ngu-van-8-tap-mot.4700073646"],
    ["nv-8-2", 8, "ngu-van", "Ngữ văn 8, tập hai", "sgk-ngu-van-8-tap-hai.4700085484"],
    ["nv-9-1", 9, "ngu-van", "Ngữ văn 9, tập một", "sgk-ngu-van-9-tap-mot.4700220434"],
    ["nv-9-2", 9, "ngu-van", "Ngữ văn 9, tập hai", "sgk-ngu-van-9-tap-hai.4714685580"],
    ["nv-10-1", 10, "ngu-van", "Ngữ văn 10, tập một", "sgk-ngu-van-10-tap-mot.21113"],
    ["nv-10-2", 10, "ngu-van", "Ngữ văn 10, tập hai", "sgk-ngu-van-10-tap-hai.4700663155"],
    ["cdnv-10", 10, "ngu-van", "Chuyên đề học tập Ngữ văn 10", "sgk-chuyen-de-hoc-tap-ngu-van-10.4700668351"],
    ["nv-11-1", 11, "ngu-van", "Ngữ văn 11, tập một", "sgk-ngu-van-11-tap-mot.4701014733"],
    ["nv-11-2", 11, "ngu-van", "Ngữ văn 11, tập hai", "sgk-ngu-van-11-tap-hai.4701023518"],
    ["cdnv-11", 11, "ngu-van", "Chuyên đề học tập Ngữ văn 11", "sgk-chuyen-de-hoc-tap-ngu-van-11.4701039764"],
    ["nv-12-1", 12, "ngu-van", "Ngữ văn 12, tập một", "sgk-ngu-van-12-tap-mot.4701645717"],
    ["nv-12-2", 12, "ngu-van", "Ngữ văn 12, tập hai", "sgk-ngu-van-12-tap-hai.4701652341"],
    ["cdnv-12", 12, "ngu-van", "Chuyên đề học tập Ngữ văn 12", "sgk-chuyen-de-hoc-tap-ngu-van-12.4701659743"],
    ["lsdl-6", 6, "lsdl", "Lịch sử và Địa lí 6", "sgk-lich-su-va-dia-li-6.4830326427"],
    ["lsdl-7", 7, "lsdl", "Lịch sử và Địa lí 7", "sgk-lich-su-va-dia-li-7.4830359644"],
    ["lsdl-8", 8, "lsdl", "Lịch sử và Địa lí 8", "sgk-lich-su-dia-li-8.4830375637"],
    ["lsdl-9", 9, "lsdl", "Lịch sử và Địa lí 9", "sgk-lich-su-va-dia-li-9.4844021301"],
    ["gdcd-6", 6, "gdcd", "Giáo dục công dân 6", "sgk-giao-duc-cong-dan-6.4726791109"],
    ["gdcd-7", 7, "gdcd", "Giáo dục công dân 7", "sgk-giao-duc-cong-dan-7.4726822635"],
    ["gdcd-8", 8, "gdcd", "Giáo dục công dân 8", "sgk-giao-duc-cong-dan-8.4726856411"],
    ["gdcd-9", 9, "gdcd", "Giáo dục công dân 9", "sgk-giao-duc-cong-dan-9.4714947143"],
    ["ls-10", 10, "lich-su", "Lịch sử 10", "sgk-lich-su-10.4755748913"],
    ["cdls-10", 10, "lich-su", "Chuyên đề học tập Lịch sử 10", "sgk-chuyen-de-hoc-tap-lich-su-10.4755634780"],
    ["ls-11", 11, "lich-su", "Lịch sử 11", "sgk-lich-su-11.4720315375"],
    ["cdls-11", 11, "lich-su", "Chuyên đề học tập Lịch sử 11", "sgk-chuyen-de-hoc-tap-lich-su-11.4720332514"],
    ["ls-12", 12, "lich-su", "Lịch sử 12", "sgk-lich-su-12.4714903732"],
    ["cdls-12", 12, "lich-su", "Chuyên đề học tập Lịch sử 12", "sgk-chuyen-de-hoc-tap-lich-su-12.4701661756"],
    ["dl-10", 10, "dia-li", "Địa lí 10", "sgk-dia-li-10.4700970617"],
    ["cddl-10", 10, "dia-li", "Chuyên đề học tập Địa lí 10", "sgk-chuyen-de-hoc-tap-dia-li-10.4700990179"],
    ["dl-11", 11, "dia-li", "Địa lí 11", "sgk-dia-li-11.4720361879"],
    ["cddl-11", 11, "dia-li", "Chuyên đề học tập Địa lí 11", "sgk-chuyen-de-hoc-tap-dia-li-11.4720281603"],
    ["dl-12", 12, "dia-li", "Địa lí 12", "sgk-dia-li-12.4847747175"],
    ["cddl-12", 12, "dia-li", "Chuyên đề học tập Địa lí 12", "sgk-chuyen-de-hoc-tap-dia-li-12.4755858537"],
    ["ktpl-10", 10, "gdktpl", "Giáo dục Kinh tế và Pháp luật 10", "sgk-giao-duc-kinh-te-va-phap-luat-10.4756644900"],
    ["cdktpl-10", 10, "gdktpl", "Chuyên đề học tập GDKT và PL 10", "sgk-chuyen-de-hoc-tap-giao-duc-kinh-te-va-phap-luat-10.4715360345"],
    ["ktpl-11", 11, "gdktpl", "Giáo dục Kinh tế và Pháp luật 11", "sgk-giao-duc-kinh-te-va-phap-luat-11.4720430286"],
    ["cdktpl-11", 11, "gdktpl", "Chuyên đề học tập GDKT và PL 11", "sgk-chuyen-de-hoc-tap-giao-duc-kinh-te-va-phap-luat-11.4720833913"],
    ["ktpl-12", 12, "gdktpl", "Giáo dục Kinh tế và Pháp luật 12", "sgk-giao-duc-kinh-te-va-phap-luat-12.4714912573"],
    ["cdktpl-12", 12, "gdktpl", "Chuyên đề học tập GDKT và PL 12", "sgk-chuyen-de-hoc-tap-giao-duc-kinh-te-va-phap-luat-12.4714920788"]
  ];
  const sgk = Object.fromEntries((window.L360_SGK || []).map((b) => [b.id, b]));
  const books = {};
  R.forEach(([id, grade, subject, title, slug]) => {
    const s = sgk[id] || {};
    books[id] = { id, grade, subject, title, reader: TH + slug, off: s.off != null ? s.off : null, items: s.items || [], cd: id.startsWith("cd") };
  });

  (window.L360_SGK || []).filter((b) => b.subject === "gddp").forEach((b) => (books[b.id] = Object.assign({ cd: false, reader: "", local: true }, b, { reader: "" })));

  /* ---------- EduHistory Studio (video Lịch sử 6–9) ---------- */
  const onPages = /(^|\.)hieunh39\.github\.io$/.test(location.hostname);
  const EDU = onPages ? "/EduHistory-Studio/" : "https://hieunh39.github.io/EduHistory-Studio/";
  let edu = window.L360_EDU || { bai: [], tap: [] };
  const eduTap = () => Object.fromEntries((edu.tap || []).map((t) => [t[0], { ma: t[0], bai: t[1], ten: t[2], sec: t[3], doc: !!t[4], hoi: t[5], co: !!t[6] }]));
  let tapMap = eduTap();
  const Edu = {
    base: EDU,
    home: EDU,
    video: (ma) => `${EDU}videos/${ma}.mp4`,
    page: (ma) => `${EDU}tap/${ma}.html`,
    poster: (ma) => `${EDU}du-lieu/anh-bia/${ma}.jpg`,
    tap: (ma) => tapMap[ma] || null,
    forBai: (baiId) => (edu.tap || []).filter((t) => t[1] === baiId && t[6]).map((t) => tapMap[t[0]]),
    // Đọc bản mới nhất (thêm video mới không cần cập nhật Lesson 360).
    async refresh() {
      try {
        const r = await fetch(EDU + "du-lieu/thu-vien.json", { cache: "no-cache" });
        if (!r.ok) return;
        const T = await r.json();
        edu = {
          bai: T.bai.map((b) => [b.id, b.lop, b.nhan, b.ten, b.chuong, b.trang_in]),
          tap: T.tap.map((t) => [t.ma, t.bai, t.ten_tap, Math.round((t.video && t.video.thoi_luong) || 0), t.huong === "doc" ? 1 : 0, t.so_cau_hoi || 0, t.trang_thai === "co-video" ? 1 : 0])
        };
        tapMap = eduTap();
        buildLsdl();
      } catch (e) {}
    }
  };
  L360.Edu = Edu;

  // Phần Lịch sử trong SGK Lịch sử và Địa lí 6–9: lấy mục lục từ EduHistory (đã đối chiếu số trang in).
  const lsParts = {};
  function buildLsdl() {
    [6, 7, 8, 9].forEach((g) => {
      const items = [];
      let ch = null;
      (edu.bai || [])
        .filter((b) => b[1] === g)
        .forEach((b) => {
          if (b[4] && b[4] !== ch) {
            ch = b[4];
            items.push(["C", ch, null]);
          }
          const so = String(b[2]).replace(/^Bài\s*/i, "");
          items.push(["B", /^Chủ đề/i.test(b[2]) ? b[2] : so, b[3], b[5], b[0]]);
        });
      lsParts[g] = items;
    });
  }
  buildLsdl();

  /* ---------- Bài học ---------- */
  const lessonKey = (bookId, so) => `${bookId}:${so}`;
  // Danh sách sách cho một môn – lớp (phân môn của sách LS&ĐL được tách riêng).
  function booksFor(subject, grade) {
    grade = Number(grade);
    if (grade <= 9 && (subject === "lich-su" || subject === "dia-li")) {
      const b = books["lsdl-" + grade];
      if (!b) return [];
      if (subject === "lich-su") return [Object.assign({}, b, { id: b.id, part: "ls", title: b.title + " – phần Lịch sử", items: lsParts[grade] || [] })];
      const dl = (sgk["lsdl-dl-" + grade] || {}).items || [];
      return [Object.assign({}, b, { part: "dl", title: b.title + " – phần Địa lí", items: dl, off: (sgk["lsdl-dl-" + grade] || {}).off != null ? sgk["lsdl-dl-" + grade].off : b.off })];
    }
    if (subject === "gddp")
      return (window.L360_SGK || [])
        .filter((b) => b.subject === "gddp" && b.grade === grade)
        .map((b) => Object.assign({ cd: false, reader: "", local: true }, b, { reader: "" }));
    return u
      .vals(books)
      .filter((b) => b.subject === subject && b.grade === grade)
      .sort((a, b) => (a.cd ? 1 : 0) - (b.cd ? 1 : 0) || a.id.localeCompare(b.id));
  }
  function lessonsOfBook(b) {
    const out = [];
    let chuong = "";
    (b.items || []).forEach((it) => {
      if (it[0] === "C") chuong = it[1];
      else {
        const so = String(it[1]);
        const keySo = b.part ? `${b.part}-${so}` : so;
        const isCd = /^CĐ/.test(so) || /^Chủ đề/.test(so);
        out.push({
          key: lessonKey(b.id, keySo),
          bookId: b.id,
          part: b.part || "",
          so,
          ten: it[2],
          trang: it[3],
          edu: it[4] || null,
          chuong,
          label: so === "Chủ đề" ? `Chủ đề. ${it[2]}` : isCd ? `${so.replace(/^CĐ\s*/, "Chuyên đề ")}. ${it[2]}` : /^\d/.test(so) ? `Bài ${so}. ${it[2]}` : it[2]
        });
      }
    });
    return out;
  }
  const Curr = {
    levels,
    subjects,
    future,
    books,
    subject: (id) => subjects.find((s) => s.id === id) || null,
    subjectName(id, grade) {
      const s = Curr.subject(id);
      if (!s) return id || "";
      return Number(grade) <= 9 && s.thcsName ? s.thcsName : s.name;
    },
    levelOf: (grade) => (Number(grade) <= 9 ? "thcs" : "thpt"),
    gradesFor(subjectId) {
      const s = Curr.subject(subjectId);
      if (!s) return [];
      return levels.filter((l) => s.levels.includes(l.id)).flatMap((l) => l.grades);
    },
    booksFor,
    lessons(subject, grade) {
      return booksFor(subject, grade).map((b) => ({ book: b, lessons: lessonsOfBook(b) }));
    },
    lesson(key) {
      if (!key) return null;
      const [bookId, so] = String(key).split(":");
      const base = books[bookId];
      if (!base) return null;
      const part = so && /^(ls|dl)-/.test(so) ? so.slice(0, 2) : "";
      const subj = base.subject === "lsdl" ? (part === "dl" ? "dia-li" : "lich-su") : base.subject;
      const list = booksFor(subj, base.grade).flatMap(lessonsOfBook);
      const l = list.find((x) => x.key === key);
      return l ? Object.assign({ subject: subj, grade: base.grade, bookTitle: base.title }, l) : null;
    },
    // Đường dẫn mở đúng trang SGK (nếu đã đo độ lệch trang của sách).
    sgkUrl(bookId, trang) {
      const b = books[bookId];
      if (!b) return "";
      const part = typeof trang === "object" ? trang : null;
      const p = part ? part.trang : trang;
      const off = part && part.off != null ? part.off : b.off;
      if (p != null && off != null) return `${b.reader}#page=${Math.max(0, p + off)}`;
      return b.reader;
    },
    lessonUrl(l) {
      if (!l) return "";
      const b = booksFor(l.subject || (books[l.bookId] || {}).subject, (books[l.bookId] || {}).grade).find((x) => x.id === l.bookId && (x.part || "") === (l.part || ""));
      const off = b ? b.off : (books[l.bookId] || {}).off;
      return Curr.sgkUrl(l.bookId, { trang: l.trang, off });
    },
    eduVideos: (l) => (l && l.edu ? Edu.forBai(l.edu) : [])
  };
  L360.Curr = Curr;

  /* ---------- Nguồn video (EduHistory, YouTube, tệp mp4) ---------- */
  L360.videoSource = (b) => {
    const src = (b && (b.edu || b.src || b.url || b.youtube)) || "";
    const t = Number(b && b.start) || 0;
    const t2 = Number(b && b.end) || 0;
    const edm = String(src).match(/^L\d-[A-Z0-9]+-\d{2}$/i) || (b && b.edu);
    if (edm) {
      const ma = b.edu || src;
      const tp = Edu.tap(ma) || {};
      return {
        kind: "mp4",
        url: Edu.video(ma),
        page: Edu.page(ma),
        poster: Edu.poster(ma),
        vertical: tp.doc !== false,
        title: tp.ten || ma,
        embed: `<video src="${u.esc(Edu.video(ma))}" poster="${u.esc(Edu.poster(ma))}" playsinline controls preload="metadata"></video>`
      };
    }
    const yt = String(src).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
    if (yt)
      return {
        kind: "youtube",
        id: yt[1],
        url: `https://www.youtube.com/watch?v=${yt[1]}`,
        page: `https://www.youtube.com/watch?v=${yt[1]}${t ? "&t=" + t : ""}`,
        poster: `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`,
        embed: `<iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&enablejsapi=1${t ? "&start=" + t : ""}${t2 > t ? "&end=" + t2 : ""}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
      };
    if (/\.(mp4|webm)(\?|$)/i.test(src)) return { kind: "mp4", url: src, page: src, embed: `<video src="${u.esc(src)}" playsinline controls preload="metadata"></video>` };
    return { kind: "link", url: src, page: src };
  };
})();
