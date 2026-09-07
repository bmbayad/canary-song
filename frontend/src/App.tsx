import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import MyBirdsPage from './pages/MyBirdsPage'
import BirdRecordingsPage from './pages/BirdRecordingsPage'
import AddBirdPage from './pages/AddBirdPage'
import UploadRecordingPage from './pages/UploadRecordingPage'
import MyRecordingsPage from './pages/MyRecordingsPage'
import JudgeQueuePage from './pages/JudgeQueuePage'
import ScoreEntryPage from './pages/ScoreEntryPage'
import MyEvaluationsPage from './pages/MyEvaluationsPage'
import EvaluationDetailPage from './pages/EvaluationDetailPage'
import JudgeEvaluationHistoryPage from './pages/JudgeEvaluationHistoryPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminJudgesPage from './pages/AdminJudgesPage'
import AdminBirdTypesPage from './pages/AdminBirdTypesPage'
import AdminScoringPage from './pages/AdminScoringPage'
import AdminRetentionPage from './pages/AdminRetentionPage'

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.password_reset_required && location.pathname !== '/reset-password') {
    return <Navigate to="/reset-password" replace />
  }

  return <>{children}</>
}

const AppContent = () => {
  const { i18n } = useTranslation()

  React.useEffect(() => {
    const language = localStorage.getItem('language') || 'en'
    i18n.changeLanguage(language)
    document.documentElement.lang = language
    if (language === 'ar') {
      document.documentElement.dir = 'rtl'
    } else {
      document.documentElement.dir = 'ltr'
    }
  }, [i18n])

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/reset-password"
        element={
          <ProtectedRoute>
            <ResetPasswordPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-birds"
        element={
          <ProtectedRoute>
            <MyBirdsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bird-recordings/:birdId"
        element={
          <ProtectedRoute>
            <BirdRecordingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/add-bird"
        element={
          <ProtectedRoute>
            <AddBirdPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload-recording"
        element={
          <ProtectedRoute>
            <UploadRecordingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-recordings"
        element={
          <ProtectedRoute>
            <MyRecordingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/judge-queue"
        element={
          <ProtectedRoute>
            <JudgeQueuePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/score-entry/:evaluationId"
        element={
          <ProtectedRoute>
            <ScoreEntryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-evaluations"
        element={
          <ProtectedRoute>
            <MyEvaluationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/evaluations/:recordingId"
        element={
          <ProtectedRoute>
            <EvaluationDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/judge-evaluation-history"
        element={
          <ProtectedRoute>
            <JudgeEvaluationHistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/judges"
        element={
          <ProtectedRoute>
            <AdminJudgesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/bird-types"
        element={
          <ProtectedRoute>
            <AdminBirdTypesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/scoring"
        element={
          <ProtectedRoute>
            <AdminScoringPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/retention"
        element={
          <ProtectedRoute>
            <AdminRetentionPage />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App

