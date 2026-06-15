# Skill Trading Platform

Nền tảng trao đổi kỹ năng P2P cho sinh viên, dùng Skill Coin (SKC) để đặt lịch học, dạy kỹ năng, review và quản trị nội dung.

## Công nghệ

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Node.js, Express, Prisma ORM
- Database: PostgreSQL
- Auth: JWT + bcrypt
- Deploy: Render Web Service + Supabase Free PostgreSQL

## Chức năng chính

- User đăng ký nhận 100 SKC, đăng nhập, cập nhật profile, xem giao dịch.
- Teacher tạo/sửa/xóa skill, skill mới mặc định `PENDING`.
- Learner browse/search marketplace, đặt lịch, hủy booking, review sau hoàn thành.
- Booking giữ SKC ngay khi tạo, hoàn tiền theo rule, trả 95% cho teacher khi hoàn thành.
- Admin quản lý users, skills, bookings, xử lý dispute và điều chỉnh SKC.

## Chạy local

Yêu cầu: Node.js 20+, Supabase Free PostgreSQL (hoặc local PostgreSQL).

1. Cài dependencies:

```bash
npm install
npm --prefix server install
```

2. Tạo file môi trường:

```bash
copy .env.example .env
copy server\.env.example server\.env
```

3. Sửa `server/.env`:

```env
DATABASE_URL="postgresql://postgres:YOUR_SUPABASE_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?sslmode=require"
JWT_SECRET="your-local-secret"
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"
```

4. Migrate và seed dữ liệu mẫu:

```bash
npm --prefix server run build
npm run seed
```

5. Chạy backend và frontend ở 2 terminal:

```bash
npm run server:dev
npm run dev
```

Frontend: `http://localhost:5173`

Tài khoản demo sau khi seed:

- Admin: `admin@skilltrading.com` / `admin123`
- User: `alice@example.com` / `user123`

## Build production local

```bash
npm run build
npm start
```

Khi `NODE_ENV=production`, Express sẽ serve frontend từ thư mục `dist` và API tại `/api`.

## Deploy lên Render

### Cách 1: Deploy lên Render với Supabase Free (khuyên dùng)

1. Push source code lên GitHub.
2. Tạo project Supabase Free:
   - Vào https://supabase.com
   - New project
   - Chọn region gần bạn
   - Lấy connection string từ Settings -> Database -> Connection string -> URI
   - Dùng dạng pooler / transaction string từ Supabase (khuyến nghị cho Prisma/Render), ví dụ:
     `postgresql://postgres:YOUR_PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`
3. Vào Render Dashboard, chọn **New +** -> **Web Service**.
4. Chọn repository, cấu hình:
   - Build Command: `npm install && npm run render-build`
   - Start Command: `npm start`
   - Plan: Free
5. Trong Environment Variables của Render, thêm:
   - `DATABASE_URL=<connection string Supabase>`
   - `JWT_SECRET=<chuỗi ngẫu nhiên dài>
   - `NODE_ENV=production`
   - `FRONTEND_URL=<URL Render service của bạn>` (tùy chọn)
6. Deploy. Render sẽ chạy build và start như config hiện tại.

```bash
npm install && npm run render-build
npm start
```

`DATABASE_URL` và `JWT_SECRET` được cấu hình tự động trong `render.yaml`, nên bạn không cần thêm thủ công khi deploy bằng Blueprint. Nếu muốn chạy local, hãy dùng [server/.env.example](server/.env.example).

### Cách 2: Tạo thủ công (không dùng Blueprint)

1. Tạo Supabase Free Database (nếu chưa có):
   - Vào Supabase, New project
   - Copy connection string từ Settings -> Database
2. Tạo Web Service trên Render:
   - Runtime: Node
   - Build Command: `npm install && npm run render-build`
   - Start Command: `npm start`
3. Thêm Environment Variables:

```env
NODE_ENV=production
DATABASE_URL=<Direct Supabase connection string>
JWT_SECRET=<chuoi bi mat dai>
```

`FRONTEND_URL` là tùy chọn. Nếu muốn giới hạn CORS sau khi deploy xong, đặt bằng URL web service Render, ví dụ:

```env
FRONTEND_URL=https://skill-trading.onrender.com
```

4. Deploy service.

5. Seed dữ liệu mẫu nếu cần:
   - Vào Web Service -> Shell
   - Chạy:

```bash
npm run seed
```

## API health check

Sau khi deploy, kiểm tra:

```text
https://your-service.onrender.com/api/health
```

Nếu trả về `{ "status": "ok" }`, backend và database đã sẵn sàng.
