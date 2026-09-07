import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

const ProfilePage: React.FC = () => {
  const { user, logout, updateProfile } = useAuth()
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()

  const [firstName, setFirstName] = useState(user?.first_name || '')
  const [lastName, setLastName] = useState(user?.last_name || '')
  const [language, setLanguage] = useState(user?.preferred_language || 'en')
  const [timezone, setTimezone] = useState(user?.timezone || '')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage('')

    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        preferred_language: language,
        timezone: timezone,
      })
      localStorage.setItem('language', language)
      i18n.changeLanguage(language)
      setMessage('Profile updated successfully!')
    } catch (err) {
      setMessage('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.navTitle}>Canary Evaluation Platform</h1>
        <div style={styles.navRight}>
          <button onClick={() => navigate('/dashboard')} style={styles.navButton}>
            🏠 Home
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            {t('auth.logout')}
          </button>
        </div>
      </nav>

      <main style={styles.main}>
        <div style={styles.card}>
          <h2 style={styles.heading}>{t('nav.profile')}</h2>

          <form onSubmit={handleSubmit} style={styles.form}>
            {message && (
              <div style={{
                ...styles.message,
                backgroundColor: message.includes('successfully') ? '#d4edda' : '#f8d7da',
                color: message.includes('successfully') ? '#155724' : '#721c24',
              }}>
                {message}
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>{t('auth.email')}</label>
              <input type="email" value={user?.email} disabled style={styles.input} />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t('auth.firstName')}</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>{t('auth.lastName')}</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Language</label>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} style={styles.input}>
                <option value="en">English</option>
                <option value="ar">العربية</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Timezone</label>
              <input
                type="text"
                placeholder="e.g., UTC, America/New_York"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={isLoading} style={styles.button}>
              {isLoading ? t('common.loading') : t('common.save')}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  } as React.CSSProperties,
  nav: {
    backgroundColor: '#333',
    color: 'white',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  } as React.CSSProperties,
  navTitle: {
    margin: 0,
    fontSize: '1.5rem',
  } as React.CSSProperties,
  navRight: {
    display: 'flex',
    gap: '1rem',
  } as React.CSSProperties,
  navButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  } as React.CSSProperties,
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  } as React.CSSProperties,
  main: {
    flex: 1,
    padding: '2rem',
  } as React.CSSProperties,
  card: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    maxWidth: '600px',
  } as React.CSSProperties,
  heading: {
    marginTop: 0,
    color: '#333',
  } as React.CSSProperties,
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  } as React.CSSProperties,
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  } as React.CSSProperties,
  label: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#333',
  } as React.CSSProperties,
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
  } as React.CSSProperties,
  button: {
    padding: '0.75rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
  } as React.CSSProperties,
  message: {
    padding: '0.75rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
  } as React.CSSProperties,
}

export default ProfilePage
