import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPassword, getErrorMessage } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Activity, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await resetPassword({ token, newPassword: password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      setError(getErrorMessage(err, 'Failed to reset password.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl rounded-2xl border border-gray-100 text-center space-y-4">
            <div className="flex justify-center">
              <AlertCircle size={48} className="text-red-500" />
            </div>
            <h2 className="text-xl font-semibold">Invalid Reset Link</h2>
            <p className="text-gray-600">
              The reset token is missing or invalid. Please request a new link.
            </p>
            <Link to="/forgot-password">
              <Button className="w-full mt-4">Request New Link</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/30">
            <Activity className="text-white" size={28} />
          </div>
        </div>
        <h2 className="text-center text-3xl font-normal text-gray-900 tracking-tight font-outfit uppercase">
          Set New Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">Enter your new password below</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
          {success ? (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                  <CheckCircle size={40} />
                </div>
              </div>
              <p className="text-gray-600">Password reset successfully! Redirecting to login...</p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="resetpassword-1"
                  className="block text-sm font-normal text-gray-700 mb-1 uppercase tracking-widest"
                >
                  New Password
                </label>
                <input
                  id="resetpassword-1"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label
                  htmlFor="resetpassword-2"
                  className="block text-sm font-normal text-gray-700 mb-1 uppercase tracking-widest"
                >
                  Confirm Password
                </label>
                <input
                  id="resetpassword-2"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>

              <Button
                type="submit"
                className="w-full py-3 rounded-xl disabled:opacity-70"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
