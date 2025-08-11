import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth';
import { CreateReservationDTO, ReservationResponseDTO } from '../models/reservation.model';

@Injectable({ providedIn: 'root' })
export class ReservationService {
  private readonly API_BASE_URL = 'http://localhost:8081/api/reservations';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  create(dto: CreateReservationDTO): Observable<ReservationResponseDTO> {
    return this.http
      .post<ReservationResponseDTO>(this.API_BASE_URL, dto, { headers: this.getAuthHeaders() })
      .pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    let errorMessage = 'Une erreur est survenue lors de la réservation';
    if (error?.error?.message) errorMessage = error.error.message;
    return throwError(() => ({ ...error, userMessage: errorMessage }));
  }
}
