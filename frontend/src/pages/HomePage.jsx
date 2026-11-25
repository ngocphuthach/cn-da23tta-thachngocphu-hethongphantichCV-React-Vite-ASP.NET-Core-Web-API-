import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BrandMark } from '../components/BrandMark'
import { ClockIcon, FileTextIcon, SparklesIcon, TargetIcon, ZapIcon } from '../components/Icons'
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
  const icons = { skills: FileTextIcon, ranking: TargetIcon, missing: ZapIcon, history: ClockIcon }
  const Icon = icons[kind] || SparklesIcon
  return <span className="feature-icon" aria-hidden="true"><Icon size={23} /></span>
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

function HeroIllustration() {
  return (
    <div className="hero-illustration" role="img" aria-label="Minh họa CV và các kỹ năng được đối chiếu với vị trí nghề nghiệp">
      <svg viewBox="0 0 560 430" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="cv-sheet" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#FFFFFF" /><stop offset="1" stopColor="#DCE5FF" /></linearGradient>
          <linearGradient id="cv-orbit" x1="0" x2="1"><stop stopColor="#635BFF" /><stop offset="1" stopColor="#49C6FF" /></linearGradient>
          <filter id="cv-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="20" stdDeviation="16" floodColor="#02091F" floodOpacity=".38" /></filter>
        </defs>
        <ellipse cx="286" cy="348" rx="194" ry="37" fill="#030A26" opacity=".28" />
        <ellipse cx="283" cy="327" rx="190" ry="39" fill="none" stroke="url(#cv-orbit)" strokeWidth="9" opacity=".82" transform="rotate(-13 283 327)" />
        <ellipse cx="283" cy="327" rx="151" ry="27" fill="none" stroke="#8877FF" strokeWidth="3" opacity=".66" transform="rotate(-13 283 327)" />
        <g filter="url(#cv-shadow)" transform="rotate(-8 282 196)">
          <rect x="177" y="45" width="218" height="272" rx="20" fill="url(#cv-sheet)" />
          <rect x="197" y="66" width="54" height="54" rx="17" fill="#DCE5FF" />
          <circle cx="224" cy="86" r="12" fill="#6A7CF7" />
          <path d="M205 111c3-12 12-18 19-18s17 6 20 18" fill="#8F9FFF" />
          <rect x="265" y="73" width="95" height="10" rx="5" fill="#455BCE" />
          <rect x="265" y="92" width="74" height="7" rx="3.5" fill="#AAB8E8" />
          <path d="m202 151 7 7 14-16" fill="none" stroke="#3D63E9" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="236" y="149" width="126" height="8" rx="4" fill="#8A9AD4" />
          <path d="m202 190 7 7 14-16" fill="none" stroke="#3D63E9" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="236" y="188" width="109" height="8" rx="4" fill="#8A9AD4" />
          <path d="m202 229 7 7 14-16" fill="none" stroke="#3D63E9" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="236" y="227" width="117" height="8" rx="4" fill="#8A9AD4" />
          <rect x="199" y="268" width="161" height="22" rx="11" fill="#E9EDFF" />
          <rect x="208" y="275" width="50" height="8" rx="4" fill="#6378E8" />
          <rect x="263" y="275" width="39" height="8" rx="4" fill="#8798EF" />
          <rect x="307" y="275" width="42" height="8" rx="4" fill="#AFBAF1" />
        </g>
        <g className="hero-float-card" filter="url(#cv-shadow)">
          <rect x="46" y="130" width="90" height="78" rx="18" fill="#243D82" stroke="#657DE0" />
          <rect x="68" y="158" width="47" height="28" rx="5" fill="#CBD8FF" />
          <path d="M73 157v-7a8 8 0 0 1 16 0v7m-8 13v6" fill="none" stroke="#F7FAFF" strokeWidth="5" strokeLinecap="round" />
        </g>
        <g className="hero-float-card hero-float-card-chart" filter="url(#cv-shadow)">
          <rect x="410" y="146" width="100" height="80" rx="18" fill="#243D82" stroke="#657DE0" />
          <path d="M428 207h63M431 197l15-16 14 8 20-24" fill="none" stroke="#8FCBFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M470 165h10v10" fill="none" stroke="#8FCBFF" strokeWidth="5" strokeLinecap="round" />
        </g>
        <circle cx="115" cy="86" r="4" fill="#8BCBFF" /><circle cx="451" cy="93" r="5" fill="#A59BFF" />
        <path d="m143 270 5 12 12 5-12 5-5 12-5-12-12-5 12-5zM430 275l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#C7D2FE" opacity=".9" />
      </svg>
      <span className="hero-illustration-caption"><span aria-hidden="true">✦</span> CV · Kỹ năng · Nghề nghiệp</span>
    </div>
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
    <div className={`landing-page${reducedMotion ? '' : ' motion-enabled'}`}>
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
            <div className="badge-ai" style={{ marginBottom: 16 }}>
              <SparklesIcon size={16} /> Career Compass · La bàn nghề nghiệp CNTT
            </div>
            <h1>Khám phá độ khớp CV với <span>nghề IT tương lai.</span></h1>
            <p>Career Compass dùng AI để nhận diện kỹ năng, đối chiếu CV với danh mục vị trí CNTT và đưa ra gợi ý về các kỹ năng có thể bổ sung cùng những phần CV cần xem lại.</p>
            <div className="hero-actions">
              <Link className="button button-primary" to={token ? '/cvs' : '/register'}>Bắt đầu phân tích ngay →</Link>
              <a className="button button-secondary" href="#how-it-works" onClick={scrollToSection}>Tìm hiểu cách hoạt động</a>
            </div>
            <p className="hero-note">Kết quả mang tính tham khảo, không thay thế tư vấn từ người thật.</p>
          </div>
          <div className="hero-art"><HeroIllustration /></div>
        </section>

        <section className="skill-ribbon" aria-label="Một số kỹ năng CNTT được nhận diện">
          <div className="skill-ribbon-heading"><span className="eyebrow">CÁC KỸ NĂNG CNTT</span></div>
          <div className="skill-ribbon-viewport">
            <div className="skill-ribbon-track">
              {[0, 1].map((copy) => <ul className="skill-ribbon-group" tabIndex={copy === 0 ? 0 : undefined} aria-label={copy === 0 ? 'Kỹ năng CNTT tham khảo' : undefined} aria-hidden={copy === 1 ? 'true' : undefined} key={copy}>{Array.from({ length: 4 }, (_, repeat) => SKILL_RIBBON.map((skill) => <li key={`${repeat}-${skill}`} aria-hidden={copy === 1 || repeat > 0 ? 'true' : undefined}>{skill}</li>))}</ul>)}
            </div>
          </div>
        </section>

        <section className="landing-section example-section" aria-labelledby="sample-result-title">
          <div className="example-copy">
            <p className="eyebrow">KẾT QUẢ THAM KHẢO</p>
            <h2 id="sample-result-title">Một góc nhìn từ bản phân tích</h2>
            <p>Các kết quả thực tế phụ thuộc vào nội dung CV, danh mục nghề nghiệp và thông tin do AI xử lý.</p>
          </div>
          <div className="example-card-wrap">
            <SampleResultCard key={sampleReplay} onReplay={() => setSampleReplay((value) => value + 1)} />
          </div>
        </section>

        <section className="landing-section" id="how-it-works">
          <div className="landing-section-heading" ref={stepsHeadingRef}><p className="eyebrow">CÁCH HOẠT ĐỘNG</p><h2>Ba bước để xem lại hồ sơ</h2><p>Bạn có thể bắt đầu từ CV PDF/DOCX hoặc nhập thông tin trực tiếp.</p></div>
          <div className="steps-flow" ref={stepsRef}>
            <svg className="steps-connector" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true"><path d="M110 60 C270 15 390 105 500 60 S730 15 890 60" pathLength="1" /></svg>
            <div className="steps-grid">
              <article className="step-card"><span className="step-number">01</span><h3>Thêm CV</h3><p>Tải lên CV hoặc nhập học vấn, kỹ năng, kinh nghiệm và dự án.</p></article>
              <article className="step-card"><span className="step-number">02</span><h3>Xem phân tích</h3><p>Hệ thống trích xuất thông tin, che email và số điện thoại, rồi gửi các thông tin còn lại tới dịch vụ AI để phân tích.</p></article>
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
            <div className="privacy-item"><span className="privacy-mark" aria-hidden="true">02</span><span>Trước khi gửi tới dịch vụ AI bên ngoài, hệ thống che email và số điện thoại; các thông tin khác trong CV vẫn được gửi để phân tích.</span></div>
            <div className="privacy-item"><span className="privacy-mark" aria-hidden="true">03</span><span>Khi xóa CV, dữ liệu CV và lịch sử liên quan được xóa khỏi hệ thống.</span></div>
            <div className="privacy-item"><span className="privacy-mark" aria-hidden="true">04</span><span>Kết quả mang tính tham khảo và không thay thế tư vấn nghề nghiệp từ người thật.</span></div>
          </div>
        </section>

        <section className="landing-section landing-faq">
          <div className="landing-section-heading" ref={faqHeadingRef}><p className="eyebrow">CÂU HỎI THƯỜNG GẶP</p><h2>Thông tin cần biết</h2></div>
          <div className="faq-grid reveal-container" ref={faqRef}>
            <article className="faq-card"><h3>Career Compass phân tích những gì?</h3><p>Hệ thống đọc học vấn, kỹ năng và kinh nghiệm trong CV, so sánh với các vị trí CNTT, rồi hiển thị nghề đang khớp nhất, kỹ năng còn thiếu và gợi ý chỉnh CV. Lịch sử mỗi lần phân tích được lưu để bạn xem lại.</p></article>
            <article className="faq-card"><h3>Kết quả có thay cho tư vấn nghề nghiệp không?</h3><p>Kết quả mang tính tham khảo và không thay thế tư vấn nghề nghiệp từ người thật.</p></article>
            <article className="faq-card"><h3>CV và nội dung được xử lý thế nào?</h3><p>CV được lưu trên máy chủ. Trước khi gửi tới dịch vụ AI bên ngoài, hệ thống che email và số điện thoại; các thông tin khác trong CV vẫn được gửi để phân tích.</p></article>
            <article className="faq-card"><h3>Điều gì xảy ra khi tôi xóa CV?</h3><p>Dữ liệu CV và lịch sử phân tích liên quan được xóa khỏi hệ thống.</p></article>
          </div>
        </section>

        <section className="landing-section final-cta"><div><p className="eyebrow">BẮT ĐẦU TỪ CV CỦA BẠN</p><h2>Sẵn sàng xem những góc nhìn về hồ sơ?</h2><p>Kết quả phân tích mang tính tham khảo.</p></div><Link className="button button-primary" to={token ? '/cvs' : '/register'}>Bắt đầu phân tích <span aria-hidden="true">→</span></Link></section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-main">
          <Link className="brand" to="/" aria-label="Career Compass, về trang chủ"><BrandMark /><span className="brand-word">Career Compass</span></Link>
          <p className="landing-footer-tagline">Đọc CV bằng dữ liệu. Mở rộng góc nhìn nghề nghiệp.</p>
          <p className="landing-footer-copy">Công cụ giúp bạn nhìn lại kỹ năng, đối chiếu các vị trí CNTT và theo dõi từng lần cập nhật hồ sơ.</p>
        </div>
        <div className="landing-footer-links">
          <strong>Khám phá</strong>
          <a href="#how-it-works" onClick={scrollToSection}>Cách hoạt động</a>
          <a href="#features" onClick={scrollToSection}>Tính năng</a>
          <a href="#privacy" onClick={scrollToSection}>Quyền riêng tư</a>
        </div>
        <div className="landing-footer-note">
          <strong>Một góc nhìn để tham khảo</strong>
          <p>Kết quả phản ánh mức khớp kỹ năng theo danh mục hiện có, không thay thế tư vấn nghề nghiệp từ người thật.</p>
          <span>Email và số điện thoại được che trước khi gửi tới dịch vụ AI; thông tin CV khác vẫn được gửi để phân tích.</span>
        </div>
        <div className="landing-footer-bottom"><span>Career Compass <b>·</b> La bàn kỹ năng cho hành trình nghề CNTT</span><Link to={token ? '/cvs' : '/register'}>{token ? 'Mở không gian làm việc' : 'Bắt đầu với CV của bạn'} <span aria-hidden="true">→</span></Link></div>
      </footer>
    </div>
  )
}
