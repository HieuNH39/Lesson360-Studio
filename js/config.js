/* Cấu hình Lesson 360° Studio.
   Muốn chạy trực tuyến (nhiều thiết bị): điền 5 giá trị Firebase bên dưới (xem docs/TRIEN-KHAI.md).
   Để trống thì web tự chạy chế độ Diễn tập (1 máy, nhiều tab, không cần Internet). */
window.L360_CONFIG = {
  appName: "Lesson 360° Studio",
  tagline: "Xưởng AI kiến tạo bài học số từ giáo án",
  school: "Trường TH, THCS & THPT FPT Bắc Giang",
  unit: "Tổ Khoa học xã hội",
  author: "Nguyễn Hữu Hiệu",

  firebase: {
    apiKey: "",
    authDomain: "",
    databaseURL: "",
    projectId: "",
    appId: ""
  },
  dbRoot: "l360",

  heritageLensUrl: "https://hieunh39.github.io/Kinh-Bac-ky-su/",
  defaultClassSize: 30,
  maxClassSize: 45,
  defaultGroupCount: 4
};
