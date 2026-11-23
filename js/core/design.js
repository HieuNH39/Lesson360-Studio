/* Phong cách thiết kế và bảng màu cho tiết học (màn chiếu, máy học sinh, PPT).
   Mỗi gói bài học có pack.design = { style, palette }. */
(function () {
  const L360 = window.L360;

  // Bảng màu: tên gọi dễ nhớ, mỗi bảng chỉ một tông chủ đạo (không pha trộn).
  const palettes = [
    { id: "xanh-duong", name: "Xanh dương + Trắng", hint: "Sạch, rõ ràng, chuyên nghiệp", accent: "#2563EB", accent2: "#1D4ED8", soft: "#E3ECFF", bg: "#F5F8FF", ink: "#0F1B3D" },
    { id: "xanh-la-kem", name: "Xanh lá + Kem", hint: "Nhẹ nhàng, tự nhiên", accent: "#2F7D4F", accent2: "#23603C", soft: "#E2EFDF", bg: "#FBF8EE", ink: "#1D2B1F" },
    { id: "son-dong-ho", name: "Đỏ son Đông Hồ", hint: "Truyền thống, di sản", accent: "#B3372B", accent2: "#8F2A20", soft: "#F3DCD3", bg: "#F7F2E7", ink: "#1F1A17" },
    { id: "trong-dong", name: "Đồng thau trống đồng", hint: "Cổ kính, lịch sử", accent: "#9C6B30", accent2: "#7A5222", soft: "#ECDDC2", bg: "#F6F1E8", ink: "#2A2016" },
    { id: "cam-vang", name: "Cam + Vàng", hint: "Tươi sáng – khởi động, trò chơi", accent: "#E8780C", accent2: "#C75F05", soft: "#FFE6BF", bg: "#FFF9EC", ink: "#3B2506" },
    { id: "binh-minh", name: "Bình minh cam nhạt", hint: "Ấm áp, dịu mắt", accent: "#E9844A", accent2: "#CC6A33", soft: "#FFE1CC", bg: "#FFF6EF", ink: "#3D2414" },
    { id: "ngoc-bich", name: "Ngọc bích biển miền Trung", hint: "Trong trẻo, mát mắt", accent: "#0C9A9A", accent2: "#087A80", soft: "#CDEFEC", bg: "#F0FBFA", ink: "#0E2E30" },
    { id: "nui-rung", name: "Núi rừng Tây Bắc", hint: "Xanh sâu, vững chãi", accent: "#3A7D44", accent2: "#2C5E33", soft: "#DAEAD3", bg: "#F4F8F0", ink: "#1E2B1C" },
    { id: "troi-xanh", name: "Trời xanh ngày nắng", hint: "Khoáng đạt, vui tươi", accent: "#1E90D6", accent2: "#1673B0", soft: "#D3EBFB", bg: "#F2F9FF", ink: "#0D2A40" },
    { id: "dia-trung-hai", name: "Xanh Địa Trung Hải", hint: "Thanh lịch, sâu lắng", accent: "#1B6CA8", accent2: "#145384", soft: "#D6E7F3", bg: "#F7F9FB", ink: "#102538" },
    { id: "hoang-hon-xanh", name: "Hoàng hôn xanh", hint: "Trầm, tập trung", accent: "#24527A", accent2: "#183B59", soft: "#DAE4EF", bg: "#F3F6FA", ink: "#0E1E30" },
    { id: "dinh-nui", name: "Đỉnh núi & mây trắng", hint: "Tĩnh lặng, hiện đại", accent: "#4A6FA5", accent2: "#36557F", soft: "#DDE6F2", bg: "#F7F9FC", ink: "#18263A" },
    { id: "hoa-dao", name: "Hoa anh đào", hint: "Mềm mại, trẻ trung", accent: "#D9667F", accent2: "#BD4F68", soft: "#FADCE3", bg: "#FFF5F7", ink: "#3B2129" },
    { id: "hong-kem", name: "Hồng + Kem", hint: "Dễ thương, dịu dàng", accent: "#C9567A", accent2: "#A9405F", soft: "#F7DDE6", bg: "#FFF8F4", ink: "#3A1F27" },
    { id: "retro", name: "Retro cổ điển", hint: "Hoài niệm, nghệ thuật", accent: "#B8553C", accent2: "#94422E", soft: "#EBD8BE", bg: "#F7F0E3", ink: "#2E241B" },
    { id: "vang-nau", name: "Vàng + Nâu trầm", hint: "Nổi bật, sinh động", accent: "#B98912", accent2: "#8C6512", soft: "#F1E1B5", bg: "#FBF6EA", ink: "#2E2412" }
  ];

  // Phong cách: quyết định nền, khung, phông tiêu đề, hoạ tiết trang trí.
  const styles = [
    { id: "hien-dai", name: "Hiện đại tối giản", hint: "Nền sáng, khối màu mềm, chữ đậm", font: "display", palette: "xanh-duong" },
    { id: "kinh-mo", name: "Kính mờ", hint: "Nền chuyển màu, thẻ trong mờ (Liquid Glass)", font: "display", palette: "troi-xanh" },
    { id: "su-lieu", name: "Sử liệu cổ", hint: "Giấy cổ, chữ có chân, khung tư liệu", font: "serif", palette: "trong-dong" },
    { id: "dong-ho", name: "Di sản Đông Hồ", hint: "Giấy điệp, hoa văn trống đồng", font: "display", palette: "son-dong-ho" },
    { id: "ban-do", name: "Thám hiểm bản đồ", hint: "Đường đồng mức, la bàn", font: "display", palette: "ngoc-bich" },
    { id: "so-tay", name: "Sổ tay học trò", hint: "Giấy kẻ ô, thẻ ghi chú", font: "display", palette: "cam-vang" },
    { id: "thien-nhien", name: "Thiên nhiên", hint: "Lá cây, đường cong mềm", font: "display", palette: "nui-rung" },
    { id: "cong-nghe", name: "Công nghệ số", hint: "Nền tối, lưới mạch – hợp chủ đề AI", font: "display", palette: "hoang-hon-xanh", dark: true }
  ];

  const byId = (arr, id) => arr.find((x) => x.id === id);
  const hexToRgb = (h) => {
    const m = String(h || "").replace("#", "");
    const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const rgba = (h, a) => `rgba(${hexToRgb(h).join(",")},${a})`;

  // Gợi ý phong cách theo môn.
  const subjectDefault = {
    "lich-su": { style: "su-lieu", palette: "trong-dong" },
    "lsdl-ls": { style: "su-lieu", palette: "trong-dong" },
    "dia-li": { style: "ban-do", palette: "ngoc-bich" },
    "lsdl-dl": { style: "ban-do", palette: "ngoc-bich" },
    "ngu-van": { style: "so-tay", palette: "binh-minh" },
    gdcd: { style: "hien-dai", palette: "xanh-la-kem" },
    gdktpl: { style: "hien-dai", palette: "dia-trung-hai" },
    gddp: { style: "dong-ho", palette: "son-dong-ho" }
  };

  const Design = {
    palettes,
    styles,
    palette: (id) => byId(palettes, id) || palettes[0],
    style: (id) => byId(styles, id) || styles[0],
    rgba,
    // Chuẩn hoá: chấp nhận pack.design hoặc pack.theme cũ (accent/bg).
    resolve(pack) {
      const d = (pack && pack.design) || {};
      const st = Design.style(d.style || (subjectDefault[pack && pack.subjectId] || {}).style || "hien-dai");
      let pal = byId(palettes, d.palette) || Design.palette(st.palette);
      const th = pack && pack.theme;
      if (!d.palette && th && th.accent) pal = Object.assign({}, pal, { accent: th.accent, accent2: th.accent2 || th.accent, bg: th.bg || pal.bg });
      return { style: st, palette: pal, id: st.id, paletteId: pal.id };
    },
    suggest: (subjectId) => Object.assign({ style: "hien-dai", palette: "xanh-duong" }, subjectDefault[subjectId] || {}),
    // Gắn biến màu + lớp phong cách lên một phần tử (mặc định cả trang).
    apply(packOrDesign, root) {
      const r = Design.resolve(packOrDesign && packOrDesign.style && !packOrDesign.steps ? { design: packOrDesign } : packOrDesign);
      const el = root || document.documentElement;
      const s = el.style;
      const p = r.palette;
      s.setProperty("--accent", p.accent);
      s.setProperty("--accent-2", p.accent2);
      s.setProperty("--soft", p.soft);
      s.setProperty("--l-bg", p.bg);
      s.setProperty("--l-ink", r.style.dark ? "#EAF2FF" : p.ink);
      s.setProperty("--accent-a12", rgba(p.accent, 0.12));
      s.setProperty("--accent-a25", rgba(p.accent, 0.25));
      const body = root ? el : document.body;
      if (body) {
        [...body.classList].filter((c) => c.startsWith("ds-")).forEach((c) => body.classList.remove(c));
        body.classList.add("ds-" + r.style.id);
        if (r.style.font === "serif") body.classList.add("ds-serif");
        if (r.style.dark) body.classList.add("ds-dark");
      }
      return r;
    },
    // Ô xem trước nhỏ cho bộ chọn phong cách.
    preview(styleId, paletteId, label) {
      const st = Design.style(styleId);
      const p = Design.palette(paletteId || st.palette);
      return `<div class="ds-prev ds-${st.id} ${st.dark ? "ds-dark" : ""} ${st.font === "serif" ? "ds-serif" : ""}" style="--accent:${p.accent};--accent-2:${p.accent2};--soft:${p.soft};--l-bg:${p.bg};--l-ink:${
        st.dark ? "#EAF2FF" : p.ink
      };--accent-a12:${rgba(p.accent, 0.12)};--accent-a25:${rgba(p.accent, 0.25)}">
        <div class="ds-prev-in"><div class="ds-prev-bar"></div><b>${label || "Bài 4. Văn minh"}</b><div class="ds-prev-card"><i></i><i></i><i style="width:60%"></i></div></div></div>`;
    }
  };
  L360.Design = Design;
})();
