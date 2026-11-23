/* Cấu hình Lesson 360° Studio.
   Muốn chạy trực tuyến (nhiều thiết bị): điền 5 giá trị Firebase bên dưới (xem docs/TRIEN-KHAI.md).
   Để trống thì web tự chạy chế độ Diễn tập (1 máy, nhiều tab, không cần Internet). */
window.L360_CONFIG = {
  appName: "Lesson 360° Studio",
  tagline: "Xưởng AI kiến tạo bài học số từ giáo án",
  school: "Trường TH, THCS & THPT FPT Bắc Giang",
  unit: "Tổ Khoa học xã hội",
  author: "Nguyễn Hữu Hiệu",
  // Ký xác nhận ở cuối giáo án (Edoc) và đặt tên tệp theo quy định của trường.
  toTruong: "Nguyễn Ngọc Đức",
  diaDanh: "Bắc Giang",
  toMa: "XaHoi",

  firebase: {
    apiKey: "AIzaSyC8ipSHqxF6i5_u23O9OzLJaXHsD-lQiYU",
    authDomain: "lesson360-studio.firebaseapp.com",
    databaseURL: "https://lesson360-studio-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "lesson360-studio",
    appId: "1:353741355347:web:631d6bd9392334c2d009a6"
  },
  dbRoot: "l360",

  heritageLensUrl: "https://hieunh39.github.io/Kinh-Bac-ky-su/",
  defaultClassSize: 30,
  maxClassSize: 45,
  defaultGroupCount: 4
};
