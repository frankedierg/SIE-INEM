import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../../services/user';
import { Router } from '@angular/router';


@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss'
})
export class RegisterComponent {
  form: FormGroup;
  error: string | null = null;
  success: string | null = null;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      role: ['student', Validators.required]
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    this.userService.register(this.form.value).subscribe({
      next: (res) => {
        this.success = 'Registro exitoso. Ahora puedes iniciar sesión.';
        setTimeout(() => this.router.navigate(['/users/login']), 1500);
      },
      error: (err) => {
        this.error = err;
      }
    });
  }
}

