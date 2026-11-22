/* Gói bài học (lesson pack) – định dạng chung giữa trợ lý AI, Studio và lớp học.
   Mỗi bước (step) có một "type" lấy từ thư viện mẫu hoạt động (L360.types). */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  L360.types = {};
  L360.typeOrder = [];
  L360.registerType = (def) => {
    L360.types[def.type] = def;
    if (!L360.typeOrder.includes(def.type)) L360.typeOrder.push(def.type);
  };
  L360.packs = L360.packs || []; // gói mẫu đăng kí từ thư mục packs/

  const DEFAULT_GROUP_NAMES = ["Nhóm 1", "Nhóm 2", "Nhóm 3", "Nhóm 4", "Nhóm 5", "Nhóm 6"];
  const GROUP_COLORS = ["#2A62B0", "#C98A12", "#3E7A3B", "#B4552D", "#1F8A8A", "#8A5A2B"];

  // Khoá bài nộp cho từng lượt (câu quiz, vòng 2, nhóm triển lãm...).
  L360.subKey = (step, state) => {
    const t = L360.types[step.type];
    return t && t.subKey ? t.subKey(step, state || {}) : step.id;
  };

  const Pack = {
    SCHEMA: "l360-pack/1",
    normalize(raw) {
      const p = u.clone(raw) || {};
      p.schema = Pack.SCHEMA;
      p.title = String(p.title || "Bài học chưa đặt tên").trim();
      p.subject = p.subject || "";
      p.grade = p.grade != null ? String(p.grade) : "";
      p.id = p.id || u.slug(`${p.subject}-${p.grade}-${p.title}`) || "bai-" + u.uid(6);
      p.duration = Number(p.duration) || 45;
      p.objectives = Array.isArray(p.objectives) ? p.objectives : p.objectives ? [String(p.objectives)] : [];
      p.theme = Object.assign({ accent: "", bg: "", font: "" }, p.theme || {});
      if (!Array.isArray(p.groups) || !p.groups.length) p.groups = null;
      const seen = new Set();
      p.steps = (Array.isArray(p.steps) ? p.steps : []).map((s, i) => {
        s = Object.assign({}, s);
        let id = String(s.id || `s${i + 1}`).replace(/[^A-Za-z0-9-]/g, "");
        if (!id || seen.has(id)) id = `s${i + 1}x${u.uid(3)}`;
        seen.add(id);
        s.id = id;
        s.type = s.type || "slide";
        s.title = String(s.title || `Hoạt động ${i + 1}`);
        s.minutes = Number(s.minutes) || 0;
        const t = L360.types[s.type];
        if (t && t.normalize) t.normalize(s);
        return s;
      });
      p.meta = Object.assign({}, p.meta || {});
      return p;
    },
    validate(raw) {
      const errors = [];
      const warnings = [];
      if (!raw || typeof raw !== "object") return { errors: ["Không đọc được nội dung gói bài học."], warnings };
      if (!raw.title) errors.push("Thiếu tên bài học (title).");
      if (!Array.isArray(raw.steps) || !raw.steps.length) errors.push("Gói bài học chưa có hoạt động nào (steps).");
      const p = Pack.normalize(raw);
      let total = 0;
      p.steps.forEach((s, i) => {
        const t = L360.types[s.type];
        const where = `Bước ${i + 1} (${s.title})`;
        if (!t) {
          errors.push(`${where}: loại hoạt động "${s.type}" không có trong thư viện.`);
          return;
        }
        total += s.minutes || 0;
        if (t.validate) t.validate(s, (m) => errors.push(`${where}: ${m}`), (m) => warnings.push(`${where}: ${m}`), p);
      });
      if (total && total > p.duration + 2) warnings.push(`Tổng thời lượng các bước là ${total} phút, vượt ${p.duration} phút của tiết học.`);
      if (p.steps.filter((s) => s.type === "groupwork").length > 1)
        warnings.push("Có hơn 1 nhiệm vụ nhóm trong bài – nên giữ tối đa 1 nhiệm vụ nhóm mỗi tiết.");
      return { errors, warnings, pack: p, totalMinutes: total };
    },
    // Đọc chuỗi JSON (chấp nhận cả khối ```json ... ``` do trợ lý AI trả về).
    parse(text) {
      let s = String(text || "").trim();
      const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fence) s = fence[1].trim();
      const a = s.indexOf("{");
      const b = s.lastIndexOf("}");
      if (a > 0 || (b >= 0 && b < s.length - 1)) s = s.slice(a, b + 1);
      return JSON.parse(s);
    },
    groups(pack, count) {
      const n = Math.max(2, Math.min(6, Number(count) || L360.cfg.defaultGroupCount || 4));
      const src = (pack && pack.groups) || [];
      const out = [];
      for (let i = 0; i < n; i++) {
        const g = src[i] || {};
        out.push({ id: "g" + (i + 1), name: g.name || DEFAULT_GROUP_NAMES[i], color: g.color || GROUP_COLORS[i] });
      }
      return out;
    },
    // Phần công khai: mọi học sinh thấy được, không chứa đáp án.
    publicMeta(p) {
      return {
        title: p.title,
        subject: p.subject,
        grade: p.grade,
        lessonRef: p.lessonRef || "",
        theme: p.theme,
        steps: p.steps.map((s) => {
          const t = L360.types[s.type] || {};
          return {
            id: s.id,
            type: s.type,
            title: s.title,
            minutes: s.minutes || 0,
            instructions: s.instructions || "",
            count: t.count ? t.count(s) : 1,
            noSubmit: !!t.noSubmit,
            groupMode: !!t.groupMode
          };
        })
      };
    },
    publicItem(step, state) {
      const t = L360.types[step.type];
      return t && t.publicPayload ? t.publicPayload(step, state || {}) : {};
    },
    answerItem(step, state) {
      const t = L360.types[step.type];
      return t && t.answerPayload ? t.answerPayload(step, state || {}) : null;
    },
    // Thống kê ngắn cho phần mô tả gói bài học.
    summary(p) {
      const byType = {};
      p.steps.forEach((s) => (byType[s.type] = (byType[s.type] || 0) + 1));
      return {
        steps: p.steps.length,
        minutes: p.steps.reduce((a, s) => a + (s.minutes || 0), 0),
        types: Object.keys(byType).map((k) => `${(L360.types[k] || {}).label || k} × ${byType[k]}`)
      };
    }
  };
  L360.Pack = Pack;

  /* Thư viện gói bài học trên máy này (localStorage) + gói mẫu. */
  const LIB_KEY = "l360:library";
  L360.Library = {
    list() {
      let mine = [];
      try {
        mine = JSON.parse(localStorage.getItem(LIB_KEY) || "[]");
      } catch (e) {}
      return mine;
    },
    samples() {
      return (L360.packs || []).map((p) => Pack.normalize(p));
    },
    all() {
      const mine = L360.Library.list();
      const ids = new Set(mine.map((p) => p.id));
      return mine.concat(L360.Library.samples().filter((p) => !ids.has(p.id)).map((p) => Object.assign(p, { _sample: true })));
    },
    get(id) {
      return L360.Library.all().find((p) => p.id === id) || null;
    },
    save(pack) {
      const p = Pack.normalize(pack);
      delete p._sample;
      p.meta.updatedAt = Date.now();
      const list = L360.Library.list().filter((x) => x.id !== p.id);
      list.unshift(p);
      localStorage.setItem(LIB_KEY, JSON.stringify(list));
      return p;
    },
    remove(id) {
      localStorage.setItem(LIB_KEY, JSON.stringify(L360.Library.list().filter((x) => x.id !== id)));
    }
  };
})();
