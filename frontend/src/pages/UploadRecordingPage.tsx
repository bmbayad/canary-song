import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

interface Bird {
  id: string
  name: string
  leg_band_number: string
  bird_type_id: string
  status: string
}

const UploadRecordingPage: React.FC = () => {
  const { apiClient } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()

  const [birds, setBirds] = useState<Bird[]>([])
  const [selectedBirdId, setSelectedBirdId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)

  // Get birdId from navigation state if provided
  const preselectedBirdId = (location.state as any)?.birdId

  useEffect(() => {
    loadActiveBirds()
  }, [])

  useEffect(() => {
    // Pre-select the bird if one was passed in
    if (preselectedBirdId && birds.length > 0) {
      const bird = birds.find(b => b.id === preselectedBirdId)
      if (bird) {
        setSelectedBirdId(preselectedBirdId)
      }
    }
  }, [birds, preselectedBirdId])

  const loadActiveBirds = async () => {
    try {
      const response = await apiClient.get('/birds')
      const activeBirds = response.data.filter((b: Bird) => b.status === 'Active')
      setBirds(activeBirds)
      if (activeBirds.length > 0) {
        setSelectedBirdId(activeBirds[0].id)
      }
    } catch (error) {
      setError('Failed to load birds')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.toLowerCase().endsWith('.mp4')) {
      setError('Only MP4 files are supported')
      return
    }

    const MAX_SIZE = 500 * 1024 * 1024
    if (selectedFile.size > MAX_SIZE) {
      setError(`File size exceeds 500MB limit. Selected: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`)
      return
    }

    setFile(selectedFile)
    setError('')
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!file || !selectedBirdId) {
      setError('Please select a bird and file')
      return
    }

    setError('')
    setMessage('')
    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Step 1: Request presigned URL
      const uploadUrlResponse = await apiClient.post('/recordings/upload-url', {
        bird_id: selectedBirdId,
        filename: file.name,
        file_size: file.size,
      })

      const { upload_url, recording_id } = uploadUrlResponse.data

      // Step 2: Upload directly to R2 using presigned URL
      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100
          setUploadProgress(Math.round(percentComplete))
        }
      })

      await new Promise((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(true)
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`))
          }
        })
        xhr.addEventListener('error', () => reject(new Error('Upload failed')))
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

        xhr.open('PUT', upload_url)
        xhr.setRequestHeader('Content-Type', 'video/mp4')
        xhr.send(file)
      })

      // Step 3: Confirm upload and get duration
      const video = document.createElement('video')
      const videoUrl = URL.createObjectURL(file)

      const duration = await new Promise<number>((resolve) => {
        video.onloadedmetadata = () => {
          resolve(Math.floor(video.duration))
        }
        video.src = videoUrl
      })

      await apiClient.post('/recordings/confirm-upload', {
        recording_id,
        file_size: file.size,
        duration,
      })

      setMessage('Recording uploaded successfully!')
      setFile(null)
      setSelectedBirdId('')
      setUploadProgress(0)

      setTimeout(() => {
        navigate('/my-recordings')
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  if (isLoading) {
    return <div style={styles.loading}>{t('common.loading')}</div>
  }

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <h1 style={styles.navTitle}>Canary Evaluation Platform</h1>
        <button onClick={() => navigate('/my-recordings')} style={styles.backButton}>
          ← Back
        </button>
      </nav>

      <main style={styles.main}>
        <div style={styles.card}>
          <h2 style={styles.heading}>Upload Recording</h2>

          <form onSubmit={handleUpload} style={styles.form}>
            {error && <div style={{...styles.message, backgroundColor: '#f8d7da', color: '#721c24'}}>{error}</div>}
            {message && <div style={{...styles.message, backgroundColor: '#d4edda', color: '#155724'}}>{message}</div>}

            <div style={styles.formGroup}>
              <label style={styles.label}>Select Bird *</label>
              {birds.length === 0 ? (
                <p style={styles.hint}>No active birds available. Create a bird first.</p>
              ) : (
                <>
                  <select
                    value={selectedBirdId}
                    onChange={(e) => setSelectedBirdId(e.target.value)}
                    required
                    style={styles.select}
                    disabled={isUploading || !!preselectedBirdId}
                  >
                    <option value="">Select a bird</option>
                    {birds.map((bird) => (
                      <option key={bird.id} value={bird.id}>
                        {bird.name} ({bird.leg_band_number})
                      </option>
                    ))}
                  </select>
                  {preselectedBirdId && selectedBirdId && (
                    <p style={{...styles.hint, color: '#28a745', marginTop: '0.5rem'}}>
                      ✓ Recording will be uploaded for: <strong>{birds.find(b => b.id === selectedBirdId)?.name}</strong>
                    </p>
                  )}
                </>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>MP4 Recording *</label>
              <input
                type="file"
                accept=".mp4,video/mp4"
                onChange={handleFileSelect}
                required
                disabled={isUploading}
                style={styles.fileInput}
              />
              <p style={styles.hint}>
                ℹ️ Maximum 500MB, maximum 5 minutes duration
              </p>
              {file && (
                <p style={styles.fileInfo}>
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
                </p>
              )}
            </div>

            {uploadProgress > 0 && uploadProgress < 100 && (
              <div style={styles.progressContainer}>
                <div style={{...styles.progressBar, width: `${uploadProgress}%`}} />
                <p style={styles.progressText}>{uploadProgress}%</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading || !file || !selectedBirdId}
              style={{
                ...styles.button,
                opacity: isUploading || !file || !selectedBirdId ? 0.5 : 1,
                cursor: isUploading || !file || !selectedBirdId ? 'not-allowed' : 'pointer',
              }}
            >
              {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload Recording'}
            </button>
          </form>

          <div style={styles.infoBox}>
            <h4 style={styles.infoTitle}>📋 Recording Guidelines</h4>
            <ul style={styles.infoList}>
              <li>Recording must be MP4 format</li>
              <li>Maximum file size: 500MB</li>
              <li>Maximum duration: 5 minutes</li>
              <li>Recording will be stored for 14 days</li>
              <li>Recording cannot be changed after upload</li>
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
  select: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
  } as React.CSSProperties,
  fileInput: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
  } as React.CSSProperties,
  hint: {
    margin: '0.25rem 0 0 0',
    fontSize: '0.85rem',
    color: '#999',
    fontStyle: 'italic',
  } as React.CSSProperties,
  fileInfo: {
    margin: '0.5rem 0 0 0',
    fontSize: '0.9rem',
    color: '#28a745',
    padding: '0.5rem',
    backgroundColor: '#f0f8f5',
    borderRadius: '4px',
  } as React.CSSProperties,
  progressContainer: {
    position: 'relative',
    height: '30px',
    backgroundColor: '#e9ecef',
    borderRadius: '4px',
    overflow: 'hidden',
  } as React.CSSProperties,
  progressBar: {
    height: '100%',
    backgroundColor: '#007bff',
    transition: 'width 0.3s ease',
  } as React.CSSProperties,
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#333',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    margin: 0,
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
  message: {
    padding: '0.75rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
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

export default UploadRecordingPage
