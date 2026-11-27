/* Kế hoạch bài dạy (KHBD) theo Phụ lục IV – Công văn 5512/BGDĐT-GDTrH,
   tích hợp Năng lực số (Thông tư 02/2025/TT-BGDĐT, hướng dẫn tại CV 3456/BGDĐT-GDPT)
   và Năng lực trí tuệ nhân tạo (Quyết định 2422/QĐ-BGDĐT).
   Định dạng dữ liệu: "l360-khbd/1". Một mô hình trang dùng chung cho xem trước (HTML) và tệp Word (.docx),
   bám mẫu giáo án của tổ: A4, lề T2/D2/P2/T2,5 cm, Times New Roman 13, chân trang mã biểu mẫu + số trang. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const arr = (x) => (Array.isArray(x) ? x : x == null || x === "" ? [] : [x]);
  const str = (x) => (x == null ? "" : String(x));

  /* ---------- Danh mục chuẩn ---------- */
  // Khung năng lực số: 6 miền, 24 năng lực thành phần.
  const NLS = [
    { id: "1", ten: "Khai thác dữ liệu và thông tin", items: [["1.1", "Duyệt, tìm kiếm và lọc dữ liệu, thông tin và nội dung số"], ["1.2", "Đánh giá dữ liệu, thông tin và nội dung số"], ["1.3", "Quản lí dữ liệu, thông tin và nội dung số"]] },
    {
      id: "2",
      ten: "Giao tiếp và hợp tác",
      items: [["2.1", "Tương tác thông qua công nghệ số"], ["2.2", "Chia sẻ thông qua công nghệ số"], ["2.3", "Sử dụng công nghệ số để thực hiện trách nhiệm công dân"], ["2.4", "Hợp tác thông qua công nghệ số"], ["2.5", "Quy tắc ứng xử trên mạng"], ["2.6", "Quản lí danh tính số"]]
    },
    { id: "3", ten: "Sáng tạo nội dung số", items: [["3.1", "Phát triển nội dung số"], ["3.2", "Tích hợp và tinh chỉnh nội dung số"], ["3.3", "Thực thi bản quyền và giấy phép"], ["3.4", "Lập trình"]] },
    { id: "4", ten: "An toàn", items: [["4.1", "Bảo vệ thiết bị"], ["4.2", "Bảo vệ dữ liệu cá nhân và quyền riêng tư"], ["4.3", "Bảo vệ sức khoẻ và an sinh số"], ["4.4", "Bảo vệ môi trường"]] },
    { id: "5", ten: "Giải quyết vấn đề", items: [["5.1", "Giải quyết các vấn đề kĩ thuật"], ["5.2", "Xác định nhu cầu và giải pháp công nghệ"], ["5.3", "Sử dụng sáng tạo công nghệ số"], ["5.4", "Xác định các vấn đề cần cải thiện về năng lực số"]] },
    { id: "6", ten: "Ứng dụng trí tuệ nhân tạo", items: [["6.1", "Hiểu biết về trí tuệ nhân tạo"], ["6.2", "Sử dụng trí tuệ nhân tạo"], ["6.3", "Đánh giá trí tuệ nhân tạo"]] }
  ];
  const NLS_LEVEL = (g) => {
    g = Number(g) || 10;
    return g <= 2 ? "CB1" : g <= 5 ? "CB2" : g <= 7 ? "TC1" : g <= 9 ? "TC2" : "NC1";
  };
  const LEVEL_NAME = { CB1: "Cơ bản 1", CB2: "Cơ bản 2", TC1: "Trung cấp 1", TC2: "Trung cấp 2", NC1: "Nâng cao 1" };
  // Bốn miền năng lực AI (QĐ 2422/QĐ-BGDĐT).
  const AI = [
    { ma: "NLa", ten: "Tư duy lấy con người làm trung tâm" },
    { ma: "NLb", ten: "Đạo đức AI" },
    { ma: "NLc", ten: "Các kĩ thuật và ứng dụng AI" },
    { ma: "NLd", ten: "Thiết kế hệ thống AI" }
  ];
  const nlsName = (ma) => {
    const c = String(ma).split(".").slice(0, 2).join(".");
    for (const d of NLS) for (const [a, b] of d.items) if (a === c) return b;
    return "";
  };
  const CHUNG = ["Tự chủ và tự học", "Giao tiếp và hợp tác", "Giải quyết vấn đề và sáng tạo"];
  const PHAM_CHAT = ["Yêu nước", "Nhân ái", "Chăm chỉ", "Trung thực", "Trách nhiệm"];
  const DAC_THU = {
    "lich-su": { ten: "Năng lực lịch sử", items: ["Tìm hiểu lịch sử", "Nhận thức và tư duy lịch sử", "Vận dụng kiến thức, kĩ năng đã học"] },
    "dia-li": { ten: "Năng lực địa lí", items: ["Nhận thức khoa học địa lí", "Tìm hiểu địa lí", "Vận dụng kiến thức, kĩ năng đã học"] },
    "ngu-van": { ten: "Năng lực đặc thù", items: ["Năng lực ngôn ngữ", "Năng lực văn học"] },
    gdcd: { ten: "Năng lực đặc thù", items: ["Năng lực điều chỉnh hành vi", "Năng lực phát triển bản thân", "Năng lực tìm hiểu và tham gia hoạt động kinh tế – xã hội"] },
    gdktpl: { ten: "Năng lực đặc thù", items: ["Năng lực điều chỉnh hành vi", "Năng lực phát triển bản thân", "Năng lực tìm hiểu và tham gia hoạt động kinh tế – xã hội"] },
    gddp: { ten: "Năng lực đặc thù", items: [] }
  };
  const BUOC = ["Bước 1. Chuyển giao nhiệm vụ", "Bước 2. Thực hiện nhiệm vụ", "Bước 3. Báo cáo, thảo luận", "Bước 4. Kết luận, nhận định"];
  const HD_NAME = {
    "khoi-dong": "MỞ ĐẦU (KHỞI ĐỘNG)",
    "hinh-thanh": "HÌNH THÀNH KIẾN THỨC MỚI",
    "luyen-tap": "LUYỆN TẬP",
    "van-dung": "VẬN DỤNG"
  };
  const FOOTER_CODE = "04.07-BM//ĐT/HDCV/FE-FSC";
  const C = { nls: "C00000", ai: "00803C", head: "1F3864", headBg: "DCE6F1", tblHead: "D9E2F3", tblLine: "808080", sumHead: "FBE9D0", sumLine: "C8A15A", sumCol: "FDF6EA" };

  /* ---------- Chuẩn hoá ---------- */
  function normalize(raw) {
    const k = u.clone(raw) || {};
    k.schema = "l360-khbd/1";
    const cfg = L360.cfg || {};
    k.truong = str(k.truong || String(cfg.school || "").replace(/^Trường\s*/i, ""));
    k.to = str(k.to || String(cfg.unit || "").replace(/^Tổ\s*/i, ""));
    k.giaoVien = str(k.giaoVien || (L360.Auth && L360.Auth.teacher && L360.Auth.teacher.name) || "");
    k.tenBai = str(k.tenBai);
    k.mon = str(k.mon);
    k.lop = str(k.lop);
    k.thoiGian = str(k.thoiGian);
    const m = (k.mucTieu = Object.assign({}, k.mucTieu));
    m.kienThuc = arr(m.kienThuc).map(str);
    m.nangLucChung = arr(m.nangLucChung).map(pair);
    m.dacThu = Object.assign({ ten: "Năng lực đặc thù", items: [] }, m.dacThu || {});
    m.dacThu.items = arr(m.dacThu.items).map(pair);
    m.nls = Object.assign({ muc: "", items: [] }, m.nls || {});
    m.nls.items = arr(m.nls.items).map((x) => (typeof x === "string" ? { ma: "", ten: "", nd: x } : { ma: str(x.ma), ten: str(x.ten), nd: str(x.nd) }));
    m.ai = arr(m.ai).map((x) => (typeof x === "string" ? { ma: "", ten: "", code: "", nd: x } : { ma: str(x.ma), ten: str(x.ten), code: str(x.code), nd: str(x.nd) }));
    m.phamChat = arr(m.phamChat).map(pair);
    const t = (k.thietBi = Object.assign({}, k.thietBi));
    t.giaoVien = arr(t.giaoVien).map(str);
    t.hocSinh = arr(t.hocSinh).map(str);
    t.hocLieuSo = arr(t.hocLieuSo).map((x) => ({ ten: str(x.ten), thoiLuong: str(x.thoiLuong), suDung: str(x.suDung) }));
    t.moRong = arr(t.moRong).map((x) => ({ ten: str(x.ten), url: str(x.url) }));
    k.toTruong = str(k.toTruong || cfg.toTruong || "");
    k.tiet = arr(k.tiet).map((ti, i) => {
      const vn = ti.veNha && typeof ti.veNha === "object" && !Array.isArray(ti.veNha) ? ti.veNha : { tasks: ti.veNha };
      return { ten: str(ti.ten || `TIẾT ${i + 1}`), hoatDong: arr(ti.hoatDong).map(hd), veNha: { tasks: arr(vn.tasks).map(str).filter(Boolean), prepare: str(vn.prepare) } };
    });
    k.phuLuc = arr(k.phuLuc).map((p) => ({ ten: str(p.ten), moTa: str(p.moTa), items: arr(p.items).map(str), bang: table(p.bang), dapAn: table(p.dapAn) }));
    // Rải đều đáp án đúng A/B/C/D cho mọi câu hỏi của giáo án (ổn định – Word, PowerPoint, dạy online khớp nhau).
    if (L360.balanceMcq) L360.balanceMcq(allQuestions(k), k.tenBai);
    return k;
  }
  function allQuestions(k) {
    const out = [];
    const take = (x) => {
      if (!x) return;
      out.push(...arr(x.cauHoi));
      arr(x.tuongTac).forEach((s) => s && typeof s === "object" && out.push(...arr(s.questions)));
    };
    k.tiet.forEach((ti) =>
      ti.hoatDong.forEach((h) => {
        take(h);
        h.nhiemVu.forEach(take);
        h.muc.forEach((m) => m.nhiemVu.forEach(take));
      })
    );
    return out;
  }
  function pair(x) {
    if (typeof x === "string") {
      const i = x.indexOf(":");
      return i > 0 && i < 60 ? { ten: x.slice(0, i).trim(), nd: x.slice(i + 1).trim() } : { ten: "", nd: x };
    }
    return { ten: str(x && x.ten), nd: str(x && x.nd) };
  }
  function table(b) {
    if (!b || typeof b !== "object") return null;
    const dong = arr(b.dong).map((r) => arr(r).map(str));
    if (!dong.length && !b.tieuDe) return null;
    return { tieuDe: str(b.tieuDe), cot: arr(b.cot).map(str), dong };
  }
  function buoc(b) {
    const a = arr(b).slice(0, 4).map((x) => arr(x).map(str));
    while (a.length && a.length < 4) a.push([]);
    return a;
  }
  function expr(list) {
    return arr(list).map((x) => (typeof x === "string" ? { ma: "", nd: x } : { ma: str(x.ma), nd: str(x.nd) }));
  }
  function chot(c) {
    if (!c) return null;
    return { slide: str(c.slide), phut: str(c.phut), items: arr(c.items).map(str), bang: table(c.bang) };
  }
  // "trinhChieu" (trang chiếu cho học sinh) và "cauHoi" (câu hỏi tương tác) dùng để dựng PowerPoint từ giáo án.
  const slidesOf = (x) => arr(x && x.trinhChieu).filter((pg) => pg && typeof pg === "object");
  const qsOf = (x) => arr(x && x.cauHoi).filter((q) => q && typeof q === "object");
  // "tuongTac": hoạt động/trò chơi tương tác (gói Lesson 360°) gắn với hoạt động/nhiệm vụ – dựng thành bước dạy và trang PowerPoint.
  const actsOf = (x) => arr(x && x.tuongTac).filter((a) => a && typeof a === "object" && a.type && L360.types && L360.types[a.type] && a.type !== "slide");
  function nv(x) {
    return { ten: str(x.ten), phut: str(x.phut), slide: str(x.slide), buoc: buoc(x.buoc), nls: expr(x.nls), ai: expr(x.ai), chot: chot(x.chot), trinhChieu: slidesOf(x), cauHoi: qsOf(x), tuongTac: actsOf(x) };
  }
  function hd(x) {
    return {
      ten: str(x.ten),
      phut: str(x.phut),
      mucTieu: x.mucTieu,
      noiDung: x.noiDung,
      sanPham: x.sanPham,
      slide: str(x.slide),
      buoc: x.buoc ? buoc(x.buoc) : null,
      nhiemVu: arr(x.nhiemVu).map(nv),
      muc: arr(x.muc).map((m) => ({ ten: str(m.ten), nhiemVu: arr(m.nhiemVu).map(nv), chot: chot(m.chot), trinhChieu: slidesOf(m) })),
      nls: expr(x.nls),
      ai: expr(x.ai),
      chot: chot(x.chot),
      trinhChieu: slidesOf(x),
      cauHoi: qsOf(x),
      tuongTac: actsOf(x)
    };
  }

  /* ---------- Mô hình trang (dùng chung HTML/Word) ---------- */
  // Chuỗi có thể chứa **đậm** và *nghiêng*; xuống dòng bằng \n.
  // Giáo án theo mẫu của Bộ: không ghi số slide, số phút trong nội dung.
  const noMeta = (t) =>
    String(t == null ? "" : t)
      .replace(/\s*[[(]\s*(?:slide|slides|trang chiếu)\s*\d+(?:\s*[-–,]\s*\d+)*\s*[\])]/gi, "")
      .replace(/\s*[[(]\s*\d+(?:\s*[-–]\s*\d+)?\s*phút\s*[\])]/gi, "")
      .replace(/\s*[–-]\s*\d+(?:\s*[-–]\s*\d+)?\s*phút\s*$/i, "");
  function runs(s, base) {
    base = base || {};
    const out = [];
    noMeta(s)
      .split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/)
      .forEach((part) => {
        if (!part) return;
        if (/^\*\*[^*]+\*\*$/.test(part)) out.push(Object.assign({}, base, { text: part.slice(2, -2), b: true }));
        else if (/^\*[^*]+\*$/.test(part)) out.push(Object.assign({}, base, { text: part.slice(1, -1), i: true }));
        else out.push(Object.assign({}, base, { text: part }));
      });
    return out;
  }
  const R = (text, o) => Object.assign({ text: noMeta(str(text)) }, o || {});

  function build(raw) {
    const k = normalize(raw);
    const M = [];
    const P = (rs, o) => M.push(Object.assign({ t: "p", runs: rs, align: "both", after: 60 }, o || {}));
    const H1 = (t) => P([R(t, { b: true })], { align: "left", before: 160, after: 80, keep: true });
    const H2 = (t) => P([R(t, { b: true })], { align: "left", before: 80, after: 60, keep: true });
    // Mỗi dòng (\n) trong một ý thành một gạch đầu dòng riêng (tránh dãn chữ khi căn đều).
    const LI = (rs, o) => {
      let cur = [];
      const flush = () => {
        if (cur.length && cur.some((r) => r.text.trim())) M.push(Object.assign({ t: "li", runs: cur }, o || {}));
        cur = [];
      };
      rs.forEach((r) =>
        String(r.text)
          .split("\n")
          .forEach((part, i) => {
            if (i) flush();
            const t = i || !cur.length ? part.replace(/^\s*[-•]\s+/, "") : part;
            if (t) cur.push(Object.assign({}, r, { text: t }));
          })
      );
      flush();
    };
    const LBL = (label, text) => (text ? [R(label + ": ", { b: true })].concat(runs(text)) : [R(label, { b: true })]);
    const field = (label, v) => {
      if (v == null || v === "") return;
      if (Array.isArray(v)) {
        P([R(label + ":", { b: true })], { after: 40, keep: true });
        v.forEach((x) => LI(runs(x)));
      } else P([R(label + ": ", { b: true })].concat(runs(v)));
    };
    const steps = (b) => {
      if (!b) return;
      b.forEach((lines, i) => {
        if (!lines.length) return;
        P([R(BUOC[i], { b: true })], { align: "left", before: 80, after: 40, keep: true });
        lines.forEach((x) => LI(runs(x)));
      });
    };
    const exprs = (list, kind) =>
      list.forEach((e) => {
        const col = kind === "nls" ? C.nls : C.ai;
        const lab = kind === "nls" ? "Biểu hiện năng lực số" : "Biểu hiện năng lực AI";
        P([R(`${lab}${e.ma ? ` (${e.ma})` : ""}: `, { b: true, color: col })].concat(runs(e.nd, { color: col })), { indent: 284 });
      });
    const chotBlock = (c) => {
      if (!c) return;
      P([R("Chốt kiến thức – ghi bài:", { b: true })], { before: 80, keep: true });
      c.items.forEach((x) => LI(runs(x)));
      if (c.bang) {
        const cols = c.bang.dong.reduce((m, r) => Math.max(m, r.length), c.bang.cot.length || 0) || 2;
        M.push({ t: "table", style: "gold", title: c.bang.tieuDe, head: c.bang.cot.length ? c.bang.cot : null, rows: c.bang.dong, widths: cols === 2 ? [2300, 7054] : even(cols) });
      }
    };
    const nvBlock = (x) => {
      P([R(x.ten, { b: true })], { before: 100, keep: true });
      steps(x.buoc);
      exprs(x.nls, "nls");
      exprs(x.ai, "ai");
      chotBlock(x.chot);
    };

    M.push({ t: "hdr", truong: k.truong, to: k.to, gv: k.giaoVien });
    P([R("")], { after: 0 });
    P([R("TÊN BÀI DẠY: " + k.tenBai, { b: true, size: 28 })], { align: "center", after: 80 });
    P([R("Môn học/Hoạt động giáo dục: "), R(k.mon, { b: true }), R("; lớp: "), R(k.lop, { b: true })], { align: "center", after: 40 });
    if (k.thoiGian) P([R("Thời gian thực hiện: "), R(k.thoiGian, { b: true })], { align: "center", after: 120 });

    const m = k.mucTieu;
    H1("I. MỤC TIÊU");
    H2("1. Về kiến thức");
    m.kienThuc.forEach((x) => LI(runs(x)));
    H2("2. Về năng lực");
    H2("a) Năng lực chung");
    m.nangLucChung.forEach((x) => LI(LBL(x.ten, x.nd)));
    H2("b) " + (m.dacThu.ten || "Năng lực đặc thù"));
    m.dacThu.items.forEach((x) => LI(LBL(x.ten, x.nd)));
    H2(`c) Năng lực số (Thông tư 02/2025/TT-BGDĐT${m.nls.muc ? " – mức " + m.nls.muc : ""})`);
    m.nls.items.forEach((x) => LI([R(x.ma || "[mã]", { b: true, color: C.nls }), R(x.ten ? ` – ${x.ten}: ` : ": ")].concat(runs(x.nd))));
    if (m.ai.length) {
      H2("d) Năng lực trí tuệ nhân tạo (Quyết định 2422/QĐ-BGDĐT)");
      m.ai.forEach((x) => LI([R(`${x.ma}${x.ten ? " – " + x.ten : ""}${x.code ? ` (${x.code})` : ""}`, { b: true, color: C.ai }), R(": ")].concat(runs(x.nd))));
    }
    H2("3. Về phẩm chất");
    m.phamChat.forEach((x) => LI(LBL(x.ten, x.nd)));

    const t = k.thietBi;
    H1("II. THIẾT BỊ DẠY HỌC VÀ HỌC LIỆU");
    H2("1. Giáo viên");
    t.giaoVien.forEach((x) => LI(runs(x)));
    if (t.hocLieuSo.length) {
      P([R("Học liệu số sử dụng trong bài:", { b: true })], { before: 60, keep: true });
      M.push({ t: "table", style: "blue", head: ["Học liệu", "Thời lượng", "Sử dụng"], rows: t.hocLieuSo.map((x) => [x.ten, x.thoiLuong, x.suDung]), widths: [5800, 1500, 2054] });
    }
    if (t.moRong.length) {
      P([R("Mở rộng không gian học tập (liên kết gắn trong bài giảng):", { b: true })], { before: 60, keep: true });
      M.push({ t: "table", style: "blue", head: ["Trang web", "Địa chỉ"], rows: t.moRong.map((x) => [x.ten, x.url]), widths: [4200, 5154] });
    }
    H2("2. Học sinh");
    t.hocSinh.forEach((x) => LI(runs(x)));

    H1("III. TIẾN TRÌNH DẠY HỌC");
    k.tiet.forEach((ti) => {
      M.push({ t: "p", runs: [R(ti.ten.toUpperCase(), { b: true, color: C.head })], align: "center", before: 240, after: 120, keep: true, border: C.head });
      ti.hoatDong.forEach((h) => {
        M.push({ t: "p", runs: [R(h.ten, { b: true, color: C.head })], align: "left", before: 200, after: 80, keep: true, shade: C.headBg });
        field("a) Mục tiêu", h.mucTieu);
        field("b) Nội dung", h.noiDung);
        field("c) Sản phẩm", h.sanPham);
        P([R("d) Tổ chức thực hiện:", { b: true })], { keep: true });
        steps(h.buoc);
        h.nhiemVu.forEach(nvBlock);
        h.muc.forEach((mc) => {
          P([R(mc.ten, { b: true, color: C.head })], { align: "left", before: 140, after: 60, keep: true });
          mc.nhiemVu.forEach(nvBlock);
          chotBlock(mc.chot);
        });
        exprs(h.nls, "nls");
        exprs(h.ai, "ai");
        chotBlock(h.chot);
      });
      const vn = ti.veNha || {};
      if (vn.tasks.length || vn.prepare) {
        M.push({ t: "p", runs: [R("HƯỚNG DẪN HỌC SINH TỰ HỌC Ở NHÀ", { b: true, color: C.head })], align: "left", before: 200, after: 80, keep: true, shade: C.headBg });
        if (vn.tasks.length) {
          P([R("Nhiệm vụ về nhà:", { b: true })], { keep: true, after: 40 });
          vn.tasks.forEach((x) => LI(runs(x)));
        }
        if (vn.prepare) P([R("Chuẩn bị cho tiết sau: ", { b: true })].concat(runs(vn.prepare)), { before: 40 });
      }
    });

    if (k.phuLuc.length) {
      H1("IV. PHỤ LỤC");
      k.phuLuc.forEach((p) => {
        P([R(p.ten, { b: true })], { before: 120, keep: true });
        if (p.moTa) P(runs(p.moTa, { i: true }));
        p.items.forEach((x) => LI(runs(x)));
        [p.bang, p.dapAn].forEach((b, j) => {
          if (!b) return;
          if (j === 1) P([R("Đáp án / gợi ý:", { b: true, i: true })], { before: 60, keep: true });
          const cols = b.dong.reduce((mx, r) => Math.max(mx, r.length), b.cot.length || 0) || 1;
          if (b.tieuDe) P([R(b.tieuDe, { b: true })], { align: "center", keep: true });
          M.push({ t: "table", style: "blue", head: b.cot.length ? b.cot : null, rows: b.dong, widths: even(cols) });
        });
      });
    }
    M.push({ t: "sign", to: k.toTruong, gv: k.giaoVien, noi: (L360.cfg && L360.cfg.diaDanh) || "" });
    return { k, model: M };
  }
  const W = 9354;
  const even = (n) => {
    const w = Math.floor(W / n);
    return Array.from({ length: n }, (_, i) => (i === n - 1 ? W - w * (n - 1) : w));
  };

  /* ---------- Xem trước HTML ---------- */
  const esc = u.esc;
  const runHtml = (r) => {
    let s = esc(r.text).replace(/\n/g, "<br>");
    const st = [];
    if (r.color) st.push(`color:#${r.color}`);
    if (r.size) st.push(`font-size:${r.size / 2}pt`);
    if (st.length) s = `<span style="${st.join(";")}">${s}</span>`;
    if (r.i) s = `<i>${s}</i>`;
    if (r.b) s = `<b>${s}</b>`;
    return s;
  };
  function cellHtml(c, tag) {
    return `<${tag}>${runs(c).map(runHtml).join("")}</${tag}>`;
  }
  function html(raw) {
    const { model } = build(raw);
    let out = "";
    let ul = false;
    const close = () => {
      if (ul) out += "</ul>";
      ul = false;
    };
    model.forEach((e) => {
      if (e.t !== "li") close();
      if (e.t === "hdr")
        out += `<table class="kh-hdr"><tr><td><b>Trường: ${esc(e.truong)}</b><br><b>Tổ: ${esc(e.to)}</b></td><td>Họ và tên giáo viên:<br><b>${esc(e.gv)}</b></td></tr></table>`;
      else if (e.t === "p") {
        const st = [`text-align:${e.align === "both" ? "justify" : e.align}`];
        if (e.before) st.push(`margin-top:${e.before / 20}pt`);
        if (e.after != null) st.push(`margin-bottom:${e.after / 20}pt`);
        if (e.indent) st.push(`padding-left:${e.indent / 20}pt`);
        if (e.shade) st.push(`background:#${e.shade};padding:3pt 5pt`);
        if (e.border) st.push(`border-top:1px solid #${e.border};border-bottom:1px solid #${e.border};padding:3pt 0`);
        out += `<p style="${st.join(";")}">${e.runs.map(runHtml).join("") || "&nbsp;"}</p>`;
      } else if (e.t === "sign") {
        out += `<table class="kh-sign"><tr><td><b>XÁC NHẬN CỦA TỔ CHUYÊN MÔN</b><br><i>Ngày …… tháng …… năm 20……</i><br>Tổ trưởng<div class="kh-sp"></div><b>${esc(e.to || "")}</b></td><td><b>NGƯỜI SOẠN</b><br><i>${esc(e.noi ? e.noi + ", " : "")}ngày …… tháng …… năm 20……</i><br>(Ký và ghi rõ họ tên)<div class="kh-sp"></div><b>${esc(e.gv || "")}</b></td></tr></table>`;
      } else if (e.t === "li") {
        if (!ul) out += `<ul class="kh-ul">`;
        ul = true;
        out += `<li>${e.runs.map(runHtml).join("")}</li>`;
      } else if (e.t === "table") {
        const n = e.widths.length;
        out += `<table class="kh-tbl ${e.style}">${e.title ? `<tr><th colspan="${n}" class="ttl">${esc(e.title)}</th></tr>` : ""}${
          e.head ? `<tr>${e.head.map((h) => cellHtml(h, "th")).join("")}</tr>` : ""
        }${e.rows.map((r) => `<tr>${Array.from({ length: n }, (_, i) => cellHtml(r[i] || "", e.style === "gold" && i === 0 && n > 1 ? "th" : "td")).join("")}</tr>`).join("")}</table>`;
      }
    });
    close();
    return `<div class="kh-page">${out}<div class="kh-foot"><span>${FOOTER_CODE}</span><span>Trang …/…</span></div></div>`;
  }

  /* ---------- Xuất Word (.docx) ---------- */
  async function docxBlob(raw) {
    await u.loadScript("js/vendor/docx.umd.js");
    const D = window.docx;
    const { k, model } = build(raw);
    const run = (r, base) =>
      new D.TextRun({
        text: r.text,
        bold: !!(r.b || (base && base.b)),
        italics: !!r.i,
        color: r.color || undefined,
        size: r.size || (base && base.size) || undefined
      });
    const runsOf = (rs, base) => {
      const out = [];
      rs.forEach((r) =>
        String(r.text)
          .split("\n")
          .forEach((line, i) => {
            if (i) out.push(new D.TextRun({ text: "", break: 1 }));
            out.push(run(Object.assign({}, r, { text: line }), base));
          })
      );
      return out;
    };
    const AL = { center: D.AlignmentType.CENTER, left: D.AlignmentType.LEFT, both: D.AlignmentType.JUSTIFIED, right: D.AlignmentType.RIGHT };
    const line = (color, size = 4) => ({ style: D.BorderStyle.SINGLE, size, color });
    const none = { style: D.BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const para = (rs, o = {}) =>
      new D.Paragraph({
        children: runsOf(rs, o.base),
        alignment: AL[o.align || "both"],
        spacing: { before: o.before || 0, after: o.after != null ? o.after : 60, line: 276, lineRule: D.LineRuleType ? D.LineRuleType.AUTO : "auto" },
        keepNext: !!o.keep,
        indent: o.indent ? { left: o.indent } : undefined,
        shading: o.shade ? { type: D.ShadingType.CLEAR, color: "auto", fill: o.shade } : undefined,
        border: o.border ? { top: Object.assign(line(o.border, 6), { space: 4 }), bottom: Object.assign(line(o.border, 6), { space: 4 }) } : undefined,
        numbering: o.li ? { reference: "dash", level: 0 } : undefined
      });
    const cell = (text, w, o = {}) =>
      new D.TableCell({
        width: { size: w, type: D.WidthType.DXA },
        columnSpan: o.span,
        shading: o.fill ? { type: D.ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
        margins: { top: 50, bottom: 50, left: 90, right: 90 },
        verticalAlign: D.VerticalAlign.CENTER,
        children: String(text || "")
          .split("\n")
          .map((ln) => para(runs(ln), { align: o.align || "left", after: 20, base: o.b ? { b: true } : null }))
      });
    const children = [];
    model.forEach((e) => {
      if (e.t === "hdr") {
        children.push(
          new D.Table({
            width: { size: W, type: D.WidthType.DXA },
            columnWidths: [5554, 3800],
            borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
            rows: [
              new D.TableRow({
                children: [
                  new D.TableCell({
                    width: { size: 5554, type: D.WidthType.DXA },
                    borders: { top: none, bottom: none, left: none, right: none },
                    children: [para([R("Trường: " + e.truong, { b: true })], { align: "center", after: 20 }), para([R("Tổ: " + e.to, { b: true })], { align: "center", after: 0 })]
                  }),
                  new D.TableCell({
                    width: { size: 3800, type: D.WidthType.DXA },
                    borders: { top: none, bottom: none, left: none, right: none },
                    children: [para([R("Họ và tên giáo viên:")], { align: "center", after: 20 }), para([R(e.gv, { b: true })], { align: "center", after: 0 })]
                  })
                ]
              })
            ]
          })
        );
      } else if (e.t === "p") children.push(para(e.runs, e));
      else if (e.t === "sign") {
        const col = (lines) =>
          new D.TableCell({
            width: { size: W / 2, type: D.WidthType.DXA },
            borders: { top: none, bottom: none, left: none, right: none },
            children: lines.map(([t, o]) => para([R(t, o || {})], { align: "center", after: 20 }))
          });
        children.push(para([R("")], { after: 120 }));
        children.push(
          new D.Table({
            width: { size: W, type: D.WidthType.DXA },
            columnWidths: [W / 2, W / 2],
            borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
            rows: [
              new D.TableRow({
                cantSplit: true,
                children: [
                  col([["XÁC NHẬN CỦA TỔ CHUYÊN MÔN", { b: true }], ["Ngày …… tháng …… năm 20……", { i: true }], ["Tổ trưởng"], [""], [""], [""], [e.to || "", { b: true }]]),
                  col([["NGƯỜI SOẠN", { b: true }], [`${e.noi ? e.noi + ", " : ""}ngày …… tháng …… năm 20……`, { i: true }], ["(Ký và ghi rõ họ tên)"], [""], [""], [""], [e.gv || "", { b: true }]])
                ]
              })
            ]
          })
        );
      } else if (e.t === "li") children.push(para(e.runs, { li: true, after: 60 }));
      else if (e.t === "table") {
        const gold = e.style === "gold";
        const bc = gold ? C.sumLine : C.tblLine;
        const n = e.widths.length;
        const rows = [];
        if (e.title)
          rows.push(new D.TableRow({ tableHeader: true, children: [cell(e.title, W, { span: n, fill: gold ? C.sumHead : C.tblHead, b: true, align: "center" })] }));
        if (e.head) rows.push(new D.TableRow({ tableHeader: true, children: e.head.map((h, i) => cell(h, e.widths[i], { fill: gold ? C.sumHead : C.tblHead, b: true, align: "center" })) }));
        e.rows.forEach((r) =>
          rows.push(
            new D.TableRow({
              cantSplit: true,
              children: e.widths.map((w, i) => cell(r[i] || "", w, gold && i === 0 && n > 1 ? { fill: C.sumCol, b: true } : {}))
            })
          )
        );
        children.push(
          new D.Table({
            width: { size: W, type: D.WidthType.DXA },
            columnWidths: e.widths,
            borders: { top: line(bc), bottom: line(bc), left: line(bc), right: line(bc), insideHorizontal: line(bc), insideVertical: line(bc) },
            rows
          })
        );
        children.push(para([R("")], { after: 40 }));
      }
    });
    const doc = new D.Document({
      creator: k.giaoVien || "Lesson 360° Studio",
      title: "KHBD – " + k.tenBai,
      description: "Kế hoạch bài dạy tạo bằng Lesson 360° Studio",
      styles: { default: { document: { run: { font: "Times New Roman", size: 26 } } } },
      numbering: {
        config: [
          {
            reference: "dash",
            levels: [{ level: 0, format: D.LevelFormat.BULLET, text: "–", alignment: D.AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }]
          }
        ]
      },
      sections: [
        {
          properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1418, header: 708, footer: 567 } } },
          footers: {
            default: new D.Footer({
              children: [
                new D.Paragraph({
                  border: { top: Object.assign(line("808080", 6), { space: 4 }) },
                  tabStops: [{ type: D.TabStopType.RIGHT, position: W }],
                  children: [
                    new D.TextRun({ text: FOOTER_CODE, size: 20 }),
                    new D.TextRun({ children: ["\tTrang ", D.PageNumber.CURRENT, "/", D.PageNumber.TOTAL_PAGES], size: 20 })
                  ]
                })
              ]
            })
          },
          children
        }
      ]
    });
    return tidyDocx(await D.Packer.toBlob(doc));
  }
  // Làm sạch gói .docx: bỏ mục thư mục trong zip, nối bảng phông (fontTable) vào quan hệ tài liệu
  // để Word, Google Docs và Edoc mở không cảnh báo.
  async function tidyDocx(blob) {
    try {
      await u.loadScript("js/vendor/jszip.min.js");
      const zip = await window.JSZip.loadAsync(blob);
      Object.keys(zip.files).forEach((n) => zip.files[n].dir && delete zip.files[n]);
      const rp = "word/_rels/document.xml.rels";
      if (zip.file("word/fontTable.xml") && zip.file(rp)) {
        let rels = await zip.file(rp).async("string");
        if (!/fontTable\.xml/.test(rels)) {
          rels = rels.replace("</Relationships>", '<Relationship Id="rIdL360Font" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable" Target="fontTable.xml"/></Relationships>');
          zip.file(rp, rels);
        }
      }
      return await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", compression: "DEFLATE" });
    } catch (e) {
      return blob;
    }
  }
  /* ---------- Tên tệp Edoc theo quy định của trường ----------
     Cấp học_Khối_Tổ-Môn_KHBD_Tuần-Tiết_Tên bài theo SGK_Tên giáo viên_v#  (không dấu, không khoảng trắng)
     Ví dụ: THPT_K12_XaHoi-TuchonLichsu_KHBD_T1-Tiet1-15_LichsutinnguongvatongiaoVietNam_NguyenHuuHieu_v1 */
  const MON_MA = { "lich-su": "LISU", "dia-li": "DILI", "ngu-van": "NVAN", gdcd: "GDCD", gdktpl: "KTPL", gddp: "GDDP" };
  const MON_CD = { "lich-su": "TuchonLichsu", "dia-li": "TuchonDiali", "ngu-van": "TuchonNguvan", gdktpl: "TuchonKTPL" };
  const plainVi = (t) =>
    String(t || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  const squash = (t) => plainVi(t).replace(/[^A-Za-z0-9]+/g, "");
  const nums = (t) => String(t || "").split(/[^\d]+/).filter(Boolean).map(Number);
  function edocName(o) {
    const lop = Number(o.lop) || 0;
    const cap = lop && lop <= 9 ? "THCS" : "THPT";
    const to = squash(o.to || (L360.cfg && L360.cfg.toMa) || "XaHoi");
    const mon = o.cd ? MON_CD[o.mon] || "Tuchon" + squash(o.monTen || "") : MON_MA[o.mon] || squash(o.monTen || o.mon || "").toUpperCase().slice(0, 6);
    const tu = nums(o.tuan);
    const ti = nums(o.tiet);
    const tiet = ti.length ? `Tiet${Math.min(...ti)}${ti.length > 1 && Math.max(...ti) !== Math.min(...ti) ? "-" + Math.max(...ti) : ""}` : "Tiet";
    let tb = String(o.tenBai || "").replace(/^(Bài|Chuyên đề|Chủ đề|CĐ)\s*[\d.]+\s*[.:–-]*\s*/i, "");
    const bai = squash(tb);
    return [cap, `K${lop || ""}`, `${to}-${mon}`, "KHBD", `${tu.length ? "T" + tu[0] : "T"}-${tiet}`, bai, squash(o.gv), `v${Number(o.v) || 1}`].join("_");
  }
  // Bản PDF: mở bản xem in của giáo án (đúng mẫu, có bảng ký xác nhận) để "Lưu thành PDF".
  function pdf(raw, name) {
    const k = normalize(raw);
    const base = location.href.replace(/[^/]*$/, "");
    const w = window.open("", "_blank");
    if (!w) throw new Error("Trình duyệt chặn cửa sổ mới – cho phép cửa sổ bật lên rồi thử lại.");
    w.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>${u.esc(name || "KHBD")}</title><link rel="stylesheet" href="${base}assets/css/l360.css">
      <style>@page{size:A4;margin:2cm 2cm 2cm 2.5cm}body{background:#fff;margin:0}.kh-page{box-shadow:none;margin:0 auto;max-width:none;padding:0}.no-print{position:fixed;top:12px;right:12px}@media print{.no-print{display:none}}</style></head>
      <body><div class="no-print"><button class="btn primary" onclick="print()">In / Lưu PDF</button></div>${html(k)}<script>setTimeout(()=>print(),600)<\/script></body></html>`);
    w.document.close();
  }
  async function download(raw, name) {
    const blob = await docxBlob(raw);
    const k = normalize(raw);
    const fn = name ? (/\.docx$/i.test(name) ? name : name + ".docx") : `KHBD - ${((t) => (t.length <= 80 ? t : t.slice(0, 80).replace(/\s+\S*$/, "").replace(/[\s.,;:–-]+$/, "")))((k.tenBai || "bai-day").replace(/[\\/:*?"<>|]+/g, " "))}.docx`;
    u.downloadBlob(fn, blob);
  }

  /* ---------- Khung giáo án tự động từ các tiết học (không cần AI) ---------- */
  // Mô tả ngắn một bước để đưa vào giáo án / PPT.
  function describe(s) {
    const B = L360.blocks;
    const T = L360.types[s.type] || {};
    const out = { task: s.instructions || "", lines: [], questions: [], notes: [], label: T.label || s.type };
    if (s.ghiBai) out.notes.push(s.ghiBai);
    switch (s.type) {
      case "slide":
        (s.pages || []).forEach((pg) => {
          if (pg.title) out.lines.push(`**${pg.title}**`);
          (pg.blocks || []).forEach((b) => {
            if (b.kind === "note") out.notes.push(b.text || "");
            else if (b.kind === "image" || b.kind === "gallery") return;
            else if (b.kind === "conclusion") out.lines.push(`Kết luận: ${b.text || ""}`);
            else {
              const t = B ? B.plain(b) : "";
              if (t) out.lines.push(t.replace(/\n- /g, "; ").replace(/^- /, "").replace(/\n/g, "; "));
            }
          });
        });
        break;
      case "quiz":
      case "video":
        if (s.type === "quiz" && s.mode && s.mode !== "classic") {
          out.label = L360.quizModeName ? L360.quizModeName(s) : out.label;
          if (s.mode === "puzzle") out.lines.push(`Trò chơi Mảnh ghép bí ẩn: ${(s.questions || []).filter((q) => !q.kw).length} mảnh ghép che bức tranh, mỗi câu trả lời đúng mở một mảnh; cuối cùng đoán bức tranh${s.keyword ? ` (đáp án: ${s.keyword})` : ""}.`);
          if (s.mode === "gift") out.lines.push(`Trò chơi Hộp quà bí mật: ${(s.questions || []).length} hộp quà, lớp chọn hộp, mỗi hộp là một câu hỏi.`);
          if (s.mode === "rcv") out.lines.push("Trò chơi Rung chuông vàng: HS trả lời từng câu trong thời gian quy định, trả lời sai thì dừng cuộc chơi; HS trụ vững đến câu cuối là người thắng.");
        }
        (s.questions || []).forEach((q) => !q.kw && out.questions.push(q));
        break;
      case "flash":
        out.lines.push(`Thẻ ghi nhớ lật (${(s.pairs || []).length} thẻ): ` + (s.pairs || []).map((p) => `${p.left} – ${p.right}`).join("; "));
        break;
      case "wheel":
        out.lines.push(`Vòng quay may mắn: ${(s.items || []).join("; ")}`);
        break;
      case "stance":
        out.lines.push(`Bày tỏ quan điểm về nhận định: "${s.question || ""}" – các góc: ${(s.options || []).join(" / ")}; HS nêu lí do, tranh luận.`);
        if (s.conclusion) out.lines.push(`Kết luận: ${s.conclusion}`);
        break;
      case "kwl":
        out.lines.push(s.stage === "l" ? `Bảng KWL (cuối giờ): HS ghi điều đã học được (L) về "${s.question || ""}", đối chiếu với K, W đầu giờ.` : `Bảng KWL (đầu giờ): HS ghi điều đã biết (K) và muốn biết (W) về "${s.question || ""}".`);
        break;
      case "poll2":
        out.questions.push({ kind: "mcq", q: s.question, options: s.options || [], answer: s.answer, explain: s.explain });
        if (s.card && !s.ghiBai) out.notes.push(s.card);
        break;
      case "crossword":
        out.lines.push(`Ô chữ ${(s.rows || []).length} hàng ngang, từ khoá ${String(s.keyword || "").length} chữ cái: ${s.keyClue || ""}`);
        (s.rows || []).forEach((r, i) => out.lines.push(`Hàng ${i + 1}: ${r.clue} → ${r.answer}`));
        out.lines.push(`Từ khoá: ${s.keyword}`);
        break;
      case "cards":
        out.lines.push(`${s.question} – thẻ: ${(s.cards || []).join("; ")}`);
        if (s.conclusion) out.lines.push(`Kết luận: ${s.conclusion}`);
        break;
      case "match":
        out.lines.push(s.question || "");
        (s.pairs || []).forEach((p) => out.lines.push(`${p.left} – ${p.right}`));
        break;
      case "order":
        out.lines.push(s.question || "");
        out.lines.push("Thứ tự đúng: " + (s.items || []).map((x, i) => `${i + 1}) ${typeof x === "string" ? x : x.text}`).join("; "));
        break;
      case "text":
        out.lines.push(s.question || "");
        break;
      case "groupwork":
        out.lines.push(s.task || "");
        out.lines.push("Hồ sơ nhóm: " + (s.fields || []).map((f) => `${f.key}. ${f.label}`).join("; "));
        break;
      case "expo":
        out.lines.push("Các nhóm trưng bày hồ sơ, nhận xét chéo theo tiêu chí.");
        break;
      case "auction":
        out.lines.push(`${s.question || ""} – các mục: ${(s.items || []).map((x) => x.title).join("; ")}`);
        break;
      case "explore":
        out.lines.push(s.mission || "");
        break;
    }
    return out;
  }
  const letter = (i) => "ABCDEFGH"[i] || String(i + 1);
  function qLine(q, i) {
    if (q.kind === "tf") return `Câu ${i + 1} (Đúng/Sai): ${q.q} ` + (q.statements || []).map((x, j) => `${"abcd"[j]}) ${x.text} [${x.answer ? "Đ" : "S"}]`).join("; ");
    if (q.kind === "short") return `Câu ${i + 1} (trả lời ngắn): ${q.q} → ${q.answer}`;
    if (q.kind === "fill") {
      const f = L360.fillParse ? L360.fillParse(q.text) : { parts: [q.text], blanks: [] };
      return `Câu ${i + 1} (điền khuyết): ${q.q} „${f.parts.map((t, j) => t + (j < f.blanks.length ? `(${j + 1})……` : "")).join("")}" → ${f.blanks.map((b, j) => `(${j + 1}) ${b.answer}`).join("; ")}`;
    }
    if (q.kind === "sort") return `Câu ${i + 1} (kéo thả phân loại): ${q.q} ` + (q.groups || []).map((g, gi) => `${g}: ${(q.items || []).filter((x) => Number(x.group) === gi).map((x) => x.text).join(", ")}`).join(" | ");
    return `Câu ${i + 1}: ${q.q} ` + (q.options || []).map((o, j) => `${letter(j)}. ${o}`).join("; ") + ` → ${letter(Number(q.answer) || 0)}`;
  }
  // Ghép nhiều tiết (gói) của cùng một bài thành một giáo án.
  /* Năng lực số (TT 02/2025/TT-BGDĐT), năng lực AI (QĐ 2422/QĐ-BGDĐT) và thiết bị – suy ra từ hoạt động thật của tiết học.
     Mỗi bước có thể ghi sẵn "nls"/"ai" (trợ lý AI soạn); nếu không, gán theo loại hoạt động. */
  const NLS_BY_TYPE = {
    quiz: ["2.1", "HS dùng laptop/iPad vào phòng học số bằng mã phòng, trả lời câu hỏi trực tuyến và đối chiếu phản hồi tức thì."],
    poll2: ["2.1", "HS bình chọn trực tuyến, quan sát kết quả cả lớp trên màn chiếu để điều chỉnh nhận thức."],
    video: ["1.2", "HS xem video tư liệu, trả lời câu hỏi gắn với từng mốc thời gian, đánh giá độ tin cậy của thông tin trong video."],
    cards: ["2.1", "HS chọn thẻ thông tin trên thiết bị và gửi lựa chọn kèm lí do."],
    text: ["2.2", "HS gửi câu trả lời/ý kiến lên bảng chung của lớp; chia sẻ có trách nhiệm, đúng quy tắc ứng xử trên mạng."],
    crossword: ["2.1", "HS giải ô chữ trực tuyến, gửi đáp án và nhận phản hồi."],
    match: ["2.1", "HS ghép nối thông tin trên thiết bị và nhận phản hồi đúng/sai."],
    order: ["2.1", "HS sắp xếp sự kiện/quy trình trên thiết bị và nhận phản hồi."],
    fill: ["2.1", "HS kéo thả/điền từ khoá vào chỗ trống trên thiết bị và nhận phản hồi."],
    sort: ["2.1", "HS kéo thả phân loại thông tin vào các nhóm trên thiết bị."],
    groupwork: ["2.4", "Nhóm phân công vai trò, cùng hoàn thành và nộp sản phẩm số trên Lesson 360° Studio."],
    expo: ["2.4", "HS xem sản phẩm số của nhóm bạn trên thiết bị, nhận xét và bình chọn theo tiêu chí."],
    auction: ["2.4", "Nhóm thảo luận, thống nhất lựa chọn và gửi kèm lập luận trên thiết bị."],
    explore: ["1.1", "HS tìm kiếm, chọn lọc thông tin, hình ảnh di sản/tư liệu số theo nhiệm vụ và ghi nguồn."],
    web: ["2.1", "HS tham gia trò chơi học tập trên nền tảng web mở theo đường dẫn/mã QR của GV."],
    flash: ["2.1", "HS lật thẻ ghi nhớ trên thiết bị, tự đánh giá mức độ ghi nhớ và gửi kết quả."],
    wheel: ["2.1", "HS quan sát vòng quay trực tuyến trên màn chiếu, thực hiện nhiệm vụ của ô được chọn."],
    stance: ["2.2", "HS chọn quan điểm và gửi lí do lên bảng chung của lớp; tranh luận có văn hoá, tôn trọng ý kiến khác."],
    kwl: ["2.2", "HS ghi điều đã biết, muốn biết, đã học được lên bảng KWL trực tuyến của lớp."]
  };
  function derive(packs, lv) {
    const byStep = {};
    const nls = {};
    const ai = {};
    const hocLieu = [];
    const moRong = [];
    const hsThem = [];
    let phieu = 0;
    let device = false;
    const addN = (ma, nd, sid) => {
      const k = ma.split(".").slice(0, 2).join(".");
      const code = /[A-Z]{2}\d/.test(ma) ? ma : `${k}.${lv}`;
      if (!nls[k]) nls[k] = { ma: code, ten: nlsName(k), nd };
      if (sid) (byStep[sid] = byStep[sid] || { nls: [], ai: [] }).nls.push(`${code}: ${nd}`);
    };
    const addA = (ma, nd, sid) => {
      const k = String(ma).slice(0, 3);
      if (!ai[k]) ai[k] = { ma: k, ten: (AI.find((x) => x.ma === k) || {}).ten || "", code: ma, nd };
      if (sid) (byStep[sid] = byStep[sid] || { nls: [], ai: [] }).ai.push(`${ma}: ${nd}`);
    };
    packs.forEach((p) =>
      p.steps.forEach((s) => {
        const T = L360.types[s.type] || {};
        if (!T.noSubmit || s.type === "web") device = true;
        const given = arr(s.nls);
        if (given.length) given.forEach((x) => addN(String(x.ma || x).trim(), x.nd || "", s.id));
        else if (NLS_BY_TYPE[s.type]) addN(NLS_BY_TYPE[s.type][0], NLS_BY_TYPE[s.type][1], s.id);
        arr(s.ai).forEach((x) => addA(String(x.ma || x).trim(), x.nd || "", s.id));
        if (s.type === "groupwork" || s.type === "text") phieu++;
        (s.pages || []).forEach((pg) =>
          (pg.blocks || []).forEach((b) => {
            if ((b.kind === "image" || b.kind === "map") && b.caption) hocLieu.push(`Hình ảnh: ${String(b.caption).slice(0, 80)}.`);
            if (b.kind === "gallery") arr(b.images).forEach((im) => im.caption && hocLieu.push(`Hình ảnh: ${String(im.caption).slice(0, 80)}.`));
            if (b.kind === "video") hocLieu.push(`Video: ${String(b.caption || b.url || b.edu || "").slice(0, 100)}.`);
          })
        );
        if (s.type === "video" && s.source) hocLieu.push(`Video: ${String(s.title || "").slice(0, 80)}${s.source.url ? " – " + s.source.url : s.source.edu ? " (EduHistory Studio)" : ""}.`);
        if (s.type === "web" && s.url) moRong.push(`Trò chơi ${String(s.template || s.tool || "")}: ${s.url}`);
        if (s.type === "web") hsThem.push("Tài khoản/đường dẫn trò chơi học tập trên web (GV cung cấp mã QR).");
      })
    );
    // Quy tắc sử dụng thiết bị trong chế độ tự học: an toàn số và đạo đức AI.
    if (device) {
      addN("2.5", "Tuân thủ quy tắc sử dụng thiết bị trong giờ học: làm bài trong chế độ toàn màn hình, không sao chép, không chuyển sang công cụ khác.");
      addN("4.3", "Sử dụng thiết bị đúng thời lượng, đúng mục đích học tập; giữ khoảng cách và tư thế phù hợp khi học trên laptop/iPad.");
    }
    if (!Object.keys(ai).length) {
      addA("NLb", "Tự hoàn thành nhiệm vụ bằng hiểu biết của bản thân, không dùng công cụ AI làm hộ; khi dùng AI ngoài giờ học phải kiểm chứng với SGK và ghi rõ nguồn.");
      addA("NLa", "Nhận thức AI là công cụ hỗ trợ con người; người học tự suy nghĩ, tự chịu trách nhiệm với sản phẩm học tập của mình.");
    }
    const uniq = (a) => a.filter((x, i) => a.indexOf(x) === i);
    return { byStep, nls: Object.values(nls), ai: Object.values(ai), hocLieu: uniq(hocLieu).slice(0, 12), moRong: uniq(moRong), hsThem: uniq(hsThem), phieu };
  }

  function fromPacks(packs, o = {}) {
    packs = arr(packs)
      .map((p) => L360.Pack.normalize(p))
      .sort((a, b) => a.tiet.so - b.tiet.so);
    const p0 = packs[0] || {};
    const b = p0.bai || {};
    const grade = Number(p0.grade) || 10;
    const lv = NLS_LEVEL(grade);
    const plan = L360.Pptx ? L360.Pptx.plan(packs) : null;
    const sl = (id) => (plan && plan.range[id] ? (plan.range[id][0] === plan.range[id][1] ? `Slide ${plan.range[id][0]}` : `Slide ${plan.range[id][0]}–${plan.range[id][1]}`) : "");
    const tong = Math.max(packs.length, (p0.tiet && p0.tiet.tong) || 1);
    const dac = DAC_THU[p0.subjectId] || { ten: "Năng lực đặc thù", items: [] };
    // Phụ lục 1 chỉ cung cấp tên bài, số tiết, thứ tự tiết (và tuần). Năng lực số, năng lực AI, thiết bị lấy từ chính giáo án.
    const pps = packs.map((p) => p.ppct).filter(Boolean);
    const pp0 = pps[0] || null;
    const comp = derive(packs, lv);
    let hdNo = 0;
    const tiet = packs.map((p, ti) => {
      const groups = [];
      p.steps.forEach((s) => {
        let g = groups[groups.length - 1];
        if (!g || g.phase !== s.phase) groups.push((g = { phase: s.phase, steps: [] }));
        g.steps.push(s);
      });
      const hw = L360.Pack.homework(p);
      return {
        ten: `TIẾT ${p.tiet.so} (TIẾT ${p.ppct && p.ppct.so ? p.ppct.so : "[…]"} THEO PPCT)`,
        veNha: { tasks: hw.tasks, prepare: hw.prepare },
        hoatDong: groups.map((g) => {
          hdNo++;
          const mins = g.steps.reduce((m, s) => m + (s.minutes || 0), 0);
          const ids = g.steps.map((s) => s.id);
          const first = plan && plan.range[ids[0]];
          const last = plan && plan.range[ids[ids.length - 1]];
          const nvs = g.steps.map((s, i) => {
            const d = describe(s);
            const dev = !L360.types[s.type] || !L360.types[s.type].noSubmit;
            const qs = d.questions.map(qLine);
            return {
              ten: `Nhiệm vụ ${i + 1}. ${s.title}`,
              phut: String(s.minutes || ""),
              slide: sl(s.id),
              buoc: [
                [s.script ? `GV dẫn dắt: ${s.script}` : "GV giới thiệu nhiệm vụ."].concat(d.task ? [`Nhiệm vụ của HS: ${d.task}`] : []).concat(dev ? ["GV mở hoạt động trên Lesson 360° Studio, HS vào phòng học bằng mã phòng/QR trên laptop hoặc iPad."] : []),
                dev ? [`HS làm việc ${s.type === "groupwork" ? "theo nhóm" : "cá nhân"} trên thiết bị (${d.label.toLowerCase()}); GV quan sát tiến độ trên bảng điều khiển, hỗ trợ HS gặp khó khăn.`] : ["HS quan sát nội dung trên màn chiếu, theo dõi trên thiết bị và ghi chép."],
                (dev ? ["Màn chiếu hiển thị kết quả của cả lớp; GV mời HS giải thích lựa chọn, các bạn nhận xét, bổ sung."] : ["GV đặt câu hỏi gợi mở; HS trả lời, nhận xét, bổ sung."]).concat(qs),
                ["GV nhận xét, chốt kiến thức."].concat(d.lines.slice(0, 8)).concat(d.notes.length ? [`HS ghi vào vở: ${d.notes.join(" ")}`] : [])
              ],
              nls: (comp.byStep[s.id] || {}).nls || [],
              ai: (comp.byStep[s.id] || {}).ai || []
            };
          });
          return {
            ten: `HOẠT ĐỘNG ${hdNo}. ${HD_NAME[g.phase]}`,
            phut: String(mins || ""),
            mucTieu: g.phase === "hinh-thanh" ? (p.objectives.length ? p.objectives : ["[…]"]) : "[…]",
            noiDung: g.steps.map((s) => s.title).join("; "),
            sanPham: "[…]",
            slide: first ? `Slide ${first[0]}–${(last || first)[1]}` : "",
            nhiemVu: nvs
          };
        })
      };
    });
    const phieuHT = worksheets(packs);
    return normalize({
      tenBai: `${b.so ? (/^(CĐ|Chủ đề)/i.test(b.so) ? b.so : "BÀI " + b.so) + ". " : ""}${String(b.ten || p0.title || "").toUpperCase()}`,
      mon: (L360.Curr && L360.Curr.subjectName(p0.subjectId, grade)) || p0.subject || "",
      lop: String(grade),
      thoiGian: pp0
        ? `${pp0.tong} tiết (Tiết ${pp0.cacTiet.join(", ")} theo PPCT – Tuần ${(pp0.tuanBai || []).join(", ") || "[…]"})`
        : `${tong} tiết (Tiết […] theo PPCT – Tuần […])`,
      mucTieu: {
        kienThuc: packs.flatMap((p) => p.objectives).filter((v, i, a) => v && a.indexOf(v) === i),
        nangLucChung: CHUNG.map((t) => ({ ten: t, nd: "[…]" })),
        dacThu: { ten: dac.ten, items: dac.items.map((t) => ({ ten: t, nd: "[…]" })) },
        nls: { muc: LEVEL_NAME[lv], items: comp.nls },
        ai: comp.ai,
        phamChat: ["Chăm chỉ", "Trách nhiệm"].map((t) => ({ ten: t, nd: "[…]" }))
      },
      thietBi: {
        giaoVien: ["Máy tính, máy chiếu/TV; phòng học Lesson 360° Studio.", "Bài giảng PowerPoint (bản xuất từ Lesson 360° Studio, dùng được khi không có mạng)."]
          .concat(L360.Curr && b.key && L360.Curr.lesson(b.key) ? [L360.Curr.lesson(b.key).bookTitle + (L360.Curr.lesson(b.key).trang ? `, trang ${L360.Curr.lesson(b.key).trang}.` : ".")] : ["SGK, tư liệu tham khảo."])
          .concat(phieuHT.length ? [`Phiếu học tập (${phieuHT.length} phiếu: trước giờ, trong giờ, sau giờ học – xem Phụ lục).`] : []),
        hocLieuSo: comp.hocLieu,
        moRong: comp.moRong,
        hocSinh: ["SGK, vở ghi; laptop hoặc iPad có kết nối Internet (không dùng điện thoại)."].concat(comp.hsThem)
      },
      tiet,
      phuLuc: phieuHT
    });
  }
  // Phiếu học tập cho Phụ lục giáo án: trước giờ (chuẩn bị bài), trong giờ (nhiệm vụ nhóm, câu hỏi viết), sau giờ (về nhà).
  function worksheets(packs) {
    const out = [];
    let no = 0;
    const ten = (when, t) => `Phiếu học tập số ${++no} (${when}) – ${t}`;
    const p0 = packs[0];
    if (p0 && p0.objectives.length) {
      const l = L360.Curr && p0.bai.key ? L360.Curr.lesson(p0.bai.key) : null;
      out.push({
        ten: ten("trước giờ học", "Chuẩn bị bài"),
        moTa: `Học sinh đọc trước SGK${l && l.trang ? " trang " + l.trang : ""}, trả lời vào phiếu và mang đến lớp.`,
        bang: { cot: ["Nhiệm vụ tìm hiểu", "Ghi chép của em"], dong: p0.objectives.slice(0, 5).map((o) => [`Tìm hiểu: ${String(o).replace(/^(Nêu|Trình bày|Giải thích|Phân tích|Đánh giá|Nhận xét|Xác định|Mô tả|Kể|Liệt kê) được\s*/i, (m, v) => v.toLowerCase() + " ")}`, ""]) },
        dapAn: null
      });
    }
    packs.forEach((p) =>
      p.steps.forEach((s) => {
        if (s.type === "groupwork") {
          out.push({ ten: ten("trong giờ – nhóm", s.title), moTa: [s.task, s.instructions].filter(Boolean).join(" "), bang: { cot: ["Nội dung", "Kết quả của nhóm"], dong: (s.fields || []).map((f) => [`${f.key}. ${f.label}`, ""]) }, dapAn: null });
        } else if (s.type === "text" && (s.question || s.instructions)) {
          out.push({ ten: ten("trong giờ – cá nhân", s.title), moTa: s.instructions || "", bang: { cot: ["Câu hỏi", "Trả lời của em"], dong: [[s.question || s.instructions, ""]] }, dapAn: s.sample ? { cot: ["Gợi ý trả lời"], dong: [[s.sample]] } : null });
        }
      })
    );
    const pl = packs[packs.length - 1];
    if (pl) {
      const hw = L360.Pack.homework(pl);
      const qs = pl.steps.filter((s) => s.type === "quiz").flatMap((s) => s.questions || []).filter((q) => q.kind === "mcq" || q.kind === "short").slice(0, 3);
      const rows = hw.tasks.map((t) => [t, ""]).concat(qs.map((q, i) => [`Câu ${i + 1}. ${q.q}${q.kind === "mcq" ? " " + (q.options || []).map((o, j) => `${letter(j)}. ${o}`).join("; ") : ""}`, ""]));
      if (rows.length)
        out.push({
          ten: ten("sau giờ học", "Củng cố, vận dụng ở nhà"),
          moTa: hw.prepare ? "Chuẩn bị cho tiết sau: " + hw.prepare : "",
          bang: { cot: ["Nhiệm vụ", "Bài làm của em"], dong: rows },
          dapAn: qs.length ? { cot: ["Câu", "Đáp án"], dong: qs.map((q, i) => [`Câu ${i + 1}`, q.kind === "mcq" ? `${letter(Number(q.answer) || 0)}. ${(q.options || [])[Number(q.answer) || 0] || ""}` : String(q.answer)]) } : null
        });
    }
    return out;
  }

  /* ---------- Lời nhắc cho trợ lý AI ---------- */
  function nlsCatalog() {
    return NLS.map((d) => `${d.id}. ${d.ten}: ` + d.items.map(([a, b]) => `${a} ${b}`).join("; ")).join("\n");
  }
  function prompt(o = {}) {
    const packs = arr(o.packs).map((p) => L360.Pack.normalize(p)).sort((a, b) => a.tiet.so - b.tiet.so);
    const p0 = packs[0] || {};
    const b = o.bai || p0.bai || {};
    const grade = Number(o.grade || p0.grade) || 10;
    const lv = NLS_LEVEL(grade);
    const subjId = o.subjectId || p0.subjectId || "";
    const dac = DAC_THU[subjId] || { ten: "Năng lực đặc thù", items: [] };
    const plan = L360.Pptx && packs.length ? L360.Pptx.plan(packs) : null;
    const acts = packs
      .map(
        (p) =>
          `TIẾT ${p.tiet.so}/${Math.max(packs.length, p.tiet.tong)}:\n` +
          p.steps
            .map((s) => {
              const d = describe(s);
              const r = plan && plan.range[s.id];
              return `  - [${L360.phase(s.phase).name}] ${s.title} (${d.label}, ${s.minutes || "?"} phút)${d.task ? ` – nhiệm vụ: ${d.task}` : ""}${
                d.lines.length ? `\n      Nội dung: ${d.lines.slice(0, 6).join(" | ").slice(0, 600)}` : ""
              }${d.questions.length ? `\n      Câu hỏi: ${d.questions.map(qLine).join(" | ").slice(0, 900)}` : ""}${d.notes.length ? `\n      Ghi vở: ${d.notes.join(" ").slice(0, 300)}` : ""}`;
            })
            .join("\n")
      )
      .join("\n");
    const cfg = L360.cfg || {};
    const ex = {
      schema: "l360-khbd/1",
      truong: String(cfg.school || "").replace(/^Trường\s*/i, ""),
      to: String(cfg.unit || "").replace(/^Tổ\s*/i, ""),
      giaoVien: o.giaoVien || "",
      tenBai: "BÀI … . TÊN BÀI VIẾT HOA",
      mon: o.subject || "",
      lop: String(grade),
      thoiGian: "… tiết (Tiết …, … theo PPCT – Tuần …)",
      mucTieu: {
        kienThuc: ["Nêu được …", "Trình bày được …"],
        nangLucChung: CHUNG.map((t) => ({ ten: t, nd: "biểu hiện cụ thể trong bài" })),
        dacThu: { ten: dac.ten, items: (dac.items.length ? dac.items : ["…"]).map((t) => ({ ten: t, nd: "…" })) },
        nls: { muc: LEVEL_NAME[lv], items: [{ ma: `1.1.${lv}a`, ten: "Duyệt, tìm kiếm và lọc dữ liệu, thông tin và nội dung số", nd: "việc HS làm cụ thể trong bài" }] },
        ai: [{ ma: "NLa", ten: "Tư duy lấy con người làm trung tâm", code: "mã YCCĐ theo QĐ 2422", nd: "…" }],
        phamChat: [{ ten: "Trách nhiệm", nd: "…" }]
      },
      thietBi: { giaoVien: ["…"], hocLieuSo: [{ ten: "…", thoiLuong: "…", suDung: "Khởi động – Tiết 1" }], moRong: [{ ten: "…", url: "https://…" }], hocSinh: ["…"] },
      tiet: [
        {
          ten: "TIẾT 1 (TIẾT … THEO PPCT)",
          veNha: { tasks: ["Học thuộc phần ghi vở …", "Hoàn thành Phiếu học tập số 2 (sau giờ học) …"], prepare: "Đọc trước mục … SGK trang …; trả lời câu hỏi: …" },
          hoatDong: [
            {
              ten: "HOẠT ĐỘNG 1. MỞ ĐẦU (KHỞI ĐỘNG)",
              phut: "7",
              mucTieu: "…",
              noiDung: "…",
              sanPham: "…",
              buoc: [["GV …"], ["HS …"], ["GV mời …"], ["GV nhận xét, dẫn vào bài: …"]],
              ...(o.slides
                ? {
                    trinhChieu: [{ tieuDe: "Khởi động", blocks: [{ kind: "image", commons: "File:Tên tệp.jpg", src: "https://upload.wikimedia.org/…", caption: "Tên ảnh ngắn", query: "từ khoá tìm ảnh" }, { kind: "question", text: "Câu hỏi khởi động cho HS" }] }],
                    cauHoi: [{ kind: "mcq", q: "…", options: ["…", "…", "…", "…"], answer: 0, explain: "…" }]
                  }
                : {})
            },
            {
              ten: "HOẠT ĐỘNG 2. HÌNH THÀNH KIẾN THỨC MỚI",
              phut: "30",
              mucTieu: ["…"],
              noiDung: "…",
              sanPham: "…",
              muc: [
                {
                  ten: "2.1. …",
                  nhiemVu: [
                    Object.assign(
                      { ten: "Nhiệm vụ 1. …", phut: "8", buoc: [["…"], ["…"], ["…"], ["…"]], nls: [{ ma: `1.1.${lv}a`, nd: "HS …" }], ai: [] },
                      o.slides
                        ? {
                            trinhChieu: [
                              { tieuDe: "Nhiệm vụ 1", blocks: [{ kind: "text", md: "**Đọc mục 1 SGK trang …, trả lời:**\n- Câu hỏi 1 …\n- Câu hỏi 2 …" }, { kind: "image", commons: "File:….jpg", caption: "Tên ảnh", query: "…" }] },
                              { tieuDe: "…", blocks: [{ kind: "mindmap", center: "…", branches: [{ label: "…", items: ["…"] }] }] }
                            ]
                          }
                        : {}
                    )
                  ],
                  chot: { phut: "3", bang: { tieuDe: "1. …", cot: [], dong: [["Ý", "Nội dung ghi vở"]] } }
                }
              ]
            }
          ]
        }
      ],
      phuLuc: [{ ten: "Phụ lục 1. Phiếu học tập số 1", moTa: "…", bang: { cot: ["…", "…"], dong: [["…", ""]] }, dapAn: { cot: ["…", "…"], dong: [["…", "…"]] } }]
    };
    return `Bạn là chuyên gia soạn Kế hoạch bài dạy (KHBD) cho giáo viên THCS/THPT Việt Nam.

NHIỆM VỤ
Soạn KHBD hoàn chỉnh theo Phụ lục IV – Công văn 5512/BGDĐT-GDTrH cho bài dưới đây, tích hợp Năng lực số theo Thông tư 02/2025/TT-BGDĐT (hướng dẫn tại CV 3456/BGDĐT-GDPT) và Năng lực trí tuệ nhân tạo theo Quyết định 2422/QĐ-BGDĐT. Kết quả là MỘT khối JSON "l360-khbd/1"; ứng dụng Lesson 360° Studio sẽ dựng thành tệp Word đúng mẫu của trường.

THÔNG TIN BÀI
- Môn: ${o.subject || p0.subject || "(theo SGK)"}; lớp ${grade}; ${o.book ? "sách: " + o.book + "; " : ""}bài: ${b.so ? (/^(CĐ|Chủ đề)/.test(b.so) ? b.so : "Bài " + b.so) + ". " : ""}${b.ten || p0.title || ""}${b.trang ? ` (SGK trang ${b.trang})` : ""}.
- Số tiết (theo Phụ lục 1 – Kế hoạch dạy học môn của tổ): ${o.tong || Math.max(packs.length, (p0.tiet || {}).tong || 1)}${o.ppct ? `; tiết theo PPCT: ${o.ppct}` : ""}${o.tuan ? `; tuần: ${o.tuan}` : ""}.
- Giáo viên: ${o.giaoVien || "(để trống)"}; ${cfg.school || ""}, ${cfg.unit || ""}.
- Học sinh học trên laptop/iPad với Lesson 360° Studio (không dùng điện thoại); GV điều khiển, màn chiếu hiện kết quả cả lớp.

${
  acts
    ? `TIẾN TRÌNH ĐÃ THIẾT KẾ TRÊN LESSON 360° (giữ đúng thứ tự, tên và thời lượng; mỗi hoạt động dưới đây là một "Nhiệm vụ")\n${acts}\n`
    : "TIẾN TRÌNH: tự thiết kế theo đúng quy tắc dưới đây.\n"
}
QUY TẮC
1. Cấu trúc đúng CV 5512: I. Mục tiêu (kiến thức; năng lực chung; ${dac.ten.toLowerCase()}${dac.items.length ? " (" + dac.items.join(", ") + ")" : ""}; năng lực số; năng lực AI; phẩm chất) – II. Thiết bị dạy học và học liệu – III. Tiến trình dạy học – IV. Phụ lục.
2. Mỗi bài CHỈ có 1 hoạt động Mở đầu (khởi động, ở tiết đầu), 1 hoạt động Luyện tập và 1 hoạt động Vận dụng (ở tiết cuối; vận dụng có thể giao về nhà). Hình thành kiến thức chia mục 2.1, 2.2… Tối đa 1 nhiệm vụ nhóm cho cả bài.
3. Mỗi hoạt động có a) Mục tiêu, b) Nội dung, c) Sản phẩm, d) Tổ chức thực hiện; mỗi nhiệm vụ đủ 4 bước: Chuyển giao – Thực hiện – Báo cáo, thảo luận – Kết luận, nhận định. KHÔNG ghi số slide, số phút trong nội dung giáo án (trường "phut" chỉ để ứng dụng đặt đồng hồ trên trang chiếu).
4. Cuối mỗi mục hình thành kiến thức có "chot" (Chốt kiến thức – ghi bài) dạng bảng 2 cột: cột trái là ý, cột phải là nội dung HS ghi vở; "tieuDe" là tên mục.
5. Năng lực số: XÁC ĐỊNH TỪ CHÍNH CÁC HOẠT ĐỘNG CỦA GIÁO ÁN NÀY (nội dung năng lực số ghi trong Phụ lục 1 của tổ chỉ để tham khảo, không chép lại). Chọn 3–5 năng lực thành phần thật sự có trong bài, mức ${LEVEL_NAME[lv]} (mã dạng "1.1.${lv}a" = năng lực thành phần + mức + chữ cái yêu cầu cần đạt). Mỗi mã khai báo ở mục tiêu phải có ít nhất một "Biểu hiện năng lực số" (trường "nls") ở nhiệm vụ cụ thể. Danh mục năng lực thành phần:
${nlsCatalog()}
6. Năng lực AI (QĐ 2422/QĐ-BGDĐT) – bốn miền: NLa Tư duy lấy con người làm trung tâm; NLb Đạo đức AI; NLc Các kĩ thuật và ứng dụng AI; NLd Thiết kế hệ thống AI. Giáo án luôn có mục năng lực AI, xác định từ hoạt động thật của tiết: tối thiểu NLb (HS tự học, không dùng AI làm hộ trong chế độ tự học; khi dùng AI ngoài giờ phải kiểm chứng với SGK, ghi nguồn) và NLa; nếu bài có hoạt động dùng/đánh giá sản phẩm AI thì thêm NLc. "code" là mã yêu cầu cần đạt theo QĐ 2422; nếu không chắc chắn mã, ghi "[GV điền mã]" – KHÔNG bịa mã.
6b. Thiết bị dạy học và học liệu: liệt kê theo đúng giáo án này (máy chiếu, laptop/iPad HS, phiếu học tập số…, hình ảnh/video/trò chơi web cụ thể đã dùng, trang SGK), không chép từ Phụ lục 1.
6c. Hướng dẫn về nhà: MỖI tiết có trường "veNha": { "tasks": [nhiệm vụ về nhà cụ thể, đo được], "prepare": "chuẩn bị cho tiết sau: nội dung cần đọc trước trong SGK (ghi trang), câu hỏi định hướng, sản phẩm cần mang" }. Nếu có phiếu học tập sau giờ học thì nêu tên phiếu trong tasks.
6d. Phiếu học tập: mỗi phiếu dùng trong giờ, trước giờ hoặc sau giờ học đều thiết kế đầy đủ trong "phuLuc" (tên phiếu, thời điểm dùng, yêu cầu, bảng trống để HS điền, đáp án/gợi ý, tiêu chí đánh giá nếu có).
7. Nội dung chính xác theo SGK; KHÔNG bịa số liệu, năm tháng, tên riêng, trích dẫn, đường link – chỗ chưa chắc ghi "[GV kiểm tra]". Nội dung khách quan, đúng chủ trương của Đảng, pháp luật Nhà nước và Chương trình GDPT 2018.
8. Văn phong giáo án: câu ngắn, bắt đầu bằng chủ thể "GV …", "HS …"; có thể dùng **đậm** cho từ khoá. Phụ lục gồm phiếu học tập (bảng trống) kèm đáp án, tiêu chí đánh giá sản phẩm, câu hỏi trò chơi.
9. Tiếng Việt chuẩn, chính tả theo SGK hiện hành.

ĐỊNH DẠNG TRẢ LỜI
Trả về DUY NHẤT một khối \`\`\`json … \`\`\` hợp lệ theo khung sau (giữ đúng tên trường; "buoc" là mảng 4 phần tử, mỗi phần tử là mảng các ý; nhiệm vụ đặt trong "nhiemVu" hoặc trong "muc"[i]."nhiemVu"):
\`\`\`json
${JSON.stringify(ex, null, 1)}
\`\`\`
${o.slides ? slideRules() : ""}${o.extra ? "\nYÊU CẦU THÊM CỦA GIÁO VIÊN: " + o.extra + "\n" : ""}
${
  o.source
    ? `GIÁO ÁN CÓ SẴN CỦA GIÁO VIÊN – chuyển ĐÚNG nội dung dưới đây sang khung JSON (giữ nguyên các hoạt động, câu hỏi, nội dung ghi bài; chỉ bổ sung phần còn thiếu theo quy tắc, ví dụ năng lực số, năng lực AI, hướng dẫn về nhà, phiếu học tập${o.slides ? ", trang chiếu" : ""}):\n"""\n${o.source}\n"""\n`
    : "TÀI LIỆU: (tôi đính kèm giáo án cũ/SGK nếu có, hoặc dán nội dung ngay bên dưới)\n"
}`;
  }
  // Quy tắc phần trình chiếu (dựng PowerPoint giảng dạy dùng offline từ chính giáo án).
  function slideRules() {
    const A = L360.Architect || {};
    return `
TRÌNH CHIẾU (ứng dụng dựng PowerPoint giảng dạy dùng offline khớp giáo án)
10. Mỗi hoạt động hoặc nhiệm vụ có "trinhChieu": 1–3 trang chiếu dành cho HỌC SINH (không chép lời GV); mỗi trang {"tieuDe":"…","blocks":[…]}. Ngắn gọn: mỗi khối ≤ 4 ý, mỗi ý ≤ 25 chữ; mỗi nội dung chính có ảnh/lược đồ/sơ đồ minh hoạ đúng nội dung; khái quát kiến thức đa dạng (sơ đồ tư duy, dòng thời gian, bảng so sánh, quy trình…). Khối dùng được:
${A.BLOCKS || "- text, image, cards, timeline, mindmap, compare, keyterms, stats, quote, question"}
${A.MAPRULES || ""}
${A.MEDIA || ""}
11. Câu hỏi tương tác (khởi động, củng cố, luyện tập, trò chơi) ghi trong "cauHoi" của hoạt động/nhiệm vụ đó, theo các dạng:
${A.QUESTIONS || '- {"kind":"mcq","q":"…","options":["…","…","…","…"],"answer":0,"explain":"…"}'}
13. TRÒ CHƠI, HOẠT ĐỘNG TƯƠNG TÁC – đa dạng hình thức, ưu tiên ở Mở đầu, Luyện tập, Vận dụng (mỗi bài 2–4 hoạt động, không lặp một kiểu; tổng thời gian vẫn đúng 45 phút/tiết). Đặt trong trường "tuongTac" (mảng) của hoạt động/nhiệm vụ; mỗi phần tử là một hoạt động:
- Mảnh ghép bí ẩn: {"type":"quiz","mode":"puzzle","title":"…","keyword":"đáp án bức tranh","keyClue":"câu hỏi đoán bức tranh","query":"từ khoá tìm ảnh tiếng Anh","questions":[4–9 câu]}
- Hộp quà bí mật: {"type":"quiz","mode":"gift","title":"…","questions":[4–8 câu]}
- Rung chuông vàng: {"type":"quiz","mode":"rcv","title":"…","timer":20,"questions":[6–10 câu]}
- Ô chữ: {"type":"crossword","keyword":"TUKHOA","keyClue":"…","rows":[{"answer":"VIETHOA","clue":"… (7 chữ cái)"}]} (hàng thứ i chứa chữ thứ i của từ khoá)
- Ghép nối: {"type":"match","question":"…","pairs":[{"left":"…","right":"…"}]} · Sắp xếp: {"type":"order","question":"…","items":["theo thứ tự ĐÚNG"]}
- Thẻ ghi nhớ lật: {"type":"flash","question":"…","pairs":[{"left":"mặt trước (thuật ngữ, mốc, nhân vật)","right":"mặt sau (giải thích ngắn)"}]}
- Vòng quay may mắn: {"type":"wheel","question":"…","items":["ô 1","ô 2","…"]} (4–8 ô: câu hỏi ngắn, nhiệm vụ, phần thưởng)
- Bày tỏ quan điểm: {"type":"stance","question":"Nhận định …","options":["Đồng ý","Phân vân","Không đồng ý"],"reasonPrompt":"Vì sao?","conclusion":"GV chốt …"}
- Bảng KWL: {"type":"kwl","question":"Chủ đề …","stage":"kw"} ở Mở đầu và {"type":"kwl","question":"…","stage":"l"} ở Vận dụng/củng cố
- Học từ bạn hai vòng: {"type":"poll2","question":"…","options":["…","…"],"answer":0,"explain":"…"}
Câu hỏi trong "questions" theo đúng các dạng ở mục 11. Bốn bước của hoạt động mô tả rõ cách tổ chức trò chơi.
12. KHÔNG cần tạo trang tên bài, tên chủ đề, tên mục, trang ghi vở, nhiệm vụ về nhà, trang kết: ứng dụng tự dựng từ "tenBai", "muc", "chot", "veNha". Giáo án Word không ghi số slide.
`;
  }
  // Dựng các tiết học (gói bài học) từ giáo án: dùng để xuất PowerPoint offline và dạy tương tác.
  // o: { subjectId, subject, grade, bai: {key, so, ten}, chude, gaId, ppct: [số tiết PPCT], tuan: [...] }
  function toPacks(raw, o = {}) {
    const k = normalize(raw);
    const md = (t) => String(t || "").trim();
    const phaseOf = (t) => {
      const sl = u.slug(t);
      return /mo-dau|khoi-dong/.test(sl) ? "khoi-dong" : /luyen-tap/.test(sl) ? "luyen-tap" : /van-dung/.test(sl) ? "van-dung" : "hinh-thanh";
    };
    // Tên hoạt động viết hoa toàn bộ (theo mẫu giáo án) → viết thường đầu câu cho tiêu đề trang chiếu.
    // Chỉ viết thường các tên hoạt động chuẩn (MỞ ĐẦU, LUYỆN TẬP…); tên có danh từ riêng giữ nguyên để không sai chính tả.
    const STD = new Set("mở đầu khởi động hình thành kiến thức mới luyện tập vận dụng củng cố rộng tổng kết và hoạt".split(" "));
    const sentence = (t) => {
      if (!/\p{L}/u.test(t) || t !== t.toLocaleUpperCase("vi")) return t;
      const low = t.toLocaleLowerCase("vi");
      if (!low.split(/[^\p{L}]+/u).filter(Boolean).every((w) => STD.has(w))) return t;
      return low.replace(/\p{L}/u, (c) => c.toLocaleUpperCase("vi"));
    };
    const clean = (t) => sentence(md(t).replace(/^HOẠT ĐỘNG\s*\d+\s*[.:–-]?\s*/i, "").replace(/^Nhiệm vụ\s*\d+\s*[.:–-]\s*/i, ""));
    const mucSo = (t, j) => (md(t).match(/^(\d+(?:\.\d+)*)/) || [])[1] || String(j + 1);
    const mucTen = (t) => md(t).replace(/^\d+(?:\.\d+)*\.?\s*/, "").replace(/^[a-zđ]\)\s*/i, "");
    // Tên bài không lặp lại "Bài 5:" (số bài đã hiện riêng trên trang chiếu); tên viết hoa toàn bộ → viết thường đầu câu.
    const tenBai = md((o.bai && o.bai.ten) || k.tenBai).replace(/^(BÀI|CHỦ ĐỀ|CHUYÊN ĐỀ)\s*[\dIVX.]+\s*[.:–-]*\s*/i, "");
    const gaId = o.gaId || `ga-${u.slug(tenBai).slice(0, 40)}-${u.uid(4).toLowerCase()}`;
    const tong = k.tiet.length || 1;
    const chotPage = (c, title) => {
      const lines = c.items.length
        ? c.items
        : c.bang
        ? c.bang.dong.filter((r) => r.some(Boolean)).map((r) => (r.length > 1 && r[0] && r[1] ? `${r[0]}: ${r[1]}` : r.filter(Boolean).join(" ")))
        : [];
      return lines.length ? { title: "Ghi vào vở", blocks: [{ kind: "note", title: (c.bang && c.bang.tieuDe) || title || "Ghi vào vở", text: lines.map((x) => "- " + x).join("\n") }] } : null;
    };
    // Trang chiếu tự dựng khi giáo án chưa có "trinhChieu": nhiệm vụ giao cho học sinh.
    const autoPage = (x, title) => {
      const giao = ((x.buoc && x.buoc[0]) || []).map(md).filter(Boolean);
      if (!giao.length) return null;
      return { title: title || "Nhiệm vụ", blocks: [{ kind: "text", md: giao.map((g) => "- " + g.replace(/^GV\s+/, "")).join("\n") }] };
    };
    const pagesOf = (x, title) => {
      const tc = arr(x.trinhChieu)
        .map((pg) => ({ title: md(pg.tieuDe || pg.title), blocks: arr(pg.blocks).filter((b) => b && b.kind) }))
        .filter((pg) => pg.blocks.length);
      if (tc.length) return tc;
      // Hoạt động chỉ gồm câu hỏi (trò chơi, luyện tập) thì trang câu hỏi đã đủ, không thêm trang nhiệm vụ.
      if (arr(x.cauHoi).length || arr(x.tuongTac).length) return [];
      const a = autoPage(x, title);
      return a ? [a] : [];
    };
    // Liên kết bước ↔ phần giáo án để ghi số slide thật: [mã bước, đối tượng, vị trí trang trong bước].
    const links = [];
    const packs = k.tiet.map((ti, i) => {
      const steps = [];
      let n = 0;
      const sid = () => `t${i + 1}s${++n}`;
      const quiz = (x, phase, title) => {
        const qs = arr(x.cauHoi);
        const st = qs.length ? { id: sid(), type: "quiz", phase, title: title || "Câu hỏi", minutes: Math.max(2, qs.length), questions: qs } : null;
        if (st) steps.push(st);
        // Trò chơi / hoạt động tương tác gắn với hoạt động – nhiệm vụ này.
        arr(x.tuongTac).forEach((a) => {
          const T = L360.types[a.type] || {};
          steps.push(Object.assign(u.clone(a), { id: sid(), phase, title: md(a.title) || (T.label ? `${T.label}${x.ten ? " – " + clean(x.ten) : ""}` : clean(x.ten)), minutes: Number(a.minutes) || 4 }));
        });
        return st;
      };
      ti.hoatDong.forEach((h, hi) => {
        const s0 = steps.length;
        const phase = phaseOf(h.ten);
        if (h.muc.length) {
          h.muc.forEach((m, j) => {
            const pages = [{ title: "", blocks: [{ kind: "muc", so: mucSo(m.ten, j), ten: mucTen(m.ten) }] }].concat(pagesOf(m, mucTen(m.ten)));
            const parts = [];
            m.nhiemVu.forEach((x) => {
              const from = pages.length;
              pages.push(...pagesOf(x, clean(x.ten)));
              parts.push([x, from, Math.max(from, pages.length - 1)]);
            });
            const cp = m.chot && chotPage(m.chot, mucTen(m.ten));
            if (cp) pages.push(cp);
            const mins = m.nhiemVu.reduce((a, x) => a + (Number(x.phut) || 0), 0) + (Number(m.chot && m.chot.phut) || 0);
            const st = { id: sid(), type: "slide", phase, title: mucTen(m.ten) || clean(h.ten), minutes: mins || 8, pages };
            steps.push(st);
            parts.forEach(([x, a, b]) => links.push({ id: st.id, target: x, off: [a, b] }));
            if (cp) links.push({ id: st.id, target: m.chot, off: [pages.length - 1, pages.length - 1] });
            m.nhiemVu.forEach((x) => {
              const q = quiz(x, phase, "Củng cố – " + clean(x.ten));
              // Thời gian câu hỏi nằm trong thời gian của nhiệm vụ: không cộng thêm vào tiết.
              if (q) st.minutes = Math.max(1, st.minutes - q.minutes);
              q && links.push({ id: q.id, target: x, extend: true });
            });
          });
        } else if (h.nhiemVu.length) {
          h.nhiemVu.forEach((x) => {
            const pages = pagesOf(x, clean(x.ten));
            const cp = x.chot && chotPage(x.chot, clean(x.ten));
            if (cp) pages.push(cp);
            let st = null;
            if (pages.length) {
              st = { id: sid(), type: "slide", phase, title: clean(x.ten) || clean(h.ten), minutes: Number(x.phut) || 5, pages };
              steps.push(st);
              links.push({ id: st.id, target: x });
            }
            const q = quiz(x, phase, pages.length ? "Câu hỏi – " + (clean(x.ten) || clean(h.ten)) : clean(x.ten) || clean(h.ten));
            if (q && st) st.minutes = Math.max(1, st.minutes - q.minutes);
            q && links.push({ id: q.id, target: x, extend: pages.length > 0 });
          });
        } else {
          const pages = pagesOf(h, clean(h.ten));
          const cp = h.chot && chotPage(h.chot, clean(h.ten));
          if (cp) pages.push(cp);
          let st = null;
          if (pages.length) {
            st = { id: sid(), type: "slide", phase, title: clean(h.ten), minutes: Number(h.phut) || 5, pages };
            steps.push(st);
            links.push({ id: st.id, target: h });
          }
          const q = quiz(h, phase, pages.length ? "Câu hỏi – " + clean(h.ten) : clean(h.ten));
          if (q && st) st.minutes = Math.max(1, st.minutes - q.minutes);
          q && links.push({ id: q.id, target: h, extend: pages.length > 0 });
        }
        // Mọi bước dựng từ cùng một hoạt động của giáo án thuộc một "hoạt động" (quy tắc 1 khởi động – 1 luyện tập – 1 vận dụng).
        steps.slice(s0).forEach((x) => (x.hd = x.hd || `t${i + 1}h${hi + 1}`));
      });
      // Bảng KWL cuối giờ đối chiếu với bảng KWL đầu giờ của cùng tiết.
      const kw0 = steps.find((x) => x.type === "kwl" && x.stage !== "l");
      steps.forEach((x) => x.type === "kwl" && x.stage === "l" && !x.from && kw0 && (x.from = kw0.id));
      const p = L360.Pack.normalize({
        schema: "l360-pack/2",
        id: `${gaId}-t${i + 1}`,
        title: tenBai || k.tenBai,
        subject: o.subject || k.mon,
        subjectId: o.subjectId || "",
        grade: String(o.grade || k.lop || ""),
        bai: Object.assign({ key: "", so: "" }, o.bai || {}, { ten: tenBai }),
        tiet: { so: i + 1, tong },
        duration: 45,
        objectives: k.mucTieu.kienThuc.slice(0, 5),
        homework: { tasks: ti.veNha.tasks, prepare: ti.veNha.prepare },
        steps,
        meta: { gaId, source: "giaoan", ppct: arr(o.ppct)[i] != null ? String(arr(o.ppct)[i]) : "", tuan: arr(o.tuan).join(", ") }
      });
      return p;
    });
    // Trang chủ đề (bài đầu chủ đề) và trang tên bài ở tiết 1.
    const added = packs[0] ? packs[0].steps.map((s) => (s.pages || []).length) : [];
    if (packs[0]) L360.Pack.addHeadings(packs[0], { chude: o.chude || "" });
    const shift = {};
    if (packs[0]) packs[0].steps.forEach((s, j) => (shift[s.id] = (s.pages || []).length - (added[j] || 0)));
    // Ghi số slide thật của bài giảng vào giáo án.
    if (L360.Pptx && packs.length) {
      const pl = L360.Pptx.plan(packs);
      links.forEach((l) => {
        const r = pl.range[l.id];
        if (!r) return;
        let a = r[0];
        let b = r[1];
        if (l.off) {
          const sh = shift[l.id] || 0;
          a = Math.min(r[1], r[0] + l.off[0] + sh);
          b = Math.min(r[1], r[0] + l.off[1] + sh);
        }
        const cur = l.extend && l.target.slide && l.target.slide.match(/Slide (\d+)/);
        if (cur) a = Math.min(a, Number(cur[1]));
        l.target.slide = a === b ? `Slide ${a}` : `Slide ${a}–${b}`;
      });
    }
    packs.forEach((p) => (p.khbd = k));
    return { packs, k, gaId };
  }


  function validate(raw) {
    const errors = [];
    const warnings = [];
    if (!raw || typeof raw !== "object") return { errors: ["Không đọc được nội dung giáo án."], warnings };
    const k = normalize(raw);
    if (!k.tenBai) errors.push("Thiếu tên bài dạy (tenBai).");
    if (!k.tiet.length) errors.push("Chưa có tiến trình dạy học (tiet).");
    const all = k.tiet.flatMap((t) => t.hoatDong);
    const cnt = (re) => all.filter((h) => re.test(u.slug(h.ten))).length;
    if (cnt(/mo-dau|khoi-dong/) > 1) errors.push("Có hơn 1 hoạt động Mở đầu – mỗi bài chỉ 1 hoạt động khởi động.");
    if (cnt(/luyen-tap/) > 1) errors.push("Có hơn 1 hoạt động Luyện tập.");
    if (cnt(/van-dung/) > 1) errors.push("Có hơn 1 hoạt động Vận dụng.");
    if (!k.mucTieu.kienThuc.length) warnings.push("Chưa có mục tiêu kiến thức.");
    if (!k.mucTieu.nls.items.length) warnings.push("Chưa khai báo năng lực số.");
    const declared = k.mucTieu.nls.items.map((x) => x.ma).filter(Boolean);
    const shown = JSON.stringify(k.tiet);
    declared.forEach((ma) => {
      if (!/\[/.test(ma) && !shown.includes(ma)) warnings.push(`Năng lực số ${ma} chưa có biểu hiện ở hoạt động nào.`);
    });
    if (/\[GV (kiểm tra|điền)/.test(JSON.stringify(k))) warnings.push("Còn chỗ đánh dấu [GV kiểm tra]/[GV điền mã] – thầy cô rà lại trước khi in.");
    return { errors, warnings, khbd: k };
  }

  L360.Khbd = { NLS, AI, NLS_LEVEL, LEVEL_NAME, DAC_THU, CHUNG, PHAM_CHAT, BUOC, normalize, build, html, docxBlob, download, pdf, edocName, worksheets, toPacks, fromPacks, describe, qLine, prompt, validate, parse: (t) => L360.Pack.parse(t) };
  L360.describeStep = describe;
})();
