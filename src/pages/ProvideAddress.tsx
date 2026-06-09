import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function ProvideAddress() {
  const { id } = useParams();
  const [shipment, setShipment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_city: '',
    shipping_state: '',
    shipping_zip: '',
    shipping_country: 'US',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`/api/shipments/public/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setShipment(data.data);
          if (data.data.Creator) {
            setForm(f => ({
              ...f,
              shipping_address_line1: data.data.Creator.shipping_address_line1 || '',
              shipping_address_line2: data.data.Creator.shipping_address_line2 || '',
              shipping_city: data.data.Creator.shipping_city || '',
              shipping_state: data.data.Creator.shipping_state || '',
              shipping_zip: data.data.Creator.shipping_zip || '',
              shipping_country: data.data.Creator.shipping_country || 'US',
            }));
          }
        } else {
          setError(data.error || 'Shipment not found');
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/shipments/public/${id}/provide-address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        alert(data.error || 'Something went wrong');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center font-outfit text-gray-500">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center font-outfit bg-gray-50">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Request Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex h-screen items-center justify-center font-outfit bg-gray-50">
        <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Address Submitted!</h1>
          <p className="text-gray-600">Thank you for providing your shipping details. We will process your shipment shortly.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-outfit">
      <div className="max-w-xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-primary-600 to-primary-800 px-8 py-8 text-white text-center">
            <h1 className="text-2xl font-bold mb-2">Provide Shipping Address</h1>
            <p className="text-primary-100 text-sm opacity-90">{shipment?.Campaign?.name}</p>
          </div>
          
          <div className="p-8">
            <p className="text-gray-600 mb-6 text-center text-sm">
              Please provide your correct shipping address so we can dispatch your product for the campaign.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address Line 1 <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 border"
                    value={form.shipping_address_line1}
                    onChange={e => setForm({...form, shipping_address_line1: e.target.value})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Address Line 2</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 border"
                    value={form.shipping_address_line2}
                    onChange={e => setForm({...form, shipping_address_line2: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">City <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 border"
                    value={form.shipping_city}
                    onChange={e => setForm({...form, shipping_city: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">State / Province <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 border"
                    value={form.shipping_state}
                    onChange={e => setForm({...form, shipping_state: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ZIP / Postal Code <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 border"
                    value={form.shipping_zip}
                    onChange={e => setForm({...form, shipping_zip: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Country <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-4 py-2 border"
                    value={form.shipping_country}
                    onChange={e => setForm({...form, shipping_country: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? 'Submitting...' : 'Submit Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
