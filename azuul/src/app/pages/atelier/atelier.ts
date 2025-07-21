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
export class Atelier implements OnInit {
  ateliers: Atelier[] = [];
  atelierForm: FormGroup;
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
      date: ['', Validators.required],
      heure: ['', Validators.required]
    });
  }

  ngOnInit() {
    this.loadAteliers();
    this.authService.user$.subscribe((user: User | null) => {
      this.isAdmin = !!user && user.role === 'ADMIN';
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

    const action = this.editingAtelier
      ? this.atelierService.updateAtelier(this.editingAtelier.id!, this.atelierForm.value)
      : this.atelierService.createAtelier(this.atelierForm.value);

    action.subscribe({
      next: () => {
        this.loadAteliers();
        this.cancel();
      },
      error: (err) => this.error = `Erreur lors de ${this.editingAtelier ? 'la modification' : 'la création'}.`
    });
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
    this.error = '';
  }
}
