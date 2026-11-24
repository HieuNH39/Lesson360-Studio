# Thư viện mẫu hoạt động Lesson 360° (sinh tự động từ mã nguồn)

Mỗi bước luôn có: `id`, `type`, `title`, `minutes`, `instructions` (nhiệm vụ cho học sinh), `script` (lời dẫn cho giáo viên). Có thể thêm `media`: {`image`, `caption`, `credit`, `video`, `link`}.

```text
• type "slide" – Bài giảng trực quan: Nội dung chính chiếu cho cả lớp: nhiều trang, mỗi trang ghép các khối ảnh, dòng thời gian, sơ đồ tư duy, bảng so sánh, tư liệu, kết luận, ghi vào vở. Học sinh xem cùng trên máy và tự có vở ghi.
    - pages: mảng trang {"title","blocks":[khối…]} (xem KHỐI TRỰC QUAN) – Các trang bài giảng
  Ví dụ: {"id":"vi-du","type":"slide","phase":"hinh-thanh","title":"Tìm hiểu kiến thức mới","minutes":6,"pages":[{"title":"Nội dung 1","blocks":[{"kind":"image","src":"","query":"từ khoá tìm ảnh","caption":"Chú thích","credit":""},{"kind":"list","items":["Ý chính thứ nhất","Ý chính thứ hai"]},{"kind":"note","text":"- Điều học sinh cần ghi vào vở"}]}],"script":""}

• type "quiz" – Trắc nghiệm: Chuỗi câu hỏi có giờ: 4 lựa chọn, Đúng/Sai 4 ý (chấm như đề thi tốt nghiệp), trả lời ngắn. Tự khoá khi hết giờ hoặc cả lớp đã nộp; có bảng xếp hạng. Không tính tốc độ.
    - timer: số – Giây cho mỗi câu (Mặc định 20 (Đúng/Sai nên 45–60))
    - questions: mảng câu hỏi (xem DẠNG CÂU HỎI) – Câu hỏi
  Ví dụ: {"id":"vi-du","type":"quiz","phase":"luyen-tap","title":"Thử thách nhanh","minutes":6,"timer":20,"questions":[{"kind":"mcq","q":"Câu hỏi?","options":["Phương án A","Phương án B","Phương án C","Phương án D"],"answer":0,"explain":"Giải thích ngắn."},{"kind":"tf","q":"Đọc tư liệu và cho biết mỗi nhận định đúng hay sai.","statements":[{"text":"a) ...","answer":true},{"text":"b) ...","answer":false},{"text":"c) ...","answer":true},{"text":"d) ...","answer":false}],"explain":""},{"kind":"short","q":"Câu hỏi trả lời ngắn?","answer":"đáp án","accept":[],"explain":""},{"kind":"fill","q":"Chọn từ thích hợp điền vào chỗ trống.","text":"Câu có [[đáp án 1]] và [[đáp án 2]].","bank":["từ nhiễu"],"explain":""},{"kind":"sort","q":"Xếp các mục vào đúng nhóm.","groups":["Nhóm A","Nhóm B"],"items":[{"text":"mục 1","group":0},{"text":"mục 2","group":1},{"text":"mục 3","group":0}],"explain":""}]}

• type "poll2" – Hai vòng – học từ bạn: Vòng 1 tự chọn → trao đổi cặp → vòng 2 giữ hoặc đổi → công bố. Màn chiếu so sánh hai vòng: minh chứng học sinh tiến bộ ngay trong tiết.
    - question: chuỗi (có thể nhiều dòng) – Câu hỏi
    - options: mảng chuỗi (các phương án) – Phương án
    - explain: chuỗi (có thể nhiều dòng) – Giải thích đáp án
    - card: chuỗi (có thể nhiều dòng) – Thẻ ghi nhớ sau khi công bố
    - timer: mảng 2 số – Giây vòng 1, vòng 2 (Ví dụ 60 và 45)
    - answer: số thứ tự phương án đúng (0 = A); poll2 để null nếu là câu hỏi ý kiến
  Ví dụ: {"id":"vi-du","type":"poll2","phase":"hinh-thanh","title":"Em chọn gì?","minutes":4,"question":"Câu hỏi khái niệm dễ nhầm?","options":["Phương án A","Phương án B"],"answer":1,"explain":"","card":"","timer":[60,45]}

• type "text" – Viết ngắn / Phiếu thoát: Học sinh viết câu trả lời có giới hạn từ (phân tích tư liệu, nêu ý kiến, phiếu thoát); tự đánh giá 3 mức; giáo viên gắn ★ bài hay để chiếu; màn chiếu có đám mây từ.
    - question: chuỗi (có thể nhiều dòng) – Câu hỏi / nhiệm vụ
    - source: chuỗi (có thể nhiều dòng) – Tư liệu kèm theo (không bắt buộc)
    - maxWords: số – Giới hạn số từ
    - placeholder: chuỗi – Câu mở đầu gợi ý (Ví dụ: Tôi muốn thế hệ tương lai hiểu rằng…)
    - selfAssess: true/false – Có tự đánh giá 3 mức
    - askDoubt: true/false – Hỏi điều còn băn khoăn
    - sample: chuỗi (có thể nhiều dòng) – Gợi ý đáp án (công bố sau)
    - timer: số – Thời gian (giây)
  Ví dụ: {"id":"vi-du","type":"text","phase":"van-dung","title":"Phiếu thoát","minutes":3,"question":"Điều quan trọng nhất em học được hôm nay là gì?","maxWords":40,"selfAssess":true,"askDoubt":true,"timer":120}

• type "cards" – Chọn thẻ + giả thuyết: Học sinh chọn tối đa N thẻ (yếu tố, nguyên nhân, đặc điểm…) và viết giả thuyết ngắn; màn chiếu hiện tần suất các thẻ.
    - question: chuỗi (có thể nhiều dòng) – Câu hỏi
    - cards: mảng chuỗi – Các thẻ
    - maxPick: số – Số thẻ tối đa được chọn
    - textPrompt: chuỗi – Yêu cầu viết (để trống nếu không cần)
    - maxWords: số – Giới hạn từ
    - conclusion: chuỗi (có thể nhiều dòng) – Kết luận công bố cuối hoạt động
    - timer: số – Thời gian (giây)
  Ví dụ: {"id":"vi-du","type":"cards","title":"Chọn thẻ","minutes":3,"question":"Những yếu tố nào…?","cards":["Yếu tố 1","Yếu tố 2","Yếu tố 3","Yếu tố 4"],"maxPick":3,"textPrompt":"Viết giả thuyết của em","maxWords":30,"conclusion":"","timer":90}

• type "match" – Ghép nối: Ghép mỗi ý ở cột trái với một ý ở cột phải (thứ tự cột phải được xáo trộn); có thể yêu cầu viết 1 câu giải thích.
    - question: chuỗi (có thể nhiều dòng) – Yêu cầu
    - pairs: mảng {"left","right"} – cặp ĐÚNG, hệ thống tự xáo cột phải – Các cặp đúng (trái – phải)
    - whyPrompt: chuỗi – Yêu cầu giải thích (để trống nếu không cần)
    - explain: chuỗi (có thể nhiều dòng) – Giải thích sau khi công bố
    - timer: số – Thời gian (giây)
  Ví dụ: {"id":"vi-du","type":"match","title":"Ghép nối","minutes":4,"question":"Ghép mỗi … với … phù hợp.","pairs":[{"left":"Ý trái 1","right":"Ý phải 1"},{"left":"Ý trái 2","right":"Ý phải 2"},{"left":"Ý trái 3","right":"Ý phải 3"}],"whyPrompt":"","explain":"","timer":120}

• type "order" – Sắp xếp trình tự: Sắp xếp sự kiện, bước, giai đoạn theo đúng thứ tự (trục thời gian, quy trình). Nhập các mục theo thứ tự ĐÚNG; hệ thống tự xáo trộn.
    - question: chuỗi (có thể nhiều dòng) – Yêu cầu
    - items: mảng chuỗi – Các mục theo thứ tự đúng
    - explain: chuỗi (có thể nhiều dòng) – Giải thích sau khi công bố
    - timer: số – Thời gian (giây)
  Ví dụ: {"id":"vi-du","type":"order","title":"Sắp xếp trình tự","minutes":3,"question":"Sắp xếp các sự kiện theo trình tự thời gian.","items":["Sự kiện 1","Sự kiện 2","Sự kiện 3","Sự kiện 4"],"explain":"","timer":90}

• type "groupwork" – Nhiệm vụ nhóm (hồ sơ): Mỗi nhóm có tư liệu riêng, phân vai, thành viên gửi đóng góp, Thư kí soạn hồ sơ theo các mục A, B, C… rồi nộp. Giáo viên theo dõi tiến độ từng nhóm.
    - task: chuỗi (có thể nhiều dòng) – Nhiệm vụ của nhóm
    - roles: mảng chuỗi – Các vai trong nhóm (vai đầu tiên là Thư kí)
    - fields: mảng {"key":"A","label","hint"} – Các mục của hồ sơ
    - resources: mảng đối tượng (xem ví dụ) – Tư liệu (JSON nâng cao) ([{"title":"…","body":"…","image":"","credit":"","for":[1]}] – "for" là số thứ tự nhóm, để trống = mọi nhóm)
    - timer: số – Thời gian (giây)
  Ví dụ: {"id":"vi-du","type":"groupwork","title":"Nghiên cứu nhóm","minutes":12,"task":"Đọc tư liệu, thảo luận và hoàn thành hồ sơ nhóm.","roles":["Thư kí","Trưởng nhóm","Người tìm tư liệu","Người thuyết trình"],"fields":[{"key":"A","label":"Thông tin chính"},{"key":"B","label":"Ý nghĩa"}],"resources":[{"title":"Tư liệu chung","body":"Đọc SGK trang …"}],"timer":600}

• type "expo" – Triển lãm – nhận xét chéo: Lần lượt chiếu hồ sơ của từng nhóm (mặc định 75 giây/nhóm); các bạn nhóm khác chấm 3 tiêu chí và đặt câu hỏi.
    - source: chuỗi – Lấy hồ sơ từ bước (id) (Để trống: nhiệm vụ nhóm gần nhất phía trước)
    - perGroupSec: số – Giây cho mỗi nhóm
    - criteria: mảng chuỗi – Tiêu chí chấm (1–5 sao)
    - askQuestion: true/false – Cho đặt câu hỏi
  Ví dụ: {"id":"vi-du","type":"expo","title":"Triển lãm hồ sơ","minutes":7,"perGroupSec":75,"criteria":["Nội dung chính xác","Trình bày rõ ràng","Có điểm mới, sáng tạo"],"askQuestion":true}

• type "auction" – Lựa chọn của nhóm (đấu giá): Mỗi nhóm chọn 1 mục (di sản, phương án, giả thuyết…), đặt mức ưu tiên/giá trong ngân sách và nêu lí do; giáo viên trao quyền cho nhóm thuyết phục nhất.
    - question: chuỗi (có thể nhiều dòng) – Yêu cầu
    - items: mảng đối tượng (xem ví dụ) – Các mục để chọn (JSON nâng cao) ([{"title":"…","text":"…","image":"","credit":""}])
    - budget: số – Ngân sách tối đa
    - min: số – Mức tối thiểu
    - stepBy: số – Bước giá
    - timer: số – Thời gian (giây)
  Ví dụ: {"id":"vi-du","type":"auction","title":"Phiên đấu giá","minutes":5,"question":"Nhóm em chọn mục nào? Đặt giá và nêu lí do.","items":[{"title":"Mục 1","text":""},{"title":"Mục 2","text":""},{"title":"Mục 3","text":""}],"budget":100,"min":10,"stepBy":5,"timer":120}

• type "explore" – Khám phá di sản (Heritage Lens): Mở trang di tích trong ứng dụng Heritage Lens (31 di tích Kinh Bắc, có thuyết minh, ảnh, câu đố), rồi hoàn thành nhiệm vụ: trả lời ngắn hoặc trắc nghiệm.
    - siteId: mã di tích Heritage Lens – Di tích
    - url: chuỗi – Hoặc đường dẫn khác (Để trống để dùng trang di tích trong Heritage Lens)
    - mission: chuỗi (có thể nhiều dòng) – Nhiệm vụ khám phá
    - answerType: một giá trị trong danh sách – Kiểu trả lời
    - options: mảng chuỗi (các phương án) – Phương án (nếu trắc nghiệm)
    - maxWords: số – Giới hạn từ (nếu viết)
    - explain: chuỗi (có thể nhiều dòng) – Giải thích / kết luận sau khi công bố
    - timer: số – Thời gian (giây)
    - answer: số thứ tự phương án đúng (0 = A); poll2 để null nếu là câu hỏi ý kiến
  Ví dụ: {"id":"vi-du","type":"explore","title":"Khám phá di sản","minutes":6,"siteId":"phat-tich","mission":"Mở trang di tích, nghe thuyết minh và cho biết một chi tiết chứng tỏ giá trị lịch sử của di tích.","answerType":"text","maxWords":40,"timer":300}
```

Mã di tích Heritage Lens: `chua-tieu` (Chùa Tiêu), `den-do` (Đền Đô), `dinh-bang` (Đình Đình Bảng), `dong-ky` (Đình, chùa Đồng Kỵ và Hội rước pháo), `nguyen-van-cu` (Khu lưu niệm Tổng Bí thư Nguyễn Văn Cừ), `phat-tich` (Chùa Phật Tích), `but-thap` (Chùa Bút Tháp), `chua-dau` (Chùa Dâu), `dong-ho` (Làng tranh dân gian Đông Hồ), `kinh-duong-vuong` (Lăng và đền thờ Kinh Dương Vương), `luy-lau` (Thành cổ Luy Lâu), `ba-chua-kho` (Đền Bà Chúa Kho), `hoi-lim` (Đồi Lim: lăng Hồng Vân, chùa Hồng Ân và Hội Lim), `lang-diem` (Làng Diềm – đền Vua Bà, Thủy tổ Quan họ), `thanh-bac-ninh` (Thành cổ Bắc Ninh), `van-mieu-bac-ninh` (Văn Miếu Bắc Ninh), `atk2-hiep-hoa` (An toàn khu II (ATK II) Hiệp Hòa), `bo-da` (Chùa Bổ Đà), `tho-ha` (Làng cổ Thổ Hà), `phu-lao` (Đình Phù Lão), `tien-luc` (Cây dã hương nghìn năm và quần thể di tích Tiên Lục), `xuong-giang` (Địa điểm chiến thắng Xương Giang), `yen-the` (Khu di tích khởi nghĩa Yên Thế – Hoàng Hoa Thám), `tay-yen-tu` (Tây Yên Tử), `vinh-nghiem` (Chùa Vĩnh Nghiêm), `den-xa` (Đền Xà và phòng tuyến sông Như Nguyệt), `dinh-huong` (Lăng đá Dinh Hương), `lo-hanh` (Đình Lỗ Hạnh), `le-van-thinh` (Đền thờ Trạng nguyên Lê Văn Thịnh), `nui-dam` (Núi Dạm: chùa Dạm và chùa Hàm Long), `phu-lang` (Làng gốm Phù Lãng).
