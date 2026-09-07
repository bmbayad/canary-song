import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

interface EvaluationScore {
  id: string
  category_id: string
  category_name_snapshot: string
  minimum_points_snapshot: number
  maximum_points_snapshot: number
  score: number
}

interface Evaluation {
  id: string
  recording_id: string
  judge_id: string
  status: string
  total_score: number | null
  comments: string | null
  unable_to_evaluate_reason: string | null
  started_at: string
  submitted_at: string | null
  scores: EvaluationScore[]
}

const JudgeEvaluationHistoryPage: React.FC = () => {
  const { logout, apiClient } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  useEffect(() => {
    loadEvaluationHistory()
  }, [])

  const loadEvaluationHistory = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/evaluations')
      setEvaluations(response.data)
      setError(null)
    } catch (err: any) {
      console.error('Failed to load evaluation history:', err)
      setError(err.response?.data?.detail || 'Failed to load evaluation history')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Submitted':
        return { text: 'Completed', color: '#28a745', bgColor: '#e8f5e9' }
      case 'In Progress':
        return { text: 'In Progress', color: '#ffc107', bgColor: '#fff8e1' }
      case 'Unable to Evaluate':
        return { text: 'Unable', color: '#ff9800', bgColor: '#fff3e0' }
      default:
        return { text: status, color: '#666', bgColor: '#f5f5f5' }
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <nav style={{ ...styles.nav, backgroundColor: '#1a5490' }}>
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
          <p>{t('common.loading')}</p>
        </main>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <nav style={{ ...styles.nav, backgroundColor: '#1a5490' }}>
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
        {error && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {evaluations.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyIcon}>📋</p>
            <h3>No Evaluations Yet</h3>
            <p>Your evaluation history will appear here.</p>
            <button
              onClick={() => navigate('/judge-queue')}
              style={styles.primaryButton}
            >
              Go to Evaluation Queue
            </button>
          </div>
        ) : (
          <>
            <div style={styles.statsContainer}>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>
                  {evaluations.filter((e) => e.status === 'Submitted').length}
                </div>
                <div style={styles.statLabel}>Completed</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>
                  {evaluations.filter((e) => e.status === 'Unable to Evaluate').length}
                </div>
                <div style={styles.statLabel}>Unable to Evaluate</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>
                  {evaluations.filter((e) => e.status === 'In Progress').length}
                </div>
                <div style={styles.statLabel}>In Progress</div>
              </div>
              <div style={styles.statBox}>
                <div style={styles.statNumber}>{evaluations.length}</div>
                <div style={styles.statLabel}>Total</div>
              </div>
            </div>

            <div style={styles.evaluationsList}>
              {evaluations.map((evaluation) => {
                const status = getStatusBadge(evaluation.status)
                const startedDate = new Date(evaluation.started_at)
                const submittedDate = evaluation.submitted_at
                  ? new Date(evaluation.submitted_at)
                  : null

                return (
                  <div key={evaluation.id} style={styles.evaluationCard}>
                    <div style={styles.cardHeader}>
                      <div style={styles.cardInfo}>
                        <h3 style={styles.recordingId}>
                          Recording: {evaluation.recording_id.substring(0, 8)}...
                        </h3>
                        <p style={styles.dates}>
                          Started: {startedDate.toLocaleDateString()} at{' '}
                          {startedDate.toLocaleTimeString()}
                        </p>
                        {submittedDate && (
                          <p style={styles.dates}>
                            Submitted: {submittedDate.toLocaleDateString()} at{' '}
                            {submittedDate.toLocaleTimeString()}
                          </p>
                        )}
                      </div>
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

                    {evaluation.status === 'Submitted' && (
                      <div style={styles.scoreSection}>
                        <div style={styles.scoreRow}>
                          <span>Total Score:</span>
                          <strong style={styles.scoreValue}>
                            {evaluation.total_score}
                          </strong>
                        </div>

                        <div style={styles.categoriesGrid}>
                          {evaluation.scores.map((score) => (
                            <div key={score.id} style={styles.categoryItem}>
                              <div style={styles.categoryLabel}>
                                {score.category_name_snapshot}
                              </div>
                              <div style={styles.categoryScore}>
                                {score.score}/{score.maximum_points_snapshot}
                              </div>
                            </div>
                          ))}
                        </div>

                        {evaluation.comments && (
                          <div style={styles.commentsBox}>
                            <strong>Comments:</strong>
                            <p style={styles.commentsText}>{evaluation.comments}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {evaluation.status === 'Unable to Evaluate' && (
                      <div style={styles.unableBox}>
                        <strong>Reason:</strong>
                        <p style={styles.unableText}>
                          {evaluation.unable_to_evaluate_reason || 'No reason provided'}
                        </p>
                      </div>
                    )}

                    {evaluation.status === 'In Progress' && (
                      <div style={styles.inProgressBox}>
                        <p>Evaluation started but not yet submitted</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
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
    maxWidth: '1200px',
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
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  } as React.CSSProperties,
  statBox: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '1.5rem',
    textAlign: 'center',
  } as React.CSSProperties,
  statNumber: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1a5490',
    marginBottom: '0.5rem',
  } as React.CSSProperties,
  statLabel: {
    color: '#666',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  evaluationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  } as React.CSSProperties,
  evaluationCard: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '1.5rem',
  } as React.CSSProperties,
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e0e0e0',
  } as React.CSSProperties,
  cardInfo: {},
  recordingId: {
    margin: '0 0 0.5rem 0',
    color: '#333',
    fontSize: '1rem',
  } as React.CSSProperties,
  dates: {
    margin: '0.25rem 0',
    color: '#666',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  statusBadge: {
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    fontWeight: 'bold',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  scoreSection: {
    backgroundColor: '#f9f9f9',
    padding: '1rem',
    borderRadius: '4px',
  } as React.CSSProperties,
  scoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '1rem',
    fontSize: '1.1rem',
  } as React.CSSProperties,
  scoreValue: {
    color: '#1a5490',
    fontSize: '1.3rem',
  } as React.CSSProperties,
  categoriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '0.75rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
  categoryItem: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    padding: '0.75rem',
    textAlign: 'center',
  } as React.CSSProperties,
  categoryLabel: {
    fontSize: '0.85rem',
    color: '#666',
    marginBottom: '0.25rem',
  } as React.CSSProperties,
  categoryScore: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#333',
  } as React.CSSProperties,
  commentsBox: {
    backgroundColor: '#fffacd',
    border: '1px solid #ffc107',
    borderRadius: '4px',
    padding: '0.75rem',
    marginTop: '1rem',
  } as React.CSSProperties,
  commentsText: {
    margin: '0.5rem 0 0 0',
    color: '#555',
    fontSize: '0.9rem',
    lineHeight: '1.4',
  } as React.CSSProperties,
  unableBox: {
    backgroundColor: '#fff3e0',
    border: '1px solid #ff9800',
    borderRadius: '4px',
    padding: '1rem',
  } as React.CSSProperties,
  unableText: {
    margin: '0.5rem 0 0 0',
    color: '#e65100',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  inProgressBox: {
    backgroundColor: '#e3f2fd',
    border: '1px solid #2196f3',
    borderRadius: '4px',
    padding: '1rem',
  } as React.CSSProperties,
  primaryButton: {
    marginTop: '1rem',
    padding: '0.75rem 2rem',
    backgroundColor: '#1a5490',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  } as React.CSSProperties,
}

export default JudgeEvaluationHistoryPage
