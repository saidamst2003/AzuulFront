import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Navbar } from '../../layout/navbar/navbar';
import { Footer } from '../../layout/footer/footer';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Coach } from '../../models/atelier.model';
import { CoachService } from '../../services/coach.service';

@Component({
  selector: 'app-dashbord-admin',
  standalone: true,
  imports: [CommonModule, Navbar, Footer, ReactiveFormsModule],
  templateUrl: './dashbord-admin.html',
  styleUrl: './dashbord-admin.css'
})
export class DashbordAdmin {
  coaches: Coach[] = [];
  loading = false;
  error: string | null = null;
  showForm = false;
  editing: Coach | null = null;
  form: FormGroup;

  constructor(public router: Router, private coachService: CoachService, private fb: FormBuilder) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.email]],
      specialite: ['', [Validators.required]],
      password: ['']
    });
  }

  ngOnInit(): void {
    this.loadCoaches();
  }

  loadCoaches(): void {
    this.loading = true;
    this.error = null;
    this.coachService.getAll().subscribe({
      next: data => { this.coaches = data; this.loading = false; },
      error: err => { this.error = err?.userMessage || 'Erreur lors du chargement'; this.loading = false; }
    });
  }

  openCreate(): void {
    this.editing = null;
    this.form.reset();
    this.form.get('specialite')?.setValidators([Validators.required]);
    this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.form.get('specialite')?.updateValueAndValidity();
    this.form.get('password')?.updateValueAndValidity();
    this.showForm = true;
  }

  openEdit(coach: Coach): void {
    this.editing = coach;
    this.form.patchValue({ fullName: coach.fullName || `${coach.prenom ?? ''} ${coach.nom ?? ''}`.trim(), email: coach.email || '', specialite: coach.specialite || '', password: '' });
    // password optional when editing; if filled, must be >= 6 chars
    this.form.get('password')?.setValidators([Validators.minLength(6)]);
    this.form.get('password')?.updateValueAndValidity();
    this.form.get('specialite')?.setValidators([Validators.required]);
    this.form.get('specialite')?.updateValueAndValidity();
    this.showForm = true;
  }

  submit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach(c => c.markAsTouched());
      return;
    }
    const value = this.form.value;
    if (this.editing) {
      const payload = { ...value };
      if (!payload.password) {
        delete (payload as any).password;
      }
      this.coachService.update(this.editing.id, payload).subscribe({
        next: updated => {
          const idx = this.coaches.findIndex(c => c.id === this.editing!.id);
          if (idx > -1) this.coaches[idx] = { ...this.editing!, ...updated };
          this.closeForm();
        },
        error: err => this.error = err?.userMessage || 'Erreur lors de la mise à jour'
      });
    } else {
      this.coachService.create(value).subscribe({
        next: created => { this.coaches = [created, ...this.coaches]; this.closeForm(); },
        error: err => this.error = err?.userMessage || 'Erreur lors de la création'
      });
    }
  }

  delete(coach: Coach): void {
    if (!confirm('Supprimer ce coach ?')) return;
    this.coachService.delete(coach.id).subscribe({
      next: () => { this.coaches = this.coaches.filter(c => c.id !== coach.id); },
      error: err => this.error = err?.userMessage || 'Erreur lors de la suppression'
    });
  }

  closeForm(): void {
    this.showForm = false;
    this.editing = null;
    this.form.reset();
  }

  getDisplayName(coach: Coach): string {
    const full = (coach.fullName || '').trim();
    if (full) return full;
    const parts = [coach.prenom ?? '', coach.nom ?? ''].filter(Boolean);
    return parts.join(' ').trim() || 'Coach';
  }

  getAvatar(coach: Coach): string {
    const name = encodeURIComponent(this.getDisplayName(coach));
    return `https://ui-avatars.com/api/?name=${name}&background=1a1a1a&color=ffffff&size=128&bold=true`;
  }
}
