/* Gói bài học (lesson pack) – định dạng chung giữa trợ lý AI, Studio, thư viện và lớp học.
   Bản 2 (l360-pack/2): mỗi gói là MỘT TIẾT của một bài SGK (Bài X – Tiết Y/Z), có phong cách thiết kế,
   mỗi bước gắn một pha: khởi động – hình thành kiến thức – luyện tập – vận dụng. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  L360.types = {};
  L360.typeOrder = [];
  L360.registerType = (def) => {
    L360.types[def.type] = def;
    if (!L360.typeOrder.includes(def.type)) L360.typeOrder.push(def.type);
  };
  L360.packs = L360.packs || []; // bài mẫu đăng kí từ thư mục packs/

  const DEFAULT_GROUP_NAMES = ["Nhóm 1", "Nhóm 2", "Nhóm 3", "Nhóm 4", "Nhóm 5", "Nhóm 6"];
  const GROUP_COLORS = ["#2F6FDB", "#E8930C", "#1E8E5A", "#D2453B", "#0C9A9A", "#8A5A2B"];

  // Bốn pha của tiến trình dạy học (CV 5512).
  const PHASES = [
    { id: "khoi-dong", name: "Khởi động", short: "KĐ" },
    { id: "hinh-thanh", name: "Hình thành kiến thức", short: "HT" },
    { id: "luyen-tap", name: "Luyện tập", short: "LT" },
    { id: "van-dung", name: "Vận dụng", short: "VD" }
  ];
  const PH_IDX = Object.fromEntries(PHASES.map((p, i) => [p.id, i]));
  const PH_ALIAS = { "mo-dau": "khoi-dong", "khoi-dong": "khoi-dong", kd: "khoi-dong", "hinh-thanh-kien-thuc": "hinh-thanh", "hinh-thanh": "hinh-thanh", ht: "hinh-thanh", "luyen-tap": "luyen-tap", lt: "luyen-tap", "van-dung": "van-dung", vd: "van-dung" };
  L360.PHASES = PHASES;
  L360.phase = (id) => PHASES.find((p) => p.id === id) || PHASES[1];

  /* Rải đều đáp án đúng của câu nhiều lựa chọn (A/B/C/D) – trợ lý AI hay để đáp án ở A.
     Ổn định theo nội dung: gọi lại nhiều lần cho cùng kết quả, nên giáo án Word, PowerPoint và bài dạy online luôn khớp.
     Không xáo câu có phương án dẫn chiếu ("Cả A và B", "Tất cả các ý trên"); câu toàn số/năm thì xếp tăng dần. */
  const REF_OPT = /(cả\s+[A-H]\s*(và|,|lẫn)|[A-H]\s+và\s+[A-H]\b|(tất\s+)?cả\s+(các\s+)?(phương án|đáp án|ý|câu)\s*(trên|đều)|các\s+(phương án|đáp án|ý)\s+trên|không\s+(có\s+)?(phương án|đáp án|ý)\s+nào|tất cả đều|đều (đúng|sai)$)/i;
  const NUM_OPT = /^\s*(?:năm\s+|khoảng\s+|thế kỉ\s+)?[-–]?\d[\d.,]*(?:\s*(?:%|km²?|m|kg|tấn|năm|tuổi|người|triệu|nghìn|tỉ|lần|ngày))?\s*(?:TCN|SCN)?\s*\.?$/i;
  const numVal = (t) => {
    const m = String(t).replace(/\.(?=\d{3}\b)/g, "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
    const v = m ? Number(m[0]) : 0;
    return /TCN/i.test(t) ? -v : v;
  };
  L360.balanceMcq = (qs, seed) => {
    const list = (qs || []).filter((q) => {
      if (!q || typeof q !== "object" || (q.kind && q.kind !== "mcq") || !Array.isArray(q.options)) return false;
      const n = q.options.length;
      const a = Number(q.answer);
      return n >= 3 && n <= 6 && q.answer != null && q.answer !== "" && Number.isInteger(a) && a >= 0 && a < n && q.options.every((o) => typeof o === "string" && o.trim());
    });
    const rel = (q, map) => {
      if (typeof q.explain !== "string" || !q.explain) return;
      q.explain = q.explain.replace(/((?:đáp án|phương án|lựa chọn|chọn|ý)\s+)([A-H])\b/gi, (m, pre, L) => {
        const i = "ABCDEFGH".indexOf(L.toUpperCase());
        return map[i] != null ? pre + "ABCDEFGH"[map[i]] : m;
      });
    };
    const free = [];
    list.forEach((q) => {
      if (q.options.some((o) => REF_OPT.test(o))) return;
      if (q.options.every((o) => NUM_OPT.test(o))) {
        // Phương án là số/năm: xếp tăng dần (theo thói quen ra đề), đáp án đi theo.
        const idx = q.options.map((o, i) => i).sort((x, y) => numVal(q.options[x]) - numVal(q.options[y]) || x - y);
        const map = [];
        idx.forEach((oi, ni) => (map[oi] = ni));
        q.answer = map[Number(q.answer)];
        q.options = idx.map((i) => q.options[i]);
        rel(q, map);
        return;
      }
      free.push(q);
    });
    // Mỗi nhóm câu cùng số phương án: dãy vị trí đáp án là các khối hoán vị nối tiếp nhau (không lặp quá 2 lần liền).
    const byN = {};
    free.forEach((q) => (byN[q.options.length] = byN[q.options.length] || []).push(q));
    Object.entries(byN).forEach(([n, group]) => {
      n = Number(n);
      const targets = [];
      let b = 0;
      while (targets.length < group.length) {
        let blk = u.shuffle(Array.from({ length: n }, (_, i) => i), `${seed}|${n}|${b++}`);
        if (targets.length && blk[0] === targets[targets.length - 1]) blk = blk.slice(1).concat(blk[0]);
        targets.push(...blk);
      }
      group.forEach((q, qi) => {
        const a = Number(q.answer);
        const right = q.options[a];
        const others = q.options.map((o, i) => i).filter((i) => i !== a);
        others.sort((x, y) => u.hash(`${seed}|${q.options[x]}`) - u.hash(`${seed}|${q.options[y]}`) || x - y);
        const t = targets[qi];
        const order = others.slice(0, t).concat([a], others.slice(t));
        const map = [];
        order.forEach((oi, ni) => (map[oi] = ni));
        q.options = order.map((i) => q.options[i]);
        q.answer = t;
        if (right !== q.options[t]) q.answer = q.options.indexOf(right);
        rel(q, map);
      });
    });
    return qs;
  };
  // Mọi câu hỏi nhiều lựa chọn trong một gói tiết học (để rải đều đáp án khi nhập từ trợ lý AI).
  L360.packQuestions = (p) =>
    ((p && p.steps) || []).flatMap((s) => {
      if (!s || typeof s !== "object") return [];
      const qs = Array.isArray(s.questions) ? s.questions.slice() : [];
      if (s.type === "poll2" && s.answer != null) qs.push(s);
      return qs;
    });

  L360.subKey = (step, state) => {
    const t = L360.types[step.type];
    return t && t.subKey ? t.subKey(step, state || {}) : step.id;
  };
  // Bước là "một hoạt động" (khác trình chiếu thuần) – dùng cho quy tắc 1 khởi động / 1 luyện tập / 1 vận dụng.
  const isActivity = (s) => {
    const t = L360.types[s.type] || {};
    return !t.noSubmit || !!t.activity;
  };

  const Pack = {
    SCHEMA: "l360-pack/2",
    PHASES,
    normalize(raw) {
      const p = u.clone(raw) || {};
      p.schema = Pack.SCHEMA;
      p.title = String(p.title || "Bài học chưa đặt tên").trim();
      // Môn – lớp – bài – tiết
      p.subjectId = p.subjectId || (L360.Curr && L360.Curr.subjects.find((s) => s.name === p.subject) || {}).id || p.subjectId || "";
      p.grade = p.grade != null ? String(p.grade) : "";
      if (!p.subject && p.subjectId && L360.Curr) p.subject = L360.Curr.subjectName(p.subjectId, p.grade);
      p.subject = p.subject || "";
      const b = Object.assign({ key: "", so: "", ten: "" }, p.bai || {});
      if (!b.so && p.lessonRef) {
        const m = String(p.lessonRef).match(/Bài\s*(\d+[a-zA-Z]?)/i);
        if (m) b.so = m[1];
      }
      p.bai = b;
      const t = Object.assign({ so: 1, tong: 1 }, p.tiet || {});
      t.so = Math.max(1, Number(t.so) || 1);
      t.tong = Math.max(t.so, Number(t.tong) || 1);
      p.tiet = t;
      p.id = p.id || u.slug(`${p.subjectId || p.subject}-${p.grade}-${b.so ? "bai" + b.so + "-" : ""}tiet${t.so}-${p.title}`).slice(0, 80) || "bai-" + u.uid(6);
      p.duration = Number(p.duration) || 45;
      p.objectives = Array.isArray(p.objectives) ? p.objectives : p.objectives ? [String(p.objectives)] : [];
      p.design = Object.assign({}, p.design || {});
      if (L360.Design) {
        const r = L360.Design.resolve(p);
        p.design.style = r.id;
        p.design.palette = r.paletteId;
        p.theme = { accent: r.palette.accent, accent2: r.palette.accent2, bg: r.palette.bg };
      } else p.theme = Object.assign({ accent: "", bg: "" }, p.theme || {});
      if (!Array.isArray(p.groups) || !p.groups.length) p.groups = null;
      const seen = new Set();
      const n = (p.steps || []).length;
      p.steps = (Array.isArray(p.steps) ? p.steps : []).map((s, i) => {
        s = Object.assign({}, s);
        let id = String(s.id || `s${i + 1}`).replace(/[^A-Za-z0-9-]/g, "");
        if (!id || seen.has(id)) id = `s${i + 1}x${u.uid(3)}`;
        seen.add(id);
        s.id = id;
        s.type = s.type || "slide";
        s.title = String(s.title || `Hoạt động ${i + 1}`);
        s.minutes = Number(s.minutes) || 0;
        const ph = PH_ALIAS[u.slug(s.phase || "")];
        // Gói cũ không có pha: bước đầu là khởi động, hai bước cuối là luyện tập / vận dụng.
        s.phase = ph || (raw && raw.schema === "l360-pack/2" ? "hinh-thanh" : i === 0 ? "khoi-dong" : i === n - 1 ? "van-dung" : "hinh-thanh");
        if (s.ghiBai != null) s.ghiBai = String(s.ghiBai);
        const T = L360.types[s.type];
        if (T && T.normalize) T.normalize(s);
        return s;
      });
      p.meta = Object.assign({}, p.meta || {});
      return p;
    },
    // Nhãn ngắn "Bài 4 · Tiết 1/2".
    label(p) {
      const b = p.bai || {};
      const t = p.tiet || {};
      const bs = b.so ? (/^(CĐ|Chủ đề)/i.test(b.so) ? b.so : `Bài ${b.so}`) : "";
      return [bs, t.tong > 1 ? `Tiết ${t.so}/${t.tong}` : t.so ? `Tiết ${t.so}` : ""].filter(Boolean).join(" · ");
    },
    // Nhiệm vụ về nhà và chuẩn bị bài sau. Ưu tiên nội dung giáo viên/AI soạn (p.homework);
    // thiếu thì tự gợi ý từ hoạt động vận dụng và tiết kế tiếp trong Phụ lục 1.
    homework(p) {
      const h = p.homework && typeof p.homework === "object" ? p.homework : typeof p.homework === "string" ? { tasks: [p.homework] } : {};
      const clip = (t, n) => {
        t = String(t || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
        return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…" : t;
      };
      const tasks = (Array.isArray(h.tasks) ? h.tasks : h.tasks ? [h.tasks] : []).map((x) => clip(x, 220)).filter(Boolean);
      let prepare = clip(h.prepare, 240);
      const auto = !tasks.length;
      if (auto) {
        tasks.push(p.steps.some((s) => s.ghiBai) ? "Học thuộc phần ghi vở; tự vẽ lại sơ đồ khái quát của tiết học bằng trí nhớ." : "Ôn lại các nội dung chính của tiết học.");
        const vd = p.steps.find((s) => s.phase === "van-dung" && isActivity(s));
        if (vd) {
          const what = clip(vd.instructions || vd.question || vd.prompt || "", 150);
          tasks.push(`Hoàn thành nhiệm vụ vận dụng “${clip(vd.title, 60)}”${what ? ": " + what : ""}.`.replace(/\.\.$/, "."));
        }
      }
      if (!prepare) {
        const sau = p.ppct && p.ppct.sau;
        const t = p.tiet || {};
        if (sau && sau.cungBai) prepare = `Đọc trước nội dung tiết sau của bài “${clip(sau.ten, 80)}”${sau.noiDung ? ": " + clip(sau.noiDung, 120) : ""}; ghi lại 1 câu hỏi em muốn hỏi.`;
        else if (sau) prepare = `Đọc trước bài “${clip(sau.ten, 90)}” trong SGK; ghi lại 1–2 điều em muốn tìm hiểu.`;
        else if (t.so < t.tong) prepare = `Đọc trước phần tiếp theo của bài “${clip((p.bai && p.bai.ten) || p.title, 90)}” (tiết ${t.so + 1}); ghi lại 1 câu hỏi em muốn hỏi.`;
        else prepare = "Đọc trước bài học tiếp theo trong SGK; ghi lại 1–2 điều em muốn tìm hiểu.";
      }
      return { tasks, prepare, sheet: clip(h.sheet, 200), auto };
    },
    // Thêm trang đề mục: trang "tên mục" trước mỗi bước bài giảng của phần hình thành kiến thức;
    // tiết 1 thêm trang "tên bài" (và trang "chủ đề" nếu là bài mở đầu chủ đề). Không thêm trùng.
    addHeadings(p, o = {}) {
      const has = (k) => p.steps.some((s) => (s.pages || []).some((pg) => (pg.blocks || []).some((b) => b.kind === k)));
      const ht = p.steps.filter((s) => s.phase === "hinh-thanh" && s.type === "slide");
      if (!ht.length) return 0;
      let added = 0;
      ht.forEach((s, i) => {
        s.pages = Array.isArray(s.pages) ? s.pages : [];
        if (s.pages.some((pg) => (pg.blocks || []).some((b) => b.kind === "muc"))) return;
        s.pages.unshift({ title: "", blocks: [{ kind: "muc", so: String(i + 1), ten: String(s.title || "").replace(/^\s*\d+[.)]\s*/, "") }] });
        added++;
      });
      const t = p.tiet || {};
      if ((Number(t.so) || 1) === 1 && !has("tenbai")) {
        const b = p.bai || {};
        ht[0].pages.unshift({
          title: "",
          blocks: [{ kind: "tenbai", so: b.so ? (/^(CĐ|Chủ đề)/i.test(b.so) ? b.so : "Bài " + b.so) : "", ten: b.ten || p.title, chude: o.chude || "", muc: ht.map((s) => String(s.title || "").replace(/^\s*\d+[.)]\s*/, "")) }]
        });
        added++;
        if (o.chude && !has("chude")) {
          const m = String(o.chude).match(/^((?:Chủ đề|Chương|Phần)\s*[\dIVX]+)[.:\s–-]*(.*)$/i);
          ht[0].pages.unshift({ title: "", blocks: [{ kind: "chude", so: m ? m[1] : "Chủ đề", ten: m ? m[2] || o.chude : o.chude }] });
          added++;
        }
      }
      return added;
    },
    phaseCount(p) {
      const c = { "khoi-dong": 0, "hinh-thanh": 0, "luyen-tap": 0, "van-dung": 0 };
      p.steps.forEach((s) => isActivity(s) && (c[s.phase] = (c[s.phase] || 0) + 1));
      return c;
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
      // Thứ tự pha và quy tắc "mỗi bài 1 khởi động, 1 luyện tập, 1 vận dụng".
      let last = 0;
      p.steps.forEach((s, i) => {
        const k = PH_IDX[s.phase];
        if (k < last) warnings.push(`Bước ${i + 1} (${s.title}) thuộc pha "${L360.phase(s.phase).name}" nhưng đứng sau pha muộn hơn – nên sắp lại theo thứ tự Khởi động → Hình thành → Luyện tập → Vận dụng.`);
        last = Math.max(last, k);
      });
      const c = Pack.phaseCount(p);
      ["khoi-dong", "luyen-tap", "van-dung"].forEach((ph) => {
        if (c[ph] > 1) errors.push(`Có ${c[ph]} hoạt động ${L360.phase(ph).name.toLowerCase()} – mỗi bài chỉ có 1 hoạt động ${L360.phase(ph).name.toLowerCase()} (có thể gộp thành một hoạt động nhiều câu).`);
      });
      const { so, tong } = p.tiet;
      if (tong > 1) {
        if (so > 1 && c["khoi-dong"]) errors.push(`Tiết ${so}/${tong}: hoạt động khởi động chỉ đặt ở tiết 1 của bài.`);
        if (so < tong && (c["luyen-tap"] || c["van-dung"])) errors.push(`Tiết ${so}/${tong}: luyện tập và vận dụng đặt ở tiết cuối (tiết ${tong}) của bài.`);
        if (so === tong && !c["luyen-tap"]) warnings.push(`Tiết cuối của bài nên có hoạt động luyện tập.`);
        if (so === tong && !c["van-dung"]) warnings.push(`Tiết cuối của bài nên có hoạt động vận dụng (có thể giao về nhà).`);
        if (so === 1 && !c["khoi-dong"]) warnings.push(`Tiết 1 của bài nên có hoạt động khởi động.`);
      } else {
        PHASES.forEach((ph) => !c[ph.id] && ph.id !== "hinh-thanh" && warnings.push(`Chưa có hoạt động ${ph.name.toLowerCase()}.`));
      }
      if (!p.steps.some((s) => s.phase === "hinh-thanh")) warnings.push("Chưa có phần hình thành kiến thức.");
      const visual = p.steps.filter((s) => s.phase === "hinh-thanh" && s.type === "slide");
      visual.forEach((s) => {
        const kinds = (s.pages || []).flatMap((pg) => (pg.blocks || []).map((b) => b.kind));
        if (!kinds.some((k) => ["image", "gallery", "map", "timeline", "mindmap", "compare", "flow", "cycle", "stats", "video"].includes(k)))
          warnings.push(`"${s.title}": phần hình thành kiến thức nên có hình ảnh hoặc sơ đồ trực quan.`);
        if (!kinds.includes("note") && !kinds.includes("conclusion")) warnings.push(`"${s.title}": nên có khung Kết luận hoặc Ghi vào vở.`);
      });
      if (total && total > p.duration + 2) warnings.push(`Tổng thời lượng các bước là ${total} phút, vượt ${p.duration} phút của tiết học.`);
      if (p.steps.filter((s) => s.type === "groupwork").length > 1) warnings.push("Có hơn 1 nhiệm vụ nhóm – nên giữ tối đa 1 nhiệm vụ nhóm mỗi bài.");
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
      const o = JSON.parse(s);
      // Gói tiết học do AI soạn: rải đều đáp án đúng A/B/C/D.
      if (o && Array.isArray(o.steps)) L360.balanceMcq(L360.packQuestions(o), `${o.title || ""}|${(o.tiet && o.tiet.so) || 1}`);
      return o;
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
        subjectId: p.subjectId || "",
        grade: p.grade,
        bai: p.bai || {},
        tiet: p.tiet || {},
        label: Pack.label(p),
        lessonRef: p.lessonRef || "",
        theme: p.theme,
        design: p.design || {},
        steps: p.steps.map((s) => {
          const t = L360.types[s.type] || {};
          return {
            id: s.id,
            type: s.type,
            title: s.title,
            phase: s.phase,
            minutes: s.minutes || 0,
            instructions: s.instructions || "",
            count: t.count ? t.count(s) : 1,
            pages: s.type === "slide" ? (s.pages || []).length : 0,
            noSubmit: !!t.noSubmit,
            groupMode: !!t.groupMode,
            ghiBai: !!(s.ghiBai || (s.pages || []).some((pg) => L360.blocks && L360.blocks.hasNote(pg)))
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

  /* Bản nháp trên máy này (localStorage) + bài mẫu. Thư viện dùng chung ở js/core/library.js. */
  const LIB_KEY = "l360:library";
  L360.Local = {
    list() {
      try {
        return JSON.parse(localStorage.getItem(LIB_KEY) || "[]");
      } catch (e) {
        return [];
      }
    },
    samples() {
      return (L360.packs || []).map((p) => Object.assign(Pack.normalize(p), { _sample: true }));
    },
    all() {
      const mine = L360.Local.list();
      const ids = new Set(mine.map((p) => p.id));
      return mine.concat(L360.Local.samples().filter((p) => !ids.has(p.id)));
    },
    get(id) {
      return L360.Local.all().find((p) => p.id === id) || null;
    },
    save(pack) {
      const p = Pack.normalize(pack);
      delete p._sample;
      p.meta.updatedAt = Date.now();
      const list = L360.Local.list().filter((x) => x.id !== p.id);
      list.unshift(p);
      localStorage.setItem(LIB_KEY, JSON.stringify(list));
      return p;
    },
    remove(id) {
      localStorage.setItem(LIB_KEY, JSON.stringify(L360.Local.list().filter((x) => x.id !== id)));
    }
  };
  L360.Library = L360.Local; // tương thích mã cũ
})();
