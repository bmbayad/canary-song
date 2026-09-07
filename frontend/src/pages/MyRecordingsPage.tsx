import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

interface Recording {
  id: string
  bird_id: string
  bird_type_id: string
  media_type: string
  original_filename: string
  file_size: number
  duration: number
  uploaded_at: string
  expires_at: string
  status: string
}

interface Bird {
  id: string
  name: string
  leg_band_number: string
}

const MyRecordingsPage: React.FC = () => {
  const { user, logout, apiClient } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [recordings, setRecordings] = useState<Recording[]>([])
  const [birds, setBirds] = useState<Record<string, Bird>>({})
  const [evaluationStatus, setEvaluationStatus] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadRecordings()
    loadBirds()
  }, [])

  const loadEvaluationStatus = async (recordingIds: string[]) => {
    try {
      const response = await apiClient.get('/evaluations/results')
      const statusMap: Record<string, any> = {}
      response.data.forEach((item: any) => {
        statusMap[item.recording_id] = {
          total_judges: item.total_judges,
          completed_count: item.completed_count,
          unable_count: item.unable_count,
          aggregate_score: item.aggregate_score,
          is_expired: item.is_expired,
        }
      })
      setEvaluationStatus(statusMap)
    } catch (error) {
      console.error('Error loading evaluation status:', error)
    }
  }

  const loadBirds = async () => {
    try {
      const response = await apiClient.get('/birds')
      const birdsMap: Record<string, Bird> = {}
      response.data.forEach((b: Bird) => {
        birdsMap[b.id] = b
      })
      setBirds(birdsMap)
    } catch (error) {
      console.error('Error loading birds:', error)
    }
  }

  const loadRecordings = async () => {
    try {
      const response = await apiClient.get('/recordings')
      const recs = response.data.recordings || []
      setRecordings(recs)
      if (recs.length > 0) {
        await loadEvaluationStatus(recs.map((r: Recording) => r.id))
      }
    } catch (error: any) {
      setMessage('Failed to load recordings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleDeleteRecording = async (recordingId: string) => {
    if (!window.confirm('Delete this recording? This will also delete the media file from storage. (Evaluated recordings cannot be deleted.)')) return

    try {
      await apiClient.delete(`/recordings/${recordingId}`)
      setMessage('Recording deleted successfully')
      loadRecordings()
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || error.message || 'Failed to delete recording'
      setMessage(errorDetail)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return '#28a745'
      case 'Pending':
        return '#ffc107'
      case 'In Progress':
        return '#007bff'
      case 'Expired':
        return '#999'
      default:
        return '#666'
    }
  }

  const getEvaluationStatusText = (recordingId: string): { text: string; color: string } => {
    const status = evaluationStatus[recordingId]
    if (!status) return { text: 'No evaluations', color: '#999' }

    const { total_judges, completed_count, unable_count } = status
    if (completed_count === 0 && unable_count === 0) {
      return { text: `Pending (0/${total_judges})`, color: '#ffc107' }
    }
    if (completed_count === total_judges) {
      return { text: `Completed (${total_judges}/${total_judges})`, color: '#28a745' }
    }
    if (completed_count + unable_count === total_judges) {
      return { text: `Completed (${completed_count}/${total_judges})`, color: '#28a745' }
    }
    return { text: `In Progress (${completed_count}/${total_judges})`, color: '#007bff' }
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
        <div style={styles.header}>
          <h2 style={styles.heading}>My Recordings</h2>
        </div>

        {message && (
          <div style={{
            ...styles.message,
            backgroundColor: message.includes('Failed') ? '#f8d7da' : '#d4edda',
            color: message.includes('Failed') ? '#721c24' : '#155724',
          }}>
            {message}
          </div>
        )}

        {recordings.length > 0 ? (
          <div style={styles.recordingsList}>
            {recordings.map(recording => {
              const bird = birds[recording.bird_id]
              const daysLeft = getDaysUntilExpiry(recording.expires_at)
              const isExpired = daysLeft <= 0

              return (
                <div key={recording.id} style={styles.recordingCard}>
                  <div style={styles.recordingInfo}>
                    <h4 style={styles.recordingTitle}>
                      {bird?.name || 'Unknown Bird'} - {recording.original_filename}
                    </h4>
                    <p style={styles.recordingDetail}>
                      <strong>Band Number:</strong> {bird?.leg_band_number || 'N/A'}
                    </p>
                    <p style={styles.recordingDetail}>
                      <strong>File:</strong> {formatFileSize(recording.file_size)} • {formatDuration(recording.duration)}
                    </p>
                    <p style={styles.recordingDetail}>
                      <strong>Uploaded:</strong> {new Date(recording.uploaded_at).toLocaleDateString()}
                    </p>
                    <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                      <div style={{
                        ...styles.statusBadge,
                        backgroundColor: getStatusColor(recording.status),
                        opacity: isExpired ? 0.6 : 1
                      }}>
                        {recording.status}
                      </div>
                      <p style={{
                        margin: 0,
                        fontSize: '0.9rem',
                        color: daysLeft <= 3 ? '#d32f2f' : '#666',
                        fontWeight: daysLeft <= 3 ? 'bold' : 'normal'
                      }}>
                        {isExpired ? '⏰ Expired' : `⏰ Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                      </p>
                    </div>

                    <div style={{marginTop: '1rem', borderTop: '1px solid #e0e0e0', paddingTop: '1rem'}}>
                      <p style={{...styles.recordingDetail, marginBottom: '0.5rem'}}>
                        <strong>📊 Evaluations:</strong>
                      </p>
                      <div style={{display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between'}}>
                        <div style={{
                          ...styles.statusBadge,
                          backgroundColor: getEvaluationStatusText(recording.id).color
                        }}>
                          {getEvaluationStatusText(recording.id).text}
                        </div>
                        <div style={{display: 'flex', gap: '0.5rem'}}>
                          <button
                            onClick={() => navigate(`/evaluations/${recording.id}`)}
                            style={styles.detailsButton}
                          >
                            View Details →
                          </button>
                          <button
                            onClick={() => handleDeleteRecording(recording.id)}
                            style={styles.deleteButton}
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div style={styles.emptyState}>
            <p>No recordings yet. <Link to="/upload-recording">Upload your first recording</Link></p>
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    position: 'relative',
    zIndex: 10,
  } as React.CSSProperties,
  heading: {
    marginTop: 0,
    color: '#333',
  } as React.CSSProperties,
  uploadButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    textDecoration: 'none',
    cursor: 'pointer',
    display: 'inline-block',
  } as React.CSSProperties,
  message: {
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  recordingsList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
  } as React.CSSProperties,
  recordingCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  } as React.CSSProperties,
  recordingInfo: {
    flex: 1,
  } as React.CSSProperties,
  recordingTitle: {
    margin: '0 0 0.5rem 0',
    color: '#333',
    fontSize: '1rem',
    wordBreak: 'break-word',
  } as React.CSSProperties,
  recordingDetail: {
    margin: '0.3rem 0',
    color: '#666',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  statusBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    color: 'white',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  } as React.CSSProperties,
  detailsButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  deleteButton: {
    padding: '0.4rem 0.8rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  emptyState: {
    backgroundColor: 'white',
    padding: '2rem',
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

export default MyRecordingsPage
