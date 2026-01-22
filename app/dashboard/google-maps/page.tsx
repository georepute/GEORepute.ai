'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/lib/language-context';

interface Review {
  author_name: string;
  author_url?: string;
  language?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

interface PlaceDetails {
  name: string;
  formatted_address: string;
  rating: number;
  user_ratings_total: number;
  reviews: Review[];
  place_id?: string;
  url?: string;
}

interface Business {
  id: string;
  place_id: string;
  place_name: string;
  place_address: string;
  place_rating: number;
  place_reviews_total: number;
  fetched_at: string;
}

export default function GoogleMapsPage() {
  const { isRtl, t } = useLanguage();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [mapUrl, setMapUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [placeDetails, setPlaceDetails] = useState<PlaceDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // Fetch user businesses on component mount
  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    setLoadingBusinesses(true);
    try {
      const response = await fetch('/api/integrations/google-maps/businesses');
      const data = await response.json();

      if (response.ok && data.success) {
        setBusinesses(data.businesses || []);
      } else {
        console.error('Failed to fetch businesses:', data.error);
      }
    } catch (err) {
      console.error('Error fetching businesses:', err);
    } finally {
      setLoadingBusinesses(false);
    }
  };

  const handleBusinessSelect = async (businessId: string) => {
    if (!businessId) {
      setPlaceDetails(null);
      setSelectedBusinessId('');
      return;
    }

    setSelectedBusinessId(businessId);
    setLoading(true);
    setError(null);

    try {
      // Find the selected business
      const business = businesses.find(b => b.id === businessId);
      if (!business) {
        throw new Error('Business not found');
      }

      // Fetch reviews for this business
      const response = await fetch(`/api/integrations/google-maps/reviews?place_id=${business.place_id}`);
      const data = await response.json();

      if (response.ok && data.success && data.reviews.length > 0) {
        const businessData = data.reviews[0];
        setPlaceDetails({
          name: businessData.place_name,
          formatted_address: businessData.place_address,
          rating: businessData.place_rating || 0,
          user_ratings_total: businessData.place_reviews_total || 0,
          reviews: businessData.reviews_data || [],
          place_id: businessData.place_id,
          url: `https://www.google.com/maps/place/?q=place_id:${businessData.place_id}`,
        });
      } else {
        throw new Error('Failed to fetch business details');
      }
    } catch (err: any) {
      console.error('Error fetching business details:', err);
      setError(err.message || 'Failed to fetch business details');
      toast.error(err.message || 'Failed to fetch business details');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    if (!mapUrl.trim()) {
      toast.error('Please enter a Google Maps URL');
      return;
    }

    setLoading(true);
    setError(null);
    setPlaceDetails(null);

    try {
      const response = await fetch('/api/integrations/google-maps/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mapUrl, placeId: null }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reviews');
      }

      if (data.success && data.placeDetails) {
        setPlaceDetails(data.placeDetails);
        
        // Show appropriate message
        if (data.businessExists) {
          toast.success('Business updated! This business was already in your profile.');
        } else {
          toast.success(`Business added! Fetched ${data.placeDetails.reviews?.length || 0} reviews successfully!`);
        }
        
        // Refresh businesses list
        await fetchBusinesses();
        
        // Close modal and clear URL
        setShowAddModal(false);
        setMapUrl('');
      } else {
        throw new Error('No reviews found for this location');
      }
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
      setError(err.message || 'Failed to fetch reviews');
      toast.error(err.message || 'Failed to fetch reviews');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'}`}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        ))}
      </div>
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/30">
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 01-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0116 0z" fill="currentColor" fillOpacity="0.3"/>
                  <circle cx="12" cy="10" r="3" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Google Maps Reviews</h1>
                <p className="text-gray-600 mt-1">
                  Manage and analyze reviews from your Google Maps business profiles
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-600/30 transition-all duration-200 font-semibold flex items-center gap-2 group"
            >
              <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-200" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Add Business
            </button>
          </div>
        </div>

        {/* Business Selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-6 mb-6 hover:shadow-md transition-shadow duration-200">
          <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3M9 9v.01M9 12v.01M9 15v.01M9 18v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Select Your Business
          </label>
          {loadingBusinesses ? (
            <div className="flex items-center justify-center py-12">
              <svg className="w-8 h-8 animate-spin text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
              </svg>
              <span className="ml-3 text-gray-600 font-medium">Loading businesses...</span>
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3M9 9v.01M9 12v.01M9 15v.01M9 18v.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-gray-600 font-medium mb-2">No businesses added yet</p>
              <p className="text-sm text-gray-500">Click "Add Business" to get started</p>
            </div>
          ) : (
            <select
              value={selectedBusinessId}
              onChange={(e) => handleBusinessSelect(e.target.value)}
              className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all bg-gray-50 hover:bg-white font-medium text-gray-700"
              disabled={loading}
            >
              <option value="">Select a business to view reviews...</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.place_name} - {business.place_rating?.toFixed(1) || 'N/A'} ⭐ ({business.place_reviews_total || 0} reviews)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5 mb-6 shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div>
                <h3 className="font-bold text-red-900 mb-1">Error</h3>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !placeDetails && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-12">
            <div className="text-center">
              <svg className="w-14 h-14 animate-spin text-blue-600 mx-auto mb-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
              </svg>
              <p className="text-gray-600 font-medium">Loading business details...</p>
            </div>
          </div>
        )}

        {/* Place Details */}
        {placeDetails && (
          <>
            {/* Business Info Card */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200/60 p-8 mb-6 hover:shadow-lg transition-shadow duration-200">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    {placeDetails.name}
                  </h2>
                  <p className="text-gray-600 mb-4 flex items-start gap-2">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 01-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0116 0z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {placeDetails.formatted_address}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {renderStars(Math.round(placeDetails.rating))}
                      <span className="font-bold text-xl text-gray-900">
                        {placeDetails.rating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-gray-500 font-medium">
                      ({placeDetails.user_ratings_total.toLocaleString()} reviews)
                    </span>
                  </div>
                </div>
                {placeDetails.url && (
                  <a
                    href={placeDetails.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 text-sm font-semibold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2 group"
                  >
                    View on Maps
                    <svg className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </a>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t border-gray-200">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl">
                  <div className="text-3xl font-bold text-blue-600">
                    {placeDetails.reviews?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600 font-medium mt-1">Reviews Fetched</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100/50 rounded-xl">
                  <div className="text-3xl font-bold text-green-600">
                    {placeDetails.rating.toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600 font-medium mt-1">Average Rating</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl">
                  <div className="text-3xl font-bold text-purple-600">
                    {placeDetails.user_ratings_total.toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600 font-medium mt-1">Total Reviews</div>
                </div>
              </div>
            </div>

            {/* Reviews List */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200/60 p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <svg className="w-7 h-7 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
                </svg>
                Reviews ({placeDetails.reviews?.length || 0})
              </h3>

              {(!placeDetails.reviews || placeDetails.reviews.length === 0) ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium mb-2">No reviews found</p>
                  <p className="text-sm text-gray-500">
                    This business may not have any public reviews yet
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {placeDetails.reviews.map((review, index) => (
                    <div
                      key={index}
                      className="border-b border-gray-200 last:border-0 pb-6 last:pb-0"
                    >
                      <div className="flex items-start gap-4">
                        {/* Profile Photo */}
                        {review.profile_photo_url ? (
                          <img
                            src={review.profile_photo_url}
                            alt={review.author_name}
                            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-gray-100"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center">
                            <svg className="w-7 h-7 text-gray-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                              <path d="M6 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                          </div>
                        )}

                        {/* Review Content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                {review.author_url ? (
                                  <a
                                    href={review.author_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-bold text-gray-900 hover:text-blue-600 transition-colors"
                                  >
                                    {review.author_name}
                                  </a>
                                ) : (
                                  <span className="font-bold text-gray-900">
                                    {review.author_name}
                                  </span>
                                )}
                              </div>
                              {renderStars(review.rating)}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                                <path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                              <span>{review.relative_time_description}</span>
                            </div>
                          </div>

                          {/* Review Text */}
                          {review.text && (
                            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 p-4 rounded-xl">
                              {review.text}
                            </p>
                          )}

                          {/* Additional Info */}
                          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 font-medium">
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                                <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                              </svg>
                              {formatDate(review.time)}
                            </span>
                            {review.language && (
                              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg font-semibold uppercase">
                                {review.language}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Empty State */}
        {!placeDetails && !loading && !error && !loadingBusinesses && businesses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/60 p-16">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/10">
                <svg className="w-12 h-12 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 01-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0116 0z" fill="currentColor" fillOpacity="0.3"/>
                  <circle cx="12" cy="10" r="3" fill="currentColor"/>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Select a Business
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Choose a business from the dropdown above to view its reviews and ratings
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Add Business Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
              <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                Add New Business
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setMapUrl('');
                  setError(null);
                }}
                className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors group"
              >
                <svg className="w-6 h-6 text-gray-600 group-hover:text-gray-900 transition-colors" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="p-8">
              {/* URL Input */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Google Maps Business URL
                </label>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={mapUrl}
                      onChange={(e) => setMapUrl(e.target.value)}
                      placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/..."
                      className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-medium"
                      disabled={loading}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          fetchReviews();
                        }
                      }}
                    />
                  </div>
                  <button
                    onClick={fetchReviews}
                    disabled={loading || !mapUrl.trim()}
                    className="px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-lg hover:shadow-blue-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-bold flex items-center gap-2 whitespace-nowrap"
                  >
                    {loading ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25"/>
                          <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                        </svg>
                        Fetching...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                          <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Fetch Business
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-6 shadow-sm">
                <div className="text-sm">
                  <p className="font-bold text-blue-900 mb-5 text-xl flex items-center gap-2">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    How to get your business link:
                  </p>
                  
                  <div className="space-y-3 mb-6">
                    <div className="bg-white rounded-xl p-4 border-2 border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                      <p className="font-bold text-blue-900 flex items-center gap-3 text-base">
                        <span className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl w-8 h-8 flex items-center justify-center text-base font-bold shadow-lg shadow-blue-600/30">1</span>
                        Search business or place
                      </p>
                    </div>
                    
                    <div className="bg-white rounded-xl p-4 border-2 border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                      <p className="font-bold text-blue-900 flex items-center gap-3 text-base">
                        <span className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl w-8 h-8 flex items-center justify-center text-base font-bold shadow-lg shadow-blue-600/30">2</span>
                        Select Business
                      </p>
                    </div>
                    
                    <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-4 border-2 border-green-300 shadow-sm hover:shadow-md transition-shadow">
                      <p className="font-bold text-green-900 flex items-center gap-3 text-base">
                        <span className="bg-gradient-to-br from-green-600 to-green-700 text-white rounded-xl w-8 h-8 flex items-center justify-center text-base font-bold shadow-lg shadow-green-600/30">3</span>
                        Click <span className="bg-gradient-to-r from-green-600 to-green-700 text-white px-3 py-1 rounded-lg mx-1 font-bold shadow-sm">📤 Share</span> and copy link
                      </p>
                    </div>
                  </div>

                  {/* Visual Guide Image */}
                  <div className="bg-white rounded-xl p-4 border-2 border-blue-200 shadow-md">
                    <p className="text-blue-900 font-bold text-base mb-3 flex items-center gap-2">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Steps are explained in this image:
                    </p>
                    <div 
                      onClick={() => setShowImageModal(true)}
                      className="relative cursor-pointer group overflow-hidden rounded-xl"
                    >
                      <img 
                        src="/maps-docs.png" 
                        alt="Google Maps Share Button Guide" 
                        className="w-full rounded-xl border-2 border-gray-200 shadow-sm group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Zoom Icon Overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 backdrop-blur-sm rounded-full p-3 shadow-lg">
                          <svg className="w-6 h-6 text-gray-800" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                            <path d="M21 21l-4.35-4.35M11 8v6M8 11h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-2 font-medium">
                      Click image to zoom in
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in duration-200"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-7xl w-full max-h-[95vh] overflow-auto">
            {/* Close Button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 z-10 p-3 bg-white/90 hover:bg-white rounded-full transition-colors shadow-lg group"
            >
              <svg className="w-6 h-6 text-gray-800 group-hover:text-gray-900 transition-colors" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Zoomed Image */}
            <div 
              className="bg-white rounded-2xl p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src="/maps-docs.png" 
                alt="Google Maps Share Button Guide - Zoomed" 
                className="w-full h-auto rounded-xl"
              />
              <p className="text-center text-gray-600 font-medium mt-4">
                Google Maps Share Button Guide - Follow these steps to get your business link
              </p>
            </div>

            {/* Click to close hint */}
            <p className="text-center text-white/80 text-sm mt-4 font-medium">
              Click anywhere outside the image to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
