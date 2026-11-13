import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../context/useAuth'
import { cvService } from '../services/cvService'
import { getFriendlyError } from '../services/apiClient'
import { useReducedMotion } from '../hooks/useReducedMotion'
import {
  SparklesIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  TrendingUpIcon,
  FileTextIcon,
  RefreshCwIcon,
} from '../components/Icons'

export function AnalysisHistoryPage() {
  const { token } = useAuth()
  const reducedMotion = useReducedMotion()
  const [analyses, setAnalyses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function loadAll() {
      setLoading(true)
      setError('')
      try {
        const first = await cvService.listAnalyses(token, 1, 100)
        const allItems = [...(first.items || [])]
        const pages = Math.ceil(first.totalCount / first.pageSize)
        for (let page = 2; page <= pages; page += 1) {
          const next = await cvService.listAnalyses(token, page, first.pageSize)
          allItems.push(...(next.items || []))
        }
        if (active) setAnalyses(allItems)
      } catch (requestError) {
        if (active) setError(getFriendlyError(requestError))
      } finally {
        if (active) setLoading(false)
      }
    }
    loadAll()
    return () => { active = false }
  }, [token])

  const chartData = useMemo(() => analyses
    .filter((item) => item.status === 'Completed' && item.overallScore !== null && item.overallScore !== undefined)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((item, index) => ({
      label: new Date(item.createdAt).toLocaleDateString('vi-VN'),
      score: Number(item.overallScore),
      index: index + 1,
    })), [analyses])

  const latestCompleted = useMemo(() => {
    return analyses.find((a) => a.status === 'Completed' && a.overallScore != null)
  }, [analyses])

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="badge-ai" style={{ marginBottom: 8 }}>
            <TrendingUpIcon size={14} /> Tiến trình nghề nghiệp
          </div>
          <h1>Lịch sử phân tích</h1>
          <p className="muted">Theo dõi sự cải thiện của mức khớp kỹ năng qua từng phiên bản CV của bạn.</p>
        </div>
        <Link className="button button-primary" to="/cvs">
          <SparklesIcon size={16} /> Phân tích CV mới
        </Link>
      </section>

      {error && <div className="notice error" role="alert"><AlertCircleIcon size={18} /> {error}</div>}

      {/* KPI Cards */}
      <div className="bento-grid">
        <div className="saas-card bento-col-4" style={{ padding: '22px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 700 }}>TỔNG LƯỢT PHÂN TÍCH</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 8 }}>
            <strong style={{ fontSize: '2rem', color: 'var(--ink)' }}>{analyses.length}</strong>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>phiên</span>
          </div>
        </div>

        <div className="saas-card bento-col-4" style={{ padding: '22px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 700 }}>ĐIỂM GẦN NHẤT</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
            <strong style={{ fontSize: '2rem', color: 'var(--primary)' }}>
              {latestCompleted?.overallScore != null ? latestCompleted.overallScore : '—'}
            </strong>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>/100</span>
          </div>
        </div>

        <div className="saas-card bento-col-4" style={{ padding: '22px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 700 }}>TỶ LỆ THÀNH CÔNG</span>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 8 }}>
            <strong style={{ fontSize: '2rem', color: '#059669' }}>
              {analyses.length > 0 ? Math.round((analyses.filter((a) => a.status === 'Completed').length / analyses.length) * 100) : 0}%
            </strong>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>hoàn tất</span>
          </div>
        </div>
      </div>

      {/* Progress Chart */}
      <section className="saas-card chart-panel" style={{ padding: '28px', marginBottom: 28 }}>
        <div className="section-title">
          <div>
            <p className="eyebrow">XU HƯỚNG TỔNG QUAN</p>
            <h2>Mức khớp kỹ năng theo thời gian</h2>
            <p className="muted">Biểu đồ thể hiện sự gia tăng độ phù hợp sau mỗi lần bạn tối ưu hóa hồ sơ.</p>
          </div>
        </div>

        {loading ? (
          <div className="skeleton-stack" aria-hidden="true">
            <div className="skeleton skeleton-line medium" />
            <div className="skeleton skeleton-card" style={{ height: 220 }} />
          </div>
        ) : chartData.length === 0 ? (
          <div className="chart-empty" style={{ padding: '40px 20px' }}>
            <FileTextIcon size={32} color="var(--muted)" style={{ margin: '0 auto 10px', display: 'block' }} />
            Chưa có lần phân tích hoàn tất nào có điểm số để hiển thị biểu đồ.
          </div>
        ) : chartData.length === 1 ? (
          <div className="single-score" style={{ padding: '24px' }}>
            <span className="score-number">{chartData[0].score}<small>/100</small></span>
            <span>Đã ghi nhận 1 lượt phân tích ({chartData[0].label}). Biểu đồ đường xu hướng sẽ xuất hiện khi có từ 2 lần trở lên.</span>
          </div>
        ) : (
          <div className="chart-wrap" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 12, right: 18, left: -10, bottom: 4 }}>
                <CartesianGrid stroke="#E2E8F0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 11 }} tickLine={false} axisLine={{ stroke: '#CBD5E1' }} />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #CBD5E1', borderRadius: 10, fontSize: '0.82rem', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}
                  formatter={(value) => [`${value}/100`, 'Mức khớp']}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#2B50F5"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#2B50F5', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 7, fill: '#00D2FF', stroke: '#2B50F5', strokeWidth: 2 }}
                  isAnimationActive={!reducedMotion}
                  animationDuration={800}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* History Table */}
      <section className="section-block">
        <div className="section-title">
          <div>
            <p className="eyebrow">DANH SÁCH CHI TIẾT</p>
            <h2>Lịch sử các phiên phân tích</h2>
          </div>
          <span className="count-pill">{analyses.length} bản ghi</span>
        </div>

        {loading ? (
          <div className="skeleton-stack panel" aria-hidden="true">
            <div className="skeleton skeleton-card" />
            <div className="skeleton skeleton-card" />
          </div>
        ) : analyses.length === 0 ? (
          <div className="saas-card" style={{ padding: '40px 20px', textAlign: 'center' }}>
            <h3>Chưa có phiên phân tích nào</h3>
            <p className="muted" style={{ maxWidth: 440, margin: '0 auto 16px' }}>
              Hãy vào mục “CV của tôi” để tải lên CV và nhận kết quả phân tích đầu tiên.
            </p>
            <Link className="button button-primary" to="/cvs">
              Tải CV ngay
            </Link>
          </div>
        ) : (
          <div className="saas-card table-panel" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--muted)', fontSize: '0.76rem' }}>THỜI GIAN</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--muted)', fontSize: '0.76rem' }}>MÃ CV</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--muted)', fontSize: '0.76rem' }}>TRẠNG THÁI</th>
                  <th style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--muted)', fontSize: '0.76rem' }}>MỨC KHỚP</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((item) => (
                  <tr key={item.analysisId} style={{ borderBottom: '1px solid var(--line-soft)', transition: 'background 0.15s ease' }}>
                    <td style={{ padding: '14px 18px', color: 'var(--ink)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <ClockIcon size={14} color="var(--muted)" />
                        {new Date(item.createdAt).toLocaleString('vi-VN')}
                      </div>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      <span className="code-label" style={{ padding: '3px 7px', background: '#F1F5F9', borderRadius: 6 }}>
                        {item.cvId.slice(0, 8)}...
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {item.status === 'Completed' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: '0.74rem', fontWeight: 700, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                          <CheckCircleIcon size={12} /> Hoàn tất
                        </span>
                      ) : item.status === 'Failed' ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: '0.74rem', fontWeight: 700, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA' }}>
                          <AlertCircleIcon size={12} /> Lỗi
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 999, fontSize: '0.74rem', fontWeight: 700, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                          <RefreshCwIcon size={12} className="spin" /> Đang xử lý
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {item.overallScore == null ? (
                        <span className="muted">—</span>
                      ) : (
                        <strong style={{ fontSize: '0.96rem', color: Number(item.overallScore) >= 70 ? '#059669' : 'var(--primary)' }}>
                          {item.overallScore}%
                        </strong>
                      )}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <Link to={`/analyses/${item.analysisId}`} className="button button-quiet" style={{ minHeight: 32, padding: '0 12px', fontSize: '0.8rem' }}>
                        Xem báo cáo <ArrowRightIcon size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
