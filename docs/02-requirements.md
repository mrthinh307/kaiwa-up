# 02. Requirements

## 1. Mục đích

Tài liệu này mô tả các yêu cầu chức năng và phi chức năng của hệ thống **KaiwaUp**.

Mục tiêu của tài liệu là:

* Thống nhất phạm vi phát triển giữa các thành viên.
* Xác định rõ các chức năng mà hệ thống cần cung cấp.
* Làm cơ sở cho việc thiết kế User Flow, kiến trúc hệ thống, cơ sở dữ liệu và API.
* Hạn chế việc hiểu sai yêu cầu và thay đổi lớn trong quá trình triển khai.

---

# 2. Phạm vi hệ thống

KaiwaUp là nền tảng hỗ trợ người học cải thiện kỹ năng nghe, phát âm và phản xạ giao tiếp tiếng Nhật thông qua các bài tập tương tác.

Trong phạm vi dự án hiện tại, hệ thống tập trung vào giao diện và trải nghiệm dành cho người học.

Hệ thống bao gồm các nhóm chức năng chính:

1. Quản lý người dùng và xác thực.
2. Luyện Shadowing kép.
3. Luyện Dictation.
4. Hệ thống gamification.
5. Luyện phản xạ 3 giây kết hợp lặp lại ngắt quãng.
6. AI Tutor 1-1.
7. Luyện nghe và dịch.

---

# 3. Vai trò người dùng

## 3.1. Guest

Guest là người chưa đăng nhập vào hệ thống.

Guest có thể:

* Xem trang giới thiệu.
* Xem thông tin tổng quan về các phương pháp học.
* Đăng ký tài khoản.
* Đăng nhập.

Guest không thể:

* Thực hiện bài tập.
* Lưu tiến độ học tập.
* Nhận EXP.
* Xem thông tin cá nhân.
* Xem thành tích cá nhân.

---

## 3.2. User

User là người đã đăng ký và đăng nhập vào hệ thống.

User có thể:

* Quản lý thông tin cá nhân.
* Thực hiện các bài tập.
* Ghi âm câu trả lời.
* Xem kết quả và lịch sử học tập.
* Nhận EXP và tăng cấp.
* Nhận danh hiệu hoặc thành tích.
* Xem bảng xếp hạng.
* Luyện hội thoại với AI Tutor.

---

## 3.3. Phân quyền

Trong phạm vi giao diện hiện tại, hệ thống chỉ xây dựng giao diện dành cho người dùng.

Hệ thống vẫn cần phân biệt tối thiểu các trạng thái:

| Trạng thái | Quyền                                                    |
| ---------- | -------------------------------------------------------- |
| Guest      | Xem nội dung công khai, đăng ký và đăng nhập             |
| User       | Sử dụng các chức năng học tập và quản lý dữ liệu cá nhân |

Hệ thống có thể lưu vai trò quản trị nội bộ để phục vụ quản lý dữ liệu trong tương lai, nhưng không phát triển giao diện quản trị trong phạm vi dự án hiện tại.

---

# 4. Yêu cầu chức năng

## 4.1. Nhóm chức năng xác thực và quản lý người dùng

### FR-AUTH-01 — Đăng ký tài khoản

**Mô tả:**
Người dùng có thể tạo tài khoản mới để sử dụng các chức năng của KaiwaUp.

**Dữ liệu đầu vào:**

* Tên hiển thị.
* Email.
* Mật khẩu.
* Xác nhận mật khẩu.

**Điều kiện:**

* Email phải đúng định dạng.
* Email chưa được sử dụng.
* Mật khẩu phải đáp ứng quy tắc bảo mật do hệ thống quy định.
* Mật khẩu xác nhận phải trùng với mật khẩu.

**Kết quả thành công:**

* Tài khoản mới được tạo.
* Người dùng được chuyển đến trang đăng nhập hoặc được đăng nhập tự động.

**Trường hợp lỗi:**

* Email không hợp lệ.
* Email đã tồn tại.
* Mật khẩu không đáp ứng yêu cầu.
* Mật khẩu xác nhận không khớp.

---

### FR-AUTH-02 — Đăng nhập

**Mô tả:**
Người dùng có thể đăng nhập bằng email và mật khẩu.

**Dữ liệu đầu vào:**

* Email.
* Mật khẩu.

**Kết quả thành công:**

* Hệ thống xác thực người dùng.
* Hệ thống tạo phiên đăng nhập hoặc token xác thực.
* Người dùng được chuyển đến trang chính hoặc trang học tập.

**Trường hợp lỗi:**

* Email không tồn tại.
* Mật khẩu không đúng.
* Tài khoản không thể đăng nhập.

---

### FR-AUTH-03 — Đăng xuất

**Mô tả:**
Người dùng có thể kết thúc phiên đăng nhập.

**Kết quả:**

* Thông tin xác thực phía người dùng được xóa hoặc vô hiệu hóa.
* Người dùng được chuyển về trang đăng nhập hoặc trang chủ.

---

### FR-USER-01 — Xem thông tin cá nhân

**Mô tả:**
Người dùng có thể xem thông tin tài khoản và tiến độ học tập.

**Thông tin hiển thị:**

* Tên hiển thị.
* Email.
* Ảnh đại diện nếu có.
* Cấp độ hiện tại.
* Tổng EXP.
* Danh hiệu hoặc thành tích.
* Tiến độ học tập.

---

### FR-USER-02 — Cập nhật thông tin cá nhân

**Mô tả:**
Người dùng có thể cập nhật một số thông tin cá nhân.

**Thông tin có thể cập nhật:**

* Tên hiển thị.
* Ảnh đại diện nếu có.
* Các thông tin hồ sơ khác được xác định trong quá trình thiết kế.

---

## 4.2. Nhóm chức năng Shadowing kép

### FR-SHADOW-01 — Xem danh sách bài Shadowing (*)

**Mô tả:**
Người dùng có thể xem danh sách các bài luyện Shadowing.

**Thông tin hiển thị:**

* Tên bài học.
* Mô tả ngắn.
* Cấp độ hoặc độ khó.
* Thời lượng audio.
* Trạng thái hoàn thành.

---

### FR-SHADOW-02 — Phát audio gốc

**Mô tả:**
Người dùng có thể phát audio tiếng Nhật của bài học.

**Hệ thống phải hỗ trợ:**

* Phát audio.
* Tạm dừng audio.
* Phát lại audio.
* Hiển thị thời gian phát.
* Điều chỉnh âm lượng.

---

### FR-SHADOW-03 — Hiển thị hoặc ẩn văn bản

**Mô tả:**
Người dùng có thể lựa chọn hiển thị hoặc ẩn nội dung văn bản tương ứng với audio.

**Quy tắc:**

* Người dùng có thể thay đổi trạng thái hiển thị trong quá trình luyện tập.
* Khi chọn ẩn văn bản, nội dung tiếng Nhật không được hiển thị.

---

### FR-SHADOW-04 — Ghi âm bài đọc

**Mô tả:**
Người dùng có thể sử dụng microphone để ghi âm giọng nói trong quá trình đọc đuổi theo audio gốc.

**Hệ thống phải:**

* Yêu cầu quyền truy cập microphone.
* Cho phép bắt đầu ghi âm.
* Cho phép kết thúc ghi âm.
* Hiển thị trạng thái đang ghi âm.
* Thông báo khi người dùng từ chối quyền truy cập microphone.

---

### FR-SHADOW-05 — Phát lại và so sánh

**Mô tả:**
Người dùng có thể phát lại audio gốc và bản ghi âm của bản thân để tự so sánh.

**Hệ thống phải hỗ trợ:**

* Phát lại audio gốc.
* Phát lại bản ghi âm của người dùng.
* Cho phép người dùng nghe lại nhiều lần (loop mode hoặc bấm nghe lại)
* Hiển thị thông tin hoặc thời lượng của từng audio nếu khả thi.

---

### FR-SHADOW-06 — Đánh giá bằng AI

**Mô tả:**
Hệ thống có thể sử dụng AI để phân tích bản ghi âm của người dùng và đưa ra phản hồi hỗ trợ.

**Phản hồi dự kiến:**

* Mức độ tương đồng với nội dung gốc.
* Các từ hoặc đoạn có thể phát âm chưa chính xác.
* Nhận xét tổng quan.
* Gợi ý cải thiện.

**Ghi chú:**
Chức năng đánh giá tự động bằng AI phụ thuộc vào công nghệ được lựa chọn và sẽ được xác định rõ trong tài liệu kiến trúc. Nếu không thể triển khai trong thời gian dự án, chức năng phát lại và tự so sánh vẫn phải hoạt động.

---

## 4.3. Nhóm chức năng Dictation

### FR-DICT-01 — Xem danh sách bài Dictation

Người dùng có thể xem danh sách các bài luyện Dictation.

Thông tin hiển thị:

* Tên bài.
* Cấp độ (1 từ, nhiều từ, cả câu)
* Chủ đề.
* Trạng thái hoàn thành.

---

### FR-DICT-02 — Nghe đoạn hội thoại

Người dùng có thể nghe audio tiếng Nhật của bài tập.

Hệ thống phải hỗ trợ:

* Phát audio.
* Tạm dừng audio.
* Phát lại audio.
* Nghe lại nhiều lần.

---

### FR-DICT-03 — Điền từ hoặc cụm từ còn thiếu

**Mô tả:**
Người dùng nghe audio và nhập từ hoặc cụm từ còn thiếu vào các vị trí được đánh dấu.

**Hệ thống phải:**

* Hiển thị câu hoặc đoạn hội thoại có chỗ trống.
* Cho phép nhập câu trả lời.
* Cho phép chỉnh sửa trước khi nộp bài.

---

### FR-DICT-04 — Kiểm tra kết quả

Sau khi người dùng nộp bài, hệ thống phải:

* So sánh câu trả lời với đáp án.
* Hiển thị kết quả đúng hoặc sai.
* Hiển thị đáp án chính xác.
* Hiển thị số lượng câu trả lời đúng.
* Lưu kết quả học tập.

---

## 4.4. Nhóm chức năng Gamification

### FR-GAME-01 — Nhận EXP

**Mô tả:**
Người dùng nhận điểm kinh nghiệm sau khi hoàn thành bài tập.

**Quy tắc dự kiến:**

* Mỗi loại bài tập có số EXP cơ bản.
* Người dùng chỉ nhận EXP sau khi hoàn thành bài.
* Có thể cộng thêm EXP dựa trên kết quả hoặc hiệu suất.
* Hệ thống phải lưu lịch sử thay đổi EXP.

Mỗi nội dung có `base_exp > 0`. Khi một attempt chuyển sang `COMPLETED`, backend ghi đúng một bút
toán EXP cho attempt đó và cập nhật tổng EXP trong cùng transaction.

---

### FR-GAME-02 — Hệ thống cấp độ

**Mô tả:**
Cấp độ của người dùng được xác định dựa trên tổng EXP.

**Hệ thống phải:**

* Hiển thị cấp độ hiện tại.
* Hiển thị tổng EXP.
* Hiển thị EXP cần thiết để đạt cấp độ tiếp theo.
* Tự động tăng cấp khi người dùng đạt đủ EXP.

Không có level tối đa được định nghĩa trước. Từ level `L` lên `L+1` cần thêm `50 × L` EXP; tổng
EXP tối thiểu để đạt level `L` là `25 × L × (L-1)`.

---

### FR-GAME-03 — Danh hiệu và thành tích

**Mô tả:**
Người dùng có thể nhận danh hiệu hoặc thành tích khi đạt các điều kiện nhất định.

Ví dụ:

* Hoàn thành bài học đầu tiên.
* Hoàn thành nhiều bài liên tiếp.
* Đạt một mốc EXP.
* Đạt thành tích cao trong một bài tập.

Hệ thống phải:

* Kiểm tra điều kiện mở khóa.
* Cấp thành tích cho người dùng.
* Hiển thị các thành tích đã nhận.
* Hiển thị điều kiện mở khóa nếu phù hợp.

---

### FR-GAME-04 — Bảng xếp hạng theo tuần

**Mô tả:**
Hệ thống hiển thị bảng xếp hạng người dùng dựa trên EXP nhận được trong tuần.

**Hệ thống phải:**

* Xếp hạng người dùng theo EXP tuần.
* Hiển thị thứ hạng.
* Hiển thị tên hoặc tên hiển thị của người dùng.
* Hiển thị EXP đạt được trong tuần.
* Hiển thị vị trí của người dùng hiện tại.
* Làm mới dữ liệu xếp hạng theo chu kỳ tuần.

Nếu bằng EXP tuần, hệ thống sắp theo `user_id ASC` trước khi gán `rank` để kết quả xác định và có thể
tái tạo từ cùng một tập dữ liệu.

---

## 4.5. Nhóm chức năng phản xạ 3 giây

### FR-REFLEX-01 — Hiển thị câu hỏi hoặc tình huống

Hệ thống hiển thị:

* Một câu hỏi bằng tiếng Nhật.
* Hoặc một tình huống giao tiếp.
* Nội dung hỗ trợ nếu được thiết kế.

---

### FR-REFLEX-02 — Giới hạn thời gian phản hồi

**Mô tả:**
Người dùng có tối đa 3 giây để bắt đầu phản hồi sau khi câu hỏi hoặc tình huống được đưa ra.

**Hệ thống phải:**

* Hiển thị bộ đếm thời gian.
* Bắt đầu đếm khi câu hỏi hoặc audio kết thúc.
* Thông báo khi hết thời gian.
* Lưu trạng thái phản hồi đúng thời gian hoặc quá thời gian.

**Ghi chú:**
Cần thống nhất rõ “3 giây để bắt đầu nói” hay “3 giây để hoàn thành câu trả lời” trước khi triển khai. Trong phiên bản hiện tại, hệ thống ưu tiên cách hiểu **3 giây để bắt đầu phản hồi**.

---

### FR-REFLEX-03 — Ghi âm phản hồi

Người dùng có thể ghi âm câu trả lời bằng microphone.

Hệ thống phải:

* Hiển thị trạng thái ghi âm.
* Cho phép kết thúc ghi âm.
* Lưu bản ghi âm hoặc dữ liệu cần thiết để đánh giá.
* Cho phép phát lại câu trả lời nếu phù hợp.

---

### FR-REFLEX-04 — Đánh giá phản hồi bằng AI

Hệ thống có thể sử dụng AI để đánh giá:

* Mức độ phù hợp với câu hỏi hoặc tình huống.
* Tính tự nhiên của câu trả lời.
* Lỗi từ vựng hoặc ngữ pháp.
* Gợi ý cách diễn đạt tốt hơn.

Cách đánh giá cụ thể phụ thuộc vào mô hình AI được lựa chọn.

---

### FR-REFLEX-05 — Lặp lại ngắt quãng

Hệ thống lưu kết quả của các câu hỏi phản xạ và ưu tiên đưa lại những câu hỏi mà người dùng thực hiện chưa tốt.

Hệ thống phải:

* Lưu kết quả của từng lần luyện.
* Xác định các câu hỏi cần ôn lại.
* Tạo danh sách ôn tập.
* Hiển thị các bài cần ôn cho người dùng.

Thuật toán và khoảng thời gian ôn tập sẽ được xác định trong giai đoạn thiết kế.

---

## 4.6. Nhóm chức năng AI Tutor 1-1

### FR-TUTOR-01 — Tạo phiên hội thoại

Người dùng có thể bắt đầu một phiên luyện hội thoại với AI.

Người dùng có thể chọn:

* Chủ đề hội thoại.
* Mức độ khó.
* Tình huống giao tiếp nếu có.

---

### FR-TUTOR-02 — Gửi câu trả lời

Người dùng có thể gửi câu trả lời cho AI bằng:

* Văn bản.
* Giọng nói nếu chức năng xử lý giọng nói được triển khai.

---

### FR-TUTOR-03 — AI phản hồi

AI Tutor có thể:

* Đặt câu hỏi tiếp theo.
* Phản hồi theo ngữ cảnh hội thoại.
* Sửa lỗi ngữ pháp hoặc cách dùng từ.
* Gợi ý cách diễn đạt tự nhiên hơn.
* Khuyến khích người dùng tiếp tục hội thoại.

---

### FR-TUTOR-04 — Lưu lịch sử hội thoại

Hệ thống có thể lưu:

* Nội dung cuộc hội thoại.
* Chủ đề.
* Thời gian tạo.
* Các phản hồi hoặc nhận xét của AI.

Người dùng có thể xem lại lịch sử hội thoại nếu chức năng này được triển khai trong phạm vi dự án.

---

## 4.7. Nhóm chức năng nghe và dịch

### FR-TRANS-01 — Nghe hội thoại

Người dùng có thể nghe một đoạn hội thoại tiếng Nhật.

Hệ thống hỗ trợ:

* Phát audio.
* Tạm dừng.
* Phát lại.
* Nghe lại nhiều lần.

---

### FR-TRANS-02 — Trả lời bằng bản dịch

Người dùng bắt buộc nhập bản dịch hoặc ý chính bằng tiếng Việt dạng free-text.

Hệ thống không cung cấp quiz hoặc lựa chọn trắc nghiệm thay cho việc nhập bản dịch.

---

### FR-TRANS-03 — Kiểm tra kết quả

Sau khi nộp bài, hệ thống phải:

* Dùng AI đánh giá mức độ truyền tải đúng ý, không yêu cầu khớp từng từ.
* Hiển thị điểm, ý đúng, ý thiếu và gợi ý cải thiện.
* Hiển thị bản dịch tham khảo.
* Lưu kết quả học tập.

---

# 5. Yêu cầu phi chức năng

## 5.1. Hiệu năng

* Các trang thông thường cần phản hồi nhanh trong điều kiện mạng ổn định.
* Các thao tác không sử dụng AI nên có thời gian phản hồi mục tiêu dưới 2 giây.
* Các thao tác sử dụng AI có thể mất nhiều thời gian hơn và phải hiển thị trạng thái đang xử lý.
* Hệ thống không được khiến người dùng hiểu nhầm rằng yêu cầu AI đã thất bại khi đang xử lý.

---

## 5.2. Khả năng sử dụng

* Giao diện phải dễ hiểu đối với người học tiếng Nhật.
* Các thao tác bắt đầu bài học, phát audio và ghi âm phải rõ ràng.
* Người dùng phải biết trạng thái hiện tại của bài tập.
* Hệ thống phải hiển thị thông báo rõ ràng khi xảy ra lỗi.
* Giao diện cần hoạt động tốt trên màn hình desktop và thiết bị di động.

---

## 5.3. Bảo mật

* Mật khẩu không được lưu dưới dạng văn bản thuần.
* Thông tin xác thực phải được bảo vệ.
* Người dùng chỉ được truy cập dữ liệu thuộc về tài khoản của mình.
* API cần kiểm tra quyền truy cập trước khi trả về hoặc thay đổi dữ liệu.
* Các thông tin bí mật như khóa API không được đưa trực tiếp vào mã nguồn frontend.
* Các biến môi trường nhạy cảm không được commit lên repository.

---

## 5.4. Quyền riêng tư

* Hệ thống chỉ sử dụng microphone khi người dùng cho phép.
* Hệ thống phải thông báo rõ khi đang ghi âm.
* Bản ghi âm và dữ liệu học tập chỉ được sử dụng cho mục đích cung cấp chức năng của hệ thống.
* Người dùng không được phép truy cập bản ghi âm hoặc dữ liệu cá nhân của người dùng khác.

---

## 5.5. Khả năng tương thích

* Frontend được phát triển bằng Next.js.
* Hệ thống cần hỗ trợ các trình duyệt hiện đại.
* Các chức năng ghi âm phải được kiểm tra trên các trình duyệt mục tiêu.
* Giao diện cần có khả năng hiển thị tốt trên desktop và thiết bị di động.

---

## 5.6. Khả năng bảo trì

* Backend được phát triển bằng FastAPI.
* Mã nguồn cần được tổ chức theo module.
* Các chức năng cần được tách thành các thành phần có trách nhiệm rõ ràng.
* Các quy tắc coding sẽ được mô tả trong `08-coding-convention.md`.
* API cần được mô tả trong `06-api-contract.md`.

---

## 5.7. Khả năng triển khai

* Hệ thống phải có thể triển khai trên môi trường thực tế.
* Cấu hình môi trường phải được tách khỏi mã nguồn.
* Hệ thống cần có tài liệu hướng dẫn cài đặt và triển khai.
* Quy trình triển khai chi tiết sẽ được mô tả trong `11-deployment.md`.

---

# 6. Mức độ ưu tiên

Do thời gian phát triển dự kiến là 15 ngày, các chức năng được phân loại theo mức độ ưu tiên.

| Mức độ              | Chức năng                                                         |
| ------------------- | ----------------------------------------------------------------- |
| **P0 — Bắt buộc**   | Đăng ký, đăng nhập, quản lý người dùng cơ bản                     |
| **P0 — Bắt buộc**   | Shadowing cơ bản: phát audio, ẩn/hiện văn bản, ghi âm và phát lại |
| **P0 — Bắt buộc**   | Dictation: nghe, điền từ và kiểm tra đáp án                       |
| **P0 — Bắt buộc**   | EXP, cấp độ và bảng xếp hạng tuần                                 |
| **P1 — Quan trọng** | Phản xạ 3 giây                                                    |
| **P1 — Quan trọng** | Lặp lại ngắt quãng ở mức cơ bản                                   |
| **P1 — Quan trọng** | AI đánh giá câu trả lời hoặc bản ghi âm                           |
| **P2 — Mở rộng**    | AI Tutor 1-1                                                      |
| **P2 — Mở rộng**    | Nghe và dịch                                                      |
| **P2 — Mở rộng**    | Đánh giá Shadowing nâng cao theo thời gian thực                   |

---

# 7. Tiêu chí hoàn thành tối thiểu

Phiên bản MVP được xem là hoàn thành khi:

* Người dùng có thể đăng ký, đăng nhập và đăng xuất.
* Người dùng có thể truy cập các bài học sau khi đăng nhập.
* Người dùng có thể thực hiện bài Shadowing cơ bản.
* Người dùng có thể thực hiện bài Dictation và xem kết quả.
* Hệ thống lưu được tiến độ hoặc kết quả học tập cơ bản.
* Người dùng nhận được EXP sau khi hoàn thành bài tập.
* Hệ thống hiển thị cấp độ và bảng xếp hạng.
* Ít nhất một tính năng AI hoạt động trong hệ thống.
* Hệ thống được triển khai và có thể truy cập thực tế.
* Người dùng không thể truy cập hoặc thay đổi dữ liệu riêng của người dùng khác.

---

# 8. Các nội dung cần chốt trong giai đoạn thiết kế

Các nội dung sau chưa được quyết định và sẽ được xác định trong các tài liệu tiếp theo:

* Dịch vụ hoặc mô hình AI.
* Cách chuyển giọng nói thành văn bản.
* Cách đánh giá phát âm và nội dung câu trả lời.
* Thuật toán lặp lại ngắt quãng.
* Cách quản lý nội dung bài học khi chưa có giao diện quản trị.
