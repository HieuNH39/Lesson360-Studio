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

  async function getJson(url) {
    const r = await fetch(url, { headers: { "Api-User-Agent": "Lesson360Studio/2.0 (education)" } });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }
  // Thông tin ảnh (đường dẫn cỡ 1280, tác giả, giấy phép) cho danh sách tên tệp.
  async function fileInfo(titles) {
    if (!titles.length) return [];
    // Hỏi qua Wikipedia tiếng Việt (dùng chung kho ảnh Commons), lỗi thì hỏi thẳng Commons.
    const qs = `?action=query&format=json&origin=*&prop=imageinfo&iiprop=url|extmetadata|size|mime&iiurlwidth=1280&titles=${enc(titles.slice(0, 50).join("|"))}`;
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
          const list = await search(q);
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
    return out;
  }
  // Tự điền ảnh đầu tiên phù hợp cho mọi khối có "query" mà chưa có "src".
  async function autoFill(pack, onProgress) {
    const todo = slots(pack).filter((x) => !x.block.src && (x.block.query || x.block.caption));
    let ok = 0;
    for (let i = 0; i < todo.length; i++) {
      const b = todo[i].block;
      onProgress && onProgress(i + 1, todo.length, b.query || b.caption);
      try {
        const list = await search(b.query || b.caption);
        const used = new Set(slots(pack).map((x) => x.block.src).filter(Boolean));
        const x = list.find((r) => !used.has(r.src)) || list[0];
        if (x) {
          b.src = x.src;
          if (!b.credit) b.credit = x.credit;
          ok++;
        }
      } catch (e) {
        /* bỏ qua ảnh lỗi */
      }
    }
    return { filled: ok, total: todo.length, missing: slots(pack).filter((x) => !x.block.src).length };
  }

  L360.Images = { search, pick, shrink, slots, autoFill };
})();
