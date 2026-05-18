import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  MousePointer2, 
  ShoppingCart, 
  DollarSign, 
  Filter, 
  Search,
  ExternalLink,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/LoadingState';
import { getAffiliatePerformance, getCampaigns, updateAffiliateStatus } from '../lib/api';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

export default function AffiliatePerformance() {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [search, setSearch] = useState('');
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchPerformance = async () => {
    setLoading(true);
    try {
      const [perfData, campaignsData] = await Promise.all([
        getAffiliatePerformance(selectedCampaign || undefined),
        getCampaigns()
      ]);
      setData(perfData);
      setCampaigns(campaignsData);
    } catch (err) {
      console.error('Failed to fetch affiliate data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [selectedCampaign]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      await updateAffiliateStatus(id, newStatus);
      fetchPerformance();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const filteredData = data.filter(item => 
    item.Creator?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.affiliate_code?.toLowerCase().includes(search.toLowerCase())
  );

  const totals = filteredData.reduce((acc, curr) => ({
    clicks: acc.clicks + (curr.clicks || 0),
    conversions: acc.conversions + (curr.conversions || 0),
    revenue: acc.revenue + Number(curr.revenue_generated || 0),
    commission: acc.commission + Number(curr.commission_owed || 0)
  }), { clicks: 0, conversions: 0, revenue: 0, commission: 0 });

  const stats = [
    { label: 'Total Clicks', value: totals.clicks.toLocaleString(), icon: <MousePointer2 className="text-blue-600" /> },
    { label: 'Conversions', value: totals.conversions.toLocaleString(), icon: <ShoppingCart className="text-emerald-600" /> },
    { label: 'Revenue Generated', value: `$${totals.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: <TrendingUp className="text-primary-600" /> },
    { label: 'Commission Owed', value: `$${totals.commission.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: <DollarSign className="text-amber-600" /> },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 animate-[fadeIn_0.3s_ease]">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">Affiliate Performance</h1>
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedCampaign}
            onChange={(e) => setSelectedCampaign(e.target.value)}
            className="h-11 px-4 bg-white border border-gray-100 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm font-outfit uppercase tracking-tight"
          >
            <option value="">Global Campaigns</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <Button 
            variant="outline" 
            icon={<RefreshCw size={18} className={loading ? 'animate-spin' : ''} />}
            onClick={fetchPerformance}
          >
            Sync Data
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <Card key={idx} className="p-6 border-none shadow-xl bg-white/80 backdrop-blur-sm group hover:shadow-2xl transition-all duration-300">
            <div className="space-y-1">
              <p className="text-[10px] font-normal text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-2xl font-normal text-gray-900 font-outfit">{stat.value}</h3>
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-md">
        <div className="p-5 flex items-center justify-between gap-4 border-b border-gray-100">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Filter by creator or code..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl py-2.5 pl-10 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
            />
          </div>
          <div className="text-[10px] font-normal text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-lg">
            {filteredData.length} active partnerships
          </div>
        </div>

        {loading ? (
          <div className="py-20">
            <LoadingState message="Processing ROI Metrics..." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
                  <th className="px-8 py-5">Creator & Asset</th>
                  <th className="px-8 py-5 text-center">Traffic</th>
                  <th className="px-8 py-5 text-center">Conversions</th>
                  <th className="px-8 py-5 text-right">Revenue</th>
                  <th className="px-8 py-5 text-right">Commission</th>
                  <th className="px-8 py-5 text-center">Payout Status</th>
                  <th className="px-8 py-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-primary-50/30 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center font-normal text-sm font-outfit">
                          {item.Creator?.full_name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <div className="text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit group-hover:text-primary-600 transition-colors">
                            {item.Creator?.full_name || 'Unknown Creator'}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-normal text-gray-400 uppercase tracking-widest bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                              {item.affiliate_code || 'NO_CODE'}
                            </span>
                            {item.affiliate_link && (
                              <a href={item.affiliate_link} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-600">
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="text-sm font-normal text-gray-900 font-outfit">{item.clicks || 0}</div>
                      <div className="text-[9px] text-gray-400 uppercase tracking-widest">Clicks</div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="text-sm font-normal text-gray-900 font-outfit">{item.conversions || 0}</div>
                      <div className="text-[9px] text-gray-400 uppercase tracking-widest">Sales</div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="text-sm font-normal text-emerald-600 font-outfit">
                        ${Number(item.revenue_generated || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[9px] text-gray-400 uppercase tracking-widest">Gross Sales</div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="text-sm font-normal text-primary-600 font-outfit">
                        ${Number(item.commission_owed || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-[9px] text-gray-400 uppercase tracking-widest">Net Payable</div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-normal uppercase tracking-widest border ${
                          item.status === 'paid' ? 'bg-green-50 text-green-600 border-green-100' :
                          item.status === 'approved' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          item.status === 'hold' ? 'bg-red-50 text-red-600 border-red-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                        }`}>
                          {item.status === 'paid' && <CheckCircle2 size={10} />}
                          {item.status === 'approved' && <Clock size={10} />}
                          {item.status === 'hold' && <AlertCircle size={10} />}
                          {item.status || 'pending'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      {['super_admin', 'admin', 'client_admin'].includes(currentUser?.role || '') ? (
                        <div className="relative inline-block text-right" onClick={(e) => e.stopPropagation()}>
                          <button 
                            onClick={() => setOpenDropdownId(openDropdownId === item.id ? null : item.id)}
                            className="flex items-center gap-1.5 ml-auto text-[10px] font-normal uppercase tracking-widest text-gray-400 hover:text-primary-600 transition-colors group"
                          >
                            <span className={openDropdownId === item.id ? 'text-primary-600' : ''}>
                              {item.status === 'paid' ? 'Confirmed Paid' : 
                               item.status === 'approved' ? 'Payout Approved' : 
                               item.status === 'hold' ? 'On Hold' : 'Pending'}
                            </span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${openDropdownId === item.id ? 'rotate-180 text-primary-600' : ''}`} />
                          </button>

                          {openDropdownId === item.id && (
                            <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-2xl border border-gray-100 py-2 z-50 animate-[fadeIn_0.1s_ease-out] text-left">
                              {[
                                { val: 'pending', label: 'Mark Pending' },
                                { val: 'approved', label: 'Approve Payout' },
                                { val: 'paid', label: 'Confirm Paid' },
                                { val: 'hold', label: 'Place Hold' }
                              ].map((opt) => (
                                <button
                                  key={opt.val}
                                  onClick={() => {
                                    handleStatusUpdate(item.id, opt.val);
                                    setOpenDropdownId(null);
                                  }}
                                  className={`w-full px-4 py-2 text-[10px] uppercase tracking-widest hover:bg-primary-50 hover:text-primary-600 transition-colors ${
                                    item.status === opt.val ? 'text-primary-600 bg-primary-50/50 font-bold' : 'text-gray-500'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] font-normal text-gray-300 uppercase tracking-widest">Read Only</div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-20 text-gray-400 italic">No affiliate performance data captured yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
