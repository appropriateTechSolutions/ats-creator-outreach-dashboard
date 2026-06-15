import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { LoadingState } from '../components/ui/LoadingState';
import { Modal } from '../components/ui/Modal';
import { 
  getPartnershipById,
  markQualified,
  sendOffer,
  markAccepted,
  activatePartnership,
  completePartnership,
  rejectPartnership,
  updatePartnership,
  createShipment
} from '../lib/api';
import { 
  Handshake, 
  Coins, 
  Edit3,
  ExternalLink,
  ArrowLeft,
  FileText,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';

export default function PartnershipDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const fromCreatorId = location.state?.fromCreatorId;
  const fromPath = location.state?.fromPath;
  const fromLabel = location.state?.fromLabel;
  const [partnership, setPartnership] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modals
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Form states
  const [offerForm, setOfferForm] = useState({
    offer_type: 'free_product',
    flat_fee: 0,
    affiliate_enabled: false,
    affiliate_percentage: 0,
    affiliate_code: '',
    affiliate_link: ''
  });

  const [editForm, setEditForm] = useState({
    creator_tier: 'unknown',
    contract_required: false,
    contract_signed: false,
    contract_url: '',
    start_date: '',
    end_date: '',
    activation_notes: '',
    internal_notes: ''
  });

  // Shipment states
  const [showShipmentModal, setShowShipmentModal] = useState(false);
  const [shipmentForm, setShipmentForm] = useState({
    product_name: '',
    product_sku: '',
    quantity: 1,
    recipient_name: '',
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_city: '',
    shipping_state: '',
    shipping_zip: '',
    shipping_country: 'US',
    notes: ''
  });

  const [previewSubject, setPreviewSubject] = useState('');
  const [previewBody, setPreviewBody] = useState('');
  const [previewToEmail, setPreviewToEmail] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const getOfferTemplateText = (subjectTemplate: string, bodyTemplate: string) => {
    if (!partnership) return { subject: '', body: '' };
    
    let offerTypeLabel = 'Free Product';
    let compDetails = '';
    
    const { offer_type, flat_fee, affiliate_percentage, affiliate_code } = partnership;
    
    if (offer_type === 'flat_fee') {
      offerTypeLabel = 'Flat Fee';
      compDetails = `- Flat Fee Amount: $${flat_fee || 0} USD`;
    } else if (offer_type === 'affiliate_commission') {
      offerTypeLabel = 'Affiliate Commission Only';
      compDetails = `- Commission Rate: ${affiliate_percentage || 0}%\n- Custom Promo Code: ${affiliate_code || 'N/A'}`;
    } else if (offer_type === 'hybrid') {
      offerTypeLabel = 'Hybrid (Flat Fee + Affiliate)';
      compDetails = `- Flat Fee Amount: $${flat_fee || 0} USD\n- Commission Rate: ${affiliate_percentage || 0}%\n- Custom Promo Code: ${affiliate_code || 'N/A'}`;
    } else {
      offerTypeLabel = 'Free Product Collaboration';
      compDetails = `- Free Product Package: ${partnership.Campaign?.product_offer_notes || 'Exclusive Gift Set'}`;
    }
    
    const replace = (tmpl: string) => {
      if (!tmpl) return '';
      return tmpl
        .replace(/\{\{\s*offer_type\s*\}\}/g, offerTypeLabel)
        .replace(/\{\{\s*compensation_details\s*\}\}/g, compDetails);
    };
    
    return {
      subject: replace(subjectTemplate),
      body: replace(bodyTemplate)
    };
  };

  const fetchPartnership = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getPartnershipById(id);
      setPartnership(data);
    } catch (err) {
      console.error('Failed to load partnership:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnership();
  }, [id]);

  const handleAction = async (action: string) => {
    if (!id || !partnership) return;
    try {
      setLoading(true);
      if (action === 'qualify') {
        await markQualified(id);
      } else if (action === 'accept') {
        await markAccepted(id);
      } else if (action === 'activate') {
        await activatePartnership(id);
      } else if (action === 'complete') {
        await completePartnership(id);
      } else if (action === 'reject') {
        if (window.confirm('Are you sure you want to reject this partnership?')) {
          await rejectPartnership(id);
        } else {
          setLoading(false);
          return;
        }
      }
      const updated = await getPartnershipById(id);
      setPartnership(updated);
    } catch (err) {
      alert('Action failed: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const openOfferModal = () => {
    if (!partnership) return;
    setOfferForm({
      offer_type: partnership.offer_type || 'free_product',
      flat_fee: partnership.flat_fee || 0,
      affiliate_enabled: partnership.affiliate_enabled || false,
      affiliate_percentage: partnership.affiliate_percentage || 0,
      affiliate_code: partnership.affiliate_code || '',
      affiliate_link: partnership.affiliate_link || ''
    });
    setShowOfferModal(true);
  };

  const openShipmentModal = () => {
    if (!partnership) return;
    setShipmentForm({
      product_name: partnership.Campaign?.product_offer_notes || '',
      product_sku: '',
      quantity: 1,
      recipient_name: partnership.Creator?.full_name || '',
      shipping_address_line1: partnership.Creator?.shipping_address_line1 || '',
      shipping_address_line2: partnership.Creator?.shipping_address_line2 || '',
      shipping_city: partnership.Creator?.shipping_city || '',
      shipping_state: partnership.Creator?.shipping_state || '',
      shipping_zip: partnership.Creator?.shipping_zip || '',
      shipping_country: partnership.Creator?.shipping_country || 'US',
      notes: ''
    });
    setShowShipmentModal(true);
  };

  const submitShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnership) return;
    setSubmitting(true);
    try {
      await createShipment({
        ...shipmentForm,
        creator_id: partnership.creator_id,
        campaign_id: partnership.campaign_id,
        partnership_id: partnership.id
      });
      setShowShipmentModal(false);
      navigate('/shipments');
    } catch (err) {
      alert('Failed to create shipment: ' + err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueToPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnership) return;
    setShowOfferModal(false);
    setShowPreviewModal(true);
    setPreviewLoading(true);
    try {
      const extraParams = {
        offer_type: offerForm.offer_type,
        flat_fee: offerForm.flat_fee || undefined,
        affiliate_code: offerForm.affiliate_enabled ? offerForm.affiliate_code : undefined,
        affiliate_percentage: offerForm.affiliate_enabled ? offerForm.affiliate_percentage : undefined,
      };
      
      const { previewOutreach } = await import('../lib/api');
      const data = await previewOutreach(
        partnership.creator_id,
        partnership.campaign_id,
        'qualification',
        extraParams
      );
      setPreviewSubject(data.subject || '');
      setPreviewBody(data.body || '');
      setPreviewToEmail(data.to || partnership.Creator?.email || '');
    } catch (err) {
      console.error(err);
      alert('Failed to load email preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendOfferEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnership) return;
    setSubmitting(true);
    try {
      await sendOffer(partnership.id, {
        offer_type: offerForm.offer_type,
        flat_fee: Number(offerForm.flat_fee) || undefined,
        affiliate_enabled: offerForm.affiliate_enabled,
        affiliate_percentage: offerForm.affiliate_enabled ? Number(offerForm.affiliate_percentage) : undefined,
        affiliate_code: offerForm.affiliate_enabled ? offerForm.affiliate_code : undefined,
        affiliate_link: offerForm.affiliate_enabled ? offerForm.affiliate_link : undefined,
        customSubject: previewSubject,
        customBody: previewBody
      });
      setShowPreviewModal(false);
      const updated = await getPartnershipById(partnership.id);
      setPartnership(updated);
    } catch (err) {
      alert('Failed to send offer email: ' + err);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = () => {
    if (!partnership) return;
    setEditForm({
      creator_tier: partnership.creator_tier || 'unknown',
      contract_required: partnership.contract_required || false,
      contract_signed: partnership.contract_signed || false,
      contract_url: partnership.contract_url || '',
      start_date: partnership.start_date || '',
      end_date: partnership.end_date || '',
      activation_notes: partnership.activation_notes || '',
      internal_notes: partnership.internal_notes || ''
    });
    setShowEditModal(true);
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnership) return;
    setSubmitting(true);
    try {
      await updatePartnership(partnership.id, {
        creator_tier: editForm.creator_tier,
        contract_required: editForm.contract_required,
        contract_signed: editForm.contract_signed,
        contract_url: editForm.contract_url || null,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        activation_notes: editForm.activation_notes || null,
        internal_notes: editForm.internal_notes || null
      });
      setShowEditModal(false);
      const updated = await getPartnershipById(partnership.id);
      setPartnership(updated);
    } catch (err) {
      alert('Failed to update details: ' + err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 max-w-7xl mx-auto px-4 sm:px-0">
        <LoadingState message="Retrieving Partnership details..." />
      </div>
    );
  }

  if (!partnership) {
    return (
      <div className="py-20 max-w-7xl mx-auto px-4 sm:px-0 text-center">
        <h2 className="text-xl font-semibold text-gray-700">Partnership not found</h2>
        <Link to={fromCreatorId ? `/creators/${fromCreatorId}` : "/partnerships"} className="text-primary-600 hover:underline mt-4 inline-block">
          Back to {fromCreatorId ? 'Creator Detail' : 'Partnerships'}
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20 px-4 sm:px-0 animate-[fadeIn_0.3s_ease]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          {fromPath ? (
            <button 
              onClick={() => navigate(fromPath)}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-widest transition-colors mb-3"
            >
              <ArrowLeft size={14} /> Back to {fromLabel || 'Previous'}
            </button>
          ) : fromCreatorId ? (
            <button 
              onClick={() => navigate(`/creators/${fromCreatorId}`)}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-widest transition-colors mb-3"
            >
              <ArrowLeft size={14} /> Back to Creator Detail
            </button>
          ) : (
            <button 
              onClick={() => navigate('/partnerships')}
              className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-widest transition-colors mb-3"
            >
              <ArrowLeft size={14} /> Back to Partnerships
            </button>
          )}
          <h1 className="text-2xl sm:text-3xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
            Partnership Profile
          </h1>
        </div>

        {/* Actions panel */}
        <div className="flex items-center gap-2">
          {partnership.status === 'engaged' && (
            <Button className="bg-indigo-600 text-white font-normal uppercase tracking-widest text-xs min-h-[40px] px-4" onClick={() => handleAction('qualify')}>
              Qualify
            </Button>
          )}
          {partnership.status === 'qualified' && (
            <Button className="bg-primary-600 text-white font-normal uppercase tracking-widest text-xs min-h-[40px] px-4" onClick={openOfferModal}>
              Send Offer
            </Button>
          )}
          {partnership.status === 'offer_sent' && (
            <Button className="bg-green-600 text-white font-normal uppercase tracking-widest text-xs min-h-[40px] px-4" onClick={() => handleAction('accept')}>
              Accept Offer
            </Button>
          )}
          {partnership.status === 'accepted' && (
            <Button className="bg-blue-600 text-white font-normal uppercase tracking-widest text-xs min-h-[40px] px-4" onClick={openShipmentModal}>
              Send Shipment
            </Button>
          )}
          {['product_shipped', 'product_delivered'].includes(partnership.status) && (
            <Button className="bg-amber-600 text-white font-normal uppercase tracking-widest text-xs min-h-[40px] px-4" onClick={() => handleAction('activate')}>
              Activate
            </Button>
          )}
          {partnership.status === 'activated' && (
            <Button className="bg-gray-800 text-white font-normal uppercase tracking-widest text-xs min-h-[40px] px-4" onClick={() => handleAction('complete')}>
              Complete
            </Button>
          )}
          <button 
            onClick={openEditModal}
            className="p-2.5 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-colors flex items-center justify-center"
            title="Edit parameters"
          >
            <Edit3 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Creator overview & details */}
        <div className="space-y-8 lg:col-span-2">
          {/* Creator Profile Summary Card */}
          <Card className="border-none shadow-xl bg-white p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-gray-100 pb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex flex-shrink-0 items-center justify-center font-normal text-2xl uppercase ring-4 ring-white shadow-md overflow-hidden">
                  {partnership.Creator?.profile_pic ? (
                    <img src={partnership.Creator.profile_pic} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (partnership.Creator?.full_name || partnership.Creator?.handle)?.charAt(0) || 'C'
                  )}
                </div>
                <div>
                  <div className="text-xl font-normal text-gray-900 font-outfit uppercase tracking-tight">
                    {partnership.Creator?.full_name || `@${partnership.Creator?.handle}`}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">@{partnership.Creator?.handle}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{partnership.Creator?.email || 'No email registered'}</div>
                </div>
              </div>
              
              <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Partnership Status</span>
                <StatusBadge status={partnership.status} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6">
              {/* Settings */}
              <div className="space-y-4 font-outfit">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Compensation</span>
                    <span className="text-sm font-normal text-gray-800 uppercase">
                      {partnership.offer_type ? partnership.offer_type.replace('_', ' ') : 'None drafted'}
                    </span>
                  </div>
                  {partnership.flat_fee > 0 && (
                    <div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Flat Fee</span>
                      <span className="text-sm font-normal text-gray-800">${partnership.flat_fee} {partnership.currency}</span>
                    </div>
                  )}
                </div>

                {partnership.affiliate_enabled && (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3 text-xs">
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block border-b border-gray-100 pb-1">Affiliate Details</span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase">Promo Code</span>
                        <span className="font-semibold text-gray-800 font-mono uppercase text-sm">{partnership.affiliate_code || '---'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-400 block uppercase">Commission Rate</span>
                        <span className="font-semibold text-gray-800 text-sm">{partnership.affiliate_percentage || 0}%</span>
                      </div>
                    </div>
                    {partnership.affiliate_link && (
                      <div className="pt-2 border-t border-gray-100">
                        <span className="text-[9px] text-gray-400 block uppercase">Tracking Link</span>
                        <a href={partnership.affiliate_link} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline flex items-center gap-1 mt-0.5 truncate max-w-full font-mono">
                          {partnership.affiliate_link} <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Start Date</span>
                    <span className="text-sm font-normal text-gray-800">
                      {partnership.start_date ? format(new Date(partnership.start_date), 'MMM d, yyyy') : '---'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">End Date</span>
                    <span className="text-sm font-normal text-gray-800">
                      {partnership.end_date ? format(new Date(partnership.end_date), 'MMM d, yyyy') : '---'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Legal & Notes */}
              <div className="space-y-4 font-outfit">

                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Contract Status</span>
                  <div className="mt-1 flex items-center gap-1.5 text-xs">
                    {partnership.contract_required ? (
                      partnership.contract_signed ? (
                        <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-semibold border border-green-200 uppercase tracking-wider text-[10px]">Signed</span>
                      ) : (
                        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold border border-amber-200 uppercase tracking-wider text-[10px]">Pending Signature</span>
                      )
                    ) : (
                      <span className="text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider text-[10px]">Not Required</span>
                    )}
                  </div>
                </div>

                {partnership.contract_url && (
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Contract Link</span>
                    <a href={partnership.contract_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline flex items-center gap-1 mt-1 text-xs font-semibold">
                      View Executed Contract <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {partnership.creator_tier && (
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Creator Tier Size</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 uppercase tracking-wider inline-block mt-1">
                      {partnership.creator_tier.replace('_', ' ')}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            {(partnership.activation_notes || partnership.internal_notes) && (
              <div className="border-t border-gray-100 mt-6 pt-6 space-y-4 font-outfit">
                {partnership.activation_notes && (
                  <div>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">Activation Notes</span>
                    <p className="text-sm text-gray-650 mt-1.5 whitespace-pre-wrap leading-relaxed">{partnership.activation_notes}</p>
                  </div>
                )}

                {partnership.internal_notes && (
                  <div className="bg-yellow-50/45 border border-yellow-100/50 p-4 rounded-xl">
                    <span className="text-[9px] font-bold text-amber-800 uppercase tracking-wider block">Internal Team Notes</span>
                    <p className="text-sm text-gray-650 mt-1.5 whitespace-pre-wrap leading-relaxed">{partnership.internal_notes}</p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Side: Partnership Outreach Template Preview */}
        <div className="lg:col-span-1">
          <Card className="border-primary-100 bg-primary-50/10 h-full flex flex-col">
            <CardHeader className="flex flex-row justify-between items-center pb-2">
              <h2 className="text-sm font-normal text-primary-700 uppercase tracking-widest flex items-center gap-2 font-outfit">
                <Mail size={16} /> Partnership Outreach
              </h2>
            </CardHeader>
            <CardContent className="space-y-4 flex-grow">
              {!partnership.Campaign?.Template ? (
                <div className="flex-1 flex items-center justify-center text-center py-12 text-gray-400 italic text-xs font-outfit">
                  No outreach template configured for this campaign.
                </div>
              ) : (
                (() => {
                  const { subject, body } = getOfferTemplateText(
                    partnership.Campaign.Template.subject_line_template || '',
                    partnership.Campaign.Template.body_template || ''
                  );
                  return (
                    <div className="space-y-3 font-outfit">
                      <div>
                        <div className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1">Subject</div>
                        <div className="text-xs text-gray-900 bg-white border border-gray-100 rounded-lg px-3 py-2 font-sans font-medium">
                          {subject || <span className="text-gray-405 italic">No subject yet</span>}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-normal text-gray-400 uppercase tracking-widest mb-1">Body</div>
                        <div className="text-xs text-gray-800 bg-white border border-gray-100 rounded-lg px-3 py-3 whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto font-sans">
                          {body || <span className="text-gray-450 italic">No body yet</span>}
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Send Offer Modal ─── */}
      <Modal isOpen={showOfferModal} onClose={() => setShowOfferModal(false)} title="Draft & Send Campaign Offer">
        <form onSubmit={handleContinueToPreview} className="space-y-4 font-outfit">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Offer Compensation Type</label>
            <select
              value={offerForm.offer_type}
              onChange={e => setOfferForm(prev => ({ ...prev, offer_type: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
            >
              <option value="free_product">Free Product</option>
              <option value="affiliate_commission">Affiliate Commission Only</option>
              <option value="flat_fee">Flat Fee</option>
              <option value="hybrid">Hybrid (Flat Fee + Affiliate)</option>
            </select>
          </div>

          {(offerForm.offer_type === 'flat_fee' || offerForm.offer_type === 'hybrid') && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Flat Fee Amount (USD)</label>
              <input
                type="number"
                value={offerForm.flat_fee}
                onChange={e => setOfferForm(prev => ({ ...prev, flat_fee: Number(e.target.value) }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
                min="0"
              />
            </div>
          )}

          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="affiliate_enabled"
              checked={offerForm.affiliate_enabled}
              onChange={e => setOfferForm(prev => ({ ...prev, affiliate_enabled: e.target.checked }))}
              className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
            />
            <label htmlFor="affiliate_enabled" className="text-sm text-gray-700 select-none">Enable Affiliate Parameters</label>
          </div>

          {offerForm.affiliate_enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border border-dashed border-gray-100 rounded-xl p-4 bg-gray-50/50">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Percentage (%)</label>
                <input
                  type="number"
                  value={offerForm.affiliate_percentage}
                  onChange={e => setOfferForm(prev => ({ ...prev, affiliate_percentage: Number(e.target.value) }))}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm"
                  min="0"
                  max="100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Promo Code</label>
                <input
                  type="text"
                  value={offerForm.affiliate_code}
                  onChange={e => setOfferForm(prev => ({ ...prev, affiliate_code: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm uppercase font-mono"
                  placeholder="CODE20"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Tracking URL</label>
                <input
                  type="text"
                  value={offerForm.affiliate_link}
                  onChange={e => setOfferForm(prev => ({ ...prev, affiliate_link: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-lg p-2 text-sm"
                  placeholder="https://..."
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" className="flex-1 font-normal text-xs uppercase tracking-widest" onClick={() => setShowOfferModal(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest">
              Continue to Preview
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Offer Email Preview Modal ─── */}
      <Modal isOpen={showPreviewModal} onClose={() => setShowPreviewModal(false)} title="Review & Send Offer Email">
        {previewLoading ? (
          <div className="py-12">
            <LoadingState message="Generating Offer Preview..." />
          </div>
        ) : (
          <form onSubmit={handleSendOfferEmail} className="space-y-4 font-outfit">
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-700 leading-relaxed">
              ℹ️ A styled <strong>Accept Partnership Offer</strong> button will automatically be attached to the footer of this email. When the creator clicks it, their status will update to <strong>ACCEPTED</strong> automatically.
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                To
              </label>
              <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 font-mono">
                {previewToEmail || <span className="text-gray-400 italic">No email on record</span>}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Subject Line
              </label>
              <input
                type="text"
                value={previewSubject}
                onChange={(e) => setPreviewSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all text-sm"
                placeholder="Enter email subject"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                Message Body (Plain Text)
              </label>
              <textarea
                value={previewBody}
                onChange={(e) => setPreviewBody(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all font-sans text-sm"
                placeholder="Enter email body"
                required
              />
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" className="flex-1 font-normal text-xs uppercase tracking-widest" onClick={() => { setShowPreviewModal(false); setShowOfferModal(true); }}>
                Back to Settings
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest">
                {submitting ? 'Sending Offer...' : 'Send Offer Email'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ─── Edit Partnership Modal ─── */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Update Partnership Profile">
        <form onSubmit={submitEdit} className="space-y-4 font-outfit">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Creator Tier Size</label>
              <select
                value={editForm.creator_tier}
                onChange={e => setEditForm(prev => ({ ...prev, creator_tier: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              >
                <option value="unknown">Unknown</option>
                <option value="nano">Nano (&lt;10k)</option>
                <option value="micro">Micro (10k-50k)</option>
                <option value="mid_tier">Mid Tier (50k-100k)</option>
                <option value="macro">Macro (100k-500k)</option>
                <option value="celebrity">Celebrity (500k+)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Contract Signature Link</label>
              <input
                type="text"
                value={editForm.contract_url}
                onChange={e => setEditForm(prev => ({ ...prev, contract_url: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
                placeholder="https://docusign.com/..."
              />
            </div>
          </div>

          <div className="flex gap-6 py-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="contract_required"
                checked={editForm.contract_required}
                onChange={e => setEditForm(prev => ({ ...prev, contract_required: e.target.checked }))}
                className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
              />
              <label htmlFor="contract_required" className="text-sm text-gray-700 select-none">Contract Required</label>
            </div>
            
            {editForm.contract_required && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="contract_signed"
                  checked={editForm.contract_signed}
                  onChange={e => setEditForm(prev => ({ ...prev, contract_signed: e.target.checked }))}
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 border-gray-300"
                />
                <label htmlFor="contract_signed" className="text-sm text-gray-700 select-none">Contract Signed</label>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Campaign Start Date</label>
              <input
                type="date"
                value={editForm.start_date}
                onChange={e => setEditForm(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Campaign End Date</label>
              <input
                type="date"
                value={editForm.end_date}
                onChange={e => setEditForm(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Activation Notes</label>
            <textarea
              value={editForm.activation_notes}
              onChange={e => setEditForm(prev => ({ ...prev, activation_notes: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[60px]"
              placeholder="Fulfillment parameters, specific agreements..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Internal CRM Notes</label>
            <textarea
              value={editForm.internal_notes}
              onChange={e => setEditForm(prev => ({ ...prev, internal_notes: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[60px]"
              placeholder="Private details, scoring fits, follow up details..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" className="flex-1 font-normal text-xs uppercase tracking-widest" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest">
              {submitting ? 'Saving...' : 'Save Parameters'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── Shipment Create Modal ─── */}
      <Modal isOpen={showShipmentModal} onClose={() => setShowShipmentModal(false)} title="Dispatched Product Shipment">
        <form onSubmit={submitShipment} className="space-y-4 font-outfit">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Product Name</label>
              <input
                type="text"
                required
                value={shipmentForm.product_name}
                onChange={e => setShipmentForm(prev => ({ ...prev, product_name: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
                placeholder="Product title"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={shipmentForm.quantity}
                onChange={e => setShipmentForm(prev => ({ ...prev, quantity: Number(e.target.value) || 1 }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">SKU / Item ID</label>
              <input
                type="text"
                value={shipmentForm.product_sku}
                onChange={e => setShipmentForm(prev => ({ ...prev, product_sku: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
                placeholder="SKU-xyz"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Recipient Name</label>
              <input
                type="text"
                required
                value={shipmentForm.recipient_name}
                onChange={e => setShipmentForm(prev => ({ ...prev, recipient_name: e.target.value }))}
                className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-700 mt-2 border-b border-gray-100 pb-1">Delivery Address</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">Address Line 1</label>
                <input
                  type="text"
                  required
                  placeholder="123 Main St"
                  value={shipmentForm.shipping_address_line1}
                  onChange={e => setShipmentForm(prev => ({ ...prev, shipping_address_line1: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">Address Line 2</label>
                <input
                  type="text"
                  placeholder="Apt 4B"
                  value={shipmentForm.shipping_address_line2}
                  onChange={e => setShipmentForm(prev => ({ ...prev, shipping_address_line2: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">City</label>
                <input
                  type="text"
                  required
                  placeholder="City"
                  value={shipmentForm.shipping_city}
                  onChange={e => setShipmentForm(prev => ({ ...prev, shipping_city: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">State</label>
                <input
                  type="text"
                  required
                  placeholder="State"
                  value={shipmentForm.shipping_state}
                  onChange={e => setShipmentForm(prev => ({ ...prev, shipping_state: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">Zip Code</label>
                <input
                  type="text"
                  required
                  placeholder="Zip"
                  value={shipmentForm.shipping_zip}
                  onChange={e => setShipmentForm(prev => ({ ...prev, shipping_zip: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
              <div>
                <label className="block text-[9px] font-normal uppercase tracking-wider text-gray-400 mb-1">Country</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. US, IN"
                  value={shipmentForm.shipping_country}
                  onChange={e => setShipmentForm(prev => ({ ...prev, shipping_country: e.target.value }))}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 font-outfit"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Internal Notes</label>
            <textarea
              value={shipmentForm.notes}
              onChange={e => setShipmentForm(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm min-h-[60px]"
              placeholder="Delivery requests..."
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" className="flex-1 font-normal text-xs uppercase tracking-widest" onClick={() => setShowShipmentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-normal text-xs uppercase tracking-widest">
              {submitting ? 'Creating...' : 'Create Shipment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
