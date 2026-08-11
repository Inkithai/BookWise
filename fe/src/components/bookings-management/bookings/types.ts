export interface BookingDetail {
  id: string;
  guest: string;
  email: string;
  phone: string;
  channel: string;
  checkIn: string;
  checkOut: string;
  amount: number;
  status: string;
  createdAt: string;
  
}

export interface Booking {
  id: string;
  category: string;
  client: string;
  property: string;
  checkIns: number;
  revenue: number;
  payout: number;
  details: BookingDetail[];
  date: string;  // Add this line
}