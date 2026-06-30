import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Edit3, Eye } from 'lucide-react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';

interface CreatorContentSectionProps {
  creatorContent: any[];
  creatorId: string;
  contentActionLoading: boolean;
  partnerships: any[];
  handleContentAction: (contentId: string, action: string) => Promise<void>;
  handleOpenEditContent: (content: any) => void;
  setShowAddContentModal: (show: boolean) => void;
  handleOpenEmailRequirements: () => void;
}

export function CreatorContentSection({
  creatorContent,
  creatorId,
  contentActionLoading,
  partnerships,
  handleContentAction,
  handleOpenEditContent,
  setShowAddContentModal,
  handleOpenEmailRequirements
}: CreatorContentSectionProps) {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700">Content Deliverables</h3>
          <p className="text-xs text-gray-400 mt-0.5">Track deliverables, reviews, and published metrics.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {creatorContent.length > 0 && (
            <Button size="sm" onClick={handleOpenEmailRequirements} className="bg-amber-600 hover:bg-amber-700 text-white font-normal uppercase tracking-widest text-[9px] h-9 px-3">
              Send Email of Requirements
            </Button>
          )}
          {partnerships.length > 0 ? (
            <Button size="sm" onClick={() => setShowAddContentModal(true)} className="bg-primary-600 hover:bg-primary-700 text-white font-normal uppercase tracking-widest text-[9px] h-9 px-3">
              + Add Deliverable
            </Button>
          ) : (
            <span className="text-[10px] text-gray-400 uppercase italic">Add to a campaign first</span>
          )}
        </div>
      </div>

      {creatorContent.length === 0 ? (
        <div className="p-8 text-center bg-gray-50/50 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500 font-medium">No content deliverables found.</p>
          <p className="text-xs text-gray-400 mt-1">Content requirements will appear here once created.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Platform & Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Metrics</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {creatorContent.map((c) => (
                  <tr 
                    key={c.id} 
                    onClick={() => navigate(`/content/${c.id}`, { state: { fromCreatorId: creatorId } })}
                    className="hover:bg-primary-50/10 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4 align-middle">
                      <div className="text-xs font-normal text-gray-900 font-outfit uppercase tracking-tight whitespace-nowrap">
                        {c.Campaign?.name}
                      </div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <div className="text-xs font-medium text-gray-800 flex items-center gap-1.5 capitalize">
                        {c.platform} <span className="text-gray-300">•</span> {c.content_type.replace('_', ' ')}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Due: {new Date(c.due_date).toLocaleDateString()}</div>
                    </td>
                    <td className="px-4 py-4 align-middle">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-4 align-middle text-right">
                      {c.status === 'published' ? (
                        <div className="text-[10px] font-mono text-gray-600 flex justify-end items-center gap-3">
                          <span className="flex items-center gap-1" title="Views">{c.views || 0} <Eye size={12}/></span>
                          <span className="flex items-center gap-1" title="Likes">{c.likes || 0} <Heart size={12}/></span>
                          <span className="flex items-center gap-1" title="Comments">{c.comments || 0} <MessageCircle size={12}/></span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400 uppercase italic">Not published</span>
                      )}
                    </td>
                    <td className="px-4 py-4 align-middle text-center relative z-10" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        {c.status === 'submitted' && (
                          <>
                            <Button size="sm" disabled={contentActionLoading} className="bg-green-600 hover:bg-green-700 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => handleContentAction(c.id, 'approve')}>
                              Approve
                            </Button>
                            <Button size="sm" disabled={contentActionLoading} className="bg-amber-600 hover:bg-amber-700 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => handleContentAction(c.id, 'revise')}>
                              Revise
                            </Button>
                          </>
                        )}
                        {c.status === 'approved' && (
                          <Button size="sm" disabled={contentActionLoading} className="bg-primary-600 hover:bg-primary-700 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => handleContentAction(c.id, 'publish')}>
                            Publish
                          </Button>
                        )}
                        {c.status === 'published' && (
                          <Button size="sm" disabled={contentActionLoading} className="bg-gray-800 hover:bg-gray-900 text-white font-normal uppercase tracking-widest text-[9px] min-h-[28px] px-2" onClick={() => handleContentAction(c.id, 'sync')}>
                            Sync
                          </Button>
                        )}
                        {['pending', 'revision_requested', 'rejected'].includes(c.status) && (
                          <button 
                            onClick={() => handleOpenEditContent(c)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                            title="Edit requirement details"
                          >
                            <Edit3 size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
