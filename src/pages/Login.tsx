import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getErrorMessage } from '../lib/api';
import { Button } from '../components/ui/Button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(getErrorMessage(err, 'Login failed. Please check your credentials.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/qui-logo.png" alt="Qui Tequila" className="h-28 w-auto object-contain" />
        </div>
        <h2 className="text-center text-3xl font-normal text-gray-900 tracking-tight font-outfit uppercase">
          Welcome to Qui Tequila Creator Outreach
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to manage your influencer campaigns
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-error-50 text-error-700 text-sm rounded-lg border border-error-100 font-normal">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="login-1"
                className="block text-sm font-normal text-gray-700 mb-1 uppercase tracking-widest"
              >
                Email address
              </label>
              <input
                id="login-1"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="login-2"
                className="block text-sm font-normal text-gray-700 mb-1 uppercase tracking-widest"
              >
                Password
              </label>
              <input
                id="login-2"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all"
                placeholder="••••••••"
              />
              <div className="mt-2 text-right">
                <Link
                  to="/forgot-password"
                  title="Reset your password"
                  className="text-sm font-normal text-primary-600 hover:text-primary-500 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-3 rounded-xl disabled:opacity-70"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
