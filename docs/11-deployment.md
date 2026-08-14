# 11. Deployment

## 1. Mục tiêu

Tài liệu này mô tả cách triển khai KaiwaUP theo hướng đơn giản, dễ vận hành và phù hợp với MVP. Mục tiêu là có một quy trình deploy rõ ràng cho **Next.js frontend**, **FastAPI backend**, database và các bước kiểm tra chất lượng trước khi push code.

Ưu tiên của giai đoạn đầu:

1. Dễ thiết lập cho cả nhóm.
2. Có thể kiểm tra nhanh trước khi push.
3. Có preview deployment cho frontend.
4. Tách biệt môi trường development, staging và production.

---

## 2. Kiến trúc triển khai

KaiwaUP được triển khai theo mô hình tách frontend và backend:

* **Frontend:** Next.js, deploy trên Vercel.
* **Backend:** FastAPI, deploy trên một nền tảng chạy API riêng như Render, Railway hoặc tương đương.
* **Database:** PostgreSQL trên Neon.
* **Audio bài học:** video YouTube; bản ghi người dùng dùng private object storage khi cần lưu.

* Vercel xử lý tốt frontend và preview branch.
* Backend FastAPI có thể scale độc lập.
* Database được quản lý riêng, tránh phụ thuộc vào môi trường deploy frontend.

---

## 3. Môi trường triển khai

### 3.1. Development

Môi trường local dùng cho lập trình hằng ngày.

Yêu cầu tối thiểu:

* Chạy frontend bằng môi trường local.
* Chạy backend bằng môi trường local hoặc Docker.
* Dùng database test hoặc database local, không kết nối thẳng vào production.

### 3.2. Preview / Staging

Môi trường preview dùng để kiểm tra trước khi merge hoặc trước khi phát hành.

Khuyến nghị:

* Mỗi pull request tạo một preview deployment cho frontend trên Vercel.
* Backend staging dùng chung một endpoint riêng với production.
* Database staging tách biệt với database production.

### 3.3. Production

Môi trường production là môi trường dùng thật cho người dùng cuối.

Yêu cầu:

* Chỉ nhận code đã qua lint và test cơ bản.
* Chỉ deploy từ branch chính đã được review.
* Biến môi trường production không được dùng chung với local hoặc preview.

---

## 4. Biến môi trường

Mỗi môi trường cần có bộ biến môi trường riêng.

### 4.1. Frontend

* `NEXT_PUBLIC_API_BASE_URL`: URL backend cho frontend gọi.
* `NEXT_PUBLIC_APP_NAME`: tên ứng dụng hiển thị.
* `NEXT_PUBLIC_VERCEL_ENV`: môi trường hiện tại nếu cần.

### 4.2. Backend

* `DATABASE_URL`: kết nối PostgreSQL.
* `JWT_SECRET_KEY`: khóa ký JWT.
* `CORS_ORIGINS`: danh sách domain frontend được phép gọi backend.
* `YOUTUBE_API_KEY` nếu backend cần gọi YouTube Data API; không cần biến này nếu chỉ lưu/phát URL.
* `AI_API_KEY` hoặc cấu hình dịch vụ AI nếu có.
* `APP_ENV`: development, staging hoặc production.

### 4.3. Nguyên tắc quản lý biến môi trường

* Không commit file `.env` thật lên repository.
* Chỉ lưu `.env.example` để mô tả tên biến cần thiết.
* Preview và production phải dùng secret riêng.

---

## 5. Quy trình kiểm tra trước khi push

Trước khi push code lên remote, cần chạy tối thiểu các bước sau:

1. Format nếu dự án có cấu hình format.
2. Chạy lint cho frontend và backend.
3. Chạy test liên quan đến phần thay đổi.
4. Chạy smoke check nếu thay đổi ảnh hưởng luồng chính.
5. Kiểm tra lại biến môi trường và URL gọi API.

### 5.1. Checklist tối thiểu

* Lint pass.
* Test pass.
* Không còn lỗi nghiêm trọng trong core flow.
* Preview frontend chạy được.
* Backend trả response hợp lệ cho các endpoint chính.

### 5.2. Khuyến nghị theo dự án này

Với KaiwaUP, trước khi push ưu tiên kiểm tra:

* Auth flow.
* API kết nối backend.
* Trang học chính của module đang sửa.
* Request mock cho AI hoặc media nếu có thay đổi liên quan.

---

## 6. CI/CD đơn giản

Mục tiêu của CI/CD là tự động hóa phần kiểm tra cơ bản, không làm quy trình quá phức tạp.

### 6.1. CI khi mở pull request

Khi tạo pull request, pipeline tối thiểu:

1. Cài dependency.
2. Chạy lint.
3. Chạy test.
4. Chạy kiểm tra build nếu cần.

Nếu pipeline fail, không merge PR.

### 6.2. CD cho frontend

Frontend deploy trên Vercel theo quy tắc:

* PR mới tạo preview deployment tự động.
* Merge vào branch chính sẽ deploy production tự động.
* Chỉ merge khi preview đã được kiểm tra và pass lint/test liên quan.

### 6.3. CD cho backend

Backend deploy qua một pipeline riêng của nền tảng hosting backend.

Quy trình:

* Merge vào branch chính mới trigger deploy.
* Dùng môi trường staging để kiểm tra trước khi lên production nếu có.
* Sau deploy, kiểm tra health endpoint và một luồng API cốt lõi.

---

## 7. Thứ tự deploy khuyến nghị

Để giảm rủi ro lỗi tích hợp:

1. Cập nhật database migration nếu có thay đổi schema.
2. Deploy backend.
3. Kiểm tra health và các endpoint chính của backend.
4. Deploy frontend lên Vercel.
5. Kiểm tra luồng frontend gọi backend thực tế.

Nếu backend thay đổi API, cần đảm bảo frontend đã tương thích trước khi phát hành production.

---

## 8. Rollback

Rollback phải đơn giản và nhanh.

### 8.1. Frontend

* Vercel cho phép quay về deployment trước đó.
* Nếu lỗi nằm ở frontend, rollback frontend trước.

### 8.2. Backend

* Quay lại release hoặc container version trước đó.
* Nếu lỗi do migration, cần có kế hoạch rollback schema hoặc script khôi phục phù hợp.

### 8.3. Quy tắc rollback

* Ưu tiên khôi phục core flow trước.
* Nếu rollback backend ảnh hưởng API, kiểm tra lại frontend preview hoặc production ngay sau đó.

---

## 9. Tiêu chí hoàn thành deploy

Một lần deploy được coi là thành công khi:

* Frontend truy cập được trên domain preview hoặc production.
* Backend health check trả về trạng thái bình thường.
* Database kết nối ổn định.
* Các luồng chính không bị lỗi 5xx.
* Các test quan trọng của milestone hiện tại đã pass.

---

## 10. Quy ước áp dụng cho dự án

Trong giai đoạn đầu của KaiwaUP: 

* Dev branch hoặc feature branch dùng để phát triển.
* Pull request phải qua lint và test trước khi merge.
* Vercel preview dùng để review giao diện và luồng frontend.
* Production chỉ nhận code từ branch chính sau khi đã kiểm tra xong.
* Backend chỉ deploy khi API core flow không bị phá vỡ.

---

## 11. Tóm tắt ngắn

Quy trình deploy tối thiểu cho KaiwaUP:

1. Dev code trên branch riêng.
2. Chạy lint và test trước khi push.
3. Tạo pull request.
4. Xem preview deployment trên Vercel.
5. Merge khi pass kiểm tra.
6. Frontend deploy production trên Vercel.
7. Backend deploy riêng trên nền tảng API phù hợp.
