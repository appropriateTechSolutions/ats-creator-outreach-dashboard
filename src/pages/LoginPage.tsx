import { useState } from 'react'
import { login } from '../lib/api'
import type { AuthUser } from '../types'

interface LoginPageProps {
  onLogin: (user: AuthUser, token: string) => void
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(email, password)
      onLogin(result.user, result.access_token)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="h-16 w-16 editorial-gradient rounded-3xl flex items-center justify-center text-white mb-5 shadow-xl">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
          </div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">ATS Outreach</h1>
          <p className="text-sm text-outline mt-2">Influencer Discovery & Management Platform</p>
        </div>

        {/* Login Card */}
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest p-8 rounded-3xl shadow-lg">
          <h2 className="font-headline text-xl font-bold mb-6">Sign In</h2>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-error-container/30 text-error text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-outline uppercase tracking-widest mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-surface-container border border-outline-variant/30 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-sm"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 py-3.5 rounded-xl editorial-gradient text-white font-bold text-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
