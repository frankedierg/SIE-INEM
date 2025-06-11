import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user';
import { Router } from '@angular/router';


@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent {
  form: FormGroup;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  onSubmit() {
    this.error = null;
    if (this.form.invalid) return;
    this.userService.login(this.form.value).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        window.location.href = '/users/profile';
      },
      error: (err) => {
        if (err && err.status === 401) {
          this.error = 'Credenciales inválidas';
        } else if (err && err.error && err.error.message) {
          this.error = err.error.message;
        } else {
          this.error = 'Ocurrió un error al intentar iniciar sesión.';
        }
        this.cdr.detectChanges();
      }
    });
  }
}
