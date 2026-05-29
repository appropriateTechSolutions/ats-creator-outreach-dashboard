import React from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

export interface CampaignFormData {
  name: string;
  brand_id: string;
  campaign_description: string;
  category: string[];
  country: string;
  state: string;
  city: string;
  keywords: string;
  product_offer_notes: string;
  discovery_channels: string[];
}

interface CampaignFormProps {
  formData: CampaignFormData;
  setFormData: React.Dispatch<React.SetStateAction<CampaignFormData>>;
  brands: any[];
  countries: string[];
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
  submittingLabel?: string;
  showCreateBrandOption?: boolean;
  onCreateBrand?: () => void;
  customCat: string;
  setCustomCat: React.Dispatch<React.SetStateAction<string>>;
  customState: string;
  setCustomState: React.Dispatch<React.SetStateAction<string>>;
  customCity: string;
  setCustomCity: React.Dispatch<React.SetStateAction<string>>;
  dbCustomCategories?: any[];
  onAddCustomCategory?: () => void | Promise<void>; // Add this prop
}

const standardCategories = [
  'Food & Beverage',
  'Cocktails & Mixology',
  'Lifestyle',
  'Nightlife',
  'Restaurants',
  'Local Experiences',
  'Events',
  'Luxury Lifestyle',
  'Tequila'
];

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah',
  'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const US_STATE_ABBREVIATIONS: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming'
};

const US_CITIES_BY_STATE: Record<string, string[]> = {
  Alabama: ['Birmingham', 'Huntsville', 'Mobile', 'Montgomery'],
  Alaska: ['Anchorage', 'Fairbanks', 'Juneau'],
  Arizona: ['Phoenix', 'Scottsdale', 'Tempe', 'Tucson'],
  Arkansas: ['Fayetteville', 'Little Rock', 'Rogers'],
  California: ['Los Angeles', 'San Diego', 'San Francisco', 'San Jose', 'Sacramento', 'Napa', 'Palm Springs'],
  Colorado: ['Denver', 'Boulder', 'Aspen', 'Colorado Springs'],
  Connecticut: ['Hartford', 'New Haven', 'Stamford'],
  Delaware: ['Dover', 'Wilmington'],
  'District of Columbia': ['Washington'],
  Florida: ['Miami', 'Fort Lauderdale', 'Orlando', 'Tampa', 'West Palm Beach', 'Key West'],
  Georgia: ['Atlanta', 'Savannah', 'Athens'],
  Hawaii: ['Honolulu', 'Kailua-Kona', 'Lahaina'],
  Idaho: ['Boise', 'Sun Valley'],
  Illinois: ['Chicago', 'Evanston', 'Naperville'],
  Indiana: ['Indianapolis', 'Bloomington', 'Fort Wayne'],
  Iowa: ['Des Moines', 'Iowa City'],
  Kansas: ['Kansas City', 'Overland Park', 'Wichita'],
  Kentucky: ['Louisville', 'Lexington'],
  Louisiana: ['New Orleans', 'Baton Rouge', 'Lafayette'],
  Maine: ['Portland', 'Bar Harbor'],
  Maryland: ['Baltimore', 'Annapolis', 'Bethesda'],
  Massachusetts: ['Boston', 'Cambridge', 'Nantucket'],
  Michigan: ['Detroit', 'Ann Arbor', 'Grand Rapids'],
  Minnesota: ['Minneapolis', 'Saint Paul'],
  Mississippi: ['Jackson', 'Oxford'],
  Missouri: ['Kansas City', 'St. Louis', 'Springfield'],
  Montana: ['Bozeman', 'Missoula'],
  Nebraska: ['Omaha', 'Lincoln'],
  Nevada: ['Las Vegas', 'Reno'],
  'New Hampshire': ['Manchester', 'Portsmouth'],
  'New Jersey': ['Jersey City', 'Hoboken', 'Newark', 'Atlantic City'],
  'New Mexico': ['Albuquerque', 'Santa Fe'],
  'New York': ['New York City', 'Brooklyn', 'Buffalo', 'The Hamptons'],
  'North Carolina': ['Charlotte', 'Raleigh', 'Asheville'],
  'North Dakota': ['Fargo', 'Bismarck'],
  Ohio: ['Columbus', 'Cleveland', 'Cincinnati'],
  Oklahoma: ['Oklahoma City', 'Tulsa'],
  Oregon: ['Portland', 'Bend', 'Eugene'],
  Pennsylvania: ['Philadelphia', 'Pittsburgh'],
  'Rhode Island': ['Providence', 'Newport'],
  'South Carolina': ['Charleston', 'Columbia', 'Greenville'],
  'South Dakota': ['Sioux Falls', 'Rapid City'],
  Tennessee: ['Nashville', 'Memphis', 'Knoxville'],
  Texas: ['Austin', 'Dallas', 'Houston', 'San Antonio', 'Fort Worth'],
  Utah: ['Salt Lake City', 'Park City'],
  Vermont: ['Burlington', 'Stowe'],
  Virginia: ['Richmond', 'Arlington', 'Virginia Beach'],
  Washington: ['Seattle', 'Bellevue', 'Spokane'],
  'West Virginia': ['Charleston', 'Morgantown'],
  Wisconsin: ['Milwaukee', 'Madison'],
  Wyoming: ['Jackson', 'Cheyenne']
};

const US_CITY_OPTIONS = Array.from(new Set(Object.values(US_CITIES_BY_STATE).flat())).sort();

const platforms = [
  {
    id: 'instagram',
    label: 'Instagram',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#E1306C]">
        <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line>
      </svg>
    )
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.42a2.78 2.78 0 0 0-1.94 2C1 8.14 1 12 1 12s0 3.86.46 5.58a2.78 2.78 0 0 0 1.94 2c1.72.42 8.6.42 8.6.42s6.88 0 8.6-.42a2.78 2.78 0 0 0 1.94-2C23 15.86 23 12 23 12s0-3.86-.46-5.58z"></path>
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"></polygon>
      </svg>
    )
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-900">
        <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path>
      </svg>
    )
  }
];

const getCommaValues = (value: string) =>
  value
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);

const canonicalizeState = (value: string) => {
  const trimmed = value.trim();
  const byName = US_STATES.find(state => state.toLowerCase() === trimmed.toLowerCase());
  if (byName) return byName;

  return US_STATE_ABBREVIATIONS[trimmed.toUpperCase()] || trimmed;
};

export function CampaignForm({
  formData,
  setFormData,
  brands,
  countries,
  isSubmitting,
  onSubmit,
  onCancel,
  submitLabel,
  submittingLabel = 'Saving...',
  showCreateBrandOption = false,
  onCreateBrand,
  customCat,
  setCustomCat,
  customState,
  setCustomState,
  customCity,
  setCustomCity,
  dbCustomCategories = [],
  onAddCustomCategory // Add this
}: CampaignFormProps) {
  void countries;

  const toggleCategory = (cat: string) => {
    setFormData(prev => ({
      ...prev,
      category: prev.category.includes(cat)
        ? prev.category.filter(c => c !== cat)
        : [...prev.category, cat]
    }));
  };

  const handleAddCustomCategory = async () => {
    if (!customCat.trim()) return;
    
    // If parent provided a handler, call it to save to database
    // The parent will handle adding to form state after successful save
    if (onAddCustomCategory) {
      await onAddCustomCategory();
    } else {
      // Otherwise add to form locally (fallback for when no parent handler)
      if (!formData.category.includes(customCat.trim())) {
        setFormData(prev => ({
          ...prev,
          category: [...prev.category, customCat.trim()]
        }));
      }
      setCustomCat('');
    }
  };

  const addCommaValues = (field: 'state' | 'city', value: string) => {
    const nextValues = getCommaValues(value).map(item => field === 'state' ? canonicalizeState(item) : item);
    if (!nextValues.length) return;

    setFormData(prev => {
      const existing = getCommaValues(prev[field]);
      const merged = [...existing];
      nextValues.forEach(item => {
        if (!merged.some(current => current.toLowerCase() === item.toLowerCase())) {
          merged.push(item);
        }
      });
      return { ...prev, [field]: merged.join(', ') };
    });

    if (field === 'state') setCustomState('');
    if (field === 'city') setCustomCity('');
  };

  const removeCommaValue = (field: 'state' | 'city', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: getCommaValues(prev[field]).filter(item => item !== value).join(', ')
    }));
  };

  const selectedStates = getCommaValues(formData.state).map(canonicalizeState);
  const citySuggestions = selectedStates.length
    ? Array.from(new Set(selectedStates.flatMap(state => US_CITIES_BY_STATE[state] || []))).sort()
    : US_CITY_OPTIONS;

  const toggleChannel = (id: string) => {
    setFormData(prev => ({
      ...prev,
      discovery_channels: prev.discovery_channels.includes(id)
        ? (prev.discovery_channels.length > 1 ? prev.discovery_channels.filter(c => c !== id) : prev.discovery_channels)
        : [...prev.discovery_channels, id]
    }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Campaign Name *</label>
          <textarea
            required
            rows={2}
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-100 bg-gray-50 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm resize-y"
            placeholder="Summer Skincare 2026"
          />
        </div>
        <div>
          <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Brand *</label>
          <select
            required
            value={formData.brand_id}
            onChange={e => {
              if (e.target.value === 'create_new_brand') {
                onCreateBrand?.();
                return;
              }
              setFormData({ ...formData, brand_id: e.target.value });
            }}
            className="w-full h-11 px-4 border border-gray-100 bg-gray-50 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm"
          >
            <option value="">Select Brand</option>
            {brands.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
            {showCreateBrandOption && (
              <option value="create_new_brand" className="font-semibold text-primary-600">+ Create Brand</option>
            )}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Campaign Description</label>
        <textarea
          value={formData.campaign_description}
          onChange={e => setFormData({ ...formData, campaign_description: e.target.value })}
          className="w-full px-4 py-3 border border-gray-100 bg-gray-50 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm resize-y"
          rows={3}
          placeholder="Describe your campaign..."
        />
      </div>

      <div>
        <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-2.5">Discovery Categories *</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {standardCategories.map(cat => (
            <button
              type="button"
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-normal uppercase tracking-widest border transition-all ${
                formData.category.includes(cat)
                  ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-500/20'
                  : 'bg-white text-gray-600 border-gray-100 hover:border-primary-300'
              }`}
            >
              {cat}
            </button>
          ))}
          {dbCustomCategories.map(cat => {
            const catName = typeof cat === 'string' ? cat : cat.name;
            if (standardCategories.includes(catName)) return null;
            return (
              <button
                type="button"
                key={`db-${catName}`}
                onClick={() => toggleCategory(catName)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-normal uppercase tracking-widest border transition-all ${
                  formData.category.includes(catName)
                    ? 'bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-500/20'
                    : 'bg-white text-gray-600 border-gray-100 hover:border-primary-300'
                }`}
              >
                {catName}
              </button>
            );
          })}
          {formData.category.filter(c => !standardCategories.includes(c) && !dbCustomCategories.some(dbc => (typeof dbc === 'string' ? dbc : dbc.name) === c)).map(cat => (
            <button
              type="button"
              key={cat}
              onClick={() => toggleCategory(cat)}
              className="px-3 py-1.5 rounded-full text-[10px] font-normal uppercase tracking-widest border bg-primary-50 text-primary-600 border-primary-200 shadow-sm"
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Or enter custom category..."
            value={customCat}
            onChange={e => setCustomCat(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomCategory())}
            className="h-10 text-xs bg-gray-50/50"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddCustomCategory}
            className="h-10 text-[10px]"
          >
            Add
          </Button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Search Keywords</label>
        <Input
          value={formData.keywords}
          onChange={e => setFormData({ ...formData, keywords: e.target.value })}
          placeholder="vegan, organic, eco"
        />
      </div>

      <div>
        <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-2.5">Target State</label>
        {getCommaValues(formData.state).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {getCommaValues(formData.state).map(state => (
              <button
                type="button"
                key={state}
                onClick={() => removeCommaValue('state', state)}
                className="px-3 py-1.5 rounded-full text-[10px] font-normal uppercase tracking-widest border bg-primary-50 text-primary-600 border-primary-200 shadow-sm"
                title="Remove state"
              >
                {state}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            value={customState}
            list="us-state-options"
            onChange={e => setCustomState(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCommaValues('state', customState))}
            placeholder="Start typing a US state"
            className="h-10 text-xs bg-gray-50/50"
          />
          <datalist id="us-state-options">
            {US_STATES.map(state => (
              <option key={state} value={state} />
            ))}
          </datalist>
          <Button
            type="button"
            variant="outline"
            onClick={() => addCommaValues('state', customState)}
            className="h-10 text-[10px]"
          >
            Add
          </Button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-2.5">Target City *</label>
        {getCommaValues(formData.city).length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {getCommaValues(formData.city).map(city => (
              <button
                type="button"
                key={city}
                onClick={() => removeCommaValue('city', city)}
                className="px-3 py-1.5 rounded-full text-[10px] font-normal uppercase tracking-widest border bg-primary-50 text-primary-600 border-primary-200 shadow-sm"
                title="Remove city"
              >
                {city}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input
            value={customCity}
            list="us-city-options"
            onChange={e => setCustomCity(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addCommaValues('city', customCity))}
            placeholder={selectedStates.length ? 'Start typing a city from selected state' : 'Start typing a US city'}
            className="h-10 text-xs bg-gray-50/50"
          />
          <datalist id="us-city-options">
            {citySuggestions.map(city => (
              <option key={city} value={city} />
            ))}
          </datalist>
          <Button
            type="button"
            variant="outline"
            onClick={() => addCommaValues('city', customCity)}
            className="h-10 text-[10px]"
          >
            Add
          </Button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-2.5">Platforms *</label>
        <div className="flex gap-3">
          {platforms.map(p => (
            <button
              type="button"
              key={p.id}
              onClick={() => toggleChannel(p.id)}
              className={`flex-1 py-3 rounded-2xl border flex flex-col items-center justify-center transition-all duration-300 ${
                formData.discovery_channels.includes(p.id)
                  ? 'bg-white border-primary-500 ring-4 ring-primary-50 shadow-md transform scale-[1.05]'
                  : 'bg-gray-50 border-gray-100 text-gray-400 opacity-70 hover:bg-white hover:border-gray-200'
              }`}
            >
              <div className={`mb-1.5 p-1.5 rounded-lg ${formData.discovery_channels.includes(p.id) ? 'bg-white shadow-sm' : ''}`}>
                {p.icon}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-widest ${formData.discovery_channels.includes(p.id) ? 'text-gray-900' : 'text-gray-400'}`}>
                {p.label}
              </span>
            </button>
          ))}
        </div>
        {formData.discovery_channels.includes('tiktok') && (
          <p className={`mt-3 text-[11px] leading-relaxed rounded-lg px-3 py-2 ${
            formData.discovery_channels.length === 1
              ? 'bg-amber-50 text-amber-800 border border-amber-200'
              : 'bg-gray-50 text-gray-500 border border-gray-100'
          }`}>
            {formData.discovery_channels.length === 1
              ? 'TikTok-only discovery is not yet supported — follower and engagement enrichment is unavailable for TikTok. Add Instagram or YouTube to run discovery.'
              : 'Note: TikTok handles are surfaced, but follower and engagement data is only enriched on Instagram and YouTube.'}
          </p>
        )}
      </div>

      <div>
        <label className="block text-xs font-normal text-gray-500 font-outfit uppercase tracking-widest mb-1.5">Offer Notes</label>
        <textarea
          value={formData.product_offer_notes}
          onChange={e => setFormData({ ...formData, product_offer_notes: e.target.value })}
          className="w-full px-4 py-3 border border-gray-100 bg-gray-50 rounded-xl text-sm font-normal text-gray-900 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all shadow-sm resize-none"
          rows={3}
          placeholder="Free access + 15% affiliate..."
        />
      </div>

      <div className="pt-4 border-t border-gray-50 flex justify-end gap-3">
        <Button variant="outline" onClick={onCancel} type="button" className="font-normal uppercase text-[10px] tracking-widest">Cancel</Button>
        <Button type="submit" disabled={isSubmitting} className="bg-primary-600 hover:bg-primary-700 shadow-xl shadow-primary-500/30 font-normal uppercase text-[10px] tracking-widest">
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
