# 11. Deployment và CD

## 1. Kiến trúc P0

KaiwaUP dùng các gói miễn phí, tách theo đúng trách nhiệm của từng thành phần:

- Frontend Next.js: Vercel.
- Backend FastAPI: Render Web Service chạy Docker.
- PostgreSQL 18+: Neon; URL pooled dùng cho ứng dụng, URL direct dùng riêng cho Alembic.
- Bản ghi âm người dùng: Cloudinary; production không ghi file vào ổ đĩa tạm của Render.
- CI/CD: GitHub Actions; chỉ release commit `master` đã pass CI.

Trình duyệt gọi API qua đường dẫn cùng origin `/api/v1/...` của Vercel. Rewrite trong Next.js
chuyển tiếp request đến Render, giúp refresh cookie dùng `SameSite=lax` và không phụ thuộc vào
third-party cookie. Server Component gọi Render bằng biến server-only `API_BASE_URL`.

Render Free có thể sleep khi không hoạt động nên lần gọi đầu có thể chậm. Kiến trúc P0 phù hợp
demo/MVP, không phải cấu hình có SLA production trả phí.

## 2. Phân kỳ triển khai

### Phase 1: deployment thủ công

Phase 1 đưa ứng dụng lên chạy trước khi có quyền quản trị repository:

1. Hoàn tất production hardening, migration, test, frontend build và Docker smoke check.
2. Push nhánh triển khai và tạo pull request để cố định commit được đưa lên demo.
3. Tạo Neon và Cloudinary, sau đó cấu hình secrets trực tiếp trên từng provider.
4. Tạo Render service với Auto-Deploy tắt, chạy migration bằng Neon direct URL và deploy backend
   thủ công từ commit đã chọn.
5. Khi `/api/v1/ready` pass, cấu hình `API_BASE_URL` và deploy frontend bằng Vercel CLI hoặc
   Dashboard.
6. Smoke test frontend, proxy `/api`, auth và recording; ghi lại URLs cùng release SHA.

Phase này không yêu cầu GitHub Environment hoặc branch protection. Với private organization
repository, Render/Vercel GitHub App vẫn có thể cần organization owner phê duyệt trước khi provider
đọc được source. Không công khai repository hoặc Docker image để né giới hạn này.

### Phase 2: bật CD sau khi admin phê duyệt

Repository admin hoặc custom role tương đương cấu hình `production` environment, deployment
protection và branch protection cho `master`. Sau đó thêm các secrets/variables ở mục 4.5 và bật
workflow release. Manual deployment của Phase 1 vẫn là đường phục hồi khi CD gặp sự cố.

## 3. Luồng phát hành CD

Pull request vào `dev` hoặc `master` chạy CI:

1. Backend: Ruff, format, mypy, migration trên PostgreSQL 18, pytest và Docker build.
2. Frontend: lint, typecheck, kiểm tra generated API client, format và production build.

Push/merge vào `master` chạy lại CI. Chỉ khi CI thành công, workflow `Deploy production` mới:

1. Checkout đúng commit đã được CI kiểm tra.
2. Chạy Alembic bằng Neon direct connection.
3. Yêu cầu Render deploy đúng SHA đó và chờ `/api/v1/ready` trả về cùng `release_sha`.
4. Build/deploy frontend lên Vercel.
5. Smoke test trang đăng nhập và `/api/v1/auth/refresh` qua proxy cùng origin.

Workflow dùng GitHub Environment `production` và khóa concurrency để hai release không chạy chồng
lên nhau. Migration production không tự `stamp`; revision lạ hoặc migration lỗi sẽ dừng release.

## 4. Thiết lập một lần

### 4.1. Neon

1. Tạo project PostgreSQL 18 hoặc mới hơn, ưu tiên region Singapore.
2. Lấy hai connection string dùng cùng database/schema:
   - Pooled URL cho `DATABASE_URL` của Render.
   - Direct URL cho GitHub secret `NEON_MIGRATION_DATABASE_URL`.
3. Chuyển scheme sang `postgresql+asyncpg://`, URL-encode password, và dùng query
   `?ssl=require` cho SQLAlchemy/asyncpg. Không giữ tham số `channel_binding` dành cho libpq trong
   URL ứng dụng này.
4. Không chạy full demo seed trên staging/production. Nếu cần dữ liệu bài học ban đầu, dùng các script
   seed nội dung riêng đã được review.

### 4.2. Cloudinary

1. Tạo tài khoản/project Cloudinary.
2. Lấy `CLOUDINARY_URL` từ dashboard.
3. Không đưa URL này vào repository hoặc `NEXT_PUBLIC_*`.

### 4.3. Render

1. Tạo Blueprint từ repository và file `render.yaml`.
2. Điền các giá trị `sync: false` khi Render yêu cầu:
   - `DATABASE_URL`: Neon pooled URL.
   - `CORS_ORIGINS`: JSON array chứa URL frontend, ví dụ `["https://kaiwa.example"]`.
   - `CLOUDINARY_URL`: secret của Cloudinary.
3. Giữ Auto-Deploy ở trạng thái tắt; GitHub Actions là nguồn duy nhất phát hành production.
4. Sau deploy đầu tiên, lấy:
   - Backend URL, ví dụ `https://kaiwa-api.onrender.com`.
   - Secret Deploy Hook URL trong Render Settings.

`JWT_SECRET_KEY` được Blueprint yêu cầu Render tạo ngẫu nhiên. Cookie production bắt buộc Secure.
Scheduler leaderboard bị tắt trên free web process vì job trong-process không có đảm bảo chạy đúng
lịch khi instance sleep; rebuild có thể chạy thủ công cho P0.

### 4.4. Vercel

1. Import repository dưới dạng monorepo.
2. Chọn Root Directory `apps/web`, Framework Preset `Next.js`, và bật quyền truy cập source bên
   ngoài Root Directory để dùng `packages/api-client`.
3. Thêm production environment variable:
   - `API_BASE_URL=https://<render-service>.onrender.com`
4. Không cấu hình `NEXT_PUBLIC_API_BASE_URL` trong production; browser phải dùng `/api` cùng origin.
5. Có thể giữ Git integration để tạo PR Preview. Trong Ignored Build Step, bật system environment
   variables và dùng lệnh dưới đây để `master` chỉ được deploy bởi workflow sau CI:

   ```sh
   if [ "$VERCEL_GIT_COMMIT_REF" = "master" ]; then exit 0; else exit 1; fi
   ```

6. Tạo Vercel access token và lấy Team/Account ID cùng Project ID.

Preview chỉ hoạt động đầy đủ khi preview environment có `API_BASE_URL` trỏ đến backend staging hoặc
backend demo được phép dùng. Không trỏ preview không tin cậy vào database production.

### 4.5. GitHub Actions

Tạo repository/environment secrets:

| Tên | Giá trị |
| --- | --- |
| `NEON_MIGRATION_DATABASE_URL` | Neon direct connection string |
| `RENDER_DEPLOY_HOOK_URL` | Secret deploy hook URL của Render |
| `VERCEL_TOKEN` | Vercel access token |
| `VERCEL_ORG_ID` | Vercel Team hoặc Account ID |
| `VERCEL_PROJECT_ID` | ID project frontend |

Tạo repository variable:

| Tên | Giá trị |
| --- | --- |
| `RENDER_BACKEND_URL` | URL Render không có dấu `/` cuối |

Nên cấu hình branch protection cho `master`: yêu cầu pull request, CI pass và không cho push trực
tiếp. Nếu repository hỗ trợ protected environment, thêm required reviewer cho environment
`production` khi nhóm muốn bước duyệt thủ công trước release.

## 5. Biến môi trường backend production

Các biến bắt buộc hoặc được Blueprint đặt:

- `ENVIRONMENT=production`
- `DEBUG=false`
- `DATABASE_URL=<Neon pooled URL>`
- `JWT_SECRET_KEY=<random secret ít nhất 32 ký tự>`
- `CORS_ORIGINS=["https://<frontend-domain>"]`
- `REFRESH_COOKIE_SECURE=true`
- `REFRESH_COOKIE_SAMESITE=lax`
- `CLOUDINARY_URL=<secret>`
- `LEADERBOARD_REBUILD_ENABLED=false`

`MIGRATION_DATABASE_URL` chỉ dùng trong GitHub Actions, không cần cấp cho web process. Render tự cung
cấp `RENDER_GIT_COMMIT`; health/readiness công khai SHA này để workflow xác minh release.

Các AI provider mặc định là `fake` để P0 không phát sinh chi phí. Khi bật provider thật, thêm secret
phía backend và ngân sách/rate limit trước khi chuyển cấu hình provider.

## 6. Seed và migration

- Full demo seed yêu cầu `DEMO_SEED_PASSWORD` ở local và bị chặn hoàn toàn ở staging/production.
- Không dùng `alembic stamp head` để bỏ qua revision không nhận diện được.
- Migration phải tương thích ngược với phiên bản backend đang chạy vì schema được nâng cấp trước khi
  deploy backend. Với thay đổi phá vỡ contract, dùng quy trình expand → deploy → migrate data →
  contract trong nhiều release.
- Không tự động downgrade production. Migration có mất dữ liệu phải có backup và runbook riêng.

## 7. Smoke check và rollback

Một release thành công khi:

- `/api/v1/ready` trả `status=ready`, `database=ok` và đúng SHA đã deploy.
- Frontend truy cập được.
- Request refresh không đăng nhập qua `/api/v1/auth/refresh` trả `401`, chứng minh proxy hoạt động.

Nếu backend fail trước khi frontend deploy, workflow dừng và frontend cũ được giữ nguyên. Rollback
code bằng cách revert commit trên `master` để tạo release mới có lịch sử rõ ràng. Có thể promote lại
deployment Vercel trước đó khi lỗi chỉ nằm ở frontend. Nếu lỗi liên quan schema, không downgrade mù;
khôi phục theo migration runbook và backup đã chuẩn bị.

## 8. Giới hạn P0 và bước tiếp theo

- Render Free có cold start và không phù hợp job định kỳ đáng tin cậy.
- Chưa có backend preview riêng cho từng PR.
- Chưa tự động backup/restore rehearsal ngoài khả năng do Neon cung cấp.
- Chưa có synthetic monitoring hoặc cảnh báo ngoài smoke test sau deploy.

P1 nên bổ sung backend staging, content-only seed idempotent, lịch rebuild leaderboard bên ngoài web
process và giám sát uptime. P2 mới cân nhắc custom domain, observability và nâng gói khi có người dùng
thật.
