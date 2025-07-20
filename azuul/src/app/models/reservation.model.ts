export interface Reservation {
  id: number;
  userId: number;
  atelierId: number;
  date: string;
  time: string;
  numberOfPeople: number;
  status: ReservationStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationRequest {
  atelierId: number;
  date: string;
  time: string;
  numberOfPeople: number;
  notes?: string;
}

export enum ReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
} 