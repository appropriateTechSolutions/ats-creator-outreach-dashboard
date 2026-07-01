import { logger } from '../lib/logger';
import { clickable } from '../lib/a11y';
import { toast } from '../lib/toast';
import { hasRole, ROLE_GROUPS } from '../lib/constants';
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { Search, Plus, ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { createCampaign, getCustomCategories, createCustomCategory } from '../lib/api';
import { useCampaigns, useBrands } from '../hooks/queries';
import { useInvalidate } from '../hooks/useInvalidate';
import { queryKeys } from '../lib/queryKeys';
import { format } from 'date-fns';
import { Modal } from '../components/ui/Modal';
import { LoadingState } from '../components/ui/LoadingState';
import { CampaignForm } from '../components/CampaignForm';
import { useAuth } from '../contexts/AuthContext';
import { useDiscovery } from '../contexts/DiscoveryContext';

const COUNTRIES = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Antigua and Barbuda',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo (Congo-Brazzaville)',
  'Costa Rica',
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czechia (Czech Republic)',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar (formerly Burma)',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Korea',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Palestine State',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Korea',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Venezuela',
  'Vietnam',
  'Yemen',
  'Zambia',
  'Zimbabwe',
];

interface Campaign {
  id: string;
  name: string;
  status: string;
  city: string;
  category: string;
  created_at: string;
  start_date?: string | null;
  end_date?: string | null;
  brand_id?: string | null;
  Brand?: {
    id?: string;
    name: string;
  };
  Client?: {
    name: string;
  };
}

export default function Campaigns() {
  const { user } = useAuth();
  const location = useLocation();
  const { data: campaigns = [], isLoading: loading } = useCampaigns();
  const { data: brands = [] } = useBrands();
  const invalidate = useInvalidate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customCat, setCustomCat] = useState('');
  const [customState, setCustomState] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [search, setSearch] = useState('');
  const [selectedBrandIdFilter, setSelectedBrandIdFilter] = useState<string | null>(null);
  const [selectedBrandNameFilter, setSelectedBrandNameFilter] = useState<string | null>(null);
  const [dbCustomCategories, setDbCustomCategories] = useState<any[]>([]);
  const navigate = useNavigate();
  const { startDiscovery } = useDiscovery();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    brand_id: '',
    campaign_description: '',
    category: [] as string[],
    country: 'US',
    state: '',
    city: '',
    keywords: '',
    product_offer_notes: '',
    discovery_channels: ['instagram'] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch categories when brand is selected
  useEffect(() => {
    const fetchCategories = async () => {
      // Only fetch if we have brands loaded and a brand is selected
      if (!brands.length) return;

      if (formData.brand_id) {
        const selectedBrand = brands.find((b) => b.id === formData.brand_id);
        const clientId = selectedBrand?.client_id;

        if (clientId) {
          try {
            const categoriesData = await getCustomCategories(clientId);
            setDbCustomCategories(categoriesData || []);
          } catch (err) {
            logger.error('❌ Failed to fetch categories:', err);
            setDbCustomCategories([]);
          }
        } else {
          logger.warn('⚠️ Selected brand has no client_id');
          setDbCustomCategories([]);
        }
      } else {
        // Silently clear categories when no brand is selected (don't log)
        setDbCustomCategories([]);
      }
    };

    fetchCategories();
  }, [formData.brand_id, brands.length]); // Only depend on brand_id and brands.length, not entire brands array

  // Capture brand filter from Brands page click
  useEffect(() => {
    if (location.state?.initialSearch) {
      setSearch(location.state.initialSearch);
    }
    if (location.state?.selectedBrandId) {
      setSelectedBrandIdFilter(location.state.selectedBrandId);
    }
    if (location.state?.selectedBrandName) {
      setSelectedBrandNameFilter(location.state.selectedBrandName);
    }
  }, [location.state]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand_id) {
      toast.error('Please select a Brand');
      return;
    }
    if (!getCommaValues(formData.city).length) {
      toast.error('Please add at least one target city');
      return;
    }
    setIsSubmitting(true);
    try {
      const selectedBrand = brands.find((b) => b.id === formData.brand_id);

      const created = await createCampaign({
        name: formData.name,
        brand_id: formData.brand_id,
        client_id: selectedBrand?.client_id,
        description: formData.campaign_description,
        category: formData.category.join(','),
        country: 'US',
        state: getCommaValues(formData.state).join(', '),
        city: getCommaValues(formData.city).join(', '),
        keywords: formData.keywords
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
        product_offer_notes: formData.product_offer_notes,
        offer_type: 'hybrid',
        discovery_channels: formData.discovery_channels,
        email_subject: 'Collaboration with {{campaign_name}}',
        email_body:
          'Hey {{full_name}}, love your content! We would love to collaborate for our {{campaign_name}} campaign in {{city}}.\n\nOffer: {{product_offer_notes}}',
      });
      // Close modal and reset form
      setIsModalOpen(false);
      setFormData({
        name: '',
        brand_id: '',
        campaign_description: '',
        category: [],
        country: 'US',
        state: '',
        city: '',
        keywords: '',
        product_offer_notes: '',
        discovery_channels: ['instagram'],
      });
      setCustomCat('');
      setCustomState('');
      setCustomCity('');

      // Kick off AI discovery immediately and take the user to the campaign detail view.
      // startDiscovery shows the global "sit back and relax" popup.
      if (created?.id) {
        // Fall back to the submitted values so discovery params are never empty,
        // even if the create response omits them.
        startDiscovery({
          ...created,
          name: created.name ?? formData.name,
          category: created.category ?? formData.category.join(','),
          city: created.city ?? getCommaValues(formData.city).join(', '),
          keywords:
            created.keywords ??
            formData.keywords
              .split(',')
              .map((k) => k.trim())
              .filter(Boolean),
        });
        navigate(`/campaigns/${created.id}`);
      } else {
        invalidate(queryKeys.campaigns.all);
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to create campaign';
      toast.error(`Error: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCustomCategory = async () => {
    if (!customCat.trim()) return;
    const catName = customCat.trim();

    if (!formData.category.includes(catName)) {
      setFormData((prev) => ({
        ...prev,
        category: [...prev.category, catName],
      }));
    }
    setCustomCat('');

    // Try to save it to the database for this client
    try {
      const selectedBrand = brands.find((b) => b.id === formData.brand_id);
      const clientId = selectedBrand?.client_id;

      // Only try to save if we have a brand selected
      if (!formData.brand_id) {
        logger.warn('⚠️ No brand selected - category added locally only');
        return;
      }

      if (!clientId) {
        logger.warn('⚠️ Selected brand has no client_id - category added locally only');
        return;
      }

      // Pass both client_id and brand_id to the backend
      await createCustomCategory(catName, clientId, formData.brand_id);

      // Refresh custom categories
      const updatedCats = await getCustomCategories(clientId);
      setDbCustomCategories(updatedCats || []);
    } catch (err: any) {
      logger.error('❌ Failed to save custom category:', err);
      logger.warn('Category added locally, but database persistence failed.');
    }
  };

  const getCommaValues = (value: string) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

  const filteredCampaigns = campaigns.filter((c) => {
    // Brand Filter
    if (
      selectedBrandIdFilter &&
      c.brand_id !== selectedBrandIdFilter &&
      c.Brand?.id !== selectedBrandIdFilter
    ) {
      return false;
    }

    const searchLower = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(searchLower) ||
      (c.Brand?.name || '').toLowerCase().includes(searchLower) ||
      (c.Client?.name || '').toLowerCase().includes(searchLower) ||
      (c.city || '').toLowerCase().includes(searchLower)
    );
  });
  const activeInitiativesCount = filteredCampaigns.filter(
    (c) => c.status?.toLowerCase() === 'active',
  ).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 animate-[fadeIn_0.2s_ease] px-4 sm:px-0">
      {location.state?.fromBrandsList && (
        <Link
          to="/brands"
          className="inline-flex items-center text-[10px] font-normal text-gray-400 hover:text-primary-600 transition-colors group tracking-widest uppercase mb-4"
        >
          <ArrowLeft size={14} className="mr-1 group-hover:-translate-x-1 transition-transform" />{' '}
          BACK TO BRANDS
        </Link>
      )}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage your influencer outreach initiatives.
          </p>
        </div>
        {hasRole(user?.role, ROLE_GROUPS.CAMPAIGN_OPS) && (
          <Button
            onClick={() => setIsModalOpen(true)}
            className="hidden sm:inline-flex bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-soft hover:shadow-hover whitespace-nowrap"
            icon={<Plus size={20} />}
          >
            Launch Campaign
          </Button>
        )}
      </div>

      <Card className="mb-6 border-none shadow-xl bg-white/80 backdrop-blur-md">
        <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-md flex-1">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by campaign name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-outfit"
            />
          </div>
          <div className="text-sm text-gray-500 font-normal sm:ml-auto whitespace-nowrap">
            {activeInitiativesCount} Active Initiatives
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden border-none shadow-2xl bg-white">
        {loading ? (
          <div className="py-20">
            <LoadingState message="Synchronizing Outreach Data..." />
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[1100px] text-left">
                <thead>
                  <tr className="text-[10px] font-normal text-gray-400 uppercase tracking-widest border-b border-gray-100 bg-gray-50/50">
                    <th className="px-8 py-5">Campaign Identity</th>
                    <th className="px-8 py-5">Brand</th>
                    {user?.user_type === 'internal' && <th className="px-8 py-5">Client</th>}
                    <th className="px-8 py-5 text-center">City</th>
                    <th className="px-8 py-5 text-center">Status</th>
                    <th className="px-8 py-5 text-right">Launch Date</th>
                    <th className="px-8 py-5 text-right">End Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCampaigns.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() =>
                        navigate(`/campaigns/${c.id}`, {
                          state: {
                            fromBrandsList: location.state?.fromBrandsList,
                            fromBrandId: selectedBrandIdFilter,
                            fromBrandName: selectedBrandNameFilter,
                          },
                        })
                      }
                      className="hover:bg-primary-50/30 transition-all group cursor-pointer"
                    >
                      <td className="px-8 py-6 align-top">
                        <div className="text-sm font-normal text-gray-900 group-hover:text-primary-600 transition-colors uppercase tracking-tight font-outfit">
                          {c.name}
                        </div>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {[
                            ...new Set(
                              c.category
                                ?.split(',')
                                .map((cat) => cat.trim())
                                .filter(Boolean),
                            ),
                          ].map((cat, index) => (
                            <span
                              key={`${cat}-${index}`}
                              className="px-2 py-0.5 rounded text-[9px] font-normal uppercase tracking-widest bg-gray-100 text-gray-600 border border-gray-200"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-6 align-top">
                        <div className="text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit">
                          {c.Brand?.name || '---'}
                        </div>
                      </td>
                      {user?.user_type === 'internal' && (
                        <td className="px-8 py-6 align-top">
                          <div className="text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit">
                            {c.Client?.name || '---'}
                          </div>
                        </td>
                      )}
                      <td className="px-8 py-6 text-center align-top">
                        <div className="text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit">
                          {c.city || 'Global'}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center align-top">
                        <StatusBadge status={c.status as any} />
                      </td>
                      <td className="px-8 py-6 text-right align-top">
                        <div className="text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit whitespace-nowrap">
                          {c.start_date || c.created_at || (c as any).createdAt
                            ? format(
                                new Date(c.start_date || c.created_at || (c as any).createdAt),
                                'MMM d, yyyy',
                              )
                            : '---'}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right align-top">
                        <div className="text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit whitespace-nowrap">
                          {c.end_date ? format(new Date(c.end_date), 'MMM d, yyyy') : '---'}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCampaigns.length === 0 && (
                    <tr>
                      <td
                        colSpan={user?.user_type === 'internal' ? 7 : 6}
                        className="text-center py-20 text-gray-400 italic"
                      >
                        No active campaigns configured yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100 bg-white">
              {filteredCampaigns.map((c) => (
                <div
                  key={c.id}
                  {...clickable(() =>
                    navigate(`/campaigns/${c.id}`, {
                      state: {
                        fromBrandsList: location.state?.fromBrandsList,
                        fromBrandId: selectedBrandIdFilter,
                        fromBrandName: selectedBrandNameFilter,
                      },
                    }),
                  )}
                  className="p-5 active:bg-gray-50 transition-all cursor-pointer space-y-4"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h4 className="text-sm font-normal text-gray-900 uppercase tracking-tight font-outfit">
                        {c.name}
                      </h4>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {[
                          ...new Set(
                            c.category
                              ?.split(',')
                              .map((cat) => cat.trim())
                              .filter(Boolean),
                          ),
                        ].map((cat, index) => (
                          <span
                            key={`${cat}-${index}`}
                            className="px-2 py-0.5 rounded text-[9px] font-normal uppercase tracking-widest bg-gray-100 text-gray-600 border border-gray-200"
                          >
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                    <StatusBadge status={c.status as any} />
                  </div>

                  <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 pt-1 text-xs">
                    <div>
                      <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">
                        Brand
                      </span>
                      <span className="font-normal text-gray-800 uppercase tracking-tight font-outfit">
                        {c.Brand?.name || '---'}
                      </span>
                    </div>
                    {user?.user_type === 'internal' && (
                      <div>
                        <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">
                          Client
                        </span>
                        <span className="font-normal text-gray-800 uppercase tracking-tight font-outfit">
                          {c.Client?.name || '---'}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">
                        City
                      </span>
                      <span className="font-normal text-gray-800 uppercase tracking-tight font-outfit">
                        {c.city || 'Global'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">
                        Launch Date
                      </span>
                      <span className="font-normal text-gray-800 uppercase tracking-tight font-outfit">
                        {c.start_date || c.created_at || (c as any).createdAt
                          ? format(
                              new Date(c.start_date || c.created_at || (c as any).createdAt),
                              'MMM d, yyyy',
                            )
                          : '---'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-normal text-gray-400 uppercase tracking-widest block mb-0.5">
                        End Date
                      </span>
                      <span className="font-normal text-gray-800 uppercase tracking-tight font-outfit">
                        {c.end_date ? format(new Date(c.end_date), 'MMM d, yyyy') : '---'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {filteredCampaigns.length === 0 && (
                <div className="text-center py-20 text-gray-400 italic bg-white rounded-xl">
                  No active campaigns configured.
                </div>
              )}
            </div>
          </>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Launch New Campaign">
        <CampaignForm
          formData={formData}
          setFormData={setFormData}
          brands={brands}
          countries={COUNTRIES}
          isSubmitting={isSubmitting}
          onSubmit={handleCreate}
          onCancel={() => setIsModalOpen(false)}
          submitLabel="Launch Campaign"
          submittingLabel="Starting Agent..."
          showCreateBrandOption={hasRole(user?.role, ROLE_GROUPS.MARKETING_AND_ADMINS)}
          onCreateBrand={() => navigate('/brands', { state: { openCreateModal: true } })}
          customCat={customCat}
          setCustomCat={setCustomCat}
          customState={customState}
          setCustomState={setCustomState}
          customCity={customCity}
          setCustomCity={setCustomCity}
          dbCustomCategories={dbCustomCategories}
          onAddCustomCategory={handleAddCustomCategory}
        />
      </Modal>

      {/* Floating Action Button for Mobile */}
      {hasRole(user?.role, ROLE_GROUPS.CAMPAIGN_OPS) && (
        <button
          onClick={() => setIsModalOpen(true)}
          className="sm:hidden fixed bottom-6 right-6 z-50 bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-2xl shadow-primary-500/40 flex items-center justify-center transition-transform active:scale-95 border border-primary-500/20"
          aria-label="New Campaign"
        >
          <Plus size={24} />
        </button>
      )}
    </div>
  );
}
