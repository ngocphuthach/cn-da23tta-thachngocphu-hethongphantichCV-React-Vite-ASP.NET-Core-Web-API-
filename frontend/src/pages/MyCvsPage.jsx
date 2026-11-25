import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { cvService } from '../services/cvService'
import { getFriendlyError } from '../services/apiClient'
import { readMotionInterval, useReducedMotion } from '../hooks/useReducedMotion'
import { AiScanningPanel } from '../components/AiScanningPanel'
import {
  SparklesIcon,
  UploadCloudIcon,
  FileTextIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  Trash2Icon,
  RefreshCwIcon,
  ClockIcon,
  XIcon,
  BriefcaseIcon,
} from '../components/Icons'

const MAX_FILE_BYTES = 5 * 1024 * 1024
const MAX_MANUAL_TEXT = 30_000
const CV_WRITING_TIPS = [
  'Mô tả kinh nghiệm bằng hành động cụ thể và nêu rõ phần việc bạn đảm nhận.',
  'Ghi kỹ năng gắn liền với dự án hoặc bài toán thực tế đã giải quyết.',
  'Ưu tiên làm nổi bật các công nghệ phù hợp với vị trí IT bạn đang hướng tới.',
  'Kiểm tra định dạng, chính tả và các mốc thời gian rõ ràng trước khi gửi.',
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [cvs, setCvs] = useState([])
  const [statuses, setStatuses] = useState({})
  const [latestAnalysisIds, setLatestAnalysisIds] = useState({})
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [workingCvId, setWorkingCvId] = useState(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [file, setFile] = useState(null)
  const [analysisMessage, setAnalysisMessage] = useState('')
  const [manual, setManual] = useState(EMPTY_MANUAL)
  const [manualSaving, setManualSaving] = useState(false)
  const [employerJobs, setEmployerJobs] = useState([])
  const [selectedPostingId, setSelectedPostingId] = useState('')
  const [manualJobMode, setManualJobMode] = useState(false)
  const [editingCvId, setEditingCvId] = useState(null)
  const [draggingFile, setDraggingFile] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [tipIndex, setTipIndex] = useState(0)
  const [activeAnalysisId, setActiveAnalysisId] = useState(null)
  const [baseTab, setBaseTab] = useState('upload') // 'upload' | 'manual'
  const activeTab = searchParams.get('tab') === 'recruiter' ? 'recruiter' : baseTab

  // Recruiter matching state
  const [matchCvId, setMatchCvId] = useState('')
  const [matchCompany, setMatchCompany] = useState('')
  const [matchPosition, setMatchPosition] = useState('')
  const [matchRequirements, setMatchRequirements] = useState('')
  const [matchingJob, setMatchingJob] = useState(false)
  const [matchResult, setMatchResult] = useState(null)
  const [matchError, setMatchError] = useState('')
  const [jobMatches, setJobMatches] = useState([])

  const activeJobRef = useRef(null)
  const cancelDeleteRef = useRef(null)
  const confirmDeleteRef = useRef(null)
  const reducedMotion = useReducedMotion()

  function selectTab(tab) {
    if (tab === 'recruiter') {
      setSearchParams({ tab: 'recruiter' }, { replace: true })
      return
    }
    setBaseTab(tab)
    setSearchParams({}, { replace: true })
  }

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [jobs, matches, items] = await Promise.all([
        cvService.listEmployerJobs(token).catch(() => []),
        cvService.listJobMatches(token).catch(() => []),
        cvService.listCvs(token),
      ])
      setEmployerJobs(jobs)
      setJobMatches(matches)
      setSelectedPostingId((current) => current || String(jobs[0]?.employerJobPostingId || ''))
      setCvs(items)
      if (items.length > 0 && !matchCvId) {
        setMatchCvId(items[0].cvId)
      }
      const pairs = await Promise.all(items.map(async (cv) => {
        try {
          const analyses = await cvService.listCvAnalyses(token, cv.cvId)
          return [cv.cvId, analyses[0]?.status || '', analyses[0]?.analysisId || null]
        } catch { return [cv.cvId, '', null] }
      }))
      setStatuses(Object.fromEntries(pairs.map(([cvId, status]) => [cvId, status])))
      setLatestAnalysisIds(Object.fromEntries(pairs.map(([cvId, , analysisId]) => [cvId, analysisId])))
      const pending = pairs.find(([, status]) => status === 'Pending' || status === 'Processing')
      if (pending && !activeJobRef.current) {
        const [cvId, , analysisId] = pending
        activeJobRef.current = { cvId, analysisId }
        setWorkingCvId(cvId)
        setActiveAnalysisId(analysisId)
        setAnalysisMessage('Yêu cầu đã được tiếp nhận. Quá trình phân tích đang chạy; kết quả sẽ xuất hiện tại đây khi hoàn tất.')
      }
    } catch (requestError) { setError(getFriendlyError(requestError)) }
    finally { setLoading(false) }
  }, [token, matchCvId])

  useEffect(() => {
    if (!activeAnalysisId || !workingCvId) return undefined
    let active = true
    let timerId
    let controller

    async function poll() {
      controller = new AbortController()
      try {
        const analysis = await cvService.getAnalysis(token, activeAnalysisId, controller.signal)
        if (!active) return
        const status = analysis.status
        setStatuses((current) => ({ ...current, [workingCvId]: status }))
        setLatestAnalysisIds((current) => ({ ...current, [workingCvId]: activeAnalysisId }))
        if (status === 'Completed') {
          activeJobRef.current = null
          setActiveAnalysisId(null)
          setWorkingCvId(null)
          setAnalysisMessage('Phân tích đã hoàn tất. Đang mở kết quả…')
          navigate(`/analyses/${activeAnalysisId}`)
          return
        }
        if (status === 'Failed') {
          activeJobRef.current = null
          setActiveAnalysisId(null)
          setWorkingCvId(null)
          setAnalysisMessage('CV vẫn nằm trong danh sách. Bạn có thể thử phân tích lại khi phù hợp.')
          setError(analysis.failureReason || 'Không thể hoàn tất phân tích CV. Vui lòng thử lại sau.')
          return
        }
        setAnalysisMessage('Yêu cầu đã được tiếp nhận. Quá trình phân tích đang chạy; kết quả sẽ xuất hiện tại đây khi hoàn tất.')
        timerId = window.setTimeout(poll, 3500)
      } catch (requestError) {
        if (!active || requestError?.name === 'AbortError') return
        if ([401, 404].includes(requestError?.status)) {
          activeJobRef.current = null
          setActiveAnalysisId(null)
          setWorkingCvId(null)
          setAnalysisMessage('CV vẫn nằm trong danh sách. Bạn có thể xem lịch sử hoặc thử phân tích lại khi phù hợp.')
          setError(getFriendlyError(requestError))
          return
        }
        timerId = window.setTimeout(poll, 3500)
      }
    }

    poll()
    return () => {
      active = false
      window.clearTimeout(timerId)
      controller?.abort()
    }
  }, [activeAnalysisId, navigate, token, workingCvId])

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
    setWorkingCvId(cvId)
    setStatuses((current) => ({ ...current, [cvId]: 'Pending' }))
    setError('')
    setTipIndex(0)
    setAnalysisMessage('Đang kết nối AI phân tích…')
    try {
      const result = await cvService.analyze(token, cvId)
      activeJobRef.current = { cvId, analysisId: result.analysisId }
      setActiveAnalysisId(result.analysisId)
      setLatestAnalysisIds((current) => ({ ...current, [cvId]: result.analysisId }))
      setStatuses((current) => ({ ...current, [cvId]: result.status || 'Pending' }))
      setAnalysisMessage(result.message || 'Yêu cầu đã được tiếp nhận. Quá trình phân tích đang chạy; kết quả sẽ xuất hiện tại đây khi hoàn tất.')
    } catch (requestError) {
      activeJobRef.current = null
      setWorkingCvId(null)
      setStatuses((current) => ({ ...current, [cvId]: '' }))
      setAnalysisMessage('CV vẫn nằm trong danh sách. Bạn có thể xem lịch sử hoặc thử phân tích lại khi phù hợp.')
      await refresh()
      setError(getFriendlyError(requestError))
    }
  }

  async function runRecruiterMatch(e) {
    e.preventDefault()
    setMatchError('')
    setMatchResult(null)

    const targetCvId = matchCvId || cvs[0]?.cvId
    if (!targetCvId) {
      setMatchError('Vui lòng chọn hoặc tải lên một CV để đối chiếu.')
      return
    }
    if (!manualJobMode && !selectedPostingId) {
      setMatchError('Hiện chưa có tin tuyển dụng đang mở để đối chiếu. Bạn có thể dán yêu cầu tuyển dụng thủ công.')
      return
    }
    if (manualJobMode && !matchRequirements.trim()) {
      setMatchError('Vui lòng nhập các tiêu chí/yêu cầu tuyển dụng của Nhà tuyển dụng.')
      return
    }

    setMatchingJob(true)
    try {
      const res = manualJobMode
        ? await cvService.matchJob(token, targetCvId, {
          companyName: matchCompany,
          positionTitle: matchPosition,
          requirements: matchRequirements,
        })
        : await cvService.matchPosting(token, targetCvId, selectedPostingId)
      setMatchResult(res)
      cvService.listJobMatches(token).then(setJobMatches).catch(() => {})
    } catch (err) {
      setMatchError(getFriendlyError(err) || 'Không thể đối chiếu với nhà tuyển dụng lúc này. Vui lòng thử lại.')
    } finally {
      setMatchingJob(false)
    }
  }

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
      setMatchCvId(uploadedCv.cvId)
      setFile(null)
      formElement.reset()
      setInfo('Tải CV thành công! Đang bắt đầu gửi đến AI phân tích…')
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
      selectTab('manual')
      setInfo('Đã tải nội dung CV vào biểu mẫu. Khi lưu, hệ thống sẽ tạo một bản mới để bảo lưu lịch sử cũ.')
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
      setMatchCvId(createdCv.cvId)
      setManual(EMPTY_MANUAL)
      setEditingCvId(null)
      setInfo('Tạo CV mới thành công! Đang kích hoạt phân tích AI…')
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
      setInfo('Đã xóa CV thành công.')
    } catch (requestError) { setError(getFriendlyError(requestError)) }
    finally { setDeleteTarget(null) }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return ''
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="badge-ai" style={{ marginBottom: 8 }}>
            <SparklesIcon size={14} /> AI Powered Career Match
          </div>
          <h1>Quản lý CV & Đối chiếu tuyển dụng</h1>
          <p className="muted">Tải CV để nhận đánh giá năng lực CNTT hoặc đối chiếu trực tiếp với yêu cầu của Nhà tuyển dụng.</p>
        </div>
        <Link className="button button-secondary" to="/history">
          <ClockIcon size={16} /> Lịch sử phân tích
        </Link>
      </section>

      {/* Notifications */}
      {error && <div className="notice error" role="alert"><AlertCircleIcon size={18} /> {error}</div>}
      {info && <div className="notice success" role="status"><CheckCircleIcon size={18} /> {info}</div>}

      {/* Live AI Analysis Banner */}
      {workingCvId && (
        <AiScanningPanel
          mode="cv"
          message={analysisMessage}
          tip={reducedMotion ? CV_WRITING_TIPS[0] : CV_WRITING_TIPS[tipIndex]}
        />
      )}

      {/* Mode Switcher Tabs */}
      <div className="tab-pills" role="tablist" aria-label="Phương thức nạp CV & Đối chiếu">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'upload'}
          className={`tab-pill ${activeTab === 'upload' ? 'tab-pill-active' : ''}`}
          onClick={() => selectTab('upload')}
        >
          <UploadCloudIcon size={16} /> Tải file CV (PDF / DOCX)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'manual'}
          className={`tab-pill ${activeTab === 'manual' ? 'tab-pill-active' : ''}`}
          onClick={() => selectTab('manual')}
        >
          <FileTextIcon size={16} /> Nhập CV thủ công {editingCvId && '(Đang sửa)'}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'recruiter'}
          className={`tab-pill ${activeTab === 'recruiter' ? 'tab-pill-active' : ''}`}
          style={{ color: activeTab === 'recruiter' ? 'var(--primary)' : '#4338CA', fontWeight: 800 }}
          onClick={() => selectTab('recruiter')}
        >
          <BriefcaseIcon size={16} /> So khớp theo yêu cầu tuyển dụng
        </button>
      </div>

      {/* TAB 1: Upload Zone */}
      {activeTab === 'upload' && (
        <section
          className={`saas-card upload-panel laser-container ${draggingFile ? 'is-dragging' : ''}`}
          style={{ marginBottom: 28 }}
          onDragEnter={(e) => { e.preventDefault(); setDraggingFile(true) }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDraggingFile(false) }}
          onDrop={handleFileDrop}
        >
          {(uploading || workingCvId) && <div className="laser-scanner-beam" />}
          
          <div className="drop-icon">
            <UploadCloudIcon size={30} />
          </div>
          
          <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>Kéo thả CV của bạn vào đây</h2>
          <p className="muted" style={{ maxWidth: 520, margin: '0 auto 18px', fontSize: '0.88rem' }}>
            Hỗ trợ định dạng <strong>.PDF</strong> hoặc <strong>.DOCX</strong> (tối đa 5 MB). Hệ thống tự động che email và số điện thoại trước khi phân tích để bảo vệ quyền riêng tư.
          </p>

          {file && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 16px', background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: 12, marginBottom: 18 }}>
              <FileTextIcon size={18} color="var(--primary)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{file.name}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>({formatFileSize(file.size)})</span>
              <button type="button" onClick={() => setFile(null)} style={{ background: 'none', border: 0, padding: 2, cursor: 'pointer', color: 'var(--muted)' }} title="Bỏ chọn file">
                <XIcon size={16} />
              </button>
            </div>
          )}

          <form onSubmit={uploadAndAnalyze} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label className="button button-quiet" style={{ cursor: 'pointer' }}>
              <span>{file ? 'Đổi file khác' : 'Chọn file từ máy'}</span>
              <input
                aria-label="Chọn file CV"
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
            </label>
            <button className="button button-primary" disabled={uploading || Boolean(workingCvId) || !file}>
              <SparklesIcon size={16} />
              {uploading ? 'Đang tải lên…' : 'Phân tích CV ngay'}
            </button>
          </form>
        </section>
      )}

      {/* TAB 2: Manual Entry Form */}
      {activeTab === 'manual' && (
        <section className="saas-card manual-panel" style={{ padding: '28px', marginBottom: 28 }}>
          <div className="manual-heading" style={{ marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', marginBottom: 4 }}>Nhập nội dung CV</h2>
              <p className="muted">Khi chỉnh sửa CV cũ, hệ thống tự động sinh bản mới để giữ nguyên lịch sử phân tích.</p>
            </div>
            <span className="character-count" style={{ padding: '6px 12px', background: '#F1F5F9', borderRadius: 999, fontSize: '0.78rem', fontWeight: 700 }}>
              {MANUAL_FIELDS.reduce((total, [field]) => total + manual[field].length, 0).toLocaleString('vi-VN')} / 30.000 ký tự
            </span>
          </div>

          {editingCvId && (
            <div className="notice info" style={{ marginBottom: 16 }}>
              Đang chỉnh sửa dựa trên CV cũ. Một bản ghi mới sẽ được tạo khi lưu.
            </div>
          )}

          <form className="manual-form" onSubmit={createManualAndAnalyze}>
            <label className="manual-field" style={{ gridColumn: '1 / -1' }}>
              <span>Tiêu đề CV <small>{manual.title.length}/150</small></span>
              <input
                placeholder="Ví dụ: CV Lập trình viên Fullstack 2026"
                maxLength={150}
                value={manual.title}
                onChange={(event) => updateManual('title', event.target.value)}
                required
              />
            </label>

            {MANUAL_FIELDS.map(([field, label, max]) => (
              <label className="manual-field" key={field}>
                <span>
                  {label}{field === 'objective' && ' (tùy chọn)'}{' '}
                  <small>{manual[field].length.toLocaleString('vi-VN')} / {max.toLocaleString('vi-VN')}</small>
                </span>
                <textarea
                  rows={field === 'objective' ? 3 : 5}
                  maxLength={max}
                  value={manual[field]}
                  placeholder={`Nhập thông tin về ${label.toLowerCase()}...`}
                  onChange={(event) => updateManual(field, event.target.value)}
                />
              </label>
            ))}

            <div className="manual-actions" style={{ gridColumn: '1 / -1', marginTop: 12 }}>
              <button className="button button-primary" disabled={manualSaving || Boolean(workingCvId)}>
                <SparklesIcon size={16} />
                {manualSaving ? 'Đang lưu…' : 'Lưu & Phân tích bằng AI'}
              </button>
              {editingCvId && (
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={() => { setEditingCvId(null); setManual(EMPTY_MANUAL); selectTab('upload') }}
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {/* TAB 3: Recruiter Match (Yêu cầu Nhà tuyển dụng) */}
      {activeTab === 'recruiter' && (
        <section className="saas-card" style={{ padding: '28px', marginBottom: 28, background: 'rgba(255, 255, 255, 0.95)' }}>
          <div style={{ marginBottom: 20 }}>
            <span className="badge-ai" style={{ marginBottom: 6 }}>
              <BriefcaseIcon size={13} /> TIÊU CHÍ THỰC TẾ TỪ DOANH NGHIỆP
            </span>
            <h2 style={{ fontSize: '1.4rem', margin: '6px 0 6px' }}>So khớp CV theo Yêu cầu của Nhà tuyển dụng</h2>
            <p className="muted" style={{ margin: 0, fontSize: '0.88rem' }}>
              Chọn một tin tuyển dụng có nguồn để đối chiếu hồ sơ. Bạn cũng có thể dán tiêu chí từ tin khác.
            </p>
          </div>

          {matchError && <div className="notice error" role="alert"><AlertCircleIcon size={18} /> {matchError}</div>}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            <button type="button" className={`button ${!manualJobMode ? 'button-primary' : 'button-quiet'}`} onClick={() => setManualJobMode(false)}>
              Tin tuyển dụng có nguồn
            </button>
            <button type="button" className={`button ${manualJobMode ? 'button-primary' : 'button-quiet'}`} onClick={() => setManualJobMode(true)}>
              Dán yêu cầu khác
            </button>
          </div>

          <form onSubmit={runRecruiterMatch} style={{ display: 'grid', gap: 16 }}>
            {/* Choose CV */}
            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                Chọn CV của bạn để đối chiếu:
              </label>
              {cvs.length === 0 ? (
                <p className="notice warning" style={{ margin: 0 }}>
                  Bạn chưa có CV nào trong hồ sơ. Vui lòng chuyển sang tab <strong>Tải file CV</strong> hoặc <strong>Nhập CV thủ công</strong> để thêm CV trước.
                </p>
              ) : (
                <select
                  value={matchCvId}
                  onChange={(e) => setMatchCvId(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff', fontSize: '0.9rem' }}
                >
                  {cvs.map((cv) => (
                    <option key={cv.cvId} value={cv.cvId}>
                      {cv.title} ({cv.sourceType === 2 ? 'Nhập tay' : cv.fileExtension?.toUpperCase() || 'File'} - {new Date(cv.createdAt).toLocaleDateString('vi-VN')})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {!manualJobMode ? (
              <div>
                <label htmlFor="employer-posting" style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                  Tin tuyển dụng đang nhận hồ sơ:
                </label>
                {employerJobs.length === 0 ? (
                  <div className="notice warning" role="status">Chưa có tin đang mở. Hãy thử lại sau hoặc dán tiêu chí tuyển dụng khác.</div>
                ) : (
                  <>
                    <select id="employer-posting" value={selectedPostingId} onChange={(event) => setSelectedPostingId(event.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff', fontSize: '0.9rem' }}>
                      {employerJobs.map((job) => <option key={job.employerJobPostingId} value={job.employerJobPostingId}>{job.employerName} · {job.title} · {job.location}</option>)}
                    </select>
                    {employerJobs.find((job) => String(job.employerJobPostingId) === String(selectedPostingId)) && (() => {
                      const selected = employerJobs.find((job) => String(job.employerJobPostingId) === String(selectedPostingId))
                      return <p className="muted" style={{ margin: '8px 0 0', fontSize: '0.82rem' }}>
                        Hạn nộp: {new Date(selected.deadlineAt).toLocaleDateString('vi-VN')} · <a href={selected.sourceUrl} target="_blank" rel="noreferrer">Mở tin nguồn</a>
                      </p>
                    })()}
                  </>
                )}
              </div>
            ) : <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                  Tên Nhà tuyển dụng / Công ty:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: FPT Software, VNG, Viettel..."
                  value={matchCompany}
                  onChange={(e) => setMatchCompany(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff', fontSize: '0.9rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                  Vị trí ứng tuyển:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Frontend ReactJS Developer..."
                  value={matchPosition}
                  onChange={(e) => setMatchPosition(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff', fontSize: '0.9rem' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, marginBottom: 6, color: 'var(--ink)' }}>
                Yêu cầu tuyển dụng của doanh nghiệp (Tiêu chí thực tế):
              </label>
              <textarea
                rows={5}
                placeholder="Dán toàn bộ các gạch đầu dòng về yêu cầu kỹ năng, kinh nghiệm từ tin tuyển dụng của công ty..."
                value={matchRequirements}
                onChange={(e) => setMatchRequirements(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff', fontSize: '0.88rem', lineHeight: 1.6 }}
                required
              />
            </div>
            </>}

            <div>
              <button
                type="submit"
                className="button button-primary"
                disabled={matchingJob || cvs.length === 0 || (!manualJobMode && employerJobs.length === 0)}
                style={{ minHeight: 46, padding: '0 24px', fontSize: '0.9rem' }}
              >
                <SparklesIcon size={18} />
                {matchingJob ? 'Đang phân tích độ khớp với tiêu chí công ty…' : 'Bắt đầu đánh giá mức độ phù hợp'}
              </button>
            </div>
          </form>

          {matchingJob && (
            <div style={{ marginTop: 24 }}>
              <AiScanningPanel mode="recruiter" />
            </div>
          )}

          {/* Recruiter Matching Result Display */}
          {matchResult && (
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '2px dashed var(--line)' }}>
              {/* Score Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 20,
                  flexWrap: 'wrap',
                  padding: '24px',
                  background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.9), #fff)',
                  borderRadius: 16,
                  border: '1px solid #C7D2FE',
                  marginBottom: 20,
                }}
              >
                <div>
                  <span className="badge-ai" style={{ marginBottom: 6 }}>
                    KẾT QUẢ ĐỐI CHIẾU DOANH NGHIỆP
                  </span>
                  <h3 style={{ fontSize: '1.4rem', margin: '4px 0 6px', color: 'var(--ink)' }}>
                    <BriefcaseIcon size={16} /> {matchResult.companyName} — {matchResult.positionTitle}
                  </h3>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 999, background: matchResult.matchScore >= 75 ? '#ECFDF5' : '#FFFBEB', color: matchResult.matchScore >= 75 ? '#059669' : '#D97706', fontWeight: 800, fontSize: '0.84rem', border: `1px solid ${matchResult.matchScore >= 75 ? '#A7F3D0' : '#FDE68A'}` }}>
                    {matchResult.matchScore >= 75 ? <CheckCircleIcon size={15} /> : <AlertCircleIcon size={15} />}
                    {matchResult.verdict}
                  </div>
                </div>

                <div style={{ textAlign: 'center', padding: '12px 24px', background: '#fff', borderRadius: 14, border: '1px solid #CBD5E1', boxShadow: 'var(--shadow-small)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Độ phù hợp</span>
                  <strong style={{ fontSize: '2.5rem', color: matchResult.matchScore >= 75 ? '#059669' : 'var(--primary)', lineHeight: 1.1 }}>
                    {matchResult.matchScore}%
                  </strong>
                </div>
              </div>

              {/* Summary */}
              {matchResult.summary && (
                <div style={{ padding: '16px 20px', background: '#F8FAFC', borderRadius: 12, border: '1px solid var(--line-soft)', marginBottom: 20 }}>
                  <strong style={{ display: 'block', fontSize: '0.86rem', color: 'var(--ink)', marginBottom: 4 }}>
                    <FileTextIcon size={16} /> Nhận xét tổng quan từ AI:
                  </strong>
                  <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: 1.65 }}>
                    {matchResult.summary}
                  </p>
                </div>
              )}

              {/* Two Column Breakdown */}
              <div className="bento-grid" style={{ marginBottom: 20 }}>
                {/* Met Requirements */}
                <div className="saas-card bento-col-6" style={{ padding: '20px', background: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: '#166534', fontWeight: 800, fontSize: '0.95rem' }}>
                    <CheckCircleIcon size={18} />
                    Tiêu chí Nhà tuyển dụng yêu cầu mà bạn ĐÃ ĐẠT ({matchResult.matchedRequirements?.length || 0})
                  </div>
                  {matchResult.matchedRequirements && matchResult.matchedRequirements.length > 0 ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {matchResult.matchedRequirements.map((item, idx) => (
                        <div key={idx} style={{ padding: '12px', background: '#fff', borderRadius: 10, border: '1px solid #DCFCE7' }}>
                          <strong style={{ display: 'block', fontSize: '0.88rem', color: '#14532D', marginBottom: 4 }}>
                            {item.requirement}
                          </strong>
                          {item.evidence && (
                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#475569', fontStyle: 'italic', paddingLeft: 8, borderLeft: '3px solid #22C55E' }}>
                              “{item.evidence}”
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#166534' }}>Chưa tìm thấy tiêu chí nào hoàn toàn trùng khớp.</p>
                  )}
                </div>

                {/* Missing Requirements */}
                <div className="saas-card bento-col-6" style={{ padding: '20px', background: '#FFFDF5', border: '1px solid #FDE68A' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: '#92400E', fontWeight: 800, fontSize: '0.95rem' }}>
                    <AlertCircleIcon size={18} />
                    Tiêu chí Nhà tuyển dụng yêu cầu mà bạn CÒN THIẾU ({matchResult.missingRequirements?.length || 0})
                  </div>
                  {matchResult.missingRequirements && matchResult.missingRequirements.length > 0 ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      {matchResult.missingRequirements.map((item, idx) => (
                        <div key={idx} style={{ padding: '12px', background: '#fff', borderRadius: 10, border: '1px solid #FEF3C7' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                            <strong style={{ fontSize: '0.88rem', color: '#78350F' }}>
                              {item.requirement}
                            </strong>
                            <span style={{ padding: '2px 8px', borderRadius: 999, background: '#FEF3C7', color: '#B45309', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>
                              Mức {item.importance || 3}/5
                            </span>
                          </div>
                          {item.reason && (
                            <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#92400E' }}>
                              <SparklesIcon size={14} /> {item.reason}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#92400E' }}>Không có tiêu chí cốt lõi nào bị thiếu.</p>
                  )}
                </div>
              </div>

              {/* Recruiter Advice */}
              {matchResult.recruiterAdvice && matchResult.recruiterAdvice.length > 0 && (
                <div className="saas-card" style={{ padding: '20px', background: '#F8FAFC', border: '1px solid var(--line)' }}>
                  <strong style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.95rem', color: 'var(--primary)', marginBottom: 10 }}>
                    <SparklesIcon size={16} /> Lời khuyên tối ưu CV dành riêng cho Nhà tuyển dụng này:
                  </strong>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {matchResult.recruiterAdvice.map((advice, idx) => (
                      <li key={idx} style={{ fontSize: '0.86rem', color: '#334155', lineHeight: 1.6, marginBottom: 4 }}>
                        {advice}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Saved Recruiter Match History */}
          {jobMatches.length > 0 && (
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--line-soft)' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClockIcon size={17} color="var(--primary)" /> Lịch sử đối chiếu Nhà tuyển dụng ({jobMatches.length})
              </h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {jobMatches.map((item) => {
                  const score = Number(item.matchScore ?? 0)
                  const good = score >= 75
                  return (
                    <div
                      key={item.matchId}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                        padding: '12px 16px',
                        borderRadius: 12,
                        background: '#F8FAFC',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <div style={{ minWidth: 200, flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--ink)' }}>
                          {item.companyName} — {item.positionTitle}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 2 }}>
                          CV: <strong>{item.cvTitle}</strong> · {new Date(item.createdAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: 999,
                            fontSize: '0.78rem',
                            fontWeight: 800,
                            background: good ? '#ECFDF5' : '#FFFBEB',
                            color: good ? '#059669' : '#D97706',
                            border: `1px solid ${good ? '#A7F3D0' : '#FDE68A'}`,
                          }}
                        >
                          {item.matchScore != null ? `${Math.round(score)}/100` : '—'} · {item.verdict}
                        </span>
                        <button
                          type="button"
                          className="button button-quiet"
                          style={{ minHeight: 34, padding: '0 12px', fontSize: '0.8rem' }}
                          onClick={() => {
                            try {
                              setMatchResult(JSON.parse(item.resultJson))
                            } catch {
                              setMatchError('Không thể đọc lại dữ liệu kết quả này.')
                            }
                          }}
                        >
                          Xem lại
                        </button>
                        <button
                          type="button"
                          className="button button-quiet"
                          style={{ minHeight: 34, padding: '0 10px', color: 'var(--danger)' }}
                          title="Xóa lịch sử đối chiếu này"
                          onClick={async () => {
                            try {
                              await cvService.deleteJobMatch(token, item.matchId)
                              setJobMatches((prev) => prev.filter((m) => m.matchId !== item.matchId))
                            } catch (err) {
                              setMatchError(getFriendlyError(err))
                            }
                          }}
                        >
                          <Trash2Icon size={14} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* CV Grid List */}
      <section className="section-block">
        <div className="section-title">
          <div>
            <p className="eyebrow">DANH SÁCH HỒ SƠ</p>
            <h2>CV đã lưu ({cvs.length}/50)</h2>
          </div>
          <button className="button button-quiet" onClick={refresh} disabled={loading}>
            <RefreshCwIcon size={15} /> Làm mới
          </button>
        </div>

        {loading ? (
          <div className="skeleton-stack panel" aria-label="Đang tải danh sách CV" aria-busy="true">
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
          </div>
        ) : cvs.length === 0 ? (
          <div className="saas-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ display: 'grid', placeItems: 'center', width: 56, height: 56, borderRadius: '50%', background: 'var(--mint)', color: 'var(--primary)', margin: '0 auto 16px' }}>
              <FileTextIcon size={26} />
            </div>
            <h3 style={{ fontSize: '1.15rem' }}>Chưa có CV nào trong hồ sơ</h3>
            <p className="muted" style={{ maxWidth: 460, margin: '0 auto 20px' }}>
              Hãy tải lên file CV PDF/DOCX hoặc nhập thủ công ở trên để bắt đầu trải nghiệm phân tích kỹ năng và tư vấn vị trí IT.
            </p>
            <button className="button button-primary" onClick={() => selectTab('upload')}>
              <UploadCloudIcon size={16} /> Tải file ngay
            </button>
          </div>
        ) : (
          <div className="cv-grid-bento">
            {cvs.map((cv) => {
              const status = statuses[cv.cvId]
              const analysisId = latestAnalysisIds[cv.cvId]
              const active = workingCvId === cv.cvId
              const isScanning = status === 'Pending' || status === 'Processing' || active

              return (
                <article className={`saas-card cv-bento-card ${isScanning ? 'laser-container is-scanning' : ''}`} key={cv.cvId}>
                  {isScanning && <div className="laser-scanner-beam" />}
                  <div>
                    <div className="cv-bento-header">
                      <div className="cv-type-icon">
                        <FileTextIcon size={22} />
                      </div>
                      <div className="cv-bento-meta">
                        <h3 title={cv.title}>{cv.title}</h3>
                        <p>
                          <ClockIcon size={13} />
                          {new Date(cv.createdAt).toLocaleDateString('vi-VN')}
                          <span>•</span>
                          {cv.sourceType === 2 ? 'Nhập thủ công' : (cv.fileExtension?.toUpperCase() || 'FILE')}
                        </p>
                      </div>
                    </div>

                    <div style={{ marginTop: 14 }}>
                      {status === 'Completed' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, fontSize: '0.74rem', fontWeight: 700, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                          <CheckCircleIcon size={13} /> Đã phân tích
                        </span>
                      )}
                      {(status === 'Pending' || status === 'Processing' || active) && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, fontSize: '0.74rem', fontWeight: 700, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                          <RefreshCwIcon size={13} className="spin" /> Đang phân tích...
                        </span>
                      )}
                      {status === 'Failed' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, fontSize: '0.74rem', fontWeight: 700, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA' }}>
                          <AlertCircleIcon size={13} /> Lần trước lỗi
                        </span>
                      )}
                      {!status && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, fontSize: '0.74rem', fontWeight: 700, color: 'var(--muted)', background: '#F1F5F9' }}>
                          Chưa phân tích
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="cv-bento-footer">
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {status === 'Completed' && analysisId ? (
                        <Link to={`/analyses/${analysisId}`} className="button button-primary" style={{ minHeight: 38, fontSize: '0.82rem' }}>
                          Xem kết quả <ArrowRightIcon size={14} />
                        </Link>
                      ) : (
                        <button
                          className="button button-primary"
                          style={{ minHeight: 38, fontSize: '0.82rem' }}
                          onClick={() => runAnalysis(cv.cvId)}
                          disabled={Boolean(workingCvId) || status === 'Pending' || status === 'Processing'}
                        >
                          <SparklesIcon size={14} />
                          {active ? 'Đang phân tích…' : status === 'Failed' ? 'Thử lại' : 'Phân tích'}
                        </button>
                      )}

                      <button
                        className="button button-quiet"
                        style={{ minHeight: 38, fontSize: '0.82rem', borderColor: '#C7D2FE', color: 'var(--primary)' }}
                        onClick={() => {
                          setMatchCvId(cv.cvId)
                          selectTab('recruiter')
                          window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        title="So khớp CV này với tiêu chí cụ thể của Nhà tuyển dụng"
                      >
                        <BriefcaseIcon size={14} /> So khớp Nhà tuyển dụng
                      </button>

                      {status === 'Completed' && (
                        <button
                          className="button button-quiet"
                          style={{ minHeight: 38, padding: '0 10px' }}
                          onClick={() => runAnalysis(cv.cvId)}
                          disabled={Boolean(workingCvId)}
                          title="Phân tích lại"
                        >
                          <RefreshCwIcon size={14} />
                        </button>
                      )}

                      {cv.sourceType === 2 && (
                        <button
                          className="button button-quiet"
                          style={{ minHeight: 38, fontSize: '0.82rem' }}
                          onClick={() => loadManualForNewVersion(cv)}
                          disabled={Boolean(workingCvId)}
                        >
                          Sửa
                        </button>
                      )}
                    </div>

                    <button
                      className="button button-danger-quiet"
                      style={{ minHeight: 38, width: 38, padding: 0 }}
                      onClick={() => deleteCv(cv)}
                      disabled={Boolean(workingCvId)}
                      title="Xóa CV này"
                    >
                      <Trash2Icon size={16} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="dialog-backdrop"
          onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteTarget(null) }}
        >
          <section className="saas-card delete-dialog" style={{ padding: 28, maxWidth: 440, margin: 'auto' }} role="alertdialog" aria-modal="true" aria-labelledby="delete-dialog-title" aria-describedby="delete-dialog-description">
            <div style={{ display: 'grid', placeItems: 'center', width: 50, height: 50, borderRadius: '50%', background: 'var(--danger-soft)', color: 'var(--danger)', margin: '0 auto 16px' }}>
              <Trash2Icon size={24} />
            </div>
            <h2 id="delete-dialog-title" style={{ textAlign: 'center', fontSize: '1.25rem', marginBottom: 8 }}>Xác nhận xóa CV?</h2>
            <p id="delete-dialog-description" className="muted" style={{ textAlign: 'center', fontSize: '0.88rem', margin: '0 0 24px' }}>
              Bạn có chắc chắn muốn xóa hồ sơ “<strong>{deleteTarget.title}</strong>”? Toàn bộ kết quả phân tích liên quan cũng sẽ bị xóa. Thao tác này không thể hoàn tác.
            </p>
            <div className="dialog-actions" style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button ref={cancelDeleteRef} type="button" className="button button-quiet" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>
                Giữ lại
              </button>
              <button ref={confirmDeleteRef} type="button" className="button button-danger-quiet" style={{ flex: 1 }} onClick={confirmDeleteCv}>
                Xóa vĩnh viễn
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
