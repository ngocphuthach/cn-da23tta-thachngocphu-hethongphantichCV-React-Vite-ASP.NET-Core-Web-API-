import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { authService } from '../services/authService'
import { getFriendlyError } from '../services/apiClient'
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  ShieldCheckIcon,
  UserIcon,
} from '../components/Icons'

export function ProfilePage() {
  const { token, user, updateUser } = useAuth()
  const [fullName, setFullName] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileNotice, setProfileNotice] = useState('')
  const [profileError, setProfileError] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordNotice, setPasswordNotice] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const displayedFullName = fullName ?? user?.fullName ?? ''

  async function handleUpdateProfile(event) {
    event.preventDefault()
    setProfileNotice('')
    setProfileError('')
    const trimmed = displayedFullName.trim()
    if (!trimmed) {
      setProfileError('Họ tên không được để trống.')
      return
    }
    setSavingProfile(true)
    try {
      const updated = await authService.updateProfile(token, { fullName: trimmed })
      updateUser(updated)
      setProfileNotice('Đã cập nhật họ tên thành công.')
    } catch (err) {
      setProfileError(getFriendlyError(err))
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword(event) {
    event.preventDefault()
    setPasswordNotice('')
    setPasswordError('')
    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu mới phải có ít nhất 8 ký tự.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp.')
      return
    }
    setSavingPassword(true)
    try {
      const res = await authService.changePassword(token, {
        currentPassword,
        newPassword,
      })
      setPasswordNotice(res?.message || 'Đã đổi mật khẩu thành công.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(getFriendlyError(err))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <section className="profile-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">TÀI KHOẢN CỦA BẠN</p>
          <h1>Hồ sơ cá nhân</h1>
          <p className="muted">Thông tin tài khoản và bảo mật đang sử dụng trong Career Compass.</p>
        </div>
      </header>

      <article className="panel profile-card">
        <div className="profile-avatar" aria-hidden="true">
          {(user?.fullName?.trim()?.charAt(0) || 'U').toLocaleUpperCase('vi-VN')}
        </div>
        <div className="profile-details">
          <p className="eyebrow">THÔNG TIN TÀI KHOẢN</p>
          <h2>{user?.fullName || 'Người dùng'}</h2>
          <dl>
            <div><dt>Họ và tên</dt><dd>{user?.fullName || 'Chưa có thông tin'}</dd></div>
            <div><dt>Email</dt><dd>{user?.email || 'Chưa có thông tin'}</dd></div>
          </dl>
        </div>
      </article>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 24 }}>
        {/* Update Profile Form */}
        <section className="saas-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <UserIcon size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Cập nhật họ tên</h3>
          </div>
          {profileError && (
            <div className="notice error" role="alert" style={{ marginBottom: 12 }}>
              <AlertCircleIcon size={16} /> {profileError}
            </div>
          )}
          {profileNotice && (
            <div className="notice success" role="status" style={{ marginBottom: 12 }}>
              <CheckCircleIcon size={16} /> {profileNotice}
            </div>
          )}
          <form onSubmit={handleUpdateProfile} style={{ display: 'grid', gap: 14 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: '0.86rem', fontWeight: 600 }}>
              Họ và tên hiển thị
              <input
                type="text"
                value={displayedFullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={150}
                required
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff' }}
              />
            </label>
            <div>
              <button type="submit" className="button button-primary" disabled={savingProfile} style={{ minHeight: 40 }}>
                {savingProfile ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </section>

        {/* Change Password Form */}
        <section className="saas-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <ShieldCheckIcon size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Đổi mật khẩu</h3>
          </div>
          {passwordError && (
            <div className="notice error" role="alert" style={{ marginBottom: 12 }}>
              <AlertCircleIcon size={16} /> {passwordError}
            </div>
          )}
          {passwordNotice && (
            <div className="notice success" role="status" style={{ marginBottom: 12 }}>
              <CheckCircleIcon size={16} /> {passwordNotice}
            </div>
          )}
          <form onSubmit={handleChangePassword} style={{ display: 'grid', gap: 12 }}>
            <label style={{ display: 'grid', gap: 6, fontSize: '0.86rem', fontWeight: 600 }}>
              Mật khẩu hiện tại
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: '0.86rem', fontWeight: 600 }}>
              Mật khẩu mới (tối thiểu 8 ký tự)
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff' }}
              />
            </label>
            <label style={{ display: 'grid', gap: 6, fontSize: '0.86rem', fontWeight: 600 }}>
              Xác nhận mật khẩu mới
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
                required
                style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid var(--line)', background: '#fff' }}
              />
            </label>
            <div>
              <button type="submit" className="button button-primary" disabled={savingPassword} style={{ minHeight: 40 }}>
                {savingPassword ? 'Đang cập nhật…' : 'Đổi mật khẩu'}
              </button>
            </div>
          </form>
        </section>
      </div>

      <section className="profile-shortcuts" aria-label="Lối tắt">
        <Link className="panel profile-shortcut" to="/cvs">
          <span className="feature-icon"><FileTextIcon size={21} /></span>
          <span><strong>CV của tôi</strong><small>Tải CV, nhập thông tin hoặc so khớp yêu cầu tuyển dụng.</small></span>
          <span aria-hidden="true">→</span>
        </Link>
        <Link className="panel profile-shortcut" to="/history">
          <span className="feature-icon"><ClockIcon size={21} /></span>
          <span><strong>Lịch sử phân tích</strong><small>Xem lại các lần phân tích và mức khớp kỹ năng.</small></span>
          <span aria-hidden="true">→</span>
        </Link>
      </section>
      <p className="profile-privacy"><UserIcon size={16} /> Thông tin này chỉ hiển thị trong phiên đăng nhập của bạn.</p>
    </section>
  )
}
