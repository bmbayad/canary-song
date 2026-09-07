import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

interface Recording {
  recording_id: string
  bird_name: string
  leg_band_number: string
  bird_type_name: string
  uploaded_at: string
  expires_at: string
  is_expired: boolean
  total_judges: number
  completed_count: number
  unable_count: number
  aggregate_score: number | null
}

const MyEvaluationsPage: React.FC = () => {
  const { logout, apiClient } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRecordings()
  }, [])

  const loadRecordings = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/evaluations/results')
      setRecordings(response.data)
      setError(null)
    } catch (err: any) {
      console.error('Failed to load evaluations:', err)
      setError(err.response?.data?.detail || 'Failed to load evaluations')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (completed: number, unable: number, total: number) => {
    if (completed === 0 && unable === 0) {
      return { text: 'Pending', color: '#ffc107', bgColor: '#fff8e1' }
    }
    if (unable > 0 && completed + unable === total) {
      return { text: 'Complete (Some Unable)', color: '#ff9800', bgColor: '#fff3e0' }
    }
    if (completed === total) {
      return { text: 'Completed', color: '#28a745', bgColor: '#e8f5e9' }
    }
    if (completed + unable === total) {
      return { text: 'Completed', color: '#28a745', bgColor: '#e8f5e9' }
    }
    return { text: 'In Progress', color: '#007bff', bgColor: '#e3f2fd' }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <nav style={styles.nav}>
          <h1 style={styles.navTitle}>Canary Evaluation Platform</h1>
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
          <p>{t('common.loading')}</p>
        </main>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.navTitle}>Canary Evaluation Platform</h1>
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
        {error && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {recordings.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>📋</p>
            <h3>No Recordings Yet</h3>
            <p>Create a bird and upload recordings to see evaluation results here.</p>
            <button
              onClick={() => navigate('/my-birds')}
              style={styles.primaryButton}
            >
              Go to My Birds
            </button>
          </div>
        ) : (
          <div style={styles.recordingsList}>
            {recordings.map((recording) => {
              const status = getStatusBadge(
                recording.completed_count,
                recording.unable_count,
                recording.total_judges
              )
              const uploadDate = new Date(recording.uploaded_at)
              const expiresDate = new Date(recording.expires_at)
              const now = new Date()
              const hoursUntilExpiry = Math.max(
                0,
                Math.round((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60))
              )

              return (
                <div
                  key={recording.recording_id}
                  style={styles.recordingCard}
                  onClick={() =>
                    navigate(`/evaluations/${recording.recording_id}`)
                  }
                >
                  <div style={styles.recordingHeader}>
                    <div style={styles.recordingInfo}>
                      <h3 style={styles.birdName}>{recording.bird_name}</h3>
                      <p style={styles.details}>
                        Band: {recording.leg_band_number} • Type: {recording.bird_type_name}
                      </p>
                      <p style={styles.uploadDate}>
                        Uploaded: {uploadDate.toLocaleDateString()}
                      </p>
                    </div>
                    <div style={styles.statusSection}>
                      <div
                        style={{
                          ...styles.statusBadge,
                          color: status.color,
                          backgroundColor: status.bgColor,
                        }}
                      >
                        {status.text}
                      </div>
                    </div>
                  </div>

                  <div style={styles.scoringInfo}>
                    <div style={styles.scoreRow}>
                      <span>Evaluated by:</span>
                      <strong>{recording.completed_count + recording.unable_count} judge{recording.completed_count + recording.unable_count !== 1 ? 's' : ''}</strong>
                    </div>
                    {recording.aggregate_score !== null && (
                      <div style={styles.scoreRow}>
                        <span>Average Score:</span>
                        <strong>{recording.aggregate_score.toFixed(1)}</strong>
                      </div>
                    )}
                  </div>

                  <div style={styles.expiryInfo}>
                    {recording.is_expired ? (
                      <p style={styles.expiredText}>
                        ⚠️ Recording expired (media no longer available)
                      </p>
                    ) : (
                      <p style={styles.expiryText}>
                        Expires in {hoursUntilExpiry} hours
                      </p>
                    )}
                  </div>

                  <div style={styles.viewButton}>
                    View Details →
                  </div>
                </div>
              )
            })}
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
    backgroundColor: '#333',
    color: 'white',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  backButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  } as React.CSSProperties,
  main: {
    flex: 1,
    padding: '2rem',
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%',
  } as React.CSSProperties,
  errorBox: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
  } as React.CSSProperties,
  emptyState: {
    textAlign: 'center',
    backgroundColor: 'white',
    padding: '3rem',
    borderRadius: '8px',
  } as React.CSSProperties,
  emptyIcon: {
    fontSize: '3rem',
    margin: 0,
  } as React.CSSProperties,
  recordingsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  } as React.CSSProperties,
  recordingCard: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '1.5rem',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  } as React.CSSProperties,
  recordingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  } as React.CSSProperties,
  recordingInfo: {
    flex: 1,
  } as React.CSSProperties,
  birdName: {
    margin: '0 0 0.5rem 0',
    color: '#333',
    fontSize: '1.2rem',
  } as React.CSSProperties,
  details: {
    margin: '0.25rem 0',
    color: '#666',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  uploadDate: {
    margin: '0.5rem 0 0 0',
    color: '#999',
    fontSize: '0.85rem',
  } as React.CSSProperties,
  statusSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.5rem',
  } as React.CSSProperties,
  statusBadge: {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  scoringInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e0e0e0',
  } as React.CSSProperties,
  scoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  expiryInfo: {
    marginBottom: '1rem',
  } as React.CSSProperties,
  expiredText: {
    color: '#d32f2f',
    margin: 0,
    fontSize: '0.9rem',
  } as React.CSSProperties,
  expiryText: {
    color: '#1976d2',
    margin: 0,
    fontSize: '0.9rem',
  } as React.CSSProperties,
  viewButton: {
    color: '#007bff',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    marginTop: '0.5rem',
  } as React.CSSProperties,
  primaryButton: {
    marginTop: '1rem',
    padding: '0.75rem 2rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  } as React.CSSProperties,
}

export default MyEvaluationsPage
