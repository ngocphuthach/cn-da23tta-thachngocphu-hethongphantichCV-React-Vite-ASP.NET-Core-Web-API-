import { useCallback, useEffect, useState } from 'react'
import { useAdminAuth } from '../context/useAdminAuth'
import { adminService } from '../services/adminService'
import { ApiError } from '../services/apiClient'

function errorMessage(error) {
  return error instanceof ApiError ? error.payload?.message || 'Không thể hoàn tất thao tác.' : 'Không thể kết nối máy chủ.'
}

export function AdminUsersPage() {
  const { token, admin } = useAdminAuth()
  const [page, setPage] = useState(1)
  const [queryInput, setQueryInput] = useState('')
  const [email, setEmail] = useState('')
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(() => adminService.users(token, page, email)
    .then((result) => { setData(result); setError('') })
    .catch((err) => setError(errorMessage(err))), [token, page, email])
  useEffect(() => { load() }, [load])

  const search = (event) => {
    event.preventDefault()
    const value = queryInput.trim()
    if (value && value.length < 3) { setError('Nhập ít nhất 3 ký tự để tìm email.'); return }
    setError(''); setPage(1); setEmail(value)
  }

  const toggleStatus = async (item) => {
    const nextActive = !item.isActive
    const action = nextActive ? 'mở khóa' : 'khóa'
    if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản ${item.email}?`)) return
    setBusyId(item.userId); setError(''); setNotice('')
    try {
      await adminService.setUserStatus(token, item.userId, { isActive: nextActive, rowVersion: item.rowVersion })
      await load()
      setNotice(`Đã ${nextActive ? 'mở khóa' : 'khóa'} tài khoản.`)
    } catch (err) { setError(errorMessage(err)) }
    finally { setBusyId(null) }
  }

  return <section className="admin-page">
    <header className="page-heading"><div><p className="eyebrow">QUẢN TRỊ · GIAI ĐOẠN C</p><h1>Người dùng</h1><p className="muted">Khóa tài khoản sẽ có hiệu lực ngay ở các yêu cầu tiếp theo.</p></div></header>
    {error && <div role="alert" className="notice error">{error}</div>}{notice && <div role="status" className="notice success">{notice}</div>}
    <form className="admin-search" onSubmit={search}><label htmlFor="admin-user-search">Tìm theo email</label><input id="admin-user-search" value={queryInput} onChange={(event) => setQueryInput(event.target.value)} maxLength={256} placeholder="Nhập ít nhất 3 ký tự" /><button className="button button-primary">Tìm</button>{email && <button type="button" className="button button-quiet" onClick={() => { setQueryInput(''); setEmail(''); setPage(1) }}>Xóa lọc</button>}</form>
    <section className="panel admin-panel table-panel"><table className="admin-table"><thead><tr><th>Email</th><th>Họ tên</th><th>Ngày tạo</th><th>Vai trò</th><th>Trạng thái</th><th>Số CV</th><th>Thao tác</th></tr></thead><tbody>{data?.items?.map((item) => <tr key={item.userId}><td>{item.email}</td><td>{item.fullName}</td><td>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</td><td>{item.role}</td><td><span className={`status ${item.isActive ? 'status-completed' : 'status-failed'}`}>{item.isActive ? 'Đang hoạt động' : 'Đã khóa'}</span></td><td>{item.cvCount}</td><td><button className={`button ${item.isActive ? 'button-danger-quiet' : 'button-secondary'}`} disabled={busyId === item.userId || (item.userId === admin?.userId && item.isActive)} onClick={() => toggleStatus(item)}>{busyId === item.userId ? 'Đang lưu…' : item.isActive ? 'Khóa' : 'Mở khóa'}</button></td></tr>)}</tbody></table>{data?.items?.length === 0 && <div className="empty-state">Không tìm thấy người dùng phù hợp.</div>}{!data && !error && <div className="empty-state">Đang tải danh sách…</div>}</section>
    <nav className="admin-pagination" aria-label="Phân trang người dùng"><button className="button button-quiet" disabled={page <= 1 || !data} onClick={() => setPage((value) => value - 1)}>Trước</button><span>Trang {page} · {data?.totalCount ?? 0} người dùng</span><button className="button button-quiet" disabled={!data || page * data.pageSize >= data.totalCount} onClick={() => setPage((value) => value + 1)}>Sau</button></nav>
  </section>
}
