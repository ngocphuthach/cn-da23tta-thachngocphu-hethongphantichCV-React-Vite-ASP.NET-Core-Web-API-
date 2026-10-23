import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAdminAuth } from '../context/useAdminAuth'
import { adminService } from '../services/adminService'
import { ApiError } from '../services/apiClient'

const codePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const emptyJob = { code: '', name: '', category: '', description: '' }
const emptySkill = { code: '', name: '', category: '' }

function errorText(error) {
  if (error instanceof ApiError) return error.payload?.message || 'Không thể hoàn tất thao tác. Vui lòng thử lại.'
  return 'Không thể kết nối máy chủ. Vui lòng thử lại sau.'
}

export function AdminCatalogPage() {
  const { token } = useAdminAuth()
  const [jobs, setJobs] = useState([])
  const [skills, setSkills] = useState([])
  const [selectedJobId, setSelectedJobId] = useState('')
  const [jobForm, setJobForm] = useState(emptyJob)
  const [skillForm, setSkillForm] = useState(emptySkill)
  const [editingJob, setEditingJob] = useState(null)
  const [editingSkill, setEditingSkill] = useState(null)
  const [selectedSkillId, setSelectedSkillId] = useState('')
  const [importance, setImportance] = useState(3)
  const [isRequired, setIsRequired] = useState(true)
  const [editingLink, setEditingLink] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const selectedJob = jobs.find((item) => String(item.jobPositionId) === String(selectedJobId))
  const activeSkills = useMemo(() => skills.filter((item) => item.isActive), [skills])

  const refresh = useCallback(async () => {
    const [jobData, skillData] = await Promise.all([adminService.jobs(token), adminService.skills(token)])
    setJobs(jobData)
    setSkills(skillData)
    setSelectedJobId((current) => current || String(jobData[0]?.jobPositionId || ''))
  }, [token])

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const [jobData, skillData] = await Promise.all([adminService.jobs(token), adminService.skills(token)])
        if (!active) return
        setJobs(jobData)
        setSkills(skillData)
        setSelectedJobId((current) => current || String(jobData[0]?.jobPositionId || ''))
      } catch (err) { if (active) setError(errorText(err)) }
    }
    load()
    return () => { active = false }
  }, [token])

  const run = async (action, success) => {
    setBusy(true); setError(''); setNotice('')
    try { await action(); await refresh(); setNotice(success); return true }
    catch (err) { setError(errorText(err)); return false }
    finally { setBusy(false) }
  }

  const saveJob = (event) => {
    event.preventDefault()
    if (!jobForm.name.trim() || !jobForm.category.trim() || (!editingJob && !codePattern.test(jobForm.code))) {
      setError('Vui lòng nhập tên, nhóm và mã hợp lệ (chữ thường, số, dấu gạch ngang).'); return
    }
    if (editingJob && !window.confirm('Lưu thay đổi nghề này?')) return
    const body = editingJob
      ? { name: jobForm.name, category: jobForm.category, description: jobForm.description || null, isActive: jobForm.isActive, rowVersion: jobForm.rowVersion }
      : jobForm
    run(() => editingJob ? adminService.updateJob(token, editingJob.jobPositionId, body) : adminService.createJob(token, body), 'Đã lưu nghề và ghi nhật ký thay đổi.')
      .then((ok) => { if (ok) { setEditingJob(null); setJobForm(emptyJob) } })
  }

  const editJob = (job) => {
    setEditingJob(job)
    setJobForm({ ...job, isActive: job.isActive })
  }

  const saveSkill = (event) => {
    event.preventDefault()
    if (!skillForm.name.trim() || !skillForm.category.trim() || (!editingSkill && !codePattern.test(skillForm.code))) {
      setError('Vui lòng nhập tên, nhóm và mã hợp lệ (chữ thường, số, dấu gạch ngang).'); return
    }
    if (editingSkill && !window.confirm('Lưu thay đổi kỹ năng này?')) return
    const body = editingSkill
      ? { name: skillForm.name, category: skillForm.category, isActive: skillForm.isActive, rowVersion: skillForm.rowVersion }
      : skillForm
    run(() => editingSkill ? adminService.updateSkill(token, editingSkill.skillId, body) : adminService.createSkill(token, body), 'Đã lưu kỹ năng và ghi nhật ký thay đổi.')
      .then((ok) => { if (ok) { setEditingSkill(null); setSkillForm(emptySkill) } })
  }

  const saveLink = (event) => {
    event.preventDefault()
    if (!selectedJob || !selectedSkillId) { setError('Chọn một nghề và một kỹ năng đang hoạt động.'); return }
    const body = { importance: Number(importance), isRequired, ...(editingLink ? { rowVersion: editingLink.rowVersion } : {}) }
    run(() => adminService.updateLink(token, selectedJob.jobPositionId, Number(selectedSkillId), body), 'Đã cập nhật liên kết nghề-kỹ năng.')
      .then((ok) => { if (ok) { setEditingLink(null); setSelectedSkillId(''); setImportance(3); setIsRequired(true) } })
  }

  const removeLink = (link) => {
    if (!window.confirm(`Gỡ kỹ năng “${link.skillName}” khỏi nghề này?`)) return
    run(() => adminService.removeLink(token, selectedJob.jobPositionId, link.skillId, link.rowVersion), 'Đã gỡ liên kết.')
  }

  const beginEditLink = (link) => {
    setSelectedSkillId(String(link.skillId)); setImportance(link.importance); setIsRequired(link.isRequired); setEditingLink(link)
  }

  return (
    <section className="admin-page">
      <header className="page-heading"><div><p className="eyebrow">QUẢN TRỊ · GIAI ĐOẠN A</p><h1>Danh mục nghề & kỹ năng</h1><p className="muted">Thay đổi được ghi nhật ký và áp dụng cho lượt phân tích mới.</p></div><Link className="button button-secondary" to="/admin/audit">Nhật ký thay đổi</Link></header>
      {error && <div role="alert" className="notice error">{error}</div>}{notice && <div role="status" className="notice success">{notice}</div>}
      <div className="admin-grid">
        <section className="panel admin-panel"><h2>Nghề CNTT</h2>
          <form className="admin-form" onSubmit={saveJob}>
            <label>Mã nghề<input maxLength={50} disabled={Boolean(editingJob)} value={jobForm.code} onChange={(e) => setJobForm({ ...jobForm, code: e.target.value })} required /></label>
            <label>Tên nghề<input maxLength={120} value={jobForm.name} onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })} required /></label>
            <label>Nhóm<input maxLength={60} value={jobForm.category} onChange={(e) => setJobForm({ ...jobForm, category: e.target.value })} required /></label>
            <label className="admin-wide">Mô tả<textarea maxLength={1000} value={jobForm.description || ''} onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })} /></label>
            {editingJob && <label className="admin-check"><input type="checkbox" checked={jobForm.isActive} onChange={(e) => setJobForm({ ...jobForm, isActive: e.target.checked })} /> Đang hoạt động</label>}
            <div className="admin-actions"><button className="button button-primary" disabled={busy}>{editingJob ? 'Lưu nghề' : 'Thêm nghề'}</button>{editingJob && <button type="button" className="button button-quiet" onClick={() => { setEditingJob(null); setJobForm(emptyJob) }}>Hủy sửa</button>}</div>
          </form>
          <div className="admin-list">{jobs.map((job) => <article className={`admin-item ${!job.isActive ? 'is-inactive' : ''}`} key={job.jobPositionId}><div><strong>{job.name}</strong><span className="code-label">{job.code} · {job.category}{job.isActive ? '' : ' · Đã vô hiệu hóa'}</span>{job.warnings?.map((warning) => <small className="notice warning compact" key={warning}>{warning}</small>)}</div><button className="button button-quiet" onClick={() => { setSelectedJobId(String(job.jobPositionId)); editJob(job) }}>Sửa</button></article>)}</div>
        </section>

        <section className="panel admin-panel"><h2>Kỹ năng</h2>
          <form className="admin-form" onSubmit={saveSkill}>
            <label>Mã kỹ năng<input maxLength={60} disabled={Boolean(editingSkill)} value={skillForm.code} onChange={(e) => setSkillForm({ ...skillForm, code: e.target.value })} required /></label>
            <label>Tên kỹ năng<input maxLength={100} value={skillForm.name} onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })} required /></label>
            <label>Nhóm<input maxLength={60} value={skillForm.category} onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })} required /></label>
            {editingSkill && <label className="admin-check"><input type="checkbox" checked={skillForm.isActive} onChange={(e) => setSkillForm({ ...skillForm, isActive: e.target.checked })} /> Đang hoạt động</label>}
            <div className="admin-actions"><button className="button button-primary" disabled={busy}>{editingSkill ? 'Lưu kỹ năng' : 'Thêm kỹ năng'}</button>{editingSkill && <button type="button" className="button button-quiet" onClick={() => { setEditingSkill(null); setSkillForm(emptySkill) }}>Hủy sửa</button>}</div>
          </form>
          <div className="admin-list">{skills.map((skill) => <article className={`admin-item ${!skill.isActive ? 'is-inactive' : ''}`} key={skill.skillId}><div><strong>{skill.name}</strong><span className="code-label">{skill.code} · {skill.category}{skill.isActive ? '' : ' · Đã vô hiệu hóa'}</span></div><button className="button button-quiet" onClick={() => { setEditingSkill(skill); setSkillForm({ ...skill }) }}>Sửa</button></article>)}</div>
        </section>
      </div>

      <section className="panel admin-panel section-block"><h2>Liên kết kỹ năng với nghề</h2>
        <div className="admin-form admin-link-select"><label>Nghề<select value={selectedJobId} onChange={(e) => { setSelectedJobId(e.target.value); setEditingLink(null) }}>{jobs.map((job) => <option key={job.jobPositionId} value={job.jobPositionId}>{job.name}{job.isActive ? '' : ' (đã tắt)'}</option>)}</select></label>
          <form className="admin-form admin-link-form" onSubmit={saveLink}><label>Kỹ năng<select value={selectedSkillId} onChange={(e) => setSelectedSkillId(e.target.value)}><option value="">Chọn kỹ năng</option>{activeSkills.map((skill) => <option key={skill.skillId} value={skill.skillId}>{skill.name}</option>)}</select></label><label>Trọng số 1–5<input type="number" min="1" max="5" value={importance} onChange={(e) => setImportance(e.target.value)} required /></label><label className="admin-check"><input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} /> Bắt buộc</label><button className="button button-primary" disabled={busy}>{editingLink ? 'Lưu liên kết' : 'Thêm / cập nhật liên kết'}</button></form></div>
        {!selectedJob ? <p className="muted">Chưa có nghề để quản lý.</p> : <div className="table-panel"><table className="admin-table"><thead><tr><th>Kỹ năng</th><th>Trọng số</th><th>Bắt buộc</th><th>Thao tác</th></tr></thead><tbody>{selectedJob.skills.map((link) => <tr key={link.skillId}><td>{link.skillName}{!skills.find((skill) => skill.skillId === link.skillId)?.isActive && <small> · kỹ năng đã tắt</small>}</td><td>{link.importance}</td><td>{link.isRequired ? 'Có' : 'Không'}</td><td><button className="text-button" onClick={() => beginEditLink(link)}>Sửa</button><button className="text-button danger-text" onClick={() => removeLink(link)}>Gỡ</button></td></tr>)}</tbody></table>{selectedJob.skills.length === 0 && <p className="empty-state">Nghề này chưa có kỹ năng liên kết.</p>}</div>}
      </section>
    </section>
  )
}
