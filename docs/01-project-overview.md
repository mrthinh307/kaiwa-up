# 01. Project Overview

## 1. Tên dự án

**KaiwaUp – Nền tảng luyện nghe và phản xạ giao tiếp tiếng Nhật**

---

## 2. Bối cảnh và vấn đề

Nhiều người học tiếng Nhật có thể đạt kết quả tốt trong các kỳ thi chứng chỉ nhưng vẫn gặp khó khăn khi giao tiếp thực tế. Nguyên nhân là quá trình học thường tập trung vào từ vựng, ngữ pháp và luyện đề, trong khi kỹ năng nghe hiểu và phản xạ hội thoại chưa được rèn luyện đầy đủ.

Ngoài ra, người học thường gặp các vấn đề sau:

* Không biết chính xác khả năng giao tiếp tiếng Nhật của bản thân đang ở mức nào.
* Thiếu môi trường hoặc lớp học để luyện Kaiwa thường xuyên.
* Khả năng phản xạ khi giao tiếp còn chậm dù đã có kiến thức về từ vựng và ngữ pháp.
* Chưa hiểu rõ phương pháp luyện nghe hiệu quả.
* Nhiều ứng dụng hiện tại chỉ tập trung vào một kỹ năng riêng lẻ, trong khi nghe và nói là hai kỹ năng có liên kết chặt chẽ trong giao tiếp.
* Việc học dễ trở nên nhàm chán và thiếu động lực duy trì trong thời gian dài.

---

## 3. Giải pháp

KaiwaUp là nền tảng hỗ trợ người học nâng cao kỹ năng nghe, phát âm và phản xạ giao tiếp tiếng Nhật thông qua các bài luyện tập tương tác.

Hệ thống kết hợp nhiều hình thức học như:

* Shadowing kép: nghe và đọc đuổi theo audio tiếng Nhật.
* Dictation: nghe hội thoại và điền từ hoặc cụm từ còn thiếu.
* Phản xạ trong 3 giây: phản hồi nhanh trước câu hỏi hoặc tình huống.
* Nghe và dịch: nghe nội dung tiếng Nhật và kiểm tra khả năng hiểu ý.
* AI Tutor 1-1: hỗ trợ luyện hội thoại và đưa ra phản hồi cho người học.
* Cơ chế gamification: tích điểm, tăng cấp, nhận danh hiệu và cạnh tranh trên bảng xếp hạng.

Thông qua việc kết hợp luyện nghe, luyện nói, phản xạ và gamification, KaiwaUp hướng đến việc tạo ra trải nghiệm học tiếng Nhật trực quan, thú vị và có khả năng duy trì động lực học tập lâu dài.

---

## 4. Mục tiêu dự án

### 4.1. Mục tiêu chính

Xây dựng một nền tảng giúp người học:

* Luyện nghe và phản xạ tiếng Nhật thông qua các bài tập tương tác.
* Cải thiện khả năng phát âm và nói theo ngữ điệu của audio gốc.
* Nhận biết các nội dung hoặc câu hỏi mà bản thân còn yếu.
* Duy trì động lực học tập thông qua điểm kinh nghiệm, cấp độ, danh hiệu và bảng xếp hạng.
* Có cơ hội luyện giao tiếp với sự hỗ trợ của AI.

### 4.2. Mục tiêu kỹ thuật

* Xây dựng backend bằng FastAPI.
* Tích hợp các tính năng AI phục vụ việc luyện nghe và giao tiếp.
* Xây dựng hệ thống xác thực và quản lý tiến độ học tập.
* Áp dụng cơ chế phân quyền người dùng.
* Triển khai hệ thống trên môi trường thực tế.
* Chỉ phát triển giao diện dành cho người dùng trong phạm vi dự án hiện tại.

---

## 5. Đối tượng người dùng

KaiwaUp hướng đến các nhóm người dùng sau:

### 5.1. Người học tiếng Nhật chưa biết cách luyện Kaiwa

Những người đã học từ vựng và ngữ pháp nhưng chưa biết cách luyện nghe, nói và phản xạ một cách có hệ thống.

### 5.2. Người có kiến thức tiếng Nhật nhưng kỹ năng giao tiếp còn yếu

Những người có khả năng đọc, viết hoặc làm bài thi tốt nhưng gặp khó khăn khi nghe hội thoại và phản hồi bằng tiếng Nhật.

### 5.3. Người muốn giao tiếp tiếng Nhật trôi chảy hơn

Những người muốn cải thiện tốc độ phản xạ, khả năng phát âm và sự tự tin khi giao tiếp thực tế.

---

## 6. Phạm vi dự án

### 6.1. Chức năng ưu tiên cao

Các chức năng cần được ưu tiên triển khai:

1. Hệ thống người dùng và xác thực.
2. Luyện Shadowing kép.
3. Bài tập Dictation.
4. Hệ thống gamification.
5. Bài tập phản xạ 3 giây kết hợp lặp lại ngắt quãng.

### 6.2. Chức năng ưu tiên trung bình

6. AI Tutor 1-1.
7. Bài tập nghe và dịch.

### 6.3. Ngoài phạm vi hiện tại

* Giao diện quản trị riêng.
* Hệ thống quản lý nội dung dành cho quản trị viên.
* Ứng dụng mobile native.
* Hệ thống thanh toán.

---

## 7. Các chức năng chính

### 7.1. Hệ thống người dùng và xác thực

Người dùng có thể:

* Đăng ký tài khoản.
* Đăng nhập và đăng xuất.
* Quản lý thông tin cá nhân.
* Theo dõi tiến độ học tập.
* Xem điểm kinh nghiệm, cấp độ và thành tích.

### 7.2. Shadowing kép

Người dùng có thể:

* Phát audio tiếng Nhật.
* Lựa chọn hiển thị hoặc ẩn văn bản gốc.
* Ghi âm giọng nói trong khi đọc đuổi theo audio.
* Phát lại audio gốc và bản ghi âm của bản thân để so sánh.
* Nhận phản hồi hoặc đánh giá hỗ trợ từ hệ thống AI nếu khả thi.

### 7.3. Dictation

Người dùng có thể:

* Nghe đoạn hội thoại tiếng Nhật.
* Điền từ hoặc cụm từ còn thiếu.
* Kiểm tra kết quả sau khi hoàn thành.
* Xem đáp án và nội dung đúng.

### 7.4. Gamification

Hệ thống cung cấp:

* Điểm kinh nghiệm (EXP).
* Hệ thống cấp độ.
* Danh hiệu hoặc thành tích.
* Bảng xếp hạng người dùng theo tuần.

### 7.5. Phản xạ 3 giây và lặp lại ngắt quãng

Người dùng có thể:

* Nhận một câu hỏi hoặc tình huống bằng tiếng Nhật.
* Có tối đa 3 giây để bắt đầu phản hồi.
* Ghi âm câu trả lời.
* Nhận phản hồi hoặc đánh giá từ hệ thống AI 
* Ôn tập lại các câu hỏi còn yếu theo cơ chế lặp lại ngắt quãng.

### 7.6. AI Tutor 1-1

Người dùng có thể:

* Luyện hội thoại tiếng Nhật với AI.
* Nhận câu hỏi hoặc tình huống giao tiếp.
* Trả lời bằng giọng nói hoặc văn bản.
* Nhận phản hồi về nội dung, cách diễn đạt hoặc lỗi ngôn ngữ.

### 7.7. Nghe và dịch

Người dùng có thể:

* Nghe đoạn hội thoại tiếng Nhật.
* Dịch ý chính sang tiếng Việt.
* Hoặc lựa chọn câu tiếng Việt có ý nghĩa tương đương.
* Kiểm tra đáp án và xem lời giải thích.

---

## 8. Nhóm phát triển

Dự án được phát triển bởi nhóm gồm **5 thành viên**.

Tất cả thành viên đều tham gia phát triển theo định hướng Full-stack.

---

## 9. Công nghệ dự kiến

| Thành phần | Công nghệ     |
| ---------- | ------------- |
| Frontend   | Next.js       |
| Backend    | FastAPI       |
| Database   | PosgreSQL |
| AI/ML      | Chưa xác định |
| Triển khai | Vercel / Render |

Các công nghệ còn lại sẽ được lựa chọn sau khi hoàn thành thiết kế kiến trúc và đánh giá phạm vi triển khai trong 15 ngày.

---

## 10. Yêu cầu đặc biệt

* Backend bắt buộc sử dụng FastAPI.
* Dự án phải có các tính năng tích hợp AI.
* Hệ thống phải được triển khai và có thể truy cập thực tế.
* Hệ thống phải hỗ trợ phân quyền.
* Trong phạm vi hiện tại, chỉ xây dựng giao diện dành cho người dùng.
* Thời gian phát triển dự kiến là 15 ngày.
