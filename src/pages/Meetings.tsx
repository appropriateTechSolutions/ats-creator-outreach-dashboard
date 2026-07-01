import { logger } from '../lib/logger';
import { hasRole, ROLE_GROUPS } from '../lib/constants';
import { useState, useMemo } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/StatusBadge';
import {
  Calendar,
  Video,
  CheckCircle,
  Search,
  Clock,
  ExternalLink,
  UserCheck,
  AlertCircle,
  Plus,
  Send,
} from 'lucide-react';
import { approvePartner, bookMeeting } from '../lib/api';
import { useMeetings, useAllCreators } from '../hooks/queries';
import { format } from 'date-fns';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { useAuth } from '../contexts/AuthContext';

export default function Meetings() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { data: meetings = [], isLoading: mLoading, refetch: refetchMeetings } = useMeetings();
  const { data: allCreators = [], isLoading: cLoading } = useAllCreators();
  const loading = mLoading || cLoading;

  // PRD: only surface creators who have actually replied / shown interest.
  const creators = useMemo(
    () =>
      allCreators.filter((c) => {
        const isPositiveStatus = ['replied', 'engaged', 'qualified'].includes(
          c.lifecycle_status || '',
        );
        const aiDetectedInterest =
          c.conversation?.detected_intent === 'interested' || c.conversation?.interested === true;
        const hasMessage =
          !!c.conversation?.latest_inbound_message &&
          c.conversation.latest_inbound_message.trim().length > 0;
        return isPositiveStatus || aiDetectedInterest || hasMessage;
      }),
    [allCreators],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedCreatorId, setSelectedCreatorId] = useState('');
  const [bookingLink, setBookingLink] = useState('https://calendly.com/ats-outreach/discovery');

  const handleInvite = async () => {
    if (!selectedCreatorId) return;
    try {
      // Logic to "send" link (In real app this might trigger an email)
      // Here we log it as a meeting in 'scheduling_pending' or 'booking_link_sent' status
      const creator = creators.find((c) => c.id === selectedCreatorId);
      const metadata = {
        booking_channel: 'calendly',
        meeting_link: bookingLink,
        booking_link_sent_at: new Date().toISOString(),
        detailed_status: 'booking_link_sent',
      };

      // We use a placeholder date for now since it's not booked yet
      await bookMeeting(
        selectedCreatorId,
        creator?.campaign_id || '',
        new Date().toISOString(),
        JSON.stringify(metadata),
      );

      showToast(
        'Booking link sent! The creator has been added to the scheduling queue.',
        'success',
      );
      setIsInviteModalOpen(false);
      refetchMeetings();
    } catch (err) {
      logger.error('Detailed Invite Error:', err);
      showToast(
        'Failed to send invite: ' + (err instanceof Error ? err.message : String(err)),
        'error',
      );
    }
  };

  const handleApprove = async (meetingId: string) => {
    try {
      const isConfirmed = await confirm({
        title: 'Approve Partner',
        message:
          'Do you want to finalize this conversion, approve them as a partner, and generate an affiliate code?',
        confirmText: 'Approve',
        isDestructive: false,
      });
      if (!isConfirmed) return;

      await approvePartner(meetingId);
      showToast('Approved! Partner successfully onboarded and tracking code generated.', 'success');
      refetchMeetings();
    } catch (err) {
      showToast('Failed to finalize partner onboarding.', 'error');
    }
  };

  // Helper to parse JSON notes
  const getMetadata = (notes: string) => {
    try {
      if (notes && (notes.startsWith('{') || notes.startsWith('['))) {
        return JSON.parse(notes);
      }
      return { legacy_notes: notes };
    } catch (e) {
      return { legacy_notes: notes };
    }
  };

  const filteredMeetings = meetings.filter((m) => {
    const handle = m.Creator?.handle?.toLowerCase() || '';
    const name = m.Creator?.display_name?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return handle.includes(query) || name.includes(query);
  });

  const stats = {
    scheduled: meetings.filter((m) => m.status === 'scheduled').length,
    completed: meetings.filter((m) => m.status === 'completed').length,
    noShow: meetings.filter((m) => m.status === 'no_show').length,
    approved: meetings.filter((m) => m.outcome === 'approved').length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-[fadeIn_0.2s_ease]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 mb-1 font-outfit uppercase tracking-tight">
            Meetings & Conversions
          </h1>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          {hasRole(user?.role, ROLE_GROUPS.MANAGE_CREATORS) && (
            <Button
              onClick={() => setIsInviteModalOpen(true)}
              icon={<Plus size={16} />}
              className="whitespace-nowrap"
            >
              Invite Creator
            </Button>
          )}
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 bg-white shadow-sm transition-all focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Calendar size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-normal tracking-widest">
                Scheduled
              </div>
              <div className="text-xl font-normal text-gray-900">{stats.scheduled}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg text-green-600">
              <CheckCircle size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-normal tracking-widest">
                Completed
              </div>
              <div className="text-xl font-normal text-gray-900">{stats.completed}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <AlertCircle size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-normal tracking-widest">
                No Show
              </div>
              <div className="text-xl font-normal text-gray-900">{stats.noShow}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-l-4 border-l-primary-500">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 rounded-lg text-primary-600">
              <UserCheck size={20} />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase font-normal tracking-widest">
                Approved
              </div>
              <div className="text-xl font-normal text-gray-900">{stats.approved}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        {loading ? (
          <div className="p-16">
            <LoadingState message="Synchronizing Meeting Pipeline..." />
          </div>
        ) : filteredMeetings.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={Calendar}
              title="No Meetings Found"
              description={
                searchQuery
                  ? 'No creators match your search criteria.'
                  : 'Leads that book a call via Calendly or manual links will automatically appear here.'
              }
            />
          </div>
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Creator Lead</Th>
                <Th>Meeting Date & Time</Th>
                <Th>Source</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {filteredMeetings.map((m) => {
                const metadata = getMetadata(m.meeting_notes || '');
                const isCalendly = metadata.booking_channel === 'calendly';

                return (
                  <Tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center font-normal text-sm uppercase shadow-sm font-outfit">
                          {m.Creator?.handle?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <div className="font-normal text-gray-900 font-outfit uppercase tracking-tight">
                            @{m.Creator?.handle}
                          </div>
                          <div className="text-xs text-gray-500 font-normal">
                            Campaign: {m.Campaign?.name || 'Organic'}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5 font-normal text-gray-900 text-sm">
                          <Calendar size={14} className="text-primary-500" />
                          {format(new Date(m.meeting_date), 'MMM dd, yyyy')}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                          <Clock size={14} />
                          {format(new Date(m.meeting_date), 'hh:mm a')}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        {isCalendly ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-normal uppercase bg-blue-50 text-blue-700 border border-blue-100 tracking-widest">
                            Calendly
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-normal uppercase bg-gray-50 text-gray-600 border border-gray-100 tracking-widest">
                            Manual
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={m.status} />
                        {m.outcome === 'approved' && (
                          <span className="text-[10px] font-normal text-green-600 flex items-center gap-0.5 uppercase tracking-widest">
                            <CheckCircle size={10} /> Approved
                          </span>
                        )}
                        {m.outcome === 'rejected' && (
                          <span className="text-[10px] font-normal text-red-600 flex items-center gap-0.5 uppercase tracking-widest">
                            <AlertCircle size={10} /> Rejected
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td className="text-right">
                      <div className="flex gap-2 justify-end">
                        {metadata.meeting_link && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(metadata.meeting_link, '_blank')}
                            className="bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100"
                            icon={<Video size={14} />}
                          >
                            Join
                          </Button>
                        )}
                        {m.outcome === 'pending' && m.status !== 'completed' ? (
                          hasRole(user?.role, ROLE_GROUPS.MANAGE_CREATORS) ? (
                            <Button
                              size="sm"
                              onClick={() => handleApprove(m.id)}
                              className="shadow-sm"
                            >
                              Finalize
                            </Button>
                          ) : null
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="opacity-50 cursor-default"
                            disabled
                            icon={<CheckCircle size={14} />}
                          >
                            Done
                          </Button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        )}
      </Card>

      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Invite Creator to Discovery Call"
      >
        <div className="space-y-4 pt-2">
          <div>
            <label
              htmlFor="meetings-1"
              className="block text-sm font-normal text-gray-700 mb-1 uppercase tracking-widest"
            >
              Select Qualified Creator
            </label>
            <select
              id="meetings-1"
              className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
              value={selectedCreatorId}
              onChange={(e) => setSelectedCreatorId(e.target.value)}
            >
              <option value="">-- Choose a creator --</option>
              {creators.length === 0 && <option disabled>No creators available</option>}
              {creators.map((c) => (
                <option key={c.id} value={c.id}>
                  @{c.handle} ({c.full_name || 'No Name'})
                </option>
              ))}
            </select>
            <p className="text-[10px] text-gray-500 mt-1 italic">
              Only creators who have replied or are qualified are shown here.
            </p>
          </div>

          <div>
            <label
              htmlFor="meetings-2001"
              className="block text-sm font-normal text-gray-700 mb-1 uppercase tracking-widest"
            >
              Calendly / Booking Link
            </label>
            <div className="flex gap-2">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ExternalLink size={14} className="text-gray-400" />
                </div>
                <input
                  id="meetings-2001"
                  type="text"
                  value={bookingLink}
                  onChange={(e) => setBookingLink(e.target.value)}
                  className="w-full pl-9 p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:outline-none"
                  placeholder="https://calendly.com/your-link"
                />
              </div>
            </div>
          </div>

          <div className="bg-primary-50 p-3 rounded-lg border border-primary-100 flex gap-3">
            <div className="text-primary-600 mt-0.5">
              <Send size={18} />
            </div>
            <div>
              <p className="text-xs font-normal text-primary-900 uppercase tracking-widest">
                What happens next?
              </p>
              <p className="text-[11px] text-primary-700 leading-relaxed mt-0.5">
                The system will log this invitation. When the creator books via this link, your
                dashboard will update to "Booked" automatically.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={!selectedCreatorId}>
              Send Invitation
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
