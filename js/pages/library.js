/* Thư viện trường: Cấp học → Môn → Lớp → danh sách bài đúng SGK → các tiết giáo viên đã soạn (kèm tên người tạo),
   mở SGK đúng trang, video EduHistory Studio cho Lịch sử. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const S = L360.store;
  const C = L360.Curr;
  const Lib = L360.Lib;
  const app = u.$("#app");
  const dt = /che-do=dien-tap/.test(location.search) ? "&che-do=dien-tap" : "";
  let teacher = null;
  let metas = [];
  const ppState = { k: "", doc: null };
  const st = { level: u.qs("cap") || "", subject: u.qs("mon") || "", grade: Number(u.qs("lop")) || 0, book: u.qs("sach") || "", bai: u.qs("bai") || "", q: "" };

  let pushNext = false;
  let libDepth = 0;
  const setUrl = () => {
    const q = new URLSearchParams();
    if (st.subject) q.set("mon", st.subject);
    if (st.grade) q.set("lop", st.grade);
    if (st.book) q.set("sach", st.book);
    if (st.bai) q.set("bai", st.bai);
    if (dt) q.set("che-do", "dien-tap");
    const url = "?" + q.toString();
    if (pushNext && url !== location.search) history.pushState({ lib: 1, d: ++libDepth }, "", url);
    else history.replaceState({ lib: 1 }, "", url);
    pushNext = false;
  };
  // Nút ← của trình duyệt / nút Quay lại: trở về màn trước (danh sách môn, bài đã chọn trước…).
  window.addEventListener("popstate", (e) => {
    libDepth = (e.state && e.state.d) || 0;
    st.subject = u.qs("mon") || "";
    st.grade = Number(u.qs("lop")) || 0;
    st.book = u.qs("sach") || "";
    st.bai = u.qs("bai") || "";
    if (st.subject) subjectView();
    else home();
  });

  function shell(inner) {
    app.innerHTML =
      L360.shell.topbar(`${L360.shell.modeBadge()}${L360.shell.userMenu(teacher)}`, { sub: "Thư viện bài học của trường", nav: "thuvien" }) +
      `<main class="wrap" style="max-width:1320px">${inner}</main>` +
      L360.shell.footer();
    L360.shell.bindUserMenu(teacher);
  }

  /* ---------- Chọn cấp & môn ---------- */
  function home() {
    const lv = st.level || C.levelOf((teacher.subjects || []).length && C.subject(teacher.subjects[0]) && C.subject(teacher.subjects[0]).levels[0] === "thcs" ? 6 : 10);
    st.level = lv;
    const subs = C.subjects.filter((s) => s.levels.includes(lv));
    const counts = {};
    metas.forEach((m) => {
      const k = m.s + "|" + C.levelOf(m.g);
      counts[k] = (counts[k] || 0) + 1;
    });
    shell(`<div class="row" style="align-items:flex-end;margin-bottom:18px"><div class="grow"><h1 style="margin:0">Thư viện bài học</h1><p class="muted" style="margin:4px 0 0">Mỗi tiết học thầy cô soạn được chia sẻ cho cả trường, gắn đúng bài trong SGK và ghi tên người soạn.</p></div>
      <div class="seg" id="lv">${C.levels.map((l) => `<button class="${l.id === lv ? "on" : ""}" data-lv="${l.id}">${l.name}</button>`).join("")}</div></div>
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">${subs
        .map(
          (s) => `<button class="card subj" data-s="${s.id}" style="text-align:left;cursor:pointer;border-top:5px solid ${s.color}">
          <div class="row nowrap"><span style="font-size:1.8rem;color:${s.color}">${L360.icon(s.icon)}</span><b class="grow" style="font-size:1.08rem">${u.esc(lv === "thcs" && s.thcsName ? s.thcsName : s.name)}</b></div>
          <p class="small muted" style="margin:10px 0 0">Lớp ${C.levels.find((l) => l.id === lv).grades.filter((g) => C.gradesFor(s.id).includes(g)).join(", ")} · ${counts[s.id + "|" + lv] || 0} tiết đã soạn${s.id === "lich-su" && lv === "thcs" ? " · video EduHistory" : ""}</p></button>`
        )
        .join("")}</div>
      <h3 style="margin-top:28px">Môn mở rộng sau thí điểm</h3><div class="chips">${C.future[lv].map((n) => `<span class="chip" style="opacity:.55;cursor:default">${u.esc(n)}</span>`).join("")}</div>
      <p class="small muted" style="margin-top:8px">Giai đoạn 1 triển khai các môn tổ Khoa học xã hội. Các môn khác dùng chung nền tảng, chỉ cần bổ sung mục lục SGK.</p>`);
    u.$$("[data-lv]").forEach((b) => (b.onclick = () => ((st.level = b.dataset.lv), home())));
    u.$$("[data-s]").forEach(
      (b) =>
        (b.onclick = () => {
          pushNext = true;
          st.subject = b.dataset.s;
          st.grade = C.levels.find((l) => l.id === st.level).grades.find((g) => C.gradesFor(st.subject).includes(g));
          st.book = "";
          st.bai = "";
          subjectView();
        })
    );
  }

  /* ---------- Môn → lớp → bài ---------- */
  function subjectView() {
    setUrl();
    const s = C.subject(st.subject);
    if (!s) return home();
    const grades = C.gradesFor(s.id);
    if (!grades.includes(st.grade)) st.grade = grades[0];
    const books = C.lessons(s.id, st.grade);
    if (!books.find((x) => x.book.id + (x.book.part || "") === st.book)) st.book = books.length ? books[0].book.id + (books[0].book.part || "") : "";
    const cur = books.find((x) => x.book.id + (x.book.part || "") === st.book);
    const ppk = `${s.id}|${st.grade}|${cur && cur.book.cd ? 1 : 0}`;
    if (ppk !== ppState.k) {
      ppState.k = ppk;
      ppState.doc = null;
      L360.Ppct.forSubject(s.id, st.grade, { cd: !!(cur && cur.book.cd) }).then((d) => {
        if (ppState.k !== ppk) return;
        ppState.doc = d;
        if (d) subjectView();
      });
    }
    const ppOf = (key) => (ppState.doc ? ppState.doc.bai.find((b) => b.key === key) : null);
    const cnt = Lib.countBy(metas);
    const lessons = cur ? cur.lessons : [];
    const q = u.slug(st.q);
    let ch = "";
    const rows = lessons
      .filter((l) => !q || u.slug(l.label + " " + l.chuong).includes(q))
      .map((l) => {
        const hd = l.chuong !== ch ? `<div class="lib-ch">${u.esc(l.chuong)}</div>` : "";
        ch = l.chuong;
        const n = cnt[l.key] || 0;
        const ev = C.eduVideos(l).length;
        return `${hd}<button class="lib-row ${l.key === st.bai ? "on" : ""}" data-bai="${u.esc(l.key)}"><span class="grow" style="min-width:0"><b class="clamp2">${u.esc(l.label)}</b><span class="small muted">${l.trang ? `${cur && cur.book.local ? "Trang" : "SGK trang"} ${l.trang}` : ""}${ppOf(l.key) ? ` · ${ppOf(l.key).tiet.length} tiết (Phụ lục 1)` : ""}${ev ? ` · ${ev} video EduHistory` : ""}</span></span>
          <span class="pill ${n ? "brand" : ""}">${n ? n + " tiết" : "Chưa có"}</span></button>`;
      })
      .join("");
    shell(`<div class="row" style="margin-bottom:12px"><button class="btn sm ghost" id="back">‹ Các môn</button><h1 class="grow" style="margin:0;font-size:1.6rem">${u.esc(C.subjectName(s.id, st.grade))}</h1>
        <input id="q" type="search" placeholder="Tìm bài…" value="${u.esc(st.q)}" style="max-width:260px"></div>
      <div class="row" style="margin-bottom:10px"><div class="seg">${grades.map((g) => `<button class="${g === st.grade ? "on" : ""}" data-g="${g}">Lớp ${g}</button>`).join("")}</div>
        ${books.length > 1 ? `<div class="seg">${books.map((b) => `<button class="${b.book.id + (b.book.part || "") === st.book ? "on" : ""}" data-b="${b.book.id + (b.book.part || "")}">${u.esc(b.book.local ? "Tỉnh " + ((b.book.title.match(/tỉnh (.+?) –/) || [])[1] || b.book.title) : b.book.title.replace(/^.*?(tập một|tập hai|Chuyên đề.*)$/i, (m, x) => x[0].toUpperCase() + x.slice(1)))}</button>`).join("")}</div>` : ""}
        <span class="spacer"></span>${cur && cur.book.reader ? `<a class="btn sm" href="${u.esc(cur.book.reader)}" target="_blank" rel="noopener">${L360.icon("sgk")} Mở sách ${u.esc(cur.book.title)}</a>` : cur ? `<span class="pill">${L360.icon("sgk")} ${u.esc(cur.book.title)}</span>` : ""}</div>
      ${s.note ? `<p class="small muted" style="margin:-2px 0 10px">${u.esc(s.note)}</p>` : ""}
      <div class="lib-grid"><section class="card flat lib-list">${
        rows ||
        (cur
          ? `<div class="empty">Mục lục sách này đang được cập nhật từ Bộ SGK thống nhất.<br><a href="${u.esc(cur.book.reader)}" target="_blank" rel="noopener">Mở sách trên taphuan.nxbgd.vn ↗</a><br><br><a class="btn sm primary" href="studio.html?mon=${s.id}&lop=${st.grade}${dt}">Soạn tiết học mới</a></div>`
          : `<div class="empty">Môn này chưa có sách trong bộ dữ liệu.<br><br><a class="btn sm primary" href="studio.html?mon=${s.id}&lop=${st.grade}${dt}">Soạn tiết học mới</a></div>`)
      }</section><aside class="lib-side" id="side"></aside></div>`);
    u.$("#back").onclick = () => (libDepth > 0 ? history.back() : ((st.subject = ""), (st.bai = ""), (pushNext = true), setUrl(), home()));
    u.$("#q").oninput = u.debounce((e) => {
      st.q = e.target.value;
      subjectView();
      const qi = u.$("#q");
      qi.focus();
      qi.setSelectionRange(qi.value.length, qi.value.length);
    }, 250);
    u.$$("[data-g]").forEach((b) => (b.onclick = () => ((st.grade = Number(b.dataset.g)), (st.book = ""), (st.bai = ""), subjectView())));
    u.$$("[data-b]").forEach((b) => (b.onclick = () => ((st.book = b.dataset.b), (st.bai = ""), subjectView())));
    u.$$("[data-bai]").forEach((b) => (b.onclick = () => ((st.bai = b.dataset.bai), (pushNext = true), setUrl(), u.$$("[data-bai]").forEach((x) => x.classList.toggle("on", x === b)), side())));
    side();
  }

  async function side() {
    const el = u.$("#side");
    if (!el) return;
    const l = C.lesson(st.bai);
    if (!l) {
      el.innerHTML = `<div class="card"><h3>Chọn một bài</h3><p class="muted">Bấm vào bài ở danh sách bên trái để xem các tiết học thầy cô đã soạn, mở SGK đúng trang hoặc soạn tiết mới.</p></div>`;
      return;
    }
    const url = C.lessonUrl(l);
    const vids = C.eduVideos(l);
    const items = metas.filter((m) => m.k === l.key).sort((a, b) => a.ti - b.ti || (b.up || 0) - (a.up || 0));
    const pb = ppState.doc ? ppState.doc.bai.find((b) => b.key === l.key) : null;
    el.innerHTML = `<div class="card"><div class="small muted">${u.esc(l.chuong || "")}</div><h2 style="margin:4px 0 10px">${u.esc(l.label)}</h2>
      <div class="row">${url ? `<a class="btn sm" href="${u.esc(url)}" target="_blank" rel="noopener">${L360.icon("sgk")} SGK${l.trang ? " trang " + l.trang : ""}</a>${
        url && l.trang && teacher && (teacher.isAdmin || teacher.isLeader) ? `<button class="btn sm ghost" id="fixPg" title="Link mở sai trang? Chỉnh độ lệch trang cho cả sách">Sai trang?</button>` : ""
      }` : `<span class="pill">${L360.icon("sgk")} Tài liệu${l.trang ? " trang " + l.trang : ""}</span>`}<a class="btn sm primary" href="studio.html?bai=${encodeURIComponent(l.key)}${dt}">${L360.icon("plus")} Soạn tiết mới</a></div>
      ${
        pb
          ? `<div class="note small" style="margin-top:12px"><b>Theo Phụ lục 1 (${u.esc(L360.Ppct.yearLabel(ppState.doc.nam))}):</b> ${L360.Ppct.tietText(pb)}<div class="row" style="gap:6px;margin-top:6px">${pb.tiet
              .map((t, i) => `<a class="chip" href="studio.html?bai=${encodeURIComponent(l.key)}&tiet=${i + 1}${dt}" title="${u.esc(t.noiDung || "")}">Tiết ${i + 1} · tiết ${t.so} PPCT${t.tuan ? ` · tuần ${t.tuan}` : ""}</a>`)
              .join("")}</div></div>`
          : ""
      }
      ${
        vids.length
          ? `<h3 style="margin-top:16px">${L360.icon("video")} Video EduHistory Studio</h3><div class="col" style="gap:8px">${vids
              .map((v) => `<a class="blk-vlink" href="${u.esc(L360.Edu.page(v.ma))}" target="_blank" rel="noopener"><img src="${u.esc(L360.Edu.poster(v.ma))}" alt="" loading="lazy"><span class="grow"><span class="small muted">${u.esc(v.ma)} · ${u.fmtSec(v.sec)}</span><br>${u.esc(v.ten)}</span></a>`)
              .join("")}</div><p class="tiny muted" style="margin-top:6px">Có thể đưa thẳng video này vào tiết học bằng hoạt động “Video có câu hỏi”.</p>`
          : ""
      }
      <h3 style="margin-top:18px">Các tiết đã soạn (${items.length})</h3>
      ${
        items.length
          ? `<div class="col" style="gap:10px">${items
              .map(
                (m) => `<div class="lib-card"><div class="row nowrap" style="align-items:flex-start">${L360.Design.preview(m.st, m.pa, m.tg > 1 ? `Tiết ${m.ti}/${m.tg}` : `Tiết ${m.ti}`)}<div class="grow" style="min-width:0">
                <b class="clamp2">${u.esc(m.t)}</b><div class="small muted">${m.tg > 1 ? `Tiết ${m.ti}/${m.tg} · ` : ""}${m.n} hoạt động · ${m.m} phút${m.ai ? " · soạn cùng AI" : ""}</div>
                <div class="small">${m.sample ? `<span class="pill">Bài mẫu</span>` : `${L360.icon("user")} ${u.esc(m.byName || "")}`}</div></div></div>
                <div class="row" style="margin-top:8px;gap:6px"><button class="btn sm" data-pv="${u.esc(m.id)}">Xem trước</button><a class="btn sm primary" href="giaovien.html?lib=${encodeURIComponent(m.id)}&pack=${encodeURIComponent(m.id)}${dt}">${L360.icon("play")} Dạy</a>
                <button class="btn sm" data-dup="${u.esc(m.id)}">${L360.icon("copy")} Nhân bản & sửa</button>${m.by === teacher.uid ? `<button class="btn sm ghost" data-del="${u.esc(m.id)}">Gỡ</button>` : ""}</div></div>`
              )
              .join("")}</div>`
          : `<div class="empty">Chưa có tiết nào cho bài này.<br>Thầy cô là người đầu tiên soạn?</div>`
      }</div>`;
    u.$$("[data-pv]", el).forEach((b) => (b.onclick = () => preview(b.dataset.pv)));
    const fx = u.$("#fixPg", el);
    if (fx)
      fx.onclick = async () => {
        if (await C.fixPage(l)) {
          u.toast("Đã chỉnh độ lệch trang cho cả cuốn sách. Mở lại link SGK để kiểm tra.", "ok", 4000);
          const a = el.querySelector('a[href*="#page="]');
          if (a) a.href = C.lessonUrl(l);
        }
      };
    u.$$("[data-dup]", el).forEach(
      (b) =>
        (b.onclick = async () => {
          const p = await Lib.getPack(b.dataset.dup);
          if (!p) return u.toast("Không mở được bài.", "bad");
          const d = await Lib.duplicate(p, teacher);
          location.href = `studio.html?sua=${encodeURIComponent(d.id)}${dt}`;
        })
    );
    u.$$("[data-del]", el).forEach(
      (b) =>
        (b.onclick = async () => {
          if (!(await u.confirm("Gỡ tiết học này khỏi thư viện trường? (Bản nháp của thầy/cô vẫn còn.)", "Gỡ"))) return;
          await Lib.unpublish(b.dataset.del);
          metas = await Lib.listMeta();
          subjectView();
        })
    );
  }

  async function preview(id) {
    const p = await Lib.getPack(id);
    if (!p) return u.toast("Không mở được bài.", "bad");
    const sm = L360.Pack.summary(p);
    const m = u.modal(
      `<div class="row"><h2 class="grow" style="margin:0">${u.esc(p.title)}</h2><button class="btn sm" data-close>Đóng</button></div>
      <p class="muted">${u.esc([p.subject, p.grade && "lớp " + p.grade, L360.Pack.label(p)].filter(Boolean).join(" · "))} · ${sm.steps} hoạt động · ${sm.minutes} phút${p.meta && p.meta.authorName ? " · GV " + u.esc(p.meta.authorName) : ""}</p>
      ${p.objectives.length ? `<h3>Mục tiêu</h3><ul>${p.objectives.map((o) => `<li>${u.esc(o)}</li>`).join("")}</ul>` : ""}
      <h3>Tiến trình</h3><div class="col" style="gap:6px">${p.steps
        .map((s, i) => `<div class="row nowrap" style="border-bottom:1px solid var(--line);padding:6px 0"><span class="ph ph-${s.phase}">${u.esc(L360.phase(s.phase).short)}</span><b class="grow">${i + 1}. ${u.esc(s.title)}</b><span class="small muted">${u.esc((L360.types[s.type] || {}).label || s.type)} · ${s.minutes}′</span></div>`)
        .join("")}</div>
      <h3 style="margin-top:14px">Xem trước trang đầu</h3><div class="lib-prev" id="lpv"></div>`,
      { wide: true }
    );
    const first = p.steps.find((s) => s.type === "slide") || p.steps[0];
    const box = u.$("#lpv", m.el);
    if (first && first.type === "slide") box.innerHTML = `<div class="ds-pat"></div>` + L360.blocks.page((first.pages || [])[0] || {}, { mode: "student" });
    else box.innerHTML = `<p class="muted">Bước đầu tiên: ${u.esc(first ? first.title : "")}</p>`;
    L360.Design.apply(p, box);
  }

  (async function init() {
    await S.ready;
    teacher = await L360.Auth.requireTeacher(app, { title: "Đăng nhập để vào thư viện" });
    L360.Edu.refresh();
    metas = await Lib.listMeta();
    if (st.bai && !st.subject) {
      const l = C.lesson(st.bai);
      if (l) {
        st.subject = l.subject;
        st.grade = Number(C.books[l.bookId].grade);
        st.book = l.bookId + (l.part || "");
      }
    }
    if (st.subject) {
      st.level = C.levelOf(st.grade || 10);
      subjectView();
    } else home();
  })();
})();
