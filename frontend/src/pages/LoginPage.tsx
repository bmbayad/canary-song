import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { login, isAuthenticated } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || t('auth.invalidCredentials'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Canary Evaluation Platform</h1>
        <h2 style={styles.subtitle}>{t('auth.login')}</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          <input
            type="email"
            placeholder={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />

          <input
            type="password"
            placeholder={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
          />

          <button type="submit" disabled={isLoading} style={styles.button}>
            {isLoading ? t('common.loading') : t('auth.loginButton')}
          </button>
        </form>

        <p style={styles.linkText}>
          {t('auth.noAccount')} <Link to="/register" style={styles.link}>Register</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
  } as React.CSSProperties,
  card: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px',
  } as React.CSSProperties,
  title: {
    textAlign: 'center',
    marginBottom: '1rem',
    color: '#333',
  } as React.CSSProperties,
  subtitle: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    color: '#666',
  } as React.CSSProperties,
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
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
  error: {
    color: '#d32f2f',
    padding: '0.75rem',
    backgroundColor: '#ffebee',
    borderRadius: '4px',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  linkText: {
    textAlign: 'center',
    marginTop: '1rem',
    color: '#666',
  } as React.CSSProperties,
  link: {
    color: '#007bff',
    textDecoration: 'none',
  } as React.CSSProperties,
}

export default LoginPage
