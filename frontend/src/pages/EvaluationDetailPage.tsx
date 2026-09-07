import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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

interface JudgeEvaluation {
  id: string
  judge_id: string
  status: string
  total_score: number | null
  comments: string | null
  unable_to_evaluate_reason: string | null
  submitted_at: string | null
  scores: EvaluationScore[]
}

interface EvaluationDetail {
  recording_id: string
  bird_name: string
  leg_band_number: string
  bird_type_name: string
  original_filename: string
  uploaded_at: string
  expires_at: string
  is_expired: boolean
  aggregate_score: number | null
  total_judges: number
  evaluations: JudgeEvaluation[]
}

const EvaluationDetailPage: React.FC = () => {
  const { recordingId } = useParams<{ recordingId: string }>()
  const { apiClient } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [detail, setDetail] = useState<EvaluationDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadEvaluationDetail()
  }, [recordingId])

  const loadEvaluationDetail = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get(
        `/evaluations/recordings/${recordingId}/results`
      )
      setDetail(response.data)
      setError(null)
    } catch (err: any) {
      console.error('Failed to load evaluation detail:', err)
      setError(
        err.response?.data?.detail || 'Failed to load evaluation results'
      )
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <nav style={styles.nav}>
          <h1 style={styles.navTitle}>Evaluation Results</h1>
          <button onClick={() => navigate('/my-evaluations')} style={styles.backButton}>
            ← Back
          </button>
        </nav>
        <main style={styles.main}>
          <p>{t('common.loading')}</p>
        </main>
      </div>
    )
  }

  if (error || !detail) {
    return (
      <div style={styles.container}>
        <nav style={styles.nav}>
          <h1 style={styles.navTitle}>Evaluation Results</h1>
          <button onClick={() => navigate('/my-evaluations')} style={styles.backButton}>
            ← Back
          </button>
        </nav>
        <main style={styles.main}>
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        </main>
      </div>
    )
  }

  const uploadDate = new Date(detail.uploaded_at)
  const expiresDate = new Date(detail.expires_at)
  const now = new Date()
  const hoursUntilExpiry = Math.max(
    0,
    Math.round((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60))
  )

  const submittedEvals = detail.evaluations.filter(
    (e) => e.status === 'Submitted'
  )
  const unableEvals = detail.evaluations.filter(
    (e) => e.status === 'Unable to Evaluate'
  )
  const pendingCount = detail.total_judges - submittedEvals.length - unableEvals.length

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.navTitle}>Evaluation Results</h1>
        <button onClick={() => navigate('/my-evaluations')} style={styles.backButton}>
          ← Back
        </button>
      </nav>

      <main style={styles.main}>
        {/* Recording Header */}
        <div style={styles.headerCard}>
          <div style={styles.headerContent}>
            <h2 style={styles.heading}>{detail.bird_name}</h2>
            <p style={styles.subtext}>
              Band: {detail.leg_band_number} • Type: {detail.bird_type_name}
            </p>
            <p style={styles.filename}>{detail.original_filename}</p>
          </div>

          <div style={styles.summaryBox}>
            <div style={styles.summaryRow}>
              <span>Uploaded:</span>
              <strong>{uploadDate.toLocaleDateString()}</strong>
            </div>
            {detail.is_expired ? (
              <div style={styles.summaryRow}>
                <span>Status:</span>
                <strong style={{ color: '#d32f2f' }}>Expired</strong>
              </div>
            ) : (
              <div style={styles.summaryRow}>
                <span>Expires in:</span>
                <strong>{hoursUntilExpiry} hours</strong>
              </div>
            )}
          </div>
        </div>

        {/* Aggregate Score */}
        {detail.aggregate_score !== null && (
          <div style={styles.aggregateCard}>
            <h3 style={styles.aggregateTitle}>Average Score</h3>
            <div style={styles.aggregateScore}>
              {detail.aggregate_score.toFixed(1)}
            </div>
            <p style={styles.aggregateSubtext}>
              Based on {submittedEvals.length} completed evaluation
              {submittedEvals.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Evaluation Status Summary */}
        <div style={styles.statusSummary}>
          <div style={styles.statusItem}>
            <div style={styles.statusCount}>{submittedEvals.length}</div>
            <div style={styles.statusLabel}>Completed</div>
          </div>
          <div style={styles.statusItem}>
            <div style={styles.statusCount}>{unableEvals.length}</div>
            <div style={styles.statusLabel}>Unable to Evaluate</div>
          </div>
        </div>

        {/* Judge Evaluations */}
        {submittedEvals.length > 0 && (
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Judge Evaluations</h3>
            <div style={styles.evaluationsList}>
              {submittedEvals.map((evaluation, idx) => (
                <div key={evaluation.id} style={styles.evaluationCard}>
                  <div style={styles.evaluationHeader}>
                    <h4 style={styles.evaluationTitle}>
                      Evaluation {idx + 1}
                    </h4>
                    <div style={styles.evaluationMeta}>
                      <span style={styles.score}>
                        Score: {evaluation.total_score}
                      </span>
                      <span style={styles.date}>
                        {evaluation.submitted_at
                          ? new Date(evaluation.submitted_at).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Scores Grid */}
                  <div style={styles.categoriesGrid}>
                    {evaluation.scores.map((score) => (
                      <div key={score.id} style={styles.categoryCard}>
                        <div style={styles.categoryName}>
                          {score.category_name_snapshot}
                        </div>
                        <div style={styles.scoreDisplay}>
                          <span style={styles.scoreValue}>{score.score}</span>
                          <span style={styles.scoreRange}>
                            / {score.maximum_points_snapshot}
                          </span>
                        </div>
                        <div style={styles.scoreBar}>
                          <div
                            style={{
                              ...styles.scoreBarFill,
                              width: `${(score.score / score.maximum_points_snapshot) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Comments */}
                  {evaluation.comments && (
                    <div style={styles.commentsBox}>
                      <h5 style={styles.commentsTitle}>Comments</h5>
                      <p style={styles.commentsText}>{evaluation.comments}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Unable to Evaluate */}
        {unableEvals.length > 0 && (
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>Unable to Evaluate</h3>
            <div style={styles.evaluationsList}>
              {unableEvals.map((evaluation) => (
                <div key={evaluation.id} style={styles.unableCard}>
                  <div style={styles.unableReason}>
                    <strong>Reason:</strong>{' '}
                    {evaluation.unable_to_evaluate_reason ||
                      'No reason provided'}
                  </div>
                  <div style={styles.unableDate}>
                    {evaluation.submitted_at
                      ? new Date(evaluation.submitted_at).toLocaleDateString()
                      : 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          </section>
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
  } as React.CSSProperties,
  headerCard: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '2rem',
    marginBottom: '2rem',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
    alignItems: 'start',
  } as React.CSSProperties,
  headerContent: {},
  heading: {
    margin: '0 0 0.5rem 0',
    color: '#333',
    fontSize: '1.8rem',
  } as React.CSSProperties,
  subtext: {
    margin: '0.25rem 0',
    color: '#666',
  } as React.CSSProperties,
  filename: {
    margin: '0.5rem 0 0 0',
    color: '#999',
    fontSize: '0.85rem',
    fontStyle: 'italic',
  } as React.CSSProperties,
  summaryBox: {
    backgroundColor: '#f5f5f5',
    padding: '1rem',
    borderRadius: '4px',
  } as React.CSSProperties,
  summaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.75rem',
    fontSize: '0.95rem',
  } as React.CSSProperties,
  aggregateCard: {
    backgroundColor: '#e3f2fd',
    border: '2px solid #2196f3',
    borderRadius: '8px',
    padding: '2rem',
    textAlign: 'center',
    marginBottom: '2rem',
  } as React.CSSProperties,
  aggregateTitle: {
    margin: '0 0 1rem 0',
    color: '#1976d2',
    fontSize: '1.1rem',
  } as React.CSSProperties,
  aggregateScore: {
    fontSize: '3rem',
    fontWeight: 'bold',
    color: '#1976d2',
    margin: '0 0 0.5rem 0',
  } as React.CSSProperties,
  aggregateSubtext: {
    margin: 0,
    color: '#1565c0',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  statusSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
    marginBottom: '2rem',
  } as React.CSSProperties,
  statusItem: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '1.5rem',
    textAlign: 'center',
  } as React.CSSProperties,
  statusCount: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#007bff',
    marginBottom: '0.5rem',
  } as React.CSSProperties,
  statusLabel: {
    color: '#666',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  section: {
    marginBottom: '2rem',
  } as React.CSSProperties,
  sectionTitle: {
    color: '#333',
    fontSize: '1.3rem',
    marginBottom: '1rem',
    marginTop: 0,
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
  evaluationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
    paddingBottom: '1rem',
    borderBottom: '1px solid #e0e0e0',
  } as React.CSSProperties,
  evaluationTitle: {
    margin: 0,
    color: '#333',
  } as React.CSSProperties,
  evaluationMeta: {
    display: 'flex',
    gap: '1rem',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  score: {
    fontWeight: 'bold',
    color: '#1976d2',
  } as React.CSSProperties,
  date: {
    color: '#999',
  } as React.CSSProperties,
  categoriesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '1.5rem',
  } as React.CSSProperties,
  categoryCard: {
    backgroundColor: '#f9f9f9',
    border: '1px solid #e0e0e0',
    borderRadius: '6px',
    padding: '1rem',
  } as React.CSSProperties,
  categoryName: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '0.5rem',
  } as React.CSSProperties,
  scoreDisplay: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.25rem',
    marginBottom: '0.5rem',
  } as React.CSSProperties,
  scoreValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#1976d2',
  } as React.CSSProperties,
  scoreRange: {
    fontSize: '0.85rem',
    color: '#999',
  } as React.CSSProperties,
  scoreBar: {
    height: '6px',
    backgroundColor: '#e0e0e0',
    borderRadius: '3px',
    overflow: 'hidden',
  } as React.CSSProperties,
  scoreBarFill: {
    height: '100%',
    backgroundColor: '#4caf50',
    transition: 'width 0.3s ease',
  } as React.CSSProperties,
  commentsBox: {
    backgroundColor: '#fffacd',
    border: '1px solid #ffc107',
    borderRadius: '4px',
    padding: '1rem',
    marginTop: '1rem',
  } as React.CSSProperties,
  commentsTitle: {
    margin: '0 0 0.5rem 0',
    color: '#333',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  commentsText: {
    margin: 0,
    color: '#555',
    lineHeight: '1.5',
  } as React.CSSProperties,
  unableCard: {
    backgroundColor: '#fff3e0',
    border: '1px solid #ff9800',
    borderRadius: '8px',
    padding: '1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
  unableReason: {
    color: '#e65100',
  } as React.CSSProperties,
  unableDate: {
    color: '#999',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  infoBox: {
    backgroundColor: '#e3f2fd',
    border: '1px solid #2196f3',
    borderRadius: '4px',
    padding: '1rem',
    marginTop: '2rem',
  } as React.CSSProperties,
}

export default EvaluationDetailPage
