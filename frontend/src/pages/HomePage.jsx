import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { useAuth } from '../context/useAuth'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useReveal } from '../hooks/useReveal'

const SAMPLE_RESULT = Object.freeze({
  score: 78,
  ranking: [
    { name: 'Frontend', score: 78 },
    { name: 'Full-stack', score: 64 },
    { name: 'Kiểm thử phần mềm', score: 41 },
  ],
  skills: ['JavaScript', 'React', 'Git'],
  missingSkills: ['TypeScript', 'REST API'],
})
const SKILL_RIBBON = ['JavaScript', 'React', 'C#', 'ASP.NET Core', 'SQL Server', 'Python', 'Docker', 'Git', 'CI/CD']

function FeatureIcon({ kind }) {
  const shapes = {
    skills: <><path d="m5 12 4 4L19 6" /><path d="M4 4h16v16H4z" /></>,
    ranking: <><path d="M4 19V5m0 14h17" /><path d="m7 15 4-4 3 2 6-7" /></>,
    missing: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5m0 3h.01" /></>,
    history: <><path d="M4 11a8 8 0 1 1 1 5M4 5v6h6" /><path d="M12 7v5l3 2" /></>,
  }
  return <span className="feature-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{shapes[kind]}</svg></span>
}

function SampleResultCard({ onReplay }) {
  return (
    <article className="sample-card hero-sample-card">
      <span className="sample-label">Ví dụ minh họa</span>
      <div className="hero-sample-overview">
        <svg className="hero-score-ring" viewBox="0 0 120 120" role="img" aria-label="Ví dụ minh họa: mức khớp 78 trên 100">
          <circle className="sample-score-track" cx="60" cy="60" r="49" />
          <circle className="sample-score-progress" cx="60" cy="60" r="49" pathLength="100" strokeDasharray="100" strokeDashoffset="22" />
          <text x="60" y="57">78</text><text className="hero-score-unit" x="60" y="75">/100</text>
        </svg>
        <div className="hero-sample-ranking">
          <h2>Xếp hạng nghề</h2>
          {SAMPLE_RESULT.ranking.map((item, index) => <div className="sample-rank-row" key={item.name}><span>{item.name}</span><span className="sample-rank-track"><span className={`sample-rank-fill sample-rank-${index + 1}`} style={{ '--ranking-scale': item.score / 100 }} /></span><strong>{item.score}</strong></div>)}
        </div>
      </div>
      <div className="sample-chip-section"><p>Kỹ năng phát hiện</p><div className="sample-tags">{SAMPLE_RESULT.skills.map((skill) => <span className="sample-tag" key={skill}>{skill}</span>)}</div></div>
      <div className="sample-chip-section"><p>Kỹ năng còn thiếu</p><div className="sample-tags">{SAMPLE_RESULT.missingSkills.map((skill) => <span className="sample-tag sample-tag-missing" key={skill}>{skill}</span>)}</div></div>
      <button className="button button-quiet sample-replay" type="button" onClick={onReplay}>Xem lại</button>
    </article>
  )
}

export function HomePage() {
  const { token } = useAuth()
  const reducedMotion = useReducedMotion()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sampleReplay, setSampleReplay] = useState(0)
  const stepsHeadingRef = useReveal()
  const stepsRef = useReveal({ threshold: 0.22 })
  const featureHeadingRef = useReveal()
  const featureRef = useReveal({ threshold: 0.18 })
  const faqHeadingRef = useReveal()
  const faqRef = useReveal({ threshold: 0.12 })

  const closeMenu = () => setMenuOpen(false)
  const scrollToSection = (event) => {
    const target = document.querySelector(event.currentTarget.getAttribute('href'))
    if (target) {
      event.preventDefault()
      target.scrollIntoView({ behavior: reducedMotion ? 'instant' : 'smooth', block: 'start' })
      window.history.replaceState(null, '', event.currentTarget.getAttribute('href'))
      closeMenu()
    }
  }

  return (
    <div className="landing-page">
      <header className="topbar landing-nav">
        <Link className="brand" to="/" aria-label="Career Compass, về trang chủ"><BrandMark /><span className="brand-word">Career Compass</span></Link>
        <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="landing-menu" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? 'Đóng' : 'Menu'}</button>
        <nav id="landing-menu" className={menuOpen ? 'is-open' : ''} aria-label="Điều hướng trang chủ">
          <a href="#how-it-works" onClick={scrollToSection}>Cách hoạt động</a>
          <a href="#features" onClick={scrollToSection}>Tính năng</a>
          <a href="#privacy" onClick={scrollToSection}>Quyền riêng tư</a>
        </nav>
        <div className="landing-actions">
          {!token && <Link className="button button-quiet" to="/login">Đăng nhập</Link>}
          <Link className="button button-primary" to={token ? '/cvs' : '/register'}>{token ? 'Vào ứng dụng' : 'Bắt đầu phân tích'}</Link>
        </div>
      </header>

      <main>
        <section className="hero hero-redesign">
          <div className="hero-copy">
            <p className="eyebrow">Phân tích CV · Định hướng CNTT</p>
            <h1>Biết CV của bạn hợp với <span>nghề nào.</span></h1>
            <p>Career Compass là la bàn nghề nghiệp dành cho CV của bạn. Bạn tải CV lên hoặc nhập thông tin trực tiếp, hệ thống sẽ đọc học vấn, kỹ năng và kinh nghiệm, rồi so với các vị trí trong lĩnh vực CNTT để cho biết nghề nào đang khớp nhất, còn thiếu kỹ năng gì và nên chỉnh CV ở đâu. Mỗi lần phân tích đều được lưu lại, để bạn theo dõi CV tiến bộ theo thời gian.</p>
            <div className="hero-actions">
              <Link className="button button-primary" to={token ? '/cvs' : '/register'}>Bắt đầu phân tích <span aria-hidden="true">→</span></Link>
              <a className="button button-secondary" href="#how-it-works" onClick={scrollToSection}>Xem cách hoạt động</a>
            </div>
            <p className="hero-note">Kết quả mang tính tham khảo, không thay thế tư vấn từ người thật.</p>
          </div>
          <div className="hero-art"><SampleResultCard key={sampleReplay} onReplay={() => setSampleReplay((value) => value + 1)} /></div>
        </section>

        <section className="skill-ribbon" aria-label="Một số kỹ năng CNTT được nhận diện">
          <div className="skill-ribbon-heading"><span className="eyebrow">CÁC KỸ NĂNG CNTT</span></div>
          <div className="skill-ribbon-viewport">
            <div className="skill-ribbon-track">
              {[0, 1].map((copy) => <ul className="skill-ribbon-group" tabIndex={copy === 0 ? 0 : undefined} aria-label={copy === 0 ? 'Kỹ năng CNTT tham khảo' : undefined} aria-hidden={copy === 1 ? 'true' : undefined} key={copy}>{Array.from({ length: 4 }, (_, repeat) => SKILL_RIBBON.map((skill) => <li key={`${repeat}-${skill}`} aria-hidden={copy === 1 || repeat > 0 ? 'true' : undefined}>{skill}</li>))}</ul>)}
            </div>
          </div>
        </section>

        <section className="landing-section" id="how-it-works">
          <div className="landing-section-heading" ref={stepsHeadingRef}><p className="eyebrow">CÁCH HOẠT ĐỘNG</p><h2>Ba bước để xem lại hồ sơ</h2><p>Bạn có thể bắt đầu từ CV PDF/DOCX hoặc nhập thông tin trực tiếp.</p></div>
          <div className="steps-flow" ref={stepsRef}>
            <svg className="steps-connector" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true"><path d="M110 60 C270 15 390 105 500 60 S730 15 890 60" pathLength="1" /></svg>
            <div className="steps-grid">
              <article className="step-card"><span className="step-number">01</span><h3>Thêm CV</h3><p>Tải lên CV hoặc nhập học vấn, kỹ năng, kinh nghiệm và dự án.</p></article>
              <article className="step-card"><span className="step-number">02</span><h3>Xem phân tích</h3><p>Hệ thống trích xuất thông tin và gửi nội dung tới dịch vụ AI để phân tích.</p></article>
              <article className="step-card"><span className="step-number">03</span><h3>Đọc gợi ý</h3><p>Xem kỹ năng, bảng xếp hạng nghề do hệ thống tính và lịch sử phân tích.</p></article>
            </div>
          </div>
        </section>

        <section className="landing-section" id="features">
          <div className="landing-section-heading" ref={featureHeadingRef}><p className="eyebrow">TÍNH NĂNG</p><h2>Các góc nhìn dành cho hồ sơ của bạn</h2></div>
          <div className="feature-grid reveal-container" ref={featureRef}>
            <article className="feature-card"><FeatureIcon kind="skills" /><h3>Kỹ năng phát hiện</h3><p>Xem các kỹ năng hệ thống nhận diện từ nội dung CV.</p></article>
            <article className="feature-card"><FeatureIcon kind="ranking" /><h3>Xếp hạng nghề</h3><p>Đối chiếu hồ sơ với các vị trí CNTT trong danh mục.</p></article>
            <article className="feature-card"><FeatureIcon kind="missing" /><h3>Kỹ năng còn thiếu</h3><p>Tham khảo các kỹ năng được đề xuất cho từng nghề.</p></article>
            <article className="feature-card"><FeatureIcon kind="history" /><h3>Lịch sử phân tích</h3><p>Xem lại những lần phân tích đã lưu theo thời gian.</p></article>
          </div>
        </section>

        <section className="landing-section privacy-band" id="privacy">
          <div><p className="eyebrow">QUYỀN RIÊNG TƯ</p><h2>Bạn biết dữ liệu của mình đi đâu</h2><p>Hãy cân nhắc nội dung bạn gửi trước khi sử dụng hệ thống.</p></div>
          <div className="privacy-list">
            <div className="privacy-item"><span className="privacy-mark" aria-hidden="true">01</span><span>CV được lưu trên máy chủ để phục vụ quản lý và xem lịch sử.</span></div>
            <div className="privacy-item"><span className="privacy-mark" aria-hidden="true">02</span><span>Nội dung CV được gửi tới dịch vụ AI bên ngoài để phân tích.</span></div>
            <div className="privacy-item"><span className="privacy-mark" aria-hidden="true">03</span><span>Khi xóa CV, dữ liệu CV và lịch sử liên quan được xóa khỏi hệ thống.</span></div>
            <div className="privacy-item"><span className="privacy-mark" aria-hidden="true">04</span><span>Kết quả mang tính tham khảo và không thay thế tư vấn nghề nghiệp từ người thật.</span></div>
          </div>
        </section>

        <section className="landing-section landing-faq">
          <div className="landing-section-heading" ref={faqHeadingRef}><p className="eyebrow">CÂU HỎI THƯỜNG GẶP</p><h2>Thông tin cần biết</h2></div>
          <div className="faq-grid reveal-container" ref={faqRef}>
            <article className="faq-card"><h3>Career Compass phân tích những gì?</h3><p>Hệ thống đọc học vấn, kỹ năng và kinh nghiệm trong CV, so sánh với các vị trí CNTT, rồi hiển thị nghề đang khớp nhất, kỹ năng còn thiếu và gợi ý chỉnh CV. Lịch sử mỗi lần phân tích được lưu để bạn xem lại.</p></article>
            <article className="faq-card"><h3>Kết quả có thay cho tư vấn nghề nghiệp không?</h3><p>Kết quả mang tính tham khảo và không thay thế tư vấn nghề nghiệp từ người thật.</p></article>
            <article className="faq-card"><h3>CV và nội dung được xử lý thế nào?</h3><p>CV được lưu trên máy chủ. Nội dung CV được gửi tới dịch vụ AI bên ngoài để phân tích.</p></article>
            <article className="faq-card"><h3>Điều gì xảy ra khi tôi xóa CV?</h3><p>Dữ liệu CV và lịch sử phân tích liên quan được xóa khỏi hệ thống.</p></article>
          </div>
        </section>

        <section className="landing-section final-cta"><div><p className="eyebrow">BẮT ĐẦU TỪ CV CỦA BẠN</p><h2>Sẵn sàng xem những góc nhìn về hồ sơ?</h2><p>Kết quả phân tích mang tính tham khảo.</p></div><Link className="button button-primary" to={token ? '/cvs' : '/register'}>Bắt đầu phân tích <span aria-hidden="true">→</span></Link></section>
      </main>

      <footer className="landing-footer"><Link className="brand" to="/" aria-label="Career Compass, về trang chủ"><BrandMark /><span className="brand-word">Career Compass</span></Link><span>Quản lý CV và tham khảo định hướng nghề nghiệp CNTT</span></footer>
    </div>
  )
}
