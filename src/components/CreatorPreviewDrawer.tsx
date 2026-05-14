import React from 'react';
import { Link } from 'react-router-dom';
import { Drawer } from './ui/Drawer';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/StatusBadge';
import { ScoreBadge } from './ui/ScoreBadge';
import { Instagram, Youtube, Activity, MapPin, Sparkles, ExternalLink, ArrowRight } from 'lucide-react';
import type { Creator } from '../types';

interface CreatorPreviewDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  creator: Creator | null;
  campaignId: string;
}

export function CreatorPreviewDrawer({ isOpen, onClose, creator, campaignId }: CreatorPreviewDrawerProps) {
  if (!creator) return null;

  return (
    <Drawer 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Creator Preview"
      footer={
        <Link 
          to={`/creators/${creator.id}`} 
          state={{ fromCampaignId: campaignId }}
          className="block"
        >
          <Button className="w-full h-12 uppercase tracking-widest text-[11px] font-normal" icon={<ArrowRight size={16} />}>
            Open Full Profile
          </Button>
        </Link>
      }
    >
      <div className="space-y-8 pb-8">
        {/* Header Section */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center font-normal text-2xl uppercase shadow-md">
            {creator.handle?.charAt(0)}
          </div>
          <div>
            <h3 className="text-xl font-normal text-gray-900 font-outfit uppercase tracking-tight">{creator.full_name || 'No Name'}</h3>
            <div className="flex items-center gap-2 text-gray-500 mt-0.5">
              <span className="text-sm font-medium">@{creator.handle}</span>
              <a 
                href={`https://instagram.com/${creator.handle?.replace(/^@/, '')}`} 
                target="_blank" 
                rel="noreferrer"
                className="text-gray-300 hover:text-primary-500"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </div>

        {/* Status & Scores */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-normal">Status</p>
            <StatusBadge status={['not_respond'].includes(creator.lifecycle_status) ? creator.lifecycle_status : (creator.review_status as any || 'pending')} />
          </div>
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-normal">Relevance</p>
            <ScoreBadge score={creator.relevance_score || 0} />
          </div>
        </div>

        {/* Summary */}
        <div>
          <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
            <Sparkles size={12} className="text-primary-600" /> AI Summary
          </h4>
          <p className="text-sm text-gray-700 leading-relaxed italic border-l-2 border-primary-200 pl-4">
            {creator.notes || "AI summary not available for this lead."}
          </p>
        </div>

        {/* Bio */}
        <div>
          <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-2">About / Bio</h4>
          <p className="text-sm text-gray-600 leading-relaxed">
            {creator.bio || "No biography provided."}
          </p>
        </div>

        {/* Location */}
        <div>
          <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
            <MapPin size={12} className="text-gray-400" /> Location
          </h4>
          <p className="text-sm text-gray-800 capitalize">
            {creator.city ? `${creator.city}${creator.country ? `, ${creator.country}` : ''}` : 'Location Unknown'}
          </p>
        </div>

        {/* Platforms */}
        <div>
          <h4 className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-3">Active Platforms</h4>
          <div className="flex gap-4">
            {creator.has_instagram && (
              <div className="flex items-center gap-1.5 text-[#E1306C]">
                <Instagram size={18} />
                <span className="text-xs font-medium uppercase tracking-wider">Instagram</span>
              </div>
            )}
            {creator.has_youtube && (
              <div className="flex items-center gap-1.5 text-[#FF0000]">
                <Youtube size={18} />
                <span className="text-xs font-medium uppercase tracking-wider">YouTube</span>
              </div>
            )}
            {creator.has_tiktok && (
              <div className="flex items-center gap-1.5 text-gray-900">
                <Activity size={18} />
                <span className="text-xs font-medium uppercase tracking-wider">TikTok</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Drawer>
  );
}
