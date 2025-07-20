import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class Register {
  registerForm: FormGroup;
  successMessage = '';
  errorMessage = '';

  constructor(private fb: FormBuilder, private http: HttpClient, private router: Router) {
    this.registerForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', Validators.required]
    });
  }

  onSubmit() {
    this.successMessage = '';
    this.errorMessage = '';
    if (this.registerForm.valid) {
      const userData = this.registerForm.value;
      const role = userData.role;
      // On retire le rôle du body car il est dans l'URL
      const { role: _, ...userDataSansRole } = userData;
      this.http.post(`http://localhost:8081/user/register/${role}`, userDataSansRole)
        .subscribe({
          next: () => {
            this.successMessage = 'Inscription réussie !';
            this.registerForm.reset();
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 1200);
          },
          error: (err) => {
            this.errorMessage = err.error?.message || err.message || 'Erreur lors de l\'inscription';
          }
        });
    } else {
      this.errorMessage = 'Veuillez remplir tous les champs correctement.';
    }
  }
}
