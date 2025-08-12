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
export interface CreateReservationDTO {
  atelierId: number;
  clientId: number;
  dateReservation: string; // format YYYY-MM-DD
}

export interface ReservationResponseDTO {
  id: number;
  dateReservation: string;
  clientId: number;
  clientNom: string;
  clientEmail: string;
  atelierId: number;
  atelierNom: string;
  atelierDescription: string;
}
