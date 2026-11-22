# Triển khai Lesson 360° Studio cho một trường (khoảng 30 phút, 0 đồng)

Web là trang tĩnh: **GitHub Pages** (hoặc Netlify) phục vụ trang, **Firebase** (gói Spark miễn phí) giữ dữ liệu thời gian thực. Chưa cấu hình Firebase thì web vẫn chạy ở chế độ **Diễn tập** (một máy, nhiều tab) để tập dượt.

## 1. Đưa web lên GitHub Pages

1. Tạo kho (repository) công khai, ví dụ `Lesson360-Studio`, rồi tải toàn bộ thư mục này lên.
2. Vào **Settings → Pages**, chọn nhánh `main`, thư mục `/ (root)`, bấm **Save**.
3. Sau 1–2 phút, web có địa chỉ dạng `https://<tài-khoản>.github.io/Lesson360-Studio/`.

## 2. Tạo Firebase

1. Mở <https://console.firebase.google.com>, **Create a project** (tắt Google Analytics).
2. **Build → Authentication → Get started**: bật **Email/Password** và **Anonymous**.
3. **Build → Realtime Database → Create Database**, vị trí **Singapore (asia-southeast1)**, chọn *locked mode*.
4. Thẻ **Rules**: xoá hết, dán nội dung tệp `firebase/database.rules.json`, bấm **Publish**.
5. **Project settings → Your apps → Web (</>)**, đăng kí app, sao chép 5 giá trị `apiKey`, `authDomain`, `databaseURL`, `projectId`, `appId` vào `js/config.js`.
6. **Authentication → Settings → Authorized domains**: thêm `<tài-khoản>.github.io`.
7. Tải lại `js/config.js` lên GitHub.

`apiKey` của Firebase là khoá công khai, được phép nằm trên web; quyền đọc/ghi do luật bảo mật quyết định.

## 3. Tài khoản giáo viên

1. Người quản trị mở `giaovien.html`, thẻ **Đăng kí giáo viên**, tạo tài khoản đầu tiên (tự nhận quyền quản trị).
2. Trên màn hình **Mở tiết học**, mục **Quản trị trường**, đặt **Mã mời** (ví dụ `FSCBG2027`).
3. Gửi mã mời cho giáo viên. Mỗi giáo viên tự đăng kí ở thẻ **Đăng kí giáo viên**, nhập mã mời.

## 4. Kiểm tra nhanh

- `giaovien.html` → chọn bài mẫu → **Mở phòng** → **Mở màn chiếu**.
- Dùng điện thoại quét QR, vào lớp bằng một mã (S01), thử một hoạt động.
- Thanh trên của bảng điều khiển hiện **Trực tuyến**.

## Luật bảo mật đã kiểm thử (Firebase Emulator, 25/25 đạt)

Học sinh không đọc được gói bài học có đáp án, không đọc được bài của bạn, không nộp thay bạn, không nộp khi đã khoá, không đổi được tiến trình tiết học, không tự nhận quyền giáo viên; giáo viên khác không chiếm được phòng đang dạy; chỉ giáo viên đã đăng kí mới xem bảng dữ liệu.

## Chi phí

0 đồng với quy mô một trường: Firebase Spark cho phép 100 kết nối đồng thời và 1 GB dữ liệu; mỗi tiết học khoảng 50–200 KB.
