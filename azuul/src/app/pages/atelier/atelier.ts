import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Atelier, Coach, CreateAtelierDTO } from '../../models/atelier.model';
import { AtelierService } from '../../services/atelier.service';
import { ReservationService } from '../../services/reservation.service';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { Footer } from "../../layout/footer/footer";
import { Navbar } from "../../layout/navbar/navbar";
import { FormsModule } from '@angular/forms';
import { CreateReservationDTO } from '../../models/reservation.model';

interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

@Component({
  selector: 'app-ateliers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, Footer, Navbar],
  templateUrl: './atelier.html',
  styleUrls: ['./atelier.css']
})
export class AteliersComponent implements OnInit, OnDestroy {
  ateliers: Atelier[] = [];
  coaches: Coach[] = [];
  filteredCoaches: Coach[] = [];

  isAdmin = false;
  isAuthenticated = false;
  error: string | null = null;
  showForm = false;
  editingAtelier: Atelier | null = null;
  isSubmitting = false;
  uploadProgress = 0;

  atelierForm: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  toasts: Toast[] = [];
  private toastCounter = 0;

  // --- Réservation ---
  showReservationModal = false;
  selectedDate: string = '';
  selectedAtelier: Atelier | null = null;

  private subscription = new Subscription();

  constructor(
    private atelierService: AtelierService,
    private reservationService: ReservationService,
    private authService: AuthService,
    public router: Router,
    private fb: FormBuilder
  ) {
    this.atelierForm = this.createForm();
  }

  ngOnInit(): void {
    this.checkAuthentication();
    this.loadAteliers();
    this.loadCoaches();
    this.checkAdminStatus();
    
    // Vérifier le token
    this.checkToken();

    // Filter coaches when category changes
    this.subscription.add(
      this.atelierForm.get('categorie')!.valueChanges.subscribe((cat: string) => {
        this.filterCoachesByCategory(cat);
        // reset coach selection when category changes
        this.atelierForm.get('coachId')!.setValue('');
      })
    );
  }

  // Méthode pour vérifier le token
  checkToken(): void {
    this.atelierService.checkAndUseToken();
  }

  // Méthode pour forcer l'affichage des boutons admin (debugging)
  forceShowAdminButtons(): void {
    console.log('AtelierComponent: Force showing admin buttons');
    this.isAdmin = true;
    console.log('AtelierComponent: isAdmin forced to true');
  }

  // Méthode de test pour vérifier que le composant fonctionne
  testMethod(): void {
    console.log('AtelierComponent: Test method called');
  }

  // Méthode publique pour forcer l'admin
  public forceAdmin(): void {
    console.log('AtelierComponent: Force admin called');
    this.isAdmin = true;
    console.log('AtelierComponent: isAdmin set to true');
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // Public method for navigation
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  private checkAuthentication(): void {
    this.subscription.add(
      this.authService.isAuthenticated$.subscribe(authenticated => {
        console.log('AtelierComponent: Authentication state changed:', authenticated);
        this.isAuthenticated = authenticated;
        if (!authenticated) {
          this.showToast('warning', 'Veuillez vous connecter pour accéder aux fonctionnalités complètes');
          this.coaches = []; // Clear coaches when not authenticated
        } else {
          console.log('AtelierComponent: User is authenticated, loading data...');
          // Recharger les données si l'utilisateur vient de se connecter
          this.loadAteliers();
          this.loadCoaches(); // Reload coaches when user becomes authenticated
        }
      })
    );

    // Vérifier aussi l'état initial
    const initialAuthState = this.authService.isAuthenticated();
    console.log('AtelierComponent: Initial authentication state:', initialAuthState);
    this.isAuthenticated = initialAuthState;
    
    // If initially authenticated, load coaches immediately
    if (initialAuthState) {
      this.loadCoaches();
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      categorie: ['', Validators.required],
      date: ['', [Validators.required, this.futureDateValidator]],
      heure: ['', Validators.required],
      coachId: ['', Validators.required]
    });
  }

  private futureDateValidator(control: any) {
    if (!control.value) return null;
    const selectedDate = new Date(control.value);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return selectedDate < tomorrow ? { futureDate: true } : null;
  }

  loadAteliers(): void {
    this.subscription.add(
      this.atelierService.getAll().subscribe({
        next: (ateliers) => {
          this.ateliers = ateliers;
          this.error = null;
        },
        error: (error) => {
          this.error = error.userMessage || 'Erreur lors du chargement des ateliers';
          this.showToast('error', this.error ?? 'Erreur inconnue');
          
          // Redirect to login if authentication error
          if (error.status === 401 || error.status === 403) {
            this.navigateToLogin();
          }
        }
      })
    );
  }

  loadCoaches(): void {
    console.log('AtelierComponent: Starting to load coaches...');
    console.log('AtelierComponent: Is authenticated:', this.isAuthenticated);
    console.log('AtelierComponent: User token:', this.authService.getToken() ? 'Present' : 'Missing');
    
    // Check if user is authenticated before loading coaches
    if (!this.isAuthenticated) {
      console.log('AtelierComponent: User not authenticated, skipping coaches load');
      this.coaches = [];
      return;
    }
    
    this.subscription.add(
      this.atelierService.getCoaches().subscribe({
        next: (coaches) => {
          console.log('AtelierComponent: Coaches loaded successfully:', coaches);
          this.coaches = coaches;
          // Initialize filtered list based on current category selection
          const currentCategory = this.atelierForm.get('categorie')!.value;
          this.filterCoachesByCategory(currentCategory);
          if (coaches.length === 0) {
            console.log('AtelierComponent: No coaches available');
            this.showToast('warning', 'Aucun coach disponible pour le moment');
          } else {
            console.log('AtelierComponent: Loaded', coaches.length, 'coaches');
            this.showToast('success', `${coaches.length} coach(es) chargé(s) avec succès`);
          }
        },
        error: (error) => {
          console.log('AtelierComponent: Error loading coaches:', error);
          this.coaches = []; // Initialiser avec un tableau vide
          
          // Provide more specific error messages based on status code
          if (error.status === 403) {
            console.log('AtelierComponent: Access denied to coaches endpoint');
            this.showToast('warning', 'Vous n\'avez pas les permissions pour voir la liste des coaches');
          } else if (error.status === 401) {
            console.log('AtelierComponent: Unauthorized - redirecting to login');
            this.showToast('warning', 'Session expirée. Veuillez vous reconnecter.');
            this.navigateToLogin();
          } else {
            this.showToast('warning', 'Impossible de charger la liste des coaches');
          }
          
          // Redirect to login if authentication error
          if (error.status === 401 || error.status === 403) {
            // Only redirect for 401, not 403 as 403 might be expected
            if (error.status === 401) {
              this.navigateToLogin();
            }
          }
        }
      })
    );
  }

  checkAdminStatus(): void {
    console.log('AtelierComponent: Checking admin status...');
    this.subscription.add(
      this.authService.user$.subscribe(user => {
        console.log('AtelierComponent: User data received:', user);
        console.log('AtelierComponent: User role:', user?.role);
        // Seul ADMIN peut créer/modifier/supprimer des ateliers
        this.isAdmin = user?.role === 'ADMIN';
        console.log('AtelierComponent: isAdmin set to:', this.isAdmin);
      })
    );
    
    // Vérifier aussi l'état initial
    const currentUser = this.authService.getCurrentUser();
    console.log('AtelierComponent: Current user from auth service:', currentUser);
    if (currentUser) {
      // Seul ADMIN peut créer/modifier/supprimer des ateliers
      this.isAdmin = currentUser.role === 'ADMIN';
      console.log('AtelierComponent: isAdmin set from current user:', this.isAdmin);
    }
  }

  // Helper method to check if user is a client (can make reservations)
  isClient(): boolean {
    // Les clients et coaches peuvent faire des réservations, mais pas les admins
    return this.isAuthenticated && !this.isAdmin;
  }

  openCreateForm(): void {
    if (!this.isAuthenticated) {
      this.showToast('warning', 'Veuillez vous connecter pour créer un atelier');
      this.navigateToLogin();
      return;
    }

    // Seul ADMIN peut créer des ateliers
    if (!this.isAdmin) {
      this.showToast('error', 'Seuls les administrateurs peuvent créer des ateliers');
      return;
    }

    this.editingAtelier = null;
    this.atelierForm.reset();
    this.imagePreview = null;
    this.selectedFile = null;
    // ensure category is empty so all coaches appear initially
    this.atelierForm.get('categorie')?.setValue('');
    // populate filtered coaches immediately
    this.filteredCoaches = [...this.coaches];
    this.showForm = true;
  }

  openEditForm(atelier: Atelier): void {
    if (!this.isAuthenticated) {
      this.showToast('warning', 'Veuillez vous connecter pour modifier un atelier');
      this.navigateToLogin();
      return;
    }

    // Seul ADMIN peut modifier des ateliers
    if (!this.isAdmin) {
      this.showToast('error', 'Seuls les administrateurs peuvent modifier des ateliers');
      return;
    }

    this.editingAtelier = atelier;
    this.atelierForm.patchValue({
      nom: atelier.nom,
      description: atelier.description,
      categorie: atelier.categorie,
      date: atelier.date,
      heure: atelier.heure,
      coachId: atelier.coach?.id || ''
    });

    this.filterCoachesByCategory(atelier.categorie);

    this.imagePreview = (atelier.photos && atelier.photos.length > 0) ? atelier.photos[0].url : null;

    this.showForm = true;
  }

  submitForm(): void {
    if (this.atelierForm.invalid) {
      Object.keys(this.atelierForm.controls).forEach(key => {
        this.atelierForm.get(key)?.markAsTouched();
      });
      return;
    }

    if (!this.isAuthenticated) {
      this.showToast('error', 'Veuillez vous connecter pour effectuer cette action');
      this.navigateToLogin();
      return;
    }

    // Seul ADMIN peut créer/modifier des ateliers
    if (!this.isAdmin) {
      this.showToast('error', 'Seuls les administrateurs peuvent créer ou modifier des ateliers');
      return;
    }

    // Check if user has a valid token
    const token = this.authService.getToken();
    if (!token) {
      this.showToast('error', 'Session expirée. Veuillez vous reconnecter.');
      this.navigateToLogin();
      return;
    }

    if (this.coaches.length === 0) {
      this.showToast('error', 'Aucun coach disponible pour créer un atelier');
      return;
    }

    this.isSubmitting = true;
    const formData = this.atelierForm.value;

    if (this.editingAtelier) {
      const updatedAtelier: Atelier = {
        ...this.editingAtelier,
        ...formData,
        coach: this.coaches.find(c => c.id === +formData.coachId) || null
      };

      this.subscription.add(
        this.atelierService.update(this.editingAtelier.id!, updatedAtelier).subscribe({
          next: () => {
            this.showToast('success', 'Atelier mis à jour avec succès');
            this.closeForm();
            this.loadAteliers();
          },
          error: (error) => {
            this.showToast('error', error.userMessage || 'Erreur lors de la mise à jour');
            this.isSubmitting = false;
            
            if (error.status === 401 || error.status === 403) {
              this.navigateToLogin();
            }
          }
        })
      );
    } else {
      // Validate and format the data before sending
      const coachId = +formData.coachId;
      if (isNaN(coachId) || coachId <= 0) {
        this.showToast('error', 'Veuillez sélectionner un coach valide');
        return;
      }

      // Ensure date is in the correct format (YYYY-MM-DD) and is in the future
      let formattedDate = formData.date;
      if (formattedDate) {
        const selectedDate = new Date(formattedDate);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0); // Reset time to start of day
        
        // Check if date is at least tomorrow
        if (selectedDate < tomorrow) {
          this.showToast('error', 'La date doit être au moins demain');
          return;
        }
        
        // Format date as YYYY-MM-DD
        if (!isNaN(selectedDate.getTime())) {
          formattedDate = selectedDate.toISOString().split('T')[0];
        }
      }

      // Ensure time is in the correct format (HH:MM)
      let formattedTime = formData.heure;
      if (formattedTime && formattedTime.length > 5) {
        formattedTime = formattedTime.substring(0, 5);
      }

      const createDto: CreateAtelierDTO = {
        nom: formData.nom.trim(),
        description: formData.description.trim(),
        categorie: formData.categorie,
        date: formattedDate,
        heure: formattedTime,
        coachId: coachId
      };

      // Validate all required fields
      if (!createDto.nom || createDto.nom.length < 3) {
        this.showToast('error', 'Le nom doit contenir au moins 3 caractères');
        return;
      }

      if (!createDto.description || createDto.description.length < 10) {
        this.showToast('error', 'La description doit contenir au moins 10 caractères');
        return;
      }

      if (!createDto.categorie) {
        this.showToast('error', 'Veuillez sélectionner une catégorie');
        return;
      }

      if (!createDto.date) {
        this.showToast('error', 'Veuillez sélectionner une date');
        return;
      }

      if (!createDto.heure) {
        this.showToast('error', 'Veuillez sélectionner une heure');
        return;
      }

      this.subscription.add(
        this.atelierService.create(createDto).subscribe({
          next: () => {
            this.showToast('success', 'Atelier créé avec succès');
            this.closeForm();
            this.loadAteliers();
          },
          error: (error) => {
            this.showToast('error', error.userMessage || 'Erreur lors de la création');
            this.isSubmitting = false;
            
            if (error.status === 401 || error.status === 403) {
              this.navigateToLogin();
            }
          }
        })
      );
    }
  }

  cancel(): void {
    this.closeForm();
  }

  private closeForm(): void {
    this.showForm = false;
    this.editingAtelier = null;
    this.atelierForm.reset();
    this.imagePreview = null;
    this.selectedFile = null;
    this.isSubmitting = false;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.selectedFile = file;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.imagePreview = null;
  }

  private filterCoachesByCategory(category: string): void {
    if (!category) {
      // No category selected: show all coaches
      this.filteredCoaches = [...this.coaches];
      return;
    }
    const normalizedCategory = this.normalize(category);
    this.filteredCoaches = this.coaches.filter((c) => {
      const spec = c.specialite ?? '';
      const normalizedSpec = this.normalize(spec);
      return normalizedSpec === normalizedCategory;
    });
    // If no coach matches the selected category, fall back to all to avoid empty list
    if (this.filteredCoaches.length === 0) {
      this.filteredCoaches = [...this.coaches];
    }
  }

  private normalize(value: string): string {
    return (value || '')
      .toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .toUpperCase();
  }

  onImageError(event: any, atelier: Atelier): void {
    const fallbackSvg = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect fill="#f5f5f5" width="600" height="400"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#999">Atelier</text></svg>');
    event.target.src = this.getImageUrlByCategorie(atelier.categorie) || fallbackSvg;
  }

  deleteAtelier(id: number | undefined): void {
    if (!id) return;

    if (!this.isAuthenticated) {
      this.showToast('warning', 'Veuillez vous connecter pour supprimer un atelier');
      this.navigateToLogin();
      return;
    }

    // Seul ADMIN peut supprimer des ateliers
    if (!this.isAdmin) {
      this.showToast('error', 'Seuls les administrateurs peuvent supprimer des ateliers');
      return;
    }

    if (confirm('Êtes-vous sûr de vouloir supprimer cet atelier ?')) {
      this.subscription.add(
        this.atelierService.delete(id).subscribe({
          next: () => {
            this.showToast('success', 'Atelier supprimé avec succès');
            this.loadAteliers();
          },
          error: (error) => {
            this.showToast('error', error.userMessage || 'Erreur lors de la suppression');
            
            if (error.status === 401 || error.status === 403) {
              this.navigateToLogin();
            }
          }
        })
      );
    }
  }

  getImageUrlByCategorie(categorie: string): string | undefined {
    return this.atelierService.getImageUrlByCategorie(categorie);
  }

  getTodayDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1); // Set to tomorrow
    return tomorrow.toISOString().split('T')[0];
  }

  closeModalOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeForm();
    }
  }

  canSubmitForm(): boolean {
    return this.atelierForm.valid && this.coaches.length > 0 && this.isAuthenticated;
  }

  getSubmitButtonText(): string {
    if (this.coaches.length === 0) {
      return 'Aucun coach disponible';
    }
    if (!this.isAuthenticated) {
      return 'Connectez-vous d\'abord';
    }
    return this.editingAtelier ? 'Modifier' : 'Créer';
  }

  private showToast(type: 'success' | 'error' | 'warning' | 'info', message: string): void {
    const toast: Toast = {
      id: this.toastCounter++,
      type,
      message
    };

    this.toasts.push(toast);

    setTimeout(() => {
      this.closeToast(toast);
    }, 5000);
  }

  closeToast(toast: Toast): void {
    const index = this.toasts.findIndex(t => t.id === toast.id);
    if (index > -1) {
      this.toasts.splice(index, 1);
    }
  }

  private loadCoachDetails(coachId: number): void {
    console.log('Loading coach details for ID:', coachId);
    console.log('Available coaches:', this.coaches);
    
    // Find coach in the loaded coaches list
    const coach = this.coaches.find(c => c.id === coachId);
    if (coach && this.selectedAtelier) {
      this.selectedAtelier.coach = coach;
      console.log('Coach details loaded successfully:', coach);
      console.log('Updated selectedAtelier:', this.selectedAtelier);
    } else {
      console.log('Coach not found in loaded coaches list, coachId:', coachId);
      console.log('Available coach IDs:', this.coaches.map(c => c.id));
      
      // Try to load coach from backend if not in local list
      this.loadCoachFromBackend(coachId);
    }
  }

  private loadCoachFromBackend(coachId: number): void {
    console.log('Attempting to load coach from backend, ID:', coachId);
    
    // Try to find coach in the loaded coaches list first
    const existingCoach = this.coaches.find(c => c.id === coachId);
    if (existingCoach && this.selectedAtelier) {
      this.selectedAtelier.coach = existingCoach;
      console.log('Found coach in loaded list:', existingCoach);
      return;
    }
    
    // If not found in loaded list, create a temporary coach object for display
    if (this.selectedAtelier) {
      const tempCoach: Coach = {
        id: coachId,
        nom: `Coach ${coachId}`,
        prenom: '',
        specialite: 'Spécialité non définie'
      };
      
      this.selectedAtelier.coach = tempCoach;
      console.log('Created temporary coach object:', tempCoach);
      console.log('Updated selectedAtelier with temp coach:', this.selectedAtelier);
      
      // Try to load coach details from backend service
      this.loadCoachDetailsFromService(coachId);
    }
  }

  private loadCoachDetailsFromService(coachId: number): void {
    console.log('Loading coach details from service for ID:', coachId);
    
    // Import CoachService if not already imported
    // You might need to inject CoachService in the constructor
    // For now, we'll use the existing coaches list
    if (this.coaches.length > 0) {
      const coach = this.coaches.find(c => c.id === coachId);
      if (coach && this.selectedAtelier) {
        this.selectedAtelier.coach = coach;
        console.log('Coach details loaded from service:', coach);
      }
    }
  }

  openReservationModal(atelier: Atelier): void {
    if (!this.isAuthenticated) {
      this.showToast('warning', 'Veuillez vous connecter pour réserver un atelier');
      this.navigateToLogin();
      return;
    }
    
    if (this.isAdmin) {
      this.showToast('warning', 'Les admins et coaches ne peuvent pas réserver d\'ateliers');
      return;
    }
    
    this.selectedAtelier = atelier;
    // Prefill date with atelier date if available
    this.selectedDate = (atelier.date && typeof atelier.date === 'string') ? atelier.date : '';
    this.showReservationModal = true;
    
    // Debug: Log coach information
    console.log('=== RESERVATION MODAL DEBUG ===');
    console.log('Atelier:', atelier);
    console.log('Atelier coach info:', atelier.coach);
    console.log('Atelier coachId:', atelier.coachId);
    console.log('Available coaches count:', this.coaches.length);
    console.log('Available coach IDs:', this.coaches.map(c => ({ id: c.id, name: `${c.prenom} ${c.nom}` })));
    
    // Try to load coach details if coachId exists
    if (atelier.coachId) {
      console.log('Coach ID found, attempting to load coach details...');
      
      // First try to find in loaded coaches
      const existingCoach = this.coaches.find(c => c.id === atelier.coachId);
      if (existingCoach) {
        console.log('Found coach in loaded list:', existingCoach);
        this.selectedAtelier.coach = existingCoach;
      } else {
        console.log('Coach not found in loaded list, creating temporary...');
        this.loadCoachFromBackend(atelier.coachId);
        
        // If coaches list is empty, try to reload it
        if (this.coaches.length === 0) {
          console.log('Coaches list is empty, attempting to reload...');
          this.loadCoaches();
        }
      }
    } else if (atelier.coach) {
      // If coach object exists but no coachId, use the coach object directly
      console.log('Coach object found, using it directly:', atelier.coach);
      this.selectedAtelier.coach = atelier.coach;
    } else {
      console.log('No coachId or coach object available for this atelier');
      console.log('This atelier has no coach assigned - this might be a backend issue');
      
      // Try to find coach by ID in the coaches list as fallback
      if (this.coaches.length > 0) {
        // This is a fallback - try to find any coach that might match
        const fallbackCoach = this.coaches.find(c => c.id === atelier.id || c.id === 1 || c.id === 6 || c.id === 7);
        if (fallbackCoach) {
          console.log('Using fallback coach:', fallbackCoach);
          this.selectedAtelier.coach = fallbackCoach;
          this.showToast('info', `Coach temporaire assigné: ${fallbackCoach.prenom} ${fallbackCoach.nom}`);
        } else {
          this.showToast('warning', 'Cet atelier n\'a pas de coach assigné. Problème de synchronisation avec le backend.');
        }
      } else {
        this.showToast('warning', 'Cet atelier n\'a pas de coach assigné. Problème de synchronisation avec le backend.');
      }
    }
    
    // Show info message if no date is set
    if (!atelier.date) {
      const coachName = this.selectedAtelier?.coach ? 
        `${this.selectedAtelier.coach.prenom || ''} ${this.selectedAtelier.coach.nom || ''}`.trim() : 
        'Non assigné';
      this.showToast('info', `Atelier "${atelier.nom}" - Date non définie, réservation possible avec le coach ${coachName}`);
    }
  }

  closeReservationModal(): void {
    this.showReservationModal = false;
    this.selectedAtelier = null;
    this.selectedDate = '';
  }

  closeReservationModalOnBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeReservationModal();
    }
  }
createReservation(): void {
  if (!this.selectedAtelier) return;

  // Check if atelier has a date, if not, use current date as fallback
  const reservationDate = this.selectedAtelier.date || new Date().toISOString().split('T')[0];

  if (this.isAdmin) {
    this.showToast('error', 'Les admins et coaches ne peuvent pas réserver d\'ateliers');
    return;
  }

  const user = this.authService.getCurrentUser();
  if (!user?.id) {
    this.showToast('error', 'Veuillez vous connecter');
    this.navigateToLogin();
    return;
  }

  const dto: CreateReservationDTO = {
    atelierId: this.selectedAtelier.id!,
    clientId: user.id,
    dateReservation: reservationDate
  };

  this.reservationService.create(dto).subscribe({
    next: () => {
      let successMessage = 'Réservation réussie !';
      
      if (this.selectedAtelier) {
        // Récupérer le nom du coach avec gestion des cas où il n'existe pas
        const coach = this.selectedAtelier.coach;
        let coachName = 'Non assigné';
        
        if (coach) {
          const prenom = coach.prenom || '';
          const nom = coach.nom || '';
          coachName = `${prenom} ${nom}`.trim();
          
          // Si après trim il n'y a rien, utiliser "Non assigné"
          if (!coachName) {
            coachName = 'Non assigné';
          }
        }
        
        // Message personnalisé avec le nom de l'atelier et du coach
        successMessage = `Réservation réussie pour l'atelier "${this.selectedAtelier.nom}" avec le coach ${coachName}`;
        
        // Optionnel: ajouter la date si elle existe
        if (this.selectedAtelier.date) {
          const dateFormatted = new Date(this.selectedAtelier.date).toLocaleDateString('fr-FR');
          successMessage += ` pour le ${dateFormatted}`;
        }
      }

      this.showToast('success', successMessage);
      this.closeReservationModal();
    },
    error: (err) => {
      const msg = err?.userMessage || err?.error?.message || 'Erreur lors de la réservation';
      this.showToast('error', msg);
    }
  });
}
}