// services/subscription.service.ts
import { http } from './service';
import {
  UserSubscription,
  SubscriptionResponse,
  ActivateSubscriptionPayload,
  ActivateSubscriptionResponse,
  BillingHistoryResponse,
} from '@/services/interface/subscription';


/**
 * Get current user's subscription status
 */
export const getUserSubscription = async (): Promise<UserSubscription> => {
  try {
    console.log('Fetching user subscription...');
    const response = await http.get<SubscriptionResponse>('admin/subscription/status');
    return response.data.data;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    throw error;
  }
};

/**
 * Activate a subscription plan
 */
export const activateSubscription = async (
  payload: ActivateSubscriptionPayload
): Promise<ActivateSubscriptionResponse> => {
  try {
    console.log('Activating subscription:', payload);
    const response = await http.post<ActivateSubscriptionResponse>(
      'admin/subscription/activate',
      payload
    );
    return response.data;
  } catch (error) {
    console.error('Error activating subscription:', error);
    throw error;
  }
};

/**
 * Change subscription plan
 */
export const changePlan = async (newPlanId: string): Promise<ActivateSubscriptionResponse> => {
  try {
    console.log('Changing plan to:', newPlanId);
    const response = await http.post<ActivateSubscriptionResponse>(
      'admin/subscription/change-plan',
      { planId: newPlanId }
    );
    return response.data;
  } catch (error) {
    console.error('Error changing plan:', error);
    throw error;
  }
};

/**
 * Cancel subscription
 */
export const cancelSubscription = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Cancelling subscription...');
    const response = await http.post<{ success: boolean; message: string }>(
      'admin/subscription/cancel'
    );
    return response.data;
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    throw error;
  }
};

/**
 * Get billing history
 */
export const getBillingHistory = async (
  limit: number = 10,
  offset: number = 0
): Promise<BillingHistoryResponse> => {
  try {
    console.log('Fetching billing history...');
    const response = await http.get<BillingHistoryResponse>(
      'admin/subscription/billing-history',
      {
        params: { limit, offset },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching billing history:', error);
    throw error;
  }
};

/**
 * Update payment method
 */
export const updatePaymentMethod = async (
  paymentMethodId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Updating payment method...');
    const response = await http.post<{ success: boolean; message: string }>(
      'admin/subscription/update-payment',
      { paymentMethodId }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating payment method:', error);
    throw error;
  }
};



export interface PayForPlanPayload {
  amount: number;
  currency: string;
  payment_method: 'card' | 'klarna' | 'revolut_pay';

  billing_name: string;
  billing_email: string;
  billing_phone?: string;
  billing_address_line1: string;
  billing_address_line2?: string;
  billing_city: string;
  billing_state?: string;
  billing_zip: string;
  billing_country: string;
}

export interface CreatePaymentIntentResponse {
  success: boolean;
  client_secret?: string;
  payment_intent_id?: string;
  message?: string;
}

export const createPaymentIntent = async (
  planId: string,
  amount: number,
  currency: string
): Promise<CreatePaymentIntentResponse> => {
  try {
    const response = await http.post<CreatePaymentIntentResponse>(
      '/admin/payment/create-payment-intent',
      {
        plan_id: planId,
        amount : amount,
        currency : currency,
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('Error creating payment intent:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Unknown error',
    };
  }
};

// export const payForPlan = async (
//   payload: PayForPlanPayload

// ): Promise<PaymentResponse> => {
//   try {
//    const formData = new FormData();
// formData.append("amount", String(payload.amount));
// formData.append("currency", payload.currency);
// formData.append("payment_method", payload.payment_method);
// formData.append("billing_name", payload.billing_name);
// formData.append("billing_email", payload.billing_email);
// formData.append("billing_phone", String(payload.billing_phone));
// formData.append("billing_address_line1", payload.billing_address_line1);
// formData.append("billing_address_line2", payload.billing_address_line2 ? payload.billing_address_line2 : "");
// formData.append("billing_city", payload.billing_city);
// formData.append("billing_state", payload.billing_state ? payload.billing_state:"");
// formData.append("billing_zip", payload.billing_zip);
// formData.append("billing_country", payload.billing_country);
    
//     const response = await http.post<PaymentResponse>(
//       "/admin/payment/create-payment-intent",
//       {
//         formData
//       }
//     );

//     return response.data;
//   } catch (error: any) {
//     console.error("Error creating payment intent:", error);
//     return {
//       success: false,
//       message: error.response?.data?.message || error.message || "Unknown error",
//     };
//   }
// };
