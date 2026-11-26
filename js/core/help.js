/* Trợ lý hướng dẫn sử dụng Lesson 360° Studio: tra cứu nhanh (chạy ngay, không cần mạng) và
   "Hỏi trợ lý AI" – ghép toàn bộ sổ tay sử dụng vào lời nhắc để bất kì trợ lý AI nào (ChatGPT, Gemini, Claude…)
   trả lời đúng theo tính năng của ứng dụng. Có thể tải sổ tay (.md) để "huấn luyện" một trợ lý AI riêng của tổ. */
(function () {
  const L360 = window.L360;
  const u = L360.u;

  // Sổ tay: [chủ đề, từ khoá, nội dung].
  const KB = [
    ["Lesson 360° Studio là gì?", "giới thiệu tổng quan vòng tròn", "Xưởng AI kiến tạo bài học số từ giáo án. Vòng khép kín: Phụ lục 1 (kế hoạch dạy học môn) → Soạn bài với trợ lý AI → Giáo án Word/PDF (Phụ lục 4) + PowerPoint offline → Dạy học tương tác (máy giáo viên, màn chiếu, máy học sinh) → Nhận xét học sinh, báo cáo → Dữ liệu, Tiến độ, Báo giảng CSDL."],
    ["Đăng nhập, đăng kí tài khoản", "đăng nhập đăng kí google mật khẩu tài khoản email fpt chờ duyệt xác minh", "Giáo viên đăng nhập bằng email công ty @fpt.edu.vn (nút Google hoặc email + mật khẩu; email + mật khẩu cần bấm link xác minh gửi về hộp thư). Email khác không dùng được. Lần đầu: nhập họ tên đầy đủ, chọn môn dạy, bấm “Gửi đăng kí” rồi chờ tổ trưởng hoặc quản trị viên duyệt – được duyệt là trang tự mở vào ứng dụng. Tên tài khoản lấy theo email (HieuNH39@fpt.edu.vn → HieuNH39). Trang Tài khoản (bấm tên ở góc phải): sửa họ tên, môn dạy, ảnh đại diện."],
    ["Duyệt tài khoản, phân quyền", "duyệt tài khoản phân quyền quản trị tổ trưởng cấp quyền admin thu hồi chờ duyệt", "Tài khoản → “Đăng kí chờ duyệt”: bấm Duyệt…, chọn môn học phụ trách (bắt buộc) rồi xác nhận – giáo viên dùng được ngay. Tổ trưởng duyệt, sửa môn phụ trách, thu hồi được tài khoản giáo viên. Quản trị viên (quyền cao nhất) làm được với mọi tài khoản và phân vai trò Giáo viên / Tổ trưởng / Quản trị trong nút “Sửa · phân quyền”. Số đăng kí mới hiện bằng chấm đỏ cạnh tên ở góc phải."],
    ["Khảo sát và báo cáo thí điểm", "khảo sát thí điểm góp ý báo cáo minh chứng excel thời gian soạn học sinh thích hiểu bài", "Trang Tiến độ → “Thí điểm Lesson 360°”: giáo viên làm khảo sát 6 câu (2 phút, sửa lại được). Số liệu tiết dạy tự thu khi bấm “Kết thúc tiết”; học sinh góp ý 2 chạm ở màn hình cuối tiết (thích tiết học? hiểu bài?). Tổ trưởng, quản trị viên bấm “Báo cáo thí điểm (Excel)” để tải báo cáo 3 trang: Tổng hợp, Từng tiết học, Khảo sát GV."],
    ["Phụ lục 1 – Kế hoạch dạy học môn", "phụ lục 1 ppct phân phối chương trình kế hoạch dạy học năm học nạp tải lên", "Menu Phụ lục 1: xem kế hoạch từng môn – lớp theo năm học (bài, số tiết, thứ tự tiết, tuần). Tổ trưởng/quản trị bấm “Nạp Phụ lục 1” (Word, Excel hoặc dán bảng), duyệt kết quả đọc rồi áp dụng; mỗi năm học tạo năm mới từ năm trước rồi cập nhật. Khi soạn bài chỉ lấy từ Phụ lục 1: tên bài, số tiết, thứ tự tiết; năng lực số, năng lực AI, thiết bị dạy học được xây dựng lại theo giáo án mới."],
    ["Soạn bài mới với trợ lý AI", "soạn bài studio trợ lý ai lời nhắc prompt json", "Menu Soạn bài → Tạo mới: chọn Môn → Bài (theo Phụ lục 1 hoặc mục lục SGK) → Tiết; chọn hoạt động, dạng câu hỏi, phong cách. Bấm “Sao chép lời nhắc”, dán vào ChatGPT/Gemini/Claude kèm giáo án; dán khối ```json``` trả về vào ô “Dán kết quả” → Studio kiểm tra lỗi, tự tìm ảnh đúng nội dung. Sửa từng hoạt động ở thẻ Soạn; nút Hoàn tác/Làm lại (Ctrl/⌘ Z) và nút quay lại có ở mọi bước."],
    ["Trang đề mục: chủ đề, tên bài, tên mục", "trang chủ đề tên bài tên mục đề mục ghi vở slide", "Bài đầu tiên của chủ đề có trang giới thiệu chủ đề; tiết 1 có trang tên bài; trước mỗi mục mới có trang tên mục – để học sinh ghi đề mục vào vở (tự vào Vở ghi trên máy học sinh). Trong Studio bấm “Thêm trang đề mục” để tự thêm cho bài đã soạn."],
    ["Dạng câu hỏi", "câu hỏi trắc nghiệm đúng sai trả lời ngắn điền khuyết kéo thả phân loại", "Trắc nghiệm có: 4 lựa chọn (một đáp án đúng, các phương án dài tương đương), Đúng/Sai 4 ý (chấm như đề tốt nghiệp), Trả lời ngắn, Điền khuyết (đáp án trong [[ ]], học sinh kéo thả từ vào chỗ trống), Kéo thả phân loại (2–4 nhóm). Studio cảnh báo khi phương án chênh lệch độ dài hoặc trùng nhau."],
    ["Sơ đồ tư duy và khái quát kiến thức", "sơ đồ tư duy mindmap khái quát quy ước", "Quy ước sơ đồ tư duy: giữa là tên bài/mục (≤ 6 chữ); 3–6 nhánh, mỗi nhánh một màu, đánh số theo chiều kim đồng hồ từ góc trên bên phải; tên nhánh ≤ 5 chữ; mỗi nhánh ≤ 3 ý từ khoá ≤ 8 chữ. Ngoài sơ đồ tư duy còn có dòng thời gian, quy trình, bảng so sánh, giống – khác, tháp phân tầng, vòng tuần hoàn, thẻ thuật ngữ, số liệu nổi bật."],
    ["Ảnh trong bài giảng", "ảnh hình minh hoạ tìm ảnh chú thích nguồn", "Trợ lý AI tìm ảnh thật (Wikimedia Commons…), hoặc tranh vẽ/mô phỏng khi không có ảnh chụp; Studio kiểm tra từng ảnh (tồn tại, ≥ 800 px, đúng nội dung) và thay ảnh lỗi. Chú thích chỉ là tên ảnh; nguồn ảnh nằm ở phần ghi chú của PowerPoint. Nút “Tìm ảnh cho khối còn thiếu” tự bổ sung."],
    ["Video, trò chơi web", "video youtube eduhistory trò chơi wordwall quizizz kahoot", "Lịch sử THCS dùng video EduHistory Studio; môn khác gắn video YouTube của kênh uy tín (chọn đoạn bắt đầu – kết thúc), màn chiếu và học sinh đều xem được. Hoạt động “Trò chơi web” liên kết Wordwall, LearningApps, Quizizz, Kahoot, Blooket, Genially, Padlet, Mentimeter; nội dung soạn sẵn để dán vào công cụ."],
    ["Giáo án Word, PDF, tên tệp Edoc", "giáo án word pdf khbd phụ lục 4 edoc tên tệp ký xác nhận phiếu học tập", "Studio → Giáo án Word: tạo khung từ tiết học (không cần AI) hoặc dùng lời nhắc AI. Giáo án đúng mẫu của tổ, có năng lực số (TT 02/2025), năng lực AI (QĐ 2422) suy ra từ hoạt động thật, hướng dẫn về nhà mỗi tiết, phụ lục phiếu học tập trước – trong – sau giờ, bảng ký “Xác nhận của Tổ chuyên môn – Người soạn”. Tải Word hoặc PDF; tên tệp tự đặt theo quy định Edoc: Cấp học_Khối_Tổ-Môn_KHBD_Tuần-Tiết_Tên bài_Tên GV_v#, ví dụ THPT_K12_XaHoi-TuchonLichsu_KHBD_T1-Tiet1-15_LichsutinnguongvatongiaoVietNam_NguyenHuuHieu_v1."],
    ["Soạn giáo án (Phụ lục 4) và tải Word, PDF, PowerPoint", "soạn giáo án phụ lục 4 pl4 word pdf powerpoint chuyển giáo án có sẵn", "Menu Giáo án: chọn Môn → Lớp → Bài theo Phụ lục 1 và các tiết cần soạn. Chọn “Soạn mới theo SGK” hoặc “Chuyển giáo án Word có sẵn” (tải tệp .docx). Bấm “Sao chép lời nhắc”, dán vào ChatGPT/Gemini/Claude (đính kèm SGK), dán câu trả lời vào ô 3 rồi bấm “Đọc giáo án”. Ứng dụng kiểm tra đúng mẫu, tự đặt tên tệp Edoc; tải Giáo án Word, Giáo án PDF và PowerPoint giảng dạy dùng offline dựng từ chính giáo án (có trang chủ đề, tên bài, tên mục, ghi vở, câu hỏi, nhiệm vụ về nhà; số slide tự ghi vào giáo án). Bấm “Lưu & mở trong Studio” để dạy tương tác với học sinh."],
    ["PowerPoint dùng offline", "powerpoint ppt slide offline hiệu ứng tải", "Studio → PowerPoint: tải tệp .pptx chạy không cần mạng, có hiệu ứng bấm để hiện (đáp án, giải thích, nhánh sơ đồ, ghi vở), đồng hồ cho hoạt động (bấm nút “► Bắt đầu · N phút” ở cuối trang: thanh giờ rút dần, mỗi vạch là 1 phút, hết giờ hiện “Hết giờ!”; bấm tiếp để hiện nội dung khác không làm đồng hồ dừng), trang kết thúc có nhiệm vụ về nhà và logo. Nên dùng phông Arial để máy nào cũng hiển thị đúng."],
    ["Mở tiết và dạy học", "dạy học mở phòng mã phòng qr màn chiếu học sinh vào lớp", "Menu Dạy học: chọn Môn → Bài → Tiết, nhập lớp, sĩ số, số nhóm → Mở phòng. Mở Màn chiếu ở máy chiếu; học sinh quét QR hoặc nhập mã phòng, chọn mã số (theo số thứ tự). Giáo viên điều khiển từng bước: mở nhận bài, khoá, công bố đáp án, bảng xếp hạng, gọi tên ngẫu nhiên."],
    ["Trộn đề kiểm tra", "trộn đề mã đề đáp án TN Maker tnmaker đề gốc tô đỏ g1 g2 g3 trắc nghiệm đúng sai trả lời ngắn", "Trang Trộn đề: tải đề gốc Word (.docx) chỉ gồm câu hỏi. Mỗi phần mở đầu bằng dòng in đậm <g1> (nhiều phương án), <g2> (đúng sai), <g3> (trả lời ngắn). Câu gõ “Câu 1.” hoặc “Câu 1:”; phương án A. B. C. D. tô đỏ phương án đúng; ý a) b) c) d) tô đỏ ý đúng; câu trả lời ngắn có dòng “Đáp án: …” tô đỏ. Máy báo lỗi nếu thiếu phương án hoặc chưa tô đỏ. Điền sở, trường, kì kiểm tra, môn, thời gian, số đề, cách đặt mã đề, tiền tố câu; bấm Trộn đề để nhận ZIP: đề gốc đã trình bày, các mã đề (Times New Roman, tiêu đề phần theo mẫu đề tốt nghiệp THPT), đáp án TN Maker 2025 (.xlsx) và đáp án Word có bảng đối chiếu với đề gốc. Công thức, hình ảnh giữ nguyên; đề xử lí ngay trên máy, không gửi lên mạng."],
    ["Danh sách lớp, điểm danh", "danh sách lớp học sinh sĩ số điểm danh vắng muộn tên trùng khối lớp năm học tải lên", "Quản trị viên tải danh sách lớp theo năm học (trang Danh sách lớp, trong menu tài khoản): Excel mỗi lớp một trang tính hoặc tệp xuất từ phần mềm quản lí trường, hoặc dán từng lớp. Khi mở tiết học, giáo viên chỉ chọn lớp (Khối → Lớp) và số nhóm. Mã học sinh S01… theo thứ tự danh sách; học sinh bấm vào tên của mình để vào lớp (tên = chữ cuối của họ tên; trùng tên thêm A, B, C theo thứ tự). Bấm Bắt đầu tiết học: em chưa vào được ghi Vắng; vào sau thì ghi Muộn. Nhận xét sau tiết tự lấy họ tên đầy đủ, bỏ qua em vắng. Học sinh và màn chiếu chỉ thấy mã và tên, không thấy họ tên đầy đủ."],
    ["Đồng hồ tiết học", "đồng hồ thời gian 45 phút đếm ngược tiến độ đồng hồ cát", "Dải tiến trình ở màn chiếu: mỗi hoạt động một đoạn màu theo pha; đoạn đang dạy tô dần theo số phút dự kiến; kim tròn chỉ thời điểm hiện tại; hiện “Đã học” và “Còn” của tiết, nhãn Đúng tiến độ/Chậm/Nhanh. Cột bên có đồng hồ cát cho hoạt động và “Còn lại của tiết”. Bấm “Bật âm thanh” để nghe chuông hết giờ."],
    ["Chế độ tự học của học sinh", "khoá copy toàn màn hình tự học rời bài gian lận", "Học sinh học ở chế độ toàn màn hình, không sao chép – dán, không chuyển tab tra AI; rời bài thì giáo viên thấy biểu tượng 🔒 trên sơ đồ chỗ ngồi. Nút SGK và trò chơi web được phép mở mà không tính rời bài. Có thể tắt khoá khi mở phòng."],
    ["Ghi vở và SGK", "ghi vở vở ghi sgk trang sách", "Nội dung “Ghi vào vở” tự vào Vở ghi trên máy học sinh; chữ trên màn chiếu đủ lớn (tối đa 4 ý mỗi trang). Học sinh bấm nút SGK ở đầu bài để mở đúng trang sách. Tổ trưởng/quản trị thấy link mở sai trang thì bấm “Sai trang?” ở Thư viện để chỉnh độ lệch cho cả cuốn."],
    ["Nhiệm vụ về nhà", "về nhà bài tập chuẩn bị tiết sau", "Mỗi tiết có nhiệm vụ về nhà và chuẩn bị cho tiết sau (lấy từ AI hoặc tự gợi ý theo hoạt động vận dụng và tiết kế tiếp trong Phụ lục 1); hiện ở trang cuối PowerPoint, màn chiếu khi kết thúc, máy học sinh và trong giáo án."],
    ["Nhận xét học sinh sau tiết", "nhận xét 30% học sinh con ý thức", "Kết thúc tiết → “Nhận xét học sinh”: hệ thống chọn khoảng 30% sĩ số (ưu tiên em chưa được nhận xét gần đây), mỗi em một nhận xét ≤ 100 kí tự bắt đầu bằng “Con…” dựa trên mức tham gia, trả lời đúng, rời bài. Dán danh sách lớp (theo số thứ tự) để hiện họ tên. Sửa trực tiếp rồi tải Excel 2 cột: Họ và tên – Nhận xét."],
    ["Báo giảng CSDL", "báo giảng csdl syllabus tiết theo ppct template tuần excel tên tệp tuần mới", "Menu Báo giảng: tải template báo giảng tuần xuất từ CSDL (đã có thời khoá biểu) → hệ thống điền cột “Tiết theo PPCT” theo Syllabus của trường → tải lại Excel giữ nguyên mẫu để nộp, tệp tự đặt tên “Tuan19_HieuNH39” (số tuần đọc trong template, tên là tài khoản giáo viên). Làm xong bấm “↺ Báo giảng tuần mới” để xoá bản vừa làm và tải template tuần sau; hệ thống tự nhớ tiết đã báo. Quy tắc: báo lần lượt từ tiết 1, mỗi tiết một lần; Ngữ văn, Lịch sử, Địa lí, LS&ĐL, GDCD, GDKT&PL không báo tiết kiểm tra (chọn tay hôm kiểm tra tại lớp); GDĐP, HĐTN báo cả tiết kiểm tra; HĐTN: GVCN chỉ báo tiết GVCN. Đánh dấu ngày nghỉ trong tuần; lần đầu nạp các tuần đã báo để biết tiết gần nhất. Quản trị tải Syllabus mỗi năm học và khai báo lịch nghỉ."],
    ["Dữ liệu và tiến độ", "dữ liệu insight tiến độ báo cáo minh chứng", "Menu Dữ liệu: số liệu từng tiết (tham gia, trả lời đúng, học từ bạn), phiếu nhận xét tiết dạy theo CV 5512. Menu Tiến độ: tổ trưởng/quản trị xem từng giáo viên đã soạn bao nhiêu tiết, dạy bao nhiêu tiết, báo giảng đến tuần nào, tỉ lệ bài trong Phụ lục 1 đã có tiết học."],
    ["Thư viện trường", "thư viện chia sẻ đăng bài", "Thư viện: duyệt bài theo môn – lớp – bài, xem các tiết đồng nghiệp đã đăng, dùng lại hoặc soạn tiết mới. Trong Studio bấm “Đăng lên thư viện trường” (cần đăng nhập)."],
    ["Xử lý sự cố", "lỗi không vào được âm thanh không kêu ảnh lỗi phông chữ", "Không có tiếng: bấm “Bật âm thanh” trên màn chiếu. Học sinh không vào được: kiểm tra mã phòng, mạng; mã số đã có bạn dùng thì giáo viên giải phóng trên sơ đồ chỗ ngồi. Ảnh không hiện: bấm “Tìm ảnh cho khối còn thiếu”. PowerPoint lỗi phông: chọn Arial khi tải. Trình duyệt chặn cửa sổ PDF: cho phép cửa sổ bật lên."]
  ];
  const norm = (s) =>
    String(s || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d")
      .toLowerCase();
  const manual = () =>
    `# Sổ tay sử dụng Lesson 360° Studio\n${(L360.cfg && L360.cfg.school) || ""}\n\n` + KB.map(([t, , c]) => `## ${t}\n${c}`).join("\n\n");
  function search(q) {
    const w = norm(q).split(/[^a-z0-9]+/).filter((x) => x.length > 1);
    if (!w.length) return [];
    return KB.map((k, i) => {
      const hay = norm(k[0] + " " + k[1]);
      const body = norm(k[2]);
      const sc = w.reduce((a, x) => a + (hay.includes(x) ? 3 : 0) + (body.includes(x) ? 1 : 0), 0);
      return { i, sc };
    })
      .filter((x) => x.sc > 1)
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 3)
      .map((x) => KB[x.i]);
  }
  const AI = [
    ["ChatGPT", "https://chatgpt.com/"],
    ["Gemini", "https://gemini.google.com/app"],
    ["Claude", "https://claude.ai/new"]
  ];
  function prompt(q) {
    return `Bạn là trợ lý hướng dẫn sử dụng ứng dụng "Lesson 360° Studio" cho giáo viên Trường TH, THCS & THPT FPT Bắc Giang. Chỉ trả lời dựa trên SỔ TAY bên dưới; nếu sổ tay không có, nói rõ là chưa có và gợi ý hỏi quản trị viên. Trả lời bằng tiếng Việt, ngắn gọn, theo từng bước bấm cụ thể.\n\n${manual()}\n\nCÂU HỎI CỦA GIÁO VIÊN: ${q}`;
  }
  function open() {
    const m = u.modal(`<div class="row" style="gap:10px"><span class="help-ic">?</span><h2 style="margin:0">Trợ lý hướng dẫn</h2></div>
      <p class="small muted" style="margin:6px 0 10px">Hỏi bất cứ điều gì về cách dùng Lesson 360° Studio. Câu trả lời nhanh lấy từ sổ tay; cần giải thích kĩ hơn thì bấm “Hỏi trợ lý AI”.</p>
      <input id="hq" placeholder="Ví dụ: làm sao điền báo giảng? tải giáo án PDF? nhận xét học sinh?" autocomplete="off">
      <div id="hres" class="help-res"></div>
      <div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn primary" id="hai">✦ Hỏi trợ lý AI</button>${AI.map(([n, l]) => `<a class="btn sm" href="${l}" target="_blank" rel="noopener">${n} ↗</a>`).join("")}<span class="spacer"></span><button class="btn sm ghost" id="hdl">Tải sổ tay cho AI (.md)</button></div>
      <p class="tiny muted" style="margin-top:6px">“Hỏi trợ lý AI” sao chép câu hỏi kèm toàn bộ sổ tay; dán vào trợ lý AI bất kì để được trả lời đúng theo ứng dụng. Có thể tải sổ tay để đưa vào một trợ lý AI riêng của tổ (GPTs, Gem, Project).</p>`);
    const q = u.$("#hq", m.el);
    const res = u.$("#hres", m.el);
    const show = () => {
      const hits = q.value.trim() ? search(q.value) : KB.slice(0, 0);
      res.innerHTML = q.value.trim()
        ? hits.length
          ? hits.map(([t, , c]) => `<div class="help-a"><b>${u.esc(t)}</b><p>${u.esc(c)}</p></div>`).join("")
          : `<p class="small muted">Chưa thấy trong sổ tay – bấm “Hỏi trợ lý AI”.</p>`
        : `<div class="help-topics">${KB.map(([t], i) => `<button class="chip" data-ht="${i}">${u.esc(t)}</button>`).join("")}</div>`;
      u.$$("[data-ht]", res).forEach((b) => (b.onclick = () => ((q.value = KB[Number(b.dataset.ht)][0]), (res.innerHTML = `<div class="help-a"><b>${u.esc(KB[Number(b.dataset.ht)][0])}</b><p>${u.esc(KB[Number(b.dataset.ht)][2])}</p></div>`))));
    };
    q.oninput = show;
    show();
    q.focus();
    u.$("#hai", m.el).onclick = async () => {
      const ok = await u.copy(prompt(q.value.trim() || "Hướng dẫn tôi các bước dùng ứng dụng."));
      u.toast(ok ? "Đã sao chép câu hỏi kèm sổ tay – dán vào ChatGPT, Gemini hoặc Claude." : "Không sao chép được.", ok ? "ok" : "bad", 4000);
    };
    u.$("#hdl", m.el).onclick = () => u.download("So-tay-Lesson360-Studio.md", manual(), "text/markdown;charset=utf-8");
  }
  L360.Help = { KB, manual, search, prompt, open };
  // Nút "?" nổi ở các trang giáo viên.
  document.addEventListener("DOMContentLoaded", () => {
    if (/hocsinh\.html|manchieu\.html/.test(location.pathname)) return;
    const b = document.createElement("button");
    b.className = "help-fab";
    b.title = "Trợ lý hướng dẫn sử dụng";
    b.innerHTML = "?";
    b.onclick = open;
    document.body.appendChild(b);
  });
})();
