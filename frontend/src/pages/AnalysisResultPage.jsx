import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { PageSkeleton } from '../components/PageSkeleton'
import { useAuth } from '../context/useAuth'
import { cvService } from '../services/cvService'
import { getFriendlyError } from '../services/apiClient'
import { useReducedMotion } from '../hooks/useReducedMotion'

function text(value) { return typeof value === 'string' || typeof value === 'number' ? String(value) : '' }

function StringList({ items }) {
  if (!Array.isArray(items) || items.length === 0) return <p className="muted">Chưa có nội dung.</p>
  return <ul className="content-list">{items.map((item, index) => <li key={`${text(item)}-${index}`}>{text(item) || (item && typeof item === 'object' ? Object.values(item).map(text).filter(Boolean).join(' · ') : '')}</li>)}</ul>
}

function ScoreGauge({ score }) {
  const numeric = Number(score)
  const valid = score !== null && score !== undefined && Number.isFinite(numeric)
  const bounded = valid ? Math.max(0, Math.min(100, numeric)) : 0
  const circumference = 2 * Math.PI * 50
  const label = valid ? `${numeric} trên 100` : 'Chưa có điểm'
  return (
    <div className="score-gauge">
      <svg viewBox="0 0 120 120" role="img" aria-label={`Mức khớp kỹ năng với nghề phù hợp nhất (do hệ thống tính): ${label}`}>
        <circle className="score-track" cx="60" cy="60" r="50" />
        <circle className={`score-progress${valid ? ' score-progress-animated' : ''}`} cx="60" cy="60" r="50" strokeDasharray={circumference} style={{ '--score-start': circumference, '--score-target': circumference * (1 - bounded / 100) }} transform="rotate(-90 60 60)" />
        <text className="score-gauge-label" x="60" y="59">{valid ? numeric : '—'}</text>
        <text className="score-gauge-unit" x="60" y="77">/ 100</text>
      </svg>
    </div>
  )
}

function RadarSupport({ data }) {
  const reduceMotion = useReducedMotion()
  if (data.length < 3) return null
  return (
    <div className="radar-support">
      <p className="eyebrow">GÓC NHÌN TRỰC QUAN</p>
      <h3>So sánh một số nghề đứng đầu</h3>
      <p className="muted">Biểu đồ hỗ trợ quan sát; bảng xếp hạng bên trên là nguồn thông tin đầy đủ.</p>
      <div className={`radar-wrap${reduceMotion ? '' : ' radar-animate'}`} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="#D9E0EE" />
            <PolarAngleAxis dataKey="jobPositionName" tick={{ fill: '#0B1B3A', fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#4A5878', fontSize: 10 }} />
            <Radar dataKey="backendFitScore" name="Mức khớp do hệ thống tính" stroke="#2B50F5" fill="#CAD5FF" fillOpacity={0.62} isAnimationActive={false} />
            <Tooltip formatter={(value) => [`${value}/100`, 'Mức khớp do hệ thống tính']} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="radar-legend">Trục là tên nghề; điểm càng xa tâm biểu thị mức khớp kỹ năng cao hơn. Bảng xếp hạng có đầy đủ tên và điểm.</p>
    </div>
  )
}

export function AnalysisResultPage() {
  const { analysisId } = useParams()
  const { token } = useAuth()
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [previousScore, setPreviousScore] = useState(null)
  useEffect(() => {
    let active = true
    cvService.getAnalysis(token, analysisId)
      .then((result) => { if (active) setAnalysis(result) })
      .catch((requestError) => { if (active) setError(getFriendlyError(requestError)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [analysisId, token])

  useEffect(() => {
    let active = true
    async function findPreviousCompleted() {
      setPreviousScore(null)
      if (loading || analysis?.status !== 'Completed' || analysis.overallScore == null) return
      try {
        const firstPage = await cvService.listAnalyses(token, 1, 100)
        const pageCount = Math.ceil(firstPage.totalCount / firstPage.pageSize)
        let foundCurrent = false
        for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
          const page = pageNumber === 1 ? firstPage : await cvService.listAnalyses(token, pageNumber, firstPage.pageSize)
          const items = page.items || []
          let startIndex = 0
          if (!foundCurrent) {
            const currentIndex = items.findIndex((item) => item.analysisId === analysisId)
            if (currentIndex < 0) continue
            foundCurrent = true
            startIndex = currentIndex + 1
          }
          const previous = items.slice(startIndex).find((item) => item.status === 'Completed' && item.overallScore != null && Number.isFinite(Number(item.overallScore)))
          if (previous) {
            const current = Number(analysis.overallScore)
            const previousValue = Number(previous.overallScore)
            if (Number.isFinite(current) && active) setPreviousScore({ previous: previousValue, delta: current - previousValue })
            return
          }
        }
      } catch { /* A missing comparison must not prevent the saved result from rendering. */ }
    }
    findPreviousCompleted()
    return () => { active = false }
  }, [analysis?.overallScore, analysis?.status, analysisId, loading, token])

  if (loading) return <PageSkeleton title="Đang tải kết quả phân tích" />
  if (error) return <><div className="notice error" role="alert">{error}</div><Link className="button button-secondary" to="/history">Quay lại lịch sử</Link></>

  const result = analysis?.result || {}
  const jobs = Array.isArray(result.careerRecommendations) ? result.careerRecommendations : []
  const ranking = Array.isArray(result.backendRanking) ? [...result.backendRanking].sort((a, b) => {
    if (a.backendFitScore == null) return b.backendFitScore == null ? 0 : 1
    if (b.backendFitScore == null) return -1
    return Number(b.backendFitScore) - Number(a.backendFitScore)
  }) : []
  const radarJobs = ranking.filter((job) => job.backendFitScore !== null && job.backendFitScore !== undefined && Number.isFinite(Number(job.backendFitScore))).slice(0, 5).map((job) => ({ ...job, backendFitScore: Number(job.backendFitScore) }))
  const skills = Array.isArray(result.detectedSkills) ? result.detectedSkills : []
  const missingSkills = jobs.flatMap((job) => (Array.isArray(job.missingSkills) ? job.missingSkills.map((skill) => ({ ...skill, jobName: job.jobPositionName })) : []))
  const improvements = Array.isArray(result.cvImprovements) ? result.cvImprovements : []

  return <div className="analysis-results">
    <section className="page-heading"><div><p className="eyebrow">KẾT QUẢ PHÂN TÍCH</p><h1>Gợi ý dành cho bạn</h1><p className="muted">Hoàn tất {analysis?.completedAt ? new Date(analysis.completedAt).toLocaleString('vi-VN') : ''}</p></div><Link className="button button-secondary" to="/history">Lịch sử phân tích</Link></section>
    {analysis?.status !== 'Completed' && <div className={`notice ${analysis?.status === 'Failed' ? 'error' : 'info'}`} role="status">{analysis?.status === 'Failed' ? 'Lần phân tích này chưa hoàn tất. Bạn có thể thử lại từ trang CV của tôi.' : 'Phân tích đang chờ xử lý. Hãy tải lại sau.'}</div>}
    {analysis?.status === 'Completed' && <>
      <div className="result-overview">
        <section className="score-banner panel">
          <ScoreGauge score={analysis.overallScore} />
          <div><p className="eyebrow">MỨC KHỚP KỸ NĂNG</p><h2>{ranking[0]?.jobPositionName || 'Chưa xác định nghề phù hợp nhất'}</h2><p className="muted">Mức khớp kỹ năng với nghề phù hợp nhất (do hệ thống tính)</p>{previousScore && <div className={`score-comparison${previousScore.delta > 0 ? ' score-up' : previousScore.delta < 0 ? ' score-down' : ' score-same'}`} role="status"><strong aria-hidden="true">{previousScore.delta > 0 ? '↑' : previousScore.delta < 0 ? '↓' : '→'} {previousScore.delta > 0 ? '+' : ''}{previousScore.delta.toLocaleString('vi-VN')}</strong><span>so với lần Completed trước ({previousScore.previous}/100)</span><small>Đây là mức khớp kỹ năng, không phải chất lượng CV.</small></div>}</div>
        </section>
        <section className="panel content-panel result-ranking-panel">
          <p className="eyebrow">BẢNG XẾP HẠNG BACKEND</p><h2>Xếp hạng nghề</h2>
          <p className="muted">Điểm do Backend tự tính từ các kỹ năng yêu cầu, tách riêng với fitScore do AI đề xuất.</p>
          {ranking.length ? <div className="ranking-table-wrap"><table className="ranking-table"><thead><tr><th scope="col">Vị trí</th><th scope="col">Mức khớp</th><th scope="col">Điểm</th></tr></thead><tbody>{ranking.map((job, index) => { const score = Number(job.backendFitScore); const scale = job.backendFitScore == null || !Number.isFinite(score) ? 0 : Math.max(0, Math.min(100, score)) / 100; return <tr key={job.jobPositionCode}><td><span className="rank-number">{index + 1}.</span> <strong>{text(job.jobPositionName)}</strong><br /><small>{text(job.jobPositionCode)}</small></td><td>{job.backendFitScore == null ? 'N/A' : <div className="ranking-meter" role="img" aria-label={`${text(job.jobPositionName)}: ${job.backendFitScore} trên 100`}><span className={`ranking-fill rank-color-${index % 4}`} style={{ '--ranking-scale': scale }} /></div>}</td><td>{job.backendFitScore == null ? 'N/A' : `${job.backendFitScore}/100`}</td></tr> })}</tbody></table></div> : <p className="muted">Không có dữ liệu xếp hạng.</p>}
          {radarJobs.length >= 3 && <RadarSupport data={radarJobs} />}
        </section>
      </div>
      <section className="panel content-panel"><p className="eyebrow">TÓM TẮT</p><h2>Thông tin chính</h2><p className="body-copy">{text(result.summary) || 'Chưa có tóm tắt.'}</p></section>
      <section className="panel content-panel"><p className="eyebrow">ĐIỂM DO AI ĐỀ XUẤT</p><h2>Nghề nghiệp gợi ý</h2><p className="muted">fitScore là điểm phù hợp do AI đề xuất; chỉ số này được trình bày riêng với mức khớp do Backend tính.</p>{jobs.length ? <div className="recommendation-grid">{jobs.map((job, index) => <article className="recommendation-card" key={`${job.jobPositionCode}-${index}`}><div className="recommendation-top"><span className="status status-completed">Gợi ý {index + 1}</span><strong>{job.fitScore ?? '—'}<small>/100 · AI</small></strong></div><h3>{text(job.jobPositionName)}</h3><p className="muted">{text(job.jobPositionCode)}</p><h4>Điểm mạnh</h4><StringList items={job.strengths} /><h4>Bước tiếp theo</h4><StringList items={job.nextSteps} /></article>)}</div> : <p className="muted">Chưa có gợi ý nghề nghiệp.</p>}</section>
      <section className="panel content-panel"><div className="section-title"><div><p className="eyebrow">KỸ NĂNG TRONG CV</p><h2>Kỹ năng được phát hiện</h2></div><span className="count-pill">{skills.length} kỹ năng</span></div>{skills.length ? <div className="skill-grid">{skills.map((skill, index) => { const levelClass = skill.level === 'Advanced' ? 'advanced' : skill.level === 'Intermediate' ? 'intermediate' : ''; return <article className="skill-card" key={`${skill.skillCode}-${index}`}><div className="skill-heading"><strong>{text(skill.name)}</strong><span className={`skill-level ${levelClass}`}>{text(skill.level)}</span></div><small>{text(skill.skillCode)}</small>{skill.evidenceVerified === false && <span className="notice warning compact">Chưa tìm thấy trong CV</span>}<p className="evidence">{text(skill.evidence) || 'Không có trích dẫn.'}</p></article> })}</div> : <p className="muted">Chưa phát hiện kỹ năng.</p>}</section>
      <section className="panel content-panel"><p className="eyebrow">KỸ NĂNG ĐỀ XUẤT</p><h2>Kỹ năng còn thiếu</h2>{missingSkills.length ? <div className="missing-grid">{missingSkills.map((skill, index) => <article className="missing-card" key={`${skill.skillCode}-${index}`}><div><strong>{text(skill.name)}</strong><span>{text(skill.jobName)}</span></div><span className="importance">Mức độ {text(skill.importance) || '—'}/5</span><p>{text(skill.reason)}</p></article>)}</div> : <p className="muted">Không có kỹ năng còn thiếu được đề xuất.</p>}</section>
      <section className="panel content-panel"><p className="eyebrow">TỐI ƯU CV</p><h2>Gợi ý chỉnh sửa</h2>{improvements.length ? <div className="improvement-list">{improvements.map((item, index) => <article className="improvement-card" key={`${item.section}-${index}`}><span>{text(item.section)}</span><div><strong>{text(item.issue)}</strong><p>{text(item.suggestion)}</p></div></article>)}</div> : <p className="muted">Chưa có đề xuất chỉnh sửa.</p>}</section>
      {Array.isArray(result.otherSkills) && result.otherSkills.length > 0 && <section className="panel content-panel"><p className="eyebrow">KỸ NĂNG KHÁC</p><StringList items={result.otherSkills} /></section>}
      <p className="disclaimer">Kết quả mang tính tham khảo và không thay thế tư vấn nghề nghiệp từ người thật.</p>
    </>}
  </div>
}
