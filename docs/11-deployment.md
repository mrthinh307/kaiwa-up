# 11. Deployment và CD

## 0. Deployment đang chạy (Phase 1)

Trạng thái dưới đây đã được kiểm tra ngày 2026-08-23. Đây là deployment demo hiện tại, không phải
luồng CD trong `.github/workflows/deploy.yml`:

| Thành phần | Giá trị hiện tại | Cách triển khai |
| --- | --- | --- |
| Frontend | `https://kaiwa-up-demo.vercel.app` | Vercel project `kaiwa-up-demo` (`prj_EPYNl4fujiwPZy1RVO9hzwnHmFfW`), deployment `dpl_DSyVvfs1bfYxKizuTs8kqBhbySXf`, Root Directory `apps/web`, deploy thủ công bằng Vercel CLI |
| Backend | `https://kaiwa-api.onrender.com` | Render service `srv-da5b8rou01pc73elhp30`, latest verified deploy `dep-da5bq3jbc2fs738guulg`, runtime `image`, Auto-Deploy tắt |
| Backend image | `ghcr.io/theanhnguyenc/kaiwa-api:051a0aea594b` | Private GHCR, Render đọc bằng credential chỉ có `read:packages` |
| Database | Neon PostgreSQL 18 tại Singapore | Pooled URL cho runtime, direct URL cho Alembic |
| Recording | Cloudinary, folder `kaiwa-up` | FastAPI upload trực tiếp bằng credential server-only |
| Release | `051a0aea594b2a05442038d4a540a5e6241360fe` | `/api/v1/health` và `/api/v1/ready` công khai SHA |

Render service hiện tại được tạo từ **Existing Image**, không được quản lý bởi `render.yaml` và không
thể checkout một Git commit từ deploy hook. Vercel hiện được deploy từ một `git archive` không chứa
`.git`, vì metadata author của các commit hiện có chưa được Vercel nhận là thành viên project. Hai
cách này là đường manual deployment của Phase 1.

`render.yaml` và `.github/workflows/deploy.yml` mô tả trạng thái mục tiêu của Phase 2. Chỉ bật workflow
đó sau khi admin phê duyệt GitHub App, tạo GitHub Environment `production`, cấu hình secrets và chuyển
backend sang Render Git-backed service. Không trỏ deploy hook của image-backed service hiện tại vào
workflow CD vì nó không đảm bảo chạy đúng `DEPLOY_SHA`.

## 1. Kiến trúc P0

KaiwaUP dùng các gói miễn phí, tách theo đúng trách nhiệm của từng thành phần:

- Frontend Next.js: Vercel.
- Backend FastAPI: Render Web Service chạy Docker.
- PostgreSQL 18+: Neon; URL pooled dùng cho ứng dụng, URL direct dùng riêng cho Alembic.
- Bản ghi âm người dùng: Cloudinary; production không ghi file vào ổ đĩa tạm của Render.
- CI/CD mục tiêu Phase 2: GitHub Actions chỉ release commit `master` đã pass CI. Phase 1 hiện release
  thủ công một commit đã pass CI.

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
   thủ công từ image tag bất biến gắn với commit đã chọn.
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

Mục này mô tả workflow đã chuẩn bị trong source nhưng **chưa được bật cho production hiện tại**.
Backend image-backed của Phase 1 phải được chuyển sang Git-backed trước khi kích hoạt.

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

#### Phase 2: Git-backed Blueprint

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

#### Phase 1 hiện tại: private GHCR image

Nếu Render chưa được organization owner cấp quyền đọc private repository, có thể triển khai thủ công
từ private GitHub Container Registry (GHCR) image mà không công khai source:

1. Build image đúng nền tảng Render và gắn tag bất biến 12 ký tự theo commit:

   ```sh
   docker build --platform linux/amd64 \
     --tag ghcr.io/theanhnguyenc/kaiwa-api:<commit-sha-12> apps/api
   ```

2. Push image vào private GHCR package. Token dùng để push cần `write:packages`; không ghi token vào
   shell history, source code hoặc workflow log.
3. Tạo một PAT riêng cho Render chỉ có `read:packages`, sau đó thêm vào Workspace Settings →
   Container Registry Credentials. Không tái sử dụng token có quyền `repo` hoặc `write:packages`.
4. Tạo Render Free Web Service từ **Existing Image**, chọn Singapore và image tag ở bước 1. Cấu hình
   health check `/api/v1/ready` cùng toàn bộ biến production ở mục 5.
5. Mỗi lần cập nhật, push một tag theo SHA mới, đổi **Image URL** và biến `RELEASE_SHA` của service
   sang SHA đó, sau đó chọn Manual Deploy. Giữ lại image tag/digest cũ để rollback; không dùng mutable
   tag `latest` làm bằng chứng release.

Image-backed service chỉ là đường Phase 1. Sau khi admin phê duyệt GitHub App, chuyển sang Git-backed
service do `render.yaml` quản lý để CD có thể deploy và xác minh đúng commit trên `master`.

### 4.4. Vercel

1. Phase 1: tạo/link project `kaiwa-up-demo` bằng Vercel CLI với scope
   `theanhnguyencs-projects`.
2. Chọn Root Directory `apps/web`, Framework Preset `Next.js`; build vẫn chạy từ monorepo root để
   dùng `packages/api-client`.
3. Thêm production environment variable:
   - `API_BASE_URL=https://<render-service>.onrender.com`
4. Không cấu hình `NEXT_PUBLIC_API_BASE_URL` trong production; browser phải dùng `/api` cùng origin.
5. Phase 2: sau khi admin phê duyệt, kết nối Git integration để tạo PR Preview. Trong Ignored Build
   Step, bật system environment
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

`MIGRATION_DATABASE_URL` chỉ dùng ở máy chạy migration thủ công trong Phase 1 hoặc GitHub Actions
trong Phase 2; không cấp cho web process. Git-backed Render tự cung cấp `RENDER_GIT_COMMIT`; service
image-backed hiện tại dùng `RELEASE_SHA` được đặt thủ công. Health/readiness công khai SHA tương ứng
để người triển khai hoặc workflow xác minh release.

Các AI provider mặc định là `fake` để P0 không phát sinh chi phí. Khi bật provider thật, thêm secret
phía backend và ngân sách/rate limit trước khi chuyển cấu hình provider.

## 6. Seed và migration

- Full demo seed yêu cầu `DEMO_SEED_PASSWORD` ở local và bị chặn hoàn toàn ở staging/production.
- Không dùng `alembic stamp head` để bỏ qua revision không nhận diện được.
- Migration phải tương thích ngược với phiên bản backend đang chạy vì schema được nâng cấp trước khi
  deploy backend. Với thay đổi phá vỡ contract, dùng quy trình expand → deploy → migrate data →
  contract trong nhiều release.
- Không tự động downgrade production. Migration có mất dữ liệu phải có backup và runbook riêng.

## 7. Runbook deployment hiện tại

Các lệnh trong mục này dành cho Windows PowerShell, chạy từ repository root. Phase 1 chỉ phát hành
một commit đã có trên branch/PR; không build từ working tree có thay đổi chưa commit.

### 7.1. Điều kiện trước khi deploy

1. `git status --short` không được có thay đổi thuộc release chưa commit.
2. Commit đã pass CI và `git rev-parse HEAD` là SHA muốn phát hành.
3. Docker đã login GHCR bằng token có `write:packages`; package `kaiwa-api` phải giữ private.
4. Render có registry credential `kaiwa-ghcr-read` chỉ có `read:packages`.
5. `apps/api/.env` bị Git ignore và chứa Neon direct URL trong `MIGRATION_DATABASE_URL`. Không ghi
   hoặc dán URL này vào issue, commit hay log.
6. Vercel project `kaiwa-up-demo` có production variable
   `API_BASE_URL=https://kaiwa-api.onrender.com`.

### 7.2. Migrate và deploy backend

Xác định release, build image Linux AMD64 và push tag bất biến:

```powershell
$releaseSha = (git rev-parse HEAD).Trim()
$imageTag = $releaseSha.Substring(0, 12)
$imageRef = "ghcr.io/theanhnguyenc/kaiwa-api:$imageTag"

docker build --platform linux/amd64 --tag $imageRef apps/api
docker push $imageRef
```

Chạy migration bằng Neon direct connection trước khi thay backend:

```powershell
Push-Location apps/api
uv run alembic upgrade head
Pop-Location
```

Trong Render service `kaiwa-api` (`srv-da5b8rou01pc73elhp30`):

1. Mở **Settings**, đổi Image URL thành `$imageRef` vừa push.
2. Mở **Environment**, đặt `RELEASE_SHA` bằng `$releaseSha` đầy đủ.
3. Save Changes và chọn **Manual Deploy → Deploy latest reference**.
4. Đợi deploy chuyển sang `live`, sau đó kiểm tra:

```powershell
$backendUrl = "https://kaiwa-api.onrender.com"
$ready = Invoke-RestMethod "$backendUrl/api/v1/ready"

if (
  $ready.status -ne "ready" -or
  $ready.database -ne "ok" -or
  $ready.release_sha -ne $releaseSha
) {
  throw "Backend readiness hoặc release SHA không khớp"
}
```

Không deploy frontend nếu migration hoặc readiness thất bại.

### 7.3. Deploy frontend bằng Vercel CLI

Phase 1 tạo source archive từ đúng commit để Vercel không đọc Git author metadata. Archive vẫn chứa
toàn bộ monorepo cần cho `packages/api-client`, còn Root Directory được lấy từ project Vercel.

```powershell
$releaseSha = (git rev-parse HEAD).Trim()
$exportRoot = Join-Path $env:TEMP ("kaiwa-vercel-" + [guid]::NewGuid().ToString("N"))
$sourceDir = Join-Path $exportRoot "source"
$archivePath = Join-Path $exportRoot "source.tar"

New-Item -ItemType Directory -Path $sourceDir | Out-Null
git archive --format=tar --output=$archivePath $releaseSha
tar -xf $archivePath -C $sourceDir

pnpm dlx vercel@59.5.0 deploy `
  --cwd $sourceDir `
  --prod `
  --yes `
  --project kaiwa-up-demo `
  --scope theanhnguyencs-projects `
  --meta releaseSha=$releaseSha
```

Sau khi Vercel báo `Ready`, xác nhận alias production vẫn là
`https://kaiwa-up-demo.vercel.app`. Chỉ xóa `$exportRoot` sau khi đã kiểm tra đường dẫn resolve nằm
trong `$env:TEMP` và tên thư mục bắt đầu bằng `kaiwa-vercel-`.

Khi Git author đã được Vercel nhận diện đúng và GitHub integration được admin phê duyệt, không cần
archive workaround này; chuyển sang workflow Phase 2.

### 7.4. Smoke check sau release

```powershell
$backendUrl = "https://kaiwa-api.onrender.com"
$frontendUrl = "https://kaiwa-up-demo.vercel.app"

$health = Invoke-RestMethod "$backendUrl/api/v1/health"
$ready = Invoke-RestMethod "$backendUrl/api/v1/ready"
$loginPage = Invoke-WebRequest "$frontendUrl/login"

if ($health.status -ne "ok" -or $ready.status -ne "ready" -or $ready.database -ne "ok") {
  throw "Backend health/readiness failed"
}
if ($loginPage.StatusCode -ne 200) {
  throw "Frontend login page failed"
}

try {
  Invoke-WebRequest "$frontendUrl/api/v1/auth/refresh" -Method Post
  throw "Unauthenticated refresh should return 401"
} catch {
  if ($_.Exception.Response.StatusCode -ne 401) { throw }
}
```

Với release ảnh hưởng auth/storage, thực hiện thêm bằng tài khoản smoke ngẫu nhiên:

1. Register, login và refresh qua URL Vercel; cookie phải có `HttpOnly`, `Secure`, `SameSite=Lax`.
2. Upload một recording dưới 10 MB qua `/api/v1/shadowing/{content_id}/record-segment`.
3. Xác nhận playback URL dùng `res.cloudinary.com`.
4. Manual redeploy backend, sau đó gọi lại playback của cùng recording.
5. Xóa tài khoản và asset smoke sau khi persistence pass; không giữ tài khoản production mặc định.

### 7.5. Rollback Phase 1

- Backend: chọn image tag/digest đã biết tốt trong Render, đặt `RELEASE_SHA` về SHA tương ứng và
  Manual Deploy lại. Không dùng tag `latest`.
- Frontend: trong Vercel Deployments, promote deployment production đã biết tốt trước đó.
- Database: không tự downgrade hoặc `stamp`. Nếu release mới đã chạy migration, đánh giá tính tương
  thích rồi dùng migration phục hồi/backup riêng.

Nếu backend fail trước khi frontend deploy, giữ nguyên frontend cũ. Sau sự cố, tạo revert commit và
phát hành lại để lịch sử source phản ánh đúng trạng thái production.

## 8. Giới hạn P0 và bước tiếp theo

- Render Free có cold start và không phù hợp job định kỳ đáng tin cậy.
- Chưa có backend preview riêng cho từng PR.
- Chưa tự động backup/restore rehearsal ngoài khả năng do Neon cung cấp.
- Chưa có synthetic monitoring hoặc cảnh báo ngoài smoke test sau deploy.

P1 nên bổ sung backend staging, content-only seed idempotent, lịch rebuild leaderboard bên ngoài web
process và giám sát uptime. P2 mới cân nhắc custom domain, observability và nâng gói khi có người dùng
thật.
