import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

interface Bird {
  id: string
  name: string
  leg_band_number: string
  bird_type_id: string
  status: string
  created_at: string
}

interface BirdType {
  id: string
  name: string
}

const MyBirdsPage: React.FC = () => {
  const { logout, apiClient } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [birds, setBirds] = useState<Bird[]>([])
  const [birdTypes, setBirdTypes] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [recordingCounts, setRecordingCounts] = useState<Record<string, number>>({})
  const [archiveDialogBird, setArchiveDialogBird] = useState<Bird | null>(null)
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')

  useEffect(() => {
    loadBirds()
    loadBirdTypes()
    loadRecordingCounts()
  }, [])

  const loadBirdTypes = async () => {
    try {
      const response = await apiClient.get('/birds/types')
      const types: Record<string, string> = {}
      response.data.forEach((bt: BirdType) => {
        types[bt.id] = bt.name
      })
      setBirdTypes(types)
    } catch (error) {
      console.error('Error loading bird types:', error)
    }
  }

  const loadBirds = async () => {
    try {
      const response = await apiClient.get('/birds')
      setBirds(response.data)
    } catch (error: any) {
      setMessage('Failed to load birds')
    } finally {
      setIsLoading(false)
    }
  }

  const loadRecordingCounts = async () => {
    try {
      const response = await apiClient.get('/recordings')
      const recs = response.data.recordings || []
      const counts: Record<string, number> = {}
      recs.forEach((rec: any) => {
        counts[rec.bird_id] = (counts[rec.bird_id] || 0) + 1
      })
      setRecordingCounts(counts)
    } catch (error) {
      console.error('Error loading recording counts:', error)
    }
  }

  const handleDelete = async (birdId: string, birdName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${birdName}"? This bird has no recordings.`)) return

    try {
      await apiClient.delete(`/birds/${birdId}`)
      setMessage('Bird deleted successfully')
      loadBirds()
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || error.message || 'Failed to delete bird'
      setMessage(errorDetail)
    }
  }

  const handleArchive = async (bird: Bird) => {
    try {
      await apiClient.post(`/birds/${bird.id}/archive`)
      setMessage(`"${bird.name}" archived. It has been moved to Archived Birds section.`)
      setArchiveDialogBird(null)
      loadBirds()
    } catch (error: any) {
      const errorDetail = error.response?.data?.detail || error.message || 'Failed to archive bird'
      setMessage(errorDetail)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const activeBirds = birds.filter(b => b.status === 'Active')
  const archivedBirds = birds.filter(b => b.status === 'Archived')

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
          <h2 style={styles.heading}>My Birds</h2>
          <div style={styles.headerActions}>
            <div style={styles.viewToggle}>
              <button
                onClick={() => setViewMode('card')}
                style={{
                  ...styles.viewButton,
                  backgroundColor: viewMode === 'card' ? '#007bff' : '#e0e0e0',
                  color: viewMode === 'card' ? 'white' : '#333',
                }}
              >
                ▦ Card
              </button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  ...styles.viewButton,
                  backgroundColor: viewMode === 'list' ? '#007bff' : '#e0e0e0',
                  color: viewMode === 'list' ? 'white' : '#333',
                }}
              >
                ≡ List
              </button>
            </div>
            <Link to="/add-bird" style={styles.addButton}>
              ➕ Add Bird
            </Link>
          </div>
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

        {isLoading ? (
          <div>{t('common.loading')}</div>
        ) : (
          <>
            {/* Active Birds Section */}
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>Active Birds</h3>
              {activeBirds.length > 0 ? (
                <div style={{...styles.birdsList, ...(viewMode === 'list' ? styles.listLayout : {})}}>
                  {activeBirds.map(bird => {
                    const hasRecordings = (recordingCounts[bird.id] || 0) > 0
                    return viewMode === 'card' ? (
                      <div key={bird.id} style={styles.birdCard}>
                        <div style={styles.birdInfo}>
                          <h4 style={styles.birdName}>{bird.name}</h4>
                          <p style={styles.birdDetail}>
                            <strong>Band Number:</strong> {bird.leg_band_number}
                          </p>
                          <p style={styles.birdDetail}>
                            <strong>Type:</strong> {birdTypes[bird.bird_type_id] || 'Unknown'}
                          </p>
                          <p style={styles.birdDetail}>
                            <strong>Recordings:</strong> {recordingCounts[bird.id] || 0}
                          </p>
                        </div>
                        <div style={styles.birdActionsColumn}>
                          <button
                            onClick={() => navigate('/upload-recording', { state: { birdId: bird.id } })}
                            style={styles.uploadButton}
                          >
                            📹 Upload
                          </button>
                          {hasRecordings && (
                            <button
                              onClick={() => navigate(`/bird-recordings/${bird.id}`, { state: { birdName: bird.name } })}
                              style={styles.recordingsButton}
                            >
                              📺 Recordings
                            </button>
                          )}
                          {hasRecordings ? (
                            <button
                              onClick={() => setArchiveDialogBird(bird)}
                              style={styles.archiveButton}
                            >
                              Stop Judging
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDelete(bird.id, bird.name)}
                              style={styles.deleteButton}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div key={bird.id} style={styles.birdListItem}>
                        <div style={styles.birdListInfo}>
                          <h4 style={styles.birdListName}>{bird.name}</h4>
                          <p style={styles.birdListDetail}>{birdTypes[bird.bird_type_id] || 'Unknown'} • Band: {bird.leg_band_number} • {recordingCounts[bird.id] || 0} recording{(recordingCounts[bird.id] || 0) !== 1 ? 's' : ''}</p>
                        </div>
                        <div style={styles.birdListActions}>
                          <button
                            onClick={() => navigate('/upload-recording', { state: { birdId: bird.id } })}
                            style={styles.uploadButton}
                          >
                            📹 Upload
                          </button>
                          {hasRecordings && (
                            <button
                              onClick={() => navigate(`/bird-recordings/${bird.id}`, { state: { birdName: bird.name } })}
                              style={styles.recordingsButton}
                            >
                              📺 Recordings
                            </button>
                          )}
                          {hasRecordings ? (
                            <button
                              onClick={() => setArchiveDialogBird(bird)}
                              style={styles.archiveButton}
                            >
                              Stop Judging
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDelete(bird.id, bird.name)}
                              style={styles.deleteButton}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div style={styles.emptyState}>
                  <p>No active birds yet. <Link to="/add-bird">Create your first bird</Link></p>
                </div>
              )}
            </div>

            {/* Archived Birds Section */}
            {archivedBirds.length > 0 && (
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>Archived Birds</h3>
                <div style={{...styles.birdsList, ...(viewMode === 'list' ? styles.listLayout : {})}}>
                  {archivedBirds.map(bird => (
                    viewMode === 'card' ? (
                      <div key={bird.id} style={styles.birdCard}>
                        <div style={styles.birdInfo}>
                          <h4 style={styles.birdName}>{bird.name}</h4>
                          <p style={styles.birdDetail}>
                            <strong>Band Number:</strong> {bird.leg_band_number}
                          </p>
                          <p style={styles.birdDetail}>
                            <strong>Type:</strong> {birdTypes[bird.bird_type_id] || 'Unknown'}
                          </p>
                          <p style={styles.archivedNote}>📋 Archived - No new recordings can be uploaded</p>
                        </div>
                        {(recordingCounts[bird.id] || 0) > 0 && (
                          <div style={styles.birdActionsColumn}>
                            <button
                              onClick={() => navigate(`/bird-recordings/${bird.id}`, { state: { birdName: bird.name } })}
                              style={styles.recordingsButton}
                            >
                              📺 Recordings
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div key={bird.id} style={styles.birdListItem}>
                        <div style={styles.birdListInfo}>
                          <h4 style={styles.birdListName}>{bird.name}</h4>
                          <p style={{...styles.birdListDetail, color: '#ff9800'}}>
                            {birdTypes[bird.bird_type_id] || 'Unknown'} • Band: {bird.leg_band_number} • {recordingCounts[bird.id] || 0} recording{(recordingCounts[bird.id] || 0) !== 1 ? 's' : ''} • Archived
                          </p>
                        </div>
                        {(recordingCounts[bird.id] || 0) > 0 && (
                          <div style={styles.birdListActions}>
                            <button
                              onClick={() => navigate(`/bird-recordings/${bird.id}`, { state: { birdName: bird.name } })}
                              style={styles.recordingsButton}
                            >
                              📺 Recordings
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Archive Confirmation Dialog */}
      {archiveDialogBird && (
        <div style={styles.dialog}>
          <div style={styles.dialogContent}>
            <h3 style={styles.dialogTitle}>Stop Judging "{archiveDialogBird.name}"?</h3>
            <div style={styles.dialogMessage}>
              <p><strong>When you archive this bird:</strong></p>
              <ul>
                <li>✓ It moves to "Archived Birds" section</li>
                <li>✓ No new recordings can be uploaded</li>
                <li>✓ All evaluation history is preserved</li>
                <li>✓ You can still view evaluation results</li>
              </ul>
            </div>
            <div style={styles.dialogButtons}>
              <button
                onClick={() => setArchiveDialogBird(null)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={() => handleArchive(archiveDialogBird)}
                style={styles.confirmButton}
              >
                Stop Judging
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f5f5f5' } as React.CSSProperties,
  nav: { backgroundColor: '#333', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' } as React.CSSProperties,
  navTitle: { margin: 0, fontSize: '1.5rem' } as React.CSSProperties,
  navRight: { display: 'flex', gap: '1rem' } as React.CSSProperties,
  navButton: { padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' } as React.CSSProperties,
  logoutButton: { padding: '0.5rem 1rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' } as React.CSSProperties,
  main: { flex: 1, padding: '2rem' } as React.CSSProperties,
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' } as React.CSSProperties,
  heading: { marginTop: 0, color: '#333' } as React.CSSProperties,
  headerActions: { display: 'flex', gap: '1rem', alignItems: 'center' } as React.CSSProperties,
  viewToggle: { display: 'flex', gap: '0.5rem' } as React.CSSProperties,
  viewButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#e0e0e0',
    color: '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    transition: 'all 0.2s',
  } as React.CSSProperties,
  addButton: { padding: '0.5rem 1rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', textDecoration: 'none', cursor: 'pointer', display: 'inline-block' } as React.CSSProperties,
  message: { padding: '1rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' } as React.CSSProperties,
  section: { marginBottom: '2rem' } as React.CSSProperties,
  sectionTitle: { color: '#333', fontSize: '1.1rem', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #007bff' } as React.CSSProperties,
  birdsList: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' } as React.CSSProperties,
  listLayout: { gridTemplateColumns: '1fr', gap: '0.5rem' } as React.CSSProperties,
  birdCard: { backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', display: 'flex', gap: '1rem', alignItems: 'flex-start' } as React.CSSProperties,
  cardActionsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' } as React.CSSProperties,
  cardActionsLeft: { display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 } as React.CSSProperties,
  cardActionsRight: { display: 'flex', alignItems: 'center' } as React.CSSProperties,
  birdActionsColumn: { display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '20%', minWidth: '120px', flexShrink: 0 } as React.CSSProperties,
  birdListItem: { backgroundColor: 'white', padding: '1rem', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '4px solid #007bff' } as React.CSSProperties,
  birdInfo: { flex: 1 } as React.CSSProperties,
  birdListInfo: { flex: 1 } as React.CSSProperties,
  birdName: { margin: '0 0 0.5rem 0', color: '#333' } as React.CSSProperties,
  birdListName: { margin: 0, color: '#333', fontSize: '1rem' } as React.CSSProperties,
  birdDetail: { margin: '0.3rem 0', color: '#666', fontSize: '0.9rem' } as React.CSSProperties,
  birdListDetail: { margin: '0.25rem 0', color: '#666', fontSize: '0.85rem' } as React.CSSProperties,
  archivedNote: { margin: '0.5rem 0 0 0', color: '#ff9800', fontSize: '0.9rem', fontWeight: 'bold' } as React.CSSProperties,
  birdActions: { display: 'flex', gap: '0.5rem', marginLeft: '1rem' } as React.CSSProperties,
  birdListActions: { display: 'flex', gap: '0.5rem', marginLeft: '1rem', flexShrink: 0 } as React.CSSProperties,
  uploadButton: { padding: '0.5rem 0.75rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', width: '100%', textAlign: 'center' } as React.CSSProperties,
  recordingsButton: { padding: '0.5rem 0.75rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', width: '100%', textAlign: 'center' } as React.CSSProperties,
  archiveButton: { padding: '0.5rem 0.75rem', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', width: '100%', textAlign: 'center' } as React.CSSProperties,
  deleteButton: { padding: '0.5rem 0.75rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', width: '100%', textAlign: 'center' } as React.CSSProperties,
  emptyState: { backgroundColor: 'white', padding: '2rem', borderRadius: '8px', textAlign: 'center', color: '#666' } as React.CSSProperties,
  dialog: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 } as React.CSSProperties,
  dialogContent: { backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' } as React.CSSProperties,
  dialogTitle: { margin: '0 0 1rem 0', color: '#333' } as React.CSSProperties,
  dialogMessage: { color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.6' } as React.CSSProperties,
  dialogButtons: { display: 'flex', gap: '1rem', justifyContent: 'flex-end' } as React.CSSProperties,
  cancelButton: { padding: '0.5rem 1rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' } as React.CSSProperties,
  confirmButton: { padding: '0.5rem 1rem', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' } as React.CSSProperties,
}

export default MyBirdsPage
