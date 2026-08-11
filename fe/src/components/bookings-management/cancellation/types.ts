export interface CancellationRequest {
  cancellationRef: string;
  bookingRef: string;
  guest: string;
  amount: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected';
  requestedAt: string;
}