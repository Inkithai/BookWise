//types.ts
export type Property = {
  name: string;
  location: string;
  type: string;
};

export type DayInfo = {
  date: Date;
  day: number;
  weekday: string;
  isWeekend: boolean;
  isToday: boolean;
};

export type BookingStatus = 'confirmed' | 'pending' | 'cancelled';

export type Booking = {
  id: number;
  propertyIndex: number;
  startDay: number;
  endDay: number;
  length: number;
  guest: string;
  email: string;
  phone?: string;
  address?: string;
  guests?: string;
  status: BookingStatus;
  price: string;
  accommodationTotal?: string;
  cleaningFee?: string;
  subtotal?: string;
  vat?: string;
  paymentCharge?: string;
  commission?: string;
  totalPayout?: string;
  notes?: string;
};