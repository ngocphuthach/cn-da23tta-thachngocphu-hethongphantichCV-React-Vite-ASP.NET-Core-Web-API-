import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminAuth } from '../context/useAdminAuth'
import { adminService } from '../services/adminService'
import { ApiError } from '../services/apiClient'

export function AdminAuditPage() {
  const { token } = useAdminAuth()
  const [data, setData] = useState(null)
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const load = useCallback(() => adminService.audit(token, page)
    .then(setData)
    .catch((err) => setError(err instanceof ApiError ? err.payload?.message || 'Không thể tải nhật ký.' : 'Không thể kết nối máy chủ.')),
  [token, page])
  useEffect(() => { load() }, [load])

  return <section className="admin-page">
    <header className="page-heading"><div><p className="eyebrow">QUẢN TRỊ · CHỈ ĐỌC</p><h1>Nhật ký thay đổi</h1><p className="muted">Ghi nhận các thao tác quản trị.</p></div><Link className="button button-secondary" to="/admin/catalog">Danh mục</Link></header>
    {error && <div role="alert" className="notice error">{error}</div>}
    <section className="panel admin-panel table-panel"><table className="admin-table"><thead><tr><th>Thời điểm</th><th>Người thực hiện</th><th>Thao tác</th><th>Đối tượng</th><th>Trước</th><th>Sau</th></tr></thead><tbody>{data?.items?.map((item) => <tr key={item.auditId}><td>{new Date(item.occurredAt).toLocaleString('vi-VN')}</td><td className="code-label">{item.actorUserId}</td><td>{item.action}</td><td>{item.objectType}<br /><span className="code-label">{item.objectId}</span></td><td><pre className="audit-json">{item.beforeJson || '—'}</pre></td><td><pre className="audit-json">{item.afterJson || '—'}</pre></td></tr>)}</tbody></table>{!data?.items?.length && !error && <div className="empty-state">Chưa có thay đổi nào được ghi.</div>}</section>
    <nav className="admin-pagination" aria-label="Phân trang nhật ký"><button className="button button-quiet" disabled={page <= 1 || !data} onClick={() => setPage((value) => value - 1)}>Trước</button><span>Trang {page} · {data?.totalCount ?? 0} mục</span><button className="button button-quiet" disabled={!data || page * data.pageSize >= data.totalCount} onClick={() => setPage((value) => value + 1)}>Sau</button></nav>
  </section>
}
