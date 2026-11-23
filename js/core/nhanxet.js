/* Nhận xét ý thức học tập sau mỗi tiết: chọn khoảng 30% học sinh của lớp, mỗi em một nhận xét ngắn
   (≤ 100 kí tự, bắt đầu bằng "Con…") dựa trên số liệu thật của tiết học: mức tham gia, độ chính xác,
   rời khỏi bài khi học. Luân phiên: em đã được nhận xét ở các tiết gần đây được ưu tiên sau.
   Tải về Excel 2 cột: Họ và tên | Nhận xét. */
(function () {
  const L360 = window.L360;
  const u = L360.u;

  const MAX = 100;
  // Mẫu câu theo mức; {x} = điểm mạnh/hạn chế cụ thể của tiết. Mỗi câu ≤ 100 kí tự sau khi ghép.
  const T = {
    tot: [
      "Con tích cực, tập trung, hoàn thành tốt và chính xác các nhiệm vụ học tập trong tiết.",
      "Con hăng hái tham gia hoạt động, trả lời đúng hầu hết câu hỏi. Tiếp tục phát huy nhé!",
      "Con chủ động, làm bài nghiêm túc và đạt kết quả rất tốt trong giờ học.",
      "Con học tập tích cực, hoàn thành đầy đủ nhiệm vụ với kết quả tốt. Cô/thầy khen con!",
      "Con tập trung cao, tham gia đầy đủ các hoạt động và nắm bài tốt."
    ],
    kha: [
      "Con tham gia đầy đủ hoạt động, cần cẩn thận hơn khi làm bài để đạt kết quả cao hơn.",
      "Con có cố gắng trong giờ học; cần ôn lại phần ghi vở để nắm chắc kiến thức hơn.",
      "Con học tập nghiêm túc, hoàn thành phần lớn nhiệm vụ; cần chủ động phát biểu hơn.",
      "Con tiếp thu bài khá, cần đọc kĩ câu hỏi trước khi trả lời để tránh nhầm lẫn."
    ],
    nhac: [
      "Con còn bỏ sót một số nhiệm vụ trong giờ, cần tích cực và chủ động hơn.",
      "Con chưa tập trung trong giờ học, cần chú ý nghe giảng và hoàn thành đủ nhiệm vụ.",
      "Con cần cố gắng hơn: hoàn thành đủ các hoạt động và xem lại bài ghi ở nhà.",
      "Con cần tập trung hơn, hạn chế làm việc riêng và tham gia đầy đủ hoạt động của lớp."
    ],
    roi: [
      "Con còn rời khỏi bài học trong giờ; cần tập trung, không làm việc riêng trên máy.",
      "Con chưa nghiêm túc khi học trên máy (rời bài nhiều lần), cần tự giác hơn."
    ]
  };
  const pick = (list, seed) => list[Math.abs(String(seed).split("").reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)) % list.length];
  const clip = (t) => {
    t = String(t || "").replace(/\s+/g, " ").trim();
    if (!/^Con\b/.test(t)) t = "Con " + t.replace(/^[a-zà-ỹ]/i, (c) => c.toLowerCase());
    return t.length > MAX ? t.slice(0, MAX - 1).replace(/\s+\S*$/, "") + "." : t;
  };

  const NX = {
    MAX,
    clip,
    // Số liệu từng học sinh trong tiết: tham gia, độ chính xác, điểm, số lần rời bài.
    metrics(pack, data) {
      const Room = L360.Room;
      const Stats = Room.Stats;
      const joined = Room.joined(data).map(([c]) => c);
      const keys = Stats.keysOf(pack, data).filter((k) => !k.type.groupMode && data.pub && data.pub.items && data.pub.items[k.key]);
      const focus = data.focus || {};
      return joined.map((c) => {
        let sub = 0, gr = 0, ok = 0;
        keys.forEach((k) => {
          const s = data.subs && data.subs[k.key] && data.subs[k.key][c];
          if (!s) return;
          sub++;
          if (k.type.isCorrect && data.pub.answers && data.pub.answers[k.key] != null) {
            const r = k.type.isCorrect(k.step, k.key, s.v);
            if (r === true || r === false) (gr++, r && ok++);
          }
        });
        const f = focus[c] || {};
        return {
          code: c,
          name: ((data.roster || {})[c] || {}).name || "",
          part: keys.length ? sub / keys.length : null,
          acc: gr ? ok / gr : null,
          pts: Stats.score(pack, data, c),
          out: Number(f.out) || 0
        };
      });
    },
    level(m) {
      if (m.out >= 2) return "roi";
      if (m.part != null && m.part < 0.5) return "nhac";
      if ((m.part == null || m.part >= 0.85) && (m.acc == null || m.acc >= 0.75)) return "tot";
      if (m.acc != null && m.acc < 0.4) return "nhac";
      return "kha";
    },
    // Chọn ~30% sĩ số: ưu tiên em chưa được nhận xét gần đây, phối hợp khen – nhắc nhở.
    choose(ms, size, history) {
      const n = Math.max(1, Math.ceil(0.3 * (Number(size) || ms.length)));
      const recent = {};
      (history || []).slice(-3).forEach((h, i) => (h.codes || []).forEach((c) => (recent[c] = Math.max(recent[c] || 0, i + 1))));
      const lv = (m) => NX.level(m);
      const pri = (m) => {
        const l = lv(m);
        const strong = l === "roi" ? 3 : l === "nhac" ? 2.5 : l === "tot" ? 2 + (m.acc || 0) : 1;
        return strong - (recent[m.code] || 0) * 1.2 + (((m.code.charCodeAt(m.code.length - 1) || 0) % 7) / 100);
      };
      return ms
        .slice()
        .sort((a, b) => pri(b) - pri(a))
        .slice(0, Math.min(n, ms.length))
        .sort((a, b) => a.code.localeCompare(b.code, "vi", { numeric: true }));
    },
    comment(m, seed) {
      return clip(pick(T[NX.level(m)], (seed || "") + m.code));
    },
    // Danh sách lớp (STT → họ tên) lưu trên máy giáo viên.
    roster(cls) {
      try {
        return JSON.parse(localStorage.getItem("l360:dsl:" + String(cls || "").toUpperCase()) || "[]");
      } catch (e) {
        return [];
      }
    },
    saveRoster(cls, list) {
      localStorage.setItem("l360:dsl:" + String(cls || "").toUpperCase(), JSON.stringify(list));
    },
    history(cls) {
      try {
        return JSON.parse(localStorage.getItem("l360:nx:" + String(cls || "").toUpperCase()) || "[]");
      } catch (e) {
        return [];
      }
    },
    remember(cls, room, codes) {
      const h = NX.history(cls).filter((x) => x.room !== room);
      h.push({ room, at: Date.now(), codes });
      localStorage.setItem("l360:nx:" + String(cls || "").toUpperCase(), JSON.stringify(h.slice(-12)));
    },
    nameOf(code, names, m) {
      const i = Number(String(code).replace(/\D/g, ""));
      return (i && names[i - 1]) || (m && m.name) || `Học sinh số ${code}`;
    },
    async exportXlsx(fileName, rows) {
      await u.loadScript("js/vendor/xlsx.full.min.js");
      const X = window.XLSX;
      const ws = X.utils.aoa_to_sheet([["Họ và tên", "Nhận xét"]].concat(rows.map((r) => [r.name, r.text])));
      ws["!cols"] = [{ wch: 28 }, { wch: 100 }];
      const wb = X.utils.book_new();
      X.utils.book_append_sheet(wb, ws, "Nhận xét");
      const out = X.write(wb, { bookType: "xlsx", type: "array" });
      u.downloadBlob(fileName, new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    }
  };
  L360.NhanXet = NX;
})();
