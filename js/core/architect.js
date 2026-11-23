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
    video: '{"edu":"mã video EduHistory"} hoặc {"url":"đường dẫn YouTube/mp4"}',
    image: "đường dẫn ảnh"
  };

  // 15 lựa chọn hoạt động ở Bước 1, nhóm theo pha.
  const ACTS = [
    { id: "o-chu", phase: "khoi-dong", type: "crossword", label: "Ô chữ khởi động", hint: "Hàng ngang – từ khoá hàng dọc, lật chữ trên màn chiếu", ask: 'MỘT trò chơi ô chữ (type "crossword") 4–7 hàng ngang, đáp án viết hoa không dấu, từ khoá hàng dọc gợi mở vấn đề của bài' },
    { id: "binh-chon", phase: "khoi-dong", type: "poll2", label: "Bình chọn – dự đoán nhanh", hint: "Cả lớp chọn ý kiến, màn chiếu hiện tỉ lệ", ask: 'MỘT câu hỏi dự đoán/ý kiến (type "poll2", "answer": null nếu là câu hỏi ý kiến) gây tò mò về bài mới' },
    { id: "video-kd", phase: "khoi-dong", type: "video", label: "Video mở đầu có câu hỏi", hint: "Video EduHistory/YouTube dừng lại hỏi", ask: 'MỘT video ngắn (type "video") có 1–2 câu hỏi xen giữa để khởi động' },
    { id: "chon-the", phase: "khoi-dong", type: "cards", label: "Chọn thẻ – đoán nhanh", hint: "Học sinh chọn thẻ phù hợp, nêu giả thuyết", ask: 'MỘT hoạt động chọn thẻ (type "cards") để học sinh đoán/nêu giả thuyết' },
    { id: "bai-giang", phase: "hinh-thanh", type: "slide", label: "Bài giảng trực quan", hint: "Ảnh, dòng thời gian, sơ đồ, bảng so sánh, kết luận, ghi vở", always: true, ask: 'các bước bài giảng trực quan (type "slide", 2–4 trang mỗi bước) cho TỪNG nội dung kiến thức' },
    { id: "hoc-tu-ban", phase: "hinh-thanh", type: "poll2", label: "Học từ bạn – hai vòng", hint: "Tự chọn → trao đổi → chọn lại; thấy tiến bộ ngay", ask: '1–2 hoạt động hai vòng học từ bạn (type "poll2") cho khái niệm dễ nhầm' },
    { id: "nhom", phase: "hinh-thanh", type: "groupwork", label: "Nhiệm vụ nhóm + triển lãm", hint: "Tối đa 1 lần/bài; nhóm nộp hồ sơ, cả lớp chấm chéo", ask: 'ĐÚNG 1 nhiệm vụ nhóm (type "groupwork") và ngay sau là triển lãm (type "expo")' },
    { id: "tu-lieu", phase: "hinh-thanh", type: "text", label: "Phân tích tư liệu / nguồn", hint: "Đọc tư liệu SGK, trả lời ngắn có dẫn chứng", ask: 'MỘT hoạt động phân tích tư liệu (type "text" có trường "source" là đoạn tư liệu trích SGK, ghi rõ trang)' },
    { id: "di-san", phase: "hinh-thanh", type: "explore", label: "Khám phá di sản Heritage Lens", hint: "Học sinh mở di tích 360° trên máy, trả lời câu hỏi", ask: 'MỘT nhiệm vụ khám phá di sản (type "explore") với di tích Heritage Lens phù hợp' },
    { id: "video-ht", phase: "hinh-thanh", type: "video", label: "Video có câu hỏi xen giữa", hint: "EduHistory Studio (Lịch sử 6–9) hoặc YouTube", ask: 'MỘT video (type "video") có 2–3 câu hỏi tại các mốc thời gian' },
    { id: "trac-nghiem", phase: "luyen-tap", type: "quiz", label: "Trắc nghiệm tổng hợp", hint: "4 lựa chọn · Đúng/Sai 4 ý · Trả lời ngắn; bảng xếp hạng", kinds: true, ask: 'MỘT bước trắc nghiệm (type "quiz") 6–10 câu' },
    { id: "ghep-sap", phase: "luyen-tap", type: "match", label: "Ghép nối / Sắp xếp", hint: "Ghép khái niệm – nội dung hoặc sắp xếp tiến trình", ask: 'MỘT hoạt động ghép nối (type "match") hoặc sắp xếp (type "order") – chọn dạng hợp nội dung hơn' },
    { id: "dau-gia", phase: "luyen-tap", type: "auction", label: "Đấu giá kiến thức (nhóm)", hint: "Nhóm chọn phương án và lí do, giáo viên trao giải", ask: 'MỘT hoạt động đấu giá/lựa chọn của nhóm (type "auction")' },
    { id: "phieu-thoat", phase: "van-dung", type: "text", label: "Phiếu thoát + tự đánh giá", hint: "Viết ngắn, tự đánh giá 3 mức, hỏi điều băn khoăn", ask: 'MỘT phiếu thoát (type "text", selfAssess: true, askDoubt: true) yêu cầu vận dụng vào thực tế' },
    { id: "ve-nha", phase: "van-dung", type: "text", label: "Vận dụng – giao về nhà", hint: "Nhiệm vụ vận dụng thực tế, học sinh nộp trên máy", ask: 'MỘT nhiệm vụ vận dụng giao về nhà (type "text", maxWords 120, có "sample" gợi ý)' }
  ];
  const QKINDS = [
    ["mcq", "4 lựa chọn"],
    ["tf", "Đúng/Sai 4 ý"],
    ["short", "Trả lời ngắn"]
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
- {"kind":"image","query":"từ khoá tìm ảnh trên Wikimedia Commons (tiếng Anh, cụ thể)","caption":"chú thích tiếng Việt","src":""}  ← KHÔNG tự bịa đường dẫn ảnh; để "src" rỗng, Studio sẽ tìm ảnh theo "query" và tự ghi nguồn
- {"kind":"gallery","images":[khối image…]} (2–4 ảnh)
- {"kind":"timeline","items":[{"time":"mốc","label":"sự kiện","desc":"ngắn"}]} (3–7 mốc, đúng SGK)
- {"kind":"mindmap","center":"chủ đề","branches":[{"label":"nhánh","items":["ý","ý"]}]} (3–6 nhánh)
- {"kind":"compare","columns":["Tiêu chí","A","B"],"rows":[["…","…","…"]]}
- {"kind":"flow","steps":[{"label":"bước","desc":"ngắn"}]} (quy trình, diễn biến, nguyên nhân – kết quả)
- {"kind":"cycle","center":"…","items":["…","…"]} (vòng tuần hoàn)
- {"kind":"stats","items":[{"value":"số liệu","label":"ý nghĩa"}]} (CHỈ số liệu có trong SGK)
- {"kind":"quote","text":"tư liệu trích SGK","source":"SGK … trang …"}
- {"kind":"map","query":"từ khoá bản đồ","pins":[{"x":40,"y":55,"label":"địa danh"}],"caption":"…"} (x, y là % theo chiều ngang/dọc)
- {"kind":"keyterms","items":[{"term":"thuật ngữ","def":"giải thích"}]}
- {"kind":"question","text":"câu hỏi gợi mở cho cả lớp"}
- {"kind":"conclusion","text":"- kết luận ngắn gọn"}
- {"kind":"note","text":"- nội dung học sinh GHI VÀO VỞ (ngắn, cô đọng)"}
- {"kind":"video","edu":"mã video EduHistory"} hoặc {"kind":"video","url":"https://…"}`;
  const QUESTIONS = `DẠNG CÂU HỎI (trong "questions" của quiz/video; mỗi câu có "kind"):
- 4 lựa chọn: {"kind":"mcq","q":"…","options":["A","B","C","D"],"answer":0-3,"explain":"…"}
- Đúng/Sai 4 ý (như đề thi tốt nghiệp THPT): {"kind":"tf","q":"đoạn tư liệu/dẫn","statements":[{"text":"a) …","answer":true},{"text":"b) …","answer":false},{"text":"c) …","answer":true},{"text":"d) …","answer":false}],"explain":"…"}
- Trả lời ngắn: {"kind":"short","q":"…","answer":"đáp án","accept":["cách viết khác"],"explain":"…"} (đáp án ngắn: số, năm, tên riêng, 1–4 từ)
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
${o.content ? `- Nội dung tiết này: ${o.content}\n` : ""}
TIẾN TRÌNH YÊU CẦU (theo các hoạt động giáo viên đã chọn)
${plan}
Quy tắc của trường: MỖI BÀI chỉ có 1 hoạt động khởi động, 1 hoạt động luyện tập và 1 hoạt động vận dụng. ${
        tiet.tong > 1 ? `Bài này có ${tiet.tong} tiết: khởi động chỉ ở tiết 1; luyện tập và vận dụng chỉ ở tiết ${tiet.tong}; tiết này (tiết ${tiet.so}) chỉ dùng các pha nêu trên.` : "Tiết này có đủ 4 pha."
      }

QUY TẮC NỘI DUNG
1. Bám sát yêu cầu cần đạt, nội dung SGK và KHBD; không thêm kiến thức ngoài chương trình.
2. TUYỆT ĐỐI không bịa số liệu, năm tháng, tên riêng, trích dẫn. Chỗ nào chưa chắc, ghi "[GV kiểm tra]" ngay trong câu chữ.
3. Mỗi bước có "phase" (khoi-dong | hinh-thanh | luyen-tap | van-dung), sắp đúng thứ tự; tổng "minutes" ≈ ${o.duration || 45} phút; 6–10 bước.
4. PHẦN HÌNH THÀNH KIẾN THỨC PHẢI TRỰC QUAN: mỗi nội dung là một bước "slide" 2–4 trang; mỗi trang ghép 2–4 khối, có ít nhất 1 khối hình ảnh hoặc sơ đồ (image/gallery/map/timeline/mindmap/compare/flow/cycle/stats); trang cuối của mỗi nội dung có khối "conclusion" và khối "note" (ghi vào vở). Tránh khối chữ dài: tối đa 60 chữ mỗi khối text.
5. Chỗ học sinh cần ghi bài luôn dùng khối "note" (hoặc trường "ghiBai" của bước hỏi đáp) – màn chiếu sẽ hiện biểu tượng ghi vở và tự đưa vào Vở ghi của học sinh.
6. Ảnh: chỉ dùng khối image/gallery/map với "query" là từ khoá tìm ảnh cụ thể (tên hiện vật, địa danh, nhân vật, tranh…), KHÔNG tự viết đường dẫn ảnh.
7. Trắc nghiệm: phương án nhiễu hợp lí; đáp án đúng rải đều A/B/C/D; mọi câu có "explain" ngắn. Đúng/Sai có đúng 4 ý a–d, xen kẽ đúng – sai.
8. Ô chữ: số hàng = số chữ của từ khoá; hàng thứ i chứa chữ thứ i của từ khoá; đáp án viết hoa không dấu, không khoảng trắng, tối đa 12 chữ cái; gợi ý ghi rõ số chữ cái.
9. Không để lộ đáp án trong câu chữ: mục cần sắp xếp (order) không ghi năm hay số thứ tự; vế ghép (match) không lặp từ khoá của vế kia.
10. "script" = lời dẫn ngắn cho giáo viên (1–3 câu); "instructions" = nhiệm vụ cho học sinh (1 câu).
11. Tiếng Việt chuẩn, câu ngắn, hợp lứa tuổi; tên riêng nước ngoài phiên âm theo SGK.
12. Nội dung chính xác, khách quan, phù hợp chủ trương của Đảng, pháp luật Nhà nước Việt Nam và Chương trình GDPT 2018.
${vids ? `\nVIDEO EDUHISTORY STUDIO CÓ SẴN CHO BÀI NÀY (dùng "edu":"mã"):\n  ${vids}\n` : ""}${types.includes("explore") ? `\nMã di tích Heritage Lens (type "explore"): ${SITES()}\n` : ""}
THƯ VIỆN MẪU HOẠT ĐỘNG (chỉ dùng các "type" dưới đây; mỗi bước luôn có: id, type, phase, title, minutes, instructions, script)
${catalog(types.concat(["slide"]).filter((v, i, a) => a.indexOf(v) === i))}

${BLOCKS}

${QUESTIONS}

ĐỊNH DẠNG TRẢ LỜI
- Trả về DUY NHẤT một khối \`\`\`json … \`\`\` hợp lệ: không chú thích, không dấu phẩy thừa, dùng dấu nháy kép.
- Cấu trúc gốc: {"schema":"l360-pack/2","title","subjectId":"${o.subjectId || ""}","subject":"${o.subject || ""}","grade":"${o.grade || ""}","bai":{"key":"${b.key || ""}","so":"${b.so || ""}","ten":"${(b.ten || "").replace(/"/g, "'")}"},"tiet":{"so":${tiet.so},"tong":${tiet.tong}},"duration":${o.duration || 45},"objectives":[…],"design":{"style":"${design.style || ""}","palette":"${design.palette || ""}"},"steps":[…]}
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
    QUESTIONS
  };
})();
