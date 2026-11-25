import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileTextIcon, RefreshCwIcon } from '../components/Icons'
import { useAdminAuth } from '../context/useAdminAuth'
import { adminService } from '../services/adminService'
import { ApiError } from '../services/apiClient'

function errorMessage(error) {
  return error instanceof ApiError ? error.payload?.message || 'Không thể tải danh sách CV.' : 'Không thể kết nối máy chủ.'
}

export function AdminCvsPage() {
  const { token } = useAdminAuth()
  const [page, setPage] = useState(1)
  const [sourceType, setSourceType] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const load = useCallback(() => adminService.cvs(token, page, sourceType)
    .then((result) => { setData(result); setError('') })
    .catch((requestError) => setError(errorMessage(requestError))), [token, page, sourceType])

  useEffect(() => { load() }, [load])

  return <section className="admin-page">
    <header className="page-heading">
      <div><p className="eyebrow">HỒ SƠ ĐÃ LƯU</p><h1>Quản lý CV</h1><p className="muted">Theo dõi loại hồ sơ và lịch sử xử lý bằng dữ liệu tổng quát.</p></div>
      <button className="button button-quiet" type="button" onClick={load}><RefreshCwIcon size={17} /> Làm mới</button>
    </header>
    <div className="notice info"><FileTextIcon size={17} /> Trang này không hiển thị tên CV, tên file, email, nội dung CV, evidence hoặc kết quả phân tích.</div>
    {error && <div role="alert" className="notice error">{error}</div>}
    <div className="admin-filter"><label htmlFor="admin-cv-source">Nguồn CV</label><select id="admin-cv-source" value={sourceType} onChange={(event) => { setPage(1); setSourceType(event.target.value) }}><option value="">Tất cả</option><option value="Upload">Tải file</option><option value="Manual">Nhập tay</option></select></div>
    <section className="panel admin-panel table-panel">
      <table className="admin-table"><thead><tr><th>CV ID</th><th>User ID</th><th>Nguồn</th><th>Ngày tạo</th><th>Số lần phân tích</th><th>Lần gần nhất</th><th></th></tr></thead>
        <tbody>{data?.items?.map((item) => <tr key={item.cvId}>
          <td className="code-label">{item.cvId}</td><td className="code-label">{item.userId}</td>
          <td>{item.sourceType === 'Manual' ? 'Nhập tay' : 'Tải file'}</td>
          <td>{new Date(item.createdAt).toLocaleString('vi-VN')}</td><td>{item.analysisCount}</td>
          <td>{item.latestAnalysisStatus ? <span className={`status status-${item.latestAnalysisStatus.toLowerCase()}`}>{item.latestAnalysisStatus === 'Pending' ? 'Đang xử lý' : item.latestAnalysisStatus === 'Completed' ? 'Hoàn tất' : 'Thất bại'}</span> : 'Chưa phân tích'}</td>
          <td><Link className="button button-quiet" to={`/admin/analyses?cvId=${item.cvId}`}>Lịch sử</Link></td>
        </tr>)}</tbody>
      </table>
      {data?.items?.length === 0 && <div className="empty-state">Chưa có CV phù hợp bộ lọc.</div>}
      {!data && !error && <div className="empty-state">Đang tải danh sách CV…</div>}
    </section>
    <nav className="admin-pagination" aria-label="Phân trang CV">
      <button className="button button-quiet" disabled={page <= 1 || !data} onClick={() => setPage((value) => value - 1)}>Trước</button>
      <span>Trang {page} · {data?.totalCount ?? 0} CV</span>
      <button className="button button-quiet" disabled={!data || page * data.pageSize >= data.totalCount} onClick={() => setPage((value) => value + 1)}>Sau</button>
    </nav>
  </section>
}
