# Xây Dựng Hệ Thống Phân Tích CV Và Tư Vấn Nghề Nghiệp (Career Compass)

Hệ thống web hỗ trợ ứng viên ngành Công nghệ Thông tin quản lý hồ sơ xin việc (CV), phân tích năng lực bằng trí tuệ nhân tạo kết hợp thuật toán định lượng, đối chiếu trực tiếp với yêu cầu tuyển dụng thực tế từ doanh nghiệp và tư vấn định hướng nghề nghiệp phù hợp.

---

## Thông Tin Sinh Viên Thực Hiện

| Thông tin | Chi tiết |
| :--- | :--- |
| **Tên đề tài** | Xây dựng hệ thống phân tích CV và tư vấn nghề nghiệp |
| **Sinh viên thực hiện** | Thạch Ngọc Phú |
| **MSSV** | `110123039` |
| **Lớp** | `DA23TTA` |
| **Giảng viên hướng dẫn** | ThS. Phạm Minh Đương |

---

## Mục Tiêu Đề Tài

1. **Quản lý và chuẩn hóa hồ sơ CV**: Hỗ trợ người dùng tải lên CV định dạng `.PDF`, `.DOCX` hoặc nhập thông tin CV theo cấu trúc chuẩn; lưu trữ và theo dõi lịch sử các lần phân tích.
2. **Phân tích khách quan, có cơ sở định lượng**: Kết hợp khả năng đọc hiểu ngữ cảnh của Mô hình ngôn ngữ lớn (LLM) với thuật toán tính điểm tại Backend dựa trên danh mục nghề nghiệp và kỹ năng CNTT được quản trị tập trung.
3. **So khớp trực tiếp với Nhà tuyển dụng**: Cho phép đối chiếu CV với tin tuyển dụng thực tế từ doanh nghiệp hoặc yêu cầu nhập tay; chỉ ra điểm phù hợp (`0–100`), các tiêu chí đã đáp ứng kèm trích dẫn bằng chứng từ CV, kỹ năng còn thiếu theo mức độ quan trọng, lời khuyên cải thiện và lưu lại lịch sử đối chiếu.
4. **Bảo vệ quyền riêng tư (PII Masking)**: Tự động che giấu thông tin liên hệ nhạy cảm (email, số điện thoại) trước khi gửi nội dung CV ra dịch vụ AI bên ngoài.
5. **Quản trị hệ thống toàn diện (Admin)**: Cung cấp bảng điều khiển thống kê, quản lý danh mục nghề/kỹ năng, quản lý nhà tuyển dụng và tin tuyển dụng, quản lý tài khoản người dùng và nhật ký kiểm toán (`Audit Log`).

---

## Công Nghệ Sử Dụng

| Thành phần | Công nghệ / Thư viện | Vai trò |
| :--- | :--- | :--- |
| **Frontend** | React, Vite, Recharts, CSS3 | Giao diện người dùng SPA, biểu đồ Radar & thống kê, hiệu ứng quét CV |
| **Backend** | ASP.NET Core Web API (.NET 10), EF Core, JWT, Rate Limiting | Điều phối nghiệp vụ, xác thực & phân quyền (RBAC), tính điểm khớp, hàng đợi xử lý nền |
| **AI Service** | Python, FastAPI, Pydantic, PyMuPDF (`fitz`), `python-docx` | Trích xuất văn bản PDF/DOCX, ẩn danh PII, gọi LLM trả JSON có cấu trúc |
| **Cơ sở dữ liệu** | Microsoft SQL Server 2022 | Lưu trữ người dùng, CV, lịch sử phân tích, đối chiếu nhà tuyển dụng, danh mục & audit |
| **Triển khai** | Docker, Docker Compose, Nginx | Đóng gói và vận hành đồng bộ đa dịch vụ |

---

## Cấu Trúc Thư Mục

```text
.
├── frontend/               # Ứng dụng React + Vite (giao diện người dùng & Admin)
├── backend/                # ASP.NET Core Web API (.NET 10), EF Core & Migrations
├── ai-service/             # Dịch vụ FastAPI trích xuất CV, ẩn danh PII & gọi LLM
├── docx/                   # Tài liệu báo cáo đồ án chuyên ngành (.docx)
├── docker-compose.yml      # Cấu hình chạy toàn bộ hệ thống bằng Docker
├── dotnet-tools.json       # Công cụ dotnet-ef quản lý migration
├── .env.example            # File mẫu biến môi trường
└── README.md               # Tài liệu giới thiệu và hướng dẫn triển khai
```

---

## Cách Cài Đặt Và Triển Khai

### 1. Yêu cầu môi trường
- **Nếu chạy bằng Docker (khuyên dùng):** Cài đặt [Docker Desktop](https://www.docker.com/products/docker-desktop/).
- **Nếu chạy phát triển cục bộ (Local):** Cài đặt [.NET 10 SDK](https://dotnet.microsoft.com/), [Node.js](https://nodejs.org/) (v20+), [Python](https://www.python.org/) (3.11+) và SQL Server (hoặc chạy riêng container SQL Server).

### 2. Cấu hình biến môi trường
Tại thư mục gốc dự án, tạo file `.env` từ file mẫu:

```powershell
Copy-Item .env.example .env
```

Mở file `.env` và điền các giá trị phù hợp:
- `SA_PASSWORD`: Mật khẩu tài khoản `sa` của SQL Server (tối thiểu 8 ký tự gồm chữ hoa, chữ thường, số và ký tự đặc biệt).
- `JWT_SIGNING_KEY`: Chuỗi bí mật ký JWT (tối thiểu 32 ký tự).
- `INTERNAL_API_KEY`: Khóa xác thực nội bộ giữa Backend và AI Service.
- `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_MODEL`, `LLM_API_KEY`: Thông tin kết nối nhà cung cấp mô hình AI.
- `CORS_ALLOWED_ORIGIN`: `http://localhost:5173`
- `VITE_API_BASE_URL`: `http://localhost:5000`

---

### 3. Cách 1: Triển khai toàn hệ thống bằng Docker Compose (Khuyên dùng)

1. **Kiểm tra cấu hình và khởi chạy các dịch vụ:**
   ```powershell
   docker compose config --quiet
   docker compose up -d --build
   ```

2. **Áp dụng Migration cơ sở dữ liệu** *(Backend không tự migrate khi khởi động)*:
   Chờ container `sqlserver` ở trạng thái `healthy`, sau đó chạy từ thư mục gốc:
   ```powershell
   dotnet tool restore
   dotnet ef database update --project backend/CvAdvisor.Api.csproj --startup-project backend/CvAdvisor.Api.csproj
   ```

3. **Tạo tài khoản Admin đầu tiên** *(chỉ chạy lần đầu khi chưa có Admin)*:
   ```powershell
   docker compose run --rm backend admin-bootstrap
   ```

4. **Truy cập hệ thống:**
   - **Giao diện người dùng (Frontend):** <http://localhost:5173>
   - **Trang quản trị (Admin):** <http://localhost:5173/admin/login>
   - **Backend API:** <http://localhost:5000>
   - **SQL Server:** `localhost,1433` *(AI Service chỉ giao tiếp nội bộ trong mạng Docker)*

5. **Các lệnh quản lý thường dùng:**
   ```powershell
   # Xem log của backend và ai-service
   docker compose logs -f backend ai-service

   # Dừng hệ thống (giữ nguyên dữ liệu database)
   docker compose stop
   ```

---

### 4. Cách 2: Cài đặt và chạy từng thành phần khi phát triển (Local)

1. **Khởi động SQL Server:**
   ```powershell
   docker compose up -d sqlserver
   ```

2. **Cập nhật Database & chạy Backend:**
   ```powershell
   dotnet ef database update --project backend/CvAdvisor.Api.csproj --startup-project backend/CvAdvisor.Api.csproj
   cd backend
   dotnet run --launch-profile http
   ```
   *(Để tạo tài khoản Admin khi chạy local: `dotnet run --project backend/CvAdvisor.Api.csproj -- admin-bootstrap`)*

3. **Chạy AI Service** *(mở terminal mới)*:
   ```powershell
   cd ai-service
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

4. **Chạy Frontend** *(mở terminal mới)*:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

---

## Lưu Ý Bảo Mật & Giới Hạn

- Không đưa file `.env` hoặc khóa API thật lên Git; chỉ lưu `.env.example`.
- Hệ thống tự động ẩn danh email và số điện thoại trước khi gửi nội dung CV tới dịch vụ AI bên ngoài.
- Kết quả phân tích và điểm số phù hợp chỉ mang tính chất tham khảo hỗ trợ định hướng nghề nghiệp, không thay thế hoàn toàn đánh giá tuyển dụng của con người.
