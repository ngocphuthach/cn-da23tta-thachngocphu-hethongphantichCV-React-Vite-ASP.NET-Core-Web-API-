import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { PageSkeleton } from '../components/PageSkeleton'
import { useAuth } from '../context/useAuth'
import { cvService } from '../services/cvService'
import { getFriendlyError } from '../services/apiClient'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useCountUp } from '../hooks/useCountUp'
import { fireConfetti } from '../utils/confetti'
import {
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  AwardIcon,
  ZapIcon,
} from '../components/Icons'

function text(value) { return typeof value === 'string' || typeof value === 'number' ? String(value) : '' }

function StringList({ items }) {
  if (!Array.isArray(items) || items.length === 0) return <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>Chưa có nội dung.</p>
  return (
    <ul className="content-list" style={{ margin: '8px 0 0', paddingLeft: 20 }}>
      {items.map((item, index) => (
        <li key={`${text(item)}-${index}`}>
          {text(item) || (item && typeof item === 'object' ? Object.values(item).map(text).filter(Boolean).join(' · ') : '')}
        </li>
      ))}
    </ul>
  )
}

function ScoreGauge({ score }) {
  const numeric = Number(score)
  const valid = score !== null && score !== undefined && Number.isFinite(numeric)
  const bounded = valid ? Math.max(0, Math.min(100, numeric)) : 0
  const animated = useCountUp(valid ? bounded : 0)
  const shownScore = animated >= bounded ? bounded : Math.floor(animated)
  const circumference = 2 * Math.PI * 50
  const label = valid ? `${numeric} trên 100` : 'Chưa có điểm'

  let strokeColor = '#2B50F5'
  if (bounded >= 80) strokeColor = '#059669'
  else if (bounded >= 60) strokeColor = '#2B50F5'
  else strokeColor = '#D97706'

  return (
    <div className="score-gauge" style={{ position: 'relative', width: 140, height: 140 }}>
      <svg
        viewBox="0 0 120 120"
        role="img"
        aria-label={`Mức khớp kỹ năng với nghề phù hợp nhất: ${label}`}
        style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 10px ${strokeColor}44)` }}
      >
        <circle className="score-track" cx="60" cy="60" r="50" stroke="#E2E8F0" strokeWidth="9" fill="none" />
        <circle
          className={`score-progress${valid ? ' score-progress-animated' : ''}`}
          cx="60"
          cy="60"
          r="50"
          stroke={strokeColor}
          strokeWidth="9"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          style={{ '--score-start': circumference, '--score-target': circumference * (1 - bounded / 100) }}
        />
        <text
          className="score-gauge-label"
          x="60"
          y="58"
          style={{ transform: 'rotate(90deg)', transformOrigin: '60px 60px', fill: 'var(--ink)', fontSize: '26px', fontWeight: 800, textAnchor: 'middle' }}
        >
          {valid ? shownScore : '—'}
        </text>
        <text
          className="score-gauge-unit"
          x="60"
          y="78"
          style={{ transform: 'rotate(90deg)', transformOrigin: '60px 60px', fill: 'var(--muted)', fontSize: '11px', fontWeight: 700, textAnchor: 'middle' }}
        >
          / 100
        </text>
      </svg>
    </div>
  )
}

function RadarSupport({ data }) {
  const reduceMotion = useReducedMotion()
  if (data.length < 3) return null
  return (
    <div className="radar-support" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--line-soft)' }}>
      <p className="eyebrow">TRỰC QUAN HÓA</p>
      <h3 style={{ fontSize: '1.05rem', marginBottom: 6 }}>Biểu đồ radar so sánh các vị trí dẫn đầu</h3>
      <p className="muted" style={{ fontSize: '0.82rem', marginBottom: 12 }}>Điểm càng vươn xa tâm biểu thị mức độ sẵn sàng và độ phủ kỹ năng cao hơn.</p>
      <div className={`radar-wrap${reduceMotion ? '' : ' radar-animate'}`} style={{ height: 300 }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid stroke="#CBD5E1" strokeDasharray="3 3" />
            <PolarAngleAxis dataKey="jobPositionName" tick={{ fill: '#0B1B3A', fontSize: 11, fontWeight: 600 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 10 }} />
            <Radar
              dataKey="backendFitScore"
              name="Mức khớp kỹ năng"
              stroke="#2B50F5"
              strokeWidth={2}
              fill="#2B50F5"
              fillOpacity={0.25}
              isAnimationActive={!reduceMotion}
              animationDuration={800}
            />
            <Tooltip
              formatter={(value) => [`${value}/100`, 'Mức khớp']}
              contentStyle={{ background: '#fff', border: '1px solid #CBD5E1', borderRadius: 10, fontSize: '0.82rem' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
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
  const [skillFilter, setSkillFilter] = useState('ALL') // 'ALL' | 'Advanced' | 'Intermediate' | 'Beginner'

  useEffect(() => {
    let active = true
    let timerId
    let controller
    async function poll() {
      controller = new AbortController()
      try {
        const result = await cvService.getAnalysis(token, analysisId, controller.signal)
        if (!active) return
        setAnalysis(result)
        setLoading(false)
        if (result.status === 'Pending' || result.status === 'Processing') {
          timerId = window.setTimeout(poll, 3500)
        }
      } catch (requestError) {
        if (!active || requestError?.name === 'AbortError') return
        setError(getFriendlyError(requestError))
        setLoading(false)
      }
    }
    poll()
    return () => {
      active = false
      window.clearTimeout(timerId)
      controller?.abort()
    }
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
      } catch { /* Ignore */ }
    }
    findPreviousCompleted()
    return () => { active = false }
  }, [analysis?.overallScore, analysis?.status, analysisId, loading, token])

  // Confetti trigger if score >= 75
  useEffect(() => {
    if (analysis?.status === 'Completed' && Number(analysis.overallScore) >= 75) {
      fireConfetti(2600)
    }
  }, [analysis?.status, analysis?.overallScore])

  if (loading) return <PageSkeleton title="Đang tải kết quả phân tích" />
  if (error) return (
    <>
      <div className="notice error" role="alert"><AlertCircleIcon size={18} /> {error}</div>
      <Link className="button button-secondary" to="/history">Quay lại lịch sử</Link>
    </>
  )

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

  const topJob = ranking[0] || null
  const overallScoreNum = Number(analysis?.overallScore) || 0

  const filteredSkills = skills.filter((s) => {
    if (skillFilter === 'ALL') return true
    return s.level === skillFilter
  })

  return (
    <div className="analysis-results">
      <section className="page-heading">
        <div>
          <div className="badge-ai" style={{ marginBottom: 8 }}>
            <SparklesIcon size={14} /> Báo cáo phân tích AI
          </div>
          <h1>Gợi ý định hướng nghề nghiệp</h1>
          <p className="muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <ClockIcon size={14} /> Hoàn tất: {analysis?.completedAt ? new Date(analysis.completedAt).toLocaleString('vi-VN') : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link className="button button-quiet" to="/cvs">
            CV của tôi
          </Link>
          <Link className="button button-secondary" to="/history">
            Xem lịch sử
          </Link>
        </div>
      </section>

      {analysis?.status !== 'Completed' && (
        <div className={`notice ${analysis?.status === 'Failed' ? 'error' : 'info'}`} role="status">
          {analysis?.status === 'Failed' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <AlertCircleIcon size={20} />
              <span>{analysis.failureReason || 'Lần phân tích này chưa hoàn tất. Bạn có thể thử lại từ trang CV của tôi.'}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <SparklesIcon size={20} />
              <span>Đang phân tích CV bằng AI. Kết quả sẽ tự động hiển thị khi hoàn tất...</span>
            </div>
          )}
        </div>
      )}

      {analysis?.status === 'Completed' && (
        <>
          {/* Bento Grid: KPI Hero Overview */}
          <div className="bento-grid">
            {/* Box 1: Score Gauge & Comparison */}
            <section className="saas-card bento-col-5" style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <p className="eyebrow">CHỈ SỐ TỔNG THỂ</p>
                <h2 style={{ fontSize: '1.25rem', marginBottom: 6 }}>Mức khớp kỹ năng</h2>
                <p className="muted" style={{ fontSize: '0.84rem' }}>Tính toán tự động dựa trên trọng số các kỹ năng thực tế trong danh mục IT.</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '20px 0' }}>
                <ScoreGauge score={analysis.overallScore} />
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink)' }}>
                    {overallScoreNum >= 80 ? 'Rất phù hợp' : overallScoreNum >= 60 ? 'Khá phù hợp' : 'Cần bổ sung'}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                    {overallScoreNum >= 80 ? 'Đáp ứng phần lớn kỹ năng cốt lõi.' : 'Có nền tảng tốt, cần trau dồi thêm một số kỹ năng.'}
                  </span>

                  {previousScore && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 10,
                        padding: '4px 10px',
                        borderRadius: 8,
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: previousScore.delta >= 0 ? '#ECFDF5' : '#FEF2F2',
                        color: previousScore.delta >= 0 ? '#059669' : '#DC2626',
                        border: `1px solid ${previousScore.delta >= 0 ? '#A7F3D0' : '#FECACA'}`,
                      }}
                    >
                      {previousScore.delta >= 0 ? <TrendingUpIcon size={14} /> : <TrendingDownIcon size={14} />}
                      <span>
                        {previousScore.delta >= 0 ? `+${previousScore.delta}` : previousScore.delta} điểm so với lần trước
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: 12, border: '1px solid var(--line-soft)', fontSize: '0.78rem', color: 'var(--muted)' }}>
                Điểm dựa trên dữ liệu đối chiếu khách quan từ thuật toán so khớp.
              </div>
            </section>

            {/* Box 2: Top Position & AI Summary */}
            <section className="saas-card bento-col-7" style={{ padding: '28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <p className="eyebrow">VỊ TRÍ NỔI BẬT NHẤT</p>
                    <h2 style={{ fontSize: '1.6rem', color: 'var(--primary)', margin: '4px 0 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AwardIcon size={24} color="var(--primary)" />
                      {topJob?.jobPositionName || 'Chưa xác định'}
                    </h2>
                    <span className="badge-ai" style={{ fontSize: '0.74rem' }}>
                      Mã: {topJob?.jobPositionCode || 'N/A'}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--muted)', display: 'block' }}>Mức khớp Backend</span>
                    <strong style={{ fontSize: '1.4rem', color: 'var(--ink)' }}>{topJob?.backendFitScore ?? '—'}%</strong>
                  </div>
                </div>

                <div style={{ marginTop: 18, padding: '16px', background: 'rgba(238, 242, 255, 0.6)', border: '1px solid #C7D2FE', borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                    <SparklesIcon size={16} /> Nhận định tổng quan từ AI
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#1E293B', lineHeight: 1.65 }}>
                    {text(result.summary) || 'AI chưa cung cấp nhận định tổng quan.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <a href="#ranking-section" className="button button-quiet" style={{ flex: 1, fontSize: '0.84rem' }}>
                  Xem bảng xếp hạng nghề ↓
                </a>
                <a href="#skills-section" className="button button-primary" style={{ flex: 1, fontSize: '0.84rem' }}>
                  Chi tiết kỹ năng & bằng chứng →
                </a>
              </div>
            </section>
          </div>

          {/* Section 2: Backend Ranking Table & Visual Radar */}
          <section id="ranking-section" className="saas-card" style={{ padding: '28px', marginBottom: 24 }}>
            <div className="section-title">
              <div>
                <p className="eyebrow">BẢNG XẾP HẠNG KHÁCH QUAN</p>
                <h2>Mức độ khớp với các vị trí CNTT</h2>
                <p className="muted">Hệ thống tính điểm độc lập dựa trên danh mục kỹ năng chuẩn, tách biệt với gợi ý cảm tính của AI.</p>
              </div>
            </div>

            {ranking.length > 0 ? (
              <div className="ranking-table-wrap">
                <table className="ranking-table">
                  <thead>
                    <tr>
                      <th scope="col" style={{ width: '40%' }}>Nghề nghiệp IT</th>
                      <th scope="col" style={{ width: '45%' }}>Độ khớp kỹ năng</th>
                      <th scope="col" style={{ width: '15%', textAlign: 'right' }}>Điểm số</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((job, index) => {
                      const score = Number(job.backendFitScore)
                      const scale = job.backendFitScore == null || !Number.isFinite(score) ? 0 : Math.max(0, Math.min(100, score)) / 100
                      return (
                        <tr key={job.jobPositionCode}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className="rank-number" style={{ width: 24, height: 24, borderRadius: '50%', background: index === 0 ? 'var(--primary)' : '#E2E8F0', color: index === 0 ? '#fff' : '#475569', display: 'grid', placeItems: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                                {index + 1}
                              </span>
                              <div>
                                <strong>{text(job.jobPositionName)}</strong>
                                <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--muted)' }}>{text(job.jobPositionCode)}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            {job.backendFitScore == null ? (
                              <span className="muted">Chưa đủ dữ liệu</span>
                            ) : (
                              <div className="ranking-meter" role="img" aria-label={`${text(job.jobPositionName)}: ${job.backendFitScore} trên 100`} style={{ height: 10, borderRadius: 99, background: '#EDF2F7', overflow: 'hidden' }}>
                                <span
                                  className={`ranking-fill rank-color-${index % 4}`}
                                  style={{
                                    '--ranking-scale': scale,
                                    height: '100%',
                                    display: 'block',
                                    borderRadius: 'inherit',
                                    background: index === 0 ? 'linear-gradient(90deg, #2B50F5, #00D2FF)' : 'var(--primary)',
                                    transformOrigin: 'left',
                                    animation: 'cc-rank-grow 1s ease-out both',
                                  }}
                                />
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {job.backendFitScore == null ? 'N/A' : <strong style={{ fontSize: '1rem', color: index === 0 ? 'var(--primary)' : 'inherit' }}>{job.backendFitScore}%</strong>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">Không có dữ liệu xếp hạng.</p>
            )}

            {radarJobs.length >= 3 && <RadarSupport data={radarJobs} />}
          </section>

          {/* Section 3: AI Recommendations */}
          <section className="saas-card" style={{ padding: '28px', marginBottom: 24 }}>
            <p className="eyebrow">KHUYẾN NGHỊ NGHỀ TỪ AI</p>
            <h2>Gợi ý phát triển sự nghiệp</h2>
            <p className="muted">AI đánh giá tổng hợp về kinh nghiệm, thế mạnh và các bước đi tiếp theo cho bạn.</p>

            {jobs.length ? (
              <div className="recommendation-grid" style={{ marginTop: 18 }}>
                {jobs.map((job, index) => (
                  <article className="saas-card" style={{ padding: 22, background: '#fff', border: '1px solid var(--line)' }} key={`${job.jobPositionCode}-${index}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span className="badge-ai" style={{ fontSize: '0.72rem' }}>
                        Khuyến nghị #{index + 1}
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {job.fitScore ?? '—'}<small style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>/100 (AI)</small>
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.15rem', marginBottom: 4 }}>{text(job.jobPositionName)}</h3>
                    <p className="muted" style={{ fontSize: '0.78rem', marginBottom: 14 }}>{text(job.jobPositionCode)}</p>

                    <h4 style={{ fontSize: '0.85rem', color: '#059669', display: 'flex', alignItems: 'center', gap: 5, margin: '14px 0 6px' }}>
                      <CheckCircleIcon size={14} /> Điểm mạnh nổi bật
                    </h4>
                    <StringList items={job.strengths} />

                    <h4 style={{ fontSize: '0.85rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 5, margin: '16px 0 6px' }}>
                      <ZapIcon size={14} /> Lộ trình & Bước tiếp theo
                    </h4>
                    <StringList items={job.nextSteps} />
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">Chưa có khuyến nghị nghề nghiệp.</p>
            )}
          </section>

          {/* Section 4: Detected Skills & Evidence */}
          <section id="skills-section" className="saas-card" style={{ padding: '28px', marginBottom: 24 }}>
            <div className="section-title" style={{ flexWrap: 'wrap', gap: 14 }}>
              <div>
                <p className="eyebrow">BÓC TÁCH KỸ NĂNG</p>
                <h2>Kỹ năng được nhận diện trong CV ({skills.length})</h2>
                <p className="muted">Mỗi kỹ năng đều được AI chỉ rõ bằng chứng trích dẫn trực tiếp từ văn bản CV.</p>
              </div>

              {/* Filter Tabs */}
              <div className="tab-pills" style={{ margin: 0 }}>
                {['ALL', 'Advanced', 'Intermediate', 'Beginner'].map((filterKey) => (
                  <button
                    key={filterKey}
                    type="button"
                    className={`tab-pill ${skillFilter === filterKey ? 'tab-pill-active' : ''}`}
                    style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                    onClick={() => setSkillFilter(filterKey)}
                  >
                    {filterKey === 'ALL' ? `Tất cả (${skills.length})` : filterKey === 'Advanced' ? 'Nâng cao' : filterKey === 'Intermediate' ? 'Trung cấp' : 'Cơ bản'}
                  </button>
                ))}
              </div>
            </div>

            {filteredSkills.length ? (
              <div className="skill-grid" style={{ marginTop: 18 }}>
                {filteredSkills.map((skill, index) => {
                  const levelClass = skill.level === 'Advanced' ? 'advanced' : skill.level === 'Intermediate' ? 'intermediate' : ''
                  return (
                    <article className="saas-card" style={{ padding: 18, background: '#fff', border: '1px solid var(--line)' }} key={`${skill.skillCode}-${index}`}>
                      <div className="skill-heading">
                        <strong style={{ fontSize: '0.98rem' }}>{text(skill.name)}</strong>
                        <span className={`skill-level ${levelClass}`} style={{ fontSize: '0.72rem' }}>{text(skill.level)}</span>
                      </div>
                      <small style={{ color: 'var(--muted)', display: 'block', margin: '4px 0 10px' }}>{text(skill.skillCode)}</small>
                      {skill.evidenceVerified === false ? (
                        <span className="notice warning compact" style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '6px 0' }}>
                          <AlertCircleIcon size={12} /> Chưa đối chiếu được trong text
                        </span>
                      ) : (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: '#059669', fontWeight: 700, margin: '4px 0 8px' }}>
                          <CheckCircleIcon size={12} /> Đã xác thực từ CV
                        </div>
                      )}
                      <p className="evidence" style={{ margin: '8px 0 0', paddingLeft: 10, borderLeft: '3px solid var(--primary)', fontSize: '0.8rem', color: '#475569', fontStyle: 'italic' }}>
                        “{text(skill.evidence) || 'Không có trích dẫn.'}”
                      </p>
                    </article>
                  )
                })}
              </div>
            ) : (
              <p className="muted">Không có kỹ năng nào ở mức độ này.</p>
            )}
          </section>

          {/* Section 5: Missing Skills */}
          <section className="saas-card" style={{ padding: '28px', marginBottom: 24 }}>
            <p className="eyebrow">KHOẢNG TRỐNG KỸ NĂNG</p>
            <h2>Kỹ năng cần bổ sung để gia tăng cơ hội</h2>
            <p className="muted">Những kỹ năng còn thiếu được đánh giá theo mức độ quan trọng từ 1 đến 5 sao.</p>

            {missingSkills.length ? (
              <div className="missing-grid" style={{ marginTop: 18 }}>
                {missingSkills.map((skill, index) => (
                  <article className="saas-card" style={{ padding: 18, background: '#FFFDF5', border: '1px solid #FDE68A' }} key={`${skill.skillCode}-${index}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <strong style={{ fontSize: '0.98rem', color: '#92400E' }}>{text(skill.name)}</strong>
                        <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--muted)', marginTop: 2 }}>{text(skill.jobName)}</span>
                      </div>
                      <span className="importance" style={{ background: '#FEF3C7', color: '#B45309', border: '1px solid #FCD34D' }}>
                        Mức {text(skill.importance) || '—'}/5
                      </span>
                    </div>
                    <p style={{ margin: '10px 0 0', fontSize: '0.82rem', color: '#78350F', lineHeight: 1.55 }}>
                      {text(skill.reason)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">Không phát hiện kỹ năng còn thiếu nghiêm trọng nào.</p>
            )}
          </section>

          {/* Section 6: CV Improvements */}
          <section className="saas-card" style={{ padding: '28px', marginBottom: 24 }}>
            <p className="eyebrow">TỐI ƯU HỒ SƠ</p>
            <h2>Gợi ý cải thiện nội dung CV</h2>
            <p className="muted">Những đề xuất cụ thể để làm nổi bật thế mạnh và tăng tỷ lệ trúng tuyển.</p>

            {improvements.length ? (
              <div className="improvement-list" style={{ marginTop: 18 }}>
                {improvements.map((item, index) => (
                  <article
                    className="saas-card"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '140px 1fr',
                      gap: 20,
                      padding: '16px 20px',
                      background: '#fff',
                      border: '1px solid var(--line)',
                      marginBottom: 12,
                      alignItems: 'center',
                    }}
                    key={`${item.section}-${index}`}
                  >
                    <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {text(item.section)}
                    </span>
                    <div>
                      <strong style={{ display: 'block', fontSize: '0.92rem', color: '#0F172A', marginBottom: 4 }}>
                        {text(item.issue)}
                      </strong>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6 }}>
                        💡 {text(item.suggestion)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">Chưa có đề xuất chỉnh sửa.</p>
            )}
          </section>

          {/* Section 7: Other Skills */}
          {Array.isArray(result.otherSkills) && result.otherSkills.length > 0 && (
            <section className="saas-card" style={{ padding: '28px', marginBottom: 24 }}>
              <p className="eyebrow">KỸ NĂNG BỔ TRỢ</p>
              <h2>Các kỹ năng khác nhận diện được</h2>
              <StringList items={result.otherSkills} />
            </section>
          )}

          <p className="disclaimer" style={{ marginTop: 24 }}>
            Kết quả trên do mô hình AI phân tích và hệ thống tính toán nhằm mục đích hỗ trợ tham khảo định hướng nghề nghiệp, không thay thế hoàn toàn cho đánh giá chuyên môn từ nhà tuyển dụng.
          </p>
        </>
      )}
    </div>
  )
}
