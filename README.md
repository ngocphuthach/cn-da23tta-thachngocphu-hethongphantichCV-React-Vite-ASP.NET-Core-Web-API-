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
- CV được lưu trên máy chủ; trước khi gửi, hệ thống che email và số điện thoại. Các thông tin khác trong CV vẫn được gửi tới dịch vụ AI bên ngoài để phân tích.
- Kết quả AI và điểm khớp kỹ năng chỉ hỗ trợ tham khảo, không thay thế đánh giá nghề nghiệp của con người.
- Công cụ thử AI độc lập nằm tại `ai-service/test_analyze.py`; không dùng thay luồng Backend chính.
- Chưa có kiểm thử tự động bao phủ đầy đủ toàn bộ luồng; cấu hình provider/model và khả năng truy cập dịch vụ AI phụ thuộc nhà cung cấp bên ngoài.

## Quản trị danh mục (Giai đoạn A)

Sau khi migration `AdminCatalogFoundation` được áp dụng có kiểm soát, quản trị viên có thể dùng `/admin/catalog` để quản lý nghề CNTT, kỹ năng và liên kết nghề-kỹ năng. Mã không thể sửa sau khi tạo; nghề và kỹ năng chỉ được vô hiệu hóa, không xóa cứng. Thay đổi được ghi vào nhật ký chỉ đọc và làm tăng phiên bản danh mục. Mỗi lần phân tích dùng một ảnh chụp danh mục nhất quán; kết quả đã lưu được giữ nguyên.

Tạo Admin đầu tiên bằng chế độ console một lần. Trong Docker Compose, mở terminal tương tác:

```powershell
docker compose run --rm backend admin-bootstrap
```

Lệnh yêu cầu email, họ tên và mật khẩu nhập hai lần (mật khẩu không hiển thị), chỉ chạy khi chưa có Admin, rồi thoát mà không khởi động web host. Khi phát triển, chạy `dotnet run --project backend/CvAdvisor.Api.csproj -- admin-bootstrap` sau khi cấu hình kết nối database.

Nếu quên mật khẩu Admin, người vận hành có quyền truy cập container/database chạy chế độ đặt lại có kiểm soát:

```powershell
docker compose run --rm backend admin-reset
```

Nhập email tài khoản Admin và mật khẩu mới hai lần. Thao tác chỉ cập nhật password hash qua `PasswordHasher`; không có API công khai để cấp hoặc đổi vai trò. Bảo vệ quyền truy cập Docker và database vì đây là thao tác quản trị ngoại tuyến.

`jobs.json` chỉ được dùng bởi `ai-service/test_analyze.py` và phát triển. Khi Backend gọi AI Service, Backend gửi danh mục đang hoạt động cùng request; AI Service kiểm tra giới hạn và mã trước khi gọi LLM. Không cần build lại image khi sửa danh mục qua trang quản trị.

Giữ nguyên `HasData` và `CatalogSeedData.cs` sau khi triển khai. Không sửa seed để cập nhật danh mục; mọi thay đổi danh mục phải thực hiện qua trang Admin để giữ audit và phiên bản nhất quán.

## Dashboard và quản trị người dùng/phân tích (Giai đoạn B/C)

Đăng nhập Admin tại `/admin/login`; tài khoản đầu tiên được tạo bằng `admin-bootstrap` như hướng dẫn ở trên. Phiên quản trị dùng token riêng trong sessionStorage, hết hạn sau 30 phút theo mặc định (`Jwt:AdminTokenMinutes` trong `appsettings.json`). Có thể cấu hình giá trị này trong appsettings của môi trường. Liên kết quản trị không hiển thị với người dùng thông thường, nhưng việc ẩn liên kết không phải biện pháp bảo mật; mọi API vẫn kiểm tra vai trò và trạng thái tài khoản trong database.

Khu Admin có các trang `/admin` (Dashboard), `/admin/catalog`, `/admin/users`, `/admin/analyses` và `/admin/audit`. Dashboard đếm trực tiếp tổng người dùng, CV, Completed và Failed; Pending/Processing được trình bày riêng, đồng thời Pending quá 10 phút được tính như Failed. Biểu đồ tổng hợp mã nghề xếp đầu từ tối đa 1.000 kết quả Completed gần nhất; JSON quá lớn hoặc sai cấu trúc được bỏ qua.

Trang người dùng hỗ trợ tìm email từ 3 ký tự, phân trang và khóa/mở khóa. Admin không thể tự khóa. Có thể khóa Admin khác khi còn ít nhất một Admin đang hoạt động; không thể khóa Admin hoạt động cuối cùng. Admin đã bị khóa có thể được mở khóa. Thay đổi dùng RowVersion để phát hiện xung đột và được ghi vào bảng audit hiện có dưới loại đối tượng `UserStatus`.

Trang phân tích toàn hệ thống chỉ trả AnalysisId, trạng thái, thời gian, thời lượng, OverallScore và FailureCode cố định; không trả ResultJson, nội dung/evidence CV, tiêu đề hay tên file. FailureCode cũ để trống hiển thị “Không rõ”. Pending quá 10 phút được hiển thị như Failed với mã `AiTimeout`.

Migration `AdminAnalyticsAndUserStatus` bổ sung RowVersion cho Users và FailureCode nullable cùng CHECK constraint cho CVAnalyses. Hãy kiểm tra trạng thái của database đích và áp dụng migration theo quy trình có kiểm soát tại mục Migration; backend không tự migrate khi khởi động.
