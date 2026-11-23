/* Thư viện dùng chung của trường: mỗi tiết học giáo viên soạn có thể chia sẻ cho mọi giáo viên,
   gắn với một bài trong SGK và ghi tên người tạo. Bản nháp riêng của từng giáo viên lưu theo tài khoản.
   Dữ liệu: lib/meta/{id} (thông tin rút gọn) · lib/pack/{id} (gói đầy đủ) · lib/uses/{id}/{uid} · drafts/{uid}/{id}. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const S = () => L360.store;
  const Pack = L360.Pack;

  const metaOf = (p, t) => {
    const b = p.bai || {};
    const l = b.key && L360.Curr ? L360.Curr.lesson(b.key) : null;
    return {
      t: p.title,
      s: p.subjectId || "",
      g: String(p.grade || ""),
      k: b.key || "",
      bk: (l && l.bookId) || "",
      so: String(b.so || (l && l.so) || ""),
      ten: b.ten || (l && l.ten) || "",
      ti: (p.tiet && p.tiet.so) || 1,
      tg: (p.tiet && p.tiet.tong) || 1,
      st: (p.design && p.design.style) || "",
      pa: (p.design && p.design.palette) || "",
      n: p.steps.length,
      m: p.steps.reduce((a, s) => a + (s.minutes || 0), 0),
      ty: [...new Set(p.steps.map((s) => s.type))].join(","),
      ai: !!(p.meta && p.meta.madeWithAI),
      by: t ? t.uid : "",
      byName: t ? t.name || t.email || "" : "",
      up: S().TS
    };
  };
  const sampleMeta = () =>
    L360.Local.samples().map((p) => Object.assign(metaOf(p, null), { id: p.id, by: "mau", byName: "Lesson 360° (bài mẫu)", sample: true, up: 0 }));

  const Lib = {
    metaOf,
    async listMeta() {
      const m = (await S().get("lib/meta").catch(() => null)) || {};
      const list = u.entries(m).map(([id, x]) => Object.assign({ id }, x));
      const ids = new Set(list.map((x) => x.id));
      return list.concat(sampleMeta().filter((x) => !ids.has(x.id)));
    },
    async forLesson(key) {
      return (await Lib.listMeta()).filter((x) => x.k === key).sort((a, b) => a.ti - b.ti || (b.up || 0) - (a.up || 0));
    },
    countBy(list) {
      const c = {};
      list.forEach((x) => x.k && (c[x.k] = (c[x.k] || 0) + 1));
      return c;
    },
    async getPack(id) {
      const p = await S().get(`lib/pack/${id}`).catch(() => null);
      if (p) return Pack.normalize(p);
      const s = L360.Local.samples().find((x) => x.id === id);
      return s || null;
    },
    async uses(id) {
      return Object.keys((await S().get(`lib/uses/${id}`).catch(() => null)) || {}).length;
    },
    async markUse(id, t) {
      if (!t || !id) return;
      await S().set(`lib/uses/${id}/${t.uid}`, S().TS).catch(() => {});
    },
    // Chia sẻ lên thư viện trường (ghi tên người tạo). Bài của người khác → tạo bản mới mang tên mình.
    async publish(pack, t) {
      const p = Pack.normalize(pack);
      const cur = await S().get(`lib/meta/${p.id}/by`).catch(() => null);
      if (cur && cur !== t.uid) p.id = `${p.id.slice(0, 60)}-${u.uid(4).toLowerCase()}`;
      p.meta = Object.assign({}, p.meta, { authorUid: t.uid, authorName: t.name || t.email || "", publishedAt: Date.now() });
      delete p._sample;
      delete p._school;
      await S().set(`lib/pack/${p.id}`, JSON.parse(JSON.stringify(p)));
      await S().set(`lib/meta/${p.id}`, metaOf(p, t));
      return p;
    },
    async unpublish(id) {
      await S().remove(`lib/meta/${id}`);
      await S().remove(`lib/pack/${id}`);
    },
    // Nhân bản về bản nháp của mình để chỉnh sửa.
    duplicate(pack, t) {
      const p = Pack.normalize(pack);
      p.id = `${p.id.replace(/-ban-sao.*$/, "").slice(0, 56)}-ban-sao-${u.uid(4).toLowerCase()}`;
      p.title = p.title.replace(/ \(bản sao\)$/, "") + " (bản sao)";
      p.meta = Object.assign({}, p.meta, { copiedFrom: pack.id, copiedFromAuthor: (pack.meta && pack.meta.authorName) || "", authorUid: t ? t.uid : "", authorName: t ? t.name : "" });
      delete p._sample;
      return Lib.drafts.save(p, t);
    },
    drafts: {
      async list(t) {
        const local = L360.Local.list();
        if (!t || L360.isLocal) return local;
        const remote = u.vals((await S().get(`drafts/${t.uid}`).catch(() => null)) || {}).map((x) => Pack.normalize(x));
        const ids = new Set(remote.map((p) => p.id));
        return remote.concat(local.filter((p) => !ids.has(p.id)));
      },
      async save(pack, t) {
        const p = L360.Local.save(pack);
        if (t && !L360.isLocal) await S().set(`drafts/${t.uid}/${p.id}`, JSON.parse(JSON.stringify(p))).catch(() => {});
        return p;
      },
      async remove(id, t) {
        L360.Local.remove(id);
        if (t && !L360.isLocal) await S().remove(`drafts/${t.uid}/${id}`).catch(() => {});
      },
      async get(id, t) {
        return (await Lib.drafts.list(t)).find((p) => p.id === id) || null;
      }
    }
  };
  L360.Lib = Lib;
})();
