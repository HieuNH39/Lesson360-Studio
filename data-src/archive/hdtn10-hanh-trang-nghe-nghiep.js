/* Gói bài học mẫu: Hoạt động trải nghiệm, hướng nghiệp 10 – tìm hiểu nhóm nghề theo sở thích (mật mã Holland).
   Minh hoạ Lesson 360° dùng cho môn khác ngoài Lịch sử. */
window.L360.packs.push({
  schema: "l360-pack/1",
  id: "hdtn10-hanh-trang-nghe-nghiep",
  title: "Hành trang nghề nghiệp thời AI",
  subject: "Hoạt động trải nghiệm, hướng nghiệp",
  grade: "10",
  lessonRef: "Chủ đề hướng nghiệp – tìm hiểu nhóm nghề và yêu cầu của nghề",
  duration: 45,
  author: "Nguyễn Hữu Hiệu",
  objectives: [
    "Nhận diện được sở thích nghề nghiệp của bản thân theo 6 nhóm sở thích (mật mã Holland).",
    "Tìm hiểu được công việc, phẩm chất, năng lực và con đường học tập của một nhóm nghề.",
    "Nêu được những năng lực người lao động cần có khi trí tuệ nhân tạo thay đổi nhiều công việc.",
    "Lập được một bước hành động cụ thể để tìm hiểu nghề em quan tâm."
  ],
  theme: { accent: "#24527A", accent2: "#1B3F5E", bg: "#F4F6F8" },
  meta: { madeWithAI: true, aiTool: "Claude" },
  steps: [
    {
      id: "khoi-dong",
      type: "slide",
      title: "Nghề nghiệp đang thay đổi",
      minutes: 3,
      script: "Hỏi nhanh cả lớp: Ai đã từng dùng một công cụ AI để học? Nghề của bố mẹ em có thay đổi vì công nghệ không? Dẫn vào bài: chọn nghề hôm nay là chọn cách học suốt đời.",
      body:
        "- Nhiều công việc lặp lại được máy móc và AI hỗ trợ hoặc thay thế.\n- Nhiều nghề mới xuất hiện cùng công nghệ số.\n- Điều không đổi: hiểu bản thân, hiểu nghề và **biết tự học**.\n\n**Câu hỏi của tiết học:** Em hợp với nhóm nghề nào, và cần chuẩn bị gì từ hôm nay?"
    },
    {
      id: "yeu-to",
      type: "poll2",
      title: "Điều gì quan trọng nhất khi chọn nghề?",
      minutes: 4,
      script: "Không có đáp án đúng – sai. Vòng 1 tự chọn, sau đó trao đổi với bạn vì sao chọn như vậy, rồi chọn lại ở vòng 2. Quan sát xem ý kiến cả lớp thay đổi ra sao.",
      instructions: "Chọn theo suy nghĩ của em; trao đổi rồi chọn lại.",
      question: "Theo em, điều gì quan trọng nhất khi chọn nghề?",
      options: ["Sở thích của bản thân", "Năng lực và điểm mạnh của bản thân", "Thu nhập cao", "Nhu cầu của xã hội và thị trường lao động", "Mong muốn của gia đình"],
      answer: null,
      explain: "Chọn nghề phù hợp cần cân nhắc cùng lúc: em thích gì, em làm tốt gì, xã hội cần gì và hoàn cảnh gia đình. Không nên chỉ dựa vào một yếu tố.",
      card: "Chọn nghề = **Thích** + **Giỏi** + **Xã hội cần** + phù hợp hoàn cảnh.",
      timer: [45, 40]
    },
    {
      id: "holland",
      type: "match",
      title: "Mật mã Holland",
      minutes: 5,
      script: "Nhà tâm lí học John Holland chia sở thích nghề nghiệp thành 6 nhóm. Ghép mỗi nhóm với mô tả phù hợp; sau đó tự hỏi: mình giống nhóm nào nhất?",
      instructions: "Ghép mỗi nhóm sở thích với mô tả và ví dụ nghề phù hợp.",
      question: "Ghép mỗi nhóm sở thích nghề nghiệp (mật mã Holland) với mô tả phù hợp.",
      pairs: [
        { left: "Kĩ thuật (R)", right: "Thích làm việc với máy móc, dụng cụ, vật thật – VD: thợ điện, kĩ sư cơ khí" },
        { left: "Nghiên cứu (I)", right: "Thích quan sát, tìm tòi, phân tích – VD: nhà khoa học, bác sĩ" },
        { left: "Nghệ thuật (A)", right: "Thích sáng tạo, tự do thể hiện – VD: nhà thiết kế, nhạc sĩ" },
        { left: "Xã hội (S)", right: "Thích giúp đỡ, chăm sóc, dạy dỗ người khác – VD: giáo viên, điều dưỡng" },
        { left: "Quản lí (E)", right: "Thích thuyết phục, lãnh đạo, kinh doanh – VD: doanh nhân, quản lí" },
        { left: "Nghiệp vụ (C)", right: "Thích công việc có quy trình, số liệu, sổ sách – VD: kế toán, thư kí" }
      ],
      whyPrompt: "Em thấy mình giống nhóm nào nhất? Vì sao?",
      explain: "Mỗi người thường có 2–3 nhóm sở thích nổi trội. Sở thích là một căn cứ, cần kết hợp với năng lực và nhu cầu xã hội.",
      timer: 150
    },
    {
      id: "nang-luc",
      type: "cards",
      title: "Năng lực của người lao động thời AI",
      minutes: 4,
      script: "Khi AI làm được nhiều việc lặp lại, người lao động cần những năng lực nào để không bị bỏ lại phía sau?",
      instructions: "Chọn 3 thẻ quan trọng nhất và nêu lí do.",
      question: "Chọn 3 năng lực em cho là quan trọng nhất với người lao động khi AI phổ biến.",
      cards: ["Tự học suốt đời", "Giải quyết vấn đề", "Sáng tạo", "Giao tiếp và hợp tác", "Năng lực số, dùng AI có trách nhiệm", "Tư duy phản biện", "Ngoại ngữ", "Trung thực, trách nhiệm"],
      maxPick: 3,
      textPrompt: "Vì sao em chọn như vậy? (≤ 30 từ)",
      maxWords: 30,
      conclusion: "Không có lựa chọn duy nhất đúng. Các năng lực con người như tự học, sáng tạo, hợp tác, phản biện và đạo đức nghề nghiệp càng quan trọng khi máy móc đảm nhận việc lặp lại.",
      timer: 120
    },
    {
      id: "nhom-nghe",
      type: "groupwork",
      title: "Chuyên gia nhóm nghề",
      minutes: 12,
      script: "Mỗi nhóm tìm hiểu một nhóm nghề và lập hồ sơ nghề. Có thể dùng điện thoại tra cứu thông tin tuyển sinh của các trường đại học, cao đẳng; ghi rõ nguồn.",
      instructions: "Nhận vai, tìm hiểu nhóm nghề được giao, Thư kí nộp hồ sơ A–E.",
      task: "Lập hồ sơ cho nhóm nghề được giao: công việc, yêu cầu, con đường học tập và cơ hội trong thời AI.",
      roles: ["Thư kí", "Trưởng nhóm", "Người tra cứu", "Người phỏng vấn (hỏi người thân, thầy cô)", "Người thuyết trình"],
      fields: [
        { key: "A", label: "Một nghề tiêu biểu của nhóm" },
        { key: "B", label: "Công việc chính hằng ngày" },
        { key: "C", label: "Phẩm chất, năng lực cần có" },
        { key: "D", label: "Con đường học tập (ngành, trường, thời gian)" },
        { key: "E", label: "Cơ hội và thách thức khi AI phát triển" }
      ],
      resources: [
        { for: [1], title: "Nhóm 1 – Kĩ thuật, công nghệ", body: "Gợi ý nghề: kĩ sư điện tử, kĩ thuật viên ô tô, lập trình viên, kĩ sư xây dựng.\nTra cứu: thông tin ngành của các trường đại học kĩ thuật, cao đẳng nghề." },
        { for: [2], title: "Nhóm 2 – Sức khỏe, khoa học", body: "Gợi ý nghề: bác sĩ, dược sĩ, điều dưỡng, kĩ thuật viên xét nghiệm, nhà nghiên cứu.\nTra cứu: thông tin ngành của các trường y dược, khoa học tự nhiên." },
        { for: [3], title: "Nhóm 3 – Giáo dục, xã hội", body: "Gợi ý nghề: giáo viên, chuyên viên tâm lí, công tác xã hội, hướng dẫn viên du lịch.\nTra cứu: thông tin ngành của các trường sư phạm, khoa học xã hội." },
        { for: [4], title: "Nhóm 4 – Kinh doanh, sáng tạo", body: "Gợi ý nghề: nhà thiết kế đồ họa, chuyên viên marketing, kế toán, khởi nghiệp.\nTra cứu: thông tin ngành của các trường kinh tế, mĩ thuật – thiết kế." }
      ],
      timer: 720
    },
    {
      id: "trien-lam",
      type: "expo",
      title: "Hội chợ nghề nghiệp",
      minutes: 7,
      script: "Mỗi nhóm có 75 giây “chào hàng” nhóm nghề của mình. Các nhóm khác chấm và đặt câu hỏi.",
      instructions: "Nghe nhóm bạn, chấm 3 tiêu chí, đặt câu hỏi.",
      source: "nhom-nghe",
      perGroupSec: 75,
      criteria: ["Thông tin chính xác, có nguồn", "Rõ con đường học tập", "Thuyết phục, hấp dẫn"],
      askQuestion: true
    },
    {
      id: "kiem-tra",
      type: "quiz",
      title: "Kiểm tra nhanh",
      minutes: 5,
      instructions: "4 câu, mỗi câu 20 giây.",
      timer: 20,
      questions: [
        {
          q: "Theo mật mã Holland, người thích làm việc với máy móc, dụng cụ, vật thật thuộc nhóm nào?",
          options: ["Nghệ thuật (A)", "Kĩ thuật (R)", "Xã hội (S)", "Nghiệp vụ (C)"],
          answer: 1,
          explain: "R (Realistic) – nhóm Kĩ thuật: thích hoạt động thực hành với máy móc, dụng cụ."
        },
        {
          q: "Chọn nghề phù hợp cần dựa trên những căn cứ nào?",
          options: ["Chỉ cần sở thích", "Chỉ cần thu nhập", "Sở thích, năng lực, nhu cầu xã hội và hoàn cảnh gia đình", "Chọn theo bạn thân"],
          answer: 2,
          explain: "Cần kết hợp nhiều căn cứ: bản thân thích gì, làm tốt gì, xã hội cần gì và điều kiện gia đình."
        },
        {
          q: "Người thích giúp đỡ, chăm sóc, dạy dỗ người khác thường thuộc nhóm sở thích nào?",
          options: ["Xã hội (S)", "Quản lí (E)", "Nghiên cứu (I)", "Kĩ thuật (R)"],
          answer: 0,
          explain: "S (Social) – nhóm Xã hội: giáo viên, điều dưỡng, công tác xã hội…"
        },
        {
          q: "Khi AI làm được nhiều việc lặp lại, thái độ nào giúp người lao động thích ứng tốt nhất?",
          options: ["Tránh dùng công nghệ", "Chỉ học một kĩ năng duy nhất", "Chờ được đào tạo lại", "Chủ động tự học và dùng AI có trách nhiệm"],
          answer: 3,
          explain: "Chủ động học tập suốt đời và biết dùng công nghệ có trách nhiệm giúp thích ứng với thay đổi của nghề."
        }
      ]
    },
    {
      id: "cam-ket",
      type: "text",
      title: "Một bước hành động",
      minutes: 3,
      instructions: "Viết một việc cụ thể em sẽ làm trong tuần này.",
      question: "Trong tuần này, em sẽ làm một việc cụ thể nào để tìm hiểu nghề em quan tâm?",
      placeholder: "Trong tuần này, em sẽ ",
      maxWords: 40,
      selfAssess: true,
      selfLabels: ["Chưa rõ hướng", "Đã có vài lựa chọn", "Đã rõ hướng"],
      askDoubt: true,
      timer: 120
    }
  ]
});
