import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div style={styles.container}>
      <nav style={{...styles.nav, backgroundColor: user?.role === 'Judge' ? '#1a5490' : '#333'}}>
        <h1 style={styles.navTitle}>Canary Evaluation Platform</h1>
        <div style={styles.navRight}>
          <button onClick={() => navigate('/profile')} style={styles.navButton}>
            {t('nav.profile')}
          </button>
          <button onClick={handleLogout} style={styles.logoutButton}>
            {t('auth.logout')}
          </button>
        </div>
      </nav>

      <main style={styles.main}>
        <div style={styles.welcomeCard}>
          <h2 style={styles.heading}>Welcome, {user?.display_name || user?.email}!</h2>
          <p style={styles.subtext}>Role: {user?.role}</p>

          <div style={styles.gridContainer}>
            {user?.role === 'Judge' ? (
              <>
                <div style={styles.cardLink} onClick={() => navigate('/judge-queue')}>
                  <div style={styles.cardIcon}>⚖️</div>
                  <h3 style={styles.cardTitle}>Evaluation Queue</h3>
                  <p style={styles.cardDesc}>Review recordings to evaluate</p>
                </div>
                <div style={styles.cardLink} onClick={() => navigate('/judge-evaluation-history')}>
                  <div style={styles.cardIcon}>📚</div>
                  <h3 style={styles.cardTitle}>Evaluation History</h3>
                  <p style={styles.cardDesc}>View your past evaluations</p>
                </div>
                <div style={styles.cardLink} onClick={() => navigate('/profile')}>
                  <div style={styles.cardIcon}>👤</div>
                  <h3 style={styles.cardTitle}>Profile</h3>
                  <p style={styles.cardDesc}>Update your information</p>
                </div>
              </>
            ) : user?.role === 'Admin' ? (
              <>
                <div style={styles.cardLink} onClick={() => navigate('/admin/dashboard')}>
                  <div style={styles.cardIcon}>⚙️</div>
                  <h3 style={styles.cardTitle}>Admin Panel</h3>
                  <p style={styles.cardDesc}>Manage system configuration</p>
                </div>
                <div style={styles.cardLink} onClick={() => navigate('/profile')}>
                  <div style={styles.cardIcon}>👤</div>
                  <h3 style={styles.cardTitle}>Profile</h3>
                  <p style={styles.cardDesc}>Update your information</p>
                </div>
              </>
            ) : (
              <>
                <div style={styles.cardLink} onClick={() => navigate('/my-birds')}>
                  <div style={styles.cardIcon}>🐦</div>
                  <h3 style={styles.cardTitle}>My Birds</h3>
                  <p style={styles.cardDesc}>Manage your canaries</p>
                </div>

                <div style={styles.cardLink} onClick={() => navigate('/my-recordings')}>
                  <div style={styles.cardIcon}>🎵</div>
                  <h3 style={styles.cardTitle}>My Recordings</h3>
                  <p style={styles.cardDesc}>View uploaded recordings</p>
                </div>

                <div style={styles.cardLink} onClick={() => navigate('/my-evaluations')}>
                  <div style={styles.cardIcon}>📊</div>
                  <h3 style={styles.cardTitle}>My Evaluations</h3>
                  <p style={styles.cardDesc}>View evaluation results</p>
                </div>

                <div style={styles.cardLink} onClick={() => navigate('/profile')}>
                  <div style={styles.cardIcon}>👤</div>
                  <h3 style={styles.cardTitle}>Profile</h3>
                  <p style={styles.cardDesc}>Update your information</p>
                </div>
              </>
            )}
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
  logoutButton: {
    padding: '0.5rem 1rem',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  } as React.CSSProperties,
  main: {
    flex: 1,
    padding: '2rem',
  } as React.CSSProperties,
  welcomeCard: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    maxWidth: '800px',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
}

export default DashboardPage

