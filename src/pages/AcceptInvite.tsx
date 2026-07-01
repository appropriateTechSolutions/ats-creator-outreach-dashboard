import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyInvite, acceptInvite } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { LoadingState } from '../components/ui/LoadingState';
import { APP_NAME } from '../lib/constants';

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inviteData, setInviteData] = useState<any>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing invitation token.');
      setLoading(false);
      return;
    }

    verifyInvite(token)
      .then((data) => {
        setInviteData(data.user);
        setLoading(false);
      })
      .catch((err) => {
        setError(err || 'Failed to verify invitation.');
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await acceptInvite({ token: token!, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err || 'Failed to accept invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingState message="Verifying Identity..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-normal text-gray-900 mb-2 font-outfit uppercase tracking-tight">
            {APP_NAME}
          </h1>
          <p className="text-gray-500 font-normal uppercase tracking-widest text-[10px]">
            Secure Invitation Acceptance
          </p>
        </div>

        <Card className="p-10 border-gray-100 bg-white shadow-2xl shadow-gray-200/50 rounded-[24px]">
          {success ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
                Account Activated!
              </h2>
              <p className="text-gray-500 font-normal">
                Your password has been set successfully. Redirecting you to login...
              </p>
            </div>
          ) : error ? (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h2 className="text-xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
                Invitation Error
              </h2>
              <p className="text-red-500 font-normal">{error}</p>
              <Button
                onClick={() => navigate('/login')}
                variant="ghost"
                className="w-full uppercase tracking-widest text-[10px] font-normal"
              >
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-2">
                  Invited User
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-normal uppercase font-outfit">
                    {inviteData?.full_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-gray-900 font-normal font-outfit uppercase tracking-tight">
                      {inviteData?.full_name}
                    </p>
                    <p className="text-gray-500 text-xs">{inviteData?.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="acceptinvite-2001"
                    className="text-[10px] font-normal text-gray-500 uppercase tracking-widest flex items-center gap-2 px-1"
                  >
                    <Lock className="w-3 h-3" /> New Password
                  </label>
                  <Input
                    id="acceptinvite-2001"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white border-gray-200 h-12 rounded-xl focus:ring-primary-500/20"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="acceptinvite-2002"
                    className="text-[10px] font-normal text-gray-500 uppercase tracking-widest flex items-center gap-2 px-1"
                  >
                    <Lock className="w-3 h-3" /> Confirm Password
                  </label>
                  <Input
                    id="acceptinvite-2002"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-white border-gray-200 h-12 rounded-xl focus:ring-primary-500/20"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-normal uppercase tracking-widest py-6 rounded-xl shadow-xl shadow-primary-500/20"
                disabled={submitting}
              >
                {submitting ? <LoadingState mini /> : 'Activate Account'}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
