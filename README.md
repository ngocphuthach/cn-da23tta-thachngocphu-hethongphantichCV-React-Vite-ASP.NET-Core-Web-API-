# CV Advisor — Hệ thống phân tích CV & tư vấn nghề nghiệp

Đồ án tốt nghiệp ngành CNTT. Hệ thống cho phép người dùng tải CV lên, dùng AI (Gemini/OpenAI)
phân tích nội dung và đưa ra gợi ý nghề nghiệp, kỹ năng cần cải thiện.

> Trạng thái: Backend hỗ trợ tài khoản JWT, upload CV, gọi AI Service và lưu lịch sử phân tích trong SQL Server.

## Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | React 19 + Vite 8 |
| Backend | ASP.NET Core Web API (.NET 10) |
| AI Service | Python 3.12 + FastAPI + Uvicorn |
| Cơ sở dữ liệu | SQL Server 2022 (chạy bằng Docker) |
| Hạ tầng | Docker Compose, Git/GitHub |

## Cấu trúc thư mục

```
code CN/
├── frontend/            # React + Vite (giao diện người dùng)
├── backend/             # ASP.NET Core Web API (CvAdvisor.Api)
├── ai-service/          # Python FastAPI (phân tích CV, gọi AI)
│   ├── venv/            # virtual environment (không commit)
│   ├── main.py          # FastAPI: /health và /analyze
│   ├── analyzer.py      # trích xuất CV, gọi LLM, kiểm tra JSON
│   ├── llm_client.py    # adapter Gemini/OpenAI-compatible
│   └── requirements.txt
├── docker-compose.yml   # SQL Server 2022
├── .env.example         # mẫu biến môi trường (commit được)
├── .env                 # giá trị thật (KHÔNG commit)
├── .gitignore
└── README.md
```

## Yêu cầu môi trường

- Git, Node.js (>= 20) + npm, .NET SDK 10, Python 3.12, Docker Desktop (bật WSL2).

## Chuẩn bị lần đầu

```powershell
# 1. Tạo file .env từ mẫu rồi sửa mật khẩu / API key
Copy-Item .env.example .env
```

## Cách chạy từng phần

### 1) Cơ sở dữ liệu — SQL Server (Docker)

```powershell
docker compose up -d sqlserver
docker compose ps sqlserver
docker compose logs -f sqlserver
docker compose stop sqlserver
```powershell
cd backend
dotnet run --launch-profile http
```

- API: <http://localhost:5000>
- Swagger UI: <http://localhost:5000/swagger/index.html>
- Cấu hình User Secrets cho `AiService:InternalApiKey` bằng cùng giá trị local với `INTERNAL_API_KEY` của AI Service. Không đặt khóa thật vào `appsettings.json`.
- CV được lưu ngoài thư mục dự án theo `Storage:CvRoot`; để trống sẽ dùng thư mục dữ liệu người dùng bên ngoài repository. Nếu chạy Backend trong container, cần mount đường dẫn lưu này thành volume bền vững.
- `POST /api/cvs` nhận multipart field `file`. Các route `/api/cvs`, `/api/cv-analyses` cần JWT Bearer; Swagger UI có nút **Authorize** để dán access token.
- `POST /api/cvs/{cvId}/analyses` gọi AI Service và lưu lịch sử; giới hạn mặc định 5 lần mỗi 15 phút/user. Timeout AI mặc định 120 giây. Các giới hạn nằm trong `RateLimiting:CvAnalysis` và `AiService:TimeoutSeconds` của `appsettings.json`.
- `GET /api/cv-analyses?page=1&pageSize=20` liệt kê lịch sử có phân trang; `GET /api/cv-analyses/{analysisId}` xem chi tiết; `DELETE /api/cvs/{cvId}` xóa CV và lịch sử liên quan.

### 3) Frontend — React + Vite

```powershell
cd frontend
npm install        # chỉ cần chạy lần đầu
npm run dev
```

- Giao diện: <http://localhost:5173>

### 4) AI Service — Python FastAPI

```powershell
cd ai-service
python -m venv venv                          # tạo virtual environment (lần đầu)
.\venv\Scripts\Activate.ps1                  # kích hoạt venv
pip install -r requirements.txt             # cài thư viện (lần đầu)
uvicorn main:app --reload --port 8000       # chạy service
```

- Health check: <http://localhost:8000/health> → `{"status":"ok"}`
- Tài liệu API: <http://localhost:8000/docs>
- `POST /analyze` nhận multipart field `file`, chỉ PDF/DOCX, tối đa 5 MB. File được kiểm tra đuôi và chữ ký nội dung, giới hạn body multipart và xử lý trong bộ nhớ; ứng dụng không lưu CV thành file.
- Gửi thử bằng PowerShell: `curl.exe -X POST http://localhost:8000/analyze -F "file=@C:\duong-dan\cv.pdf"`
- Nếu đã cấu hình `INTERNAL_API_KEY`, gửi thêm header `X-Internal-Key` có giá trị tương ứng. Không cần header này khi biến chưa được đặt.
- Endpoint trả JSON sau khi validate. File không hợp lệ trả HTTP 400; lỗi LLM hoặc JSON đầu ra sau retry trả HTTP 502 với thông báo đã lược bỏ thông tin nhạy cảm.
- `jobs.json` được nạp một lần khi service khởi động. Cấu hình provider/model vẫn lấy từ `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_MODEL` và `LLM_API_KEY`.

## Bảo mật

- **Không bao giờ** commit file `.env` (đã nằm trong `.gitignore`).
- Chỉ commit `.env.example` với giá trị giả.
- API key thật chỉ để trong `.env` ở máy cá nhân.

## Lộ trình tiếp theo

- [ ] Thiết kế CSDL + EF Core migrations (User, CV, Job, Analysis...)
- [ ] Chức năng đăng nhập/đăng ký (JWT)
- [ ] Upload CV (PDF/DOCX) + trích xuất nội dung
- [ ] Tích hợp AI (Gemini/OpenAI) để phân tích & tư vấn
- [ ] Docker hóa toàn bộ hệ thống + CI/CD

## Ch?y to?n h? th?ng b?ng Docker Compose

Compose ch?y Backend ? Production, AI Service v? SQL Server ch? giao ti?p trong m?ng Docker. Frontend v? Backend ch? bind v?o loopback c?a m?y host.

### C?u h?nh

1. Sao ch?p `.env.example` th?nh `.env` n?u ch?a c?, sau ?? t? ?i?n c?c gi? tr? th?t tr?n m?y c? nh?n. Compose ch? truy?n c?c bi?n ???c khai b?o t??ng minh trong `docker-compose.yml`; c?c bi?n c? nh? `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ConnectionStrings__DefaultConnection` v? `ASPNETCORE_ENVIRONMENT` kh?ng ???c chuy?n v?o container.
2. `JWT_SIGNING_KEY` ph?i c? ?t nh?t 32 k? t?. `INTERNAL_API_KEY` ???c d?ng chung cho Backend v? AI Service. `CORS_ALLOWED_ORIGIN` ph?i kh?p origin c?a tr?nh duy?t; m?u `.env.example` ??t `http://localhost:5173`. N?u bi?n kh?ng c? ho?c r?ng th? Backend kh?ng cho ph?p origin n?o.
3. Chu?i k?t n?i b?n trong Compose d?ng `sqlserver` l?m host v? ???c t?o t? `SA_PASSWORD`. M?t kh?u SQL kh?ng ???c ch?a `;`, `$` ho?c d?u nh?y v? c?c k? t? n?y xung ??t v?i connection string ho?c n?i suy Compose.
4. `VITE_API_BASE_URL` ???c truy?n l?m build arg c?a Vite; ??y l? ??a ch? Backend m? tr?nh duy?t truy c?p, m?c ??nh `http://localhost:5000`.

### Ch?y v? ki?m tra

```powershell
docker compose config --quiet
docker compose up --build
docker compose ps
docker compose logs -f backend ai-service
```

- Frontend: <http://localhost:5173>
- Backend: <http://localhost:5000>
- SQL Server cho SSMS/migration t? m?y host: `localhost,1433` (ch? bind `127.0.0.1`).
- `/health` c?a Backend l? liveness check, kh?ng truy c?p database v? kh?ng ti?t l? c?u h?nh. AI Service c? `/health` cho liveness v? `/ready` cho t?nh tr?ng ?? n?p c?u h?nh LLM; Compose ch? d?ng `/health`.
- Backend healthcheck d?ng `curl`; Dockerfile c?i `curl` trong image runtime. AI healthcheck d?ng `python -c` v? `urllib` c? s?n. Frontend d?ng `busybox wget` trong image Alpine Nginx kh?ng root. SQL healthcheck d?ng `sqlcmd` c? s?n trong image SQL Server 2022 ?? ghim tag.
- File CV ???c l?u ? volume `cvadvisor-cv-files`, t?i `/app/storage` trong Backend. Database ? volume `cvadvisor-mssql-data`.

### M?i tr??ng Backend trong Compose

Compose ??t `ASPNETCORE_ENVIRONMENT=Production` tr?c ti?p, kh?ng l?y gi? tr? c? t? `.env`. V? v?y Swagger/OpenAPI ti?p t?c t?t trong container; khi ch?y Backend local b?ng Development, Swagger v?n b?t. CORS nh?n origin allowlist t? `CORS_ALLOWED_ORIGIN`; ?? tr?ng th? kh?ng cho ph?p origin n?o. Kh?ng d?ng wildcard. Rate limit ??ng nh?p v?n d?a tr?n IP m? ASP.NET Core nh?n th?y; n?u sau n?y th?m reverse proxy, c?n c?u h?nh forwarded headers v? ch? tin proxy ?? bi?t.

### Migration c? ki?m so?t

Backend kh?ng t? ch?y migration khi kh?i ??ng. ??i SQL Server b?o `healthy`, sau ?? ch?y migration t? m?y host b?ng `dotnet ef database update` v?i connection string trong User Secrets tr? t?i `localhost,1433`. D?ng ??ng c?ng c? EF ?? khai b?o trong `dotnet-tools.json`. Seed data ???c ?p d?ng c?ng migration.

### D?ng d?ch v?

D?ng `docker compose stop` ?? d?ng container ho?c `docker compose down` ?? g? container v? network. C? hai c?ch ??u gi? named volume. Kh?ng d?ng `docker compose down -v` n?u mu?n gi? database v? file CV.
