export interface Income {
  id: string;
  amount: number;
  recordedAt: string;
  property: string;
  description: string;
  recordedBy: string;
  attachment: string | null;
}
export type DateRange = {
  from?: Date;
  to?: Date;
} | undefined;