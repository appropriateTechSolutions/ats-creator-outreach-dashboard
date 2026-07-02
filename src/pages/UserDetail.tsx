import { hasRole, ROLE_GROUPS } from '../lib/constants';
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User as UserIcon,
  ArrowLeft,
  Mail,
  Shield,
  Calendar,
  Building2,
  RefreshCw,
  AlertCircle,
  Clock,
  Fingerprint,
  UserCheck,
  UserX,
  Activity,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { useUser } from '../hooks/queries';

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const { data: userData, isLoading: loading, refetch: refetchUser } = useUser(id);
  const [statusLoading, setStatusLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleToggleStatus = async () => {
    if (!id || !userData) return;
    setStatusLoading(true);
    try {
      await api.disableUser(id);
      await refetchUser();
    } catch (err: any) {
      showToast(api.getErrorMessage(err, 'Failed to update user status.'), 'error');
    } finally {
      setStatusLoading(false);
    }
  };

  const handleResendInvite = async () => {
    if (!id) return;
    setInviteLoading(true);
    try {
      await api.resendInvite(id);
      showToast('Invitation resent successfully!', 'success');
    } catch (err: any) {
      showToast(api.getErrorMessage(err, 'Failed to resend invitation.'), 'error');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!id || !userData) return;
    setShowDeleteConfirm(true);
  };

  const confirmDeleteUser = async () => {
    if (!id || !userData) return;
    setShowDeleteConfirm(false);
    setDeleteLoading(true);
    try {
      await api.deleteUser(id);
      navigate('/users');
    } catch (err: any) {
      showToast(api.getErrorMessage(err, 'Failed to delete user.'), 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20">
        <LoadingState message="Retrieving User Intelligence..." />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="p-20 text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
          User Identity Not Found
        </h2>
        <Link
          to="/users"
          className="text-primary-600 font-normal mt-4 inline-block uppercase tracking-widest text-xs"
        >
          Back to Users
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20 animate-[fadeIn_0.2s_ease]">
      {/* Header with responsive stacking */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-4">
          <Link
            to="/users"
            className="inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase"
          >
            <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" />{' '}
            BACK TO USERS
          </Link>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 text-primary-700 shadow-xl border border-primary-50 flex items-center justify-center font-normal text-2xl font-outfit uppercase shrink-0">
              {userData.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight leading-tight">
                  {userData.full_name}
                </h1>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-normal uppercase tracking-widest border ${
                    userData.status === 'active'
                      ? 'bg-green-50 text-green-600 border-green-100'
                      : userData.status === 'inactive'
                        ? 'bg-gray-100 text-gray-600 border-gray-200'
                        : 'bg-amber-50 text-amber-600 border-amber-100'
                  }`}
                >
                  {userData.status === 'inactive' ? 'deactive' : userData.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {hasRole(currentUser?.role, ROLE_GROUPS.MANAGE_USERS) && (
          <div className="flex flex-wrap gap-6 items-center">
            {userData.status === 'invited' ? (
              <Button
                variant="outline"
                onClick={handleResendInvite}
                disabled={inviteLoading}
                className="flex items-center gap-2"
              >
                {inviteLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw size={16} />
                )}
                Resend Invite
              </Button>
            ) : (
              <div className="flex flex-col items-start sm:items-end gap-2 sm:pl-6 sm:border-l border-gray-100">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-normal text-gray-500 uppercase tracking-widest">
                    Account Status
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleStatus}
                      disabled={statusLoading}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${userData.status === 'active' ? 'bg-primary-600' : 'bg-gray-200'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${userData.status === 'active' ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest ${userData.status === 'active' ? 'text-primary-600' : 'text-gray-400'}`}
                    >
                      {userData.status === 'active' ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 1. Profile Intelligence Table */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-xs font-normal text-gray-900 uppercase tracking-widest flex items-center gap-2 font-outfit">
            <UserIcon size={16} className="text-primary-600" /> Core User Intelligence
          </h2>
          <div
            className={`text-[10px] font-normal px-3 py-1 rounded-full uppercase tracking-widest border ${
              userData.user_type === 'internal'
                ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                : 'bg-amber-50 text-amber-600 border-amber-100'
            }`}
          >
            {userData.user_type} IDENTITY
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="px-8 py-5 w-64 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">
                  Full Name
                </td>
                <td className="px-8 py-5 text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit">
                  {userData.full_name}
                </td>
              </tr>
              <tr>
                <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">
                  Email Address
                </td>
                <td className="px-8 py-5">
                  <div className="text-primary-600 font-normal text-sm flex items-center gap-2">
                    <Mail size={14} /> {userData.email}
                  </div>
                </td>
              </tr>
              <tr>
                <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">
                  Client
                </td>
                <td className="px-8 py-5 text-sm font-normal text-gray-900 uppercase tracking-tight flex items-center gap-2 font-outfit">
                  <Building2 size={14} className="text-gray-400" />
                  {userData.Client?.name || 'Internal - All Access'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* 2. Security & Access Parameters */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xs font-normal text-gray-900 uppercase tracking-widest flex items-center gap-2 font-outfit">
            <Fingerprint size={16} className="text-primary-600" /> Security & Access Control
          </h3>
        </div>
        <table className="w-full text-left">
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className="px-8 py-5 w-64 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">
                Authorization Level
              </td>
              <td className="px-8 py-5">
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-amber-500" />
                  <span className="text-sm font-normal text-gray-900 uppercase tracking-widest">
                    {(userData.role || '').replace('_', ' ') || '---'}
                  </span>
                </div>
              </td>
            </tr>
            <tr>
              <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">
                Status
              </td>
              <td className="px-8 py-5">
                <div className="flex items-center gap-2">
                  {userData.status === 'active' ? (
                    <UserCheck className="text-green-500" size={16} />
                  ) : userData.status === 'inactive' ? (
                    <AlertCircle className="text-gray-400" size={16} />
                  ) : (
                    <UserX className="text-amber-500" size={16} />
                  )}
                  <span
                    className={`text-sm font-normal uppercase tracking-widest ${
                      userData.status === 'active'
                        ? 'text-green-600'
                        : userData.status === 'inactive'
                          ? 'text-gray-600'
                          : 'text-amber-600'
                    }`}
                  >
                    {userData.status === 'inactive' ? 'deactive' : userData.status}
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* 3. Activity Tracking */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-xs font-normal text-gray-900 uppercase tracking-widest flex items-center gap-2 font-outfit">
            <Activity size={16} className="text-primary-600" /> Activity Intelligence
          </h2>
        </div>
        <table className="w-full text-left">
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className="px-8 py-5 w-64 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">
                Created
              </td>
              <td className="px-8 py-5 text-sm font-normal text-gray-900">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" />
                  {userData.created_at || (userData as any).createdAt
                    ? new Date(
                        userData.created_at || (userData as any).createdAt,
                      ).toLocaleDateString(undefined, { dateStyle: 'full' })
                    : '---'}
                </div>
              </td>
            </tr>
            <tr>
              <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">
                Last Active Presence
              </td>
              <td className="px-8 py-5 text-sm font-normal text-gray-900">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  {userData.last_login_at
                    ? new Date(userData.last_login_at).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : 'No Activity Registered'}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm border-none shadow-3xl bg-white rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-normal text-gray-900 mb-2 font-outfit uppercase tracking-tight">
                Delete User?
              </h3>
              <p className="text-sm font-normal text-gray-500 mb-6 font-outfit">
                Are you sure you want to permanently delete{' '}
                <strong className="text-gray-900">{userData.full_name}</strong>?
              </p>
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  className="flex-1 font-normal uppercase tracking-widest text-[10px]"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-normal uppercase tracking-widest text-[10px] shadow-xl shadow-red-500/20"
                  onClick={confirmDeleteUser}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? <LoadingState mini /> : 'Delete User'}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
      {/* Floating Actions */}
      {hasRole(currentUser?.role, ROLE_GROUPS.MANAGE_USERS) &&
        !['invited', 'deleted'].includes(userData.status || '') && (
          <button
            type="button"
            onClick={handleDeleteUser}
            disabled={deleteLoading}
            className="fixed bottom-8 right-8 w-12 h-12 bg-white text-red-600 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-red-100 flex items-center justify-center hover:bg-red-50 hover:scale-110 active:scale-95 transition-all z-[60] group disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Delete user"
            title="Delete User"
          >
            {deleteLoading ? (
              <RefreshCw size={20} className="animate-spin text-red-600" />
            ) : (
              <Trash2 size={21} className="group-hover:rotate-12 transition-transform" />
            )}
          </button>
        )}
    </div>
  );
}
