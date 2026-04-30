import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyInvite, acceptInvite } from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { AlertCircle, CheckCircle2, Loader2, Lock } from 'lucide-react';

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
      .then(data => {
        setInviteData(data.user);
        setLoading(false);
      })
      .catch(err => {
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
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#38BDF8] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-normal text-white mb-2 font-outfit uppercase tracking-tight">ATS Outreach</h1>
          <p className="text-slate-400">Secure Invitation Acceptance</p>
        </div>

        <Card className="p-8 border-slate-800 bg-slate-900/50 backdrop-blur-xl">
          {success ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-normal text-white font-outfit uppercase tracking-tight">Account Activated!</h2>
              <p className="text-slate-400">
                Your password has been set successfully. Redirecting you to login...
              </p>
            </div>
          ) : error ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-normal text-white font-outfit uppercase tracking-tight">Invitation Error</h2>
              <p className="text-red-400">{error}</p>
              <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
                Back to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <p className="text-sm text-slate-400 mb-1">Invited User</p>
                <p className="text-white font-normal font-outfit uppercase tracking-tight">{inviteData?.full_name}</p>
                <p className="text-slate-500 text-sm">{inviteData?.email}</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> <span className="font-normal uppercase tracking-widest text-[10px]">New Password</span>
                  </label>
                  <Input
                    type="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-slate-950/50 border-slate-800 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4" /> <span className="font-normal uppercase tracking-widest text-[10px]">Confirm Password</span>
                  </label>
                  <Input
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="bg-slate-950/50 border-slate-800 text-white"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#38BDF8] hover:bg-[#0EA5E9] text-white font-normal uppercase tracking-widest py-3"
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Activate Account'
                )}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
