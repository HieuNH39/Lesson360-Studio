/* Âm thanh tổng hợp bằng Web Audio (không dùng tệp ghi âm, không lo bản quyền).
   Màn chiếu cần một lần bấm để trình duyệt cho phép phát âm thanh. */
(function () {
  const L360 = window.L360;
  let ctx = null;
  let master = null;
  const KEY = "l360:sound";
  const snd = {
    enabled: localStorage.getItem(KEY) !== "off",
    get ready() {
      return !!ctx && ctx.state === "running";
    },
    setEnabled(v) {
      snd.enabled = !!v;
      localStorage.setItem(KEY, v ? "on" : "off");
    },
    unlock() {
      try {
        if (!ctx) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return false;
          ctx = new AC();
          master = ctx.createGain();
          master.gain.value = 0.55;
          master.connect(ctx.destination);
        }
        if (ctx.state === "suspended") ctx.resume();
        return true;
      } catch (e) {
        return false;
      }
    }
  };
  const ok = () => snd.enabled && ctx && ctx.state === "running";

  function tone(freq, { t = 0, dur = 0.15, type = "sine", vol = 0.4, attack = 0.005, slide = 0 } = {}) {
    if (!ok()) return;
    const t0 = ctx.currentTime + t;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }
  function noise({ t = 0, dur = 0.08, vol = 0.25, hp = 1200 } = {}) {
    if (!ok()) return;
    const t0 = ctx.currentTime + t;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.value = vol;
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t0);
  }

  // Tiếng gõ mõ nhẹ mỗi giây (10 giây cuối), cao hơn ở 5 giây cuối.
  snd.tick = () => {
    tone(1250, { dur: 0.05, type: "triangle", vol: 0.28 });
    noise({ dur: 0.02, vol: 0.06, hp: 3000 });
  };
  snd.tickHi = () => {
    tone(1650, { dur: 0.07, type: "triangle", vol: 0.34 });
    tone(825, { dur: 0.07, type: "sine", vol: 0.12 });
  };
  // Hết giờ: tiếng chiêng ngắn.
  snd.end = () => {
    [196, 293.7, 392, 587.3].forEach((f, i) => tone(f, { dur: 1.8 - i * 0.2, type: "sine", vol: 0.32 - i * 0.05, attack: 0.01 }));
    noise({ dur: 0.12, vol: 0.12, hp: 800 });
  };
  // Mở câu hỏi: ba nốt đi lên.
  snd.start = () => [523.3, 659.3, 784].forEach((f, i) => tone(f, { t: i * 0.09, dur: 0.22, type: "triangle", vol: 0.3 }));
  // Công bố đáp án: chuông ngân.
  snd.reveal = () => [784, 988, 1175, 1568].forEach((f, i) => tone(f, { t: i * 0.07, dur: 0.7, type: "sine", vol: 0.22 }));
  snd.correct = () => [659.3, 987.8].forEach((f, i) => tone(f, { t: i * 0.1, dur: 0.25, type: "sine", vol: 0.3 }));
  snd.wrong = () => tone(220, { dur: 0.35, type: "sawtooth", vol: 0.12, slide: 0.7 });
  snd.join = () => tone(880, { dur: 0.12, type: "sine", vol: 0.18, slide: 1.5 });
  snd.page = () => tone(660, { dur: 0.09, type: "sine", vol: 0.12, slide: 1.2 });
  // Bảng xếp hạng / trao thưởng: kèn ngắn.
  snd.award = () => {
    [523.3, 659.3, 784, 1046.5].forEach((f, i) => tone(f, { t: i * 0.12, dur: 0.3, type: "square", vol: 0.12 }));
    [784, 1046.5].forEach((f) => tone(f, { t: 0.5, dur: 0.9, type: "triangle", vol: 0.2 }));
  };
  // Gọi tên ngẫu nhiên: trống dồn rồi "ding".
  snd.drumroll = (sec = 1.6) => {
    const n = Math.floor(sec / 0.06);
    for (let i = 0; i < n; i++) noise({ t: i * 0.06, dur: 0.05, vol: 0.08 + (i / n) * 0.12, hp: 400 });
    [880, 1318.5].forEach((f, i) => tone(f, { t: sec + i * 0.08, dur: 0.6, type: "sine", vol: 0.3 }));
  };
  L360.sound = snd;
})();
