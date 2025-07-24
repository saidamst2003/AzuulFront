import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Atelier {
  id?: number;
  nom: string;
  description: string;
  genre: string;
  date: string;
  heure: string;
  coach?: any;
  admin?: any;
  photo?: string;
}

export interface Image {
  id: string;
  name: string;
  url: string;
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

  createAtelier(atelier: Atelier, file: File): Observable<Atelier> {
    const formData = new FormData();
    formData.append('atelier', new Blob([JSON.stringify(atelier)], { type: 'application/json' }));
    formData.append('file', file);
    return this.http.post<Atelier>(this.apiUrl, formData);
  }

  updateAtelier(id: number, atelier: Atelier): Observable<Atelier> {
    return this.http.put<Atelier>(`${this.apiUrl}/${id}`, atelier);
  }

  deleteAtelier(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getImages(): Observable<Image[]> {
    return this.http.get<Image[]>('http://localhost:8081/images');
  }
} 