# Lesson 360° Studio – Xưởng AI kiến tạo bài học số từ giáo án

Sản phẩm dự thi **AI Educamp 2027 – Trường học số** của Trường TH, THCS & THPT FPT Bắc Giang. Tác giả: GV Nguyễn Hữu Hiệu, Tổ Khoa học xã hội.

**Dùng thử:** https://hieunh39.github.io/Lesson360-Studio/

Một giáo án → một tiết học tương tác cho mọi môn (có cả nhiệm vụ khám phá di sản Kinh Bắc) → một bảng dữ liệu cho cả trường. Giáo viên không cần biết lập trình.

| Thành phần | Trang | Làm gì |
|---|---|---|
| **ENGINE – Lesson Architect** | `studio.html`, thư mục `skill/` | Trợ lý AI (Claude Skill, hoặc lời nhắc cho ChatGPT/Gemini) chuyển KHBD thành gói bài học; giáo viên duyệt, sửa, in phiếu |
| **LIVE – Lớp học 360** | `giaovien.html`, `manchieu.html`, `hocsinh.html` | Giáo viên điều khiển, học sinh làm trên thiết bị, màn chiếu hiện kết quả cả lớp |
| **INSIGHT – Dữ liệu 360** | `insight.html` | Tự tổng hợp minh chứng mọi tiết dạy cho GV, TTCM, BGH |
| **EXPLORE – Di sản 360** | mẫu hoạt động `explore` | Nhiệm vụ khám phá 31 di tích trong [Heritage Lens – Kinh Bắc Ký Sự](https://hieunh39.github.io/Kinh-Bac-ky-su/) |

## Dùng thử ngay

Mở `index.html` qua một máy chủ web tĩnh bất kì (hoặc GitHub Pages), chọn **Dạy thử ngay**. Chế độ Diễn tập chạy trên một máy: mở trang học sinh và màn chiếu ở các tab khác.

## Thư mục

- `js/core/` – bộ máy: dữ liệu thời gian thực (Firebase hoặc Diễn tập), gói bài học, phòng học, thống kê, lời nhắc Lesson Architect
- `js/activities/` – 11 mẫu hoạt động: trình chiếu, trắc nghiệm nhanh, hai vòng học từ bạn, trả lời ngắn/phiếu thoát, chọn thẻ, ghép nối, sắp xếp, nhiệm vụ nhóm, triển lãm, lựa chọn của nhóm, khám phá di sản
- `packs/` – 3 gói bài học mẫu (Lịch sử 10, HĐTN-HN 10, Giáo dục địa phương) và bản JSON
- `skill/lesson-architect/` – Claude Skill + script kiểm tra gói bài học
- `firebase/database.rules.json` – luật bảo mật
- `docs/TRIEN-KHAI.md` – hướng dẫn triển khai cho một trường
- `tools/build.js` – sinh bản JSON của gói mẫu và tài nguyên cho Skill

## Minh bạch về AI

Mã nguồn được viết bằng phương pháp vibe coding với trợ lý AI Claude (Anthropic); giáo viên mô tả yêu cầu, kiểm thử và chỉnh sửa trên lớp thật. Ảnh minh hoạ dùng giấy phép mở (Wikimedia Commons, Heritage Lens) và ghi nguồn. Thư viện bên thứ ba: Firebase JS SDK (Apache-2.0), qrcode-generator (MIT).
