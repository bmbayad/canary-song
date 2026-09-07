import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

interface Recording {
  id: string
  bird_name: string
  leg_band_number: string
  bird_type_name: string
  original_filename: string
  uploaded_at: string
  expires_at: string
}

const JudgeQueuePage: React.FC = () => {
  const { user, logout, apiClient } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [recordings, setRecordings] = useState<Recording[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadQueue()
  }, [])

  const loadQueue = async () => {
    try {
      const response = await apiClient.get('/evaluations/queue')
      setRecordings(response.data.available_recordings || [])
    } catch (err: any) {
      setError('Failed to load evaluation queue')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectRecording = async (recordingId: string) => {
    try {
      const response = await apiClient.post(`/evaluations/${recordingId}/start`)
      navigate(`/score-entry/${response.data.evaluation_id}`, {
        state: { recordingId, scoringConfiguration: response.data.scoring_configuration }
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start evaluation')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getDaysUntilExpiry = (expiresAt: string): number => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  if (isLoading) {
    return <div style={styles.loading}>{t('common.loading')}</div>
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.navTitle}>Canary Evaluation Platform - Judge</h1>
        <div style={styles.navRight}>
          <button onClick={() => navigate('/dashboard')} style={styles.navButton}>
            🏠 Home
          </button>
          <button onClick={() => navigate('/profile')} style={styles.navButton}>
            {t('nav.profile')}
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            {t('auth.logout')}
          </button>
        </div>
      </nav>

      <main style={styles.main}>
        <div style={styles.header}>
          <h2 style={styles.heading}>Evaluation Queue</h2>
          <p style={styles.subtitle}>
            {recordings.length} recording{recordings.length !== 1 ? 's' : ''} available for evaluation
          </p>
        </div>

        {error && (
          <div style={{...styles.message, backgroundColor: '#f8d7da', color: '#721c24'}}>
            {error}
          </div>
        )}

        {recordings.length > 0 ? (
          <div style={styles.recordingsList}>
            {recordings.map(recording => {
              const daysLeft = getDaysUntilExpiry(recording.expires_at)
              return (
                <div key={recording.id} style={styles.recordingCard}>
                  <div style={styles.recordingInfo}>
                    <h3 style={styles.recordingTitle}>{recording.bird_name}</h3>
                    <p style={styles.recordingDetail}>
                      <strong>Band Number:</strong> {recording.leg_band_number}
                    </p>
                    <p style={styles.recordingDetail}>
                      <strong>Bird Type:</strong> {recording.bird_type_name}
                    </p>
                    <p style={styles.recordingDetail}>
                      <strong>File:</strong> {recording.original_filename}
                    </p>
                    <p style={styles.recordingDetail}>
                      <strong>Uploaded:</strong> {new Date(recording.uploaded_at).toLocaleDateString()}
                    </p>
                    <p style={{
                      ...styles.recordingDetail,
                      color: daysLeft <= 3 ? '#d32f2f' : '#666',
                      fontWeight: daysLeft <= 3 ? 'bold' : 'normal'
                    }}>
                      ⏰ Expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSelectRecording(recording.id)}
                    style={styles.selectButton}
                  >
                    Evaluate →
                  </button>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>No recordings available for evaluation at this time.</p>
            <p>Check back later for new recordings in the queue.</p>
          </div>
        )}
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
    backgroundColor: '#1a5490',
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
  header: {
    marginBottom: '2rem',
  } as React.CSSProperties,
  heading: {
    marginTop: 0,
    color: '#333',
    fontSize: '2rem',
  } as React.CSSProperties,
  subtitle: {
    color: '#666',
    margin: '0.5rem 0 0 0',
  } as React.CSSProperties,
  message: {
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  recordingsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '1.5rem',
  } as React.CSSProperties,
  recordingCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    flexDirection: 'column',
  } as React.CSSProperties,
  recordingInfo: {
    flex: 1,
    marginBottom: '1rem',
  } as React.CSSProperties,
  recordingTitle: {
    margin: '0 0 0.5rem 0',
    color: '#333',
    fontSize: '1.1rem',
  } as React.CSSProperties,
  recordingDetail: {
    margin: '0.3rem 0',
    color: '#666',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  selectButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#1a5490',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    fontWeight: 'bold',
  } as React.CSSProperties,
  emptyState: {
    backgroundColor: 'white',
    padding: '3rem 2rem',
    borderRadius: '8px',
    textAlign: 'center',
    color: '#666',
  } as React.CSSProperties,
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontSize: '1.2rem',
    color: '#666',
  } as React.CSSProperties,
}

export default JudgeQueuePage
