# 03. User Flow

## 1. Mục đích

Tài liệu này mô tả luồng tương tác giữa người dùng và hệ thống KaiwaUp.

Mục tiêu:

* Thống nhất cách người dùng sử dụng từng chức năng.
* Xác định các bước chính trong mỗi hành trình.
* Xác định các trường hợp thành công, thất bại và ngoại lệ.
* Làm cơ sở để thiết kế giao diện, API, database và module hệ thống.

---

# 2. Luồng tổng quan

```mermaid
flowchart TD
    A[Người dùng truy cập KaiwaUp] --> B{Đã đăng nhập?}

    B -- Chưa --> C[Trang chủ]
    C --> D{Người dùng chọn gì?}

    D --> E[Đăng ký]
    D --> F[Đăng nhập]

    E --> G[Tạo tài khoản]
    G --> H{Thông tin hợp lệ?}

    H -- Không --> I[Hiển thị lỗi]
    I --> E

    H -- Có --> F

    F --> J{Thông tin đăng nhập đúng?}

    J -- Không --> K[Hiển thị lỗi]
    K --> F

    J -- Có --> L[Dashboard]

    B -- Đã --> L

    L --> M{Chọn chức năng}

    M --> N[Shadowing]
    M --> O[Dictation]
    M --> P[Phản xạ 3 giây]
    M --> Q[AI Tutor]
    M --> R[Nghe và dịch]
    M --> S[Hồ sơ và thành tích]
    M --> T[Bảng xếp hạng]
```

---

# 3. Luồng đăng ký

## 3.1. Luồng chính

```mermaid
flowchart TD
    A[Guest mở trang đăng ký] --> B[Nhập tên hiển thị]
    B --> C[Nhập email]
    C --> D[Nhập mật khẩu]
    D --> E[Nhập xác nhận mật khẩu]
    E --> F[Nhấn Đăng ký]

    F --> G{Dữ liệu hợp lệ?}

    G -- Không --> H[Hiển thị lỗi]
    H --> B

    G -- Có --> I{Email đã tồn tại?}

    I -- Có --> J[Thông báo email đã được sử dụng]
    J --> C

    I -- Không --> K[Tạo tài khoản]
    K --> L[Đăng ký thành công]
    L --> M[Chuyển đến trang đăng nhập hoặc Dashboard]
```

## 3.2. Luồng ngoại lệ

* Email không đúng định dạng.
* Mật khẩu không đáp ứng yêu cầu.
* Mật khẩu xác nhận không khớp.
* Email đã được sử dụng.
* Hệ thống không thể tạo tài khoản.
* Mất kết nối mạng trong quá trình đăng ký.

---

# 4. Luồng đăng nhập

## 4.1. Luồng chính

```mermaid
flowchart TD
    A[Guest mở trang đăng nhập] --> B[Nhập email]
    B --> C[Nhập mật khẩu]
    C --> D[Nhấn Đăng nhập]

    D --> E{Thông tin hợp lệ?}

    E -- Không --> F[Hiển thị lỗi]
    F --> B

    E -- Có --> G[Xác thực tài khoản]

    G --> H{Thông tin đúng?}

    H -- Không --> I[Thông báo email hoặc mật khẩu không đúng]
    I --> B

    H -- Có --> J[Tạo phiên đăng nhập]
    J --> K[Chuyển đến Dashboard]
```

## 4.2. Luồng ngoại lệ

* Email hoặc mật khẩu để trống.
* Email không đúng định dạng.
* Email không tồn tại.
* Mật khẩu không đúng.
* Hệ thống không thể xác thực.
* Mất kết nối mạng.

---

# 5. Luồng Dashboard

Sau khi đăng nhập thành công, người dùng được chuyển đến Dashboard.

Dashboard hiển thị:

* Lời chào và thông tin người dùng.
* Cấp độ hiện tại.
* Tổng EXP.
* Tiến độ học tập.
* Các bài học hoặc bài luyện được đề xuất.
* Các bài cần ôn lại.
* Thành tích gần đây.
* Vị trí hiện tại trên bảng xếp hạng nếu có.

```mermaid
flowchart TD
    A[Đăng nhập thành công] --> B[Dashboard]

    B --> C[Xem tiến độ]
    B --> D[Chọn bài học]
    B --> E[Xem bài cần ôn]
    B --> F[Xem bảng xếp hạng]
    B --> G[Xem hồ sơ]
```

---

# 6. Luồng luyện Shadowing kép

## 6.1. Luồng chính

```mermaid
flowchart TD
    A[User mở danh sách bài Shadowing] --> B[Chọn bài học]

    B --> C[Hiển thị thông tin bài học]
    C --> D[Chọn hiển thị hoặc ẩn văn bản]

    D --> E[Nhấn phát audio gốc]
    E --> F[Nghe và đọc đuổi theo audio]

    F --> G[Nhấn bắt đầu ghi âm]
    G --> H{Đã cấp quyền microphone?}

    H -- Không --> I[Thông báo cần cấp quyền microphone]
    I --> J[Người dùng cấp quyền]
    J --> G

    H -- Có --> K[Ghi âm giọng nói]

    K --> L[Nhấn kết thúc ghi âm]
    L --> M[Lưu bản ghi âm]

    M --> N[Phát lại audio gốc]
    N --> O[Phát lại bản ghi âm]

    O --> P{Có đánh giá AI?}

    P -- Có --> Q[AI phân tích bản ghi]
    Q --> R[Hiển thị nhận xét]

    P -- Không --> S[Người dùng tự so sánh]

    R --> T[Hoàn thành bài]
    S --> T

    T --> U[Lưu kết quả]
    U --> V[Cộng EXP]
    V --> W[Cập nhật tiến độ]
```

## 6.2. Luồng lỗi

* Audio không tải được.
* Người dùng không cấp quyền microphone.
* Trình duyệt không hỗ trợ ghi âm.
* Ghi âm bị lỗi hoặc bị gián đoạn.
* Không thể lưu bản ghi âm.
* Dịch vụ AI không phản hồi.

Nếu AI gặp lỗi, hệ thống vẫn cho phép người dùng nghe lại audio gốc và bản ghi âm để tự so sánh.

---

# 7. Luồng luyện Dictation

## 7.1. Luồng chính

```mermaid
flowchart TD
    A[User mở danh sách bài Dictation] --> B[Chọn bài học]

    B --> C[Hiển thị đoạn hội thoại có chỗ trống]

    C --> D[Phát audio]
    D --> E[Người dùng nghe]

    E --> F{Muốn nghe lại?}

    F -- Có --> D
    F -- Không --> G[Nhập từ hoặc cụm từ còn thiếu]

    G --> H[Nhấn Nộp bài]

    H --> I[Hệ thống kiểm tra đáp án]

    I --> J[Hiển thị kết quả]
    J --> K[Hiển thị đáp án đúng]
    K --> L[Hiển thị số câu đúng]

    L --> M[Lưu kết quả]
    M --> N[Cộng EXP]
    N --> O[Cập nhật tiến độ]
```

## 7.2. Luồng lỗi

* Audio không tải được.
* Người dùng chưa điền đủ câu trả lời.
* Không thể nộp bài.
* Hệ thống không thể kiểm tra kết quả.

---

# 8. Luồng phản xạ 3 giây

## 8.1. Luồng chính

```mermaid
flowchart TD
    A[User chọn bài phản xạ] --> B[Hiển thị câu hỏi hoặc tình huống]

    B --> C[Phát câu hỏi hoặc hiển thị tình huống]
    C --> D[Bắt đầu đếm 3 giây]

    D --> E{Người dùng bắt đầu phản hồi trong 3 giây?}

    E -- Có --> F[Bắt đầu ghi âm]
    F --> G[Người dùng trả lời]
    G --> H[Kết thúc ghi âm]

    E -- Không --> I[Đánh dấu phản hồi chậm]
    I --> J[Cho phép thử lại hoặc tiếp tục]

    H --> K[Gửi câu trả lời để đánh giá]

    K --> L{AI đánh giá thành công?}

    L -- Có --> M[Hiển thị nhận xét]
    L -- Không --> N[Thông báo chưa thể đánh giá]

    M --> O[Lưu kết quả]
    N --> O

    O --> P[Cập nhật dữ liệu ôn tập]
    P --> Q[Cộng EXP nếu đủ điều kiện]
```

## 8.2. Quy tắc thời gian

Trong phiên bản hiện tại:

* Người dùng có **3 giây để bắt đầu phản hồi**.
* Thời gian trả lời sau khi đã bắt đầu ghi âm không bị giới hạn cứng, trừ khi có quy định riêng cho từng bài.
* Nếu người dùng không bắt đầu phản hồi trong 3 giây, hệ thống đánh dấu lượt đó là phản hồi chậm.
* Người dùng có thể được phép thử lại tùy theo thiết kế bài học.

---

# 9. Luồng lặp lại ngắt quãng

```mermaid
flowchart TD
    A[Người dùng hoàn thành bài phản xạ] --> B[Lưu kết quả]

    B --> C[Đánh giá mức độ thực hiện]

    C --> D{Kết quả tốt?}

    D -- Có --> E[Giảm mức độ ưu tiên ôn lại]
    D -- Không --> F[Tăng mức độ ưu tiên ôn lại]

    E --> G[Cập nhật lịch ôn]
    F --> G

    G --> H[Hiển thị bài cần ôn trên Dashboard]

    H --> I[Người dùng mở danh sách ôn tập]
    I --> J[Thực hiện lại bài]

    J --> B
```

Trong phiên bản đầu:

* Các câu hỏi có kết quả thấp hoặc phản hồi chậm được ưu tiên đưa vào danh sách ôn tập.
* Thuật toán tính khoảng thời gian ôn sẽ được xác định sau.
* Hệ thống cần lưu kết quả để tạo danh sách ôn tập cá nhân.

---

# 10. Luồng AI Tutor 1-1

## 10.1. Luồng chính

```mermaid
flowchart TD
    A[User mở AI Tutor] --> B[Chọn chủ đề]

    B --> C[Chọn mức độ khó]
    C --> D[Nhấn bắt đầu]

    D --> E[Hệ thống tạo phiên hội thoại]
    E --> F[AI gửi câu mở đầu]

    F --> G{Cách trả lời}

    G --> H[Nhập văn bản]
    G --> I[Ghi âm giọng nói]

    H --> J[Gửi câu trả lời]
    I --> K[Chuyển giọng nói thành văn bản]
    K --> J

    J --> L[AI phân tích ngữ cảnh]
    L --> M[AI phản hồi]

    M --> N[Hiển thị câu trả lời và nhận xét]

    N --> O{Tiếp tục hội thoại?}

    O -- Có --> G
    O -- Không --> P[Kết thúc phiên]

    P --> Q[Lưu lịch sử hội thoại]
```

## 10.2. Luồng lỗi

* Không thể tạo phiên hội thoại.
* AI không phản hồi.
* Không thể chuyển giọng nói thành văn bản.
* Nội dung gửi lên không hợp lệ.
* Kết nối bị gián đoạn.

Nếu AI gặp lỗi, hệ thống phải hiển thị thông báo và cho phép người dùng thử lại.

---

# 11. Luồng luyện nghe và dịch

## 11.1. Luồng chính

```mermaid
flowchart TD
    A[User mở bài nghe và dịch] --> B[Chọn bài học]

    B --> C[Phát audio tiếng Nhật]
    C --> D[Người dùng nghe]

    D --> E{Muốn nghe lại?}

    E -- Có --> C
    E -- Không --> F{Loại bài tập}

    F -- Nhập bản dịch --> G[Nhập ý chính bằng tiếng Việt]
    F -- Chọn đáp án --> H[Chọn câu có nghĩa tương đương]

    G --> I[Nộp câu trả lời]
    H --> I

    I --> J[Hệ thống kiểm tra]

    J --> K[Hiển thị đáp án hoặc nội dung tham khảo]
    K --> L[Hiển thị giải thích]

    L --> M[Lưu kết quả]
    M --> N[Cộng EXP]
    N --> O[Cập nhật tiến độ]
```

---

# 12. Luồng nhận EXP và tăng cấp

Cấp được tính từ tổng EXP, không tra bảng mốc: từ level `L` lên `L+1` cần thêm `50 × L` EXP.
Việc ghi sổ EXP, cộng `user_progress.total_exp` và tính lại `current_level` nằm trong cùng
transaction; hệ thống khóa tiến độ của user để hai attempt hoàn thành đồng thời không làm mất EXP.

```mermaid
flowchart TD
    A[User hoàn thành bài tập] --> B[Hệ thống kiểm tra điều kiện hoàn thành]

    B --> C{Đủ điều kiện nhận EXP?}

    C -- Không --> D[Lưu kết quả]

    C -- Có --> E[Tính EXP nhận được]
    E --> F[Cộng EXP]

    F --> G{Đủ EXP để tăng cấp?}

    G -- Không --> H[Cập nhật tổng EXP]

    G -- Có --> I[Tăng cấp]
    I --> J[Hiển thị thông báo lên cấp]

    H --> K[Cập nhật tiến độ]
    J --> K

    K --> L[Cập nhật bảng xếp hạng]
```

---

# 13. Luồng nhận thành tích

```mermaid
flowchart TD
    A[User hoàn thành hành động] --> B[Kiểm tra điều kiện thành tích]

    B --> C{Đã đạt điều kiện?}

    C -- Không --> D[Kết thúc]

    C -- Có --> E{Đã nhận thành tích trước đó?}

    E -- Có --> D

    E -- Không --> F[Cấp thành tích]
    F --> G[Hiển thị thông báo]
    G --> H[Lưu thành tích]
```

---

# 14. Luồng xem bảng xếp hạng

```mermaid
flowchart TD
    A[User mở bảng xếp hạng] --> B[Hệ thống lấy dữ liệu EXP tuần]

    B --> C[Sắp xếp người dùng theo EXP]

    C --> D[Hiển thị danh sách xếp hạng]

    D --> E[Hiển thị thứ hạng của người dùng hiện tại]

    E --> F[Người dùng xem bảng xếp hạng]
```

Thông tin hiển thị:

* Thứ hạng.
* Tên hiển thị.
* Ảnh đại diện nếu có.
* EXP đạt được trong tuần.
* Vị trí của người dùng hiện tại.

---

# 15. Luồng xem và cập nhật hồ sơ

```mermaid
flowchart TD
    A[User mở trang hồ sơ] --> B[Hệ thống tải thông tin cá nhân]

    B --> C[Hiển thị thông tin tài khoản]
    C --> D[Hiển thị cấp độ và EXP]
    D --> E[Hiển thị thành tích]
    E --> F[Hiển thị tiến độ]

    F --> G{Muốn chỉnh sửa?}

    G -- Không --> H[Kết thúc]

    G -- Có --> I[Chỉnh sửa thông tin]
    I --> J[Nhấn Lưu]

    J --> K{Thông tin hợp lệ?}

    K -- Không --> L[Hiển thị lỗi]
    L --> I

    K -- Có --> M[Cập nhật thông tin]
    M --> N[Hiển thị thông báo thành công]
```

---

# 16. Các điểm cần thống nhất trước khi triển khai

Các nội dung sau cần được chốt trong giai đoạn thiết kế kiến trúc và database:

1. Audio bài học được lưu ở đâu.
2. Bản ghi âm của người dùng có cần lưu lâu dài hay chỉ xử lý tạm thời.
3. AI đánh giá Shadowing bằng cách nào.
4. AI đánh giá phản xạ dựa trên tiêu chí nào.
5. AI Tutor có hỗ trợ giọng nói ngay trong MVP hay chỉ hỗ trợ văn bản.
6. Thuật toán lặp lại ngắt quãng được sử dụng.
7. Quy tắc EXP thưởng thêm ngoài `base_exp`, nếu có.
8. Điều kiện hoàn thành từng loại bài tập.
9. Cách quản lý và thêm mới nội dung bài học khi chưa có giao diện quản trị.
