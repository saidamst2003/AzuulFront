import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Atelier {
  id?: number;
  nom: string;
  description: string;
  date: string;
  heure: string;
  coach?: any;
  admin?: any;
}

@Injectable({ providedIn: 'root' })
export class AtelierService {
  private apiUrl = 'http://localhost:8081/api/ateliers';

  constructor(private http: HttpClient) {}

  getAllAteliers(): Observable<Atelier[]> {
    return this.http.get<Atelier[]>(this.apiUrl);
  }

  getAtelierById(id: number): Observable<Atelier> {
    return this.http.get<Atelier>(`${this.apiUrl}/${id}`);
  }

  createAtelier(atelier: Atelier): Observable<Atelier> {
    return this.http.post<Atelier>(this.apiUrl, atelier);
  }

  updateAtelier(id: number, atelier: Atelier): Observable<Atelier> {
    return this.http.put<Atelier>(`${this.apiUrl}/${id}`, atelier);
  }

  deleteAtelier(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
} 