# Skill Trading Platform

Nền tảng trao đổi kỹ năng P2P cho sinh viên, dùng Skill Coin (SKC) để đặt lịch học, dạy kỹ năng, review và quản trị nội dung.

## Công nghệ

- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Node.js, Express, Prisma ORM
- Database: PostgreSQL
- Auth: JWT + bcrypt
- Deploy: Render Web Service + Render PostgreSQL free plan

## Chức năng chính

- User đăng ký nhận 100 SKC, đăng nhập, cập nhật profile, xem giao dịch.
- Teacher tạo/sửa/xóa skill, skill mới mặc định `PENDING`.
- Learner browse/search marketplace, đặt lịch, hủy booking, review sau hoàn thành.
- Booking giữ SKC ngay khi tạo, hoàn tiền theo rule, trả 95% cho teacher khi hoàn thành.
- Admin quản lý users, skills, bookings, xử lý dispute và điều chỉnh SKC.

## Chạy local

Yêu cầu: Node.js 20+, PostgreSQL.

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
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/skilltrading?schema=public"
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

### Cách 1: Blueprint từ `render.yaml` (khuyên dùng)

1. Push source code lên GitHub.
2. Vào Render Dashboard, chọn **New +** -> **Blueprint**.
3. Chọn repository chứa dự án.
4. Render sẽ tự tạo:
   - Web Service `skill-trading` (plan free)
   - PostgreSQL `skill-trading-db` (plan free, region singapore)
5. Render sẽ tự inject:
   - `DATABASE_URL` từ PostgreSQL free plan
   - `JWT_SECRET` tự sinh
   - `NODE_ENV=production`
6. Xác nhận deploy. Render sẽ chạy:

```bash
npm install && npm run render-build
npm start
```

`DATABASE_URL` và `JWT_SECRET` được cấu hình tự động trong `render.yaml`, nên bạn không cần thêm thủ công khi deploy bằng Blueprint. Nếu muốn chạy local, hãy dùng [server/.env.example](server/.env.example).

### Cách 2: Tạo thủ công (không dùng Blueprint)

1. Tạo PostgreSQL:
   - **New +** -> **PostgreSQL**
   - Plan: Free
   - Region: Singapore hoặc region gần người dùng
2. Tạo Web Service:
   - Runtime: Node
   - Build Command:

```bash
npm install && npm run render-build
```

   - Start Command:

```bash
npm start
```

3. Thêm Environment Variables:

```env
NODE_ENV=production
DATABASE_URL=<Internal Database URL cua Render PostgreSQL>
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
