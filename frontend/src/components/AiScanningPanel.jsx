import { useEffect, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import {
  CheckCircleIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TargetIcon,
  ZapIcon,
} from './Icons'

const CV_STEPS = [
  { label: 'Trích xuất & ẩn danh thông tin cá nhân', icon: ShieldCheckIcon },
  { label: 'Nhận diện kỹ năng, kinh nghiệm & dự án', icon: ZapIcon },
  { label: 'Đối chiếu danh mục nghề nghiệp & tính điểm', icon: TargetIcon },
  { label: 'Tổng hợp báo cáo & gợi ý cải thiện CV', icon: SparklesIcon },
]

const RECRUITER_STEPS = [
  { label: 'Đọc dữ liệu CV & ẩn danh thông tin nhạy cảm', icon: ShieldCheckIcon },
  { label: 'Phân tích từng tiêu chí của Nhà tuyển dụng', icon: TargetIcon },
  { label: 'Tìm kiếm bằng chứng thực tế trong CV', icon: ZapIcon },
  { label: 'Chấm điểm phù hợp & lập kế hoạch tối ưu', icon: SparklesIcon },
]

export function AiScanningPanel({ mode = 'cv', title, message, tip }) {
  const reducedMotion = useReducedMotion()
  const [activeStep, setActiveStep] = useState(0)
  const steps = mode === 'recruiter' ? RECRUITER_STEPS : CV_STEPS

  useEffect(() => {
    if (reducedMotion) return undefined
    const t1 = window.setTimeout(() => setActiveStep(1), 1800)
    const t2 = window.setTimeout(() => setActiveStep(2), 4500)
    const t3 = window.setTimeout(() => setActiveStep(3), 7800)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [reducedMotion])

  const defaultTitle = mode === 'recruiter'
    ? 'AI đang đối chiếu CV với tiêu chí Nhà tuyển dụng'
    : 'AI đang quét & phân tích chuyên sâu CV của bạn'

  const defaultMessage = mode === 'recruiter'
    ? 'Hệ thống đang kiểm tra từng yêu cầu tuyển dụng và trích xuất bằng chứng thực tế từ hồ sơ...'
    : 'Hệ thống đang đánh giá kỹ năng, kinh nghiệm và đối chiếu với các vị trí IT phù hợp nhất...'

  const progressPercent = [24, 52, 78, 94][activeStep] ?? 50

  return (
    <div className="ai-scanner-panel" role="status" aria-live="polite">
      {/* Decorative animated glow */}
      <div className="ai-scanner-ambient" aria-hidden="true" />

      <div className="ai-scanner-layout">
        {/* Left: Hologram CV Scanner Animation */}
        <div className="ai-scan-doc-wrap" aria-hidden="true">
          <div className="ai-scan-doc">
            {!reducedMotion && <div className="ai-scan-doc-beam" />}
            <div className="ai-scan-doc-top">
              <span className="ai-scan-avatar" />
              <div className="ai-scan-title-lines">
                <span className="ai-scan-line w-75" />
                <span className="ai-scan-line w-50 muted-line" />
              </div>
            </div>
            <div className="ai-scan-doc-body">
              <span className="ai-scan-line w-90" />
              <span className="ai-scan-line w-80" />
              <span className="ai-scan-line w-65" />
              <div className="ai-scan-chips">
                <span className="ai-scan-chip" />
                <span className="ai-scan-chip" />
                <span className="ai-scan-chip" />
              </div>
              <span className="ai-scan-line w-85" />
              <span className="ai-scan-line w-60" />
            </div>
          </div>
          <div className="ai-scan-orbit-badge">
            <SparklesIcon size={14} />
          </div>
        </div>

        {/* Right: Live Pipeline Progress */}
        <div className="ai-scanner-content">
          <div className="ai-scanner-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div className="pulse-radar-dot" />
              <strong style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>
                {title || defaultTitle}
              </strong>
              <span className="badge-ai" style={{ fontSize: '0.72rem' }}>
                <RefreshCwIcon size={12} className="spin" /> Đang xử lý
              </span>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '0.86rem', color: 'var(--muted)' }}>
              {message || defaultMessage}
            </p>
          </div>

          {/* Shimmer Progress Bar */}
          <div className="ai-scan-progress-track" aria-hidden="true">
            <div
              className="ai-scan-progress-fill"
              style={{ width: `${reducedMotion ? 65 : progressPercent}%` }}
            />
          </div>

          {/* 4-Step Pipeline */}
          <div className="ai-scan-steps">
            {steps.map((step, index) => {
              const Icon = step.icon
              const isDone = index < activeStep
              const isCurrent = index === activeStep
              return (
                <div
                  key={step.label}
                  className={`ai-scan-step ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''}`}
                >
                  <span className="ai-scan-step-icon">
                    {isDone ? (
                      <CheckCircleIcon size={14} />
                    ) : isCurrent ? (
                      <RefreshCwIcon size={13} className="spin" />
                    ) : (
                      <Icon size={13} />
                    )}
                  </span>
                  <span>{step.label}</span>
                </div>
              )
            })}
          </div>

          {tip && (
            <div className="ai-scan-tip">
              <SparklesIcon size={14} />
              <span>
                <strong>Mẹo tối ưu CV:</strong> {tip}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
