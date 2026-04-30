import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShoppingBag, 
  ArrowLeft, 
  ArrowRight,
  Globe, 
  Tag, 
  FileText,
  Target,
  Megaphone,
  AlertCircle,
  Percent,
  Calendar,
  Building2,
  RefreshCw,
  ExternalLink,
  Shield,
  BarChart3,
  CheckCircle2,
  Users
} from 'lucide-react';
import * as api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface Brand {
  id: string;
  name: string;
  website: string;
  industry: string;
  product_category: string;
  brand_description: string;
  target_audience: string;
  brand_voice: string;
  restrictions: string;
  affiliate_terms: string;
  product_offer_notes: string;
  default_commission_percent: string;
  status: string;
  notes: string;
  created_at: string;
  Client?: {
    id: string;
    name: string;
  };
  campaigns?: Campaign[];
}

export default function BrandDetail() {
  const { id } = useParams<{ id: string }>();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBrand = async () => {
      if (!id) return;
      try {
        const data = await api.getBrandById(id);
        setBrand(data);
      } catch (err) {
        console.error('Failed to fetch brand details', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBrand();
  }, [id]);

  if (loading) {
    return (
      <div className="p-20 text-center text-gray-400">
        <RefreshCw className="animate-spin mx-auto mb-4 text-primary-500" size={40} />
        <p className="font-normal text-lg">Retrieving Brand Intelligence...</p>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="p-20 text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Brand Identity Not Found</h2>
        <Link to="/brands" className="text-primary-600 font-normal mt-4 inline-block">Back to Portfolio</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 animate-[fadeIn_0.3s_ease]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Link to="/brands" className="inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase">
            <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" /> BACK TO PORTFOLIO
          </Link>
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-white shadow-xl border border-gray-100 flex items-center justify-center text-primary-600">
              <ShoppingBag size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight leading-none">{brand.name}</h1>
                <span className={`px-2 py-0.5 rounded text-[10px] font-normal uppercase tracking-widest border ${
                  brand.status === 'active' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                }`}>
                  {brand.status}
                </span>
              </div>
              <p className="text-gray-400 font-normal text-xs uppercase tracking-widest mt-1 flex items-center gap-2">
                <Building2 size={14} className="text-primary-500" /> Agency Tenant: {brand.Client?.name || 'Internal'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 1. Brand Intelligence Table */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <FileText size={16} className="text-primary-600" /> Core Brand Intelligence
          </h2>
          <div className="text-[10px] font-normal text-primary-600 bg-primary-50 px-3 py-1 rounded-full uppercase tracking-widest border border-primary-100">
            {brand.industry}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-gray-50">
              <tr>
                <td className="px-8 py-5 w-64 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Product Category</td>
                <td className="px-8 py-5 text-sm font-normal text-gray-900 uppercase tracking-tight">{brand.product_category || 'N/A'}</td>
              </tr>
              <tr>
                <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Official Website</td>
                <td className="px-8 py-5">
                  <a href={brand.website} target="_blank" rel="noreferrer" className="text-primary-600 font-normal text-sm flex items-center gap-2 hover:underline">
                    <Globe size={14} /> {brand.website || 'No URL Provided'}
                  </a>
                </td>
              </tr>
              <tr>
                <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Market Description</td>
                <td className="px-8 py-5 text-sm font-medium text-gray-600 leading-relaxed">{brand.brand_description || '---'}</td>
              </tr>
              <tr>
                <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Target Demographic</td>
                <td className="px-8 py-5 text-sm font-medium text-gray-600 leading-relaxed">{brand.target_audience || '---'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* 2. Creative Parameters */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <Megaphone size={16} className="text-primary-600" /> Creative Parameters
          </h3>
        </div>
        <table className="w-full text-left">
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className="px-8 py-5 w-64 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Brand Voice</td>
              <td className="px-8 py-5 text-sm font-normal text-gray-900">{brand.brand_voice || 'N/A'}</td>
            </tr>
            <tr>
              <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Content Restrictions</td>
              <td className="px-8 py-5 text-sm font-normal text-red-600 bg-red-50/20">{brand.restrictions || 'No Constraints'}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* 3. Commercial Terms */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <Percent size={16} className="text-primary-600" /> Commercial Terms
          </h3>
        </div>
        <table className="w-full text-left">
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className="px-8 py-5 w-64 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Default Commission</td>
              <td className="px-8 py-5">
                <div className="text-xl font-normal text-primary-600">{brand.default_commission_percent}%</div>
              </td>
            </tr>
            <tr>
              <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-normal text-gray-400 uppercase tracking-widest border-r border-gray-50">Affiliate Terms</td>
              <td className="px-8 py-5 text-xs font-medium text-gray-600 leading-relaxed">{brand.affiliate_terms || 'Standard terms apply.'}</td>
            </tr>
          </tbody>
        </table>
      </Card>

      {/* 3. Operational Integrity Table */}
      <Card className="border-none shadow-2xl overflow-hidden bg-white">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <Shield size={16} className="text-primary-600" /> Operational Integrity
          </h2>
        </div>
        <table className="w-full text-left">
          <tbody className="divide-y divide-gray-50">
            <tr>
              <td className="px-8 py-5 w-64 bg-gray-50/30 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-50">Product Offer Notes</td>
              <td className="px-8 py-5 text-sm font-medium text-gray-600 leading-relaxed">{brand.product_offer_notes || 'No specific offer notes.'}</td>
            </tr>
            <tr>
              <td className="px-8 py-5 bg-gray-50/30 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-50">Notes</td>
              <td className="px-8 py-5 text-sm font-medium text-gray-400 italic">{brand.notes || 'No notes registered.'}</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
