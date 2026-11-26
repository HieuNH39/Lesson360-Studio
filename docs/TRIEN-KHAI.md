# Triển khai Lesson 360° Studio cho một trường (khoảng 30 phút)

Web là trang tĩnh: **GitHub Pages** (hoặc Netlify) phục vụ trang, **Firebase** giữ dữ liệu thời gian thực và tài khoản. Chưa cấu hình Firebase thì web vẫn chạy ở chế độ **Diễn tập** (một máy, nhiều tab) để tập dượt.

## 1. Đưa web lên GitHub Pages

1. Tạo kho (repository) công khai, ví dụ `Lesson360-Studio`, rồi tải toàn bộ thư mục này lên.
2. Vào **Settings → Pages**, chọn nhánh `main`, thư mục `/ (root)`, bấm **Save**.
3. Sau 1–2 phút, web có địa chỉ dạng `https://<tài-khoản>.github.io/Lesson360-Studio/`.

## 2. Sửa thông tin trường – một tệp `js/config.js`

| Khoá | Ý nghĩa |
| --- | --- |
| `school`, `unit`, `author` | Tên trường, tổ chuyên môn, tác giả hiện ở chân trang và giáo án |
| `toTruong`, `diaDanh`, `toMa` | Tổ trưởng kí giáo án Edoc, địa danh, mã tổ trong tên tệp Edoc |
| `emailDomain` | Tên miền email công ty – giáo viên chỉ đăng kí được bằng email này |
| `firebase` | 5 giá trị của dự án Firebase riêng của trường (bước 3) |

## 3. Tạo Firebase

1. Mở <https://console.firebase.google.com>, **Create a project** (tắt Google Analytics).
2. **Build → Authentication → Get started**: bật **Email/Password** và **Anonymous** (học sinh vào lớp ẩn danh, không cần tài khoản).
3. **Build → Realtime Database → Create Database**, vị trí **Singapore (asia-southeast1)**, chọn *locked mode*.
4. Thẻ **Rules**: xoá hết, dán nội dung tệp `firebase/database.rules.json`, bấm **Publish**. Nếu dùng tên miền email khác `fpt.edu.vn`, thay tên miền trong tệp luật trước khi dán.
5. **Project settings → Your apps → Web (</>)**, đăng kí app, sao chép `apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId` vào mục `firebase` của `js/config.js`.
6. **Authentication → Settings → Authorized domains**: thêm `<tài-khoản>.github.io`.
7. Tải lại `js/config.js` lên GitHub.

`apiKey` của Firebase là khoá công khai, được phép nằm trên web; quyền đọc/ghi do luật bảo mật quyết định.

## 4. Tài khoản và phân quyền

1. Người quản trị đăng kí tài khoản đầu tiên ở trang **Tài khoản** (`taikhoan.html`): khi cơ sở dữ liệu chưa có quản trị viên, tài khoản đầu tiên tự nhận quyền **Quản trị**.
2. Quản trị phân quyền **Tổ trưởng** cho từng tổ trưởng.
3. Giáo viên đăng kí bằng email công ty (phải xác minh email) → yêu cầu chờ duyệt → tổ trưởng hoặc quản trị duyệt và chọn môn phụ trách. Tên tài khoản là phần trước `@` của email (ví dụ HieuNH39).
4. Quản trị tải **Danh sách lớp** (Excel, theo năm học, Khối → Lớp) ở trang `lophoc.html` để giáo viên chọn lớp khi mở tiết.
5. Quản trị nạp **Phụ lục 1** và **Syllabus CSDL** của trường cho từng môn (trang Phụ lục 1, trang Báo giảng).

## 5. Kiểm tra nhanh

- `giaovien.html` → chọn lớp, chọn bài mẫu → **Mở phòng** → **Mở màn chiếu**.
- Dùng laptop hoặc iPad khác quét QR, vào lớp, bấm vào tên mình, thử một hoạt động.
- Thanh trên của bảng điều khiển hiện **Trực tuyến**.

## Luật bảo mật đã kiểm thử (Firebase Emulator)

- Tài khoản và phân quyền: 42/42 kiểm tra đạt, gồm các trường hợp giả mạo quyền quản trị, tổ trưởng; email ngoài tên miền công ty bị chặn.
- Danh sách lớp: 16/16 kiểm tra đạt; phòng học chỉ chứa mã và tên gọi ngắn, họ tên đầy đủ chỉ giáo viên đã duyệt đọc được, học sinh không đổi được tên có sẵn.
- Học sinh không đọc được gói bài học có đáp án, không đọc được bài của bạn, không nộp thay bạn, không nộp khi đã khoá, không đổi được tiến trình tiết học.

## Chi phí

Không phải trả phí với quy mô một trường khi dùng gói Firebase Spark miễn phí (100 kết nối đồng thời, 1 GB dữ liệu; mỗi tiết học khoảng 50–200 KB). Giáo viên dùng trợ lý AI quen thuộc (ChatGPT, Gemini hoặc Claude) để soạn giáo án qua lời nhắc chuẩn của Studio.
