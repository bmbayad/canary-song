import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

interface ScoringCategory {
  id: string
  name: string
  description: string
  minimum_points: number
  maximum_points: number
  display_order: number
}

interface ScoringConfiguration {
  id: string
  name: string
  description: string
  categories: ScoringCategory[]
}

const ScoreEntryPage: React.FC = () => {
  const { evaluationId } = useParams<{ evaluationId: string }>()
  const location = useLocation()
  const { apiClient } = useAuth()
  const navigate = useNavigate()

  const [scores, setScores] = useState<Record<string, number>>({})
  const [comments, setComments] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [unableReason, setUnableReason] = useState('')
  const [showUnableDialog, setShowUnableDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadedConfig, setLoadedConfig] = useState<ScoringConfiguration | null>(null)

  const scoringConfiguration: ScoringConfiguration = location.state?.scoringConfiguration || loadedConfig
  const videoUrl: string | undefined = location.state?.videoUrl

  useEffect(() => {
    const loadEvaluationData = async () => {
      if (!location.state?.scoringConfiguration && evaluationId) {
        try {
          // Fetch the evaluation to get the recording ID
          const evalResponse = await apiClient.get(`/evaluations/${evaluationId}`)
          const evaluation = evalResponse.data

          if (!evaluation || !evaluation.recording_id) {
            throw new Error('Could not find recording for this evaluation')
          }

          setComments(evaluation.comments || '')

          // The scoring configuration was stored when the evaluation was started
          // We need to fetch it based on the recording's bird type
          // For now, let's try to re-start the evaluation to get the config
          // This won't create a duplicate because we already have an evaluation
          try {
            const startResponse = await apiClient.post(`/evaluations/${evaluation.recording_id}/start`)
            if (startResponse.data.scoring_configuration) {
              setLoadedConfig(startResponse.data.scoring_configuration)
            }
          } catch (startErr) {
            // If start fails, it's OK - we're resuming, not starting
            setError('Could not load scoring configuration')
          }
        } catch (err: any) {
          console.error('Failed to load evaluation:', err)
          setError(err.response?.data?.detail || 'Failed to load evaluation')
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    }
    loadEvaluationData()
  }, [evaluationId, location.state?.scoringConfiguration, apiClient])

  useEffect(() => {
    if (scoringConfiguration?.categories) {
      const initialScores: Record<string, number> = {}
      scoringConfiguration.categories.forEach(cat => {
        initialScores[cat.id] = Math.ceil((cat.minimum_points + cat.maximum_points) / 2)
      })
      setScores(initialScores)
    }
  }, [scoringConfiguration])

  const handleScoreChange = (categoryId: string, value: number) => {
    setScores(prev => ({
      ...prev,
      [categoryId]: value
    }))
  }

  const calculateTotalScore = (): number => {
    return Object.values(scores).reduce((sum, score) => sum + (score || 0), 0)
  }

  const handleSubmit = async () => {
    if (!evaluationId) return

    setError('')
    setMessage('')
    setIsSubmitting(true)

    try {
      await apiClient.post(`/evaluations/${evaluationId}/submit`, {
        scores,
        comments: comments || undefined,
      })

      setMessage('Evaluation submitted successfully!')
      setTimeout(() => {
        navigate('/judge-queue')
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit evaluation')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUnableToEvaluate = async () => {
    if (!unableReason.trim()) {
      setError('Please provide a reason')
      return
    }

    if (!evaluationId) return

    setError('')
    setIsSubmitting(true)

    try {
      await apiClient.post(`/evaluations/${evaluationId}/unable-to-evaluate`, {
        reason: unableReason,
      })

      setMessage('Marked as unable to evaluate')
      setTimeout(() => {
        navigate('/judge-queue')
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit')
    } finally {
      setIsSubmitting(false)
      setShowUnableDialog(false)
    }
  }

  if (loading) {
    return <div style={styles.loading}>Loading scoring configuration...</div>
  }

  if (!scoringConfiguration) {
    return <div style={styles.loading}>Error: Could not load scoring configuration</div>
  }

  const totalScore = calculateTotalScore()
  const maxPossible = scoringConfiguration.categories.reduce(
    (sum, cat) => sum + cat.maximum_points,
    0
  )

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.navTitle}>Score Entry</h1>
        <button onClick={() => navigate('/judge-queue')} style={styles.backButton}>
          ← Back to Queue
        </button>
      </nav>

      <main style={styles.main}>
        {error && <div style={{...styles.message, backgroundColor: '#f8d7da', color: '#721c24'}}>{error}</div>}
        {message && <div style={{...styles.message, backgroundColor: '#d4edda', color: '#155724'}}>{message}</div>}

        <div style={styles.layoutContainer}>
          {videoUrl && (
            <div style={styles.videoSection}>
              <video
                controls
                style={styles.videoPlayer}
                src={videoUrl}
              >
                Your browser doesn't support video playback
              </video>
            </div>
          )}

          <div style={styles.scoreCard}>
          <h2 style={styles.heading}>{scoringConfiguration.name}</h2>
          <p style={styles.description}>{scoringConfiguration.description}</p>

          <div style={styles.blindJudgingNotice}>
            🔒 <strong>Blind Judging:</strong> You cannot see other judges' scores before submitting your evaluation.
          </div>

          <div style={styles.scoringSection}>
            {scoringConfiguration.categories.map(category => (
              <div key={category.id} style={styles.categoryContainer}>
                <div style={styles.categoryHeader}>
                  <label style={styles.categoryLabel}>{category.name}</label>
                  <p style={styles.categoryDescription}>{category.description}</p>
                </div>

                <div style={styles.scoreInputContainer}>
                  <input
                    type="range"
                    min={category.minimum_points}
                    max={category.maximum_points}
                    value={scores[category.id] || category.minimum_points}
                    onChange={(e) => handleScoreChange(category.id, parseInt(e.target.value))}
                    style={styles.scoreSlider}
                    disabled={isSubmitting}
                  />
                  <div style={styles.scoreDisplay}>
                    <input
                      type="number"
                      min={category.minimum_points}
                      max={category.maximum_points}
                      value={scores[category.id] || category.minimum_points}
                      onChange={(e) => handleScoreChange(category.id, parseInt(e.target.value))}
                      style={styles.scoreInput}
                      disabled={isSubmitting}
                    />
                    <span style={styles.scoreRange}>
                      /{category.maximum_points}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.totalScoreContainer}>
            <h3>Total Score</h3>
            <div style={styles.totalScore}>
              {totalScore} / {maxPossible}
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Comments (Optional)</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Any additional comments about this evaluation..."
              style={{...styles.input, minHeight: '100px'}}
              disabled={isSubmitting}
            />
          </div>

          <div style={styles.buttonGroup}>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              style={{...styles.submitButton, opacity: isSubmitting ? 0.5 : 1}}
            >
              {isSubmitting ? 'Submitting...' : '✓ Submit Evaluation'}
            </button>
            <button
              onClick={() => setShowUnableDialog(true)}
              disabled={isSubmitting}
              style={styles.unableButton}
            >
              Unable to Evaluate
            </button>
          </div>
          </div>
        </div>
      </main>

      {showUnableDialog && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3>Unable to Evaluate Recording</h3>
            <p>Please provide a reason for why you cannot evaluate this recording:</p>
            <textarea
              value={unableReason}
              onChange={(e) => setUnableReason(e.target.value)}
              placeholder="e.g., Poor audio quality, Recording too short, etc."
              style={{...styles.input, minHeight: '80px'}}
              disabled={isSubmitting}
            />
            <div style={styles.modalButtons}>
              <button
                onClick={handleUnableToEvaluate}
                disabled={isSubmitting || !unableReason.trim()}
                style={styles.confirmButton}
              >
                Confirm
              </button>
              <button
                onClick={() => setShowUnableDialog(false)}
                style={styles.cancelButton}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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
  } as React.CSSProperties,
  layoutContainer: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '2rem',
    alignItems: 'start',
  } as React.CSSProperties,
  videoSection: {
    backgroundColor: '#000',
    borderRadius: '8px',
    padding: '1rem',
    position: 'sticky',
    top: '2rem',
  } as React.CSSProperties,
  videoPlayer: {
    width: '100%',
    maxHeight: '600px',
    borderRadius: '4px',
    display: 'block',
  } as React.CSSProperties,
  card: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    maxWidth: '800px',
    margin: '0 auto',
  } as React.CSSProperties,
  scoreCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    maxWidth: '800px',
    margin: '0 auto',
  } as React.CSSProperties,
  heading: {
    marginTop: 0,
    color: '#333',
  } as React.CSSProperties,
  description: {
    color: '#666',
    fontSize: '0.95rem',
  } as React.CSSProperties,
  blindJudgingNotice: {
    backgroundColor: '#e3f2fd',
    padding: '1rem',
    borderRadius: '4px',
    color: '#1565c0',
    marginBottom: '2rem',
    borderLeft: '4px solid #1565c0',
  } as React.CSSProperties,
  message: {
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  scoringSection: {
    marginBottom: '2rem',
  } as React.CSSProperties,
  categoryContainer: {
    marginBottom: '2rem',
    paddingBottom: '2rem',
    borderBottom: '1px solid #eee',
  } as React.CSSProperties,
  categoryHeader: {
    marginBottom: '1rem',
  } as React.CSSProperties,
  categoryLabel: {
    fontSize: '1rem',
    fontWeight: 'bold',
    color: '#333',
  } as React.CSSProperties,
  categoryDescription: {
    margin: '0.25rem 0 0 0',
    fontSize: '0.9rem',
    color: '#666',
  } as React.CSSProperties,
  scoreInputContainer: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  } as React.CSSProperties,
  scoreSlider: {
    flex: 1,
  } as React.CSSProperties,
  scoreDisplay: {
    display: 'flex',
    gap: '0.25rem',
    alignItems: 'center',
  } as React.CSSProperties,
  scoreInput: {
    width: '60px',
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    textAlign: 'center',
  } as React.CSSProperties,
  scoreRange: {
    color: '#666',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  totalScoreContainer: {
    backgroundColor: '#f5f5f5',
    padding: '1.5rem',
    borderRadius: '4px',
    marginBottom: '2rem',
    textAlign: 'center',
  } as React.CSSProperties,
  totalScore: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#1a5490',
  } as React.CSSProperties,
  formGroup: {
    marginBottom: '1.5rem',
  } as React.CSSProperties,
  label: {
    fontSize: '0.9rem',
    fontWeight: 'bold',
    color: '#333',
    display: 'block',
    marginBottom: '0.5rem',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    fontFamily: 'inherit',
  } as React.CSSProperties,
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
    marginTop: '2rem',
  } as React.CSSProperties,
  submitButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
  } as React.CSSProperties,
  unableButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
  } as React.CSSProperties,
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  } as React.CSSProperties,
  modalContent: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    maxWidth: '500px',
    width: '90%',
  } as React.CSSProperties,
  modalButtons: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
  } as React.CSSProperties,
  confirmButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  } as React.CSSProperties,
  cancelButton: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
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

export default ScoreEntryPage
