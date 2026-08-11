// components/pricing/PaymentForm.tsx
'use client';

import { useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock, Loader, CheckCircle, CreditCard } from 'lucide-react';
import { PricingPlan, BillingFormData } from '@/services/interface/pricing';

interface PaymentFormProps {
  plan: PricingPlan;
  billingData: BillingFormData;
  onBack: () => void;
}

export default function PaymentForm({ plan, billingData, onBack }: PaymentFormProps) {
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const router = useRouter();

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    const cardNum = paymentData.cardNumber.replace(/\s/g, '');
    if (!cardNum || cardNum.length !== 16) {
      newErrors.cardNumber = 'Card number must be 16 digits';
    }
    
    if (!paymentData.cardName.trim()) {
      newErrors.cardName = 'Cardholder name is required';
    }
    
    if (!paymentData.expiryDate || !/^\d{2}\/\d{2}$/.test(paymentData.expiryDate)) {
      newErrors.expiryDate = 'Expiry date must be MM/YY';
    }
    
    if (!paymentData.cvv || !/^\d{3}$/.test(paymentData.cvv)) {
      newErrors.cvv = 'CVV must be 3 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatCardNumber = (value: string): string => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts: string[] = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    }
    return value;
  };

  const formatExpiryDate = (value: string): string => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.slice(0, 2) + '/' + v.slice(2, 4);
    }
    return v;
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    let { name, value } = e.target;

    if (name === 'cardNumber') {
      value = formatCardNumber(value);
    } else if (name === 'expiryDate') {
      value = formatExpiryDate(value);
    } else if (name === 'cvv') {
      value = value.replace(/\D/g, '').slice(0, 3);
    }

    setPaymentData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePayment = async () => {
    if (!validateForm()) return;

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setPaymentSuccess(true);

      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    }, 2000);
  };

  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-8 sm:py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg border border-gray-200 p-6 sm:p-8 text-center">
            <div className="mb-6 flex justify-center">
              <CheckCircle className="w-16 h-16 text-green-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Payment Successful!
            </h2>
            <p className="text-gray-600 mb-6">
              Your {plan.name} subscription has been activated. You're being redirected to your dashboard...
            </p>
            <div className="flex justify-center">
              <Loader className="w-5 h-5 animate-spin text-black" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Billing
        </button>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Order Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 h-fit">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>
            
            <div className="space-y-3 border-b border-gray-200 pb-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-semibold text-gray-900">{plan.name} Plan</h4>
                  <p className="text-sm text-gray-600">{plan.description}</p>
                </div>
                <span className="font-bold text-gray-900">€{plan.price}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Billing Period</span>
                <span className="font-medium text-gray-900">{plan.period}</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              <h5 className="font-medium text-gray-900">Includes:</h5>
              {plan.features.filter(f => f.included).slice(0, 4).map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  {feature.text}
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-xl font-bold text-gray-900">€{plan.price}</span>
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Billing Address:</strong><br/>
                {billingData.fullName}<br/>
                {billingData.address}<br/>
                {billingData.city}, {billingData.country}
              </p>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Information
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Number *
                </label>
                <input
                  type="text"
                  name="cardNumber"
                  value={paymentData.cardNumber}
                  onChange={handleInputChange}
                  placeholder="1234 5678 9012 3456"
                  maxLength={19}
                  className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:outline-none text-sm sm:text-base transition-colors font-mono ${
                    errors.cardNumber
                      ? 'border-red-500 focus:border-red-600'
                      : 'border-gray-300 focus:border-black'
                  }`}
                />
                {errors.cardNumber && (
                  <p className="text-red-600 text-xs mt-1">{errors.cardNumber}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cardholder Name *
                </label>
                <input
                  type="text"
                  name="cardName"
                  value={paymentData.cardName}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:outline-none text-sm sm:text-base transition-colors ${
                    errors.cardName
                      ? 'border-red-500 focus:border-red-600'
                      : 'border-gray-300 focus:border-black'
                  }`}
                />
                {errors.cardName && (
                  <p className="text-red-600 text-xs mt-1">{errors.cardName}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date (MM/YY) *
                  </label>
                  <input
                    type="text"
                    name="expiryDate"
                    value={paymentData.expiryDate}
                    onChange={handleInputChange}
                    placeholder="12/25"
                    maxLength={5}
                    className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:outline-none text-sm sm:text-base transition-colors font-mono ${
                      errors.expiryDate
                        ? 'border-red-500 focus:border-red-600'
                        : 'border-gray-300 focus:border-black'
                    }`}
                  />
                  {errors.expiryDate && (
                    <p className="text-red-600 text-xs mt-1">{errors.expiryDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVV *
                  </label>
                  <input
                    type="password"
                    name="cvv"
                    value={paymentData.cvv}
                    onChange={handleInputChange}
                    placeholder="123"
                    maxLength={3}
                    className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg focus:outline-none text-sm sm:text-base transition-colors font-mono ${
                      errors.cvv
                        ? 'border-red-500 focus:border-red-600'
                        : 'border-gray-300 focus:border-black'
                    }`}
                  />
                  {errors.cvv && (
                    <p className="text-red-600 text-xs mt-1">{errors.cvv}</p>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-3 sm:py-3.5 px-6 bg-black text-white rounded-lg font-medium min-h-[48px] hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Complete Payment - €{plan.price}
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-500 mt-3">
               Your payment information is secure and encrypted 
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}