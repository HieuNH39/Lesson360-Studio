/* ENGINE – Lesson Architect: tạo lời nhắc (prompt) để trợ lý AI (Claude, ChatGPT, Gemini…) chuyển
   giáo án KHBD thành gói bài học Lesson 360°. Danh mục mẫu hoạt động được sinh tự động từ mã nguồn,
   nên lời nhắc luôn khớp với những gì nền tảng chạy được. */
(function () {
  const L360 = window.L360;

  const KIND_DESC = {
    text: "chuỗi",
    textarea: "chuỗi (có thể nhiều dòng)",
    number: "số",
    bool: "true/false",
    select: "một giá trị trong danh sách",
    options: "mảng chuỗi (các phương án)",
    list: "mảng chuỗi",
    pair: "mảng 2 số",
    questions: 'mảng {"q","options":[4 chuỗi],"answer": số thứ tự 0–3,"explain"}',
    pairs: 'mảng {"left","right"} – cặp ĐÚNG, hệ thống tự xáo cột phải',
    fieldsList: 'mảng {"key":"A","label","hint"}',
    json: "mảng đối tượng (xem ví dụ)",
    site: "mã di tích Heritage Lens"
  };

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
        return `• type "${t}" – ${T.label}: ${T.desc}\n${fields}${t === "poll2" || t === "explore" ? '\n    - answer: số thứ tự phương án đúng (0 = A); poll2 có thể để null nếu là câu hỏi ý kiến' : ""}\n  Ví dụ: ${JSON.stringify(ex)}`;
      })
      .join("\n\n");
  }

  const SITES = () => (window.L360_HERITAGE || []).map((s) => `${s.id} (${s.name})`).join("; ");

  L360.Architect = {
    prompt(o = {}) {
      const want = [];
      if (o.group) want.push("có đúng 1 nhiệm vụ nhóm (groupwork) và ngay sau đó là triển lãm (expo)");
      if (o.quiz) want.push("có trò chơi trắc nghiệm nhanh (quiz) 4–6 câu ở phần luyện tập");
      if (o.peer) want.push("có ít nhất 1 hoạt động hai vòng học từ bạn (poll2) cho khái niệm dễ nhầm");
      if (o.explore) want.push(`có 1 hoạt động khám phá di sản (explore) với di tích ${o.site || "phù hợp nhất với bài"}`);
      return `Bạn là "Lesson Architect" – trợ lý thiết kế tiết học tương tác cho nền tảng Lesson 360° Studio (${L360.cfg.school}).

NHIỆM VỤ
Đọc giáo án (kế hoạch bài dạy – KHBD) tôi gửi kèm và chuyển thành MỘT gói bài học JSON định dạng "l360-pack/1". Gói này chạy trực tiếp trên lớp: giáo viên điều khiển từng bước, học sinh làm trên điện thoại/laptop, màn chiếu hiện kết quả cả lớp.

THÔNG TIN TIẾT HỌC
- Môn: ${o.subject || "(theo giáo án)"}; lớp: ${o.grade || "(theo giáo án)"}; thời lượng: ${o.duration || 45} phút; số nhóm: ${o.groups || 4}; sĩ số khoảng ${o.size || 30}.
${want.length ? "- Yêu cầu thêm: " + want.join("; ") + "." : ""}

QUY TẮC
1. Bám sát mục tiêu, nội dung, tiến trình của KHBD (khởi động – hình thành kiến thức – luyện tập – vận dụng). Không thêm kiến thức ngoài chương trình.
2. TUYỆT ĐỐI không bịa số liệu, năm tháng, tên riêng, trích dẫn. Chỉ dùng thông tin có trong giáo án/SGK. Chỗ nào chưa chắc, ghi "[GV kiểm tra]" ngay trong câu chữ.
3. 6–9 bước (steps); tổng "minutes" xấp xỉ thời lượng tiết. Tối đa 1 nhiệm vụ nhóm (groupwork).
4. Ưu tiên hoạt động mà MỌI học sinh đều trả lời (poll2, quiz, cards, match, order, text); hạn chế trình chiếu (slide) dài.
5. Trắc nghiệm: 4 phương án, 1 đáp án đúng, phương án nhiễu hợp lí, đáp án đúng rải đều A/B/C/D, mỗi câu có "explain" ngắn.
6. Bước cuối là phiếu thoát (type "text", selfAssess: true).
7. "script" = lời dẫn ngắn cho giáo viên (1–3 câu); "instructions" = nhiệm vụ cho học sinh (1 câu).
8. Tiếng Việt chuẩn, câu ngắn, phù hợp lứa tuổi; tên riêng nước ngoài phiên âm theo SGK.
9. Chỉ thêm ảnh ("media.image" hoặc "image") khi có đường dẫn ảnh giấy phép mở và ghi "credit"; không chắc thì bỏ trống.
10. Nội dung chính xác, khách quan, phù hợp chủ trương của Đảng, pháp luật Nhà nước Việt Nam và Chương trình GDPT 2018.
11. Không để lộ đáp án trong câu chữ: mục cần sắp xếp (order) không ghi năm hay số thứ tự; vế ghép (match) không lặp từ khoá của vế kia.

THƯ VIỆN MẪU HOẠT ĐỘNG (chỉ dùng các "type" dưới đây; mỗi bước luôn có: id, type, title, minutes, instructions, script)
${catalog()}

Mã di tích Heritage Lens (dùng cho type "explore"): ${SITES()}

ĐỊNH DẠNG TRẢ LỜI
- Trả về DUY NHẤT một khối \`\`\`json … \`\`\` hợp lệ: không chú thích, không dấu phẩy thừa, dùng dấu nháy kép.
- Cấu trúc gốc: {"schema":"l360-pack/1","title","subject","grade","lessonRef","duration","objectives":[…],"theme":{"accent":"#mã màu đậm"},"steps":[…]}
- Sau khối JSON, viết mục "Ghi chú cho giáo viên" (3–5 gạch đầu dòng): chỗ cần kiểm tra lại, gợi ý ảnh/tư liệu nên bổ sung.

GIÁO ÁN: (tôi đính kèm tệp KHBD hoặc dán nội dung ngay bên dưới)
`;
    },
    fixPrompt(errors, warnings) {
      return `Gói bài học JSON bạn vừa tạo chưa chạy được trên Lesson 360° Studio. Hãy sửa đúng các lỗi sau, giữ nguyên phần còn lại, và trả về lại TOÀN BỘ khối \`\`\`json\`\`\`:
${errors.map((e) => "- LỖI: " + e).join("\n")}${warnings && warnings.length ? "\n" + warnings.map((w) => "- Lưu ý: " + w).join("\n") : ""}`;
    },
    catalog
  };
})();
