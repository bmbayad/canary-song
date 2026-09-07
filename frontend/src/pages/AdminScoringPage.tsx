import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface BirdType {
  id: string
  name: string
}

interface ScoringCategory {
  id: string
  name: string
  minimum_points: number
  maximum_points: number
  display_order: number
  active: boolean
}

interface ScoringConfiguration {
  id: string
  bird_type_id: string
  name: string
  version: number
  active: boolean
  categories: ScoringCategory[]
}

const AdminScoringPage: React.FC = () => {
  const { apiClient } = useAuth()
  const navigate = useNavigate()
  const [birdTypes, setBirdTypes] = useState<BirdType[]>([])
  const [configs, setConfigs] = useState<ScoringConfiguration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'configs' | 'categories'>('configs')
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null)
  const [showConfigForm, setShowConfigForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [configForm, setConfigForm] = useState({ bird_type_id: '', name: '', description: '', version: 1 })
  const [categoryForm, setCategoryForm] = useState({ name: '', minimum_points: 0, maximum_points: 10, display_order: 0, description: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [birdTypesRes, configsRes] = await Promise.all([
        apiClient.get('/birds/types'),
        apiClient.get('/admin/scoring-configurations'),
      ])
      setBirdTypes(birdTypesRes.data || [])
      setConfigs(configsRes.data || [])
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateConfig = async () => {
    try {
      await apiClient.post('/admin/scoring-configurations', configForm)
      setShowConfigForm(false)
      setConfigForm({ bird_type_id: '', name: '', description: '', version: 1 })
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create configuration')
    }
  }

  const handleCreateCategory = async () => {
    if (!selectedConfigId) return
    try {
      await apiClient.post(`/admin/scoring-categories?scoring_configuration_id=${selectedConfigId}`, categoryForm)
      setCategoryForm({ name: '', minimum_points: 0, maximum_points: 10, display_order: 0, description: '' })
      setShowCategoryForm(false)
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create category')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    if (!window.confirm('Delete this category?')) return
    try {
      await apiClient.delete(`/admin/scoring-categories/${categoryId}`)
      loadData()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete category')
    }
  }

  if (loading) {
    return <div style={styles.container}><nav style={styles.nav}><h1>Scoring Configuration</h1></nav><main style={styles.main}>Loading...</main></div>
  }

  const selectedConfig = configs.find(c => c.id === selectedConfigId)

  return (
    <div style={styles.container}>
      <nav style={{ ...styles.nav, backgroundColor: '#8b0000' }}>
        <h1>Manage Scoring Configuration</h1>
        <button onClick={() => navigate('/admin/dashboard')} style={styles.backButton}>← Back</button>
      </nav>

      <main style={styles.main}>
        {error && <div style={styles.errorBox}><strong>Error:</strong> {error}</div>}

        <div style={styles.tabButtons}>
          <button
            onClick={() => setActiveTab('configs')}
            style={{ ...styles.tabButton, backgroundColor: activeTab === 'configs' ? '#8b0000' : '#ccc' }}
          >
            Scoring Configurations
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            style={{ ...styles.tabButton, backgroundColor: activeTab === 'categories' ? '#8b0000' : '#ccc' }}
          >
            Categories
          </button>
        </div>

        {activeTab === 'configs' && (
          <div style={styles.section}>
            <div style={styles.controlSection}>
              <button onClick={() => setShowConfigForm(!showConfigForm)} style={styles.primaryButton}>
                {showConfigForm ? 'Cancel' : '+ Create Configuration'}
              </button>
            </div>

            {showConfigForm && (
              <div style={styles.formCard}>
                <h3>Create New Scoring Configuration</h3>
                <div style={styles.formGroup}>
                  <label>Bird Type (Required)</label>
                  <select
                    value={configForm.bird_type_id}
                    onChange={(e) => setConfigForm({ ...configForm, bird_type_id: e.target.value })}
                    style={styles.input}
                  >
                    <option value="">Select a bird type...</option>
                    {birdTypes.map(bt => <option key={bt.id} value={bt.id}>{bt.name}</option>)}
                  </select>
                </div>
                <div style={styles.formGroup}>
                  <label>Configuration Name (Required)</label>
                  <input
                    type="text"
                    value={configForm.name}
                    onChange={(e) => setConfigForm({ ...configForm, name: e.target.value })}
                    style={styles.input}
                    placeholder="e.g., Waterslager Standard v1"
                  />
                </div>
                <div style={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    value={configForm.description}
                    onChange={(e) => setConfigForm({ ...configForm, description: e.target.value })}
                    style={{ ...styles.input, minHeight: '80px' }}
                  />
                </div>
                <div style={styles.formActions}>
                  <button onClick={handleCreateConfig} style={styles.submitButton}>Create</button>
                  <button onClick={() => setShowConfigForm(false)} style={styles.cancelButton}>Cancel</button>
                </div>
              </div>
            )}

            <div style={styles.listCard}>
              <h3>Configurations ({configs.length})</h3>
              {configs.map(config => (
                <div key={config.id} style={{ ...styles.item, cursor: 'pointer', backgroundColor: selectedConfigId === config.id ? '#e3f2fd' : '#f9f9f9' }}
                  onClick={() => setSelectedConfigId(config.id)}>
                  <div>
                    <h4 style={styles.itemName}>{config.name}</h4>
                    <p style={styles.itemDesc}>Bird Type: {birdTypes.find(bt => bt.id === config.bird_type_id)?.name || 'Unknown'}</p>
                    <p style={styles.itemDesc}>Version {config.version} • {config.categories?.length || 0} categories</p>
                  </div>
                  <span style={{ ...styles.statusBadge, backgroundColor: config.active ? '#e8f5e9' : '#ffebee', color: config.active ? '#2e7d32' : '#c62828' }}>
                    {config.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div style={styles.section}>
            {!selectedConfigId ? (
              <div style={styles.infoBox}>
                <p>Select a scoring configuration from the "Scoring Configurations" tab to manage its categories.</p>
              </div>
            ) : selectedConfig ? (
              <>
                <div style={styles.selectedInfo}>
                  <h3>{selectedConfig.name}</h3>
                  <p>Version {selectedConfig.version}</p>
                </div>

                <div style={styles.controlSection}>
                  <button onClick={() => setShowCategoryForm(!showCategoryForm)} style={styles.primaryButton}>
                    {showCategoryForm ? 'Cancel' : '+ Add Category'}
                  </button>
                </div>

                {showCategoryForm && (
                  <div style={styles.formCard}>
                    <h3>Add Scoring Category</h3>
                    <div style={styles.formGroup}>
                      <label>Category Name (Required)</label>
                      <input
                        type="text"
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        style={styles.input}
                        placeholder="e.g., Tone Quality"
                      />
                    </div>
                    <div style={styles.formRow}>
                      <div style={styles.formGroup}>
                        <label>Min Points</label>
                        <input
                          type="number"
                          value={categoryForm.minimum_points}
                          onChange={(e) => setCategoryForm({ ...categoryForm, minimum_points: parseInt(e.target.value) })}
                          style={styles.input}
                        />
                      </div>
                      <div style={styles.formGroup}>
                        <label>Max Points</label>
                        <input
                          type="number"
                          value={categoryForm.maximum_points}
                          onChange={(e) => setCategoryForm({ ...categoryForm, maximum_points: parseInt(e.target.value) })}
                          style={styles.input}
                        />
                      </div>
                    </div>
                    <div style={styles.formGroup}>
                      <label>Display Order</label>
                      <input
                        type="number"
                        value={categoryForm.display_order}
                        onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value) })}
                        style={styles.input}
                      />
                    </div>
                    <div style={styles.formGroup}>
                      <label>Description</label>
                      <textarea
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        style={{ ...styles.input, minHeight: '60px' }}
                      />
                    </div>
                    <div style={styles.formActions}>
                      <button onClick={handleCreateCategory} style={styles.submitButton}>Add Category</button>
                      <button onClick={() => setShowCategoryForm(false)} style={styles.cancelButton}>Cancel</button>
                    </div>
                  </div>
                )}

                <div style={styles.listCard}>
                  <h3>Categories ({selectedConfig.categories?.length || 0})</h3>
                  {selectedConfig.categories && selectedConfig.categories.length > 0 ? (
                    selectedConfig.categories.map(cat => (
                      <div key={cat.id} style={styles.item}>
                        <div>
                          <h4 style={styles.itemName}>{cat.name}</h4>
                          <p style={styles.itemDesc}>{cat.minimum_points}-{cat.maximum_points} points • Order: {cat.display_order}</p>
                        </div>
                        <div style={styles.itemActions}>
                          <span style={{ ...styles.statusBadge, backgroundColor: cat.active ? '#e8f5e9' : '#ffebee', color: cat.active ? '#2e7d32' : '#c62828' }}>
                            {cat.active ? 'Active' : 'Inactive'}
                          </span>
                          <button onClick={() => handleDeleteCategory(cat.id)} style={styles.deleteButton}>Delete</button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p>No categories yet. Add one to get started.</p>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}
      </main>
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f5f5f5' } as React.CSSProperties,
  nav: { backgroundColor: '#333', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } as React.CSSProperties,
  backButton: { padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' } as React.CSSProperties,
  main: { flex: 1, padding: '2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' } as React.CSSProperties,
  errorBox: { backgroundColor: '#ffebee', color: '#c62828', padding: '1rem', borderRadius: '4px', marginBottom: '1rem' } as React.CSSProperties,
  tabButtons: { display: 'flex', gap: '1rem', marginBottom: '2rem' } as React.CSSProperties,
  tabButton: { padding: '0.75rem 1.5rem', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' } as React.CSSProperties,
  section: { } as React.CSSProperties,
  controlSection: { marginBottom: '2rem' } as React.CSSProperties,
  primaryButton: { padding: '0.75rem 1.5rem', backgroundColor: '#8b0000', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem' } as React.CSSProperties,
  formCard: { backgroundColor: 'white', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' } as React.CSSProperties,
  formGroup: { marginBottom: '1rem' } as React.CSSProperties,
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' } as React.CSSProperties,
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
  deleteButton: { padding: '0.5rem 1rem', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem' } as React.CSSProperties,
  selectedInfo: { backgroundColor: '#e3f2fd', border: '1px solid #2196f3', borderRadius: '8px', padding: '1rem', marginBottom: '2rem' } as React.CSSProperties,
  infoBox: { backgroundColor: '#e8f5e9', border: '1px solid #4caf50', borderRadius: '8px', padding: '1.5rem' } as React.CSSProperties,
}

export default AdminScoringPage
