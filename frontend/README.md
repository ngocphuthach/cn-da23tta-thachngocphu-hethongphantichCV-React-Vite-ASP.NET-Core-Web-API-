# Frontend Career Compass

Giao diện được xây dựng bằng React và Vite, gọi ASP.NET Core API qua `VITE_API_BASE_URL`.

## Lệnh phát triển

```powershell
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

Trong phát triển, cấu hình `VITE_API_BASE_URL` trong file môi trường frontend; giá trị hiện dùng là địa chỉ Backend local `http://localhost:5000`. Đây là cấu hình public được nhúng vào bundle, không đặt secret tại đây.

## Cấu trúc `src/`

- `components/`: bố cục, form dùng chung, route bảo vệ và skeleton.
- `context/`: trạng thái xác thực và hook truy cập context.
- `hooks/`: tiện ích giao diện, khả năng hiển thị trang và chuyển động.
- `pages/`: trang chủ, xác thực, CV, lịch sử và kết quả phân tích.
- `services/`: client HTTP và các hàm gọi API.
- `App.jsx`, `main.jsx`: định tuyến, provider và điểm khởi chạy.
- Các file CSS tại `src/`: kiểu giao diện dùng chung và chuyển động.
