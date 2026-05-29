# Tào Tháo AI Training — Backend

## Cấu trúc

```
backend/
├── .env.example          ← copy thành .env và điền giá trị
├── .gitignore
├── package.json
└── src/
    ├── index.js           ← entry point
    ├── config/
    │   ├── database.js    ← kết nối MongoDB
    │   └── passport.js    ← Google OAuth strategy
    ├── models/
    │   └── User.js        ← schema: fullName, username, email, phone, password, zaloName, googleId
    ├── controllers/
    │   ├── authController.js    ← register, login, getMe, googleCallback
    │   └── landingController.js ← getMedia, submitContact → Telegram
    ├── routes/
    │   ├── index.js
    │   ├── auth.js        ← /api/auth/*
    │   └── landing.js     ← /api/landing/*
    └── middleware/
        ├── auth.js        ← protect (JWT), requireAdmin
        └── errorHandler.js
```

---

## API Endpoints

| Method | URL | Auth | Mô tả |
|--------|-----|------|-------|
| `POST` | `/api/auth/register` | ✗ | Đăng ký: fullName, username, email, phone, password, zaloName |
| `POST` | `/api/auth/login` | ✗ | Đăng nhập bằng email/username + password |
| `GET` | `/api/auth/me` | JWT | Lấy thông tin tài khoản |
| `GET` | `/api/auth/google` | ✗ | Redirect đến Google login |
| `GET` | `/api/auth/google/callback` | ✗ | Google OAuth callback |
| `GET` | `/api/landing/media` | ✗ | Trả về danh sách video & ảnh |
| `POST` | `/api/landing/contact` | ✗ | Gửi form → Telegram (rate limit 5 lần/15 phút) |
| `GET` | `/api/health` | ✗ | Health check |

---

## Cách chạy

```bash
# 1. Cài dependencies
npm install

# 2. Copy và điền biến môi trường
copy .env.example .env

# 3. Chạy dev
npm run dev
```

---

## Cần chuẩn bị

1. **MongoDB** — dùng [MongoDB Atlas](https://cloud.mongodb.com) (free) hoặc local
2. **Google OAuth** — tạo credentials tại [Google Cloud Console](https://console.cloud.google.com/), thêm redirect URI: `http://localhost:5000/api/auth/google/callback`
3. **Telegram Bot** — nhắn `@BotFather` lệnh `/newbot` để lấy token, rồi lấy `chat_id` của group/channel để nhận đơn đăng ký

---

## Các chức năng đã làm

- [x] Register: fullName, username, email, phone, password, zaloName
- [x] Login: email/username + password
- [x] Login Google OAuth
- [x] GET /me (JWT protected)
- [x] Landing: GET media (video + ảnh)
- [x] Landing: POST contact → gửi Telegram

## Các chức năng sẽ phát triển sau

- [ ] Quản lý khoá học / bài học
- [ ] Dashboard học viên
- [ ] Admin panel
- [ ] Upload media (video, ảnh)
- [ ] Thanh toán
- [ ] Thông báo (email, push)
