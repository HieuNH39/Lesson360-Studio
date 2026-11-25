/* Phòng học: tạo phòng, điều khiển tiến trình (giáo viên), tham gia và nộp bài (học sinh),
   thống kê – minh chứng – tổng kết phiên dạy cho bảng dữ liệu INSIGHT. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const S = () => L360.store;
  const Pack = L360.Pack;
  const R = (room, sub) => `rooms/${room}` + (sub ? "/" + sub : "");

  const Room = {
    R,
    async exists(room) {
      return !!(await S().get(R(room, "meta")));
    },
    async create({ pack, room, className, classSize, groupCount, teacher, lock, lop }) {
      const p = Pack.normalize(pack);
      // Lớp có danh sách (quản trị viên tải lên): sĩ số, mã S01… và tên hiển thị lấy từ danh sách.
      const ds = lop && lop.hs && lop.hs.length ? L360.Lop.roster(lop) : null;
      const groups = Pack.groups(p, groupCount);
      const meta = {
        title: p.title,
        subject: p.subject || "",
        subjectId: p.subjectId || "",
        grade: p.grade || "",
        lessonRef: p.lessonRef || "",
        label: Pack.label(p),
        baiKey: (p.bai && p.bai.key) || "",
        className: ds ? lop.ten : className || "",
        classSize: ds ? ds.length : Math.max(1, Math.min(L360.cfg.maxClassSize || 45, Number(classSize) || L360.cfg.defaultClassSize || 30)),
        classId: ds ? `${lop.nam}/${lop.id}` : null,
        groups,
        teacherUid: teacher.uid,
        teacherName: teacher.name || teacher.email || "",
        packId: p.id,
        createdAt: S().TS,
        status: "open",
        mode: S().mode,
        lock: lock !== false,
        ppct: p.ppct ? { doc: p.ppct.doc, bai: p.ppct.bai, so: p.ppct.so } : null
      };
      await S().set(R(room, "meta"), meta);
      await S().set(`priv/${room}`, { pack: p });
      await S().set(R(room, "pub"), { meta: Pack.publicMeta(p) });
      await S().set(R(room, "state"), { step: -1, phase: "observe", q: 0, round: 1, screen: "content", v: 1 });
      if (ds) await S().update(R(room), Object.fromEntries(ds.map((x) => [`roster/${x.code}`, { name: x.name }])));
      return { pack: p, meta };
    },
    async wipe(room) {
      await S().remove(`priv/${room}`);
      await S().remove(R(room));
    },
    codes(classSize) {
      const n = Number(classSize) || 30;
      return Array.from({ length: n }, (_, i) => "S" + u.pad(i + 1));
    },
    online(room, code) {
      const p = room && room.presence && room.presence[code];
      if (!p) return false;
      if (L360.isLocal) return Date.now() - (p.t || 0) < 20000;
      return true;
    },
    joined(room) {
      return u.entries(room && room.roster).filter(([, r]) => r && r.uid);
    },
    // Điểm danh: vắng = chưa vào lớp lúc bắt đầu tiết và vẫn chưa vào; muộn = vào sau khi tiết đã bắt đầu.
    attendance(room) {
      const meta = (room && room.meta) || {};
      const ab = meta.absent || {};
      const roster = (room && room.roster) || {};
      const started = !!(room && room.state && room.state.startedAt);
      const absent = started ? Object.keys(ab).filter((c) => !(roster[c] && roster[c].uid)).sort() : [];
      const late = Object.keys(ab).filter((c) => roster[c] && roster[c].uid).sort();
      return { started, absent, late, isAbsent: (c) => absent.includes(c), isLate: (c) => late.includes(c) };
    },
    remaining(state) {
      if (!state || state.phase !== "open" || !state.dur || !state.openedAt) return null;
      return state.dur - (S().now() - state.openedAt) / 1000;
    }
  };

  /* ---------- Bộ điều khiển của giáo viên ---------- */
  class Host {
    constructor(room, pack, onChange) {
      this.room = room;
      this.pack = Pack.normalize(pack);
      this.data = {};
      this.onChange = onChange;
      this.unsub = S().on(R(room), (v) => {
        this.data = v || {};
        this.onChange && this.onChange(this.data);
      });
      this.tickH = setInterval(() => this.tick(), 500);
    }
    destroy() {
      this.unsub && this.unsub();
      clearInterval(this.tickH);
    }
    get state() {
      return this.data.state || { step: -1, phase: "observe" };
    }
    get meta() {
      return this.data.meta || {};
    }
    get step() {
      return this.pack.steps[this.state.step] || null;
    }
    get type() {
      return this.step ? L360.types[this.step.type] : null;
    }
    key(st) {
      return this.step ? L360.subKey(this.step, st || this.state) : null;
    }
    subsFor(key) {
      return (this.data.subs && this.data.subs[key]) || {};
    }
    gsubsFor(key) {
      return (this.data.gsubs && this.data.gsubs[key]) || {};
    }
    async patchState(obj) {
      const v = (this.state.v || 0) + 1;
      await S().update(R(this.room, "state"), Object.assign({ v }, obj));
    }
    async release(st) {
      const step = this.step;
      if (!step) return;
      const key = L360.subKey(step, st);
      await S().set(R(this.room, `pub/items/${key}`), Pack.publicItem(step, st));
    }
    async goto(i) {
      const n = this.pack.steps.length;
      i = Math.max(-1, Math.min(n, i));
      const st = { step: i, phase: "observe", q: 0, round: 1, page: 0, screen: "content", openedAt: null, dur: 0, vcmd: null, stepAt: S().TS };
      const first = i >= 0 && !this.state.startedAt;
      if (first) st.startedAt = S().TS;
      // Bắt đầu tiết: học sinh chưa vào lớp được ghi là vắng (vào sau thì thành "muộn").
      if (first) {
        const roster = this.data.roster || {};
        const ab = Object.fromEntries(Room.codes(this.meta.classSize).filter((c) => !(roster[c] && roster[c].uid)).map((c) => [c, true]));
        await S().set(R(this.room, "meta/absent"), Object.keys(ab).length ? ab : null);
      }
      await this.patchState(st);
      // Hết tiết: công bố nhiệm vụ về nhà – chuẩn bị bài sau cho màn chiếu và học sinh.
      if (i >= n) await S().set(R(this.room, "pub/homework"), Pack.homework(this.pack));
      const step = this.pack.steps[i];
      if (step) {
        const t = L360.types[step.type] || {};
        if (t.releaseOnEnter) await S().set(R(this.room, `pub/items/${L360.subKey(step, st)}`), Pack.publicItem(step, st));
        if (t.noSubmit && step.ghiBai) await S().set(R(this.room, `pub/notes/${step.id}`), { t: step.title, x: step.ghiBai });
        if (t.onEnter) await t.onEnter(this, step);
      }
    }
    next() {
      return this.goto(this.state.step + 1);
    }
    prev() {
      return this.goto(this.state.step - 1);
    }
    defaultDur() {
      const s = this.step;
      if (!s) return 0;
      const t = this.type || {};
      if (t.timerFor) return t.timerFor(s, this.state) || 0;
      return Number(s.timer) || 0;
    }
    async open(dur) {
      const st = Object.assign({}, this.state);
      await this.release(st);
      await this.patchState({ phase: "open", openedAt: S().TS, dur: dur == null ? this.defaultDur() : dur });
    }
    lock() {
      return this.patchState({ phase: "locked" });
    }
    reopen() {
      return this.patchState({ phase: "open", openedAt: S().TS, dur: this.defaultDur() });
    }
    async reveal() {
      const step = this.step;
      if (!step) return;
      const ans = Pack.answerItem(step, this.state);
      if (ans != null) await S().set(R(this.room, `pub/answers/${this.key()}`), ans);
      const note = (ans && ans.ghiBai) || (step.ghiBai && !step.questions ? step.ghiBai : "");
      if (note) await S().set(R(this.room, `pub/notes/${this.key()}`), { t: step.title, x: note });
      // Với hoạt động hai vòng: công bố cho cả vòng 1.
      if (step.type === "poll2" && ans != null) await S().set(R(this.room, `pub/answers/${L360.subKey(step, { round: 1 })}`), ans);
      await this.patchState({ phase: "revealed", screen: "content" });
    }
    async round2() {
      const st = Object.assign({}, this.state, { round: 2 });
      await this.release(st);
      const t = this.type;
      await this.patchState({ round: 2, phase: "open", openedAt: S().TS, dur: t && t.timerFor ? t.timerFor(this.step, st) : 45 });
    }
    async setQ(q, autoOpen) {
      const st = Object.assign({}, this.state, { q });
      const patch = { q, phase: "observe", openedAt: null, dur: 0, screen: "content" };
      if (autoOpen) {
        await S().set(R(this.room, `pub/items/${L360.subKey(this.step, st)}`), Pack.publicItem(this.step, st));
        const t = this.type;
        Object.assign(patch, { phase: "open", openedAt: S().TS, dur: t && t.timerFor ? t.timerFor(this.step, st) : 0 });
      }
      await this.patchState(patch);
    }
    addTime(sec) {
      const st = this.state;
      if (st.phase !== "open") return;
      const rem = Room.remaining(st);
      if (rem == null) return this.patchState({ openedAt: S().TS, dur: sec });
      return this.patchState({ dur: (st.dur || 0) + sec });
    }
    setScreen(mode) {
      return this.patchState({ screen: mode });
    }
    // Bài giảng nhiều trang.
    setPage(p) {
      const n = this.step && this.step.pages ? this.step.pages.length : 1;
      return this.patchState({ page: Math.max(0, Math.min(n - 1, p)) });
    }
    // Điều khiển video trên màn chiếu.
    videoCmd(c, t) {
      return this.patchState({ vcmd: { c, t: t == null ? null : Number(t), n: Date.now() } });
    }
    async askAt(i, t) {
      const st = Object.assign({}, this.state, { q: i });
      await S().set(R(this.room, `pub/items/${L360.subKey(this.step, st)}`), Pack.publicItem(this.step, st));
      const dur = this.type && this.type.timerFor ? this.type.timerFor(this.step, st) : 25;
      await this.patchState({ q: i, phase: "open", openedAt: S().TS, dur, screen: "content", vcmd: { c: "pause", t: Number(t) || 0, n: Date.now() } });
    }
    async videoResume(nextQ) {
      const st = Object.assign({}, this.state, { q: nextQ });
      await S().set(R(this.room, `pub/items/${L360.subKey(this.step, st)}`), Object.assign(Pack.publicItem(this.step, st), { text: "" }));
      await this.patchState({ q: nextQ, phase: "observe", openedAt: null, dur: 0, vcmd: { c: "play", t: null, n: Date.now() } });
    }
    // Gọi tên ngẫu nhiên (ưu tiên bạn chưa được gọi).
    async pick() {
      const roster = this.data.roster || {};
      const online = this.joinedCodes().filter((c) => Room.online(this.data, c));
      const pool = online.length ? online : this.joinedCodes();
      if (!pool.length) return null;
      this._picked = this._picked || [];
      let cand = pool.filter((c) => !this._picked.includes(c));
      if (!cand.length) {
        this._picked = [];
        cand = pool;
      }
      const code = cand[Math.floor(Math.random() * cand.length)];
      this._picked.push(code);
      const r = roster[code] || {};
      const g = (this.meta.groups || []).find((x) => x.id === r.group);
      await S().set(R(this.room, "pub/overlay"), { kind: "pick", code, name: r.name || "", group: g ? g.name : "", color: g ? g.color : "", pool: pool.slice(0, 40), n: Date.now() });
      return code;
    }
    // Chiếu nội dung ghi vở cỡ chữ lớn (toàn màn chiếu) để học sinh chép.
    showNote(title, text) {
      return S().set(R(this.room, "pub/overlay"), { kind: "note", title: title || "Ghi vào vở", text: String(text || ""), n: Date.now() });
    }
    closeOverlay() {
      return S().set(R(this.room, "pub/overlay"), null);
    }
    setSound(on) {
      return this.patchState({ sound: !!on });
    }
    async feature(key, code, text) {
      const path = R(this.room, `pub/featured/${key}/${code}`);
      const cur = u.get(this.data, `pub/featured/${key}/${code}`);
      await S().set(path, cur ? null : String(text || "").slice(0, 400) || "★");
    }
    award(stepId, g) {
      return S().set(R(this.room, `pub/awards/${stepId}`), g);
    }
    releaseCode(code) {
      return S().update(R(this.room), { [`roster/${code}/uid`]: null, [`presence/${code}`]: null });
    }
    moveGroup(code, g) {
      return S().set(R(this.room, `roster/${code}/group`), g);
    }
    setSecretary(stepId, g, code) {
      return S().set(R(this.room, `gwork/${stepId}/${g}/sec`), code);
    }
    // Học sinh có mặt (đã vào lớp).
    joinedCodes() {
      return Room.joined(this.data).map(([c]) => c);
    }
    tick() {
      const st = this.state;
      if (st.phase !== "open" || !this.step) return;
      const rem = Room.remaining(st);
      if (rem != null && rem <= 0) {
        this.lock();
        return;
      }
      const t = this.type || {};
      if (t.autoLockWhenAll) {
        const subs = this.subsFor(this.key());
        const present = this.joinedCodes().filter((c) => Room.online(this.data, c));
        if (present.length && present.every((c) => subs[c])) this.lock();
      }
    }
    /* ---------- Thống kê và minh chứng ---------- */
    stats() {
      return Stats.forRoom(this.pack, this.data);
    }
    async end(feedback) {
      const summary = Stats.summary(this.pack, this.data, this.room, feedback);
      await S().set(`sessions/${summary.sid}`, summary);
      await S().update(R(this.room), { "meta/status": "ended", "meta/sid": summary.sid });
      await this.goto(this.pack.steps.length);
      return summary;
    }
  }
  Room.Host = Host;

  /* ---------- Học sinh ---------- */
  const Student = {
    saved(room) {
      try {
        return JSON.parse(localStorage.getItem("l360:join:" + room) || "null");
      } catch (e) {
        return null;
      }
    },
    async join(room, code, name, group) {
      const user = await S().auth.signInStudent();
      const meta = await S().get(R(room, "meta"));
      if (!meta) throw new Error("Không tìm thấy phòng " + room + ". Kiểm tra lại mã phòng trên màn chiếu.");
      if (meta.status === "ended") throw new Error("Tiết học trong phòng này đã kết thúc.");
      const cur = await S().get(R(room, `roster/${code}`));
      if (cur && cur.uid && cur.uid !== user.uid) {
        if (!L360.isLocal) throw new Error(`Mã ${code} đã có người dùng. Nếu đó là mã của em, nhờ giáo viên bấm "Giải phóng mã" rồi vào lại.`);
        const pres = await S().get(R(room, `presence/${code}`));
        if (pres && Date.now() - (pres.t || 0) < 20000) throw new Error(`Mã ${code} đang được dùng trên thiết bị khác. Hãy báo giáo viên.`);
      }
      const grp = cur && cur.group && !group ? cur.group : group;
      // Lớp có danh sách: tên do hệ thống đặt sẵn, học sinh không tự đặt tên.
      if (meta.classId) name = (cur && cur.name) || "";
      // Ghi danh trước, rồi mới ghi ánh xạ uid → mã (luật bảo mật kiểm tra theo thứ tự này).
      await S().set(R(room, `roster/${code}`), {
        uid: user.uid,
        name: String(name || (cur && cur.name) || "").slice(0, 20),
        group: grp || "",
        t: S().TS
      });
      await S().set(R(room, `uids/${user.uid}`), code);
      localStorage.setItem("l360:join:" + room, JSON.stringify({ code, name, group: grp }));
      return { meta, code, uid: user.uid };
    },
    submit(room, key, code, value) {
      return S().set(R(room, `subs/${key}/${code}`), { v: value, t: S().TS });
    },
    gsubmit(room, key, g, code, value) {
      return S().set(R(room, `gsubs/${key}/${g}`), { v: value, by: code, t: S().TS });
    }
  };
  Room.Student = Student;

  /* ---------- Thống kê ---------- */
  function hsFeedback(data) {
    const all = Object.values((data && data.fb) || {}).filter((x) => x && (x.vui || x.hieu));
    if (!all.length) return null;
    const vui = [0, 0, 0, 0];
    const hieu = [0, 0, 0];
    all.forEach((x) => {
      if (x.vui >= 1 && x.vui <= 4) vui[x.vui - 1]++;
      if (x.hieu >= 1 && x.hieu <= 3) hieu[x.hieu - 1]++;
    });
    const nv = vui.reduce((a, b) => a + b, 0);
    const nh = hieu.reduce((a, b) => a + b, 0);
    return { n: all.length, vui, hieu, thich: nv ? Math.round(((vui[2] + vui[3]) / nv) * 100) : null, hieuBai: nh ? Math.round(((hieu[1] + hieu[2]) / nh) * 100) : null };
  }
  const Stats = {
    // Danh sách các lượt nộp bài có thể thống kê của một gói bài học.
    keysOf(pack, data) {
      const out = [];
      pack.steps.forEach((s, i) => {
        const t = L360.types[s.type];
        if (!t || t.noSubmit) return;
        const ks = t.keys ? t.keys(s, data.meta || {}) : [{ key: s.id, label: s.title }];
        ks.forEach((k) => out.push(Object.assign({ step: s, index: i, type: t }, k)));
      });
      return out;
    },
    forRoom(pack, data) {
      const joined = Room.joined(data).map(([c]) => c);
      const rows = Stats.keysOf(pack, data).map((k) => {
        const group = k.type.groupMode;
        const subs = group ? (data.gsubs && data.gsubs[k.key]) || {} : (data.subs && data.subs[k.key]) || {};
        const n = Object.keys(subs).length;
        let right = 0;
        let gradable = 0;
        if (k.type.isCorrect) {
          for (const c in subs) {
            const ok = k.type.isCorrect(k.step, k.key, subs[c].v);
            if (ok === true || ok === false) {
              gradable++;
              if (ok) right++;
            }
          }
        }
        const opened = !!(data.pub && data.pub.items && data.pub.items[k.key]);
        const denom = group ? ((data.meta && data.meta.groups) || []).length : joined.length;
        return {
          key: k.key,
          label: k.label,
          stepTitle: k.step.title,
          stepIndex: k.index,
          type: k.step.type,
          opened,
          n,
          rate: opened && denom ? u.pct(n, denom) : null,
          correct: gradable ? u.pct(right, gradable) : null,
          group
        };
      });
      return { joined: joined.length, rows };
    },
    score(pack, data, code) {
      let pts = 0;
      Stats.keysOf(pack, data).forEach((k) => {
        if (!k.type.points) return;
        const ans = data.pub && data.pub.answers && data.pub.answers[k.key];
        const sub = data.subs && data.subs[k.key] && data.subs[k.key][code];
        if (ans == null || !sub) return;
        if (k.type.points && k.type.points.length >= 3) pts += Number(k.type.points(k.step, k.key, sub.v)) || 0;
        else if (k.type.isCorrect(k.step, k.key, sub.v)) pts += k.type.points(k.step);
      });
      return pts;
    },
    leaderboard(pack, data) {
      const roster = data.roster || {};
      const list = Object.keys(roster)
        .filter((c) => roster[c] && roster[c].uid !== undefined)
        .map((c) => ({ code: c, name: roster[c].name || "", group: roster[c].group || "", pts: Stats.score(pack, data, c) }))
        .sort((a, b) => b.pts - a.pts || a.code.localeCompare(b.code));
      const groups = ((data.meta && data.meta.groups) || []).map((g) => {
        const mem = list.filter((x) => x.group === g.id);
        return Object.assign({}, g, { n: mem.length, avg: mem.length ? Math.round(mem.reduce((a, x) => a + x.pts, 0) / mem.length) : 0 });
      });
      groups.sort((a, b) => b.avg - a.avg);
      return { list, groups };
    },
    summary(pack, data, room, feedback) {
      const st = Stats.forRoom(pack, data);
      const meta = data.meta || {};
      const opened = st.rows.filter((r) => r.opened && !r.group);
      const graded = opened.filter((r) => r.correct != null);
      const p2 = pack.steps
        .filter((s) => s.type === "poll2" && s.answer != null)
        .map((s) => {
          const r1 = st.rows.find((r) => r.key === L360.subKey(s, { round: 1 }));
          const r2 = st.rows.find((r) => r.key === L360.subKey(s, { round: 2 }));
          return { title: s.title, r1: r1 && r1.correct, r2: r2 && r2.correct };
        })
        .filter((x) => x.r1 != null && x.r2 != null);
      const self = { 1: 0, 2: 0, 3: 0 };
      pack.steps
        .filter((s) => s.type === "text" && s.selfAssess)
        .forEach((s) => {
          u.vals(data.subs && data.subs[s.id]).forEach((x) => {
            const lv = x && x.v && x.v.level;
            if (self[lv] != null) self[lv]++;
          });
        });
      const startedAt = (data.state && data.state.startedAt) || meta.createdAt || Date.now();
      const sid = `${u.isoDay(startedAt)}-${room}-${u.uid(4)}`;
      const lb = Stats.leaderboard(pack, data);
      return {
        sid,
        room,
        teacherUid: meta.teacherUid || "",
        teacherName: meta.teacherName || "",
        subject: pack.subject || meta.subject || "",
        subjectId: pack.subjectId || meta.subjectId || "",
        grade: pack.grade || meta.grade || "",
        label: Pack.label(pack),
        baiKey: (pack.bai && pack.bai.key) || "",
        tiet: pack.tiet || null,
        design: pack.design || null,
        phases: Pack.phaseCount(pack),
        className: meta.className || "",
        title: pack.title,
        packId: pack.id,
        startedAt,
        endedAt: Date.now(),
        day: u.isoDay(startedAt),
        classSize: meta.classSize || null,
        classId: meta.classId || null,
        joined: st.joined,
        absent: Room.attendance(data).absent.map((c) => ({ code: c, name: ((data.roster || {})[c] || {}).name || "" })),
        late: Room.attendance(data).late.map((c) => ({ code: c, name: ((data.roster || {})[c] || {}).name || "" })),
        steps: pack.steps.length,
        interactive: opened.length,
        participation: opened.length ? Math.round(u.avg(opened.map((r) => r.rate || 0))) : null,
        correctRate: graded.length ? Math.round(u.avg(graded.map((r) => r.correct))) : null,
        rows: st.rows.filter((r) => r.opened).map((r) => ({ label: r.label, step: r.stepTitle, type: r.type, n: r.n, rate: r.rate, correct: r.correct })),
        hard: graded
          .slice()
          .sort((a, b) => a.correct - b.correct)
          .slice(0, 3)
          .map((r) => ({ label: r.label, step: r.stepTitle, correct: r.correct })),
        peer: p2,
        selfAssess: self,
        quizAvg: lb.list.length ? Math.round(u.avg(lb.list.map((x) => x.pts))) : null,
        prepMinutes: (pack.meta && pack.meta.prepMinutes) || null,
        aiTool: (pack.meta && pack.meta.aiTool) || "",
        madeWithAI: !!(pack.meta && pack.meta.madeWithAI),
        feedback: feedback || null,
        hs: hsFeedback(data),
        mode: L360.store.mode
      };
    },
    // Góp ý nhanh của học sinh cuối tiết (thích/hiểu bài) – tổng hợp vào minh chứng tiết học.
    hsFeedback: (data) => hsFeedback(data),
    // Tệp CSV minh chứng cá nhân.
    csvIndividual(pack, data) {
      const keys = Stats.keysOf(pack, data).filter((k) => !k.type.groupMode && data.pub && data.pub.items && data.pub.items[k.key]);
      const head = ["Mã HS", "Tên gọi", "Nhóm"];
      keys.forEach((k) => {
        head.push(`${k.label} – trả lời`);
        if (k.type.isCorrect) head.push(`${k.label} – đúng`);
      });
      head.push("Điểm quiz");
      const groups = Object.fromEntries(((data.meta && data.meta.groups) || []).map((g) => [g.id, g.name]));
      const rows = [head];
      Room.joined(data)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([code, r]) => {
          const row = [code, r.name || "", groups[r.group] || ""];
          keys.forEach((k) => {
            const sub = data.subs && data.subs[k.key] && data.subs[k.key][code];
            row.push(sub ? k.type.describe(k.step, k.key, sub.v) : "");
            if (k.type.isCorrect) {
              const ok = sub ? k.type.isCorrect(k.step, k.key, sub.v) : null;
              row.push(ok == null ? "" : ok ? 1 : 0);
            }
          });
          row.push(Stats.score(pack, data, code));
          rows.push(row);
        });
      return u.csv(rows);
    },
    csvGroups(pack, data) {
      const groups = (data.meta && data.meta.groups) || [];
      const keys = Stats.keysOf(pack, data).filter((k) => k.type.groupMode);
      const rows = [["Nhóm", "Hoạt động", "Nội dung nộp", "Người nộp"]];
      groups.forEach((g) => {
        keys.forEach((k) => {
          const s = data.gsubs && data.gsubs[k.key] && data.gsubs[k.key][g.id];
          rows.push([g.name, k.label, s ? k.type.describe(k.step, k.key, s.v) : "", s ? s.by : ""]);
        });
        // Điểm đánh giá đồng đẳng (triển lãm).
        pack.steps
          .filter((s) => s.type === "expo")
          .forEach((s) => {
            const key = L360.subKey(s, { q: groups.indexOf(g) });
            const subs = u.vals(data.subs && data.subs[key]);
            if (!subs.length) return;
            const crit = (s.criteria || []).map((c, i) => `${c}: ${u.round1(u.avg(subs.map((x) => x.v && x.v.scores && x.v.scores[i])))}`);
            rows.push([g.name, `${s.title} – đánh giá đồng đẳng (${subs.length} lượt)`, crit.join(" | "), ""]);
          });
      });
      return u.csv(rows);
    }
  };
  Room.Stats = Stats;
  L360.Room = Room;
})();
