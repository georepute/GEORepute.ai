"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { 
  ShoppingCart, 
  CreditCard, 
  Users, 
  Plus, 
  Minus, 
  Check,
  X,
  Loader2,
  Sparkles
} from "lucide-react";
import toast from "react-hot-toast";

interface PurchaseSeatsProps {
  organizationId: string;
  currentSeats: number;
  usedSeats: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function PurchaseSeats({
  organizationId,
  currentSeats,
  usedSeats,
  onSuccess,
  onCancel
}: PurchaseSeatsProps) {
  const [seatsToBuy, setSeatsToBuy] = useState(1);
  const [loading, setLoading] = useState(false);

  const PRICE_PER_SEAT = 1; // $1 per seat
  const totalCost = seatsToBuy * PRICE_PER_SEAT;
  const newTotalSeats = currentSeats + seatsToBuy;
  const availableSeats = currentSeats - usedSeats;

  const handleIncrease = () => {
    if (seatsToBuy < 100) { // Max 100 seats per purchase
      setSeatsToBuy(seatsToBuy + 1);
    }
  };

  const handleDecrease = () => {
    if (seatsToBuy > 1) {
      setSeatsToBuy(seatsToBuy - 1);
    }
  };

  const handlePurchase = async () => {
    setLoading(true);

    try {
      // Create checkout session
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organizationId,
          seats: seatsToBuy,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout using the session URL
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }

    } catch (error: any) {
      console.error('Error purchasing seats:', error);
      toast.error(error.message || 'Failed to start checkout');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 md:p-8 border-2 border-primary-200 shadow-xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-primary-600" />
            Purchase Team Seats
          </h2>
          <p className="text-gray-600">Add more team members to your organization</p>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Current Status */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium mb-1">Total Seats</div>
          <div className="text-2xl font-bold text-blue-900">{currentSeats}</div>
          <div className="text-xs text-blue-600 mt-1">+ 1 owner (free)</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium mb-1">Used</div>
          <div className="text-2xl font-bold text-green-900">{usedSeats}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm text-purple-600 font-medium mb-1">Available</div>
          <div className="text-2xl font-bold text-purple-900">{availableSeats}</div>
        </div>
      </div>

      {/* Seat Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          How many seats would you like to purchase?
        </label>
        <div className="flex items-center gap-4">
          <button
            onClick={handleDecrease}
            disabled={seatsToBuy <= 1 || loading}
            className="w-12 h-12 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
          >
            <Minus className="w-5 h-5 text-gray-700" />
          </button>
          
          <div className="flex-1 relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              min="1"
              max="100"
              value={seatsToBuy}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 1 && value <= 100) {
                  setSeatsToBuy(value);
                }
              }}
              disabled={loading}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all disabled:opacity-50"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
              seat{seatsToBuy !== 1 ? 's' : ''}
            </span>
          </div>
          
          <button
            onClick={handleIncrease}
            disabled={seatsToBuy >= 100 || loading}
            className="w-12 h-12 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center justify-center transition-colors"
          >
            <Plus className="w-5 h-5 text-gray-700" />
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">You can purchase between 1 and 100 seats</p>
      </div>

      {/* Pricing Breakdown */}
      <div className="bg-gradient-to-br from-primary-50 to-accent-50 border border-primary-200 rounded-lg p-4 mb-6">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm text-gray-700">
            <span>Seats to purchase</span>
            <span className="font-semibold">{seatsToBuy} × ${PRICE_PER_SEAT}</span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-700 pt-2 border-t border-primary-200">
            <span>New total seats</span>
            <span className="font-semibold">{newTotalSeats}</span>
          </div>
          <div className="flex justify-between items-center text-lg font-bold text-gray-900 pt-2 border-t-2 border-primary-300">
            <span>Total Cost</span>
            <span className="text-2xl text-primary-600">${totalCost.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Features List */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-accent-600" />
          What's Included
        </h3>
        <ul className="space-y-2">
          {[
            'Owner account is free (always included)',
            'Full access to all platform features',
            'Unlimited projects and content',
            'Role-based permissions',
            'Priority email support',
            'No contracts or commitments'
          ].map((feature, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Purchase Button */}
      <button
        onClick={handlePurchase}
        disabled={loading}
        className="w-full py-4 bg-gradient-to-r from-primary-600 to-accent-600 text-white rounded-lg font-bold text-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-6 h-6" />
            Purchase {seatsToBuy} Seat{seatsToBuy !== 1 ? 's' : ''} for ${totalCost.toFixed(2)}
          </>
        )}
      </button>

      {/* Security Notice */}
      <p className="mt-4 text-xs text-center text-gray-500">
        🔒 Secure payment powered by Stripe. Your payment information is never stored on our servers.
      </p>
    </div>
  );
}

