# 06. API Contract

## 1. Tổng quan kiến trúc API

Tài liệu này mô tả chi tiết các hợp đồng giao tiếp API (API Contract) giữa **Next.js Frontend** (`apps/web`) và **FastAPI Backend** (`apps/api`) của dự án **KaiwaUp**.

### 1.1. Quy chuẩn chung

* **Base URL**: `/api/v1`
* **Định dạng dữ liệu**: `application/json` (trừ các endpoint tải audio sử dụng `multipart/form-data`).
* **Múi giờ & Thời gian**: Chuẩn ISO 8601 UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
* **Độ khó bài học (Difficulty Mapping)**:
  * Database và API đều lưu/trả chuỗi JLPT `"N5"`, `"N4"`, `"N3"`, `"N2"`, `"N1"`.
  * `learning_contents.difficulty` và `tutor_sessions.difficulty` dùng cùng tập giá trị này.
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
  "total_items": 100,
  "page": 1,
  "page_size": 20,
  "total_pages": 5
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
  "role": "user",
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
  "content_type": "shadowing",
  "difficulty": "N4",
  "topic": "Business",
  "duration_seconds": 45,
  "is_completed": false
}
```

### TutorAnswerHintSchema
```json
{
  "text": "京都に行きたいです。",
  "meaning_vi": "Tôi muốn đi Kyoto."
}
```

Mỗi AI question có tối đa 3 `TutorAnswerHintSchema`. Frontend chỉ điền hint vào ô nhập; không tự
động gửi message.

### TutorFeedbackSchema
```json
{
  "grammar_correction": "Cụm 「お寺を見ます」 đang diễn tả hành động hiện tại. Để nói mong muốn, hãy dùng 「お寺を見たいです」.",
  "natural_expression_tip": "Bạn có thể diễn đạt tự nhiên hơn bằng câu 「京都でお寺めぐりをしたいです」.",
  "answer_hints": [
    {
      "text": "金閣寺に行きたいです。",
      "meaning_vi": "Tôi muốn đi Kinkaku-ji."
    }
  ]
}
```

`grammar_correction` và `natural_expression_tip` có thể là `null`. `answer_hints`
luôn là array và rỗng khi AI không tạo gợi ý.

### TutorMessageSchema
```json
{
  "id": "msg_03",
    "sender": "ai",
    "sequence_number": 3,
    "text": "京都のお寺はとても綺麗ですよ！",
    "text_vi": "Các ngôi chùa ở Kyoto rất đẹp!",
  "client_message_id": null,
  "created_at": "2026-08-06T14:51:05.000Z",
  "feedback": {
    "grammar_correction": null,
    "natural_expression_tip": null,
    "answer_hints": []
  }
}
```

`client_message_id` bắt buộc với `user` message và được dùng làm idempotency key; với `ai` message
giá trị là `null`.

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
    "app_name": "Kaiwa App API"
  }
```
* **Status Codes & Error Responses**:
  * `200 OK`: Dịch vụ hoạt động bình thường.
  * `503 Service Unavailable`: Dịch vụ gặp sự cố nghiêm trọng.

---

#### `GET /api/v1/ready`
* **Mục đích**: Kiểm tra ứng dụng đã sẵn sàng phục vụ và database có thể kết nối.
* **Yêu cầu xác thực**: Public
* **Request Headers**: Không
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "status": "ready",
    "timestamp": "2026-08-06T14:30:00.000Z",
    "app_name": "Kaiwa App API",
    "database": "ok"
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Ứng dụng và database sẵn sàng.
  * `503 Service Unavailable`: Không thể kết nối database. Response dùng error envelope chuẩn với
    `code: "service_unavailable"`.

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
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "def45678-e89b-12d3-a456-426614174000",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "display_name": "Nguyen Van A",
      "avatar_url": null,
      "role": "user",
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
* **Mục đích**: Đăng nhập hệ thống bằng email & password để nhận JWT access token và refresh token.
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
    "refresh_token": "def45678-e89b-12d3-a456-426614174000",
    "token_type": "bearer",
    "expires_in": 86400,
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "email": "user@example.com",
      "display_name": "Nguyen Van A",
      "avatar_url": null,
      "role": "user",
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

#### `POST /api/v1/auth/refresh`
* **Mục đích**: Cấp lại access token mới bằng refresh token hợp lệ (đối chiếu bảng `auth_refresh_tokens`).
* **Yêu cầu xác thực**: Public
* **Request Headers**: `Content-Type: application/json`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body Schema**:
  ```json
  {
    "refresh_token": "def45678-e89b-12d3-a456-426614174000"
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "ghi78901-e89b-12d3-a456-426614174000",
    "token_type": "bearer",
    "expires_in": 86400
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Cấp token mới thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Refresh token không hợp lệ, bị thu hồi hoặc đã hết hạn.

---

#### `POST /api/v1/auth/logout`
* **Mục đích**: Đăng xuất tài khoản, thu hồi refresh token trong database (`auth_refresh_tokens.revoked_at`) và kết thúc phiên làm việc.
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
    "role": "user",
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
    "role": "user",
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
    "total_items": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
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
    "audio_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "duration_seconds": 45,
    "created_at": "2026-08-01T00:00:00.000Z"
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Lấy thông tin thành công.
  * `404 Not Found` (`code`: `not_found`): Bài học không tồn tại.

---

### 3.5. Shadowing Module (P0)

#### `GET /api/v1/shadowing/{content_id}`
* **Mục đích**: Lấy chi tiết bài luyện Shadowing gồm thông tin bài học, URL audio/video và danh sách các câu/segment transcript tiếng Nhật có mốc thời gian (`start_time_ms`, `end_time_ms`).
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**:
  * `content_id` (string, UUID): ID nội dung bài học Shadowing (`learning_contents.id`)
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "id": "987e6543-e89b-12d3-a456-426614174999",
    "title": "Hội thoại mua sắm",
    "difficulty": "N5",
    "audio_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "duration_seconds": 30,
    "transcript": [
      {
        "start_time_ms": 0,
        "end_time_ms": 1500,
        "script": "いらっしゃいませ。",
        "speaker": "A"
      },
      {
        "start_time_ms": 1600,
        "end_time_ms": 3000,
        "script": "何をお探しですか？",
        "speaker": "A"
      }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.
  * `404 Not Found` (`code`: `not_found`): Không tìm thấy bài học.

---

#### `GET /api/v1/shadowing/{content_id}/in-progress`
* **Mục đích**: Kiểm tra và lấy thông tin phiên luyện tập đang dang dở (`status: "in_progress"`) để người dùng có thể tiếp tục làm bài (Resume) hoặc xem tổng số lần đã thử.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**:
  * `content_id` (string, UUID): ID nội dung bài học
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "attempt_id": "550e8400-e29b-41d4-a716-446655440000",
    "mode": "segmented",
    "recorded_segments": [
      {
        "segment_id": "0",
        "recording_id": "aa0e8400-e29b-41d4-a716-446655440001",
        "storage_key": "shadowing/user_id/attempt_id/seg_0.webm",
        "duration_seconds": 2,
        "created_at": "2026-08-19T10:00:00Z"
      }
    ],
    "continuous_recording": null,
    "total_attempts": 2
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Lấy phiên đang làm dở thành công (hoặc trả `null`/404 nếu không có phiên in-progress).
  * `404 Not Found` (`code`: `not_found`): Không tìm thấy bài học.

---

#### `POST /api/v1/shadowing/{content_id}/record-segment`
* **Mục đích**: Tải lên file ghi âm cho một segment cụ thể trong chế độ Luyện từng câu (Segment-by-Segment). Lưu bản ghi vào bảng `recordings` và cập nhật payload attempt.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`, `Content-Type: multipart/form-data`
* **Path Parameters**:
  * `content_id` (string, UUID): ID bài học
* **Request Body Schema (Form Data)**:
  * `audio_file` (required, file): File âm thanh ghi âm (`webm`, `wav`, `mp3`, `m4a`, `ogg`).
  * `segment_id` (required, string): ID hoặc chỉ số câu (vd: `"0"`, `"1"`).
  * `attempt_id` (optional, string, UUID): ID attempt nếu tiếp tục phiên hiện có.
* **Response Schema (200 OK)**:
  ```json
  {
    "attempt_id": "550e8400-e29b-41d4-a716-446655440000",
    "segment_id": "0",
    "recording_id": "aa0e8400-e29b-41d4-a716-446655440001",
    "duration_seconds": 2,
    "recorded_segments_count": 1,
    "total_segments": 5,
    "is_completed": false
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Ghi âm segment thành công.
  * `400 Bad Request` (`code`: `bad_request`): Định dạng file không hợp lệ hoặc thiếu dữ liệu.
  * `404 Not Found` (`code`: `not_found`): Bài học hoặc attempt không tồn tại.

---

#### `POST /api/v1/shadowing/{content_id}/record-continuous`
* **Mục đích**: Tải lên file ghi âm cho toàn bộ buổi luyện tập trong chế độ Đọc liên tục (Continuous Shadowing).
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`, `Content-Type: multipart/form-data`
* **Path Parameters**:
  * `content_id` (string, UUID): ID bài học
* **Request Body Schema (Form Data)**:
  * `audio_file` (required, file): File âm thanh ghi âm buổi luyện tập.
  * `duration_seconds` (optional, integer): Thời lượng ghi âm thực tế tính bằng giây.
  * `attempt_id` (optional, string, UUID): ID attempt nếu tiếp tục phiên hiện có.
* **Response Schema (200 OK)**:
  ```json
  {
    "attempt_id": "550e8400-e29b-41d4-a716-446655440000",
    "recording_id": "bb0e8400-e29b-41d4-a716-446655440002",
    "duration_seconds": 30,
    "is_completed": true
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Ghi âm liên tục thành công.
  * `400 Bad Request` (`code`: `bad_request`): File không hợp lệ.
  * `404 Not Found` (`code`: `not_found`): Không tìm thấy bài học.

---

#### `POST /api/v1/shadowing/{content_id}/submit`
* **Mục đích**: Hoàn thành và nộp kết quả bài luyện Shadowing. Tính điểm (theo tỷ lệ câu hoặc thời lượng thực hành), cộng thưởng EXP và lưu lịch sử làm bài.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`, `Content-Type: application/json`
* **Path Parameters**:
  * `content_id` (string, UUID): ID bài học
* **Request Body Schema (JSON)**:
  ```json
  {
    "attempt_id": "550e8400-e29b-41d4-a716-446655440000",
    "replay_count": 0
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "attempt_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "score": 100.0,
    "earned_exp": 15,
    "total_exp": 350,
    "level": 3,
    "is_first_completion": true
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Nộp bài thành công và cộng điểm EXP.
  * `400 Bad Request` (`code`: `bad_request`): Attempt đã nộp hoặc không có bản ghi âm.
  * `404 Not Found` (`code`: `not_found`): Không tìm thấy bài học hoặc attempt.

---

#### `GET /api/v1/shadowing/attempts/{attempt_id}/review`
* **Mục đích**: Lấy dữ liệu chi tiết màn hình kết quả/ôn tập (Review) của bài Shadowing đã nộp, gồm audio gốc, bản ghi âm của người dùng và danh sách so sánh từng câu.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**:
  * `attempt_id` (string, UUID): ID attempt cần xem lại
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "attempt_id": "550e8400-e29b-41d4-a716-446655440000",
    "content_id": "987e6543-e89b-12d3-a456-426614174999",
    "title": "Hội thoại mua sắm",
    "difficulty": "N5",
    "mode": "segmented",
    "score": 100.0,
    "earned_exp": 15,
    "completed_segments": 5,
    "total_segments": 5,
    "audio_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "user_continuous_recording_url": null,
    "user_continuous_duration_seconds": null,
    "segments": [
      {
        "segment_index": 0,
        "script": "いらっしゃいませ。",
        "start_time_ms": 0,
        "end_time_ms": 1500,
        "recorded": true,
        "recording_id": "aa0e8400-e29b-41d4-a716-446655440001",
        "duration_seconds": 2,
        "playback_url": "http://localhost:8000/api/v1/media/recordings/aa0e8400-e29b-41d4-a716-446655440001"
      }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Lấy thông tin review thành công.
  * `404 Not Found` (`code`: `not_found`): Không tìm thấy attempt.

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
        "is_completed": false
      }
    ],
    "total_items": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.

---

#### `GET /api/v1/dictation/lessons/{lesson_id}`
* **Mục đích**: Lấy đề Dictation đã che đáp án do backend tạo từ các segment trong
  `learning_contents.transcript_ja`. **Tuyệt đối không trả transcript đầy đủ** trước khi nộp.
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
    "audio_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "script": "きょうは ___ (1) ですね。あしたは ___ (2) がふるでしょう。",
    "difficulty": "N5"
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Lấy đề Dictation thành công.
  * `404 Not Found` (`code`: `not_found`): Không tìm thấy đề bài.

---

#### `POST /api/v1/dictation/{content_id}/start`
* **Mục đích**: Khởi tạo một lượt làm Dictation ở trạng thái `in_progress` và trả danh sách segment
  cùng mốc thời gian audio. Response không chứa `script` hoặc đáp án.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**:
  * `content_id` (string, UUID): ID nội dung `shadowing_dictation` đã publish
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (201 Created)**:
  ```json
  {
    "attempt_id": "01912345-6789-7abc-def0-123456789abc",
    "content_id": "01912345-6789-7abc-def0-987654321xyz",
    "attempt_number": 1,
    "audio_url": "https://res.cloudinary.com/kaiwaup/audio/dictation_01.mp3",
    "total_segments": 2,
    "segments": [
      { "segment_index": 0, "start_time_ms": 0, "end_time_ms": 12000 },
      { "segment_index": 1, "start_time_ms": 12000, "end_time_ms": 25000 }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `201 Created`: Attempt được tạo thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Chưa đăng nhập.
  * `404 Not Found` (`code`: `not_found`): Nội dung không tồn tại, chưa publish hoặc sai loại.
  * `409 Conflict` (`code`: `dictation_content_unavailable`): Nội dung thiếu audio hoặc segment hợp lệ.

---

#### `GET /api/v1/dictation/{content_id}/in-progress`
* **Mục đích**: Khôi phục attempt Dictation `in_progress` mới nhất của user cho nội dung đã chọn.
  Response trả metadata audio/segment và các segment đã kiểm tra; không trả script của segment chưa
  kiểm tra.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**:
  * `content_id` (string, UUID): ID nội dung `shadowing_dictation` đã publish
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "attempt_id": "01912345-6789-7abc-def0-123456789abc",
    "content_id": "01912345-6789-7abc-def0-987654321xyz",
    "attempt_number": 1,
    "audio_url": "https://res.cloudinary.com/kaiwaup/audio/dictation_01.mp3",
    "total_segments": 2,
    "segments": [
      { "segment_index": 0, "start_time_ms": 0, "end_time_ms": 12000 },
      { "segment_index": 1, "start_time_ms": 12000, "end_time_ms": 25000 }
    ],
    "checked_segments": [
      {
        "segment_index": 0,
        "is_correct": true,
        "user_answer": "明日の会議の資料ですが",
        "correct_script": "明日の会議の資料ですが、",
        "is_last_segment": false
      }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Attempt đang làm dở được trả thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Chưa đăng nhập.
  * `404 Not Found` (`code`: `not_found`): User không có attempt đang làm dở cho nội dung này.
  * `409 Conflict` (`code`: `dictation_content_unavailable`): Nội dung thiếu audio hoặc segment hợp lệ.

---

#### `POST /api/v1/dictation/segments/check`
* **Mục đích**: Chuẩn hóa và kiểm tra ngay câu trả lời của một segment trong attempt đang thực hiện,
  sau đó lưu kết quả tăng dần vào `exercise_attempts.answer_payload`. Endpoint không hoàn tất attempt,
  tính điểm toàn bài hoặc cấp EXP.
* **Yêu cầu xác thực**: Bearer Token; attempt phải thuộc user hiện tại.
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`, `Content-Type: application/json`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body Schema**:
  ```json
  {
    "attempt_id": "01912345-6789-7abc-def0-123456789abc",
    "segment_index": 0,
    "user_answer": "明日の会議の資料ですが"
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "segment_index": 0,
    "is_correct": true,
    "user_answer": "明日の会議の資料ですが",
    "correct_script": "明日の会議の資料ですが、",
    "is_last_segment": false
  }
  ```
* **Quy tắc chuẩn hóa**: Loại bỏ mọi khoảng trắng và dấu câu Unicode, gồm `。`, `、`, `.`, `,`,
  `?`, `!`, `…` và các dấu ngoặc, trước khi so sánh chính xác. Gửi lại cùng `segment_index` sẽ thay
  thế kết quả cũ, không tạo bản ghi trùng.
* **Dữ liệu lưu trong `answer_payload`**:
  ```json
  {
    "segments": [
      {
        "segment_index": 0,
        "is_correct": true,
        "user_answer": "明日の会議の資料ですが",
        "correct_script": "明日の会議の資料ですが、",
        "is_last_segment": false
      }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Segment được chấm và lưu thành công; attempt vẫn là `in_progress`.
  * `400 Bad Request` (`code`: `invalid_segment_index`): `segment_index` nằm ngoài transcript.
  * `401 Unauthorized` (`code`: `unauthorized`): Chưa đăng nhập.
  * `403 Forbidden` (`code`: `forbidden`): Attempt không thuộc user hiện tại.
  * `404 Not Found` (`code`: `not_found`): Không tìm thấy Dictation attempt.
  * `409 Conflict` (`code`: `dictation_attempt_not_in_progress`): Attempt đã hoàn tất.

---

#### `POST /api/v1/dictation/complete`
* **Mục đích**: Đóng attempt sau khi người dùng hoàn thành các segment hoặc chọn nộp sớm. Backend
  tính điểm dựa trên toàn bộ số segment, cập nhật attempt và cấp EXP theo tỷ lệ segment có câu trả
  lời không rỗng trong cùng một DB transaction. Segment chưa được kiểm tra khi nộp sớm được tính là
  chưa đúng; attempt chưa trả lời segment nào nhận `earned_exp = 0` và không tạo bút toán EXP.
* **Yêu cầu xác thực**: Bearer Token; attempt phải thuộc user hiện tại.
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`, `Content-Type: application/json`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body Schema**:
  ```json
  {
    "attempt_id": "01912345-6789-7abc-def0-123456789abc"
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "attempt_id": "01912345-6789-7abc-def0-123456789abc",
    "status": "completed",
    "score": 100.0,
    "correct_count": 2,
    "total_count": 2,
    "earned_exp": 50,
    "completed_at": "2026-08-13T11:30:00Z"
  }
  ```
* **Quy tắc EXP Dictation**: Tỷ lệ hoàn thành bằng số segment có câu trả lời không rỗng chia cho
  tổng số segment.
  * `0%`: `0 EXP`.
  * Trên `0%` và dưới `5%`: `5 EXP`.
  * Từ `5%` đến dưới `25%`: `15 EXP`.
  * Từ `25%` đến dưới `50%`: `25 EXP`.
  * Từ `50%` đến dưới `75%`: `40 EXP`.
  * Từ `75%` đến `100%`: `50 EXP`.
* **Quy tắc transaction và idempotency**:
  * Cập nhật attempt, tạo `xp_transactions` và cập nhật `user_progress.total_exp` cùng commit hoặc
    cùng rollback.
  * Attempt không có segment nào chứa câu trả lời không rỗng vẫn được hoàn tất nhưng không tạo
    `xp_transactions` và không thay đổi `user_progress.total_exp`.
  * Khóa attempt trong lúc complete; attempt không còn `in_progress` bị từ chối để không cấp EXP
    lần hai.
  * UNIQUE `xp_transactions.attempt_id` là lớp bảo vệ cuối cùng chống ghi sổ EXP trùng.
* **Status Codes & Error Responses**:
  * `200 OK`: Attempt được hoàn tất; response trả EXP đã cấp hoặc `0` nếu chưa trả lời segment nào.
  * `401 Unauthorized` (`code`: `unauthorized`): Chưa đăng nhập.
  * `403 Forbidden` (`code`: `forbidden`): Attempt không thuộc user hiện tại.
  * `404 Not Found` (`code`: `not_found`): Không tìm thấy Dictation attempt.
  * `409 Conflict` (`code`: `dictation_attempt_not_in_progress`): Attempt đã hoàn tất.

---

#### `GET /api/v1/dictation/attempts/{attempt_id}`
* **Mục đích**: Xem lại các câu trả lời đã được kiểm tra, đáp án chuẩn và kết quả của một Dictation
  attempt. Attempt đã hoàn tất trả đủ mọi segment; segment bị bỏ qua khi nộp sớm có
  `user_answer = ""`, `is_correct = false`. Attempt đang làm dở có `score = null`,
  `earned_exp = 0` và chỉ trả các segment đã được kiểm tra để không lộ đáp án còn lại.
* **Yêu cầu xác thực**: Bearer Token; attempt phải thuộc user hiện tại.
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**:
  * `attempt_id` (string, UUID): ID lượt làm Dictation
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "attempt_id": "01912345-6789-7abc-def0-123456789abc",
    "status": "completed",
    "score": 100.0,
    "earned_exp": 50,
    "details": [
      {
        "segment_index": 0,
        "user_answer": "明日の会議の資料ですが",
        "correct_script": "明日の会議の資料ですが、",
        "is_correct": true
      }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Trả thông tin review thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Chưa đăng nhập.
  * `403 Forbidden` (`code`: `forbidden`): Attempt không thuộc user hiện tại.
  * `404 Not Found` (`code`: `not_found`): Không tìm thấy Dictation attempt.

---

### 3.7. Progress / Attempt Module (P0)

#### `GET /api/v1/progress/summary`
* **Mục đích**: Xem tổng quan chỉ số học tập (tổng bài đã hoàn thành, tổng lượt luyện tập, các bài đang làm dở).
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "shadowing_dictation_completed": 12,
    "reflex_completed": 5,
    "listening_translation_completed": 3,
    "total_completed_attempts": 20,
    "total_attempts": 31,
    "in_progress_lessons": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440222",
        "content_id": "770e8400-e29b-41d4-a716-446655440111",
        "content_title": "Thời tiết hôm nay",
        "content_type": "shadowing_dictation",
        "difficulty": "N4",
        "attempt_number": 1
      }
    ]
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
  * `content_type` (optional, string): `shadowing_dictation` | `reflex` | `listening_translation`
  * `content_id` (optional, string, UUID): Lọc theo nội dung cụ thể
  * `q` (optional, string, tối đa 100 ký tự): Tìm kiếm theo tiêu đề bài học (không phân biệt hoa thường)
  * `status` (optional, string): `in_progress` | `completed`
  * `page` (optional, integer, default: `1`)
  * `page_size` (optional, integer, default: `20`, tối đa `100`)
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "880e8400-e29b-41d4-a716-446655440222",
        "content_id": "770e8400-e29b-41d4-a716-446655440111",
        "content_title": "Nghe điền từ: Thời tiết hôm nay",
        "content_type": "shadowing_dictation",
        "attempt_number": 1,
        "status": "completed",
        "score": 100.0,
        "completed_at": "2026-08-06T14:42:00.000Z"
      }
    ],
    "total_items": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Lấy lịch sử thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Chưa đăng nhập.
  * `422 Unprocessable Entity` (`code`: `validation_error`): Tham số filter hoặc pagination không hợp lệ.

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
    "level": 3,
    "level_title": "Level 3",
    "total_exp": 150,
    "current_level_min_exp": 150,
    "next_level_min_exp": 300,
    "exp_to_next_level": 150,
    "recent_exp_history": [
      {
        "id": "a31f5b2c-...",
        "attempt_id": "880e8400-e29b-41d4-a716-446655440222",
        "amount": 10,
        "reason": "Hoàn thành Dictation: Thời tiết hôm nay",
        "created_at": "2026-08-06T14:42:00.000Z"
      }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Chưa đăng nhập.
  * `422 Unprocessable Entity` (`code`: `validation_error`): Tham số `limit` ngoài phạm vi `1..100`.

---

#### `GET /api/v1/gamification/achievements`
* **Mục đích**: Lấy danh sách thành tích/danh hiệu và trạng thái mở khóa của người dùng (khớp với bảng `achievements` và `user_achievements`).
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
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "code": "first_lesson",
        "title": "Bước khởi đầu",
        "description": "Hoàn thành bài học đầu tiên",
        "icon_url": "https://res.cloudinary.com/kaiwaup/badge/first_lesson.png",
        "is_unlocked": true,
        "unlocked_at": "2026-08-01T11:00:00.000Z"
      },
      {
        "id": "223e4567-e89b-12d3-a456-426614174001",
        "code": "shadow_master_1",
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
* **Mục đích**: Lấy bảng xếp hạng theo tổng EXP tuần từ `weekly_leaderboard_entries`. Job snapshot
  sắp `weekly_exp DESC`, sau đó `user_id ASC` trước khi gán `rank`; endpoint trả theo `rank ASC`.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**: Không
* **Query Parameters**:
  * `limit` (optional, integer, default: `50`): Số lượng người dùng top đầu
* **Request Body**: Không
* **Response Schema (200 OK)**:
  ```json
  {
    "week_start": "2026-08-03",
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
    "total_items": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.

---

#### `GET /api/v1/reflex/lessons/{lesson_id}`
* **Mục đích**: Lấy tình huống / câu hỏi bài phản xạ 3 giây (từ `reflex_exercises`).
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
    "audio_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "prompt_ja": "どこで会いましょうか？",
    "scenario_ja": "待ち合わせ場所について",
    "response_start_limit_seconds": 3
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
* **Mục đích**: Lấy danh sách các bài phản xạ đến hạn cần ôn tập lại hôm nay theo thuật toán ngắt quãng (dựa trên bảng `review_schedules` có PK `(user_id, content_id)`).
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
* **Mục đích**: Lấy toàn bộ lịch ôn tập cá nhân và tiến trình ghi nhớ của người dùng.
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
        "description": "Nghe hội thoại ngắn khi đặt chỗ tại nhà hàng.",
        "difficulty": "N3",
        "topic": "Nhà hàng",
        "duration_seconds": 12.0,
        "audio_url": "https://cdn.example.com/translation.mp3",
        "is_completed": false
      }
    ],
    "total_items": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.

---

#### `GET /api/v1/listening-translation/lessons/{lesson_id}`
* **Mục đích**: Lấy metadata và audio của bài tập Nghe & Dịch. Transcript và bản dịch tham khảo không được trả trước khi chấm bài.
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
    "audio_url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "description": "Nghe hội thoại ngắn khi đặt chỗ tại nhà hàng.",
    "difficulty": "N3",
    "topic": "Nhà hàng",
    "duration_seconds": 12.0,
    "is_completed": false
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.
  * `404 Not Found` (`code`: `not_found`): Không tìm thấy bài học.

---

#### `POST /api/v1/listening-translation/lessons/{lesson_id}/submit`
* **Mục đích**: Nộp bản dịch tiếng Việt tự do. Backend lưu lượt làm và bản dịch vào `exercise_attempts.answer_payload`; bài `free_text` không có đáp án cố định nên được chấm qua `ai_evaluations`.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`, `Content-Type: application/json`
* **Path Parameters**:
  * `lesson_id` (string, UUID): ID bài học
* **Query Parameters**: Không
* **Request Body Schema**:
  ```json
  {
    "translation_vi": "Tôi muốn đặt bàn cho 4 người lúc 7 giờ, được không?"
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "attempt_id": "990e8400-e29b-41d4-a716-446655440999",
    "evaluation_id": "880e8400-e29b-41d4-a716-446655440888",
    "status": "completed",
    "exp_earned": 10,
    "score": 82,
    "is_acceptable": true,
    "feedback": "Bản dịch truyền tải đúng ý chính.",
    "covered_ideas": ["Người nói muốn đặt bàn cho 4 người lúc 7 giờ."],
    "missing_ideas": [],
    "suggestions": ["Có thể dùng cách diễn đạt tự nhiên hơn cho câu hỏi cuối."],
    "reference_translation_vi": "Tôi muốn đặt bàn cho 4 người lúc 7 giờ, được không?"
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Nộp bài thành công.
  * `404 Not Found` (`code`: `not_found`): Bài học không tồn tại.
  * `409 Conflict` (`code`: `translation_evaluation_in_progress`): Attempt đang được AI đánh giá.
  * `422 Unprocessable Entity` (`code`: `validation_error`): Bản dịch rỗng hoặc dài quá giới hạn.
  * `429 Too Many Requests` (`code`: `ai_rate_limited`): AI provider giới hạn tần suất.
  * `502 Bad Gateway`: AI provider trả response không hợp lệ hoặc lỗi xác thực provider.
  * `503 Service Unavailable` (`code`: `ai_provider_unavailable`): AI provider không khả dụng.
  * `504 Gateway Timeout` (`code`: `ai_timeout`): AI evaluation quá thời gian; bản dịch và attempt vẫn được lưu để retry.

Submit lưu `translation_vi` và evaluation pending trước khi gọi AI. Retry sau lỗi tái sử dụng cùng
attempt; attempt đã hoàn thành được trả lại từ dữ liệu đã lưu và không cộng EXP lần thứ hai.

---

### 3.14. AI Tutor 1-1 Module (P2)

AI Tutor Phase 2 chỉ hỗ trợ text. API dùng `conversation_id` cho resource phiên hội thoại;
`tutor_sessions.id` và `session_id` chỉ là tên nội bộ ở database. JSON sender dùng lowercase
`user` hoặc `ai`; database có thể lưu enum theo quy ước nội bộ nhưng không được lộ khác biệt này
ra public contract.

#### `POST /api/v1/ai-tutor/conversations`
* **Mục đích**: Khởi tạo conversation từ topic bắt buộc, cấp độ JLPT và scenario tùy chọn do user nhập.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`, `Content-Type: application/json`
* **Path Parameters**: Không
* **Query Parameters**: Không
* **Request Body Schema**:
  ```json
  {
    "topic": "Du lịch Nhật Bản",
    "difficulty": "N3",
    "scenario": "Bạn đang hỏi một người bạn về kế hoạch đi Kyoto."
  }
  ```
  `topic` và `difficulty` bắt buộc. `scenario` tùy chọn; chuỗi scenario rỗng được chuẩn hóa thành
  `null`.
* **Response Schema (201 Created)**:
  ```json
  {
    "conversation_id": "111e8400-e29b-41d4-a716-446655440111",
    "topic": "Du lịch Nhật Bản",
    "difficulty": "N3",
    "scenario": "Bạn đang hỏi bạn bè về kế hoạch đi Kyoto.",
    "status": "active",
    "initial_message": {
      "sender": "ai",
      "sequence_number": 1,
      "text": "こんにちは！日本旅行について話しましょう。どこに行きたいですか？",
      "text_vi": "Xin chào! Hãy cùng nói về chuyến du lịch Nhật Bản nhé. Bạn muốn đi đâu?",
      "created_at": "2026-08-06T14:50:00.000Z",
      "feedback": {
        "grammar_correction": null,
        "natural_expression_tip": null,
        "answer_hints": [
          {
            "text": "京都に行きたいです。",
            "meaning_vi": "Tôi muốn đi Kyoto."
          }
        ]
      }
    }
  }
  ```
* **Status Codes & Error Responses**:
  * `201 Created`: Tạo phiên hội thoại thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Chưa đăng nhập.
  * `503 Service Unavailable` (`code`: `service_unavailable`): AI Gateway chưa sẵn sàng.

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
        "scenario": "Bạn đang hỏi bạn bè về kế hoạch đi Kyoto.",
        "status": "active",
        "last_message_text": "京都に行きたいです。",
        "updated_at": "2026-08-06T14:52:00.000Z"
      }
    ],
    "total_items": 1,
    "page": 1,
    "page_size": 20,
    "total_pages": 1
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Chưa đăng nhập.

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
    "scenario": "Bạn đang hỏi bạn bè về kế hoạch đi Kyoto.",
    "status": "active",
    "started_at": "2026-08-06T14:50:00.000Z",
    "ended_at": null,
    "messages": [
      {
        "id": "msg_01",
        "sender": "ai",
        "sequence_number": 1,
        "text": "こんにちは！日本旅行について話しましょう。どこに行きたいですか？",
        "text_vi": "Xin chào! Hãy cùng nói về chuyến du lịch Nhật Bản nhé. Bạn muốn đi đâu?",
        "created_at": "2026-08-06T14:50:00.000Z",
        "feedback": {
          "grammar_correction": null,
          "natural_expression_tip": null,
          "answer_hints": []
        }
      },
      {
        "id": "msg_02",
        "sender": "user",
        "sequence_number": 2,
        "text": "京都に行きたいです。",
        "text_vi": null,
        "client_message_id": "333e8400-e29b-41d4-a716-446655440333",
        "created_at": "2026-08-06T14:51:00.000Z",
        "feedback": null
      }
    ]
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Chưa đăng nhập.
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
    "text": "京都に行きたいです。お寺を見ます。",
    "client_message_id": "333e8400-e29b-41d4-a716-446655440333"
  }
  ```
* **Response Schema (200 OK)**:
  ```json
  {
    "user_message": {
      "id": "msg_02",
      "sender": "user",
      "sequence_number": 2,
      "text": "京都に行きたいです。お寺を見ます。",
      "text_vi": null,
      "client_message_id": "333e8400-e29b-41d4-a716-446655440333",
      "created_at": "2026-08-06T14:51:00.000Z",
      "feedback": null
    },
    "ai_reply": {
      "id": "msg_03",
      "sender": "ai",
      "sequence_number": 3,
      "text": "京都のお寺はとても綺麗ですよ！金閣寺や清水寺が有名です。どちらに行きたいですか？",
      "text_vi": "Các ngôi chùa ở Kyoto rất đẹp! Kinkaku-ji và Kiyomizu-dera rất nổi tiếng. Bạn muốn đi đâu?",
      "created_at": "2026-08-06T14:51:05.000Z",
      "feedback": {
        "grammar_correction": "Cụm 「お寺を見ます」 đang diễn tả hành động hiện tại. Để nói mong muốn, hãy dùng 「お寺を見たいです」.",
        "natural_expression_tip": "Bạn có thể diễn đạt tự nhiên hơn bằng câu 「京都でお寺めぐりをしたいです」.",
        "answer_hints": [
          {
            "text": "金閣寺に行きたいです。",
            "meaning_vi": "Tôi muốn đi Kinkaku-ji."
          }
        ]
      }
    }
  }
  ```
* **Status Codes & Error Responses**:
  * `200 OK`: Trả lời hội thoại thành công.
  * `403 Forbidden` (`code`: `forbidden`): Không có quyền truy cập phiên hội thoại.
  * `404 Not Found` (`code`: `not_found`): Conversation không tồn tại.
  * `409 Conflict` (`code`: `tutor_conversation_completed`, `tutor_message_idempotency_conflict`
    hoặc `tutor_response_pending`): Conversation đã kết thúc, `client_message_id` được dùng cho text
    khác, hoặc turn trước đã lưu user message nhưng vẫn đang chờ AI reply.
  * `503 Service Unavailable` (`code`: `service_unavailable`): AI Gateway bị sập hoặc quá tải.

---

#### `DELETE /api/v1/ai-tutor/conversations/{conversation_id}`
* **Mục đích**: Xóa vĩnh viễn conversation của user hiện tại cùng toàn bộ message thuộc conversation.
* **Yêu cầu xác thực**: Bearer Token
* **Request Headers**: `Authorization: Bearer <jwt_access_token>`
* **Path Parameters**:
  * `conversation_id` (string, UUID): ID phiên hội thoại
* **Request Body**: Không
* **Response**: `204 No Content`
* **Status Codes & Error Responses**:
  * `204 No Content`: Xóa thành công.
  * `401 Unauthorized` (`code`: `unauthorized`): Chưa đăng nhập.
  * `403 Forbidden` (`code`: `forbidden`): Không có quyền truy cập conversation.
  * `404 Not Found` (`code`: `not_found`): Conversation không tồn tại.

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
* **Tổng số API Endpoints được quy định**: 32 endpoints.

### 4.2. Giả định (Assumptions Made)
1. **YouTube Audio Delivery**: `audio_url` là URL video YouTube được trả trong metadata bài học.
   Frontend phát bằng YouTube player; backend không proxy luồng media.
2. **User Audio Lifecycle**: Audio do người dùng ghi âm được gửi bằng `multipart/form-data` và lưu
   trong private object storage khi nghiệp vụ cần giữ lại. PostgreSQL chỉ lưu metadata và
   `storage_key` trong `recordings`, không lưu BLOB hoặc public URL.
3. **Weekly Leaderboard Reset**: Bảng xếp hạng tuần tự động reset theo chu kỳ tuần dựa trên hàm lọc timestamp `EXP ledger`.

### 4.3. Các mục TODO còn lại
* **TODO-01 (Avatar Upload)**: Endpoint tải ảnh đại diện (`POST /api/v1/users/me/avatar`) tạm thời chưa khai báo do hạ tầng lưu trữ avatar chưa thống nhất trong thiết kế `07-module-design.md`.
* **TODO-02 (AI Tutor Voice Input)**: Endpoint gửi giọng nói trực tiếp cho AI Tutor (`POST /api/v1/ai-tutor/conversations/{id}/voice-messages`) không thuộc Phase 2; sẽ được bổ sung ở giai đoạn sau khi mô hình Voice-to-Voice được chốt.

### 4.4. Đánh giá tính nhất quán tài liệu (Inconsistency Check)
* Đã đối chiếu hoàn toàn khớp với quy tắc đặt tên (`snake_case`), cấu trúc lỗi Envelope (`status`, `code`, `message`, `details`) tại `08-coding-convention.md`.
* Đã hoàn thành khớp 1:1 với schema PostgreSQL tại `05-database.md` (bao gồm `auth_refresh_tokens`, `users.role`, `review_schedules` composite PK, `weekly_leaderboard_entries.week_start` và `achievements.code`).
* Gamification và Dashboard dùng cùng công thức level không giới hạn: level `L` cần tối thiểu
  `25 × L × (L-1)` tổng EXP; từ level `L` lên `L+1` cần thêm `50 × L` EXP.
