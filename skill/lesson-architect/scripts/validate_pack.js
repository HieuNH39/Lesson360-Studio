#!/usr/bin/env node
/* Kiểm tra một gói bài học Lesson 360° bằng đúng bộ máy của nền tảng.
   Dùng: node validate_pack.js duong-dan/goi-bai-hoc.l360.json
   Kết quả: liệt kê LỖI (phải sửa), LƯU Ý (nên xem lại) và tóm tắt các bước. Mã thoát 1 nếu còn lỗi. */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const file = process.argv[2];
if (!file) {
  console.error("Cách dùng: node validate_pack.js <tệp .json>");
  process.exit(2);
}
const ctx = vm.createContext({ console, setTimeout, clearTimeout, crypto: globalThis.crypto, URLSearchParams, JSON, Math, Date });
vm.runInContext(fs.readFileSync(path.join(__dirname, "engine.bundle.js"), "utf8"), ctx);
const L360 = ctx.L360;
let raw;
try {
  raw = L360.Pack.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
  console.log("LỖI: không đọc được JSON – " + e.message);
  process.exit(1);
}
const v = L360.Pack.validate(raw);
const p = v.pack;
console.log(`Bài: ${p.title} | ${p.subject} ${p.grade} | ${p.steps.length} bước | ${v.totalMinutes}/${p.duration} phút`);
p.steps.forEach((s, i) => console.log(`  ${i + 1}. [${s.type}] ${s.title} – ${s.minutes || 0} phút`));
v.errors.forEach((e) => console.log("LỖI: " + e));
v.warnings.forEach((w) => console.log("LƯU Ý: " + w));
// Kiểm tra thêm: đáp án trắc nghiệm có rải đều không
const ans = p.steps.filter((s) => s.type === "quiz").flatMap((s) => s.questions.map((q) => q.answer));
if (ans.length >= 4) {
  const c = [0, 0, 0, 0];
  ans.forEach((a) => c[a] != null && c[a]++);
  if (Math.max(...c) > Math.ceil(ans.length / 2)) console.log(`LƯU Ý: đáp án trắc nghiệm dồn vào một phương án (A-B-C-D = ${c.join("-")}).`);
}
console.log(v.errors.length ? `KẾT QUẢ: còn ${v.errors.length} lỗi.` : "KẾT QUẢ: hợp lệ, chạy được trên Lesson 360°.");
process.exit(v.errors.length ? 1 : 0);
