# 10. Testing plan

## 1. Tổng quan dự án và Phạm vi kiểm thử

Tài liệu này xác định chiến lược, quy trình và các tiêu chí kiểm thử chất lượng cho dự án **KaiwaUP**. Đây là bản nền tảng ban đầu để định hướng kiểm thử trong giai đoạn khởi tạo dự án; các công cụ, ngưỡng chất lượng và phạm vi test có thể được cập nhật khi hệ thống trưởng thành.

Hệ thống tập trung xử lý logic phức tạp ở Backend (được xây dựng bằng FastAPI) và tương tác người dùng linh hoạt ở Frontend. Trong giai đoạn đầu, ưu tiên cao nhất là bảo vệ các luồng cốt lõi và giữ cho môi trường test đủ đơn giản để chạy ổn định.

### 1.1. Các tính năng cốt lõi (Core Features - Ưu tiên cao)
1. **Hệ thống người dùng & Xác thực:** Đăng ký, đăng nhập, quản lý thông tin, theo dõi tiến độ, xem cấp độ/thành tích.
2. **Shadowing kép:** Phát audio, ẩn/hiện văn bản, ghi âm giọng nói đuổi theo, phát lại so sánh, AI đánh giá.
3. **Dictation (Nghe chép chính tả):** Nghe hội thoại, điền từ/cụm từ, đối chiếu kết quả.
4. **Gamification:** Hệ thống Điểm kinh nghiệm (EXP), cấp độ, danh hiệu, bảng xếp hạng tuần.
5. **Phản xạ 3 giây & Lặp lại ngắt quãng (Spaced Repetition):** Trả lời tình huống trong 3 giây, ghi âm, AI đánh giá và lên lịch ôn tập.

### 1.2. Các tính năng phụ (Secondary Features - Ưu tiên thấp hơn)
1. **AI Tutor 1-1:** Luyện hội thoại trực tiếp với AI (bằng giọng nói/văn bản).
2. **Nghe và dịch:** Nghe hội thoại và dịch ý chính sang tiếng Việt hoặc chọn đáp án tương đương.

---

## 2. Tiêu chí Pass/Fail (Mức tối thiểu để bắt đầu dự án)

Một mốc phát triển chỉ được đánh giá là "Pass" ở giai đoạn khởi tạo khi đáp ứng các tiêu chí tối thiểu sau:

* **Tỷ lệ thực thi (Execution Rate):** Thực thi 100% các test case đã được xác định cho milestone hiện tại.
* **Tỷ lệ Pass (Pass Rate):** Đạt `>= 90%` tổng số test case của milestone hiện tại. Đặc biệt, **Core features phải đạt 100% Pass**.
* **Độ phủ mã nguồn (Code Coverage):** Backend core logic nên hướng tới `>= 60%` ở giai đoạn đầu; khi hệ thống ổn định hơn có thể nâng dần lên `>= 75%` cho các module nghiệp vụ chính. *(Các phần đơn giản không chứa logic nghiệp vụ như UI thuần, Getter/Setter, DTOs có thể không bắt buộc unit test ở giai đoạn đầu).* 
* **Tiêu chuẩn về Lỗi (Bug Status):**
  * **0** lỗi Blocker / Critical.
  * **0** lỗi Major mở trong các core flows.
  * **<= 3** lỗi Minor đang mở cho các tính năng phụ, nếu có thì phải có phương án thay thế (workaround) hoặc được ghi rõ là ngoài phạm vi milestone.
  * Lỗi Minor liên quan đến UI/UX, sai chính tả, padding có thể chấp nhận tạm thời nếu không cản trở luồng chính.

### 2.1. Phạm vi tối thiểu theo giai đoạn đầu

Trong giai đoạn khởi tạo, tập trung kiểm thử theo thứ tự ưu tiên sau:

1. Luồng xác thực và trạng thái người dùng.
2. Luồng học tập cốt lõi của từng module chính.
3. Tích hợp dữ liệu và tính toán nghiệp vụ ở backend.
4. Các luồng E2E happy path quan trọng nhất.
5. Các tính năng AI và phần cứng thực tế sẽ được xác nhận bằng mock hoặc kiểm thử thủ công ở mức tối thiểu.

---

## 3. Chiến lược kiểm thử (Testing Strategy)

Do đặc thù dự án tập trung logic vào Backend, chiến lược kiểm thử sẽ dồn trọng tâm vào API và Database, trong khi Frontend sẽ được ưu tiên duyệt trực quan.

### 3.1. Unit Test
* **Backend:** Sử dụng framework **pytest** kết hợp với **httpx** để kiểm thử async API trong FastAPI.
* **Phạm vi test:** Tập trung vào Core Logic và Controllers của 5 tính năng chính (Auth, Shadowing kép, Dictation, Gamification, Phản xạ 3 giây + Spaced Repetition).
* **Frontend:** Chưa ưu tiên unit test đầy đủ ở giai đoạn đầu. Mỗi thay đổi lớn trên UI cần có ít nhất một vòng visual review hoặc smoke check trên môi trường preview/staging trước khi merge Pull Request.

### 3.2. Integration Test
Đảm bảo các module nội bộ và dịch vụ bên ngoài giao tiếp chính xác.
* **Tích hợp Database (PostgreSQL):** Dựng một database test sạch và tách biệt với môi trường production để chạy integration test ở local và CI. Cách dựng DB có thể là docker compose riêng hoặc một cấu hình test độc lập, miễn là không ảnh hưởng đến Neon DB.
* **Tích hợp Dịch vụ bên thứ 3 (3rd-party Services):** Áp dụng kỹ thuật **Mocking** để giả lập phản hồi của các dịch vụ bên ngoài, giúp quá trình test diễn ra nhanh, ổn định và không tốn phí API:
  * **Cloudinary:** Mock dịch vụ lưu trữ audio/media.
  * **Gemini API & WebSpeech:** Mock xử lý AI chấm điểm, speech-to-text và text-to-speech.

### 3.3. End-to-End Test (E2E Test)
Kết hợp linh hoạt giữa kiểm thử thủ công và tự động hóa để đảm bảo chất lượng trải nghiệm người dùng cuối.
* **Automation E2E bằng Playwright:** Sử dụng **Playwright** cho các luồng happy path quan trọng và lặp lại cao: Đăng nhập, điều hướng trang, kiểm tra hiển thị trạng thái Gamification, submit form, kiểm tra chuyển trang sau hành động thành công. Nếu chưa có hạ tầng E2E đầy đủ, có thể bắt đầu bằng smoke test tối thiểu rồi mở rộng dần.
* **Manual E2E (Kiểm thử thủ công):** Áp dụng cho các tính năng phức tạp yêu cầu tương tác phần cứng thực (micro thu âm), đánh giá cảm nhận độ trễ (latency), hoặc các kịch bản edge-case đặc thù của luồng Shadowing/Phản xạ 3 giây trên môi trường preview/staging.

### 3.4. Smoke test bắt buộc cho milestone đầu tiên

Trước khi mở rộng test coverage, milestone đầu tiên cần có tối thiểu các smoke test sau:

1. Đăng ký, đăng nhập và đăng xuất.
2. Tải được dữ liệu nền tảng từ backend mà không lỗi 5xx.
3. Mở được màn hình học chính của từng module cốt lõi.
4. Gửi một request mock cho luồng AI hoặc media và nhận response hợp lệ.
5. Kiểm tra dữ liệu học tập chính có thể lưu và đọc lại được từ database test.

---

## 4. Quản lý Test Case (Docs as Code)

Toàn bộ kịch bản kiểm thử được quản lý theo phương pháp "Docs as Code", lưu trữ trực tiếp trong source code tại thư mục `docs/test-cases/` dưới định dạng Markdown (`.md`).

Trong giai đoạn đầu, không bắt buộc phải phủ đủ mọi test case ngay từ ngày đầu. Ưu tiên tạo trước các test case đại diện cho core flows, sau đó mở rộng dần theo từng module và theo từng bug đã được phát hiện.

### 4.1. Cấu trúc thư mục dự kiến
```text
docs/
└── test-cases/
    ├── auth/
    │   └── TC_AUTH_001_Login.md
    ├── shadowing/
    │   └── TC_SHADOW_001_RecordAndScore.md
    └── gamification/
        └── TC_GAME_001_CalculateEXP.md
```

### 4.2. Định dạng file Test Case tiêu chuẩn
Mỗi file `.md` sẽ bao gồm 2 phần: **Metadata** (YAML Frontmatter) và **Body** (Markdown).

Mỗi test case nên có tối thiểu các trường sau: `id`, `title`, `feature`, `priority`, `type`, `status`, `last_run`. Nếu một trường chưa áp dụng ngay từ giai đoạn đầu thì có thể để trống hoặc ghi rõ là `TBD`.

**Ví dụ mẫu (`TC_SHADOW_001_RecordAndScore.md`):**

```markdown
---
id: TC_SHADOW_001
title: Kiểm tra ghi âm và nhận điểm tính năng Shadowing kép
feature: Dual Shadowing
priority: High
type: E2E
status: Pass
last_run: 2026-08-06
---

# Mục đích
Kiểm tra luồng người dùng phát audio, thu âm giọng nói đuổi theo và nhận kết quả trả về từ AI.

## Tiền điều kiện (Pre-conditions)
- Người dùng đã đăng nhập vào hệ thống.
- Micro của thiết bị hoạt động bình thường và đã được cấp quyền.

## Các bước thực hiện (Test Steps)
1. Truy cập màn hình luyện tập "Shadowing kép".
2. Bấm nút "Phát Audio" một đoạn mẫu (ví dụ: N3_Lesson1).
3. Bấm nút "Ghi âm" và đọc theo văn bản hiển thị.
4. Bấm "Dừng ghi âm" và chọn "Gửi chấm điểm".

## Kết quả mong đợi (Expected Results)
- Hệ thống ghi âm rõ ràng, không bị ngắt quãng.
- Backend gọi mock Gemini API thành công và trả về kết quả đánh giá (phát âm, độ trôi chảy).
- Giao diện hiển thị điểm số và highlight các từ phát âm sai trong vòng 5 giây.

## Kết quả thực tế (Actual Results)
- Tính năng hoạt động đúng luồng. Audio lưu thành công lên mock Cloudinary. Nhận điểm phản hồi trong 3 giây.
- **Kết luận:** PASS.
```

### 4.3. Ma trận truy vết tối thiểu theo nhóm yêu cầu

Để tài liệu có thể dùng ngay trong giai đoạn khởi tạo, mỗi nhóm yêu cầu nên có ít nhất một test case đại diện ở mức tối thiểu:

1. **Auth / User:** đăng ký, đăng nhập, đăng xuất, xem thông tin cá nhân.
2. **Shadowing:** danh sách bài học, phát audio, ghi âm, chấm điểm mock.
3. **Dictation:** nghe, nhập đáp án, kiểm tra kết quả đúng/sai.
4. **Gamification:** cộng EXP, cập nhật cấp độ, hiển thị trạng thái tiến độ.
5. **Phản xạ 3 giây / Spaced Repetition:** gửi câu trả lời, nhận phản hồi, tạo lịch ôn tập.
6. **AI Tutor / Nghe và dịch:** chỉ cần có smoke test hoặc manual test tối thiểu ở giai đoạn đầu, sau đó mở rộng khi luồng chính đã ổn định.