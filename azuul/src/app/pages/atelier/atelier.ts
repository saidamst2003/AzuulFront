import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Atelier, Coach, CreateAtelierDTO } from '../../models/atelier.model';
import { AtelierService } from '../../services/atelier.service';
import { AuthService } from '../../services/auth';
import { Router } from '@angular/router';
import { Footer } from "../../layout/footer/footer";
import { Navbar } from "../../layout/navbar/navbar";

interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning';
  message: string;
}

@Component({
  selector: 'app-ateliers',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Footer, Navbar],
  templateUrl: './atelier.html',
  styleUrls: ['./atelier.css']
})
export class AteliersComponent implements OnInit, OnDestroy {
  ateliers: Atelier[] = [];
  coaches: Coach[] = [];

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

  private subscription = new Subscription();

  constructor(
    private atelierService: AtelierService,
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
  }

  // Méthode pour vérifier le token
  checkToken(): void {
    this.atelierService.checkAndUseToken();
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
        } else {
          console.log('AtelierComponent: User is authenticated, loading data...');
          // Recharger les données si l'utilisateur vient de se connecter
          this.loadAteliers();
          this.loadCoaches();
        }
      })
    );

    // Vérifier aussi l'état initial
    const initialAuthState = this.authService.isAuthenticated();
    console.log('AtelierComponent: Initial authentication state:', initialAuthState);
    this.isAuthenticated = initialAuthState;
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate < today ? { futureDate: true } : null;
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
    this.subscription.add(
      this.atelierService.getCoaches().subscribe({
        next: (coaches) => {
          console.log('AtelierComponent: Coaches loaded:', coaches);
          this.coaches = coaches;
          if (coaches.length === 0) {
            console.log('AtelierComponent: No coaches available');
            // Don't show warning toast for empty coaches - this might be expected
            // this.showToast('warning', 'Aucun coach disponible pour le moment');
          } else {
            console.log('AtelierComponent: Loaded', coaches.length, 'coaches');
            // Show success message if we loaded coaches (including mock ones)
            if (coaches.length > 0) {
              console.log('AtelierComponent: Coaches available for atelier creation');
            }
          }
        },
        error: (error) => {
          console.log('AtelierComponent: Error loading coaches:', error);
          this.coaches = []; // Initialiser avec un tableau vide
          
          // Provide more specific error messages based on status code
          if (error.status === 403) {
            console.log('AtelierComponent: Access denied to coaches endpoint');
            // Don't show error toast for 403 - this might be expected behavior
            // this.showToast('warning', 'Vous n\'avez pas les permissions pour voir la liste des coaches');
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
    this.subscription.add(
      this.authService.user$.subscribe(user => {
        this.isAdmin = user?.role === 'ADMIN' || user?.role === 'COACH';
      })
    );
  }

  openCreateForm(): void {
    if (!this.isAuthenticated) {
      this.showToast('warning', 'Veuillez vous connecter pour créer un atelier');
      this.navigateToLogin();
      return;
    }

    this.editingAtelier = null;
    this.atelierForm.reset();
    this.imagePreview = null;
    this.selectedFile = null;
    this.showForm = true;
  }

  openEditForm(atelier: Atelier): void {
    if (!this.isAuthenticated) {
      this.showToast('warning', 'Veuillez vous connecter pour modifier un atelier');
      this.navigateToLogin();
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
             
            }
          }
        })
      );
    } else {
      const createDto: CreateAtelierDTO = {
        nom: formData.nom,
        description: formData.description,
        categorie: formData.categorie,
        date: formData.date,
        heure: formData.heure,
        coachId: +formData.coachId
      };

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

  onImageError(event: any, atelier: Atelier): void {
    const defaultImage = this.getImageUrlByCategorie(atelier.categorie);
    if (defaultImage) {
      event.target.src = defaultImage;
    }
  }

  deleteAtelier(id: number | undefined): void {
    if (!id) return;

    if (!this.isAuthenticated) {
      this.showToast('warning', 'Veuillez vous connecter pour supprimer un atelier');
      this.navigateToLogin();
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
    const today = new Date();
    return today.toISOString().split('T')[0];
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

  private showToast(type: 'success' | 'error' | 'warning', message: string): void {
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
}