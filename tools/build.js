/* Công cụ dựng (chạy bằng Node 18+): node tools/build.js
   1. Xuất các gói bài học mẫu ra JSON (packs/json/*.l360.json)
   2. Sinh tài liệu danh mục mẫu hoạt động cho Skill (skill/lesson-architect/references/activity-types.md)
   3. Đóng gói bộ máy kiểm tra cho Skill (skill/lesson-architect/scripts/engine.bundle.js) */
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.join(__dirname, "..");
const ENGINE = [
  "js/config.js",
  "js/core/util.js",
  "js/core/pack.js",
  "js/core/ui.js",
  "js/core/room.js",
  "js/core/architect.js",
  "js/data/heritage-sites.js",
  "js/activities/basic.js",
  "js/activities/interactive.js",
  "js/activities/group.js",
  "js/activities/explore.js"
];
const SHIM = `var window = globalThis; var document = { querySelectorAll: () => [], querySelector: () => null, getElementById: () => null, createElement: () => ({ style: {} }) };
var location = { search: "", href: "" }; var localStorage = { getItem: () => null, setItem() {}, removeItem() {} }; var sessionStorage = localStorage;
var requestAnimationFrame = (f) => setTimeout(f, 0); var setInterval = () => 0;\n`;
const bundle = SHIM + ENGINE.map((f) => `/* ${f} */\n` + fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n");
const ctx = vm.createContext({ console, setTimeout, clearTimeout, crypto: globalThis.crypto, URLSearchParams, JSON, Math, Date });
vm.runInContext(bundle, ctx);
const L360 = ctx.L360;
// 1. Gói mẫu
fs.mkdirSync(path.join(ROOT, "packs/json"), { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, "packs")).filter((x) => x.endsWith(".js"))) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, "packs", f), "utf8"), ctx);
}
const out = [];
for (const raw of L360.packs) {
  const v = L360.Pack.validate(raw);
  if (v.errors.length) throw new Error(raw.id + ": " + v.errors.join("; "));
  fs.writeFileSync(path.join(ROOT, "packs/json", raw.id + ".l360.json"), JSON.stringify(raw, null, 2));
  out.push(`${raw.id}: ${v.pack.steps.length} bước, ${v.totalMinutes} phút, ${v.warnings.length} lưu ý`);
}
// 2. Tài liệu danh mục
const skillDir = path.join(ROOT, "skill/lesson-architect");
fs.mkdirSync(path.join(skillDir, "references"), { recursive: true });
fs.mkdirSync(path.join(skillDir, "scripts"), { recursive: true });
fs.mkdirSync(path.join(skillDir, "examples"), { recursive: true });
fs.writeFileSync(
  path.join(skillDir, "references/activity-types.md"),
  `# Thư viện mẫu hoạt động Lesson 360° (sinh tự động từ mã nguồn)\n\nMỗi bước luôn có: \`id\`, \`type\`, \`title\`, \`minutes\`, \`instructions\` (nhiệm vụ cho học sinh), \`script\` (lời dẫn cho giáo viên). Có thể thêm \`media\`: {\`image\`, \`caption\`, \`credit\`, \`video\`, \`link\`}.\n\n\`\`\`text\n${L360.Architect.catalog()}\n\`\`\`\n\nMã di tích Heritage Lens: ${(ctx.L360_HERITAGE || []).map((s) => `\`${s.id}\` (${s.name})`).join(", ")}.\n`
);
fs.writeFileSync(path.join(skillDir, "references/prompt-goc.md"), "# Lời nhắc gốc dùng cho ChatGPT, Gemini (bản đầy đủ)\n\n```text\n" + L360.Architect.prompt({}) + "\n```\n");
for (const raw of L360.packs) fs.copyFileSync(path.join(ROOT, "packs/json", raw.id + ".l360.json"), path.join(skillDir, "examples", raw.id + ".l360.json"));
// 3. Bộ máy kiểm tra
fs.writeFileSync(path.join(skillDir, "scripts/engine.bundle.js"), "/* Sinh tự động bởi tools/build.js – không sửa tay. */\n" + bundle);
console.log(out.join("\n"));
console.log("Đã sinh: packs/json, skill/lesson-architect/{references,examples,scripts/engine.bundle.js}");
