import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../lib/api';
import { Button } from '../components/ui/Button';
import { Activity, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      await forgotPassword(email);
      setSubmitted(true);
      setMessage('If an account exists, a reset link has been sent to your email.');
    } catch (err: any) {
      setError(err?.message || err || 'Something went failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/30">
            <Activity className="text-white" size={28} />
          </div>
        </div>
        <h2 className="text-center text-3xl font-normal text-gray-900 tracking-tight font-outfit uppercase">
          Reset Password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          We'll send you a link to reset your password
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl shadow-gray-200/50 sm:rounded-2xl sm:px-10 border border-gray-100">
          {submitted ? (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center text-green-500">
                  <CheckCircle size={40} />
                </div>
              </div>
              <p className="text-gray-600">{message}</p>
              <Link to="/login">
                <Button className="w-full mt-4">Back to Login</Button>
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-normal text-gray-700 mb-1 uppercase tracking-widest">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-all"
                  placeholder="you@example.com"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full py-3 rounded-xl disabled:opacity-70"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending Link...' : 'Send Reset Link'}
              </Button>

              <div className="text-center">
                <Link to="/login" className="inline-flex items-center text-sm text-primary-600 hover:text-primary-500 transition-colors">
                  <ArrowLeft size={16} className="mr-1" /> Back to Login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
