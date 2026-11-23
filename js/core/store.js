/* Lớp dữ liệu thời gian thực.
   - Chế độ Trực tuyến: Firebase Realtime Database + Authentication (gói miễn phí Spark).
   - Chế độ Diễn tập: lưu trong trình duyệt (localStorage), các tab cùng máy tự đồng bộ.
   Cả hai có chung một giao diện: on / get / set / update / remove / push / now / presence / auth. */
(function () {
  const L360 = window.L360;
  const u = L360.u;
  const cfg = L360.cfg;
  const ROOT = (cfg.dbRoot || "l360").replace(/\/+$/, "");

  const splitPath = (p) => String(p || "").split("/").filter(Boolean);

  function setIn(tree, path, value) {
    const parts = splitPath(path);
    if (!parts.length) return value == null ? {} : value;
    let cur = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] == null || typeof cur[parts[i]] !== "object") cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    const last = parts[parts.length - 1];
    if (value === null || value === undefined) delete cur[last];
    else cur[last] = value;
    // Dọn nhánh rỗng giống Firebase (không lưu object rỗng).
    prune(tree, parts.slice(0, -1));
    return tree;
  }
  function prune(tree, parts) {
    for (let k = parts.length; k > 0; k--) {
      const sub = u.get(tree, parts.slice(0, k).join("/"));
      if (sub && typeof sub === "object" && Object.keys(sub).length === 0) {
        const parent = k === 1 ? tree : u.get(tree, parts.slice(0, k - 1).join("/"));
        delete parent[parts[k - 1]];
      } else break;
    }
  }
  const SERVER_TS = { ".sv": "timestamp" };

  /* ---------------- Chế độ Diễn tập ---------------- */
  function LocalStore() {
    const KEY = "l360:db:" + ROOT;
    const listeners = [];
    let tree = read();
    function read() {
      try {
        return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
      } catch (e) {
        return {};
      }
    }
    function resolveTs(v) {
      if (v && typeof v === "object") {
        if (v[".sv"] === "timestamp") return Date.now();
        const o = Array.isArray(v) ? [] : {};
        for (const k in v) o[k] = resolveTs(v[k]);
        return o;
      }
      return v;
    }
    function commit(mutator) {
      // Đọc lại bản mới nhất trước khi ghi để giảm xung đột giữa các tab.
      tree = read();
      mutator(tree);
      try {
        localStorage.setItem(KEY, JSON.stringify(tree));
      } catch (e) {
        u.toast("Bộ nhớ trình duyệt đã đầy – hãy xoá phòng cũ.", "bad");
      }
      notify();
      return Promise.resolve();
    }
    function notify() {
      for (const l of listeners) {
        const v = u.get(tree, l.path);
        const s = JSON.stringify(v === undefined ? null : v);
        if (s !== l.last) {
          l.last = s;
          try {
            l.cb(v === undefined ? null : u.clone(v));
          } catch (e) {
            console.error(e);
          }
        }
      }
    }
    window.addEventListener("storage", (e) => {
      if (e.key === KEY) {
        tree = read();
        notify();
      }
    });
    const api = {
      mode: "local",
      ready: Promise.resolve(),
      on(path, cb) {
        const l = { path: ROOT + "/" + path, cb, last: undefined };
        listeners.push(l);
        const v = u.get(tree, l.path);
        l.last = JSON.stringify(v === undefined ? null : v);
        setTimeout(() => cb(v === undefined ? null : u.clone(v)), 0);
        return () => {
          const i = listeners.indexOf(l);
          if (i >= 0) listeners.splice(i, 1);
        };
      },
      // Lọc các con theo một trường (Firebase: orderByChild + equalTo).
      query(path, child, value) {
        return this.get(path).then((v) => {
          const out = {};
          Object.entries(v || {}).forEach(([k, x]) => x && x[child] === value && (out[k] = x));
          return out;
        });
      },
      get(path) {
        tree = read();
        const v = u.get(tree, ROOT + "/" + path);
        return Promise.resolve(v === undefined ? null : u.clone(v));
      },
      set(path, value) {
        return commit((t) => setIn(t, ROOT + "/" + path, resolveTs(u.clone(value))));
      },
      update(path, obj) {
        return commit((t) => {
          for (const k in obj) setIn(t, ROOT + "/" + path + "/" + k, resolveTs(u.clone(obj[k])));
        });
      },
      remove(path) {
        return commit((t) => setIn(t, ROOT + "/" + path, null));
      },
      push(path, value) {
        const key = Date.now().toString(36) + u.uid(6);
        return api.set(path + "/" + key, value).then(() => key);
      },
      now: () => Date.now(),
      TS: SERVER_TS,
      presence(path, value) {
        // Nhịp tim 8 giây; máy khác coi là mất kết nối nếu quá 20 giây.
        const beat = () => api.set(path, Object.assign({}, value, { t: Date.now() }));
        beat();
        const h = setInterval(beat, 8000);
        window.addEventListener("pagehide", () => api.remove(path));
        return () => {
          clearInterval(h);
          api.remove(path);
        };
      },
      wipeLocal() {
        localStorage.removeItem(KEY);
        tree = {};
        notify();
      },
      auth: {
        user: null,
        onChange(cb) {
          setTimeout(() => cb(api.auth.user), 0);
        },
        async signInTeacher(email) {
          api.auth.user = { uid: "local-teacher", email: email || "giaovien@dien-tap", isTeacher: true };
          sessionStorage.setItem("l360:teacher", "1");
          return api.auth.user;
        },
        async signUpTeacher(email) {
          return api.auth.signInTeacher(email);
        },
        async signInGoogle() {
          return api.auth.signInTeacher("giaovien@dien-tap");
        },
        async resetPassword() {},
        async signOut() {
          sessionStorage.removeItem("l360:teacher");
          api.auth.user = null;
        },
        async signInStudent() {
          let id = sessionStorage.getItem("l360:sid");
          if (!id) {
            id = "local-" + u.uid(10);
            sessionStorage.setItem("l360:sid", id);
          }
          api.auth.user = { uid: id, anonymous: true };
          return api.auth.user;
        },
        restoreTeacher() {
          if (sessionStorage.getItem("l360:teacher") || localStorage.getItem("l360:teacher-local")) {
            api.auth.user = { uid: "local-teacher", email: "giaovien@dien-tap", isTeacher: true };
          }
          return api.auth.user;
        }
      }
    };
    api.auth.restoreTeacher();
    return api;
  }

  /* ---------------- Chế độ Trực tuyến (Firebase) ---------------- */
  function FirebaseStore() {
    const app = firebase.initializeApp(cfg.firebase);
    const db = firebase.database(app);
    const auth = firebase.auth(app);
    // Chỉ dùng khi kiểm thử với Firebase Emulator (không bật trên bản triển khai thật).
    if (cfg.emulator) {
      db.useEmulator(cfg.emulator.host || "localhost", cfg.emulator.dbPort || 9000);
      auth.useEmulator(`http://${cfg.emulator.host || "localhost"}:${cfg.emulator.authPort || 9099}`);
    }
    let offset = 0;
    db.ref(".info/serverTimeOffset").on("value", (s) => (offset = s.val() || 0));
    const ref = (p) => db.ref(ROOT + "/" + p);
    let currentUser = null;
    const readyP = new Promise((res) => {
      const off = auth.onAuthStateChanged((usr) => {
        currentUser = usr;
        off();
        res();
      });
    });
    const api = {
      mode: "firebase",
      ready: readyP,
      on(path, cb) {
        const r = ref(path);
        const h = (s) => cb(s.val());
        const err = (e) => console.warn("Không đọc được", path, e && e.code);
        r.on("value", h, err);
        return () => r.off("value", h);
      },
      get: (path) => ref(path).get().then((s) => s.val()),
      query: (path, child, value) => ref(path).orderByChild(child).equalTo(value).get().then((s) => s.val() || {}),
      set: (path, v) => ref(path).set(v),
      update: (path, o) => ref(path).update(o),
      remove: (path) => ref(path).remove(),
      push(path, v) {
        const r = ref(path).push();
        return r.set(v).then(() => r.key);
      },
      now: () => Date.now() + offset,
      TS: firebase.database.ServerValue.TIMESTAMP,
      presence(path, value) {
        const r = ref(path);
        const con = db.ref(".info/connected");
        const h = (s) => {
          if (s.val() === true) {
            r.onDisconnect().remove();
            r.set(Object.assign({}, value, { t: firebase.database.ServerValue.TIMESTAMP }));
          }
        };
        con.on("value", h);
        return () => {
          con.off("value", h);
          r.remove();
        };
      },
      onConnection(cb) {
        db.ref(".info/connected").on("value", (s) => cb(!!s.val()));
      },
      auth: {
        get user() {
          const cu = auth.currentUser || currentUser;
          return cu ? { uid: cu.uid, email: cu.email, name: cu.displayName || "", anonymous: cu.isAnonymous } : null;
        },
        onChange(cb) {
          return auth.onAuthStateChanged((usr) => {
            currentUser = usr;
            cb(api.auth.user);
          });
        },
        async signInTeacher(email, pw) {
          await auth.signInWithEmailAndPassword(email, pw);
          return api.auth.user;
        },
        async signUpTeacher(email, pw) {
          await auth.createUserWithEmailAndPassword(email, pw);
          return api.auth.user;
        },
        async signInGoogle() {
          const pv = new firebase.auth.GoogleAuthProvider();
          pv.setCustomParameters({ prompt: "select_account" });
          await auth.signInWithPopup(pv);
          return api.auth.user;
        },
        // Liên kết tài khoản Google vào tài khoản email đang dùng (lần sau đăng nhập bằng Google).
        async linkGoogle() {
          const pv = new firebase.auth.GoogleAuthProvider();
          pv.setCustomParameters({ prompt: "select_account" });
          await auth.currentUser.linkWithPopup(pv);
          return api.auth.user;
        },
        providers() {
          return ((auth.currentUser && auth.currentUser.providerData) || []).map((p) => p.providerId);
        },
        async resetPassword(email) {
          await auth.sendPasswordResetEmail(email);
        },
        async signOut() {
          await auth.signOut();
        },
        async signInStudent() {
          if (!auth.currentUser) await auth.signInAnonymously();
          return api.auth.user;
        },
        restoreTeacher() {
          return api.auth.user;
        }
      }
    };
    return api;
  }

  // Bản chính thức luôn chạy trực tuyến. Chế độ diễn tập (1 máy) chỉ dành cho kiểm thử nội bộ: cần thêm dev=1.
  const qsDev = /[?&]dev=1(&|$)/.test(location.search);
  let devOk = qsDev;
  try {
    if (qsDev) localStorage.setItem("l360:dev", "1");
    devOk = devOk || localStorage.getItem("l360:dev") === "1";
  } catch (e) {}
  const askRehearsal = /(?:^|[?&])(che-do|mode)=(dien-tap|rehearsal)/.test(location.search);
  if (askRehearsal && !devOk) {
    const q = location.search.replace(/([?&])(che-do|mode)=(dien-tap|rehearsal)(&|$)/, (m, a, b, c, d) => (d ? a : "")).replace(/^&/, "?");
    history.replaceState(history.state, "", location.pathname + (q === "?" ? "" : q) + location.hash);
  }
  const forcedRehearsal = askRehearsal && devOk;
  const hasFirebase =
    cfg.firebase && cfg.firebase.apiKey && cfg.firebase.databaseURL && typeof window.firebase !== "undefined";
  L360.store = !forcedRehearsal && hasFirebase ? FirebaseStore() : LocalStore();
  L360.isLocal = L360.store.mode === "local";
  L360.modeLabel = L360.isLocal ? "Diễn tập (1 máy)" : "Trực tuyến";
})();
