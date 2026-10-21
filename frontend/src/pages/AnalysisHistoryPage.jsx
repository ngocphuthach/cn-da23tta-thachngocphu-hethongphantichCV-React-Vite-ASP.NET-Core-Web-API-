import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../context/useAuth'
import { cvService } from '../services/cvService'
import { getFriendlyError } from '../services/apiClient'

export function AnalysisHistoryPage() {
  const { token } = useAuth()
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
      } catch (requestError) { if (active) setError(getFriendlyError(requestError)) }
      finally { if (active) setLoading(false) }
    }
    loadAll()
    return () => { active = false }
  }, [token])

  const chartData = useMemo(() => analyses
    .filter((item) => item.status === 'Completed' && item.overallScore !== null && item.overallScore !== undefined)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((item, index) => ({ label: new Date(item.createdAt).toLocaleDateString('vi-VN'), score: Number(item.overallScore), index: index + 1 })), [analyses])

  return <>
    <section className="page-heading"><div><p className="eyebrow">THEO DÕI TIẾN TRÌNH</p><h1>Lịch sử phân tích</h1><p className="muted">Xem lại các lần phân tích và mức khớp kỹ năng theo thời gian.</p></div><Link className="button button-primary" to="/cvs">Tải CV / phân tích</Link></section>
    {error && <div className="notice error" role="alert">{error}</div>}
    <section className="panel chart-panel">
      <div className="section-title"><div><h2>Mức khớp kỹ năng với nghề phù hợp nhất</h2><p className="muted">Chỉ số do Backend tự tính từ kỹ năng yêu cầu của nghề.</p></div></div>
      {loading ? <div className="skeleton-stack" aria-hidden="true"><div className="skeleton skeleton-line medium" /><div className="skeleton skeleton-card" /></div> : chartData.length === 0 ? <div className="chart-empty">Chưa có lần phân tích hoàn tất có điểm để hiển thị.</div> : chartData.length === 1 ? <div className="single-score"><span className="score-number">{chartData[0].score}<small>/100</small></span><span>Hiện có một lần phân tích hoàn tất ({chartData[0].label}). Biểu đồ sẽ xuất hiện sau lần phân tích tiếp theo.</span></div> : (
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 12, right: 18, left: 0, bottom: 4 }}><CartesianGrid stroke="#D9E0EE" strokeDasharray="4 4" vertical={false} /><XAxis dataKey="label" tick={{ fill: '#4A5878', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#D9E0EE' }} /><YAxis domain={[0, 100]} tick={{ fill: '#4A5878', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#D9E0EE' }} /><Tooltip contentStyle={{ borderColor: '#D9E0EE', borderRadius: 12, color: '#0B1B3A' }} formatter={(value) => [`${value}/100`, 'Mức khớp kỹ năng']} /><Line type="monotone" dataKey="score" stroke="#2B50F5" strokeWidth={3} dot={{ r: 5, fill: '#2B50F5' }} activeDot={{ r: 7, fill: '#6F88F8' }} /></LineChart></ResponsiveContainer></div>
      )}
    </section>
    <section className="section-block"><div className="section-title"><div><p className="eyebrow">CÁC LẦN PHÂN TÍCH</p><h2>Tất cả lịch sử</h2></div><span className="count-pill">{analyses.length} lần</span></div>
      {loading ? <div className="skeleton-stack panel" aria-hidden="true"><div className="skeleton skeleton-line medium" /><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /></div> : analyses.length === 0 ? <div className="panel empty-state"><h3>Chưa có lịch sử phân tích</h3><p>Thêm CV trong mục “CV của tôi”, sau đó chọn phân tích để lưu kết quả vào đây.</p><Link className="button button-primary" to="/cvs">Thêm CV</Link></div> : <div className="panel table-panel"><div className="history-table"><div className="history-row history-head"><span>Thời gian</span><span>CV</span><span>Trạng thái</span><span>Điểm tổng</span><span></span></div>{analyses.map((item) => <div className="history-row" key={item.analysisId}><span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span><span className="code-label">{item.cvId.slice(0, 8)}</span><span><span className={`status status-${item.status.toLowerCase()}`}>{item.status === 'Completed' ? 'Hoàn tất' : item.status === 'Failed' ? 'Thất bại' : 'Đang chờ'}</span></span><strong>{item.overallScore == null ? '—' : `${item.overallScore}/100`}</strong><Link className="table-link" to={`/analyses/${item.analysisId}`}>Chi tiết <span aria-hidden="true">→</span></Link></div>)}</div></div>}
    </section>
  </>
}
