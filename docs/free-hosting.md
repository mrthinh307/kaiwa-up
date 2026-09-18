# Triển khai miễn phí cho dự án cá nhân

Phương án hiện tại: Vercel Hobby cho Next.js, một Render Free Web Service chạy chung
FastAPI và worker Shadowing, Neon PostgreSQL 18, Cloudinary Free và Groq Free.
Chỉ miễn phí trong quota của từng nhà cung cấp. Không bật gói trả phí hoặc fallback AI trả phí.

## Backend

`render.yaml` tạo một Web Service Docker ở Singapore, gói `free`, tắt auto-deploy.
Blueprint có thể cập nhật service trùng tên: kiểm tra tên `kaiwa-api` trước khi áp dụng.
Nếu tạo thủ công, chọn Docker, build context `apps/api`, Dockerfile `apps/api/Dockerfile`,
health check `/api/v1/ready`; dùng các biến trong `render.yaml`.

Điền các biến `sync: false` trực tiếp trong dashboard, không đưa secret vào Git:

- `DATABASE_URL`: Neon **pooled** connection cùng database với migration,
  scheme `postgresql+asyncpg://`, query `ssl=require`; bỏ `channel_binding` nếu có.
- `CORS_ORIGINS`: JSON array chứa origin Vercel chính xác, ví dụ
  `["https://your-project.vercel.app"]`.
- `CLOUDINARY_URL`: credential Cloudinary server-only.
- `AI_GROQ_API_KEY`: API key của tài khoản Groq Free.

Nếu cấu hình thủ công, tạo `JWT_SECRET_KEY` ngẫu nhiên ít nhất 32 ký tự.
Blueprint tự tạo secret này. Giữ nguyên secret giữa các release.
Chọn model Groq còn khả dụng cho tài khoản qua `AI_GROQ_LLM_MODEL` và `AI_GROQ_STT_MODEL`
nếu cần thay mặc định trong `.env.example`; kiểm tra cả STT và chấm bài thật.

Trước lần khởi động đầu tiên hoặc release có migration, chạy từ `apps/api`:

```sh
uv run alembic upgrade head
```

Máy chạy lệnh phải có `MIGRATION_DATABASE_URL` là Neon **direct** connection, được cấp
qua biến môi trường hoặc `.env` đã ignore. Kiểm tra đúng database đích trước khi chạy;
backup trước migration dữ liệu hiện có. Không chạy migration trong Docker build,
không `stamp`, không chạy full demo seed trên production. Render Free không có pre-deploy command.

Container có `ffprobe`, chạy một Uvicorn process và worker bằng `scripts/start.sh`.
Nếu một tiến trình thoát, container dừng cả hai và trả lỗi để nền tảng khởi động lại.
Khi nhận SIGTERM, cho tiến trình con tối đa 20 giây để dừng; job bị ngắt được worker
thu hồi sau khi lease hết hạn. Không có cam kết xử lý ngay khi service ngủ.

## Frontend

Tạo project Vercel với Root Directory `apps/web`, dùng pnpm workspace và cho phép build
đọc các file ngoài Root Directory để truy cập `packages/api-client`.
Đặt biến production:

- `API_BASE_URL=https://<backend>.onrender.com`
- `CLOUDINARY_CLOUD_NAME=<cloud-name>`

Không đặt `NEXT_PUBLIC_API_BASE_URL` trong production: browser dùng `/api` cùng origin,
Next.js rewrite chuyển tiếp đến backend. Redeploy frontend khi thay backend URL.
Vercel Hobby chỉ dành cho dự án cá nhân/phi thương mại.

## Kiểm tra sau triển khai

1. `/api/v1/ready` trả `ready`, database `ok`, đúng release SHA.
2. Đăng ký, đăng nhập, refresh và đăng xuất qua URL Vercel; cookie có Secure, HttpOnly.
3. Ghi âm WebM, upload, phát lại từ Cloudinary; file vẫn tồn tại sau backend restart.
4. Nộp bài Shadowing và đợi STT/chấm bài thật; kiểm tra worker có heartbeat.
5. Kiểm tra AI Tutor, Dictation và giới hạn Groq bằng tài khoản thử nghiệm.

## Giới hạn chấp nhận

- Render Free ngủ sau 15 phút không có truy cập; API và worker cùng dừng, cold start
  thường khoảng một phút. Không dùng ping giả để giữ service thức liên tục.
- Worker polling và heartbeat giữ Neon compute hoạt động khi container thức; theo dõi quota
  ngay cả khi ít user. Hết quota có thể làm chức năng tạm ngừng.
- Leaderboard rebuild chạy khi API khởi động và mỗi 5 phút khi service thức; không có
  bảo đảm chạy theo lịch khi service ngủ. Bảng xếp hạng có thể cập nhật chậm.
- Giới hạn STT và AI concurrency ở 1 mỗi loại. RAM 512 MB cần được kiểm tra bằng tải thực tế.
- Render filesystem là tạm; Cloudinary giữ audio/avatar. Giới hạn dung lượng, băng thông
  và request AI vẫn áp dụng; hết quota thì thông báo lỗi/thử lại, không tự nâng gói.
- Chưa có staging, CD tự động hoặc uptime SLA. Rollback image/code không tự rollback database.

Nguồn: [Render Free](https://render.com/docs/free),
[Render Blueprint](https://render.com/docs/blueprint-spec),
[Vercel Hobby](https://vercel.com/docs/plans/hobby),
[Neon Free](https://neon.com/blog/how-to-make-the-most-of-neons-free-plan),
[Cloudinary Free](https://cloudinary.com/pricing),
[Groq limits](https://console.groq.com/docs/rate-limits).
