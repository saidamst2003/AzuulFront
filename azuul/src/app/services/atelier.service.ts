// src/app/services/atelier.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Atelier, Coach, CreateAtelierDTO, Image } from '../models/atelier.model';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class AtelierService {
  private readonly API_BASE_URL = 'http://localhost:8081/api/ateliers';
  private readonly COACHES_URL = 'http://localhost:8081/api/coaches';
  
  // Development flag to use mock data when backend is not available
  private readonly USE_MOCK_COACHES = false; // Set to false to use real API
  
  private ateliersSubject = new BehaviorSubject<Atelier[]>([]);
  public ateliers$ = this.ateliersSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    if (token) {
      return headers.set('Authorization', `Bearer ${token}`);
    }
    
    return headers;
  }

  private logUserInfo(): void {
    // Subscribe to user info to log current role
    this.authService.user$.subscribe(user => {
      if (user) {
        console.log('AtelierService: Current user role:', user.role);
        console.log('AtelierService: Current user ID:', user.id);
        console.log('AtelierService: Current user email:', user.email);
      } else {
        console.log('AtelierService: No user information available');
      }
    });
  }

  private logRequestDetails(): void {
    const token = this.authService.getToken();
    const headers = this.getAuthHeaders();
    
    console.log('AtelierService: Request details for coaches endpoint:');
    console.log('AtelierService: URL:', this.COACHES_URL);
    console.log('AtelierService: Token present:', !!token);
    console.log('AtelierService: Authorization header:', headers.get('Authorization') ? 'Present' : 'Missing');
    console.log('AtelierService: Content-Type header:', headers.get('Content-Type'));
    
    if (token) {
      try {
        // Try to decode token to see what's in it
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('AtelierService: Token payload:', payload);
        }
      } catch (error) {
        console.log('AtelierService: Could not decode token payload');
      }
    }
  }

  // Fonction pour vérifier et utiliser le token
  public checkAndUseToken(): void {
    const token = this.authService.getToken();
    
    console.log('=== TOKEN CHECK ===');
    console.log('Token exists:', !!token);
    
    if (token) {
      console.log('Token length:', token.length);
      console.log('Token starts with:', token.substring(0, 20) + '...');
      
      try {
        // Décoder le token JWT
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const header = JSON.parse(atob(tokenParts[0]));
          const payload = JSON.parse(atob(tokenParts[1]));
          
          console.log('Token header:', header);
          console.log('Token payload:', payload);
          console.log('User role:', payload.role);
          console.log('User ID:', payload.id);
          console.log('User email:', payload.email);
          
          // Vérifier l'expiration
          if (payload.exp) {
            const expirationDate = new Date(payload.exp * 1000);
            const now = new Date();
            const isExpired = expirationDate < now;
            
            console.log('Token expires at:', expirationDate);
            console.log('Current time:', now);
            console.log('Token is expired:', isExpired);
          }
        }
      } catch (error) {
        console.log('Error decoding token:', error);
      }
    } else {
      console.log('No token found in localStorage');
    }
    
    // Vérifier les headers d'autorisation
    const headers = this.getAuthHeaders();
    console.log('Authorization header:', headers.get('Authorization'));
    console.log('Content-Type header:', headers.get('Content-Type'));
    console.log('=== END TOKEN CHECK ===');
  }

  getAll(): Observable<Atelier[]> {
    return this.http.get<Atelier[]>(this.API_BASE_URL, { headers: this.getAuthHeaders() }).pipe(
      tap(data => {
        const processedData = data.map(atelier => this.processAtelierData(atelier));
        this.ateliersSubject.next(processedData);
      }),
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<Atelier> {
    return this.http.get<Atelier>(`${this.API_BASE_URL}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      tap(atelier => this.processAtelierData(atelier)),
      catchError(this.handleError)
    );
  }

  getCoaches(): Observable<Coach[]> {
    // Log user info for debugging
    this.logUserInfo();
    this.logRequestDetails();
    
    return this.http.get<Coach[]>(this.COACHES_URL, { headers: this.getAuthHeaders() }).pipe(
      catchError(error => {
        console.log('AtelierService: Error fetching coaches:', error);
        
        // Log more details about the error
        if (error.status === 403) {
          console.log('AtelierService: Access denied (403) to coaches endpoint');
          console.log('AtelierService: Current user token:', this.authService.getToken() ? 'Present' : 'Missing');
          console.log('AtelierService: User role:', this.authService.user$ ? 'Available' : 'Not available');
        } else if (error.status === 401) {
          console.log('AtelierService: Unauthorized (401) - token might be invalid');
        } else if (error.status === 0) {
          console.log('AtelierService: Network error - server might be down');
        }
        
        // Return empty array for errors
        console.log('AtelierService: Returning empty array due to error:', error.status);
        return of([]);
      })
    );
  }

  create(atelierDto: CreateAtelierDTO): Observable<Atelier> {
    return this.http.post<Atelier>(this.API_BASE_URL+"/create", atelierDto, { headers: this.getAuthHeaders() }).pipe(
      tap(newAtelier => {
        const processedAtelier = this.processAtelierData(newAtelier);
        const currentAteliers = this.ateliersSubject.value;
        this.ateliersSubject.next([...currentAteliers, processedAtelier]);
      }),
      catchError(this.handleError)
    );
  }

  update(id: number, atelier: Atelier): Observable<Atelier> {
    return this.http.put<Atelier>(`${this.API_BASE_URL}/${id}`, atelier, { headers: this.getAuthHeaders() }).pipe(
      tap(updatedAtelier => {
        const processedAtelier = this.processAtelierData(updatedAtelier);
        const currentAteliers = this.ateliersSubject.value;
        const index = currentAteliers.findIndex(a => a.id === id);
        if (index !== -1) {
          currentAteliers[index] = processedAtelier;
          this.ateliersSubject.next([...currentAteliers]);
        }
      }),
      catchError(this.handleError)
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_BASE_URL}/${id}`, { headers: this.getAuthHeaders() }).pipe(
      tap(() => {
        const currentAteliers = this.ateliersSubject.value;
        const filteredAteliers = currentAteliers.filter(a => a.id !== id);
        this.ateliersSubject.next(filteredAteliers);
      }),
      catchError(this.handleError)
    );
  }

  getImageUrlByCategorie(categorie: string): string | undefined {
    if (!categorie) return undefined;

    switch (categorie.toUpperCase()) {
      case 'ART':
        return 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=600&q=80';
      case 'CUISINE':
        return 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=600&q=80';
      case 'BIEN_ETRE':
        return 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80';
      case 'ENFANTS':
        return 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80';
      case 'DIY':
        return 'https://images.unsplash.com/photo-1615713170963-2595d2c721bb?auto=format&fit=crop&w=600&q=80';
      default:
        return 'https://via.placeholder.com/600x400?text=Atelier';
    }
  }

  private processAtelierData(atelier: Atelier): Atelier {
    // Assurer la compatibilité entre photo et photos
    if (atelier.photos && atelier.photos.length > 0) {
      atelier.photo = atelier.photos[0].url;
    }

    // Si pas de photo mais qu'on a une catégorie, utiliser l'image par défaut
    if (!atelier.photo && !atelier.photos && atelier.categorie) {
      atelier.photo = this.getImageUrlByCategorie(atelier.categorie);
    }

    // Formatage de la date et heure
    if (atelier.date && typeof atelier.date === 'string') {
      const dateObj = new Date(atelier.date);
      if (!isNaN(dateObj.getTime())) {
        atelier.date = dateObj.toISOString().split('T')[0];
      }
    }

    if (atelier.heure && atelier.heure.length > 5) {
      atelier.heure = atelier.heure.substring(0, 5);
    }

    return atelier;
  }

  private handleError(error: any): Observable<never> {
    console.error('Erreur API Atelier:', error);
    
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.status === 403) {
      errorMessage = 'Accès non autorisé. Veuillez vous connecter ou vérifier vos permissions.';
    } else if (error.status === 401) {
      errorMessage = 'Session expirée. Veuillez vous reconnecter.';
    } else if (error.status === 404) {
      errorMessage = 'Ressource non trouvée';
    } else if (error.status === 400) {
      errorMessage = 'Données invalides';
    } else if (error.status === 500) {
      errorMessage = 'Erreur serveur interne';
    } else if (error.status === 0) {
      errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    }

    return throwError(() => ({ ...error, userMessage: errorMessage }));
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }

  formatTime(timeString: string): string {
    return timeString.substring(0, 5);
  }
}