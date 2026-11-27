/* Tìm ảnh có giấy phép mở cho bài giảng: Wikipedia tiếng Việt (ảnh đại diện bài viết) + Wikimedia Commons.
   Mọi ảnh kèm tác giả và giấy phép để ghi nguồn. Ngoài ra: dán đường dẫn ảnh hoặc tải ảnh từ máy (tự thu nhỏ). */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const enc = encodeURIComponent;
  const COMMONS = "https://commons.wikimedia.org/w/api.php";
  const VIWIKI = "https://vi.wikipedia.org/w/api.php";
  const strip = (h) => {
    const d = document.createElement("div");
    d.innerHTML = String(h || "");
    return (d.textContent || "").replace(/\s+/g, " ").trim();
  };
  const cache = {};

  // Wikimedia giới hạn số lượt hỏi (HTTP 429) khi nhiều máy cùng mạng tìm ảnh một lúc → chờ rồi thử lại.
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  async function getJson(url, tries = 3) {
    for (let i = 0; ; i++) {
      try {
        const r = await fetch(url, { headers: { "Api-User-Agent": "Lesson360Studio/2.0 (education; FPT Schools)" } });
        if (r.status === 429 || r.status >= 500) throw Object.assign(new Error("HTTP " + r.status), { retry: true });
        if (!r.ok) throw new Error("HTTP " + r.status);
        return await r.json();
      } catch (e) {
        if (i >= tries - 1 || (e && e.retry === false)) throw e;
        await sleep(1200 * Math.pow(2, i) + Math.random() * 400);
      }
    }
  }
  // Thông tin ảnh (đường dẫn cỡ 1280, tác giả, giấy phép) cho danh sách tên tệp.
  async function fileInfo(titles, width) {
    if (!titles.length) return [];
    // Hỏi qua Wikipedia tiếng Việt (dùng chung kho ảnh Commons), lỗi thì hỏi thẳng Commons.
    const qs = `?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=${width || 1600}&titles=${enc(titles.slice(0, 50).join("|"))}`;
    const j = await getJson(VIWIKI + qs).catch(() => getJson(COMMONS + qs));
    const pages = Object.values((j.query && j.query.pages) || {});
    return pages
      .filter((p) => p.imageinfo && p.imageinfo[0])
      .map((p) => {
        const ii = p.imageinfo[0];
        const md = ii.extmetadata || {};
        const artist = strip(md.Artist && md.Artist.value).slice(0, 80);
        const lic = strip(md.LicenseShortName && md.LicenseShortName.value);
        const desc = strip(md.ImageDescription && md.ImageDescription.value).slice(0, 160);
        return {
          title: p.title,
          src: String(ii.thumburl || ii.url).replace(/\?utm_[^#]*$/, ""),
          thumb: String(ii.thumburl || ii.url).replace(/\?utm_[^#]*$/, "").replace(/\/(\d+)px-/, "/360px-"),
          w: ii.thumbwidth || ii.width,
          h: ii.thumbheight || ii.height,
          ow: ii.width,
          oh: ii.height,
          mime: ii.mime,
          page: ii.descriptionurl,
          desc,
          credit: `${artist ? artist + ", " : ""}${lic || "Wikimedia Commons"} – Wikimedia Commons`
        };
      })
      .filter((x) => /image\/(jpeg|png|gif|webp|svg)/.test(x.mime || "image/jpeg"));
  }
  async function searchCommons(q, limit = 24) {
    const url = `${COMMONS}?action=query&format=json&origin=*&generator=search&gsrnamespace=6&gsrlimit=${limit}&gsrsearch=${enc(q + " filetype:bitmap")}&prop=info`;
    const j = await getJson(url);
    const titles = Object.values((j.query && j.query.pages) || {})
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .map((p) => p.title);
    const info = await fileInfo(titles);
    return titles.map((t) => info.find((x) => x.title === t)).filter(Boolean);
  }
  async function searchVi(q, limit = 12) {
    const url = `${VIWIKI}?action=query&format=json&origin=*&generator=search&gsrlimit=${limit}&gsrsearch=${enc(q)}&prop=pageimages&piprop=name&pilicense=free`;
    const j = await getJson(url);
    const pages = Object.values((j.query && j.query.pages) || {})
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .filter((p) => p.pageimage);
    const info = await fileInfo(pages.map((p) => "File:" + p.pageimage));
    return pages
      .map((p) => {
        const f = info.find((x) => x.title.replace(/^(File|Tập tin):/, "").replace(/ /g, "_") === p.pageimage.replace(/ /g, "_"));
        return f ? Object.assign({}, f, { article: p.title }) : null;
      })
      .filter(Boolean);
  }
  async function search(q) {
    q = String(q || "").trim();
    if (!q) return [];
    if (cache[q]) return cache[q];
    const [a, b] = await Promise.all([searchVi(q).catch(() => []), searchCommons(q).catch(() => [])]);
    const seen = new Set();
    const out = a.concat(b).filter((x) => (seen.has(x.src) ? false : seen.add(x.src)));
    return (cache[q] = out);
  }

  // Ảnh từ máy → JPEG thu nhỏ (cạnh dài ≤ 1280 px) dạng dataURL.
  function shrink(file, max = 1280) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => {
        const im = new Image();
        im.onload = () => {
          const k = Math.min(1, max / Math.max(im.width, im.height));
          const c = document.createElement("canvas");
          c.width = Math.round(im.width * k);
          c.height = Math.round(im.height * k);
          const g = c.getContext("2d");
          g.fillStyle = "#fff";
          g.fillRect(0, 0, c.width, c.height);
          g.drawImage(im, 0, 0, c.width, c.height);
          res(c.toDataURL("image/jpeg", 0.82));
        };
        im.onerror = rej;
        im.src = fr.result;
      };
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
  }

  /* Hộp chọn ảnh. Trả về {src, credit, caption} hoặc null. */
  function pick(opts = {}) {
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => {
        if (done) return;
        done = true;
        m.close();
        resolve(v);
      };
      const m = u.modal(
        `<div class="row" style="margin-bottom:10px"><h2 class="grow" style="margin:0">Chọn ảnh</h2><button class="btn sm ghost" data-close>Đóng</button></div>
        <div class="tabs"><button class="tab on" data-t="s">Tìm ảnh mở</button><button class="tab" data-t="u">Dán đường dẫn</button><button class="tab" data-t="f">Tải từ máy</button></div>
        <div data-p="s"><div class="row"><input id="imq" type="search" class="grow" placeholder="Ví dụ: Kim tự tháp Giza, Chùa Bút Tháp, đồi chè Bắc Giang…" value="${u.esc(opts.query || "")}"><button class="btn primary" id="imgo">Tìm</button></div>
          <p class="tiny muted" style="margin:6px 0 10px">Ảnh từ Wikipedia tiếng Việt và Wikimedia Commons (giấy phép mở, tự ghi nguồn). Gõ tiếng Việt hoặc tiếng Anh; tên riêng cho kết quả tốt nhất.</p>
          <div id="imres" class="img-grid"></div></div>
        <div data-p="u" class="hidden"><label class="lbl">Đường dẫn ảnh (https://…)</label><input id="imurl" placeholder="https://upload.wikimedia.org/…"><label class="lbl">Nguồn ảnh</label><input id="imcr" placeholder="Tác giả, giấy phép"><button class="btn primary" id="imok" style="margin-top:12px">Dùng ảnh này</button></div>
        <div data-p="f" class="hidden"><p class="small muted">Ảnh được thu nhỏ còn tối đa 1280 px và lưu cùng tiết học. Chỉ dùng ảnh thầy cô có quyền sử dụng.</p><input type="file" id="imfile" accept="image/*"><label class="lbl">Nguồn ảnh</label><input id="imcr2" placeholder="Ảnh tự chụp / nguồn"></div>`,
        { wide: true, onClose: () => !done && ((done = true), resolve(null)) }
      );
      const el = m.el;
      u.$$("[data-t]", el).forEach(
        (b) =>
          (b.onclick = () => {
            u.$$("[data-t]", el).forEach((x) => x.classList.toggle("on", x === b));
            u.$$("[data-p]", el).forEach((p) => p.classList.toggle("hidden", p.dataset.p !== b.dataset.t));
          })
      );
      const run = async () => {
        const q = u.$("#imq", el).value.trim();
        const box = u.$("#imres", el);
        if (!q) return;
        box.innerHTML = `<div class="empty">Đang tìm “${u.esc(q)}”…</div>`;
        try {
          const raw = await search(q);
          const list = rank(raw, { query: q, alt: opts.alt || "", kind: opts.kind || "" }).concat(raw.filter((x) => (x.ow || x.w) < 900 && !BAD.test(x.title)));
          if (!list.length) {
            box.innerHTML = `<div class="empty">Không thấy ảnh phù hợp. Thử từ khoá ngắn hơn, tên riêng, hoặc tiếng Anh.</div>`;
            return;
          }
          box.innerHTML = list
            .map(
              (x, i) =>
                `<button class="img-cell" data-i="${i}" title="${u.esc(x.desc || x.title)}"><img src="${u.esc(x.thumb)}" alt="" loading="lazy"><span>${u.esc(x.article || x.title.replace(/^(File|Tập tin):/, "").replace(/\.\w+$/, "")).slice(0, 60)}</span></button>`
            )
            .join("");
          u.$$("[data-i]", box).forEach((b) => (b.onclick = () => {
            const x = list[Number(b.dataset.i)];
            finish({ src: x.src, credit: x.credit, caption: x.article || "", page: x.page });
          }));
        } catch (e) {
          box.innerHTML = `<div class="empty">Không kết nối được Wikimedia (${u.esc(e.message)}). Kiểm tra Internet hoặc dùng “Dán đường dẫn”.</div>`;
        }
      };
      u.$("#imgo", el).onclick = run;
      u.$("#imq", el).onkeydown = (e) => e.key === "Enter" && run();
      u.$("#imok", el).onclick = () => {
        const src = u.$("#imurl", el).value.trim();
        if (!/^https?:\/\//.test(src)) return u.toast("Đường dẫn ảnh phải bắt đầu bằng https://", "bad");
        finish({ src, credit: u.$("#imcr", el).value.trim(), caption: "" });
      };
      u.$("#imfile", el).onchange = async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        try {
          finish({ src: await shrink(f), credit: u.$("#imcr2", el).value.trim() || "Ảnh của giáo viên", caption: "" });
        } catch (err) {
          u.toast("Không đọc được ảnh.", "bad");
        }
      };
      if (opts.query) run();
      else setTimeout(() => u.$("#imq", el).focus(), 50);
    });
  }

  // Các khối ảnh trong gói (để tự điền / đếm ảnh còn thiếu).
  function slots(pack) {
    const out = [];
    (pack.steps || []).forEach((s) =>
      (s.pages || []).forEach((pg) =>
        (pg.blocks || []).forEach((b) => {
          if (b.kind === "image" || b.kind === "map") out.push({ step: s, block: b });
          if (b.kind === "gallery") (b.images || []).forEach((im) => out.push({ step: s, block: im }));
        })
      )
    );
    // Ảnh bí ẩn của trò chơi Mảnh ghép (lưu ở bước: image, query, keyword).
    (pack.steps || []).forEach((s) => {
      if (s.type !== "quiz" || s.mode !== "puzzle") return;
      const blk = {
        kind: "image",
        get src() { return s.image || ""; },
        set src(v) { s.image = v; },
        get verified() { return !!s.imageOk; },
        set verified(v) { s.imageOk = !!v; },
        query: s.query || s.keyword || "",
        alt: s.keyword || "",
        caption: s.keyword || ""
      };
      out.push({ step: s, block: blk });
    });
    return out;
  }
  /* ---------- Xác minh ảnh do trợ lý AI đưa vào ---------- */
  // Kích thước thật của một ảnh trên mạng (không tải được → null).
  function probe(src, ms = 9000) {
    return new Promise((res) => {
      const im = new Image();
      const to = setTimeout(() => res(null), ms);
      im.onload = () => (clearTimeout(to), res({ w: im.naturalWidth, h: im.naturalHeight }));
      im.onerror = () => (clearTimeout(to), res(null));
      im.referrerPolicy = "no-referrer";
      im.src = src;
    });
  }
  // Tên tệp Commons từ đường dẫn upload.wikimedia.org hoặc trang commons.wikimedia.org/wiki/File:…
  function commonsTitle(b) {
    let t = String(b.commons || "").trim();
    const src = String(b.src || "");
    if (!t) {
      const m = src.match(/upload\.wikimedia\.org\/wikipedia\/[\w-]+\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/i);
      const w = src.match(/wikimedia\.org\/wiki\/((?:File|Tập_tin|Tập tin):[^?#]+)/i) || src.match(/wikipedia\.org\/wiki\/((?:File|Tập_tin|Tập tin|Tập tin):[^?#]+)/i);
      if (m) t = decodeURIComponent(m[1]);
      else if (w) t = decodeURIComponent(w[1]);
    }
    if (!t) return "";
    t = t.replace(/^(Tập[ _]tin|Image|Hình|File)\s*:\s*/i, "").replace(/_/g, " ");
    return "File:" + t;
  }
  // Ảnh có thật, đủ nét (≥ 800 px), có nguồn → trả về ảnh đã chuẩn hoá (cỡ 1600 px của Commons).
  async function verify(b) {
    const title = commonsTitle(b);
    if (title) {
      const info = (await fileInfo([title], 1600).catch(() => []))[0];
      if (info && (info.ow || info.w) >= 800 && !/svg/.test(info.mime || "")) return { src: info.src, credit: info.credit, page: info.page, w: info.ow, h: info.oh };
      if (info && /svg/.test(info.mime || "") && b.kind === "map") return { src: info.src, credit: info.credit, page: info.page, w: info.ow, h: info.oh };
      return null;
    }
    if (/^https:\/\//.test(b.src || "")) {
      const d = await probe(b.src);
      if (d && d.w >= 800) return { src: b.src, credit: b.credit || "Nguồn: " + new URL(b.src).hostname, w: d.w, h: d.h };
    }
    return null;
  }
  const BAD = /\b(logo|icon|flag|coat of arms|emblem|seal|signature|stamp|banner|button|diagram|chart|graph|screenshot|qr)\b/i;
  // Bỏ hư từ (tiếng Anh, tiếng Việt) khi so khớp từ khoá ảnh.
  const STOPW = new Set("the and for from with into over under this that are was were has have its their about view photo image picture file jpg png svg of in on at to by an a cua cac nhung mot trong voi cho tren duoi anh hinh".split(" "));
  const words = (s) => (L360.Ppct ? L360.Ppct.norm(s) : String(s || "").toLowerCase()).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 2 && !STOPW.has(w));
  // Xếp hạng kết quả tìm: khớp từ khoá + mô tả, ảnh nét, tránh logo/biểu tượng.
  // Ảnh không khớp từ khoá nào bị loại (thà để trống cho giáo viên chọn còn hơn ảnh sai nội dung).
  function rank(list, b) {
    const want = new Set(words(`${b.query || ""} ${b.alt || ""} ${b.caption || ""}`));
    const qw = new Set(words(b.query || b.alt || b.caption || ""));
    const tag = `${b.query || ""} ${b.alt || ""}`;
    const isMap = b.kind === "map" || /map|bản đồ|lược đồ/i.test(tag);
    const isDiagram = /diagram|illustration|scheme|sơ đồ|hình vẽ|mô phỏng/i.test(tag);
    const vector = isMap || isDiagram;
    const minHits = qw.size >= 4 ? 2 : 1;
    return list
      .filter((x) => (vector && /svg/.test(x.mime || "") ? (x.w || 0) >= 600 : (x.ow || x.w) >= (isMap ? 600 : 900)) && (vector || !/svg/.test(x.mime || "")))
      .map((x) => {
        const hay = words(`${x.title} ${x.desc} ${x.article || ""}`);
        const hit = hay.filter((w) => want.has(w)).length;
        const qhit = new Set(hay.filter((w) => qw.has(w))).size;
        const bad = isDiagram ? /\b(logo|icon|flag|coat of arms|emblem|seal|signature|stamp|banner|button|screenshot|qr)\b/i : BAD;
        const sc = hit * 2 + qhit + ((x.ow || 0) >= 1600 ? 1 : (x.ow || 0) >= 1200 ? 0.6 : 0) + (x.article ? 0.8 : 0) - (!isMap && bad.test(x.title) ? 4 : 0) - (!isMap && /\bmap\b/i.test(x.title) ? 2 : 0);
        return Object.assign({ score: sc, qhit }, x);
      })
      .filter((x) => x.qhit >= minHits && x.score > 0)
      .sort((a, c) => c.score - a.score);
  }
  async function bestFor(b, used) {
    const qs = [b.query, b.alt, b.caption].map((x) => String(x || "").trim()).filter(Boolean);
    let all = [];
    for (const q of qs.slice(0, 2)) all = all.concat(await search(q).catch(() => []));
    const seen = new Set();
    all = all.filter((x) => (seen.has(x.src) ? false : seen.add(x.src)));
    const r = rank(all, b).filter((x) => !used.has(x.src));
    return r[0] || null;
  }
  // Với mọi khối ảnh: ảnh AI ghi sẵn → kiểm tra có thật, đủ nét; sai/thiếu → tìm ảnh thay theo từ khoá + mô tả.
  async function autoFill(pack, onProgress) {
    const all = slots(pack);
    const todo = all.filter((x) => (!x.block.src && (x.block.query || x.block.caption || x.block.alt)) || (x.block.src && !x.block.verified && !/^data:|^assets\//.test(x.block.src)));
    let verified = 0, found = 0, replaced = 0;
    for (let i = 0; i < todo.length; i++) {
      const b = todo[i].block;
      onProgress && onProgress(i + 1, todo.length, b.query || b.caption);
      try {
        if (b.src || b.commons) {
          const v = await verify(b);
          if (v) {
            Object.assign(b, { src: v.src, credit: b.credit || v.credit, page: v.page || b.page || "", verified: true, auto: false });
            verified++;
            continue;
          }
          b.srcAi = b.src || b.commons;
          b.src = "";
          replaced++;
        }
        const used = new Set(slots(pack).map((x) => x.block.src).filter(Boolean));
        const x = await bestFor(b, used);
        if (x) {
          Object.assign(b, { src: x.src, credit: x.credit, page: x.page, verified: false, auto: true });
          found++;
        }
      } catch (e) {
        /* bỏ qua ảnh lỗi */
      }
    }
    return { verified, found, replaced, total: todo.length, filled: verified + found, missing: slots(pack).filter((x) => !x.block.src).length };
  }

  L360.Images = { search, pick, shrink, slots, autoFill, verify, probe, rank };
})();
