import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Coach } from '../models/atelier.model';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class CoachService {
  private readonly API_URL = 'http://localhost:8081/api/coaches';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  getAll(): Observable<Coach[]> {
    return this.http.get<Coach[]>(this.API_URL, { headers: this.getAuthHeaders() });
  }

  getById(id: number): Observable<Coach> {
    return this.http.get<Coach>(`${this.API_URL}/${id}`, { headers: this.getAuthHeaders() });
  }

  create(coach: Omit<Coach, 'id'> & { password?: string }): Observable<Coach> {
  const payload: any = {
    fullName: (coach.fullName || `${coach.prenom ?? ''} ${coach.nom ?? ''}`.trim()).trim(),
    email: coach.email,
    specialite: coach.specialite,
    password: coach['password']
  };

  return this.http.post<Coach>(
    `${this.API_URL}/create`,
    payload,
    { headers: this.getAuthHeaders() }
  );
}


  update(id: number, coach: Partial<Coach> & { password?: string }): Observable<Coach> {
    const payload: any = {
      fullName: coach.fullName,
      email: coach.email,
      specialite: coach.specialite
    };
    if (coach.password && coach.password.length >= 6) {
      payload.password = coach.password;
    }
    return this.http.put<Coach>(`${this.API_URL}/${id}`, payload, { headers: this.getAuthHeaders() });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${id}`, { headers: this.getAuthHeaders() });
  }
}


