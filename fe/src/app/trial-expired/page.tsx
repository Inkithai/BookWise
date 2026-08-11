"use client"

import React, { useState } from 'react';
import { AlertTriangle, Zap } from 'lucide-react';
import { PricingPlan } from '@/services/interface/pricing';
import { Check, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { http } from '@/services/service';

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
import BillingForm from '@/components/pricing/BillingForm';
import { useRouter } from 'next/navigation';

const TrialExpired = () => {
  const { theme } = useTheme();
  const textColor = theme === 'dark' ? 'text-white' : 'text-primary';

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showBilling, setShowBilling] = useState(false);

  const router = useRouter();

  const handleGetStarted = async (plan: PricingPlan) => {
    setLoadingPlan(plan.id);
    //  setSelectedPlan(plan);



    // try {
    //   const res = await http.post('admin/plans/subscribe', {
    //     plan_type: "monthly",
    //     amount: plan.price,
    //     plan_name: plan.name
    //   });

    //   const data = res.data;
    //   if (data.client_secret) {
    //     setClientSecret(data.client_secret);
    //     setModalOpen(true); // open modal
    //   }

    // } catch (error) {
    //   console.error("Subscription error:", error);
    //   toast.error("Failed to purchase");
    // } finally {
    //   setLoadingPlan(null);
    // }


    if (plan.name === 'Free') {
      console.log('🎯 Activating free trial...');

      try {
        await http.post('admin/plans/subscribe', {
          plan_type: "forever",
          amount: 0,
          plan_name: plan.name

        });

        toast.success('Free Plan purchased.', {
          duration: 2000
        });

        router.push('/dashboard');

      } catch (error) {
        console.error("Subscription error:", error);
        toast.error("Failed to purchase");
      }


    } else {
      // Show toast for other plans
      setSelectedPlan(plan);
      setShowBilling(true);
      // toast.info('Premium plans are coming soon! Start with our Free plan.');
    }

  };



  const plans: PricingPlan[] = [

    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started',
      icon: Zap,
      price: 0,
      period: '',
      validity: 'Forever',
      badge: 'Free',
      features: [
        { text: '10 Monthly Invoices', included: true },
        { text: '10 Saved Clients', included: true },
        { text: '10 Monthly Payment Receipts', included: true },
        { text: 'Unlimited Quotations', included: true },
        { text: '3 Team Member', included: true },
        { text: 'Preview Templates (1 month)', included: true },
        { text: 'Bill in Any Currency', included: true },
        { text: 'Standard Dashboard', included: true },
        { text: 'Send Invoices', included: true },
        { text: '1 Business', included: true },
      ],
      cta: 'Get Started',
      highlighted: false,
      ctaAction: 'demo',
    },


    {
      id: 'pro',
      name: 'Business Pro',
      description: 'For growing teams',
      icon: Zap,
      price: 4.99,
      period: '/month',
      validity: 'Billed monthly',
      badge: 'Coming Soon',
      features: [
        { text: '100 Monthly Invoices', included: true },
        { text: '300 Saved Clients', included: true },
        { text: '100 Monthly Payment Receipts', included: true },
        { text: 'Unlimited Quotations', included: true },
        { text: '10 Team Members', included: true },
        { text: '3 Templates', included: true },
        { text: 'Bill in Any Currency', included: true },
        { text: 'Standard Dashboard', included: true },
        { text: 'Recurring Statements', included: true },
        { text: 'Send Invoices', included: true },
        { text: '3 Businesses', included: true },
      ],
      cta: 'Subscribe',
      highlighted: false, // Changed from true to false
      ctaAction: 'premium',
    },
    {
      id: 'premium',
      name: 'Business Premium',
      description: 'Advanced features for scaling',
      icon: Zap,
      price: 14.99,
      period: '/month',
      validity: 'Billed monthly',
      badge: 'Coming Soon',
      features: [
        { text: '500 Monthly Invoices', included: true },
        { text: 'Unlimited Clients', included: true },
        { text: '500 Monthly Payment Receipts', included: true },
        { text: 'Unlimited Quotations', included: true },
        { text: '30 Team Members', included: true },
        { text: 'All Template Gallery', included: true },
        { text: 'Bill in Any Currency', included: true },
        { text: 'Recurring Statements', included: true },
        { text: 'Accept Online Payments', included: true },
        { text: 'Unlimited Branding', included: true },
        { text: 'Send Invoices', included: true },
        { text: 'Unlimited Businesses', included: true },
        { text: 'Full CRM Access', included: true },
      ],
      cta: 'Subscribe',
      highlighted: false,
      ctaAction: 'premium',
    },

  ];

  const comparisonFeatures = [
    { name: 'Monthly Invoices', free: '10', pro: '100', premium: '500', enterprise: 'Unlimited' },
    { name: 'Saved Clients', free: '10', pro: '300', premium: 'Unlimited', enterprise: 'Unlimited' },
    { name: 'Monthly Payment Receipts', free: '10', pro: '100', premium: '500', enterprise: 'Unlimited' },
    { name: 'Monthly Quotations', free: 'Unlimited', pro: 'Unlimited', premium: 'Unlimited', enterprise: 'Unlimited' },
    { name: 'Team Members', free: '3', pro: '10', premium: '30', enterprise: 'Unlimited' },
    { name: 'Templates', free: 'Preview only / 1 month', pro: '3 Templates', premium: 'All Gallery', enterprise: 'Custom' },
    { name: 'Bill in Any Currency', free: '✓', pro: '✓', premium: '✓', enterprise: '✓' },
    { name: 'Recurring Statements', free: '✗', pro: '✓', premium: '✓', enterprise: '✓' },
    { name: 'Accept Online Payments', free: '✗', pro: '✗', premium: '✓', enterprise: '✓' },
    { name: 'Branding', free: '1 month', pro: '✓', premium: '✓', enterprise: '✓' },
    { name: 'Send Invoices', free: '10', pro: '100', premium: 'Unlimited', enterprise: 'Unlimited' },
    { name: 'Multiple Businesses', free: '✗', pro: '✗', premium: 'Unlimited', enterprise: 'Unlimited' },
    { name: 'CRM', free: '✗', pro: '✗', premium: '✓', enterprise: '✓' }
  ];


  if (showBilling && selectedPlan) {

    return <BillingForm plan={selectedPlan} onBack={() => setShowBilling(false)} />;
  }



  return (
    <div className='min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 py-8 px-4'>
      <div className="flex items-center justify-center py-4 px-4">
        {/* <div className="bg-white rounded-lg border border-gray-200 p-8 text-center max-w-md w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Trial Expired</h1>
          <p className="text-gray-600 mb-6">Your trial period has expired.</p>
        </div> */}

        <div className="bg-white   dark:bg-gray-900 
                         rounded-2xl border border-gray-200 dark:border-gray-700
                        p-8 text-center max-w-md w-full">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />

          <h1 className="text-3xl font-bold dark:text-white text-gray-900 mb-4">Trial Expired</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your trial period has expired.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary dark:text-white mb-4">Select a plan to continue</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {plans.map((plan) => {
            const Icon = plan.icon;
            //  const isLoading = loadingPlan === plan.id;

            return (
              <div key={plan.id} className="relative flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
                <div className="mb-6 pt-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className={`text-xl font-bold text-gray-900 dark:text-white`}>{plan.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{plan.description}</p>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg text-gray-600 dark:text-gray-400">£</span>
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                    <span className="text-lg text-gray-600 dark:text-gray-400">{plan.period}</span>
                  </div>
                  <p className="text-sm mt-1 text-gray-400 dark:text-gray-500">{plan.validity}</p>
                </div>

                <Button
                  onClick={() => handleGetStarted(plan)}
                  //disabled={isLoading}
                  className="w-full py-3 mb-6"
                >
                  {plan.cta}
                </Button>

                <div className="space-y-3 flex-1">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      {feature.included ? <Check className="w-4 h-4 mt-0.5 text-green-500" /> : <X className="w-4 h-4 mt-0.5 text-gray-400" />}
                      <span className="text-sm text-gray-700 dark:text-gray-300">{feature.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>


    </div>
  );
};

export default TrialExpired;