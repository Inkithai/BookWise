// components/pricing/BillingForm.tsx - WITH CURRENT USER DETAILS
'use client';

import { useState, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock, Loader } from 'lucide-react';
import PaymentForm from './PaymentForm';
import { PricingPlan, BillingFormData } from '@/services/interface/pricing';
import { getCurrentUser, http } from '@/services/service';
import { AdminUser } from '@/services/interface/AdminUser';


import StripeProvider from '@/components/stripe/StripeProvider';
import StripeCheckoutForm from '@/components/stripe/StripeCheckoutForm';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';


interface BillingFormProps {
  plan: PricingPlan;
  onBack: () => void;
}

export default function BillingForm({ plan, onBack }: BillingFormProps) {
  const [formData, setFormData] = useState<BillingFormData>({
    fullName: '',
    email: '',
    company: '',
    address: '',
    city: '',
    country: '',
  });

  const [showPayment, setShowPayment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingUser, setLoadingUser] = useState(true);
  const [paymentPlan, setPaymentPlan] = useState('monthly');
  const router = useRouter();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleGetStarted = async (plan: PricingPlan) => {
    // setLoadingPlan(plan.id);
    // setSelectedPlan(plan);
    setLoading(true);

    try {
      const monthlyAmount = plan.monthlyPrice ?? plan.price ?? 0;
      const yearlyAmount = plan.yearlyPrice ?? (monthlyAmount > 0 ? monthlyAmount * 12 : 0);
      const res = await http.post('admin/plans/subscribe', {
        plan_type: paymentPlan,
        amount: paymentPlan === 'monthly' ? monthlyAmount : yearlyAmount,
        plan_name: plan.name,
        plan_slug: plan.planSlug ?? plan.id,
      });

      const data = res.data;
      if (data.client_secret) {
        setClientSecret(data.client_secret);
        setSubscriptionId(data.subscription);
        setModalOpen(true); // open modal
      }

    } catch (error) {
      console.error("Subscription error:", error);
      toast.error("Failed to purchase");
    }
  };

  // Fetch current user details on component mount
  useEffect(() => {
    const loadUserDetails = async () => {
      try {
        setLoadingUser(true);
        const userData = await getCurrentUser();
        const user: AdminUser = userData.data || userData;

        // Pre-fill form with user details
        setFormData(prev => ({
          ...prev,
          fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          email: user.email || '',
          company: user.company?.company_name || '',
          address: user.company?.company_address || '',
          city: '',
          country: '',
        }));
      } catch (error) {
        // Continue with empty form if API fails
      } finally {
        setLoadingUser(false);
      }
    };

    loadUserDetails();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.address.trim()) newErrors.address = 'Address is required';
    if (!formData.city.trim()) newErrors.city = 'City is required';
    if (!formData.country.trim()) newErrors.country = 'Country is required';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
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

  const handleContinue = () => {
    if (validateForm()) {
      setShowPayment(true);
    }
  };

  if (showPayment) {
    return (
      <PaymentForm
        plan={plan}
        billingData={formData}
        onBack={() => {
          setLoading(false)
          // setShowPayment(false)
        }}
      />
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white py-6 sm:py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Plans
          </button>

          <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
            {/* Order Summary */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 h-fit">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>

              <div className="space-y-3 border-b border-gray-200 pb-4 mb-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-semibold text-gray-900">{plan.name} Plan</h4>
                    <p className="text-sm text-gray-600">{plan.description}</p>
                  </div>
                  <span className="font-bold text-gray-900">£{paymentPlan === 'monthly' ? plan.price : plan.price as number * 12}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Billing Period</span>
                  {/* <span className="font-medium text-gray-900">{plan.period}</span> */}
                  <select
                    className="w-full border px-3 py-2 rounded-lg focus:outline-none focus:border-black"
                    value={paymentPlan}
                    onChange={(e) => {
                      const period = e.target.value;
                      setPaymentPlan(period)
                    }}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
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
                <span className="text-xl font-bold text-gray-900">£{paymentPlan === 'monthly' ? plan.price : plan.price as number * 12}</span>
              </div>
            </div>

            {/* Billing Form */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Billing Information</h3>

              {loadingUser && (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-5 h-5 animate-spin text-gray-600 mr-2" />
                  <span className="text-gray-600">Loading your details...</span>
                </div>
              )}

              {!loadingUser && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg text-sm sm:text-base focus:outline-none transition-colors ${errors.fullName
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-300 focus:border-black'
                          }`}
                      />
                      {errors.fullName && (
                        <p className="text-red-600 text-xs mt-1">{errors.fullName}</p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="john@example.com"
                        className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg text-sm sm:text-base focus:outline-none transition-colors ${errors.email
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-300 focus:border-black'
                          }`}
                      />
                      {errors.email && (
                        <p className="text-red-600 text-xs mt-1">{errors.email}</p>
                      )}
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Name
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        placeholder="Your Company"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-black transition-colors"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address *
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="123 Main Street"
                        className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg text-sm sm:text-base focus:outline-none transition-colors ${errors.address
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-300 focus:border-black'
                          }`}
                      />
                      {errors.address && (
                        <p className="text-red-600 text-xs mt-1">{errors.address}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        placeholder="New York"
                        className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg text-sm sm:text-base focus:outline-none transition-colors ${errors.city
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-300 focus:border-black'
                          }`}
                      />
                      {errors.city && (
                        <p className="text-red-600 text-xs mt-1">{errors.city}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country *
                      </label>
                      <input
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        placeholder="United States"
                        className={`w-full px-3 py-2.5 sm:py-2 border rounded-lg text-sm sm:text-base focus:outline-none transition-colors ${errors.country
                          ? 'border-red-500 focus:border-red-600'
                          : 'border-gray-300 focus:border-black'
                          }`}
                      />
                      {errors.country && (
                        <p className="text-red-600 text-xs mt-1">{errors.country}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleGetStarted(plan)}
                    disabled={loading}
                    className="w-full py-3 sm:py-3.5 px-6 bg-primary text-white rounded-lg font-medium min-h-[48px]
                     hover:opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                  >
                    {loading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Continue to Payment
                      </>
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-500 mt-3">
                    Your information is secure and encrypted
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Stripe Payment Modal */}
      <Dialog open={modalOpen} onOpenChange={() => {
        setModalOpen(false)
        setLoading(false)
      }} modal={true}>
        <DialogContent className="max-w-xl mx-auto p-6 rounded-2xl shadow-xl" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold">Complete Your Payment</DialogTitle>
          </DialogHeader>

          <StripeProvider clientSecret={clientSecret!}  >
            <StripeCheckoutForm subscriptionId={subscriptionId!} />
          </StripeProvider>

          {/* <DialogFooter>
            <Button onClick={() => setModalOpen(false)}>Close</Button>
          </DialogFooter> */}
        </DialogContent>
      </Dialog>
    </>
  );
}