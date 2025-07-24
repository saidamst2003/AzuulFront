import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Atelier, AtelierService } from '../../services/atelier.service';
import { AuthService } from '../../services/auth';
import { Navbar } from '../../layout/navbar/navbar';
import { Footer } from '../../layout/footer/footer';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-atelier',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, Navbar, Footer],
  templateUrl: './atelier.html',
  styleUrl: './atelier.css'
})
export class atelier implements OnInit {
  ateliers: Atelier[] = [];
  atelierForm: FormGroup;
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  editingAtelier: Atelier | null = null;
  showForm = false;
  error = '';
  isAdmin = false;

  constructor(
    private atelierService: AtelierService,
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.atelierForm = this.fb.group({
      nom: ['', Validators.required],
      description: ['', Validators.required],
      genre: ['', Validators.required],
      date: ['', Validators.required],
      heure: ['', Validators.required]
    });
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0];
    if (this.selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(this.selectedFile);
    } else {
      this.imagePreview = null;
    }
  }

  onImgError(event: any) {
    event.target.src = 'assets/default-image.jpg';
  }

  ngOnInit() {
    this.authService.isAuthenticated$.subscribe(isAuthenticated => {
      if (isAuthenticated) {
        this.loadAteliers();
        this.authService.user$.subscribe((user: User | null) => {
          this.isAdmin = !!user && user.role === 'ADMIN';
        });
      }
    });
  }

  loadAteliers() {
    this.atelierService.getAllAteliers().subscribe({
      next: (data) => this.ateliers = data,
      error: (err) => this.error = 'Erreur lors du chargement des ateliers.'
    });
  }

  openCreateForm() {
    this.editingAtelier = null;
    this.atelierForm.reset();
    this.selectedFile = null;
    this.imagePreview = null;
    this.showForm = true;
  }

  openEditForm(atelier: Atelier) {
    this.editingAtelier = atelier;
    this.atelierForm.patchValue(atelier);
    this.showForm = true;
  }

  submitForm() {
    if (!this.atelierForm.valid) {
      this.error = 'Veuillez remplir tous les champs.';
      return;
    }

    if (this.editingAtelier) {
      // Logic for updating (without changing the photo for now)
      this.atelierService.updateAtelier(this.editingAtelier.id!, this.atelierForm.value).subscribe({
        next: () => {
          this.loadAteliers();
          this.cancel();
        },
        error: (err) => this.error = `Erreur lors de la modification.`
      });
    } else {
      // Logic for creating
      if (!this.selectedFile) {
        this.error = 'Veuillez sélectionner une photo.';
        return;
      }
      this.atelierService.createAtelier(this.atelierForm.value, this.selectedFile).subscribe({
        next: () => {
          this.loadAteliers();
          this.cancel();
        },
        error: (err) => this.error = `Erreur lors de la création.`
      });
    }
  }

  deleteAtelier(id: number) {
    if (confirm('Voulez-vous vraiment supprimer cet atelier ?')) {
      this.atelierService.deleteAtelier(id).subscribe({
        next: () => this.loadAteliers(),
        error: () => this.error = 'Erreur lors de la suppression.'
      });
    }
  }

  cancel() {
    this.showForm = false;
    this.editingAtelier = null;
    this.atelierForm.reset();
    this.selectedFile = null;
    this.imagePreview = null;
    this.error = '';
  }
}
