# Career Compass

Career Compass là hệ thống quản lý CV, phân tích nội dung bằng AI và tham khảo mức độ khớp kỹ năng với các nghề CNTT. Kết quả chỉ mang tính tham khảo.

## Công nghệ và kiến trúc

- Frontend: React, Vite.
- Backend trung tâm: ASP.NET Core Web API, JWT, Entity Framework Core.
- AI Service: Python, FastAPI; gửi nội dung CV tới dịch vụ AI bên ngoài.
- Cơ sở dữ liệu: Microsoft SQL Server; môi trường toàn hệ thống dùng Docker Compose.
- Backend gọi AI Service và lưu CV, kết quả, lịch sử vào SQL Server.

## Chức năng hiện có

Đăng ký và đăng nhập JWT; tải CV PDF/DOCX hoặc nhập thông tin CV thủ công; phân tích CV bằng AI; backend tự tính điểm khớp kỹ năng; xem kết quả và lịch sử phân tích; quản lý và xóa CV.

## Cấu trúc thư mục

```text
frontend/       React + Vite
backend/        ASP.NET Core API, EF Core và migrations
ai-service/     FastAPI, trích xuất CV và gọi LLM
docker-compose.yml
dotnet-tools.json
```

## Chạy toàn hệ thống bằng Docker Compose

Tạo file cấu hình cục bộ bằng `Copy-Item .env.example .env`, rồi tự điền các biến cần thiết. Compose dùng các tên biến: `SA_PASSWORD`, `JWT_SIGNING_KEY`, `INTERNAL_API_KEY`, `CORS_ALLOWED_ORIGIN`, `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`, `VITE_API_BASE_URL` (cùng `MSSQL_PID` và `MSSQL_PORT` nếu cần điều chỉnh). Không ghi giá trị bí mật vào README hoặc source.

```powershell
docker compose config --quiet
docker compose up --build
```

Frontend tại <http://localhost:5173>, Backend tại <http://localhost:5000>. SQL Server được publish trên `localhost,1433`; AI Service chỉ dùng nội bộ Compose. Xem log bằng `docker compose logs -f backend ai-service`; dừng bằng `docker compose stop` hoặc `docker compose down` (không dùng `down -v` nếu cần giữ volume).

## Chạy từng phần khi phát triển

- SQL Server: `docker compose up -d sqlserver`.
- Backend: thiết lập connection string qua User Secrets, sau đó chạy `cd backend; dotnet run --launch-profile http`.
- AI Service: trong `ai-service`, tạo và kích hoạt virtual environment, cài `requirements.txt`, rồi chạy `uvicorn main:app --reload --port 8000`. Cấu hình `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`; khóa nội bộ `INTERNAL_API_KEY` phải khớp cấu hình Backend.
- Frontend: trong `frontend`, cài dependencies bằng `npm install`, rồi `npm run dev`. `VITE_API_BASE_URL` xác định địa chỉ Backend; cấu hình phát triển hiện dùng `http://localhost:5000`.

## Migration có kiểm soát

Backend không tự áp dụng migration khi khởi động. Chờ SQL Server healthy, cấu hình connection string trong User Secrets trỏ tới database dự kiến, rồi từ thư mục gốc chạy `dotnet tool restore` và `dotnet ef database update --project backend/CvAdvisor.Api.csproj --startup-project backend/CvAdvisor.Api.csproj`. Kiểm tra database đích trước khi áp dụng.

## Bảo mật và giới hạn

- Không commit `.env`; chỉ dùng `.env.example` làm mẫu. Không ghi key hoặc mật khẩu vào source.
- CV mẫu đặt trong `ai-service/samples/` được Git ignore. Chỉ dùng CV đã ẩn danh khi thử nghiệm.
- CV được lưu trên máy chủ; nội dung CV được gửi tới dịch vụ AI bên ngoài để phân tích. Cân nhắc dữ liệu trước khi tải lên.
- Kết quả AI và điểm khớp kỹ năng chỉ hỗ trợ tham khảo, không thay thế đánh giá nghề nghiệp của con người.
- Công cụ thử AI độc lập nằm tại `ai-service/test_analyze.py`; không dùng thay luồng Backend chính.
- Chưa có kiểm thử tự động bao phủ đầy đủ toàn bộ luồng; cấu hình provider/model và khả năng truy cập dịch vụ AI phụ thuộc nhà cung cấp bên ngoài.
