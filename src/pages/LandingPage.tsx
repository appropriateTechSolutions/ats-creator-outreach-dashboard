import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Mail, MessageSquare, 
  Sparkles, Instagram, Youtube, Activity, ArrowRight, 
  ChevronDown, Check, X, Search 
} from 'lucide-react';

interface MockCreator {
  id: string;
  handle: string;
  name: string;
  avatarBg: string;
  category: string;
  relevance: number;
  readiness: number;
  status: 'discovered' | 'pending_review' | 'approved' | 'contacted' | 'replied';
  instagram: boolean;
  youtube: boolean;
}

const INITIAL_CREATORS: MockCreator[] = [
  {
    id: '1',
    handle: '@jessica_travels',
    name: 'Jessica Miller',
    avatarBg: 'bg-primary-600/30 text-primary-400 border-primary-500/30',
    category: 'Travel & Lifestyle',
    relevance: 94,
    readiness: 88,
    status: 'contacted',
    instagram: true,
    youtube: true
  },
  {
    id: '2',
    handle: '@alex_tech',
    name: 'Alex Chen',
    avatarBg: 'bg-success-600/30 text-success-400 border-success-500/30',
    category: 'Tech & Gadgets',
    relevance: 89,
    readiness: 92,
    status: 'replied',
    instagram: false,
    youtube: true
  },
  {
    id: '3',
    handle: '@sarah_bakes',
    name: 'Sarah Jenkins',
    avatarBg: 'bg-warning-600/30 text-warning-400 border-warning-500/30',
    category: 'Food & Baking',
    relevance: 96,
    readiness: 85,
    status: 'approved',
    instagram: true,
    youtube: false
  },
  {
    id: '4',
    handle: '@david_fit',
    name: 'David Ross',
    avatarBg: 'bg-error-600/30 text-error-400 border-error-500/30',
    category: 'Fitness & Health',
    relevance: 82,
    readiness: 78,
    status: 'discovered',
    instagram: true,
    youtube: true
  },
  {
    id: '5',
    handle: '@mariah_beauty',
    name: 'Mariah Lopez',
    avatarBg: 'bg-primary-600/30 text-primary-400 border-primary-500/30',
    category: 'Beauty & Fashion',
    relevance: 91,
    readiness: 90,
    status: 'pending_review',
    instagram: true,
    youtube: false
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [creators, setCreators] = useState<MockCreator[]>(INITIAL_CREATORS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    'discovered', 'pending_review', 'approved', 'contacted', 'replied'
  ]);

  const toggleStatusFilter = (status: string) => {
    if (selectedStatuses.includes(status)) {
      if (selectedStatuses.length > 1) {
        setSelectedStatuses(selectedStatuses.filter(s => s !== status));
      }
    } else {
      setSelectedStatuses([...selectedStatuses, status]);
    }
  };

  const handleAction = (id: string, newStatus: MockCreator['status']) => {
    setCreators(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
  };

  const filteredCreators = creators.filter(c => selectedStatuses.includes(c.status));

  // Count summaries
  const totalCount = creators.length;
  const contactedCount = creators.filter(c => c.status === 'contacted' || c.status === 'replied').length;
  const replyRate = contactedCount > 0 ? ((creators.filter(c => c.status === 'replied').length / contactedCount) * 100).toFixed(0) : "0";

  return (
    <div className="bg-[#070a13] text-gray-100 min-h-screen font-sans overflow-x-hidden selection:bg-primary-500/30 selection:text-primary-200">
      
      {/* Background Radial Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none opacity-20 blur-[150px] bg-gradient-to-b from-primary-600 via-blue-600 to-transparent"></div>
      <div className="absolute top-[800px] -left-48 w-96 h-96 pointer-events-none opacity-10 blur-[120px] bg-blue-500 rounded-full"></div>
      <div className="absolute top-[1600px] -right-48 w-[450px] h-[450px] pointer-events-none opacity-10 blur-[150px] bg-primary-600 rounded-full"></div>

      {/* Global Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#070a13]/70 border-b border-[#101726]/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-700 flex items-center justify-center shadow-lg shadow-primary-500/20">
              <Activity className="text-white" size={22} />
            </div>
            <span className="text-lg font-normal font-outfit uppercase tracking-wider text-gray-100">
              ATS Outreach
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors">How It Works</a>
            <a href="#demo" className="text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors">Live Demo</a>
            <a href="#about" className="text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors">About Us</a>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white shadow-lg shadow-primary-500/25 transition-all active:scale-[0.98]"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0f1524]/80 border border-[#1e293b]/80 mb-6 text-xs text-primary-400 font-semibold tracking-wide uppercase">
          <Sparkles size={12} className="animate-pulse" />
          Automated Influencer Discovery & CRM
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-normal font-outfit uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-gray-100 to-gray-400 max-w-4xl mx-auto leading-[1.1] mb-6">
          Find, Outreach, and Manage Creators at Scale
        </h1>
        
        <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 font-light leading-relaxed">
          The ultimate engine built for agencies to automatically search creators, enrich emails, send multi-stage campaigns, and track conversions.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <button 
            onClick={() => navigate('/login')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white shadow-xl shadow-primary-600/30 transition-all hover:scale-[1.02]"
          >
            Sign In to Access
            <ArrowRight size={18} />
          </button>
          <a 
            href="#demo"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold bg-[#0f1524] border border-[#1e293b] hover:bg-[#162035] hover:border-[#2563eb]/50 text-gray-200 transition-all"
          >
            Explore Dashboard Preview
          </a>
        </div>
      </section>

      {/* Trust / Stats Bar */}
      <div className="border-y border-[#101726]/80 bg-[#070a13]/40 py-10 my-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-normal font-outfit text-primary-400">5M+</div>
              <div className="text-xs text-gray-505 uppercase tracking-widest mt-1">Verified Creators</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-normal font-outfit text-blue-400">98%</div>
              <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Outreach Deliverability</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-normal font-outfit text-success-400">15x</div>
              <div className="text-xs text-gray-550 uppercase tracking-widest mt-1">Average Campaign ROI</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-normal font-outfit text-warning-400">500k+</div>
              <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Automated Mails Sent</div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Dashboard Section */}
      <section id="demo" className="py-20 relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-normal font-outfit uppercase tracking-wider text-gray-100">
            Interactive Dashboard Preview
          </h2>
          <p className="text-gray-400 mt-2 max-w-lg mx-auto font-light">
            No placeholder images. Experience the exact layout, fields, and colored letter badges used in our live system.
          </p>
        </div>

        {/* Dashboard Frame (No Sidebar, Glassmorphism container) */}
        <div className="bg-[#0f1524]/60 border border-[#1e293b]/80 rounded-2xl p-6 shadow-2xl backdrop-blur-sm transition-all hover:border-[#2563eb]/30">
          
          {/* Dashboard Header Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div>
              <h3 className="text-lg font-medium text-gray-100 uppercase tracking-widest font-outfit text-left">Live Campaign Preview</h3>
              <p className="text-xs text-primary-400 font-medium text-left mt-0.5">Filter by review status to test interactions</p>
            </div>
            
            {/* Custom Interactive Multi-Select Filter */}
            <div className="relative">
              <button 
                onClick={() => setFilterOpen(!filterOpen)}
                className="inline-flex items-center justify-between gap-2 px-4 py-2.5 bg-[#070a13] border border-[#1e293b] text-gray-200 rounded-xl text-sm font-medium hover:bg-[#0f1524] transition-all outline-none"
              >
                <span>Filter Status ({selectedStatuses.length})</span>
                <ChevronDown size={14} className={`transform transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
              </button>

              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setFilterOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#070a13] border border-[#1e293b] p-3 shadow-xl z-20 space-y-2.5">
                    {['discovered', 'pending_review', 'approved', 'contacted', 'replied'].map((status) => (
                      <label key={status} className="flex items-center gap-3 cursor-pointer text-xs font-medium text-gray-300 hover:text-gray-100 transition-colors uppercase tracking-wider select-none">
                        <input 
                          type="checkbox"
                          checked={selectedStatuses.includes(status)}
                          onChange={() => toggleStatusFilter(status)}
                          className="w-4 h-4 rounded bg-gray-900 border-[#1e293b] text-primary-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                        />
                        <span>{status.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* KPI Dashboard Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#070a13] border border-[#162035] p-5 rounded-2xl flex flex-col justify-between hover:border-[#1e293b] transition-colors text-left">
              <div>
                <p className="text-[10px] font-bold text-gray-405 uppercase tracking-widest mb-1">Creators Tracked</p>
                <h4 className="text-2xl font-normal font-outfit text-gray-100">{totalCount}</h4>
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs text-success-405">
                <Users size={12} />
                <span>Synchronized from discovery</span>
              </div>
            </div>

            <div className="bg-[#070a13] border border-[#162035] p-5 rounded-2xl flex flex-col justify-between hover:border-[#1e293b] transition-colors text-left">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Outreach Volume</p>
                <h4 className="text-2xl font-normal font-outfit text-gray-100">1,280</h4>
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs text-primary-400">
                <Mail size={12} />
                <span>Dynamic SMTP Sent</span>
              </div>
            </div>

            <div className="bg-[#070a13] border border-[#162035] p-5 rounded-2xl flex flex-col justify-between hover:border-[#1e293b] transition-colors text-left">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Reply Rate</p>
                <h4 className="text-2xl font-normal font-outfit text-gray-100">{replyRate}%</h4>
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs text-blue-400">
                <MessageSquare size={12} />
                <span>Industry Leading Response</span>
              </div>
            </div>

            <div className="bg-[#070a13] border border-[#162035] p-5 rounded-2xl flex flex-col justify-between hover:border-[#1e293b] transition-colors text-left">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Meetings Booked</p>
                <h4 className="text-2xl font-normal font-outfit text-gray-100">42</h4>
              </div>
              <div className="flex items-center gap-1 mt-3 text-xs text-warning-400">
                <Sparkles size={12} />
                <span>Calendly Conversions</span>
              </div>
            </div>
          </div>

          {/* Creators Directory Table */}
          <div className="bg-[#070a13] border border-[#162035] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#101726] bg-[#070a13]/50">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Creator Details</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Niche & Platform</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Match Relevance</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">Score Readiness</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Outreach Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#101726]">
                  {filteredCreators.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-light text-sm">
                        No creators match your status filter. Check some boxes in the filter above!
                      </td>
                    </tr>
                  ) : (
                    filteredCreators.map((creator) => (
                      <tr key={creator.id} className="hover:bg-[#0f1524]/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {/* Color-badge with initials (No Photos) */}
                            <div className={`w-9 h-9 rounded-full border flex items-center justify-center font-bold text-xs uppercase ${creator.avatarBg}`}>
                              {(creator.name || creator.handle).charAt(0)}
                            </div>
                            <div>
                              <span className="font-medium text-gray-100 font-outfit text-sm block">
                                {creator.name}
                              </span>
                              <span className="text-xs text-gray-400 mt-0.5 block">
                                {creator.handle}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs text-gray-300 font-medium capitalize">{creator.category}</span>
                            <div className="flex gap-2">
                              {creator.instagram && <Instagram size={13} className="text-[#E1306C]" />}
                              {creator.youtube && <Youtube size={13} className="text-red-500" />}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-primary-950/40 text-primary-400 border border-primary-800/30 text-xs font-semibold">
                            {creator.relevance}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-blue-950/40 text-blue-400 border border-blue-800/30 text-xs font-semibold">
                            {creator.readiness}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wider ${
                            creator.status === 'replied' ? 'bg-success-600/20 text-success-400 border border-success-500/20' :
                            creator.status === 'contacted' ? 'bg-primary-600/20 text-primary-400 border border-primary-500/20' :
                            creator.status === 'approved' ? 'bg-warning-600/20 text-warning-400 border border-warning-500/20' :
                            creator.status === 'pending_review' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20' :
                            'bg-[#070a13] text-gray-400 border border-[#1e293b]'
                          }`}>
                            {creator.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {creator.status === 'discovered' && (
                              <button 
                                onClick={() => handleAction(creator.id, 'pending_review')}
                                className="p-1 text-primary-450 hover:bg-primary-500/10 rounded-md transition-colors"
                                title="Send for Review"
                              >
                                <ArrowRight size={15} />
                              </button>
                            )}
                            {creator.status === 'pending_review' && (
                              <>
                                <button 
                                  onClick={() => handleAction(creator.id, 'approved')}
                                  className="p-1 text-success-400 hover:bg-success-500/10 rounded-md transition-colors"
                                  title="Approve Creator"
                                >
                                  <Check size={15} />
                                </button>
                                <button 
                                  onClick={() => handleAction(creator.id, 'discovered')}
                                  className="p-1 text-gray-400 hover:bg-[#0f1524] rounded-md transition-colors"
                                  title="Reject"
                                >
                                  <X size={15} />
                                </button>
                              </>
                            )}
                            {creator.status === 'approved' && (
                              <button 
                                onClick={() => handleAction(creator.id, 'contacted')}
                                className="px-2.5 py-1 text-xs font-semibold bg-primary-600 hover:bg-primary-550 text-white rounded-md transition-all active:scale-95 shadow-md shadow-primary-500/20"
                              >
                                Send Outreach
                              </button>
                            )}
                            {(creator.status === 'contacted' || creator.status === 'replied') && (
                              <span className="text-2xs text-gray-500 italic">Campaign Live</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#101726]/80 scroll-mt-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-normal font-outfit uppercase tracking-wider text-gray-100">
            How It Works
          </h2>
          <p className="text-gray-400 mt-2 max-w-xl mx-auto font-light">
            ATS Outreach is designed to automate your entire influencer marketing process in 5 simple steps.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
          {/* Step 1 */}
          <div className="bg-[#0f1524]/20 border border-[#101726]/60 p-6 rounded-2xl relative text-left flex flex-col justify-between hover:border-[#1e293b] transition-colors">
            <div>
              <div className="text-gray-800/80 font-outfit text-4xl font-bold mb-4">01</div>
              <h3 className="text-sm font-semibold text-gray-100 font-outfit uppercase tracking-wider mb-2">1. Set Up Campaigns</h3>
              <p className="text-xs text-gray-400 font-light leading-relaxed">
                Create a campaign for your brand by filling out simple details. Tell the system what kind of influencers you are looking for (like travel, fitness, tech) and where they should be located (like Austin, Texas).
              </p>
            </div>
          </div>
          
          {/* Step 2 */}
          <div className="bg-[#0f1524]/20 border border-[#101726]/60 p-6 rounded-2xl relative text-left flex flex-col justify-between hover:border-[#1e293b] transition-colors">
            <div>
              <div className="text-gray-800/80 font-outfit text-4xl font-bold mb-4">02</div>
              <h3 className="text-sm font-semibold text-gray-100 font-outfit uppercase tracking-wider mb-2">2. AI Discovery Run</h3>
              <p className="text-xs text-gray-400 font-light leading-relaxed">
                The system goes to work in the background. It searches social platforms, automatically finds creator handles, validates their emails, and calculates match scores so you only get relevant leads.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-[#0f1524]/20 border border-[#101726]/60 p-6 rounded-2xl relative text-left flex flex-col justify-between hover:border-[#1e293b] transition-colors">
            <div>
              <div className="text-gray-800/80 font-outfit text-4xl font-bold mb-4">03</div>
              <h3 className="text-sm font-semibold text-gray-100 font-outfit uppercase tracking-wider mb-2">3. Review & Approve</h3>
              <p className="text-xs text-gray-400 font-light leading-relaxed">
                Your team can review creators in a clean queue list. See their statistics, social links, and check their fit. Approve them to start outreach, reject them, or shortlist them for later.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-[#0f1524]/20 border border-[#101726]/60 p-6 rounded-2xl relative text-left flex flex-col justify-between hover:border-[#1e293b] transition-colors">
            <div>
              <div className="text-gray-800/80 font-outfit text-4xl font-bold mb-4">04</div>
              <h3 className="text-sm font-semibold text-gray-100 font-outfit uppercase tracking-wider mb-2">4. Send Outreach</h3>
              <p className="text-xs text-gray-400 font-light leading-relaxed">
                The platform automatically sends out professional email sequences using your client's customized brand email. It also copies Instagram direct message templates to your clipboard for quick social outbounding.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="bg-[#0f1524]/20 border border-[#101726]/60 p-6 rounded-2xl relative text-left flex flex-col justify-between hover:border-[#1e293b] transition-colors">
            <div>
              <div className="text-gray-800/80 font-outfit text-4xl font-bold mb-4">05</div>
              <h3 className="text-sm font-semibold text-gray-100 font-outfit uppercase tracking-wider mb-2">5. Track Conversions</h3>
              <p className="text-xs text-gray-400 font-light leading-relaxed">
                When creators schedule a call, it syncs directly with the built-in calendar. Once approved as partners, you can assign custom discount codes/links and track how many sales they generate automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#101726]/80 scroll-mt-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-normal font-outfit uppercase tracking-wider text-gray-100">
            Engine Capabilities Built for Agencies
          </h2>
          <p className="text-gray-400 mt-2 max-w-md mx-auto font-light">
            Everything your team needs to discovery, vet, and outreach influencers in a structured automated engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1: Smart Creator Search */}
          <div className="bg-[#0f1524]/40 border border-[#101726] p-6 rounded-2xl hover:border-[#1e293b] transition-all hover:-translate-y-1 text-left">
            <div className="w-10 h-10 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center mb-4 border border-primary-500/20">
              <Search size={20} />
            </div>
            <h3 className="text-lg font-medium text-gray-100 font-outfit uppercase tracking-widest mb-2">Smart Creator Search</h3>
            <p className="text-sm text-gray-400 font-light leading-relaxed">
              Find the perfect influencers for your brand in seconds. Search by location, category, and bio keywords. Our AI automatically gathers their public emails and profiles.
            </p>
          </div>

          {/* Feature 2: Dedicated Client Emails */}
          <div className="bg-[#0f1524]/40 border border-[#101726] p-6 rounded-2xl hover:border-[#1e293b] transition-all hover:-translate-y-1 text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
              <Mail size={20} />
            </div>
            <h3 className="text-lg font-medium text-gray-100 font-outfit uppercase tracking-widest mb-2">Dedicated Client Emails</h3>
            <p className="text-sm text-gray-400 font-light leading-relaxed">
              Send outreach emails using your client's custom brand email addresses. Keeps your message delivery high and ensures creators receive professional emails.
            </p>
          </div>

          {/* Feature 3: Vetting & Approval Queue */}
          <div className="bg-[#0f1524]/40 border border-[#101726] p-6 rounded-2xl hover:border-[#1e293b] transition-all hover:-translate-y-1 text-left">
            <div className="w-10 h-10 rounded-xl bg-success-600/20 text-success-400 flex items-center justify-center mb-4 border border-success-500/20">
              <Check size={20} />
            </div>
            <h3 className="text-lg font-medium text-gray-100 font-outfit uppercase tracking-widest mb-2">Vetting & Approval Queue</h3>
            <p className="text-sm text-gray-400 font-light leading-relaxed">
              Easily review and filter discovered influencers. Approve, reject, or shortlist creators with a single click and see instant status updates.
            </p>
          </div>

          {/* Feature 4: Direct Email & DM Outreach */}
          <div className="bg-[#0f1524]/40 border border-[#101726] p-6 rounded-2xl hover:border-[#1e293b] transition-all hover:-translate-y-1 text-left">
            <div className="w-10 h-10 rounded-xl bg-primary-600/20 text-primary-400 flex items-center justify-center mb-4 border border-primary-500/20">
              <MessageSquare size={20} />
            </div>
            <h3 className="text-lg font-medium text-gray-100 font-outfit uppercase tracking-widest mb-2">Direct Email & DM Outreach</h3>
            <p className="text-sm text-gray-400 font-light leading-relaxed">
              Chat with creators directly from a single unified inbox. Automatically copy custom Instagram DM templates to your clipboard for quick social outbounding.
            </p>
          </div>

          {/* Feature 5: Meeting Scheduling */}
          <div className="bg-[#0f1524]/40 border border-[#101726] p-6 rounded-2xl hover:border-[#1e293b] transition-all hover:-translate-y-1 text-left">
            <div className="w-10 h-10 rounded-xl bg-warning-600/20 text-warning-400 flex items-center justify-center mb-4 border border-warning-500/20">
              <Sparkles size={20} />
            </div>
            <h3 className="text-lg font-medium text-gray-100 font-outfit uppercase tracking-widest mb-2">Meeting Scheduling</h3>
            <p className="text-sm text-gray-400 font-light leading-relaxed">
              Track creator call bookings automatically. Review meeting logs, schedule dates, and notes to seamlessly onboard creators as brand partners.
            </p>
          </div>

          {/* Feature 6: Sales & Commission Tracking */}
          <div className="bg-[#0f1524]/40 border border-[#101726] p-6 rounded-2xl hover:border-[#1e293b] transition-all hover:-translate-y-1 text-left">
            <div className="w-10 h-10 rounded-xl bg-error-600/20 text-error-400 flex items-center justify-center mb-4 border border-error-500/20">
              <Activity size={20} />
            </div>
            <h3 className="text-lg font-medium text-gray-100 font-outfit uppercase tracking-widest mb-2">Sales & Commission Tracking</h3>
            <p className="text-sm text-gray-400 font-light leading-relaxed">
              Assign and monitor discount codes and referral links for each influencer. View charts of real-time sales revenue, conversions, and payouts.
            </p>
          </div>

          {/* Feature 7: Client & Brand Portals */}
          <div className="bg-[#0f1524]/40 border border-[#101726] p-6 rounded-2xl hover:border-[#1e293b] transition-all hover:-translate-y-1 text-left">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4 border border-blue-500/20">
              <Users size={20} />
            </div>
            <h3 className="text-lg font-medium text-gray-100 font-outfit uppercase tracking-widest mb-2">Client & Brand Portals</h3>
            <p className="text-sm text-gray-400 font-light leading-relaxed">
              Manage multiple clients and brands under one dashboard. Customise campaign rules, creative details, and commercial terms individually.
            </p>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-20 relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#101726]/80 scroll-mt-20 text-center">
        <div className="mb-12">
          <h2 className="text-3xl font-normal font-outfit uppercase tracking-wider text-gray-100">
            About ATS Outreach
          </h2>
          <p className="text-primary-400 mt-2 font-medium tracking-wide uppercase text-xs">
            Empowering agencies with automated outreach intelligence
          </p>
        </div>
        
        <div className="space-y-6 text-gray-400 font-light text-sm sm:text-base leading-relaxed text-center max-w-2xl mx-auto">
          <p>
            Appropriate Tech Solutions (ATS) is dedicated to helping agencies and brands streamline creator partnerships. We believe that influencer marketing shouldn't require hundreds of hours of manual work.
          </p>
          <p>
            Our platform eliminates the tedious tasks of hunting for profiles, validating business email addresses, managing outreach sequences, and calculating commission returns manually. We build simple, robust, and scalable solutions that bridge the gap between creative brands and top-tier content creators.
          </p>
          <p>
            Whether you are a growing marketing agency or a global brand, ATS Outreach is built to help you automate, optimize, and scale your outreach operations safely and securely.
          </p>
        </div>
      </section>

      {/* High-Impact CTA Banner */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-[#101726]/80 text-center relative">
        <div className="bg-gradient-to-r from-primary-950/40 via-blue-950/40 to-[#070a13] border border-[#1e293b]/20 rounded-3xl py-12 px-6 sm:px-12 relative overflow-hidden shadow-2xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] pointer-events-none opacity-20 blur-[100px] bg-primary-600 rounded-full"></div>
          
          <h2 className="text-3xl sm:text-4xl font-normal font-outfit uppercase tracking-wider text-gray-100 mb-4 relative z-10">
            Ready to Scale Your Creator Outreach?
          </h2>
          <p className="text-gray-400 max-w-lg mx-auto font-light text-sm sm:text-base mb-8 relative z-10">
            Onboard your clients, find highly-relevant influencers, send automated email sequences, and track sales commission today.
          </p>
          <div className="relative z-10 flex justify-center">
            <button 
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-semibold bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 text-white shadow-xl shadow-primary-600/30 transition-all hover:scale-[1.02]"
            >
              Sign In to Access Platform
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#070a13] border-t border-[#101726]/80 py-12 text-gray-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-gray-400">
            <Activity size={16} />
            <span>© 2026 ATS Influencer Outreach Engine. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-[#2563eb] transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-[#2563eb] transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-[#2563eb] transition-colors">Security</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
