import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

const AdminDashboardPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  if (user?.role !== 'Admin') {
    return (
      <div style={styles.container}>
        <nav style={styles.nav}>
          <h1 style={styles.navTitle}>Admin Dashboard</h1>
        </nav>
        <main style={styles.main}>
          <div style={styles.errorBox}>
            <strong>Access Denied</strong>
            <p>Only administrators can access this page.</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <nav style={{ ...styles.nav, backgroundColor: '#8b0000' }}>
        <h1 style={styles.navTitle}>Canary Evaluation Platform - Admin</h1>
        <div style={styles.navRight}>
          <button onClick={() => navigate('/dashboard')} style={styles.navButton}>
            🏠 Home
          </button>
          <button onClick={() => navigate('/profile')} style={styles.navButton}>
            {t('nav.profile')}
          </button>
        </div>
      </nav>

      <main style={styles.main}>
        <div style={styles.welcomeCard}>
          <h2 style={styles.heading}>Admin Control Panel</h2>
          <p style={styles.subtext}>Manage system configuration and users</p>

          <div style={styles.gridContainer}>
            <div style={styles.cardLink} onClick={() => navigate('/admin/judges')}>
              <div style={styles.cardIcon}>👨‍⚖️</div>
              <h3 style={styles.cardTitle}>Manage Judges</h3>
              <p style={styles.cardDesc}>Create and manage judge accounts</p>
            </div>

            <div style={styles.cardLink} onClick={() => navigate('/admin/bird-types')}>
              <div style={styles.cardIcon}>🐦</div>
              <h3 style={styles.cardTitle}>Bird Types</h3>
              <p style={styles.cardDesc}>Create and manage bird types</p>
            </div>

            <div style={styles.cardLink} onClick={() => navigate('/admin/scoring')}>
              <div style={styles.cardIcon}>📊</div>
              <h3 style={styles.cardTitle}>Scoring Configuration</h3>
              <p style={styles.cardDesc}>Configure scoring categories</p>
            </div>

            <div style={styles.cardLink} onClick={() => navigate('/admin/retention')}>
              <div style={styles.cardIcon}>⏰</div>
              <h3 style={styles.cardTitle}>Media Retention</h3>
              <p style={styles.cardDesc}>Configure retention settings</p>
            </div>
          </div>

          <div style={styles.infoBox}>
            <h4>⚙️ System Administration</h4>
            <ul>
              <li>Create new judge accounts with temporary passwords</li>
              <li>Activate/deactivate judge accounts</li>
              <li>Create and manage bird types</li>
              <li>Configure scoring categories for each bird type</li>
              <li>Set media retention periods</li>
              <li>All changes preserve historical evaluation data</li>
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
  main: {
    flex: 1,
    padding: '2rem',
  } as React.CSSProperties,
  errorBox: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '2rem',
    borderRadius: '8px',
    textAlign: 'center',
  } as React.CSSProperties,
  welcomeCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    maxWidth: '1000px',
  } as React.CSSProperties,
  heading: {
    marginTop: 0,
    color: '#333',
  } as React.CSSProperties,
  subtext: {
    color: '#666',
    marginBottom: '1.5rem',
  } as React.CSSProperties,
  gridContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  } as React.CSSProperties,
  cardLink: {
    backgroundColor: '#f8f9fa',
    padding: '1.5rem',
    borderRadius: '8px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid transparent',
  } as React.CSSProperties,
  cardIcon: {
    fontSize: '2.5rem',
    marginBottom: '0.5rem',
  } as React.CSSProperties,
  cardTitle: {
    margin: '0.5rem 0',
    color: '#333',
  } as React.CSSProperties,
  cardDesc: {
    margin: 0,
    color: '#666',
    fontSize: '0.9rem',
  } as React.CSSProperties,
  infoBox: {
    backgroundColor: '#fff3cd',
    padding: '1.5rem',
    borderRadius: '4px',
    borderLeft: '4px solid #ffc107',
  } as React.CSSProperties,
}

export default AdminDashboardPage
