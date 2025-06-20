import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserService } from '../../services/user';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss'
})
export class ProfileComponent implements OnInit {
  user: any = null;
  loading = true;
  error: string | null = null;
  success: string | null = null;
  editMode = false;
  form: FormGroup;
  saving = false;

  constructor(
    private userService: UserService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['']
    });
  }

  ngOnInit() {
    this.success = null;
    console.log('ngOnInit ejecutado');
    if (typeof window === 'undefined') {
      // No ejecutar en SSR
      return;
    }
    this.userService.getProfile().subscribe({
      next: (data) => {
        this.user = data;
        try {
          this.form.patchValue({ name: data.name, email: data.email });
        } catch (e) {
          this.error = 'Error al cargar el formulario: ' + (e as any).message;
        }
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = typeof err === 'string' ? err : (err?.message || JSON.stringify(err));
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  enableEdit() {
    this.editMode = true;
    this.success = null;
    this.error = null;
    this.form.patchValue({ name: this.user.name, email: this.user.email, password: '' });
  }

  cancelEdit() {
    this.editMode = false;
    this.success = null;
    this.error = null;
    this.form.patchValue({ name: this.user.name, email: this.user.email, password: '' });
  }

  saveProfile() {
    if (this.form.invalid) return;
    this.saving = true;
    const data: any = { name: this.form.value.name, email: this.form.value.email };
    if (this.form.value.password) data.password = this.form.value.password;
    this.userService.updateProfile(data).subscribe({
      next: (res) => {
        this.success = 'Perfil actualizado correctamente';
        this.error = null;
        this.editMode = false;
        this.user = { ...this.user, ...data };
        this.saving = false;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.success = null;
          this.cdr.detectChanges();
        }, 3000);
      },
      error: (err) => {
        this.error = err;
        this.success = null;
        this.saving = false;
      }
    });
  }
}
