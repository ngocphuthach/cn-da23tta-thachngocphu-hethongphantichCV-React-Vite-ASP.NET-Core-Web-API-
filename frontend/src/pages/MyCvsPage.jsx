import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { cvService } from '../services/cvService'
import { getFriendlyError } from '../services/apiClient'
import { readMotionInterval, useReducedMotion } from '../hooks/useReducedMotion'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_MANUAL_TEXT = 30_000
const CV_WRITING_TIPS = [
  'Mô tả kinh nghiệm bằng hành động cụ thể và nêu rõ phần việc bạn đảm nhận.',
  'Ghi kỹ năng gắn với dự án hoặc nhiệm vụ đã thực hiện.',
  'Ưu tiên thông tin liên quan đến vị trí bạn đang hướng tới.',
  'Kiểm tra ngày tháng, lỗi chính tả và cách trình bày trước khi lưu CV.',
]
const MANUAL_FIELDS = [
  ['education', 'Học vấn', 5_000],
  ['skills', 'Kỹ năng', 5_000],
  ['experience', 'Kinh nghiệm', 10_000],
  ['projects', 'Dự án', 10_000],
  ['objective', 'Mục tiêu', 3_000],
]
const EMPTY_MANUAL = { title: '', education: '', skills: '', experience: '', projects: '', objective: '' }

export function MyCvsPage() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const [cvs, setCvs] = useState([])
  const [statuses, setStatuses] = useState({})
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [workingCvId, setWorkingCvId] = useState(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [file, setFile] = useState(null)
  const [analysisMessage, setAnalysisMessage] = useState('')
  const [manual, setManual] = useState(EMPTY_MANUAL)
  const [manualSaving, setManualSaving] = useState(false)
  const [editingCvId, setEditingCvId] = useState(null)
  const [draggingFile, setDraggingFile] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [tipIndex, setTipIndex] = useState(0)
  const abortRef = useRef(null)
  const cancelDeleteRef = useRef(null)
  const confirmDeleteRef = useRef(null)
  const reducedMotion = useReducedMotion()

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const items = await cvService.listCvs(token)
      setCvs(items)
      const pairs = await Promise.all(items.map(async (cv) => {
        try {
          const analyses = await cvService.listCvAnalyses(token, cv.cvId)
          return [cv.cvId, analyses[0]?.status || '']
        } catch { return [cv.cvId, ''] }
      }))
      setStatuses(Object.fromEntries(pairs))
    } catch (requestError) { setError(getFriendlyError(requestError)) }
    finally { setLoading(false) }
  }, [token])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => active && refresh())
    return () => { active = false }
  }, [refresh])

  useEffect(() => {
    if (!info) return undefined
    const timer = window.setTimeout(() => setInfo(''), readMotionInterval('--motion-interval-toast-hide', 4500))
    return () => window.clearTimeout(timer)
  }, [info])

  useEffect(() => {
    if (!workingCvId || reducedMotion) return undefined
    const timer = window.setInterval(() => {
      if (!document.hidden) setTipIndex((index) => (index + 1) % CV_WRITING_TIPS.length)
    }, readMotionInterval('--motion-interval-tip', 5000))
    return () => window.clearInterval(timer)
  }, [reducedMotion, workingCvId])

  useEffect(() => {
    if (!deleteTarget) return undefined
    const previousFocus = document.activeElement
    cancelDeleteRef.current?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { setDeleteTarget(null); return }
      if (event.key === 'Tab') {
        const first = cancelDeleteRef.current
        const last = confirmDeleteRef.current
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus?.()
    }
  }, [deleteTarget])

  async function runAnalysis(cvId) {
    const controller = new AbortController()
    abortRef.current = controller
    let timedOut = false
    const timer = window.setTimeout(() => { timedOut = true; controller.abort() }, 210_000)
    setWorkingCvId(cvId)
    setStatuses((current) => ({ ...current, [cvId]: 'Pending' }))
    setError('')
    setTipIndex(0)
    setAnalysisMessage('Đang phân tích CV. Quá trình có thể mất 1–2 phút; bạn có thể hủy nếu cần.')
    try {
      const result = await cvService.analyze(token, cvId, controller.signal)
      setStatuses((current) => ({ ...current, [cvId]: 'Completed' }))
      navigate(`/analyses/${result.analysisId}`)
    } catch (requestError) {
      setStatuses((current) => ({ ...current, [cvId]: requestError.payload?.analysisId ? 'Failed' : current[cvId] === 'Pending' ? 'Failed' : current[cvId] }))
      setAnalysisMessage('CV vẫn nằm trong danh sách. Bạn có thể xem lịch sử hoặc thử phân tích lại khi phù hợp.')
      await refresh()
      setError(timedOut
        ? 'Đã quá 210 giây. Hãy kiểm tra lịch sử phân tích trước khi gửi yêu cầu khác.'
        : getFriendlyError(requestError))
    } finally {
      window.clearTimeout(timer)
      abortRef.current = null
      setWorkingCvId(null)
    }
  }

  function cancelAnalysis() { abortRef.current?.abort() }

  async function uploadAndAnalyze(event) {
    event.preventDefault()
    const formElement = event.currentTarget
    setError('')
    setInfo('')
    if (!file) { setError('Vui lòng chọn file CV.'); return }
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'docx'].includes(extension) || file.size > MAX_FILE_BYTES || file.size === 0) {
      setError('Chỉ nhận file PDF hoặc DOCX có dung lượng tối đa 5 MB.')
      return
    }
    setUploading(true)
    let uploadedCv = null
    try {
      uploadedCv = await cvService.upload(token, file)
      setCvs((current) => [uploadedCv, ...current])
      setStatuses((current) => ({ ...current, [uploadedCv.cvId]: '' }))
      setFile(null)
      formElement.reset()
      setInfo('Tải CV thành công. Đang bắt đầu phân tích…')
    } catch (requestError) {
      setError(getFriendlyError(requestError))
    } finally { setUploading(false) }
    if (uploadedCv) await runAnalysis(uploadedCv.cvId)
  }

  function handleFileDrop(event) {
    event.preventDefault()
    setDraggingFile(false)
    const droppedFile = event.dataTransfer.files?.[0]
    if (!droppedFile) return
    const extension = droppedFile.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'docx'].includes(extension) || droppedFile.size > MAX_FILE_BYTES || droppedFile.size === 0) {
      setError('Chỉ nhận file PDF hoặc DOCX có dung lượng tối đa 5 MB.')
      return
    }
    setError('')
    setFile(droppedFile)
  }

  function updateManual(field, value) {
    const cleaned = Array.from(value, (character) => {
      const codePoint = character.codePointAt(0)
      return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f) ? ' ' : character
    }).join('')
    setManual((current) => ({ ...current, [field]: cleaned }))
  }

  async function loadManualForNewVersion(cv) {
    setError('')
    try {
      const content = await cvService.getManualContent(token, cv.cvId)
      setManual(content)
      setEditingCvId(cv.cvId)
      setInfo('Đã điền nội dung CV. Khi lưu, hệ thống sẽ tạo CV mới để giữ nguyên lịch sử cũ.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (requestError) { setError(getFriendlyError(requestError)) }
  }

  async function createManualAndAnalyze(event) {
    event.preventDefault()
    setError('')
    setInfo('')
    const values = Object.fromEntries(MANUAL_FIELDS.map(([field]) => [field, manual[field].trim()]))
    const title = manual.title.trim()
    if (!title || title.length > 150) { setError('Tiêu đề CV là bắt buộc và tối đa 150 ký tự.'); return }
    const invalidField = MANUAL_FIELDS.find(([field, , max]) => values[field].length > max)
    if (invalidField) { setError(`Phần ${invalidField[1]} vượt quá ${invalidField[2]} ký tự.`); return }
    const sections = MANUAL_FIELDS.slice(0, 4).filter(([field]) => values[field].length > 0)
    const enteredLength = MANUAL_FIELDS.reduce((total, [field]) => total + values[field].length, 0)
    if (!sections.length || enteredLength < 100) {
      setError('Hãy nhập ít nhất một phần học vấn, kỹ năng, kinh nghiệm hoặc dự án; tổng nội dung cần tối thiểu 100 ký tự.')
      return
    }
    const composedLength = MANUAL_FIELDS.filter(([field]) => values[field])
      .reduce((total, [field, label]) => total + label.length + 2 + values[field].length, 0)
      + Math.max(0, MANUAL_FIELDS.filter(([field]) => values[field]).length - 1) * 2
    if (composedLength > MAX_MANUAL_TEXT) { setError('Tổng nội dung CV không được vượt quá 30.000 ký tự.'); return }

    setManualSaving(true)
    let createdCv = null
    try {
      createdCv = await cvService.createManual(token, { title, ...values })
      setCvs((current) => [createdCv, ...current])
      setStatuses((current) => ({ ...current, [createdCv.cvId]: '' }))
      setManual(EMPTY_MANUAL)
      setEditingCvId(null)
      setInfo('Đã tạo CV mới. Đang bắt đầu phân tích…')
    } catch (requestError) { setError(getFriendlyError(requestError)) }
    finally { setManualSaving(false) }
    if (createdCv) await runAnalysis(createdCv.cvId)
  }

  function deleteCv(cv) { setDeleteTarget(cv) }

  async function confirmDeleteCv() {
    const cv = deleteTarget
    if (!cv) return
    setError('')
    try {
      await cvService.deleteCv(token, cv.cvId)
      setCvs((current) => current.filter((item) => item.cvId !== cv.cvId))
      setInfo('Đã xóa CV.')
    } catch (requestError) { setError(getFriendlyError(requestError)) }
    finally { setDeleteTarget(null) }
  }

  return (
    <>
      <section className="page-heading">
        <div><p className="eyebrow">HỒ SƠ CỦA BẠN</p><h1>CV của tôi</h1><p className="muted">Tải lên CV để nhận gợi ý nghề nghiệp và kỹ năng.</p></div>
        <Link className="button button-secondary" to="/history">Xem lịch sử phân tích</Link>
      </section>
      <section className={`panel upload-panel${draggingFile ? ' is-dragging' : ''}`} onDragEnter={(event) => { event.preventDefault(); setDraggingFile(true) }} onDragOver={(event) => event.preventDefault()} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setDraggingFile(false) }} onDrop={handleFileDrop}>
        <span className="drop-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M12 16V4m0 0L7 9m5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
        <div><h2>Tải CV mới</h2><p className="muted">{draggingFile ? 'Thả file PDF hoặc DOCX tại đây' : 'Hỗ trợ PDF hoặc DOCX, tối đa 5 MB.'}</p>{file && <p className="selected-file">Đã chọn: {file.name}</p>}</div>
        <form className="upload-form" onSubmit={uploadAndAnalyze}>
          <input aria-label="Chọn file CV" type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          <button className="button button-primary" disabled={uploading || Boolean(workingCvId)}>{uploading ? 'Đang tải lên…' : 'Tải lên và phân tích'}</button>
        </form>
      </section>
      <section className="panel manual-panel">
        <div className="manual-heading">
          <div><h2>Nhập CV thủ công</h2><p className="muted">Tổng nội dung tối đa 30.000 ký tự. Khi sửa CV cũ, hệ thống tạo bản mới để giữ lịch sử.</p></div>
          <span className="character-count">{MANUAL_FIELDS.reduce((total, [field]) => total + manual[field].length, 0).toLocaleString('vi-VN')} / 30.000</span>
        </div>
        {editingCvId && <div className="notice info">Đang tạo bản mới từ CV đã chọn; CV cũ không bị thay đổi.</div>}
        <form className="manual-form" onSubmit={createManualAndAnalyze}>
          <label className="manual-field"><span>Tiêu đề <small>{manual.title.length}/150</small></span><input maxLength={150} value={manual.title} onChange={(event) => updateManual('title', event.target.value)} required /></label>
          {MANUAL_FIELDS.map(([field, label, max]) => (
            <label className="manual-field" key={field}>
              <span>{label}{field === 'objective' && ' (tùy chọn)'} <small>{manual[field].length.toLocaleString('vi-VN')} / {max.toLocaleString('vi-VN')}</small></span>
              <textarea rows={field === 'objective' ? 3 : 5} maxLength={max} value={manual[field]} onChange={(event) => updateManual(field, event.target.value)} />
            </label>
          ))}
          <div className="manual-actions"><button className="button button-primary" disabled={manualSaving || Boolean(workingCvId)}>{manualSaving ? 'Đang lưu…' : 'Tạo CV và phân tích'}</button>{editingCvId && <button type="button" className="button button-quiet" onClick={() => { setEditingCvId(null); setManual(EMPTY_MANUAL) }}>Hủy chỉnh sửa</button>}</div>
        </form>
      </section>
      {error && <div className="notice error" role="alert">{error}</div>}
      {info && <div className="notice success" role="status"><svg className="success-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>{info}</div>}
      {analysisMessage && (workingCvId
        ? <div className="analysis-wait panel" role="status" aria-live="polite"><svg className="wait-compass" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="1.7" /><path d="m21 10-3 7-7 5 3-8 7-4Z" fill="currentColor" /></svg><div className="analysis-wait-copy"><p>{analysisMessage}</p><p className="analysis-tip" key={tipIndex} aria-live="off">Mẹo CV: {reducedMotion ? CV_WRITING_TIPS[0] : CV_WRITING_TIPS[tipIndex]}</p><button className="text-button cancel-analysis" onClick={cancelAnalysis}>Hủy phân tích</button></div></div>
        : <div className="notice info" role="status">{analysisMessage}</div>)}
      <section className="section-block">
        <div className="section-title"><div><p className="eyebrow">DANH SÁCH</p><h2>CV của bạn</h2></div><button className="button button-quiet" onClick={refresh} disabled={loading}>Làm mới</button></div>
        {loading ? <div className="skeleton-stack panel" aria-label="Đang tải danh sách CV" aria-busy="true"><div className="visually-hidden" role="status">Đang tải danh sách CV</div><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /></div> : cvs.length === 0 ? <div className="panel empty-state"><div className="empty-icon" aria-hidden="true">＋</div><h3>Chưa có CV nào</h3><p>Bạn có thể tải PDF/DOCX ở phía trên hoặc nhập thông tin CV vào biểu mẫu bên trên.</p></div> : (
          <div className="cv-list">{cvs.map((cv) => {
            const status = statuses[cv.cvId]
            const active = workingCvId === cv.cvId
            return <article className="panel cv-card" key={cv.cvId}>
              <div className="file-icon">{cv.sourceType === 2 ? 'CV' : cv.fileExtension?.toUpperCase() || 'CV'}</div>
              <div className="cv-meta"><h3>{cv.title}</h3><p>{cv.sourceType === 2 ? 'Nhập tay' : cv.originalFileName || 'Tên file không có sẵn'} <span>•</span> {new Date(cv.createdAt).toLocaleDateString('vi-VN')}</p>{status && <span className={`status status-${status.toLowerCase()}`}>{status === 'Completed' ? 'Đã phân tích' : status === 'Pending' ? 'Đang phân tích' : status === 'Failed' ? 'Lần trước lỗi' : status}</span>}</div>
              <div className="cv-actions"><button className="button button-primary" onClick={() => runAnalysis(cv.cvId)} disabled={Boolean(workingCvId) || status === 'Pending'}>{active ? 'Đang phân tích…' : status === 'Failed' ? 'Phân tích lại' : 'Phân tích'}</button>{cv.sourceType === 2 && <button className="button button-quiet" onClick={() => loadManualForNewVersion(cv)} disabled={Boolean(workingCvId)}>Sửa và phân tích lại</button>}<button className="button button-danger-quiet" onClick={() => deleteCv(cv)} disabled={Boolean(workingCvId)}>Xóa</button></div>
            </article>
          })}</div>
        )}
      </section>
      {deleteTarget && <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null) }}>
        <section className="delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
          <span className="delete-dialog-mark" aria-hidden="true">?</span><h2 id="delete-dialog-title">Xóa CV này?</h2>
          <p id="delete-dialog-description">Bạn có chắc muốn xóa CV “{deleteTarget.title}” và lịch sử phân tích liên quan?</p>
          <div className="dialog-actions"><button ref={cancelDeleteRef} type="button" className="button button-quiet" onClick={() => setDeleteTarget(null)}>Giữ lại</button><button ref={confirmDeleteRef} type="button" className="button button-danger-quiet" onClick={confirmDeleteCv}>Xóa CV</button></div>
        </section>
      </div>}
    </>
  )
}
