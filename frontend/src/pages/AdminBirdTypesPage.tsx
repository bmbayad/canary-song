import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface BirdType {
  id: string
  name: string
  description: string | null
  active: boolean
  created_at: string
}

const AdminBirdTypesPage: React.FC = () => {
  const { apiClient } = useAuth()
  const navigate = useNavigate()
  const [birdTypes, setBirdTypes] = useState<BirdType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '' })

  useEffect(() => {
    loadBirdTypes()
  }, [])

  const loadBirdTypes = async () => {
    try {
      setLoading(true)
      const response = await apiClient.get('/admin/bird-types?include_inactive=true')
      setBirdTypes(response.data.bird_types || [])
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load bird types')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBirdType = async () => {
    try {
      const response = await apiClient.post('/admin/bird-types', formData)
      setBirdTypes([...birdTypes, response.data])
      setFormData({ name: '', description: '' })
      setShowForm(false)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create bird type')
    }
  }

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      const response = await apiClient.patch(`/admin/bird-types/${id}`, { active: !active })
      setBirdTypes(birdTypes.map(bt => bt.id === id ? response.data : bt))
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update bird type')
    }
  }

  if (loading) {
    return <div style={styles.container}><nav style={styles.nav}><h1>Bird Types</h1></nav><main style={styles.main}>Loading...</main></div>
  }

  return (
    <div style={styles.container}>
      <nav style={{ ...styles.nav, backgroundColor: '#8b0000' }}>
        <h1>Manage Bird Types</h1>
        <button onClick={() => navigate('/admin/dashboard')} style={styles.backButton}>← Back</button>
      </nav>

      <main style={styles.main}>
        {error && <div style={styles.errorBox}><strong>Error:</strong> {error}</div>}

        <div style={styles.controlSection}>
          <button onClick={() => setShowForm(!showForm)} style={styles.primaryButton}>
            {showForm ? 'Cancel' : '+ Create Bird Type'}
          </button>
        </div>

        {showForm && (
          <div style={styles.formCard}>
            <h3>Create New Bird Type</h3>
            <div style={styles.formGroup}>
              <label>Name (Required)</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={styles.input}
                placeholder="e.g., Waterslager"
              />
            </div>
            <div style={styles.formGroup}>
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ ...styles.input, minHeight: '100px' }}
                placeholder="Description of this bird type..."
              />
            </div>
            <div style={styles.formActions}>
              <button onClick={handleCreateBirdType} style={styles.submitButton}>Create</button>
              <button onClick={() => setShowForm(false)} style={styles.cancelButton}>Cancel</button>
            </div>
          </div>
        )}

        <div style={styles.listCard}>
          <h3>Bird Types ({birdTypes.length})</h3>
          {birdTypes.map((bt) => (
            <div key={bt.id} style={styles.item}>
              <div>
                <h4 style={styles.itemName}>{bt.name}</h4>
                {bt.description && <p style={styles.itemDesc}>{bt.description}</p>}
              </div>
              <div style={styles.itemActions}>
                <span style={{ ...styles.statusBadge, backgroundColor: bt.active ? '#e8f5e9' : '#ffebee', color: bt.active ? '#2e7d32' : '#c62828' }}>
                  {bt.active ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => handleToggleActive(bt.id, bt.active)} style={styles.toggleButton}>
                  {bt.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
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
  errorBox: { backgroundColor: '#ffebee', color: '#c62828', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' } as React.CSSProperties,
  controlSection: { marginBottom: '2rem' } as React.CSSProperties,
  primaryButton: { padding: '0.75rem 1.5rem', backgroundColor: '#8b0000', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' } as React.CSSProperties,
  formCard: { backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' } as React.CSSProperties,
  formGroup: { marginBottom: '1rem' } as React.CSSProperties,
  input: { width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem', boxSizing: 'border-box' } as React.CSSProperties,
  formActions: { display: 'flex', gap: '1rem', marginTop: '1.5rem' } as React.CSSProperties,
  submitButton: { padding: '0.75rem 1.5rem', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' } as React.CSSProperties,
  cancelButton: { padding: '0.75rem 1.5rem', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' } as React.CSSProperties,
  listCard: { backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem' } as React.CSSProperties,
  item: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#f9f9f9', borderRadius: '4px', marginBottom: '0.5rem', border: '1px solid #e0e0e0' } as React.CSSProperties,
  itemName: { margin: '0 0 0.25rem 0', color: '#333' } as React.CSSProperties,
  itemDesc: { margin: '0.25rem 0 0 0', color: '#666', fontSize: '0.9rem' } as React.CSSProperties,
  itemActions: { display: 'flex', alignItems: 'center', gap: '1rem' } as React.CSSProperties,
  statusBadge: { padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold' } as React.CSSProperties,
  toggleButton: { padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' } as React.CSSProperties,
}

export default AdminBirdTypesPage
