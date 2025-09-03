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
  private readonly DEBUG = false;
  
  // Development flag to use mock data when backend is not available
  private readonly USE_MOCK_COACHES = false; // Set to false to use real API
  
  private ateliersSubject = new BehaviorSubject<Atelier[]>([]);
  public ateliers$ = this.ateliersSubject.asObservable();
  
  // Cache pour les coaches
  private coachesCache: Coach[] = [];

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
    if (!this.DEBUG) return;
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
    if (!this.DEBUG) return;
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
    if (!this.DEBUG) return;
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
        if (this.DEBUG) console.log('Raw ateliers from backend:', data);
        const processedData = data.map(atelier => this.processAtelierData(atelier));
        
        // Enrichir avec les coaches du cache si disponibles
        if (this.coachesCache.length > 0) {
          const enrichedData = this.enrichAteliersWithCoaches(processedData, this.coachesCache);
          this.ateliersSubject.next(enrichedData);
        } else {
          // Si pas de cache, charger les coaches d'abord
          this.getCoaches().subscribe(coaches => {
            const enrichedData = this.enrichAteliersWithCoaches(processedData, coaches);
            this.ateliersSubject.next(enrichedData);
          });
        }
      }),
      catchError(this.handleError)
    );
  }

  // Attempt to get ateliers for a specific coach directly from backend (preferred when available)
  getByCoachId(coachId: number): Observable<Atelier[]> {
    const url = `${this.API_BASE_URL}/coach/${coachId}`;
    return this.http.get<Atelier[]>(url, { headers: this.getAuthHeaders() }).pipe(
      tap(data => {
        if (this.DEBUG) console.log(`Raw ateliers for coach ${coachId}:`, data);
        const processed = data.map(atelier => {
          // Ensure coachId is set since backend endpoint is scoped to this coach
          if (!atelier.coachId) {
            atelier.coachId = coachId;
          }
          return this.processAtelierData(atelier);
        });
        // Ensure coach linkage if cache available
        if (this.coachesCache.length > 0) {
          const enriched = this.enrichAteliersWithCoaches(processed, this.coachesCache);
          this.ateliersSubject.next(enriched);
        } else {
          this.ateliersSubject.next(processed);
        }
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
    
    if (this.DEBUG) console.log('AtelierService: Fetching coaches from:', this.COACHES_URL);
    
    // Check if user is authenticated before making the request
    const token = this.authService.getToken();
    if (!token) {
      console.log('AtelierService: No token available, returning mock coaches');
      const mockCoaches: Coach[] = [
        { id: 1, nom: 'Dupont', prenom: 'Marie', email: 'marie.dupont@example.com', specialite: 'Art' },
        { id: 2, nom: 'Martin', prenom: 'Pierre', email: 'pierre.martin@example.com', specialite: 'Cuisine' },
        { id: 3, nom: 'Bernard', prenom: 'Sophie', email: 'sophie.bernard@example.com', specialite: 'Bien-être' },
        { id: 4, nom: 'Petit', prenom: 'Jean', email: 'jean.petit@example.com', specialite: 'Enfants' },
        { id: 5, nom: 'Robert', prenom: 'Claire', email: 'claire.robert@example.com', specialite: 'DIY' }
      ];
      this.coachesCache = mockCoaches;
      return of(mockCoaches);
    }
    
    return this.http.get<Coach[]>(this.COACHES_URL, { headers: this.getAuthHeaders() }).pipe(
      tap(coaches => {
        if (this.DEBUG) console.log('AtelierService: Successfully loaded coaches:', coaches);
        this.coachesCache = coaches; // Cache les coaches
      }),
      catchError(error => {
        if (this.DEBUG) console.log('AtelierService: Error fetching coaches:', error);
        
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
        
        // Return mock coaches as fallback
        if (this.DEBUG) console.log('AtelierService: Returning mock coaches due to error:', error.status);
        const mockCoaches: Coach[] = [
          { id: 1, nom: 'Dupont', prenom: 'Marie', email: 'marie.dupont@example.com', specialite: 'Art' },
          { id: 2, nom: 'Martin', prenom: 'Pierre', email: 'pierre.martin@example.com', specialite: 'Cuisine' },
          { id: 3, nom: 'Bernard', prenom: 'Sophie', email: 'sophie.bernard@example.com', specialite: 'Bien-être' },
          { id: 4, nom: 'Petit', prenom: 'Jean', email: 'jean.petit@example.com', specialite: 'Enfants' },
          { id: 5, nom: 'Robert', prenom: 'Claire', email: 'claire.robert@example.com', specialite: 'DIY' }
        ];
        this.coachesCache = mockCoaches;
        return of(mockCoaches);
      })
    );
  }

  create(atelierDto: CreateAtelierDTO): Observable<Atelier> {
    console.log('=== CREATING ATELIER ===');
    console.log('DTO being sent:', atelierDto);
    console.log('CoachId in DTO:', atelierDto.coachId);
    
    return this.http.post<Atelier>(this.API_BASE_URL+"/create", atelierDto, { headers: this.getAuthHeaders() }).pipe(
      tap(newAtelier => {
        console.log('=== ATELIER CREATED ===');
        console.log('Response from backend:', newAtelier);
        console.log('CoachId in response:', newAtelier.coachId);
        console.log('Coach object in response:', newAtelier.coach);
        
        const processedAtelier = this.processAtelierData(newAtelier);
        console.log('Processed atelier:', processedAtelier);
        
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
    case 'ECRITURE':
      return 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=600&q=80';
    case 'JARDINAGE':
      return 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80';
   case 'BIJOUX':
      return 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80';
    case 'MAKEUP':
      return 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80';
   case 'YOGA':
      return 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80';
    case 'FITNESS':
      return 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80';
    case 'NATATION':
      return 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=600&q=80';
    default:
        return 'https://via.placeholder.com/600x400?text=Atelier';
    }
    }
  

  private processAtelierData(atelier: Atelier): Atelier {
    if (this.DEBUG) console.log('Processing atelier data:', atelier);
    
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

      // TEMPORARY FIX: Assign coachId based on atelier ID since backend doesn't return it
  if (!atelier.coachId && atelier.id) {
    // Mapping basé sur les données que vous avez partagées
    const coachMapping: { [key: number]: number } = {
      1: 2,   // Atelier 1 -> Coach 2
      11: 6,  // Atelier 11 -> Coach 6
      12: 6,  // Atelier 12 -> Coach 6
      13: 1,  // Atelier 13 -> Coach 1
      14: 1,  // Atelier 14 -> Coach 1
      15: 6,  // Atelier 15 -> Coach 6
      16: 7   // Atelier 16 -> Coach 7
    };
    
    if (coachMapping[atelier.id]) {
      atelier.coachId = coachMapping[atelier.id];
      if (this.DEBUG) console.log(`Assigned coachId ${atelier.coachId} to atelier ${atelier.id}`);
    } else {
      if (this.DEBUG) console.log(`No coach mapping found for atelier ${atelier.id}`);
    }
  }

    // Debug coach information
    if (this.DEBUG) {
      console.log('Coach info after processing:');
      console.log('- CoachId:', atelier.coachId);
      console.log('- Coach object:', atelier.coach);
      console.log('- Has coach data:', !!(atelier.coach || atelier.coachId));
    }

    return atelier;
  }

  // Nouvelle méthode pour enrichir les ateliers avec les données des coaches
  private enrichAteliersWithCoaches(ateliers: Atelier[], coaches: Coach[]): Atelier[] {
    if (this.DEBUG) console.log('Enriching ateliers with coaches...');
    if (this.DEBUG) console.log('Available coaches:', coaches.map(c => ({ 
      id: c.id, 
      name: `${c.prenom || ''} ${c.nom || ''}`.trim() || 'Sans nom',
      email: c.email 
    })));
    
    return ateliers.map(atelier => {
      if (this.DEBUG) console.log(`\nProcessing atelier ${atelier.id} with coachId:`, atelier.coachId);
      
      if (atelier.coachId && !atelier.coach) {
        const coach = coaches.find(c => c.id === atelier.coachId);
        if (coach) {
          atelier.coach = coach;
          if (this.DEBUG) console.log(`Enriched atelier ${atelier.id} with coach:`, {
            id: coach.id,
            name: `${coach.prenom || ''} ${coach.nom || ''}`.trim(),
            email: coach.email
          });
        } else {
          if (this.DEBUG) console.log(`Coach not found for atelier ${atelier.id} with coachId:`, atelier.coachId);
          if (this.DEBUG) console.log('🔍 Available coach IDs:', coaches.map(c => c.id));
        }
      } else if (!atelier.coachId) {
        if (this.DEBUG) console.log(`Atelier ${atelier.id} has no coachId assigned`);
        // Fallback: try to assign a coach by matching categorie with coach.specialite
        if (atelier.categorie) {
          const normalizedCategory = this.normalize(atelier.categorie);
          const matchingCoach = coaches.find(c => this.normalize(c.specialite || '') === normalizedCategory) || coaches[0];
          if (matchingCoach) {
            atelier.coachId = matchingCoach.id;
            atelier.coach = matchingCoach;
            if (this.DEBUG) console.log(`Assigned coach by category match for atelier ${atelier.id}:`, {
              id: matchingCoach.id,
              name: `${matchingCoach.prenom || ''} ${matchingCoach.nom || ''}`.trim(),
              specialite: matchingCoach.specialite
            });
          }
        }
      } else if (atelier.coach) {
        if (this.DEBUG) console.log(`Atelier ${atelier.id} already has coach:`, {
          id: atelier.coach.id,
          name: `${atelier.coach.prenom || ''} ${atelier.coach.nom || ''}`.trim(),
          email: atelier.coach.email
        });
      }
      
      return atelier;
    });
  }

  private normalize(value: string): string {
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .toUpperCase();
  }

  private handleError(error: any): Observable<never> {
    console.error('Erreur API Atelier:', error);
    
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.error?.error) {
      errorMessage = error.error.error;
    } else if (error.status === 403) {
      errorMessage = 'Accès non autorisé. Veuillez vous connecter ou vérifier vos permissions.';
    } else if (error.status === 401) {
      errorMessage = 'Session expirée. Veuillez vous reconnecter.';
    } else if (error.status === 404) {
      errorMessage = 'Ressource non trouvée';
    } else if (error.status === 400) {
      // Provide more specific error messages for validation errors
      if (error.error?.errors) {
        const validationErrors = Object.values(error.error.errors).flat();
        errorMessage = `Données invalides: ${validationErrors.join(', ')}`;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = 'Données invalides. Vérifiez que tous les champs sont correctement remplis.';
      }
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