/* Chế độ tự học trên máy học sinh: toàn màn hình, chặn sao chép – dán – chuột phải – chọn chữ,
   ghi nhận khi học sinh rời bài (chuyển tab, thoát toàn màn hình) và báo cho giáo viên.
   Mục đích: học sinh tự suy nghĩ, không chép câu hỏi sang công cụ AI trong lúc học. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  let on = false, report = null, outN = 0, away = false, allowUntil = 0, veil = null, started = false;
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const canFs = () => !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  function enterFs() {
    const d = document.documentElement;
    try {
      const p = d.requestFullscreen ? d.requestFullscreen({ navigationUI: "hide" }) : d.webkitRequestFullscreen && d.webkitRequestFullscreen();
      if (p && p.catch) p.catch(() => {});
    } catch (e) {}
  }
  const isField = (t) => t && (t.closest ? t.closest("input,textarea,[contenteditable=true]") : null);
  const block = (e) => {
    if (!on) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "paste" || e.type === "copy" || e.type === "cut") u.toast("Chế độ tự học: không sao chép, dán trong giờ học.", "bad", 1800);
    return false;
  };
  function keys(e) {
    if (!on) return;
    const k = (e.key || "").toLowerCase();
    const mod = e.ctrlKey || e.metaKey;
    if ((mod && ["c", "v", "x", "a", "p", "s", "u", "f"].includes(k)) || k === "f12" || (mod && e.shiftKey && ["i", "j", "c"].includes(k))) {
      e.preventDefault();
      e.stopPropagation();
    }
  }
  function markAway(reason) {
    if (!on || !started || Date.now() < allowUntil) return;
    if (away) return;
    away = true;
    outN++;
    report && report({ away: true, out: outN, why: reason, t: Date.now() });
    showVeil();
  }
  function back() {
    if (!away) return;
    away = false;
    report && report({ away: false, out: outN, t: Date.now() });
  }
  function showVeil() {
    if (veil) return;
    veil = document.createElement("div");
    veil.className = "lock-veil";
    veil.innerHTML = `<div class="lock-card"><div style="font-size:2.4rem">🔒</div><h2>Em vừa rời khỏi bài học</h2><p>Giáo viên đã được thông báo. Hãy tự suy nghĩ và làm bài trên trang này nhé.</p><button class="btn primary lg" id="lockBack">Tiếp tục học</button></div>`;
    document.body.appendChild(veil);
    veil.querySelector("#lockBack").onclick = () => {
      if (canFs()) enterFs();
      veil.remove();
      veil = null;
      back();
    };
  }
  const Lock = {
    // Bật chế độ: hiện màn chào yêu cầu bấm để vào toàn màn hình (trình duyệt chỉ cho phép khi có thao tác).
    enable(opt = {}) {
      report = opt.report || null;
      if (on) return;
      on = true;
      document.documentElement.classList.add("l360-lock");
      ["copy", "cut", "paste", "contextmenu", "dragstart", "drop"].forEach((ev) => document.addEventListener(ev, block, true));
      document.addEventListener("selectstart", (e) => on && !isField(e.target) && e.preventDefault(), true);
      document.addEventListener("keydown", keys, true);
      document.addEventListener("visibilitychange", () => (document.hidden ? markAway("tab") : null));
      window.addEventListener("blur", () => setTimeout(() => document.hidden && markAway("blur"), 300));
      ["fullscreenchange", "webkitfullscreenchange"].forEach((ev) => document.addEventListener(ev, () => (!fsEl() && canFs() ? markAway("fs") : null)));
      // Link được phép rời trang (vd mở trò chơi web): không tính là rời bài trong 10 phút.
      document.addEventListener("click", (e) => {
        const a = e.target.closest && e.target.closest("[data-allow-leave]");
        if (a) allowUntil = Date.now() + 10 * 60 * 1000;
      }, true);
      window.addEventListener("focus", () => Date.now() < allowUntil && (allowUntil = 0));
      const g = document.createElement("div");
      g.className = "lock-veil";
      g.innerHTML = `<div class="lock-card"><div style="font-size:2.4rem">🎯</div><h2>Chế độ tự học</h2><p>Trong giờ học, bài học mở <b>toàn màn hình</b>; không sao chép, dán hay chuyển sang trang khác. Rời khỏi bài học, giáo viên sẽ được báo.</p><button class="btn primary lg" id="lockGo">Bắt đầu học</button></div>`;
      document.body.appendChild(g);
      g.querySelector("#lockGo").onclick = () => {
        if (canFs()) enterFs();
        g.remove();
        started = true;
        report && report({ away: false, out: outN, t: Date.now(), fs: canFs() });
      };
    },
    disable() {
      on = false;
      document.documentElement.classList.remove("l360-lock");
      if (veil) veil.remove(), (veil = null);
    },
    get active() {
      return on;
    }
  };
  L360.Lock = Lock;
})();
