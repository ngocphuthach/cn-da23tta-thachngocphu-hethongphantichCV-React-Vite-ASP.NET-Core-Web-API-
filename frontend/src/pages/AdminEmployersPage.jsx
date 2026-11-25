import { useCallback, useEffect, useState } from 'react'
import { useAdminAuth } from '../context/useAdminAuth'
import { adminService } from '../services/adminService'
import { ApiError } from '../services/apiClient'
import { BriefcaseIcon, RefreshCwIcon } from '../components/Icons'

const emptyEmployer = { name: '', websiteUrl: '', careersUrl: '' }
const emptyPosting = { employerId: '', title: '', location: 'Cần Thơ', requirements: '', sourceUrl: '', deadlineDate: '' }

function errorMessage(error) {
  if (error instanceof ApiError) return error.payload?.message || 'Không thể hoàn tất thao tác. Vui lòng thử lại.'
  return 'Không thể kết nối máy chủ. Vui lòng thử lại sau.'
}

export function AdminEmployersPage() {
  const { token } = useAdminAuth()
  const [employers, setEmployers] = useState([])
  const [postings, setPostings] = useState([])
  const [employerForm, setEmployerForm] = useState(emptyEmployer)
  const [postingForm, setPostingForm] = useState(emptyPosting)
  const [editingEmployer, setEditingEmployer] = useState(null)
  const [editingPosting, setEditingPosting] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const [employerData, postingData] = await Promise.all([
      adminService.employers(token), adminService.employerPostings(token),
    ])
    setEmployers(employerData)
    setPostings(postingData)
    setPostingForm((current) => ({ ...current, employerId: current.employerId || String(employerData.find((item) => item.isActive)?.employerId || '') }))
  }, [token])

  useEffect(() => {
    let active = true
    Promise.all([adminService.employers(token), adminService.employerPostings(token)])
      .then(([employerData, postingData]) => {
        if (!active) return
        setEmployers(employerData)
        setPostings(postingData)
        setPostingForm((current) => ({ ...current, employerId: current.employerId || String(employerData.find((item) => item.isActive)?.employerId || '') }))
      })
      .catch((requestError) => { if (active) setError(errorMessage(requestError)) })
    return () => { active = false }
  }, [token])

  async function submit(action, success) {
    setBusy(true); setError(''); setNotice('')
    try { await action(); await refresh(); setNotice(success); return true }
    catch (requestError) { setError(errorMessage(requestError)); return false }
    finally { setBusy(false) }
  }

  function saveEmployer(event) {
    event.preventDefault()
    const name = employerForm.name.trim()
    if (!name || name.length > 200) { setError('Tên nhà tuyển dụng cần từ 1 đến 200 ký tự.'); return }
    const body = editingEmployer
      ? { ...employerForm, name, isActive: employerForm.isActive, rowVersion: editingEmployer.rowVersion }
      : { ...employerForm, name }
    submit(() => editingEmployer
      ? adminService.updateEmployer(token, editingEmployer.employerId, body)
      : adminService.createEmployer(token, body), 'Đã lưu thông tin nhà tuyển dụng.')
      .then((ok) => { if (ok) { setEditingEmployer(null); setEmployerForm(emptyEmployer) } })
  }

  function editEmployer(item) {
    setEditingEmployer(item)
    setEmployerForm({ name: item.name, websiteUrl: item.websiteUrl || '', careersUrl: item.careersUrl || '', isActive: item.isActive })
  }

  function savePosting(event) {
    event.preventDefault()
    if (!postingForm.employerId || !postingForm.deadlineDate || postingForm.requirements.trim().length < 20) {
      setError('Chọn nhà tuyển dụng, hạn nộp và nhập yêu cầu tuyển dụng (ít nhất 20 ký tự).'); return
    }
    const body = {
      employerId: Number(postingForm.employerId), title: postingForm.title.trim(),
      location: postingForm.location.trim(), requirements: postingForm.requirements.trim(),
      sourceUrl: postingForm.sourceUrl.trim(), deadlineAt: postingForm.deadlineDate + 'T00:00:00',
      ...(editingPosting ? { isActive: postingForm.isActive, rowVersion: editingPosting.rowVersion } : {}),
    }
    submit(() => editingPosting
      ? adminService.updateEmployerPosting(token, editingPosting.employerJobPostingId, body)
      : adminService.createEmployerPosting(token, body), 'Đã lưu tin tuyển dụng.')
      .then((ok) => { if (ok) { setEditingPosting(null); setPostingForm((current) => ({ ...emptyPosting, employerId: current.employerId })) } })
  }

  function editPosting(item) {
    setEditingPosting(item)
    setPostingForm({
      employerId: String(item.employerId), title: item.title, location: item.location,
      requirements: item.requirements, sourceUrl: item.sourceUrl,
      deadlineDate: new Date(item.deadlineAt).toISOString().slice(0, 10), isActive: item.isActive,
    })
  }

  return <div className="admin-page">
    <div className="section-title">
      <div><p className="eyebrow">ĐỐI CHIẾU TUYỂN DỤNG</p><h1>Nhà tuyển dụng &amp; tin tuyển dụng</h1>
        <p className="muted">Quản lý nguồn tin có hạn nộp để người dùng so khớp CV với yêu cầu cụ thể.</p></div>
      <button className="button button-quiet" type="button" disabled={busy} onClick={() => { setError(''); refresh().catch((e) => setError(errorMessage(e))) }}><RefreshCwIcon size={15} /> Làm mới</button>
    </div>
    {error && <div className="notice error" role="alert">{error}</div>}
    {notice && <div className="notice success" role="status">{notice}</div>}

    <section className="saas-card" style={{ padding: 24, marginBottom: 22 }}>
      <h2>{editingEmployer ? 'Sửa nhà tuyển dụng' : 'Thêm nhà tuyển dụng'}</h2>
      <form onSubmit={saveEmployer} className="admin-employer-form">
        <label>Tên nhà tuyển dụng<input required maxLength={200} value={employerForm.name} onChange={(e) => setEmployerForm({ ...employerForm, name: e.target.value })} /></label>
        <label>Website HTTPS<input type="url" maxLength={500} value={employerForm.websiteUrl} onChange={(e) => setEmployerForm({ ...employerForm, websiteUrl: e.target.value })} placeholder="https://..." /></label>
        <label>Trang tuyển dụng HTTPS<input type="url" maxLength={500} value={employerForm.careersUrl} onChange={(e) => setEmployerForm({ ...employerForm, careersUrl: e.target.value })} placeholder="https://..." /></label>
        {editingEmployer && <label className="admin-employer-check"><input type="checkbox" checked={employerForm.isActive} onChange={(e) => setEmployerForm({ ...employerForm, isActive: e.target.checked })} /> Đang hoạt động</label>}
        <div className="admin-employer-actions"><button className="button button-primary" disabled={busy}><BriefcaseIcon size={16} /> {busy ? 'Đang lưu…' : 'Lưu nhà tuyển dụng'}</button>{editingEmployer && <button type="button" className="button button-quiet" onClick={() => { setEditingEmployer(null); setEmployerForm(emptyEmployer) }}>Hủy sửa</button>}</div>
      </form>
      <div className="admin-employer-list">{employers.map((item) => <div className="admin-employer-row" key={item.employerId}><div><strong>{item.name}</strong><small>{item.jobPostingCount} tin · {item.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}</small></div><button type="button" className="button button-quiet" onClick={() => editEmployer(item)}>Sửa</button></div>)}</div>
    </section>

    <section className="saas-card" style={{ padding: 24, marginBottom: 22 }}>
      <h2>{editingPosting ? 'Sửa tin tuyển dụng' : 'Thêm tin tuyển dụng có nguồn'}</h2>
      <form onSubmit={savePosting} className="admin-employer-form">
        <label>Nhà tuyển dụng<select required value={postingForm.employerId} onChange={(e) => setPostingForm({ ...postingForm, employerId: e.target.value })}><option value="">Chọn công ty</option>{employers.filter((item) => item.isActive).map((item) => <option key={item.employerId} value={item.employerId}>{item.name}</option>)}</select></label>
        <label>Vị trí<input required maxLength={200} value={postingForm.title} onChange={(e) => setPostingForm({ ...postingForm, title: e.target.value })} /></label>
        <label>Địa điểm<input required maxLength={120} value={postingForm.location} onChange={(e) => setPostingForm({ ...postingForm, location: e.target.value })} /></label>
        <label>Hạn nộp<input required type="date" value={postingForm.deadlineDate} onChange={(e) => setPostingForm({ ...postingForm, deadlineDate: e.target.value })} /></label>
        <label className="admin-employer-wide">Yêu cầu tuyển dụng<textarea required minLength={20} maxLength={20000} rows={6} value={postingForm.requirements} onChange={(e) => setPostingForm({ ...postingForm, requirements: e.target.value })} /></label>
        <label className="admin-employer-wide">URL nguồn HTTPS<input required type="url" maxLength={1000} value={postingForm.sourceUrl} onChange={(e) => setPostingForm({ ...postingForm, sourceUrl: e.target.value })} placeholder="https://..." /></label>
        {editingPosting && <label className="admin-employer-check"><input type="checkbox" checked={postingForm.isActive} onChange={(e) => setPostingForm({ ...postingForm, isActive: e.target.checked })} /> Đang hoạt động</label>}
        <div className="admin-employer-actions admin-employer-wide"><button className="button button-primary" disabled={busy}><BriefcaseIcon size={16} /> {busy ? 'Đang lưu…' : 'Lưu tin tuyển dụng'}</button>{editingPosting && <button type="button" className="button button-quiet" onClick={() => { setEditingPosting(null); setPostingForm((current) => ({ ...emptyPosting, employerId: current.employerId })) }}>Hủy sửa</button>}</div>
      </form>
      <p className="muted" style={{ marginBottom: 0 }}>Tin hết hạn tự ẩn khỏi danh sách so khớp; lưu URL nguồn để người dùng kiểm tra và ứng tuyển trên trang gốc.</p>
    </section>

    <section className="admin-employer-postings">
      {postings.map((item) => <article className="saas-card admin-employer-posting" key={item.employerJobPostingId}>
        <div><p className="eyebrow">{item.employerName} · {item.location}</p><h3>{item.title}</h3><p className="muted">Hạn nộp {new Date(item.deadlineAt).toLocaleDateString('vi-VN')} · {item.isExpired ? 'Đã hết hạn' : item.isActive ? 'Đang hiển thị' : 'Đã vô hiệu hóa'}</p><a href={item.sourceUrl} target="_blank" rel="noreferrer">Mở nguồn tuyển dụng</a></div>
        <button type="button" className="button button-quiet" onClick={() => editPosting(item)}>Sửa / ẩn</button>
      </article>)}
      {postings.length === 0 && <div className="saas-card empty-state">Chưa có tin tuyển dụng. Thêm công ty và tin có URL nguồn để bật tính năng so khớp.</div>}
    </section>
  </div>
}
