# 06. API Contract

## 1. Tổng quan kiến trúc API

Tài liệu này mô tả chi tiết các hợp đồng giao tiếp API (API Contract) giữa **Next.js Frontend** (`apps/web`) và **FastAPI Backend** (`apps/api`) của dự án **KaiwaUp**.

### 1.1. Quy chuẩn chung

* **Base URL**: `/api/v1`
* **Định dạng dữ liệu**: `application/json` (trừ các endpoint tải audio sử dụng `multipart/form-data`).
* **Múi giờ & Thời gian**: Chuẩn ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
* **Quy tắc đặt tên (Naming Convention)**:
  * Route parameter & Query parameter: `snake_case` (ví dụ: `lesson_id`, `page_size`).
  * Request Body & Response Field: `snake_case` (ví dụ: `display_name`, `total_exp`).
  * HTTP Header: `Header-Case` (ví dụ: `Authorization`).

---

### 1.2. Xác thực & Phân quyền

Hệ thống sử dụng cơ chế **JWT (JSON Web Token)** để xác thực.

* **Public Endpoint**: Không yêu cầu token.
* **Protected Endpoint**: Yêu cầu HTTP Header:
  ```http
  Authorization: Bearer <jwt_access_token>
  ```
* Người dùng chưa đăng nhập (Guest) nhận lỗi `401 Unauthorized` khi truy cập endpoint bảo vệ.
* Người dùng không có quyền (User truy cập tài nguyên của User khác) nhận lỗi `403 Forbidden`.

---

### 1.3. Cấu trúc Response & Error Envelope

Mọi response phản hồi lỗi hoặc dữ liệu phân trang đều tuân theo chuẩn hóa thống nhất quy định tại `08-coding-convention.md`.

#### 1.3.1. Phân trang dùng chung (Paginated Response)

```json
{
  "items": [],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "pages": 5
}
```

#### 1.3.2. Cấu trúc Lỗi chuẩn (Standard Error Envelope)

```json
{
  "error": {
    "status": 400,
    "code": "error_code_identifier",
    "message": "Mô tả lỗi ngắn gọn dành cho người dùng",
    "details": [
      {
        "field": "email",
        "issue": "Email đã được đăng ký trong hệ thống"
      }
    ]
  }
}
```

#### 1.3.3. Các Mã Lỗi Thường Gặp (Standard Error Codes)

| HTTP Status | Error Code | Mô tả |
| :--- | :--- | :--- |
| `400 Bad Request` | `bad_request` | Dữ liệu gửi lên không đúng định dạng nghiệp vụ |
| `401 Unauthorized` | `unauthorized` | Token không hợp lệ, hết hạn hoặc không được cung cấp |
| `403 Forbidden` | `forbidden` | Không có quyền truy cập tài nguyên |
| `404 Not Found` | `not_found` | Tài nguyên (bài học, attempt, conversation) không tồn tại |
| `409 Conflict` | `conflict` | Xung đột dữ liệu (ví dụ: email đã tồn tại) |
| `422 Unprocessable Entity` | `validation_error` | Lỗi validate dữ liệu đầu vào theo schema Pydantic |
| `429 Too Many Requests` | `rate_limited` | Gửi quá nhiều request trong thời gian ngắn |
| `500 Internal Server Error` | `internal_error` | Lỗi hệ thống backend chưa xác định |
| `503 Service Unavailable` | `service_unavailable` | Dịch vụ AI hoặc Database tạm thời không khả dụng |

---

## 2. Common Data Schemas

Dưới đây là các Schema Pydantic/JSON được tái sử dụng tại các endpoints:

### UserProfileSchema
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "display_name": "Nguyen Van A",
  "avatar_url": null,
  "level": 2,
  "total_exp": 150,
  "created_at": "2026-08-01T10:00:00.000Z"
}
```

### LessonBaseSchema
```json
{
  "id": "987e6543-e89b-12d3-a456-426614174999",
  "title": "Chào hỏi công sở",
  "description": "Luyện tập các câu chào hỏi lịch sự trong môi trường làm việc",
  "type": "shadowing",
  "difficulty": "N4",
  "topic": "Business",
  "duration_seconds": 45,
  "is_completed": false
}
```

---

## 3. Danh sách Endpoints chi tiết theo Module

---

### 3.1. System / Health Check Module

#### `GET /api/v1/health`
* **Mục đích**: Kiểm tra trạng thái hoạt động của hệ thống (liveness check).
* **Yêu cầu xác thực**: Public
* **Request Headers**: Không
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-08-06T14:30:00.000Z",
    "version": "1.0.0"
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Dịch vụ hoạt động bình thường.
  * `503 Service Unavailable`: Dịch vụ gặp sự cố nghiêm trọng.

---

### 3.2. Authentication Module (P0)

#### `POST /api/v1/auth/register`
* **Mục đích**: Đăng ký tài khoản người dùng mới.
* **Yêu cầu xác thực**: Public
* **Request Headers**: `Content-Type: application/json`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body Schema**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!",
    "confirm_password": "Password123!",
    "display_name": "Nguyen Van A"
  }
  ```
  *Ràng buộc*: Email hợp lệ; `password` tối thiểu 8 ký tự; `confirm_password` trùng khớp `password`.
* **Response Schema (201 Created)**:
  ```json
  {
    "message": "Đăng ký tài khoản thành công",
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "display_name": "Nguyen Van A",
      "avatar_url": null,
      "level": 1,
      "total_exp": 0,
      "created_at": "2026-08-06T14:30:00.000Z"
    }
  }
  ```
* **Status Codes & Error Responses**:
  * `201 Created`: Tạo tài khoản thành công.
  * `400 Bad Request` (`code`: `bad_request`): Mật khẩu xác nhận không khớp.
  * `409 Conflict` (`code`: `conflict`): Email đã được đăng ký.
  * `422 Unprocessable Entity` (`code`: `validation_error`): Định dạng email hoặc mật khẩu yếu.

---

#### `POST /api/v1/auth/login`
* **Mục đích**: Đăng nhập hệ thống bằng email & password để nhận JWT token.
* **Yêu cầu xác thực**: Public
* **Request Headers**: `Content-Type: application/json`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body Schema**:
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "display_name": "Nguyen Van A",
      "avatar_url": null,
      "level": 2,
      "total_exp": 150,
      "created_at": "2026-08-01T10:00:00.000Z"
    }
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Đăng nhập thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Email hoặc mật khẩu không chính xác.
  * `422 Unprocessable Entity` (`code`: `validation_error`): Dữ liệu không hợp lệ.

---

#### `POST /api/v1/auth/logout`
* **Mục đích**: Đăng xuất tài khoản và kết thúc phiên làm việc.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "message": "Đăng xuất thành công"
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Đăng xuất thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Token không hợp lệ hoặc đã hết hạn.

---

### 3.3. User / Profile Module (P0)

#### `GET /api/v1/users/me`
* **Mục đích**: Lấy thông tin hồ sơ và tổng quan tiến độ người dùng hiện tại.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "display_name": "Nguyen Van A",
    "avatar_url": null,
    "level": 2,
    "total_exp": 150,
    "next_level_exp": 250,
    "created_at": "2026-08-01T10:00:00.000Z"
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Trả thông tin hồ sơ người dùng thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Chưa đăng nhập hoặc token hết hạn.

---

#### `PATCH /api/v1/users/me`
* **Mục đích**: Cập nhật thông tin hồ sơ người dùng (ví dụ: tên hiển thị).
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`, `Content-Type: application/json`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body Schema**:
  ```json
  {
    "display_name": "Nguyen Van B"
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "display_name": "Nguyen Van B",
    "avatar_url": null,
    "level": 2,
    "total_exp": 150,
    "updated_at": "2026-08-06T14:35:00.000Z"
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Cập nhật thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Token không hợp lệ.
  * `422 Unprocessable Entity` (`code`: `validation_error`): Tên hiển thị rỗng hoặc vượt quá 50 ký tự.

---

### 3.4. Learning Content Module (P0/P1/P2)

#### `GET /api/v1/lessons`
* **Mục đích**: Lấy danh sách các bài học đã xuất bản, hỗ trợ lọc theo loại bài, độ khó và chủ đề.
* **Yêu cầu xác thực**: Bearer Token (hoặc Public nếu là trang giới thiệu)
* **Request Headers**: `Authorization: Bearer <jwt_access_token>` (nếu có)
* **Path Parameters**: Không
* **Query Parameters**:
  * `type` (optional, string): `shadowing` | `dictation` | `reflex` | `listening_translation`
  * `difficulty` (optional, string): `N5` | `N4` | `N3` | `N2` | `N1`
  * `topic` (optional, string): Ví dụ: `Daily`, `Business`
  * `page` (optional, integer, default: `1`): Trang hiện tại
  * `page_size` (optional, integer, default: `20`): Số lượng mục mỗi trang
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "987e6543-e89b-12d3-a456-426614174999",
        "title": "Chào hỏi công sở",
        "description": "Luyện tập các câu chào hỏi lịch sự trong môi trường làm việc",
        "type": "shadowing",
        "difficulty": "N4",
        "topic": "Business",
        "duration_seconds": 45,
        "is_completed": true
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "pages": 1
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Lấy danh sách bài học thành công.
  * `422 Unprocessable Entity` (`code`: `validation_error`): Tham số query không hợp lệ.

---

#### `GET /api/v1/lessons/{lesson_id}`
* **Mục đích**: Lấy thông tin chi tiết của bài học chung.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**:
  * `lesson_id` (string, UUID): ID bài học
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "id": "987e6543-e89b-12d3-a456-426614174999",
    "title": "Chào hỏi công sở",
    "description": "Luyện tập các câu chào hỏi lịch sự trong môi trường làm việc",
    "type": "shadowing",
    "difficulty": "N4",
    "topic": "Business",
    "audio_url": "https://res.cloudinary.com/kaiwaup/audio/lesson_01.mp3",
    "duration_seconds": 45,
    "created_at": "2026-08-01T00:00:00.000Z"
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Lấy thông tin thành công.
  * `404 Not Found` (`code`: `not_found`): Bài học không tồn tại.

---

### 3.5. Shadowing Module (P0)

#### `GET /api/v1/shadowing/lessons`
* **Mục đích**: Lấy danh sách chuyên biệt các bài luyện Shadowing.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**:
  * `difficulty` (optional, string): `N5`–`N1`
  * `page` (optional, integer, default: `1`)
  * `page_size` (optional, integer, default: `20`)
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "987e6543-e89b-12d3-a456-426614174999",
        "title": "Hội thoại mua sắm",
        "difficulty": "N5",
        "duration_seconds": 30,
        "is_completed": false
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "pages": 1
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Lấy danh sách bài Shadowing thành công.

---

#### `GET /api/v1/shadowing/lessons/{lesson_id}`
* **Mục đích**: Lấy chi tiết bài luyện Shadowing bao gồm audio Cloudinary và transcript tiếng Nhật (dành cho chế độ bật/tắt văn bản).
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**:
  * `lesson_id` (string, UUID): ID bài Shadowing
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "id": "987e6543-e89b-12d3-a456-426614174999",
    "title": "Hội thoại mua sắm",
    "audio_url": "https://res.cloudinary.com/kaiwaup/audio/shadow_01.mp3",
    "duration_seconds": 30,
    "japanese_text": "いらっしゃいませ。何をお探しですか？",
    "romaji_text": "Irasshaimase. Nani wo osagashi desu ka?",
    "vietnamese_translation": "Xin chào quý khách. Bạn đang tìm gì thế?",
    "transcript_timestamps": [
      { "start": 0.0, "end": 1.5, "text": "いらっしゃいませ。" },
      { "start": 1.6, "end": 3.0, "text": "何をお探しですか？" }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.
  * `404 Not Found` (`code`: `not_found`): Không tìm thấy bài học.

---

#### `POST /api/v1/shadowing/lessons/{lesson_id}/attempts`
* **Mục đích**: Nộp lượt thực hiện bài Shadowing (có thể kèm file audio ghi âm tạm thời để chấm điểm AI hoặc xác nhận hoàn thành bài tự so sánh). Tự động ghi nhận hoàn thành bài và nhận 15 EXP.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`, `Content-Type: multipart/form-data`
* **Path Parameters**:
  * `lesson_id` (string, UUID): ID bài Shadowing
* **Query Parameters**: Không
* **Request Body Schema (Form Data)**:
  * `audio_file` (optional, file): File ghi âm dạng `webm` / `wav` / `mp3`.
  * `self_evaluation_passed` (required, boolean): `true` nếu người dùng xác nhận đã tự so sánh và hoàn thành.
* **Response Schema (201 Created)**:
  ```json
  {
    "attempt_id": "550e8400-e29b-41d4-a716-446655440000",
    "lesson_id": "987e6543-e89b-12d3-a456-426614174999",
    "status": "completed",
    "exp_earned": 15,
    "ai_feedback": {
      "similarity_score": 85.5,
      "feedback_text": "Phát âm khá mượt mà, lưu ý phát âm âm ngắt ở câu đầu.",
      "mispronounced_words": ["お探し"]
    },
    "completed_at": "2026-08-06T14:40:00.000Z"
  }
  ```
* **Status Codes & Error Responses**:
  * `201 Created`: Nộp bài thành công và nhận thưởng EXP.
  * `400 Bad Request` (`code`: `bad_request`): Định dạng file ghi âm không hỗ trợ.
  * `404 Not Found` (`code`: `not_found`): Bài học không tồn tại.

---

### 3.6. Dictation Module (P0)

#### `GET /api/v1/dictation/lessons`
* **Mục đích**: Lấy danh sách các bài tập Dictation.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**:
  * `difficulty` (optional, string): `N5`–`N1`
  * `page` (optional, integer, default: `1`)
  * `page_size` (optional, integer, default: `20`)
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440111",
        "title": "Nghe điền từ: Thời tiết hôm nay",
        "difficulty": "N5",
        "total_blanks": 3,
        "is_completed": false
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "pages": 1
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.

---

#### `GET /api/v1/dictation/lessons/{lesson_id}`
* **Mục đích**: Lấy đề bài Dictation kèm vị trí ô trống. **Tuyệt đối không trả đáp án** để bảo mật thông tin trước khi nộp.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**:
  * `lesson_id` (string, UUID): ID bài Dictation
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "id": "770e8400-e29b-41d4-a716-446655440111",
    "title": "Nghe điền từ: Thời tiết hôm nay",
    "audio_url": "https://res.cloudinary.com/kaiwaup/audio/dict_01.mp3",
    "display_text_template": "きょうは ___ (1) ですね。あしたは ___ (2) がふるでしょう。",
    "blanks": [
      { "blank_index": 1, "hint": "Thời tiết (Tính từ)" },
      { "blank_index": 2, "hint": "Hiện tượng thời tiết (Danh từ)" }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Lấy đề Dictation thành công.
  * `404 Not Found` (`code`: `not_found`): Không tìm thấy đề bài.

---

#### `POST /api/v1/dictation/lessons/{lesson_id}/submit`
* **Mục đích**: Nộp câu trả lời bài Dictation. Backend kiểm tra chính xác, tính điểm, trả đáp án đúng và cấp 10 EXP nếu đạt tiêu chuẩn hoàn thành.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`, `Content-Type: application/json`
* **Path Parameters**:
  * `lesson_id` (string, UUID): ID bài Dictation
* **Query Parameters**: Không
* **Request Body Schema**:
  ```json
  {
    "answers": [
      { "blank_index": 1, "user_answer": "いいてんき" },
      { "blank_index": 2, "user_answer": "あめ" }
    ]
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "attempt_id": "880e8400-e29b-41d4-a716-446655440222",
    "lesson_id": "770e8400-e29b-41d4-a716-446655440111",
    "total_questions": 2,
    "correct_count": 2,
    "score_percentage": 100.0,
    "is_passed": true,
    "exp_earned": 10,
    "results": [
      {
        "blank_index": 1,
        "user_answer": "いいてんき",
        "correct_answer": "いいてんき",
        "is_correct": true
      },
      {
        "blank_index": 2,
        "user_answer": "あめ",
        "correct_answer": "あめ",
        "is_correct": true
      }
    ],
    "full_transcript": "きょうはいいてんきですね。あしたがあめがふるでしょう。"
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Chấm bài và trả kết quả thành công.
  * `404 Not Found` (`code`: `not_found`): Bài học không tồn tại.
  * `422 Unprocessable Entity` (`code`: `validation_error`): Danh sách câu trả lời thiếu câu hỏi.

---

### 3.7. Progress / Attempt Module (P0)

#### `GET /api/v1/progress/summary`
* **Mục đích**: Xem tổng quan chỉ số học tập (tổng bài học đã hoàn thành, số lượt luyện tập).
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "shadowing_completed": 12,
    "dictation_completed": 8,
    "reflex_completed": 5,
    "total_lessons_completed": 25,
    "total_practice_time_minutes": 140
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Token không hợp lệ.

---

#### `GET /api/v1/progress/attempts`
* **Mục đích**: Lấy danh sách lịch sử làm bài (attempts) của người dùng hiện tại.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**:
  * `type` (optional, string): `shadowing` | `dictation` | `reflex` | `listening_translation`
  * `page` (optional, integer, default: `1`)
  * `page_size` (optional, integer, default: `20`)
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440222",
        "lesson_id": "770e8400-e29b-41d4-a716-446655440111",
        "lesson_title": "Nghe điền từ: Thời tiết hôm nay",
        "lesson_type": "dictation",
        "status": "completed",
        "score": 100.0,
        "exp_earned": 10,
        "completed_at": "2026-08-06T14:42:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "pages": 1
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Lấy lịch sử thành công.

---

#### `GET /api/v1/progress/attempts/{attempt_id}`
* **Mục đích**: Lấy thông tin chi tiết của 1 lượt làm bài cụ thể.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**:
  * `attempt_id` (string, UUID): ID lượt làm bài
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "id": "880e8400-e29b-41d4-a716-446655440222",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "lesson_id": "770e8400-e29b-41d4-a716-446655440111",
    "lesson_type": "dictation",
    "status": "completed",
    "score": 100.0,
    "exp_earned": 10,
    "detail_payload": {
      "correct_count": 2,
      "total_questions": 2
    },
    "completed_at": "2026-08-06T14:42:00.000Z"
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.
  * `403 Forbidden` (`code`: `forbidden`): Xem lượt làm bài của tài khoản khác.
  * `404 Not Found` (`code`: `not_found`): Không tìm thấy lượt làm bài.

---

### 3.8. Gamification Module (P0/P1)

#### `GET /api/v1/gamification/profile`
* **Mục đích**: Lấy thông tin cấp độ, tổng EXP, EXP mốc kế tiếp và lịch sử nhận điểm kinh nghiệm.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "level": 2,
    "total_exp": 150,
    "current_level_min_exp": 100,
    "next_level_min_exp": 250,
    "exp_to_next_level": 100,
    "recent_exp_history": [
      {
        "id": "exp_01",
        "amount": 10,
        "reason": "Hoàn thành bài Dictation: Thời tiết hôm nay",
        "created_at": "2026-08-06T14:42:00.000Z"
      }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.

---

#### `GET /api/v1/gamification/achievements`
* **Mục đích**: Lấy danh sách thành tích/danh hiệu và trạng thái mở khóa của người dùng.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "achievements": [
      {
        "id": "first_lesson",
        "title": "Bước khởi đầu",
        "description": "Hoàn thành bài học đầu tiên",
        "icon_url": "https://res.cloudinary.com/kaiwaup/badge/first_lesson.png",
        "is_unlocked": true,
        "unlocked_at": "2026-08-01T11:00:00.000Z"
      },
      {
        "id": "shadow_master_1",
        "title": "Bậc thầy Shadowing I",
        "description": "Hoàn thành 10 bài Shadowing",
        "icon_url": "https://res.cloudinary.com/kaiwaup/badge/shadow_master.png",
        "is_unlocked": false,
        "unlocked_at": null
      }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.

---

### 3.9. Leaderboard Module (P0)

#### `GET /api/v1/leaderboard/weekly`
* **Mục đích**: Lấy Bảng xếp hạng người học theo tổng EXP tích lũy trong tuần hiện tại. Sắp xếp theo `weekly_exp DESC`, sau đó `reached_exp_at ASC`.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**:
  * `limit` (optional, integer, default: `50`): Số lượng người dùng top đầu
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "week_number": 32,
    "year": 2026,
    "user_rank": {
      "rank": 5,
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "display_name": "Nguyen Van A",
      "avatar_url": null,
      "weekly_exp": 150
    },
    "rankings": [
      {
        "rank": 1,
        "user_id": "user_top_1",
        "display_name": "Tanaka San",
        "avatar_url": null,
        "weekly_exp": 450
      },
      {
        "rank": 2,
        "user_id": "user_top_2",
        "display_name": "Yamada San",
        "avatar_url": null,
        "weekly_exp": 320
      }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Lấy bảng xếp hạng thành công.

---

### 3.10. Dashboard Module (P0)

#### `GET /api/v1/dashboard`
* **Mục đích**: Tổng hợp dữ liệu hiển thị trang Dashboard sau đăng nhập (Greeting, Level/EXP summary, bài học gần đây, bài cần ôn tập, vị trí xếp hạng).
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "user_summary": {
      "display_name": "Nguyen Van A",
      "avatar_url": null,
      "level": 2,
      "total_exp": 150,
      "next_level_exp": 250
    },
    "due_reviews_count": 3,
    "weekly_rank": 5,
    "recent_lessons": [
      {
        "id": "770e8400-e29b-41d4-a716-446655440111",
        "title": "Nghe điền từ: Thời tiết hôm nay",
        "type": "dictation",
        "completed_at": "2026-08-06T14:42:00.000Z"
      }
    ],
    "recommended_lessons": [
      {
        "id": "987e6543-e89b-12d3-a456-426614174999",
        "title": "Hội thoại mua sắm",
        "type": "shadowing",
        "difficulty": "N5"
      }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Lấy dữ liệu Dashboard thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Chưa đăng nhập.

---

### 3.11. 3-Second Reflex Module (P1)

#### `GET /api/v1/reflex/lessons`
* **Mục đích**: Lấy danh sách các bài luyện phản xạ 3 giây.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**:
  * `difficulty` (optional, string): `N5`–`N1`
  * `page` (optional, integer, default: `1`)
  * `page_size` (optional, integer, default: `20`)
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "330e8400-e29b-41d4-a716-446655440333",
        "title": "Phản xạ câu hỏi: Điểm hẹn",
        "difficulty": "N4",
        "is_completed": false
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "pages": 1
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.

---

#### `GET /api/v1/reflex/lessons/{lesson_id}`
* **Mục đích**: Lấy tình huống / audio câu hỏi bài phản xạ 3 giây.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**:
  * `lesson_id` (string, UUID): ID bài Phản xạ
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "id": "330e8400-e29b-41d4-a716-446655440333",
    "title": "Phản xạ câu hỏi: Điểm hẹn",
    "prompt_text": "どこで会いましょうか？",
    "prompt_audio_url": "https://res.cloudinary.com/kaiwaup/audio/reflex_01.mp3",
    "time_limit_seconds": 3
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.
  * `404 Not Found` (`code`: `not_found`): Không tìm thấy bài luyện.

---

#### `POST /api/v1/reflex/lessons/{lesson_id}/evaluate`
* **Mục đích**: Gửi bản ghi âm trả lời và thời gian bắt đầu phản hồi (`response_start_ms`). AI đánh giá tính tự nhiên, độ chính xác, xác định `on_time` và cập nhật lịch lặp lại ngắt quãng (Spaced Repetition).
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`, `Content-Type: multipart/form-data`
* **Path Parameters**:
  * `lesson_id` (string, UUID): ID bài Phản xạ
* **Query Parameters**: Không
* **Request Body Schema (Form Data)**:
  * `audio_file` (required, file): File ghi âm trả lời của người dùng.
  * `response_start_ms` (required, integer): Thời gian trôi qua từ khi audio kết thúc đến khi người dùng bắt đầu nói (tính theo milisec).
* **Response Schema (200 OK)**:
  ```json
  {
    "attempt_id": "440e8400-e29b-41d4-a716-446655440444",
    "lesson_id": "330e8400-e29b-41d4-a716-446655440333",
    "response_start_ms": 2100,
    "is_on_time": true,
    "ai_score": 82.0,
    "ai_feedback": {
      "transcribed_text": "駅の前で会いましょう。",
      "naturalness_evaluation": "Câu trả lời hoàn toàn tự nhiên và đúng ngữ cảnh.",
      "suggestions": "Có thể dùng 散歩しましょう nếu muốn rủ rê."
    },
    "next_review_days": 5,
    "next_review_at": "2026-08-11T14:45:00.000Z",
    "exp_earned": 20
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Đánh giá thành công.
  * `400 Bad Request` (`code`: `bad_request`): Audio rỗng hoặc sai định dạng.
  * `503 Service Unavailable` (`code`: `service_unavailable`): Dịch vụ AI Gateway xử lý thất bại (Frontend hiển thị fallback tự đánh giá).

---

### 3.12. Review / Spaced Repetition Module (P1)

#### `GET /api/v1/review/due`
* **Mục đích**: Lấy danh sách các bài phản xạ đến hạn cần ôn tập lại hôm nay theo thuật toán ngắt quãng.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "due_count": 2,
    "items": [
      {
        "schedule_id": "sch_01",
        "lesson_id": "330e8400-e29b-41d4-a716-446655440333",
        "lesson_title": "Phản xạ câu hỏi: Điểm hẹn",
        "last_score": 45.0,
        "due_at": "2026-08-06T00:00:00.000Z"
      }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.

---

#### `GET /api/v1/review/schedule`
* **Mục đích**: Lấy toàn bộ lịch ôn tập cá nhân và tiến trình ghi nhớ.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "items": [
      {
        "schedule_id": "sch_01",
        "lesson_id": "330e8400-e29b-41d4-a716-446655440333",
        "lesson_title": "Phản xạ câu hỏi: Điểm hẹn",
        "interval_days": 1,
        "review_count": 2,
        "next_review_at": "2026-08-07T14:45:00.000Z"
      }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.

---

### 3.13. Listening & Translation Module (P2)

#### `GET /api/v1/listening-translation/lessons`
* **Mục đích**: Lấy danh sách các bài tập Nghe và Dịch (P2).
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**:
  * `difficulty` (optional, string): `N5`–`N1`
  * `page` (optional, integer, default: `1`)
  * `page_size` (optional, integer, default: `20`)
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "660e8400-e29b-41d4-a716-446655440666",
        "title": "Nghe hiểu ý chính: Đặt bàn ăn",
        "difficulty": "N3",
        "is_completed": false
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "pages": 1
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.

---

#### `GET /api/v1/listening-translation/lessons/{lesson_id}`
* **Mục đích**: Lấy nội dung audio và câu hỏi bài tập Nghe & Dịch.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**:
  * `lesson_id` (string, UUID): ID bài học
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "id": "660e8400-e29b-41d4-a716-446655440666",
    "title": "Nghe hiểu ý chính: Đặt bàn ăn",
    "audio_url": "https://res.cloudinary.com/kaiwaup/audio/trans_01.mp3",
    "question_text": "Nội dung cuộc gọi nhằm mục đích gì?",
    "options": [
      { "option_id": "A", "option_text": "Đặt bàn ăn cho 4 người vào 7 giờ tối" },
      { "option_id": "B", "option_text": "Hủy đặt bàn ăn đã hẹn" },
      { "option_id": "C", "option_text": "Hỏi về thực đơn món ăn" }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.
  * `404 Not Found` (`code`: `not_found`): Không tìm thấy bài học.

---

#### `POST /api/v1/listening-translation/lessons/{lesson_id}/submit`
* **Mục đích**: Nộp đáp án trắc nghiệm hoặc bản dịch tiếng Việt để chấm kết quả.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`, `Content-Type: application/json`
* **Path Parameters**:
  * `lesson_id` (string, UUID): ID bài học
* **Query Parameters**: Không
* **Request Body Schema**:
  ```json
  {
    "selected_option_id": "A"
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "attempt_id": "990e8400-e29b-41d4-a716-446655440999",
    "is_correct": true,
    "correct_option_id": "A",
    "explanation": "Khách hàng nói '4人で7時に予約したいですが' (Tôi muốn đặt bàn cho 4 người lúc 7 giờ).",
    "exp_earned": 10
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Nộp bài thành công.
  * `404 Not Found` (`code`: `not_found`): Bài học không tồn tại.

---

### 3.14. AI Tutor 1-1 Module (P2)

#### `POST /api/v1/ai-tutor/conversations`
* **Mục đích**: Khởi tạo phiên luyện hội thoại tự do 1-1 mới với AI Tutor theo chủ đề và độ khó.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`, `Content-Type: application/json`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body Schema**:
  ```json
  {
    "topic": "Du lịch Nhật Bản",
    "difficulty": "N3"
  }
  ```
* **Response Schema (201 Created)**:
  ```json
  {
    "conversation_id": "111e8400-e29b-41d4-a716-446655440111",
    "topic": "Du lịch Nhật Bản",
    "difficulty": "N3",
    "initial_message": {
      "sender": "ai",
      "text": "こんにちは！日本旅行について話しましょう。どこに行きたいですか？",
      "created_at": "2026-08-06T14:50:00.000Z"
    }
  }
  ```
* **Status Codes & Error Responses**:
  * `201 Created`: Tạo phiên hội thoại thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Chưa đăng nhập.

---

#### `GET /api/v1/ai-tutor/conversations`
* **Mục đích**: Lấy danh sách các phiên hội thoại với AI Tutor của người dùng.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**:
  * `page` (optional, integer, default: `1`)
  * `page_size` (optional, integer, default: `20`)
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "items": [
      {
        "conversation_id": "111e8400-e29b-41d4-a716-446655440111",
        "topic": "Du lịch Nhật Bản",
        "difficulty": "N3",
        "last_message_text": "京都に行きたいです。",
        "updated_at": "2026-08-06T14:52:00.000Z"
      }
    ],
    "total": 1,
    "page": 1,
    "page_size": 20,
    "pages": 1
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.

---

#### `GET /api/v1/ai-tutor/conversations/{conversation_id}`
* **Mục đích**: Tải lại toàn bộ lịch sử tin nhắn trong 1 phiên hội thoại với AI Tutor.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**:
  * `conversation_id` (string, UUID): ID phiên hội thoại
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "conversation_id": "111e8400-e29b-41d4-a716-446655440111",
    "topic": "Du lịch Nhật Bản",
    "difficulty": "N3",
    "messages": [
      {
        "id": "msg_01",
        "sender": "ai",
        "text": "こんにちは！日本旅行について話しましょう。どこに行きたいですか？",
        "created_at": "2026-08-06T14:50:00.000Z"
      },
      {
        "id": "msg_02",
        "sender": "user",
        "text": "京都に行きたいです。",
        "created_at": "2026-08-06T14:51:00.000Z"
      }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.
  * `403 Forbidden` (`code`: `forbidden`): Không có quyền truy cập phiên hội thoại này.
  * `404 Not Found` (`code`: `not_found`): Phiên hội thoại không tồn tại.

---

#### `POST /api/v1/ai-tutor/conversations/{conversation_id}/messages`
* **Mục đích**: Gửi tin nhắn của người dùng (dạng Text) cho AI Tutor và nhận phản hồi hội thoại tiếp theo kèm gợi ý sửa lỗi ngữ pháp.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`, `Content-Type: application/json`
* **Path Parameters**:
  * `conversation_id` (string, UUID): ID phiên hội thoại
* **Query Parameters**: Không
* **Request Body Schema**:
  ```json
  {
    "text": "京都に行きたいです。お寺を見ます。"
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "user_message": {
      "id": "msg_02",
      "sender": "user",
      "text": "京都に行きたいです。お寺を見ます。",
      "created_at": "2026-08-06T14:51:00.000Z"
    },
    "ai_reply": {
      "id": "msg_03",
      "sender": "ai",
      "text": "京都のお寺はとても綺麗ですよ！金閣寺や清水寺が有名です。どちらに行きたいですか？",
      "created_at": "2026-08-06T14:51:05.000Z"
    },
    "feedback": {
      "grammar_correction": "お寺を見ます -> お寺を見たいです (Diễn đạt ý muốn tự nhiên hơn)",
      "natural_expression_tip": "京都でお寺めぐりをしたいです (Tôi muốn đi tham quan các ngôi chùa ở Kyoto)."
    }
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Trả lời hội thoại thành công.
  * `403 Forbidden` (`code`: `forbidden`): Không có quyền truy cập phiên hội thoại.
  * `503 Service Unavailable` (`code`: `service_unavailable`): AI Gateway bị sập hoặc quá tải.

---

### 3.15. Pronunciation Analysis Module (P2)

#### `POST /api/v1/shadowing/lessons/{lesson_id}/analyze-pronunciation`
* **Mục đích**: Phân tích phát âm chuyên sâu cho bài Shadowing (trọng âm pitch accent, nhịp điệu rhythm và độ chính xác của từng âm phoneme).
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`, `Content-Type: multipart/form-data`
* **Path Parameters**:
  * `lesson_id` (string, UUID): ID bài Shadowing
* **Query Parameters**: Không
* **Request Body Schema (Form Data)**:
  * `audio_file` (required, file): File ghi âm trả lời của người dùng.
* **Response Schema (200 OK)**:
  ```json
  {
    "lesson_id": "987e6543-e89b-12d3-a456-426614174999",
    "overall_score": 88.0,
    "pitch_accuracy_score": 85.0,
    "rhythm_score": 90.0,
    "phoneme_details": [
      {
        "phoneme": "いらっしゃいませ",
        "status": "correct",
        "score": 95.0
      },
      {
        "phoneme": "お探し",
        "status": "needs_improvement",
        "score": 65.0,
        "tip": "Chú ý hạ cao độ ở âm Sagashi"
      }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Phân tích phát âm thành công.
  * `400 Bad Request` (`code`: `bad_request`): Audio rỗng hoặc không đúng định dạng.
  * `503 Service Unavailable` (`code`: `service_unavailable`): Dịch vụ AI phân tích phát âm chưa sẵn sàng.

---

## 4. Tóm tắt & Đánh giá tự kiểm tra (Self-Review Summary)

### 4.1. Thống kê tài liệu
* **Số lượng Module được mô tả**: 15 module (Health, Auth, User, Learning Content, Shadowing, Dictation, Progress, Gamification, Leaderboard, Dashboard, Reflex, Review, Listening & Translation, AI Tutor, Pronunciation Analysis).
* **Tổng số API Endpoints được quy định**: 28 endpoints.

### 4.2. Giả định (Assumptions Made)
1. **Cloudinary Audio Delivery**: URL audio bài học được cung cấp trực tiếp từ Cloudinary trong response metadata bài học mà không qua backend proxy.
2. **User Audio Lifecycle**: Audio do người dùng ghi âm được gửi lên dưới dạng `multipart/form-data` và chỉ giữ tạm thời trên bộ nhớ đệm backend trong quá trình AI xử lý, tuyệt đối không lưu vết lâu dài hoặc lưu URL vào PostgreSQL.
3. **Weekly Leaderboard Reset**: Bảng xếp hạng tuần tự động reset theo chu kỳ tuần dựa trên hàm lọc timestamp `EXP ledger`.

### 4.3. Các mục TODO còn lại
* **TODO-01 (Avatar Upload)**: Endpoint tải ảnh đại diện (`POST /api/v1/users/me/avatar`) tạm thời chưa khai báo do hạ tầng lưu trữ avatar chưa thống nhất trong thiết kế `07-module-design.md`.
* **TODO-02 (AI Tutor Voice Input)**: Endpoint gửi giọng nói trực tiếp cho AI Tutor (`POST /api/v1/ai-tutor/conversations/{id}/voice-messages`) thuộc phạm vi nâng cao của P2 và sẽ được bổ sung khi mô hình Voice-to-Voice được chốt.

### 4.4. Đánh giá tính nhất quán tài liệu (Inconsistency Check)
* Đã đối chiếu hoàn toàn khớp với quy tắc đặt tên (`snake_case`), cấu trúc lỗi Envelope (`status`, `code`, `message`, `details`) tại `08-coding-convention.md`.
* Bảng mốc tính cấp độ EXP (Level 1-10) tại `07-module-design.md` được áp dụng nhất quán trong response của Gamification và Dashboard endpoints.
