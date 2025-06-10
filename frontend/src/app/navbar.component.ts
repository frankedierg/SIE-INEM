import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
  get isLoggedIn(): boolean {
    return typeof window !== 'undefined' && !!window.localStorage.getItem('token');
  }

  logout() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('token');
      window.location.reload();
    }
  }
}
