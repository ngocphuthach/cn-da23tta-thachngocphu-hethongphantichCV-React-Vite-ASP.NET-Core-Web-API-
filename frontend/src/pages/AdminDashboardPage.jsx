import { useEffect, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAdminAuth } from '../context/useAdminAuth'
import { adminService } from '../services/adminService'
import { ApiError } from '../services/apiClient'
import { useCountUp } from '../hooks/useCountUp'
import { useReducedMotion } from '../hooks/useReducedMotion'

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
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    adminService.stats(token).then((result) => { if (active) setStats(result) })
      .catch((err) => { if (active) setError(messageFor(err)) })
    return () => { active = false }
  }, [token])

  const cards = stats ? [
    ['Tổng người dùng', stats.totalUsers],
    ['Tổng CV', stats.totalCvs],
    ['Phân tích hoàn tất', stats.completedAnalyses],
    ['Phân tích thất bại', stats.failedAnalyses],
  ] : []

  return <section className="admin-page">
    <header className="page-heading"><div><p className="eyebrow">KHU QUẢN TRỊ</p><h1>Dashboard</h1><p className="muted">Thống kê tổng hợp từ dữ liệu hệ thống.</p></div></header>
    {error && <div role="alert" className="notice error">{error}</div>}
    {!stats && !error && <div className="panel empty-state">Đang tải thống kê…</div>}
    {stats && <>
      <div className="admin-stat-grid">{cards.map(([label, value]) => <article className="panel admin-stat-card" key={label}><span>{label}</span><strong><AnimatedCount value={value} /></strong>{label === 'Phân tích thất bại' && <small>Đang xử lý (Pending/Processing): <AnimatedCount value={stats.pendingAnalyses} /></small>}</article>)}</div>
      <p className="muted admin-catalog-meta">Danh mục phiên bản {stats.catalogVersion} · {stats.activeJobPositionCount} nghề đang hoạt động · {stats.activeSkillCount} kỹ năng đang hoạt động. Pending quá 10 phút được tính vào thất bại.</p>
      <section className="panel admin-panel admin-chart-panel"><h2>Top nghề được xếp hạng đầu</h2><p className="muted">Trong {stats.scannedCompletedAnalyses} phân tích hoàn tất gần nhất (tối đa 1.000).</p>
        {stats.topJobs.length === 0 ? <div className="empty-state">Chưa có dữ liệu xếp hạng hợp lệ để hiển thị.</div> : <div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={stats.topJobs} layout="vertical" margin={{ left: 14, right: 24, top: 5, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="jobPositionName" width={150} tick={{ fontSize: 12 }} /><Tooltip formatter={(value) => [`${value} lượt`, 'Số lần xếp đầu']} /><Bar dataKey="count" name="Số lần xếp đầu" fill="#3458F5" radius={[0, 6, 6, 0]} isAnimationActive={!reducedMotion} animationDuration={650} /></BarChart></ResponsiveContainer></div>}
      </section>
    </>}
  </section>
}
