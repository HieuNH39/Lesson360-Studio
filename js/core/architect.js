/* ENGINE – Lesson Architect: sinh lời nhắc (prompt) cho trợ lý AI (Claude, ChatGPT, Gemini…) chuyển KHBD
   thành gói bài học Lesson 360° (l360-pack/2). Lời nhắc thay đổi theo các hoạt động giáo viên tích chọn ở Bước 1;
   danh mục mẫu hoạt động và khối trực quan được sinh từ mã nguồn nên luôn khớp với những gì nền tảng chạy được. */
(function () {
  const L360 = window.L360;
  const u = L360.u;

  const KIND_DESC = {
    text: "chuỗi",
    textarea: "chuỗi (có thể nhiều dòng)",
    number: "số",
    bool: "true/false",
    select: "một giá trị trong danh sách",
    options: "mảng chuỗi (các phương án)",
    list: "mảng chuỗi",
    pair: "mảng 2 số",
    questions: "mảng câu hỏi (xem DẠNG CÂU HỎI)",
    pairs: 'mảng {"left","right"} – cặp ĐÚNG, hệ thống tự xáo cột phải',
    fieldsList: 'mảng {"key":"A","label","hint"}',
    json: "mảng đối tượng (xem ví dụ)",
    site: "mã di tích Heritage Lens",
    pages: 'mảng trang {"title","blocks":[khối…]} (xem KHỐI TRỰC QUAN)',
    cwrows: 'mảng {"answer","clue"} – mỗi hàng chứa đúng 1 chữ của từ khoá theo thứ tự',
    video: '{"edu":"mã video EduHistory"} hoặc {"url":"đường dẫn YouTube/mp4","start":giây,"end":giây}',
    image: "đường dẫn ảnh"
  };

  // 15 lựa chọn hoạt động ở Bước 1, nhóm theo pha.
  const ACTS = [
    { id: "o-chu", phase: "khoi-dong", type: "crossword", label: "Ô chữ khởi động", hint: "Hàng ngang – từ khoá hàng dọc, lật chữ trên màn chiếu", ask: 'MỘT trò chơi ô chữ (type "crossword") 4–7 hàng ngang, đáp án viết hoa không dấu, từ khoá hàng dọc gợi mở vấn đề của bài' },
    { id: "binh-chon", phase: "khoi-dong", type: "poll2", label: "Bình chọn – dự đoán nhanh", hint: "Cả lớp chọn ý kiến, màn chiếu hiện tỉ lệ", ask: 'MỘT câu hỏi dự đoán/ý kiến (type "poll2", "answer": null nếu là câu hỏi ý kiến) gây tò mò về bài mới' },
    { id: "video-kd", phase: "khoi-dong", type: "video", label: "Video mở đầu có câu hỏi", hint: "Video EduHistory/YouTube dừng lại hỏi", ask: 'MỘT video ngắn (type "video") có 1–2 câu hỏi xen giữa để khởi động' },
    { id: "chon-the", phase: "khoi-dong", type: "cards", label: "Chọn thẻ – đoán nhanh", hint: "Học sinh chọn thẻ phù hợp, nêu giả thuyết", ask: 'MỘT hoạt động chọn thẻ (type "cards") để học sinh đoán/nêu giả thuyết' },
    { id: "web-kd", phase: "khoi-dong", type: "web", label: "Trò chơi web (Wordwall, Blooket…)", hint: "Vòng quay, mở hộp bí mật, lật thẻ – nhúng lên màn chiếu", ask: 'MỘT trò chơi web khởi động (type "web") – xem mục TRÒ CHƠI WEB' },
    { id: "bai-giang", phase: "hinh-thanh", type: "slide", label: "Bài giảng trực quan", hint: "Ảnh, dòng thời gian, sơ đồ, bảng so sánh, kết luận, ghi vở", always: true, ask: 'các bước bài giảng trực quan (type "slide", 2–4 trang mỗi bước) cho TỪNG nội dung kiến thức' },
    { id: "hoc-tu-ban", phase: "hinh-thanh", type: "poll2", label: "Học từ bạn – hai vòng", hint: "Tự chọn → trao đổi → chọn lại; thấy tiến bộ ngay", ask: '1–2 hoạt động hai vòng học từ bạn (type "poll2") cho khái niệm dễ nhầm' },
    { id: "nhom", phase: "hinh-thanh", type: "groupwork", label: "Nhiệm vụ nhóm + triển lãm", hint: "Tối đa 1 lần/bài; nhóm nộp hồ sơ, cả lớp chấm chéo", ask: 'ĐÚNG 1 nhiệm vụ nhóm (type "groupwork") và ngay sau là triển lãm (type "expo")' },
    { id: "tu-lieu", phase: "hinh-thanh", type: "text", label: "Phân tích tư liệu / nguồn", hint: "Đọc tư liệu SGK, trả lời ngắn có dẫn chứng", ask: 'MỘT hoạt động phân tích tư liệu (type "text" có trường "source" là đoạn tư liệu trích SGK, ghi rõ trang)' },
    { id: "di-san", phase: "hinh-thanh", type: "explore", label: "Khám phá di sản Heritage Lens", hint: "Học sinh mở di tích 360° trên máy, trả lời câu hỏi", ask: 'MỘT nhiệm vụ khám phá di sản (type "explore") với di tích Heritage Lens phù hợp' },
    { id: "video-ht", phase: "hinh-thanh", type: "video", label: "Video có câu hỏi xen giữa", hint: "EduHistory Studio (Lịch sử 6–9) hoặc YouTube", ask: 'MỘT video (type "video") có 2–3 câu hỏi tại các mốc thời gian' },
    { id: "trac-nghiem", phase: "luyen-tap", type: "quiz", label: "Trắc nghiệm tổng hợp", hint: "4 lựa chọn · Đúng/Sai 4 ý · Trả lời ngắn; bảng xếp hạng", kinds: true, ask: 'MỘT bước trắc nghiệm (type "quiz") 6–10 câu' },
    { id: "ghep-sap", phase: "luyen-tap", type: "match", label: "Ghép nối / Sắp xếp", hint: "Ghép khái niệm – nội dung hoặc sắp xếp tiến trình", ask: 'MỘT hoạt động ghép nối (type "match") hoặc sắp xếp (type "order") – chọn dạng hợp nội dung hơn' },
    { id: "dau-gia", phase: "luyen-tap", type: "auction", label: "Đấu giá kiến thức (nhóm)", hint: "Nhóm chọn phương án và lí do, giáo viên trao giải", ask: 'MỘT hoạt động đấu giá/lựa chọn của nhóm (type "auction")' },
    { id: "web-lt", phase: "luyen-tap", type: "web", label: "Trò chơi web luyện tập", hint: "Wordwall, LearningApps, Quizizz, Kahoot, Blooket – HS chơi trên máy", ask: 'MỘT trò chơi web luyện tập (type "web") – xem mục TRÒ CHƠI WEB' },
    { id: "phieu-thoat", phase: "van-dung", type: "text", label: "Phiếu thoát + tự đánh giá", hint: "Viết ngắn, tự đánh giá 3 mức, hỏi điều băn khoăn", ask: 'MỘT phiếu thoát (type "text", selfAssess: true, askDoubt: true) yêu cầu vận dụng vào thực tế' },
    { id: "ve-nha", phase: "van-dung", type: "text", label: "Vận dụng – giao về nhà", hint: "Nhiệm vụ vận dụng thực tế, học sinh nộp trên máy", ask: 'MỘT nhiệm vụ vận dụng giao về nhà (type "text", maxWords 120, có "sample" gợi ý)' }
  ];
  const QKINDS = [
    ["mcq", "4 lựa chọn"],
    ["tf", "Đúng/Sai 4 ý"],
    ["short", "Trả lời ngắn"],
    ["fill", "Điền khuyết"],
    ["sort", "Kéo thả phân loại"]
  ];

  function catalog(only) {
    return L360.typeOrder
      .filter((t) => !only || only.includes(t))
      .map((t) => {
        const T = L360.types[t];
        const fields = (T.fields || [])
          .filter((f) => !f.key.startsWith("media."))
          .map((f) => `    - ${f.key}: ${KIND_DESC[f.kind] || f.kind} – ${f.label}${f.hint ? ` (${f.hint})` : ""}`)
          .join("\n");
        const ex = Object.assign({ id: "vi-du" }, T.template());
        return `• type "${t}" – ${T.label}: ${T.desc}\n${fields}${t === "poll2" || t === "explore" ? '\n    - answer: số thứ tự phương án đúng (0 = A); poll2 để null nếu là câu hỏi ý kiến' : ""}\n  Ví dụ: ${JSON.stringify(ex)}`;
      })
      .join("\n\n");
  }
  const BLOCKS = `KHỐI TRỰC QUAN (dùng trong "pages"[].blocks của type "slide"; mỗi khối có "kind"):
- {"kind":"text","md":"đoạn ngắn; dòng bắt đầu bằng - là gạch đầu dòng; **đậm**"}
- {"kind":"list","items":["ý 1","ý 2"]}
- {"kind":"image","src":"https://upload.wikimedia.org/…(đường dẫn TRỰC TIẾP tới tệp ảnh thật)","commons":"File:Tên_tệp_chính_xác.jpg","alt":"mô tả chính xác ảnh phải thể hiện gì","query":"từ khoá tiếng Anh dự phòng","caption":"chú thích tiếng Việt","credit":"tác giả, giấy phép"}  ← xem mục ẢNH
- {"kind":"gallery","images":[khối image…]} (2–4 ảnh)
- {"kind":"timeline","items":[{"time":"mốc","label":"sự kiện","desc":"ngắn"}]} (3–7 mốc, đúng SGK)
- {"kind":"mindmap","center":"tên bài/mục","icon":"🏛","branches":[{"label":"nhánh","icon":"📜","items":["ý","ý"]}]}  ← theo QUY ƯỚC SƠ ĐỒ TƯ DUY bên dưới
- {"kind":"compare","columns":["Tiêu chí","A","B"],"rows":[["…","…","…"]]}
- {"kind":"flow","steps":[{"label":"bước","desc":"ngắn"}]} (quy trình, diễn biến, nguyên nhân – kết quả)
- {"kind":"cycle","center":"…","items":["…","…"]} (vòng tuần hoàn)
- {"kind":"venn","left":"A","leftItems":["điểm riêng"],"right":"B","rightItems":["điểm riêng"],"bothLabel":"Giống nhau","both":["điểm chung"]} (so sánh giống – khác)
- {"kind":"pyramid","items":[{"label":"tầng trên cùng","desc":"ngắn"},…]} (thứ bậc, tầng lớp, mức độ – từ trên xuống)
- {"kind":"stats","items":[{"value":"số liệu","label":"ý nghĩa"}]} (CHỈ số liệu có trong SGK)
- {"kind":"quote","text":"tư liệu trích SGK","source":"SGK … trang …"}
- {"kind":"map","query":"từ khoá bản đồ","pins":[{"x":40,"y":55,"label":"địa danh"}],"caption":"…"} (x, y là % theo chiều ngang/dọc)
- {"kind":"keyterms","items":[{"term":"thuật ngữ","def":"giải thích"}]}
- {"kind":"question","text":"câu hỏi gợi mở cho cả lớp"}
- {"kind":"conclusion","text":"- kết luận ngắn gọn"}
- {"kind":"note","text":"- nội dung học sinh GHI VÀO VỞ (ngắn, cô đọng)"}
- {"kind":"chude","so":"Chủ đề 2","ten":"TÊN CHỦ ĐỀ","mota":"1 câu dẫn","bai":["Bài 4. …","Bài 5. …"]} (trang mở đầu chủ đề – đứng MỘT MÌNH trên trang)
- {"kind":"tenbai","chude":"Chủ đề 2. …","so":"Bài 4","ten":"Tên bài đúng SGK","muc":["tên mục 1","tên mục 2"]} (trang tên bài – đứng một mình)
- {"kind":"muc","so":"1","ten":"Tên mục đúng SGK","y":["a) ý nhỏ","b) ý nhỏ"]} (trang tên mục – đứng một mình, đặt TRƯỚC nội dung mỗi mục mới)
- {"kind":"video","edu":"mã video EduHistory"} hoặc {"kind":"video","url":"https://www.youtube.com/watch?v=…","start":giây bắt đầu,"end":giây kết thúc,"caption":"tên video – kênh"}  ← xem mục VIDEO`;
  const MAPRULES = `QUY ƯỚC SƠ ĐỒ TƯ DUY (thống nhất mọi bài để học sinh dễ vẽ lại vào vở):
- Trung tâm: tên bài hoặc tên mục, tối đa 6 chữ; có thể thêm 1 biểu tượng "icon" (emoji) hợp nội dung.
- 3–6 nhánh cấp 1; tên nhánh là danh từ/cụm danh từ ≤ 5 chữ (ví dụ "Điều kiện tự nhiên", "Thành tựu"); thứ tự nhánh theo logic nội dung (nguyên nhân → diễn biến → kết quả → ý nghĩa…). Màn chiếu tự tô mỗi nhánh một màu, đánh số 1, 2, 3… theo chiều kim đồng hồ từ góc trên bên phải.
- Mỗi nhánh 1–3 ý con, mỗi ý là TỪ KHOÁ ≤ 8 chữ, không viết câu dài, không lặp lại tên nhánh; có thể thêm "icon" cho nhánh.
- Không dùng sơ đồ tư duy cho nội dung chỉ có 1–2 ý; khi đó dùng flow/compare/keyterms.`;
  const MEDIA = `ẢNH (quan trọng nhất là ĐÚNG NỘI DUNG):
- Tìm ảnh THẬT trên Wikimedia Commons (ưu tiên), Wikipedia, website bảo tàng/cơ quan nhà nước có giấy phép mở. Mở trang ảnh để kiểm tra đúng hiện vật, địa danh, nhân vật, sự kiện, thời kì của bài; không dùng ảnh minh hoạ chung chung.
- Ảnh chụp/tư liệu gốc rõ nét, cạnh ngang từ 1200 px, không logo, không chữ chèn, không watermark; bản đồ ghi rõ là bản đồ. Khi không có ảnh chụp phù hợp (khái niệm, quá trình, công trình đã mất…), dùng TRANH VẼ, SƠ ĐỒ, ẢNH MÔ PHỎNG/PHỤC DỰNG có giấy phép mở (Wikimedia Commons) – sắc nét, đúng nội dung.
- "caption" CHỈ LÀ TÊN ẢNH, ngắn gọn ≤ 8 chữ (ví dụ "Kim tự tháp Kê-ốp", "Lược đồ Ai Cập cổ đại"); không viết câu giải thích trong caption, nguồn ghi riêng ở "credit".
- Ghi "commons" = tên tệp chính xác (File:…), "src" = đường dẫn trực tiếp tệp ảnh (https://upload.wikimedia.org/…), "alt" = ảnh phải thể hiện gì, "credit" = tác giả, giấy phép.
- Không chắc ảnh có thật → để "src" rỗng nhưng vẫn ghi "alt" và "query" (tiếng Anh, tên riêng + loại ảnh, ví dụ "Great Pyramid of Giza aerial photo"). Studio kiểm tra từng ảnh: ảnh không tồn tại, mờ hoặc sai sẽ bị thay.
VIDEO:
- Môn có video EduHistory Studio thì dùng "edu". Môn khác: tìm video THẬT trên YouTube của kênh uy tín (VTV, VTV7, Truyền hình Quốc phòng Việt Nam, Bảo tàng Lịch sử Quốc gia, NXB Giáo dục Việt Nam, kênh của trường/sở GD, kênh khoa học chính thống); mở video kiểm tra nội dung đúng bài, phù hợp học sinh, tiếng Việt hoặc có phụ đề.
- Ghi "url" đầy đủ, chọn đoạn ngắn 1–4 phút bằng "start"/"end" (giây). Không chắc video có thật → không đưa vào, thay bằng ảnh/tư liệu. Học sinh xem trên màn chiếu và mở lại được trên máy.
TRÒ CHƠI WEB (type "web"):
- Chọn "tool" hợp nội dung: wordwall (vòng quay, ghép đôi, đố vui, mở hộp, lật thẻ, phân loại), learningapps (ghép cặp, sắp xếp, điền khuyết, trục thời gian), quizizz, kahoot, blooket (thi trắc nghiệm), genially (phòng thoát hiểm), padlet (bảng ý kiến), mentimeter (đám mây từ); ghi "template" = dạng trò chơi.
- "content" = nội dung soạn sẵn để giáo viên dán vào công cụ: mỗi dòng một mục; cặp ghép viết "vế trái | vế phải"; câu hỏi viết "Câu hỏi | Đáp án đúng | nhiễu 1 | nhiễu 2 | nhiễu 3"; phân loại viết "Nhóm | mục".
- Nếu tìm được trò chơi CÓ SẴN, công khai, đúng nội dung bài thì ghi "url" (đường dẫn chia sẻ); không thì để "url" rỗng – giáo viên tự tạo từ "content".`;
  const QUESTIONS = `DẠNG CÂU HỎI (trong "questions" của quiz/video; mỗi câu có "kind"):
- 4 lựa chọn: {"kind":"mcq","q":"…","options":["A","B","C","D"],"answer":0-3,"explain":"…"}
- Đúng/Sai 4 ý (như đề thi tốt nghiệp THPT): {"kind":"tf","q":"đoạn tư liệu/dẫn","statements":[{"text":"a) …","answer":true},{"text":"b) …","answer":false},{"text":"c) …","answer":true},{"text":"d) …","answer":false}],"explain":"…"}
- Trả lời ngắn: {"kind":"short","q":"…","answer":"đáp án","accept":["cách viết khác"],"explain":"…"} (đáp án ngắn: số, năm, tên riêng, 1–4 từ)
- Điền khuyết: {"kind":"fill","q":"Chọn từ/cụm từ thích hợp điền vào chỗ trống.","text":"Đoạn văn bám SGK, mỗi chỗ trống ghi đáp án trong [[ ]], ví dụ: Năm [[938]], [[Ngô Quyền]] đánh tan quân Nam Hán trên sông [[Bạch Đằng]].","bank":["2–3 từ nhiễu cùng loại"],"explain":"…"} (2–6 chỗ trống; [[A|B]] nếu chấp nhận nhiều cách viết)
- Kéo thả phân loại: {"kind":"sort","q":"Kéo mỗi ý vào đúng nhóm.","groups":["Nhóm 1","Nhóm 2"],"items":[{"text":"ý ngắn ≤ 10 chữ","group":0},{"text":"…","group":1}],"explain":"…"} (2–4 nhóm, 4–8 mục, mỗi nhóm ≥ 1 mục)
YÊU CẦU CHẤT LƯỢNG CÂU 4 LỰA CHỌN: đúng nội dung SGK; câu dẫn rõ, trọn nghĩa; CHỈ MỘT phương án đúng; 3 phương án nhiễu hợp lí, cùng loại, cùng cấu trúc ngữ pháp với đáp án; 4 phương án DÀI TƯƠNG ĐƯƠNG (chênh lệch không quá vài chữ); không dùng "Tất cả đều đúng/sai", "Cả A và B"; không lặp từ khoá của câu dẫn trong riêng đáp án đúng.
- Với type "video" thêm "t": số giây video dừng để hỏi.`;
  const SITES = () => (window.L360_HERITAGE || []).map((s) => `${s.id} (${s.name})`).join("; ");

  L360.Architect = {
    ACTS,
    QKINDS,
    // Hoạt động được phép theo vị trí tiết trong bài (tiết đầu có khởi động, tiết cuối có luyện tập + vận dụng).
    allowedPhases(tiet) {
      const so = Number(tiet && tiet.so) || 1;
      const tong = Number(tiet && tiet.tong) || 1;
      if (tong <= 1) return ["khoi-dong", "hinh-thanh", "luyen-tap", "van-dung"];
      if (so === 1) return ["khoi-dong", "hinh-thanh"];
      if (so === tong) return ["hinh-thanh", "luyen-tap", "van-dung"];
      return ["hinh-thanh"];
    },
    prompt(o = {}) {
      const tiet = o.tiet || { so: 1, tong: 1 };
      const allowed = L360.Architect.allowedPhases(tiet);
      const acts = ACTS.filter((a) => (a.always || (o.acts || []).includes(a.id)) && allowed.includes(a.phase));
      const kinds = (o.qkinds && o.qkinds.length ? o.qkinds : ["mcq"]).map((k) => (QKINDS.find((x) => x[0] === k) || [k, k])[1]);
      const types = [...new Set(acts.flatMap((a) => (a.id === "ghep-sap" ? ["match", "order"] : a.id === "nhom" ? ["groupwork", "expo"] : [a.type])))];
      const plan = L360.PHASES.filter((p) => allowed.includes(p.id))
        .map((p) => {
          const list = acts.filter((a) => a.phase === p.id);
          const line = list.length
            ? list.map((a) => a.ask + (a.kinds ? ` gồm các dạng: ${kinds.join(", ")}` : "")).join("; ")
            : p.id === "hinh-thanh"
            ? "bài giảng trực quan"
            : "tự chọn hoạt động phù hợp nhất trong thư viện";
          return `- ${p.name} ("phase":"${p.id}"): ${line}.`;
        })
        .join("\n");
      const b = o.bai || {};
      const vids = (o.videos || []).map((v) => `${v.ma} – ${v.ten} (${u.fmtSec(v.sec)})`).join("\n  ");
      const design = o.design || {};
      return `Bạn là "Lesson Architect" – trợ lý thiết kế tiết học tương tác cho nền tảng Lesson 360° Studio (${L360.cfg.school}).

NHIỆM VỤ
Dựa trên giáo án (KHBD) và SGK, thiết kế MỘT TIẾT học dưới dạng gói JSON "l360-pack/2". Gói chạy trực tiếp trên lớp: giáo viên điều khiển, học sinh làm trên laptop/iPad, màn chiếu hiện nội dung và kết quả cả lớp.

THÔNG TIN TIẾT HỌC
- Môn: ${o.subject || "(theo giáo án)"}; lớp ${o.grade || "(theo giáo án)"}; sách: ${o.book || "Bộ SGK thống nhất"}.
- Bài: ${b.so ? (/^(CĐ|Chủ đề)/.test(b.so) ? b.so : "Bài " + b.so) + ". " : ""}${b.ten || "(theo giáo án)"}${b.trang ? ` – SGK trang ${b.trang}` : ""}${b.chuong ? ` (${b.chuong})` : ""}.
- Đây là TIẾT ${tiet.so}/${tiet.tong} của bài; thời lượng ${o.duration || 45} phút; ${o.groups || 4} nhóm; sĩ số khoảng ${o.size || 30}.
${o.content ? `- Nội dung tiết này: ${o.content}\n` : ""}${
        o.ppct
          ? `- Theo Phụ lục 1 (Kế hoạch dạy học môn) năm học ${String(o.ppct.nam).replace("-", "–")} của tổ: bài này dạy ${o.ppct.tong} tiết (tiết PPCT ${o.ppct.cacTiet.join(", ")}); tiết đang soạn là tiết PPCT ${o.ppct.so}${o.ppct.tuan ? `, tuần ${o.ppct.tuan}` : ""}. CHỈ soạn đúng nội dung của tiết này.\n${
              (o.ppct.khac || []).length ? `- Nội dung các tiết khác của bài (KHÔNG đưa vào tiết này): ${o.ppct.khac.map((x) => `tiết ${x.thu}: ${x.noiDung || "…"}`).join("; ")}.\n` : ""
            }`
          : ""
      }
TIẾN TRÌNH YÊU CẦU (theo các hoạt động giáo viên đã chọn)
${plan}
Quy tắc của trường: MỖI BÀI chỉ có 1 hoạt động khởi động, 1 hoạt động luyện tập và 1 hoạt động vận dụng. ${
        tiet.tong > 1 ? `Bài này có ${tiet.tong} tiết: khởi động chỉ ở tiết 1; luyện tập và vận dụng chỉ ở tiết ${tiet.tong}; tiết này (tiết ${tiet.so}) chỉ dùng các pha nêu trên.` : "Tiết này có đủ 4 pha."
      }

QUY TẮC NỘI DUNG
1. Bám sát yêu cầu cần đạt, nội dung SGK và KHBD; không thêm kiến thức ngoài chương trình.
2. TUYỆT ĐỐI không bịa số liệu, năm tháng, tên riêng, trích dẫn. Chỗ nào chưa chắc, ghi "[GV kiểm tra]" ngay trong câu chữ.
3. Mỗi bước có "phase" (khoi-dong | hinh-thanh | luyen-tap | van-dung), sắp đúng thứ tự; tổng "minutes" ≈ ${o.duration || 45} phút; 6–10 bước.
4. PHẦN HÌNH THÀNH KIẾN THỨC PHẢI TRỰC QUAN: mỗi nội dung là một bước "slide" 2–4 trang; mỗi trang ghép 2–4 khối, có ít nhất 1 khối hình ảnh hoặc sơ đồ (image/gallery/map/timeline/mindmap/compare/flow/cycle/venn/pyramid/stats); trang cuối của mỗi nội dung có khối "conclusion" và khối "note" (ghi vào vở). Tránh khối chữ dài: tối đa 60 chữ mỗi khối text.
5. GHI VỞ: khối "note" (hoặc trường "ghiBai") NGẮN, CÔ ĐỌNG: tối đa 4 ý, mỗi ý ≤ 25 chữ, để chữ trên màn chiếu đủ lớn; nhiều hơn thì tách sang trang sau. Màn chiếu hiện biểu tượng ghi vở và tự đưa vào Vở ghi của học sinh.
6. KHÁI QUÁT KIẾN THỨC đa dạng, sáng tạo, không lặp một kiểu: dùng xen kẽ sơ đồ tư duy (mindmap), sơ đồ nhân quả/diễn biến (flow), trục thời gian (timeline), bảng so sánh (compare), giống – khác (venn), tháp phân tầng (pyramid), vòng tuần hoàn (cycle), thẻ thuật ngữ (keyterms), số liệu nổi bật (stats) – chọn dạng hợp bản chất nội dung; mỗi tiết ít nhất 2 dạng khác nhau. Ảnh, video, trò chơi web: theo các mục ẢNH, VIDEO, TRÒ CHƠI WEB bên dưới.
7. Trắc nghiệm: theo YÊU CẦU CHẤT LƯỢNG CÂU 4 LỰA CHỌN ở mục DẠNG CÂU HỎI; đáp án đúng rải đều A/B/C/D; mọi câu có "explain" ngắn. Đúng/Sai có đúng 4 ý a–d, xen kẽ đúng – sai. Mỗi hoạt động luyện tập nên phối hợp ít nhất 2 dạng câu (4 lựa chọn, Đúng/Sai, trả lời ngắn, điền khuyết, kéo thả phân loại).
8. Ô chữ: số hàng = số chữ của từ khoá; hàng thứ i chứa chữ thứ i của từ khoá; đáp án viết hoa không dấu, không khoảng trắng, tối đa 12 chữ cái; gợi ý ghi rõ số chữ cái.
9. Không để lộ đáp án trong câu chữ: mục cần sắp xếp (order) không ghi năm hay số thứ tự; vế ghép (match) không lặp từ khoá của vế kia.
10. "script" = lời dẫn ngắn cho giáo viên (1–3 câu); "instructions" = nhiệm vụ cho học sinh (1 câu).
11. Tiếng Việt chuẩn, câu ngắn, hợp lứa tuổi; tên riêng nước ngoài phiên âm theo SGK.
12. Nội dung chính xác, khách quan, phù hợp chủ trương của Đảng, pháp luật Nhà nước Việt Nam và Chương trình GDPT 2018.
13. CẤU TRÚC TRANG ĐỀ MỤC (để học sinh ghi vở đúng đề mục): ${
        tiet.so === 1 ? `tiết này là TIẾT ĐẦU của bài – bước "slide" đầu tiên của phần hình thành kiến thức (hoặc ngay sau khởi động) có trang "tenbai"${o.firstOfTopic ? ` và TRƯỚC ĐÓ một trang "chude" (đây là bài đầu tiên của chủ đề "${o.firstOfTopic}")` : ""}; ` : ""
      }trước nội dung của MỖI MỤC MỚI (1, 2, 3… theo SGK) đặt một trang "muc" riêng. Các trang đề mục đứng một mình, không ghép khối khác.
14. BIỂU TƯỢNG: khối mindmap, keyterms, stats có thể thêm "icon" (1 emoji đơn giản, đúng nghĩa) cho trực quan; không lạm dụng.
15. NHIỆM VỤ VỀ NHÀ: thêm trường gốc "homework": {"tasks":["1–3 nhiệm vụ cụ thể, đo được (học thuộc gì, làm bài tập gì, hoàn thành phiếu nào)"],"prepare":"chuẩn bị cho tiết sau: đọc trước mục … SGK trang …, câu hỏi định hướng, sản phẩm cần mang"}.
${vids ? `\nVIDEO EDUHISTORY STUDIO CÓ SẴN CHO BÀI NÀY (dùng "edu":"mã"):\n  ${vids}\n` : ""}${types.includes("explore") ? `\nMã di tích Heritage Lens (type "explore"): ${SITES()}\n` : ""}
THƯ VIỆN MẪU HOẠT ĐỘNG (chỉ dùng các "type" dưới đây; mỗi bước luôn có: id, type, phase, title, minutes, instructions, script)
${catalog(types.concat(["slide"]).filter((v, i, a) => a.indexOf(v) === i))}

${BLOCKS}

${MAPRULES}

${MEDIA}

${QUESTIONS}

ĐỊNH DẠNG TRẢ LỜI
- Trả về DUY NHẤT một khối \`\`\`json … \`\`\` hợp lệ: không chú thích, không dấu phẩy thừa, dùng dấu nháy kép.
- Cấu trúc gốc: {"schema":"l360-pack/2","title","subjectId":"${o.subjectId || ""}","subject":"${o.subject || ""}","grade":"${o.grade || ""}","bai":{"key":"${b.key || ""}","so":"${b.so || ""}","ten":"${(b.ten || "").replace(/"/g, "'")}"},"tiet":{"so":${tiet.so},"tong":${tiet.tong}},"duration":${o.duration || 45},"objectives":[…],"design":{"style":"${design.style || ""}","palette":"${design.palette || ""}"},"homework":{"tasks":[…],"prepare":"…"},"steps":[…]}
- Sau khối JSON, viết mục "Ghi chú cho giáo viên" (3–5 gạch đầu dòng): chỗ cần kiểm tra lại, gợi ý tư liệu nên bổ sung.

GIÁO ÁN: (tôi đính kèm tệp KHBD hoặc dán nội dung ngay bên dưới)
`;
    },
    fixPrompt(errors, warnings) {
      return `Gói bài học JSON bạn vừa tạo chưa chạy được trên Lesson 360° Studio. Hãy sửa đúng các lỗi sau, giữ nguyên phần còn lại, và trả về lại TOÀN BỘ khối \`\`\`json\`\`\`:
${errors.map((e) => "- LỖI: " + e).join("\n")}${warnings && warnings.length ? "\n" + warnings.map((w) => "- Lưu ý: " + w).join("\n") : ""}`;
    },
    catalog,
    BLOCKS,
    MAPRULES,
    MEDIA,
    QUESTIONS
  };
})();
