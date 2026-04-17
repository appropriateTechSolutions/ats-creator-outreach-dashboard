import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Campaigns from './pages/Campaigns'
import CampaignDetail from './pages/CampaignDetail'
import LoginPage from './pages/LoginPage'
import { getMe, logout } from './lib/api'
import type { AuthUser } from './types'

export default function App() {
  const existingToken = localStorage.getItem('ats_token')
  const [user, setUser] = useState<AuthUser | null>(null)
  const [checking, setChecking] = useState(Boolean(existingToken))

  useEffect(() => {
    if (!existingToken) {
      return
    }

    getMe()
      .then((u) => setUser(u))
      .catch(() => localStorage.removeItem('ats_token'))
      .finally(() => setChecking(false))
  }, [existingToken])

  const handleLogin = (u: AuthUser, token: string) => {
    localStorage.setItem('ats_token', token)
    setUser(u)
  }

  const handleLogout = async () => {
    await logout()
    setUser(null)
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
      </div>
    )
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <BrowserRouter>
      <Layout userName={user.full_name} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
