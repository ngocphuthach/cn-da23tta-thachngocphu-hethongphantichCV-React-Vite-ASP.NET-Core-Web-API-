import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAdminAuth } from '../context/useAdminAuth'
import { adminService } from '../services/adminService'
import { ApiError } from '../services/apiClient'

const failureLabels = {
  AiUnavailable: 'AI không khả dụng', AiTimeout: 'AI quá thời gian chờ', AiRejected: 'AI từ chối yêu cầu',
  InvalidResult: 'Kết quả không hợp lệ', FileInvalid: 'CV không hợp lệ', Unknown: 'Lỗi chưa xác định',
}

export function AdminAnalysesPage() {
  const { token } = useAdminAuth()
  const [searchParams] = useSearchParams()
  const cvId = searchParams.get('cvId') || ''
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const load = useCallback(() => adminService.analyses(token, page, status, cvId)
    .then((result) => { setData(result); setError('') })
    .catch((err) => setError(err instanceof ApiError ? err.payload?.message || 'Không thể tải danh sách phân tích.' : 'Không thể kết nối máy chủ.')),
  [token, page, status, cvId])
  useEffect(() => { load() }, [load])

  return <section className="admin-page">
    <header className="page-heading"><div><p className="eyebrow">THEO DÕI HỆ THỐNG</p><h1>Phân tích toàn hệ thống</h1><p className="muted">Chỉ hiển thị siêu dữ liệu, không hiển thị nội dung CV.</p></div></header>
    {cvId && <div className="notice info admin-cv-filter-notice">Đang lọc theo CV <code>{cvId}</code><Link to="/admin/analyses">Xóa bộ lọc</Link></div>}
    {error && <div role="alert" className="notice error">{error}</div>}
    <div className="admin-filter"><label htmlFor="analysis-status">Lọc trạng thái</label><select id="analysis-status" value={status} onChange={(event) => { setPage(1); setStatus(event.target.value) }}><option value="">Tất cả</option><option value="Pending">Đang xử lý</option><option value="Completed">Hoàn tất</option><option value="Failed">Thất bại</option></select></div>
    <section className="panel admin-panel table-panel"><table className="admin-table"><thead><tr><th>Analysis ID</th><th>Trạng thái</th><th>Tạo lúc</th><th>Hoàn tất</th><th>Thời lượng (giây)</th><th>Điểm</th><th>Mã lỗi</th></tr></thead><tbody>{data?.items?.map((item) => <tr key={item.analysisId}><td className="code-label">{item.analysisId}</td><td><span className={`status status-${item.status.toLowerCase()}`}>{item.status === 'Pending' ? 'Đang xử lý' : item.status === 'Completed' ? 'Hoàn tất' : 'Thất bại'}</span></td><td>{new Date(item.createdAt).toLocaleString('vi-VN')}</td><td>{item.completedAt ? new Date(item.completedAt).toLocaleString('vi-VN') : '—'}</td><td>{item.durationSeconds == null ? '—' : item.durationSeconds.toFixed(1)}</td><td>{item.overallScore == null ? '—' : item.overallScore}</td><td>{item.failureCode ? <><span className="code-label">{item.failureCode}</span><br />{failureLabels[item.failureCode] || 'Không rõ'}</> : 'Không rõ'}</td></tr>)}</tbody></table>{data?.items?.length === 0 && <div className="empty-state">Chưa có bản ghi phù hợp.</div>}{!data && !error && <div className="empty-state">Đang tải danh sách…</div>}</section>
    <nav className="admin-pagination" aria-label="Phân trang phân tích"><button className="button button-quiet" disabled={page <= 1 || !data} onClick={() => setPage((value) => value - 1)}>Trước</button><span>Trang {page} · {data?.totalCount ?? 0} bản ghi</span><button className="button button-quiet" disabled={!data || page * data.pageSize >= data.totalCount} onClick={() => setPage((value) => value + 1)}>Sau</button></nav>
  </section>
}
