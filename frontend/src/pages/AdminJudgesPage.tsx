import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

interface Judge {
  id: string
  email: string
  first_name: string
  last_name: string
  display_name: string
  status: string
  created_at: string
}

const AdminJudgesPage: React.FC = () => {
  const { apiClient } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [judges, setJudges] = useState<Judge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    display_name: '',
  })

  useEffect(() => {
    loadJudges()
  }, [])

  const loadJudges = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/admin/judges')
      setJudges(response.data.judges || [])
      setError(null)
    } catch (err: any) {
      console.error('Failed to load judges:', err)
      setError(err.response?.data?.detail || 'Failed to load judges')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateJudge = async () => {
    try {
      const response = await apiClient.post('/admin/judges', formData)
      setJudges([...judges, response.data])
      setFormData({ email: '', first_name: '', last_name: '', display_name: '' })
      setShowForm(false)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create judge')
    }
  }

  const handleUpdateStatus = async (judgeId: string, newStatus: string) => {
    try {
      const response = await apiClient.patch(`/admin/judges/${judgeId}/status`, {
        status: newStatus,
      })
      setJudges(judges.map(j => j.id === judgeId ? response.data : j))
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update judge status')
    }
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <nav style={styles.nav}>
          <h1 style={styles.navTitle}>Manage Judges</h1>
          <button onClick={() => navigate('/admin/dashboard')} style={styles.backButton}>
            ← Back
          </button>
        </nav>
        <main style={styles.main}>
          <p>{t('common.loading')}</p>
        </main>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <nav style={{ ...styles.nav, backgroundColor: '#8b0000' }}>
        <h1 style={styles.navTitle}>Manage Judges</h1>
        <button onClick={() => navigate('/admin/dashboard')} style={styles.backButton}>
          ← Back
        </button>
      </nav>

      <main style={styles.main}>
        {error && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        )}

        <div style={styles.controlSection}>
          <button
            onClick={() => setShowForm(!showForm)}
            style={styles.primaryButton}
          >
            {showForm ? 'Cancel' : '+ Create New Judge'}
          </button>
        </div>

        {showForm && (
          <div style={styles.formCard}>
            <h3>Create New Judge Account</h3>
            <div style={styles.formGroup}>
              <label>Email (Required)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={styles.input}
                placeholder="judge@example.com"
              />
            </div>
            <div style={styles.formRow}>
              <div style={styles.formGroup}>
                <label>First Name</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  style={styles.input}
                  placeholder="John"
                />
              </div>
              <div style={styles.formGroup}>
                <label>Last Name</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  style={styles.input}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div style={styles.formGroup}>
              <label>Display Name</label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                style={styles.input}
                placeholder="John Doe"
              />
            </div>
            <div style={styles.formActions}>
              <button
                onClick={handleCreateJudge}
                style={styles.submitButton}
              >
                Create Judge
              </button>
              <button
                onClick={() => setShowForm(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={styles.judgesList}>
          <h3>Judges ({judges.length})</h3>
          {judges.length === 0 ? (
            <p>No judges created yet.</p>
          ) : (
            <div style={styles.table}>
              {judges.map((judge) => (
                <div key={judge.id} style={styles.tableRow}>
                  <div style={styles.judgeInfo}>
                    <h4 style={styles.judgeName}>
                      {judge.display_name}
                    </h4>
                    <p style={styles.judgeEmail}>{judge.email}</p>
                    <p style={styles.judgeDetails}>
                      {judge.first_name} {judge.last_name}
                    </p>
                  </div>
                  <div style={styles.judgeActions}>
                    <div style={{
                      ...styles.statusBadge,
                      backgroundColor: judge.status === 'Active' ? '#e8f5e9' : '#ffebee',
                      color: judge.status === 'Active' ? '#2e7d32' : '#c62828',
                    }}>
                      {judge.status}
                    </div>
                    <select
                      value={judge.status}
                      onChange={(e) => handleUpdateStatus(judge.id, e.target.value)}
                      style={styles.statusSelect}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
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
    marginBottom: '1rem',
  } as React.CSSProperties,
  controlSection: {
    marginBottom: '2rem',
  } as React.CSSProperties,
  primaryButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#8b0000',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  } as React.CSSProperties,
  formCard: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '1.5rem',
    marginBottom: '2rem',
  } as React.CSSProperties,
  formGroup: {
    marginBottom: '1rem',
  } as React.CSSProperties,
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  } as React.CSSProperties,
  input: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    fontSize: '1rem',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  formActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1.5rem',
  } as React.CSSProperties,
  submitButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  } as React.CSSProperties,
  cancelButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  } as React.CSSProperties,
  judgesList: {
    backgroundColor: 'white',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '1.5rem',
  } as React.CSSProperties,
  table: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  } as React.CSSProperties,
  tableRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
    border: '1px solid #e0e0e0',
  } as React.CSSProperties,
  judgeInfo: {},
  judgeName: {
    margin: '0 0 0.25rem 0',
    color: '#333',
  } as React.CSSProperties,
  judgeEmail: {
    margin: '0.25rem 0',
    color: '#666',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  judgeDetails: {
    margin: '0.25rem 0 0 0',
    color: '#999',
    fontSize: '0.85rem',
  } as React.CSSProperties,
  judgeActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  } as React.CSSProperties,
  statusBadge: {
    padding: '0.4rem 0.8rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    minWidth: '80px',
    textAlign: 'center',
  } as React.CSSProperties,
  statusSelect: {
    padding: '0.5rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
  } as React.CSSProperties,
}

export default AdminJudgesPage
