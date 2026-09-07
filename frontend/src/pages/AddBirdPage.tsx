import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

interface BirdType {
  id: string
  name: string
}

const AddBirdPage: React.FC = () => {
  const { apiClient } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [name, setName] = useState('')
  const [legBandNumber, setLegBandNumber] = useState('')
  const [birdTypeId, setBirdTypeId] = useState('')
  const [sex, setSex] = useState('')
  const [notes, setNotes] = useState('')
  const [birdTypes, setBirdTypes] = useState<BirdType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadBirdTypes()
  }, [])

  const loadBirdTypes = async () => {
    try {
      // Bird types endpoint is public, use fetch directly
      const response = await fetch('http://localhost:8000/birds/types')
      if (!response.ok) throw new Error('Failed to fetch bird types')
      const data = await response.json()
      setBirdTypes(data)
      if (data.length > 0) {
        setBirdTypeId(data[0].id)
      }
    } catch (error) {
      setError('Failed to load bird types')
      console.error('Error loading bird types:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await apiClient.post('/birds', {
        name,
        leg_band_number: legBandNumber,
        bird_type_id: birdTypeId,
        sex: sex || undefined,
        notes: notes || undefined,
      })

      navigate('/my-birds')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create bird')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.navTitle}>Canary Evaluation Platform</h1>
        <button onClick={() => navigate('/my-birds')} style={styles.backButton}>
          ← Back
        </button>
      </nav>

      <main style={styles.main}>
        <div style={styles.card}>
          <h2 style={styles.heading}>Add New Bird</h2>

          <form onSubmit={handleSubmit} style={styles.form}>
            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.formGroup}>
              <label style={styles.label}>Bird Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g., Sunny"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Leg Band Number *</label>
              <input
                type="text"
                value={legBandNumber}
                onChange={(e) => setLegBandNumber(e.target.value)}
                required
                placeholder="e.g., 2024-001"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Bird Type *</label>
              <select
                value={birdTypeId}
                onChange={(e) => setBirdTypeId(e.target.value)}
                required
                style={styles.select}
                disabled={isLoading}
              >
                <option value="">Select a type</option>
                {birdTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              <p style={styles.hint}>
                ℹ️ Bird type cannot be changed after creation
              </p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Sex (Optional)</label>
              <select value={sex} onChange={(e) => setSex(e.target.value)} style={styles.select}>
                <option value="">Not specified</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional information about the bird"
                style={{...styles.input, minHeight: '100px'}}
              />
            </div>

            <button type="submit" disabled={isSubmitting || isLoading} style={styles.button}>
              {isSubmitting ? t('common.loading') : 'Create Bird'}
            </button>
          </form>

          <div style={styles.infoBox}>
            <h4 style={styles.infoTitle}>ℹ️ Important Information</h4>
            <ul style={styles.infoList}>
              <li>Bird name, leg band number, and type are immutable after creation</li>
              <li>Leg band numbers must be unique for each of your birds</li>
              <li>You can update notes and sex information later</li>
              <li>You can archive birds when needed</li>
            </ul>
          </div>
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
  select: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
  } as React.CSSProperties,
  hint: {
    margin: '0.25rem 0 0 0',
    fontSize: '0.85rem',
    color: '#999',
    fontStyle: 'italic',
  } as React.CSSProperties,
  button: {
    padding: '0.75rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '1rem',
  } as React.CSSProperties,
  error: {
    color: '#d32f2f',
    padding: '0.75rem',
    backgroundColor: '#ffebee',
    borderRadius: '4px',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  infoBox: {
    backgroundColor: '#e3f2fd',
    padding: '1rem',
    borderRadius: '4px',
    marginTop: '2rem',
    borderLeft: '4px solid #2196f3',
  } as React.CSSProperties,
  infoTitle: {
    margin: '0 0 0.5rem 0',
    color: '#1976d2',
  } as React.CSSProperties,
  infoList: {
    margin: 0,
    paddingLeft: '1.5rem',
    color: '#333',
  } as React.CSSProperties,
}

export default AddBirdPage
