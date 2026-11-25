import { useEffect, useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { useAdminAuth } from '../context/useAdminAuth'
import { adminService } from '../services/adminService'
import { ApiError } from '../services/apiClient'
import { useCountUp } from '../hooks/useCountUp'
import { useReducedMotion } from '../hooks/useReducedMotion'

const CHART_COLORS = ['#514DFF', '#20A88A', '#E3A83C', '#EC6B79', '#49A5CE']

function messageFor(error) {
  return error instanceof ApiError ? error.payload?.message || 'Không thể tải bảng điều khiển.' : 'Không thể kết nối máy chủ.'
}

function AnimatedCount({ value }) {
  const count = useCountUp(value)
  const numericValue = Number(value)
  const shown = count >= numericValue ? numericValue : Math.floor(count)
  return <>{shown.toLocaleString('vi-VN')}</>
}

export function AdminDashboardPage() {
  const { token } = useAdminAuth()
  const reducedMotion = useReducedMotion()
  const [stats, setStats] = useState(null)
  const [analysisRows, setAnalysisRows] = useState([])
  const [error, setError] = useState('')
  const [trendError, setTrendError] = useState('')

  useEffect(() => {
    let active = true
    adminService.stats(token).then((result) => { if (active) setStats(result) })
      .catch((requestError) => { if (active) setError(messageFor(requestError)) })
    adminService.analyses(token, 1, '', '', 100)
      .then((result) => { if (active) setAnalysisRows(result.items || []) })
      .catch((requestError) => { if (active) setTrendError(messageFor(requestError)) })
    return () => { active = false }
  }, [token])

  const trend = useMemo(() => {
    const byDate = new Map()
    for (const item of analysisRows) {
      const date = new Date(item.createdAt).toLocaleDateString('sv-SE')
      const row = byDate.get(date) || { date, completed: 0, failed: 0, pending: 0 }
      if (item.status === 'Completed') row.completed += 1
      else if (item.status === 'Failed') row.failed += 1
      else row.pending += 1
      byDate.set(date, row)
    }
    return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date)).slice(-14)
  }, [analysisRows])

  const completed = Number(stats?.completedAnalyses || 0)
  const failed = Number(stats?.failedAnalyses || 0)
  const endedCount = completed + failed
  const completionRate = endedCount > 0 ? Math.round(completed / endedCount * 100) : null
  const cards = stats ? [
    ['Tổng người dùng', stats.totalUsers, 'Tài khoản trong hệ thống'],
    ['CV đã lưu', stats.totalCvs, 'Hồ sơ tải lên và nhập tay'],
    ['Vị trí nghề', stats.activeJobPositionCount, 'Danh mục đang hoạt động'],
    ['Tỷ lệ hoàn tất', completionRate, endedCount ? `${completed.toLocaleString('vi-VN')} hoàn tất · ${failed.toLocaleString('vi-VN')} thất bại` : 'Chưa có lượt phân tích kết thúc'],
  ] : []

  return <section className="admin-page">
    <header className="page-heading"><div><p className="eyebrow">TỔNG QUAN HỆ THỐNG</p><h1>Dashboard</h1><p className="muted">Thống kê trực tiếp và biểu đồ từ dữ liệu quản trị.</p></div></header>
    {error && <div role="alert" className="notice error">{error}</div>}
    {!stats && !error && <div className="panel empty-state">Đang tải thống kê…</div>}
    {stats && <>
      <div className="admin-stat-grid">{cards.map(([label, value, detail]) => <article className="panel admin-stat-card" key={label}><span>{label}</span><strong>{value === null ? '—' : <><AnimatedCount value={value} />{label === 'Tỷ lệ hoàn tất' ? '%' : ''}</>}</strong><small>{detail}</small></article>)}</div>
      <p className="muted admin-catalog-meta">Danh mục phiên bản {stats.catalogVersion} · {stats.activeJobPositionCount} nghề · {stats.activeSkillCount} kỹ năng đang hoạt động · {stats.pendingAnalyses} lượt đang xử lý.</p>

      <div id="statistics" className="admin-charts-grid">
        <section className="panel admin-panel admin-chart-panel">
          <h2>Hoạt động phân tích CV</h2>
          <p className="muted">Số lượt theo ngày trong {analysisRows.length} phân tích gần nhất (tối đa 100).</p>
          {trendError && <p className="notice warning">{trendError}</p>}
          {trend.length === 0 ? <div className="empty-state">Chưa có dữ liệu phân tích để vẽ biểu đồ.</div> : <div className="admin-chart admin-trend-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={trend} margin={{ left: 0, right: 12, top: 8, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} width={30} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Line type="monotone" dataKey="completed" name="Hoàn tất" stroke="#20A88A" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={!reducedMotion} animationDuration={550} /><Line type="monotone" dataKey="failed" name="Thất bại" stroke="#E96B78" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={!reducedMotion} animationDuration={550} /><Line type="monotone" dataKey="pending" name="Đang xử lý" stroke="#E3A83C" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={!reducedMotion} animationDuration={550} /></LineChart></ResponsiveContainer></div>}
        </section>

        <section className="panel admin-panel admin-chart-panel">
          <h2>Các nghề được xếp hạng đầu</h2>
          <p className="muted">Phân bố trong {stats.scannedCompletedAnalyses} kết quả hoàn tất gần nhất (tối đa 1.000).</p>
          {stats.topJobs.length === 0 ? <div className="empty-state">Chưa có dữ liệu xếp hạng hợp lệ.</div> : <div className="admin-chart admin-pie-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={stats.topJobs} dataKey="count" nameKey="jobPositionName" innerRadius="52%" outerRadius="78%" paddingAngle={3} isAnimationActive={!reducedMotion} animationDuration={600}>{stats.topJobs.map((job, index) => <Cell key={job.jobPositionCode} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Pie><Tooltip formatter={(value) => [`${value} lượt`, 'Xếp hạng đầu']} /><Legend /></PieChart></ResponsiveContainer></div>}
        </section>
      </div>

      <section className="panel admin-panel admin-chart-panel admin-ranking-chart">
        <h2>Top nghề xếp hạng đầu</h2><p className="muted">Số lần đứng đầu trong {stats.scannedCompletedAnalyses} kết quả phân tích hoàn tất gần nhất.</p>
        {stats.topJobs.length === 0 ? <div className="empty-state">Chưa có dữ liệu.</div> : <div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.topJobs} layout="vertical" margin={{ left: 14, right: 24, top: 5, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="jobPositionName" width={170} tick={{ fontSize: 12 }} /><Tooltip formatter={(value) => [`${value} lượt`, 'Số lần xếp đầu']} /><Bar dataKey="count" name="Số lần xếp đầu" fill="#514DFF" radius={[0, 6, 6, 0]} isAnimationActive={!reducedMotion} animationDuration={550} /></BarChart></ResponsiveContainer></div>}
      </section>
    </>}
  </section>
}
