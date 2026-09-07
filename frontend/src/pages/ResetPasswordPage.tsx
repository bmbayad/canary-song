import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const ResetPasswordPage: React.FC = () => {
  const { apiClient, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')

    if (!oldPassword || !newPassword || !confirmPassword) {
      setMessage('All fields are required')
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setMessage('New password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      await apiClient.post('/auth/reset-password', {
        old_password: oldPassword,
        new_password: newPassword,
      })
      setMessage('Password reset successfully! Redirecting...')
      await refreshUser()
      setTimeout(() => {
        navigate('/dashboard')
      }, 500)
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || error.message || 'Failed to reset password'
      setMessage(errorDetail)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Reset Your Password</h1>
        <p style={styles.subtitle}>This is your first login. Please set a new password.</p>

        <form onSubmit={handleResetPassword} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Current Password (Temporary):</label>
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              style={styles.input}
              placeholder="TempPassword123!"
              disabled={isLoading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>New Password:</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={styles.input}
              placeholder="Enter new password (min 8 characters)"
              disabled={isLoading}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Confirm New Password:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={styles.input}
              placeholder="Confirm new password"
              disabled={isLoading}
            />
          </div>

          {message && (
            <div style={{
              ...styles.message,
              backgroundColor: message.includes('success') || message.includes('successfully') ? '#d4edda' : '#f8d7da',
              color: message.includes('success') || message.includes('successfully') ? '#155724' : '#721c24',
            }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            style={styles.button}
            disabled={isLoading}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 0,
    marginBottom: '0.5rem',
    color: '#333',
    fontSize: '1.5rem',
  } as React.CSSProperties,
  subtitle: {
    color: '#666',
    fontSize: '0.9rem',
    marginBottom: '2rem',
  } as React.CSSProperties,
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  } as React.CSSProperties,
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,
  label: {
    marginBottom: '0.5rem',
    fontWeight: 'bold',
    color: '#333',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    fontFamily: 'Arial, sans-serif',
  } as React.CSSProperties,
  button: {
    padding: '0.75rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '1rem',
  } as React.CSSProperties,
  message: {
    padding: '0.75rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
    textAlign: 'center',
  } as React.CSSProperties,
}

export default ResetPasswordPage
