import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const AdminRetentionPage: React.FC = () => {
  const { apiClient } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retentionDays, setRetentionDays] = useState(14)
  const [newRetentionDays, setNewRetentionDays] = useState(14)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    loadRetentionConfig()
  }, [])

  const loadRetentionConfig = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/admin/retention')
      setRetentionDays(response.data.retention_days)
      setNewRetentionDays(response.data.retention_days)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load retention configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRetention = async () => {
    if (newRetentionDays < 1 || newRetentionDays > 365) {
      setError('Retention period must be between 1 and 365 days')
      return
    }

    try {
      setSaving(true)
      await apiClient.patch('/admin/retention', { retention_days: newRetentionDays })
      setRetentionDays(newRetentionDays)
      setSuccessMessage(`Retention period updated to ${newRetentionDays} days`)
      setError(null)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update retention configuration')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={styles.container}><nav style={styles.nav}><h1>Retention Configuration</h1></nav><main style={styles.main}>Loading...</main></div>
  }

  return (
    <div style={styles.container}>
      <nav style={{ ...styles.nav, backgroundColor: '#8b0000' }}>
        <h1>Manage Media Retention</h1>
        <button onClick={() => navigate('/admin/dashboard')} style={styles.backButton}>← Back</button>
      </nav>

      <main style={styles.main}>
        {error && <div style={styles.errorBox}><strong>Error:</strong> {error}</div>}
        {successMessage && <div style={styles.successBox}><strong>Success:</strong> {successMessage}</div>}

        <div style={styles.section}>
          <div style={styles.card}>
            <h2>Current Media Retention Period</h2>
            <p style={styles.currentValue}>{retentionDays} days</p>
            <p style={styles.description}>
              All new recordings will expire and be automatically deleted from storage after {retentionDays} days.
            </p>

            <div style={styles.divider}></div>

            <h3>Update Retention Period</h3>
            <div style={styles.formGroup}>
              <label>Retention Days (1-365)</label>
              <div style={styles.inputRow}>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={newRetentionDays}
                  onChange={(e) => setNewRetentionDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 1)))}
                  style={styles.input}
                />
                <span style={styles.unit}>days</span>
              </div>
              <p style={styles.hint}>
                This setting only affects NEW recordings. Existing recordings keep their original expiration dates.
              </p>
            </div>

            <div style={styles.impactBox}>
              <h4>Impact of this change:</h4>
              <ul style={styles.impactList}>
                <li>✓ New recordings will expire in {newRetentionDays} days</li>
                <li>✓ Expired media will be automatically deleted from Cloudflare R2</li>
                <li>✓ Recording metadata and evaluation history will be preserved</li>
                <li>✓ Historical scoring snapshots will remain accessible</li>
              </ul>
            </div>

            <div style={styles.formActions}>
              <button
                type="button"
                onClick={handleSaveRetention}
                disabled={newRetentionDays === retentionDays || saving}
                style={{
                  ...styles.submitButton,
                  opacity: newRetentionDays === retentionDays || saving ? 0.5 : 1,
                  cursor: newRetentionDays === retentionDays || saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                disabled={newRetentionDays === retentionDays}
                onClick={() => {
                  setNewRetentionDays(retentionDays)
                  setError(null)
                  setSuccessMessage(null)
                }}
                style={{
                  ...styles.cancelButton,
                  opacity: newRetentionDays === retentionDays ? 0.5 : 1,
                  cursor: newRetentionDays === retentionDays ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </div>

          <div style={styles.infoBox}>
            <h4>About Media Retention</h4>
            <p>
              Media retention defines how long uploaded recordings remain available before automatic deletion.
            </p>
            <ul style={styles.infoList}>
              <li><strong>Default:</strong> 14 days</li>
              <li><strong>Configurable:</strong> 1 to 365 days</li>
              <li><strong>Countdown:</strong> Users see how many days remain before their media expires</li>
              <li><strong>Data Preservation:</strong> Database records and evaluation history are never deleted</li>
              <li><strong>Automatic:</strong> Cleanup happens every hour</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f5f5f5' } as React.CSSProperties,
  nav: { backgroundColor: '#333', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
  backButton: { padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' } as React.CSSProperties,
  main: { flex: 1, padding: '2rem', maxWidth: '1000px', margin: '0 auto', width: '100%' } as React.CSSProperties,
  errorBox: { backgroundColor: '#ffebee', color: '#c62828', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid #ef5350' } as React.CSSProperties,
  successBox: { backgroundColor: '#e8f5e9', color: '#2e7d32', padding: '1rem', borderRadius: '4px', marginBottom: '1rem', border: '1px solid #81c784' } as React.CSSProperties,
  section: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' } as React.CSSProperties,
  card: { backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '2rem' } as React.CSSProperties,
  currentValue: { fontSize: '2.5rem', fontWeight: 'bold', color: '#8b0000', margin: '1rem 0' } as React.CSSProperties,
  description: { color: '#666', fontSize: '1rem', marginBottom: '1.5rem' } as React.CSSProperties,
  divider: { height: '1px', backgroundColor: '#e0e0e0', margin: '2rem 0' } as React.CSSProperties,
  formGroup: { marginBottom: '1.5rem' } as React.CSSProperties,
  inputRow: { display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' } as React.CSSProperties,
  input: { width: '120px', padding: '0.75rem', border: '2px solid #8b0000', borderRadius: '4px', fontSize: '1.1rem', fontWeight: 'bold' } as React.CSSProperties,
  unit: { fontSize: '1rem', color: '#666' } as React.CSSProperties,
  hint: { fontSize: '0.85rem', color: '#999', marginTop: '0.5rem' } as React.CSSProperties,
  impactBox: { backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: '4px', padding: '1.5rem', marginBottom: '1.5rem' } as React.CSSProperties,
  impactList: { margin: '0.5rem 0 0 1.5rem', color: '#333' } as React.CSSProperties,
  formActions: { display: 'flex', gap: '1rem', marginTop: '2rem' } as React.CSSProperties,
  submitButton: { padding: '0.75rem 2rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' } as React.CSSProperties,
  cancelButton: { padding: '0.75rem 2rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' } as React.CSSProperties,
  infoBox: { backgroundColor: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '8px', padding: '1.5rem' } as React.CSSProperties,
  infoList: { margin: '1rem 0 0 1.5rem', color: '#333', lineHeight: '1.8' } as React.CSSProperties,
}

export default AdminRetentionPage
