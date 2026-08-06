# 08. Coding Convention

## 1. Mục đích

Tài liệu này thống nhất cách viết và tổ chức code trong KaiwaUp để code dễ đọc, dễ review,
dễ kiểm thử và hạn chế khác biệt giữa các thành viên.

Quy ước áp dụng cho toàn bộ monorepo, đặc biệt là:

- Backend FastAPI/Python trong `apps/api`.
- Frontend Next.js/TypeScript trong `apps/web`.
- Các package dùng chung trong `packages`.
- Script, file cấu hình và tài liệu ở thư mục gốc.

Trong tài liệu này:

- **Bắt buộc**: phải tuân thủ; CI, formatter, linter hoặc reviewer có quyền từ chối thay đổi.
- **Khuyến nghị**: nên áp dụng; chỉ làm khác khi có lý do kỹ thuật rõ ràng trong Pull Request.
- File được sinh tự động là ngoại lệ: không sửa thủ công và tuân theo format của công cụ sinh file.

## 2. Nguyên tắc chung

1. Ưu tiên code rõ nghĩa hơn code ngắn.
2. Mỗi module, class và hàm chỉ nên có một trách nhiệm chính.
3. Không lặp lại business rule ở nhiều layer hoặc giữa frontend và backend.
4. FastAPI/OpenAPI là nguồn chuẩn duy nhất cho API contract. Frontend dùng client và type từ
   `@kaiwa-app/api-client`, không tự sao chép schema của backend.
5. Dùng type cụ thể ở mọi boundary: request, response, dependency, service, repository và component
   props. Không dùng `Any`/`any` để né type checking.
6. Validate dữ liệu tại boundary, xử lý business rule trong service và giữ endpoint mỏng.
7. Không commit secret, credential, token, file `.env` hoặc dữ liệu người dùng.
8. Chỉ tối ưu sau khi có nhu cầu hoặc số liệu; không hy sinh tính dễ đọc cho tối ưu suy đoán.

## 3. Cấu trúc thư mục

### 3.1. Cấu trúc monorepo

```text
root/
├── apps/
│   ├── api/                 # FastAPI backend
│   └── web/                 # Next.js frontend
├── packages/
│   └── api-client/          # Contract và client sinh từ OpenAPI
├── scripts/                 # Script dùng ở cấp monorepo
├── docs/                    # Tài liệu dự án
└── package.json             # Lệnh và tooling dùng chung
```

Quy tắc:

- Code chỉ phục vụ một ứng dụng phải nằm trong ứng dụng đó.
- Chỉ đưa code vào `packages/` khi có ít nhất hai consumer thực sự hoặc package có boundary độc lập
  rõ ràng.
- Không import trực tiếp code triển khai giữa `apps/web` và `apps/api`.
- Không tạo package design system dùng chung nếu chưa có quyết định riêng của nhóm.

### 3.2. Backend `apps/api`

```text
apps/api/
├── alembic/                 # Migration database
├── app/
│   ├── api/
│   │   ├── dependencies/    # FastAPI dependencies dùng lại
│   │   └── v1/
│   │       └── endpoints/   # HTTP endpoints theo domain
│   ├── core/                # Config, database, lifespan, logging, security primitives
│   ├── exceptions/          # AppError và global exception handlers
│   ├── models/              # SQLAlchemy ORM models
│   ├── repositories/        # Truy cập và truy vấn dữ liệu
│   ├── schemas/             # Pydantic request/response schemas
│   ├── services/            # Business rules và use cases
│   ├── utils/               # Utility thuần, nhỏ và dùng chung
│   └── main.py              # Application factory và FastAPI app
└── tests/                   # Test backend
```

Luồng phụ thuộc chuẩn:

```text
endpoint -> service -> repository -> database
    |          |
    +------> schema/model, dependency và exception dùng chung
```

- `endpoints/`: chuyển đổi HTTP input/output và gọi service; không chứa truy vấn database hoặc
  business rule dài.
- `services/`: điều phối use case và thực thi business rule; không phụ thuộc vào `Request`,
  `JSONResponse` hoặc chi tiết giao diện.
- `repositories/`: chỉ chịu trách nhiệm truy cập dữ liệu; không quyết định HTTP status hoặc message
  hiển thị cho người dùng.
- `schemas/`: model Pydantic công khai tại boundary API; tách request/response khi quyền ghi và quyền
  đọc khác nhau.
- `models/`: ánh xạ database; không trả trực tiếp ORM model ra API nếu response schema chưa lọc field.
- `core/`: hạ tầng dùng toàn ứng dụng. Không đặt business rule của một domain cụ thể vào đây.
- `utils/`: không phải nơi gom code không biết đặt ở đâu. Nếu utility chỉ thuộc một domain, đặt gần
  domain đó.

Khi thêm một domain mới, dùng cùng tên domain giữa các layer, ví dụ:
`endpoints/lesson.py`, `services/lesson.py`, `repositories/lesson.py`, `schemas/lesson.py` và
`models/lesson.py`.

### 3.3. Frontend `apps/web`

```text
apps/web/src/
├── app/                     # Route, layout và code được colocate theo App Router
├── components/
│   ├── ui/                  # UI primitive từ thư viện như shadcn/ui
│   ├── common/              # Component dùng chung do dự án tự xây dựng
│   └── layouts/             # Thành phần bố cục dùng lại giữa nhiều route
├── hooks/                   # Custom hook thực sự dùng chung toàn ứng dụng
├── lib/                     # Client, adapter và helper dùng chung, không phụ thuộc UI
└── types/                   # Type nội bộ thực sự dùng chung, không thuộc API contract
```

Chỉ tạo thư mục khi đã có code cần đặt vào đó. Không đưa file vào thư mục cấp `src` chỉ vì chưa xác
định được vị trí phù hợp.

#### 3.3.1. Component dùng chung

- `components/ui/` chứa UI primitive hoặc component được cài/sinh từ thư viện UI như shadcn/ui,
  ví dụ `button.tsx`, `dialog.tsx`, `input.tsx`. Hạn chế đưa business logic vào các component này và
  giữ public API gần với thư viện gốc để việc cập nhật dễ dàng.
- `components/common/` chứa component do đội phát triển xây dựng và được sử dụng tại nhiều route
  hoặc feature, ví dụ `empty-state.tsx`, `audio-player.tsx`, `page-header.tsx`.
- `components/layouts/` chứa các khối bố cục dùng lại như application shell, header, sidebar hoặc
  navigation. Next.js route layout vẫn phải đặt trong file `layout.tsx` của route segment tương ứng.
- Có thể tạo thêm thư mục con theo một trách nhiệm ổn định, ví dụ `components/forms/` hoặc
  `components/feedback/`, khi số lượng component đủ lớn. Không tạo taxonomy sâu chỉ cho một hoặc hai
  file.

Một component chỉ được chuyển lên `src/components/` khi nó có contract đủ tổng quát và được dùng lại
thực sự ngoài route/feature ban đầu. Component chỉ tình cờ có giao diện tương tự nhưng mang business
rule khác nhau không nên bị ép dùng chung.

#### 3.3.2. Colocation theo route/feature

Code chỉ phục vụ một route hoặc một nhánh route phải được đặt gần route đó. Dùng private folder bắt
đầu bằng `_` để tổ chức code mà không tạo thêm URL segment.

Ví dụ với route `/dashboard`:

```text
app/
└── dashboard/
    ├── _components/
    │   ├── sidebar/
    │   │   └── dashboard-sidebar-nav.tsx
    │   ├── dashboard-content.tsx
    │   ├── dashboard-empty-state.tsx
    │   └── dashboard-metric-card.tsx
    ├── _hooks/
    │   ├── use-dashboard.ts
    │   └── use-roadmap-table.ts
    ├── _types/
    │   └── dashboard.types.ts
    ├── _utils/
    │   ├── dashboard-greeting.ts
    │   └── formatters.ts
    ├── error.tsx
    ├── loading.tsx
    └── page.tsx
```

- `_components/` chứa component chỉ dùng trong route hiện tại hoặc các route con của nó.
- `_hooks/` chứa client hook riêng của feature. Chỉ tạo hook khi cần stateful React logic; hàm thuần
  phải đặt trong `_utils/`.
- `_types/` chứa type nội bộ của feature. Request/response type của API vẫn phải import từ
  `@kaiwa-app/api-client`.
- `_utils/` chứa hàm thuần và helper riêng của feature; không dùng làm nơi chứa business service hoặc
  side effect không rõ ràng.
- Có thể bổ sung private folder như `_actions/`, `_lib/` hoặc `_constants/` khi route thực sự cần.
  Tên folder phải phản ánh đúng trách nhiệm và không trùng lặp vai trò với folder khác.
- Nếu code được dùng chung cho cả một nhánh route, đặt nó ở route cha gần nhất thay vì chuyển thẳng
  lên `src`.
- Chỉ promote file từ private folder lên `src/components`, `src/hooks`, `src/lib` hoặc `src/types`
  khi file được dùng bởi nhiều route/feature và không còn phụ thuộc vào context riêng của route cũ.

#### 3.3.3. Quy tắc App Router

- Mọi route nằm trong `src/app/` và dùng folder-based routing của App Router.
- Dùng Server Component mặc định. Chỉ thêm `"use client"` khi cần event handler, React client hook
  hoặc browser API, và giữ client boundary nhỏ nhất có thể.
- Dùng các file chuẩn `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx` và `not-found.tsx` đúng vai
  trò của App Router.
- Dữ liệu ban đầu được tải ở Server Component, Server Action hoặc Route Handler; không dùng
  `useEffect` chỉ để tải dữ liệu ban đầu từ server.
- CSS token và style toàn cục đặt tại `src/app/globals.css`; ưu tiên Tailwind utility cho component.

### 3.4. Package API client

- `packages/api-client` chỉ chứa API type/client được sinh từ OpenAPI và public exports cần thiết.
- Không sửa file generated bằng tay.
- Khi API contract thay đổi, phải cập nhật OpenAPI và chạy lại quá trình generate client trước khi
  merge.
- Ứng dụng web import qua package public `@kaiwa-app/api-client`, không import đường dẫn nội bộ của
  package.

## 4. Quy tắc đặt tên

### 4.1. Quy tắc chung

| Thành phần                             | Quy ước                       | Ví dụ                               |
| -------------------------------------- | ----------------------------- | ----------------------------------- |
| Python file/module                     | `snake_case`                  | `datetime_utils.py`                 |
| Python function/variable               | `snake_case`                  | `get_db_session`                    |
| Python class/type alias                | `PascalCase`                  | `UserService`, `DatabaseSession`    |
| Python constant                        | `UPPER_SNAKE_CASE`            | `HTTP_ERROR_CODES`                  |
| React component/type/interface         | `PascalCase`                  | `LessonCard`, `LessonCardProps`     |
| TypeScript function/variable           | `camelCase`                   | `fetchLessons`, `pageSize`          |
| TypeScript constant bất biến toàn cục  | `UPPER_SNAKE_CASE`            | `MAX_UPLOAD_SIZE`                   |
| Custom React hook                      | `use` + `PascalCase`          | `useRecorder`                       |
| URL path                               | danh từ số nhiều, `kebab-case` | `/api/v1/practice-sessions`         |
| Environment variable                   | `UPPER_SNAKE_CASE`            | `DATABASE_URL`                      |
| Database table/column                  | `snake_case`                  | `practice_sessions`, `created_at`   |
| Error code/API machine-readable value  | `snake_case`                  | `validation_error`, `not_found`     |
| CSS custom property                    | `--kebab-case`                | `--color-background`                |

Tên phải diễn đạt mục đích, tránh tên mơ hồ như `data`, `info`, `temp`, `obj`, `manager` nếu có thể
dùng tên domain cụ thể. Các biến ngắn như `i` chỉ dùng trong phạm vi vòng lặp rất nhỏ.

### 4.2. Backend

- Endpoint handler bắt đầu bằng động từ và nêu rõ hành động: `list_lessons`, `get_lesson`,
  `create_lesson`, `update_lesson`, `delete_lesson`.
- Class theo layer dùng hậu tố nhất quán: `LessonService`, `LessonRepository`, `LessonCreate`,
  `LessonUpdate`, `LessonResponse`.
- Dependency factory bắt đầu bằng `get_`; reusable dependency alias dùng `PascalCase`, ví dụ
  `DatabaseSession`, `CurrentUser`.
- Boolean bắt đầu bằng `is_`, `has_`, `can_` hoặc `should_` khi phù hợp.
- Hàm async không thêm hậu tố `_async`; bản thân `async def` đã thể hiện cơ chế thực thi.
- Không dùng tên có từ viết tắt khó hiểu. Từ viết tắt phổ biến được viết như một từ: `user_id`,
  `api_client`, `HttpClient`.

### 4.3. Frontend

- File component dùng `kebab-case.tsx`, ví dụ `lesson-card.tsx`; tên export vẫn dùng `PascalCase`.
- File không phải component dùng `kebab-case.ts`, ví dụ `format-duration.ts`.
- Props có tên theo component: `LessonCardProps`.
- Event handler nội bộ bắt đầu bằng `handle`, prop callback bắt đầu bằng `on`: `handleSubmit`,
  `onSubmit`.
- Không đặt tên component theo cách triển khai như `BlueBox`; đặt theo vai trò như `ProgressCard`.
- Route segment dùng `kebab-case`; dynamic segment dùng tên domain rõ nghĩa, ví dụ `[lessonId]`.

## 5. Format code

### 5.1. Quy tắc được cấu hình tự động

| Phạm vi                 | Công cụ             | Quy tắc chính                                                   |
| ----------------------- | ------------------- | --------------------------------------------------------------- |
| Toàn repo               | EditorConfig        | UTF-8, LF, final newline, bỏ trailing whitespace                |
| Python                  | Ruff                | 4 spaces, line length 100, target Python 3.12                   |
| TypeScript/JavaScript   | Prettier + ESLint   | 2 spaces, double quote, semicolon, trailing comma, width 100    |
| JSON                    | Prettier            | 2 spaces, width 80                                              |
| Markdown/YAML/CSS/HTML  | Prettier            | Theo cấu hình Prettier ở root                                   |
| Makefile                | EditorConfig        | Tab                                                             |

Không căn chỉnh thủ công bằng nhiều khoảng trắng. Không tranh luận style đã được formatter quyết
định; chạy formatter và commit kết quả.

### 5.2. Python

- Viết type annotation cho tham số và kiểu trả về của hàm public.
- Dùng cú pháp Python hiện tại: `str | None`, `list[str]`, `dict[str, int]`; không dùng kiểu cũ
  `Optional`, `List`, `Dict` nếu không có lý do tương thích.
- Dùng `collections.abc` cho kiểu collection dùng trong annotation, ví dụ `AsyncIterator`,
  `Mapping`.
- Dùng keyword-only arguments (`*`) khi lời gọi có nhiều tham số cùng kiểu hoặc ý nghĩa không rõ.
- Docstring giải thích **vì sao**, contract hoặc ràng buộc khó thấy; không lặp lại điều code đã nói.
- Không dùng `...` làm default cho Pydantic field hoặc FastAPI parameter bắt buộc.

### 5.3. TypeScript và React

- Bật và giữ nguyên strict typing; không giảm mức kiểm tra trong `tsconfig.json` để sửa lỗi cục bộ.
- Ưu tiên `type` cho union, composition và props. Chỉ dùng `interface` khi cần declaration merging
  hoặc một contract hướng object rõ ràng.
- Không dùng `React.FC`; khai báo props trực tiếp trong chữ ký hàm.
- Tránh type assertion (`as`) nếu có thể thu hẹp type bằng validation hoặc control flow.
- Không dùng non-null assertion (`!`) trừ khi invariant đã được chứng minh và có giải thích.
- JSX dùng semantic HTML trước `div`; component phải hỗ trợ keyboard và accessibility phù hợp.
- Với danh sách render, dùng key ổn định từ domain; không dùng index nếu thứ tự có thể thay đổi.

## 6. Import và export

### 6.1. Python

Ruff rule `I` tự sắp import thành ba nhóm, cách nhau một dòng:

1. Standard library.
2. Third-party package.
3. Module nội bộ `app`.

```python
from collections.abc import AsyncIterator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
```

- Dùng absolute import bắt đầu từ `app` cho code backend.
- Không dùng wildcard import (`from module import *`).
- Import từ public module khi đã có public export; không vượt qua boundary để import chi tiết nội bộ.
- Chỉ alias khi tránh xung đột hoặc làm rõ vai trò, ví dụ `router as health_router`.
- Import model trong `app/models/__init__.py` khi Alembic cần model đó có mặt trong `Base.metadata`.

### 6.2. TypeScript/JavaScript

- ESLint `perfectionist/sort-imports` và `sort-exports` quyết định thứ tự import/export.
- Dùng alias `@/*` cho module trong `apps/web/src`; tránh chuỗi relative path dài như
  `../../../components/...`.
- Dùng `import type` hoặc inline type import cho dependency chỉ dùng ở type position.
- Node built-in dùng prefix `node:`, ví dụ `node:path`.
- Không dùng barrel file đại trà. Chỉ tạo public `index.ts` tại boundary của package/module khi nó
  giúp kiểm soát API công khai và không tạo dependency cycle.
- Ưu tiên named export cho module dùng lại. Các file Next.js yêu cầu default export như `page.tsx`,
  `layout.tsx` và config vẫn dùng default export.

## 7. Backend FastAPI

### 7.1. Endpoint và router

- Mỗi HTTP operation có một handler riêng.
- Khai báo `prefix`, `tags` và dependency dùng chung ở `APIRouter` gần endpoint nhất.
- Router cấp cao chỉ compose router con và version prefix; không chứa business logic.
- Handler phải khai báo kiểu trả về hoặc `response_model` để FastAPI validate, filter và document
  response.
- Dùng `response_model` khi kiểu object nội bộ khác schema công khai; không bỏ response schema chỉ
  để tránh lỗi validation.
- Dùng status code đúng semantics và khai báo rõ status code khác mặc định.
- Không đưa version vào từng endpoint; version được compose ở router cấp cao qua `/api/v1`.

### 7.2. Dependency injection

- Dùng `Annotated[..., Depends(...)]` và tạo alias khi dependency được tái sử dụng.
- Dependency quản lý resource phải dùng `yield` để cleanup, như database session.
- Áp dụng dependency dùng chung ở router level thay vì lặp lại trên mọi handler.
- Không gọi trực tiếp dependency factory từ business service. Service nhận dependency qua
  constructor hoặc tham số hàm.

### 7.3. Async và blocking I/O

- Dùng `async def` khi toàn bộ I/O bên trong hỗ trợ async và được `await` đúng cách.
- Dùng `def` cho thư viện blocking; FastAPI sẽ chạy path operation/dependency sync trong thread
  pool.
- Không gọi blocking I/O trực tiếp trong `async def` vì sẽ chặn event loop.
- Các tác vụ độc lập có thể chạy đồng thời; tránh request waterfall không cần thiết.
- Không tạo background task cho công việc cần bảo đảm hoàn thành nếu chưa có queue và retry phù hợp.

### 7.4. Pydantic schema và SQLAlchemy model

- Schema request/response là contract API; ORM model là contract lưu trữ. Không dùng một class cho
  cả hai mục đích.
- Field bắt buộc không cần default `...`; field tùy chọn phải thể hiện bằng type và default rõ ràng.
- Dùng `Field` cho constraint có thể validate tại boundary như `ge`, `le`, `min_length`.
- Dùng generic response dùng chung khi cấu trúc thực sự giống nhau, ví dụ `PaginatedResponse[T]`.
- SQLAlchemy dùng typed declarative mapping: `Mapped[...]` và `mapped_column(...)`.
- Dùng timezone-aware `datetime`; lấy thời gian ứng dụng qua utility UTC như `utc_now()`.
- Thay đổi schema database phải đi kèm Alembic migration; không chỉnh database production thủ công.

## 8. Xử lý lỗi

### 8.1. Phân loại lỗi

| Loại lỗi                    | Cách xử lý                                                               |
| --------------------------- | ------------------------------------------------------------------------ |
| Input không hợp lệ          | Để Pydantic/FastAPI validate; global handler trả `validation_error`      |
| Business error dự kiến      | Raise subclass của `AppError` với status/code/message phù hợp            |
| HTTP/routing error          | Để `StarletteHTTPException` đi qua global handler                        |
| Lỗi hạ tầng có thể chuyển đổi | Repository/service chuyển thành `AppError` phù hợp, giữ exception chain |
| Lỗi không dự kiến           | Để global handler log stack trace và trả `internal_error`                |

Mọi lỗi API dùng một envelope nhất quán:

```json
{
  "error": {
    "status": 422,
    "code": "validation_error",
    "message": "Request validation failed",
    "details": []
  }
}
```

Quy tắc:

- `code` ổn định, dùng `snake_case` và dành cho xử lý bằng máy; `message` dành cho con người.
- Không trả stack trace, SQL, secret, đường dẫn hệ thống hoặc nội dung exception nội bộ cho client.
- Không `except Exception` rồi bỏ qua lỗi hoặc chỉ trả `None`/`False`.
- Chỉ catch exception khi có thể xử lý, bổ sung context hoặc chuyển sang lỗi domain rõ nghĩa.
- Khi chuyển exception, dùng `raise NewError(...) from exc` để giữ nguyên nguyên nhân.
- Không dùng exception cho nhánh điều khiển bình thường.
- Frontend biểu diễn lỗi dự kiến bằng typed result/state; lỗi render không dự kiến đi tới
  `error.tsx` gần nhất.
- Chỉ tự động retry operation idempotent. Mutation chỉ retry khi đã có chiến lược idempotency.

## 9. Logging

Backend dùng module `logging` chuẩn của Python và cấu hình tập trung tại
`app/core/logging.py`.

```python
import logging

logger = logging.getLogger(__name__)

logger.info(
    "Lesson attempt completed",
    extra={"user_id": user_id, "lesson_id": lesson_id},
)
```

### 9.1. Mức log

| Level       | Khi sử dụng                                                                  |
| ----------- | --------------------------------------------------------------------------- |
| `DEBUG`     | Chi tiết chẩn đoán cho development; không bật mặc định ở production         |
| `INFO`      | Sự kiện nghiệp vụ/hệ thống quan trọng đã hoàn thành                          |
| `WARNING`   | Tình huống bất thường nhưng request/hệ thống vẫn tiếp tục                    |
| `ERROR`     | Operation thất bại và cần điều tra; kèm exception context khi có             |
| `CRITICAL`  | Hệ thống không thể tiếp tục hoặc mất một dependency thiết yếu                |

Quy tắc:

- Tạo logger theo module bằng `logging.getLogger(__name__)`; không dùng `print()` để log.
- Message ngắn, ở dạng sự kiện, không nối chuỗi chứa dữ liệu động. Đưa context vào `extra`.
- Khi log exception, dùng `logger.exception(...)` trong `except` hoặc `exc_info=exc` tại handler.
- Gắn `request_id` vào log và response khi request context cung cấp giá trị này.
- Không log password, access/refresh token, cookie, authorization header, secret, toàn bộ request
  body hoặc dữ liệu cá nhân nhạy cảm.
- Không log cùng một exception ở nhiều layer. Log tại nơi có đủ context và chịu trách nhiệm xử lý.
- Không dùng log để thay thế metric, audit log hoặc persistence nghiệp vụ.

## 10. Quy tắc frontend

- Mọi trạng thái có ý nghĩa phải được xử lý có chủ đích: pending, empty, error và success.
- Validate input mutation ở phía server trước khi gọi API. Validation phía client chỉ cải thiện UX,
  không thay thế backend validation và authorization.
- Authentication, authorization và rate limiting có thẩm quyền nằm ở FastAPI/hạ tầng; client-side
  guard không phải lớp bảo mật.
- Secret và credential đặc quyền chỉ tồn tại trong server-only module; không đưa vào biến
  `NEXT_PUBLIC_*`.
- Ưu tiên `next/image` cho ảnh ứng dụng và khai báo kích thước rõ ràng.
- Ưu tiên `next/font` cho font dùng chung và cấu hình tại root layout.
- Layout responsive theo hướng mobile-first; màu và spacing dùng Tailwind token/CSS custom property
  thay vì hard-code tùy ý.
- Chỉ dùng optimistic UI khi đã định nghĩa rollback hoặc reconciliation.

## 11. Comment, docstring và TODO

- Comment giải thích quyết định, ràng buộc hoặc lý do; không diễn giải lại từng dòng code.
- Public API hoặc logic phức tạp nên có docstring/TSDoc ngắn mô tả contract, side effect và exception
  quan trọng.
- TODO phải có hành động cụ thể và issue/người chịu trách nhiệm khi có thể:

```python
# TODO(#123): Remove the compatibility path after all clients migrate to v2.
```

- Không để commented-out code; Git đã lưu lịch sử.
- Ngôn ngữ trong identifier, code comment, log và API message là tiếng Anh để nhất quán với hệ sinh
  thái kỹ thuật. Tài liệu nghiệp vụ và nội dung hiển thị cho người dùng có thể dùng tiếng Việt hoặc
  tiếng Nhật theo yêu cầu sản phẩm.

## 12. Cấu hình, bảo mật và dữ liệu

- Đọc cấu hình qua `Settings`; không đọc `os.environ` rải rác trong business code.
- Giá trị mặc định chỉ dành cho local development và không được là secret thực.
- Cập nhật `.env.example` khi thêm biến môi trường mới, nhưng chỉ dùng giá trị giả an toàn.
- Dùng query parameterization/SQLAlchemy expression; không ghép chuỗi SQL từ input.
- Luôn kiểm tra authorization ở backend trước khi đọc hoặc thay đổi resource.
- Dữ liệu từ URL, header, cookie, form, file upload, API bên ngoài và database đều được xem là không
  tin cậy tại boundary tương ứng.
- Không lưu timestamp naive; chuẩn hóa về UTC trong backend và chỉ chuyển timezone khi hiển thị.

## 13. Chất lượng hàm và module

- Hàm nên ngắn và cùng một mức trừu tượng. Tách helper khi nó có tên miền rõ ràng, được dùng lại hoặc
  giúp cô lập logic cần test; không tách chỉ để giảm số dòng.
- Tránh boolean flag làm một hàm thực hiện hai hành vi khác nhau; ưu tiên hai hàm có tên rõ nghĩa.
- Ưu tiên early return để giảm nesting.
- Không tạo abstraction trước khi có pattern lặp ổn định.
- Dependency direction phải đi từ layer ngoài vào abstraction/layer trong; tránh import cycle.
- Side effect phải dễ nhận biết qua tên hàm và vị trí layer.
- Xóa import, biến, branch và dependency không dùng.

## 14. Lệnh kiểm tra trước khi commit

### 14.1. Toàn repo và frontend

```bash
pnpm format:check
pnpm lint:web
pnpm build:web
```

`pnpm build:web` bắt buộc khi thay đổi routing, rendering boundary, cấu hình Next.js hoặc hành vi
production. Với thay đổi frontend nhỏ, ít nhất phải chạy `pnpm lint:web`.

### 14.2. Backend

```bash
uv --directory apps/api run ruff check .
uv --directory apps/api run ruff format --check .
uv --directory apps/api run mypy
uv --directory apps/api run pytest
```

Chỉ chạy kiểm tra liên quan trong lúc phát triển, nhưng trước khi merge phải bảo đảm toàn bộ kiểm tra
bị ảnh hưởng đều pass. Không thêm `noqa`, `type: ignore` hoặc tắt ESLint rule chỉ để làm pipeline xanh;
nếu suppression là cần thiết, giữ phạm vi nhỏ nhất và ghi rõ lý do.

Husky và lint-staged tự động format/lint file đã stage, nhưng đây không thay thế việc chạy build,
type check và test phù hợp.

## 15. Checklist review nhanh

- [ ] Tên file, symbol, route, error code và database object đúng quy ước.
- [ ] Code nằm đúng ứng dụng, package và layer.
- [ ] Endpoint/component mỏng; business rule không bị lặp.
- [ ] Request, response, props và hàm public có type rõ ràng.
- [ ] Import được sắp xếp; không có dependency cycle hoặc deep import vượt boundary.
- [ ] Lỗi dự kiến dùng contract chung; lỗi nội bộ không rò rỉ ra client.
- [ ] Log có context cần thiết và không chứa dữ liệu nhạy cảm.
- [ ] Thay đổi API đã cập nhật OpenAPI/generated client liên quan.
- [ ] Thay đổi database có Alembic migration.
- [ ] Formatter, linter, type checker, test và build liên quan đã pass.
