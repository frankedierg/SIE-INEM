import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:5000/api/auth';

  constructor(private http: HttpClient) { }

  login(data: { username: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data).pipe(
      catchError(this.handleError)
    );
  }

  register(data: { username: string; password: string; name: string; email: string; role: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data).pipe(
      catchError(this.handleError)
    );
  }

  getProfile(): Observable<any> {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (!token) return throwError(() => 'No autenticado');
    return this.http.get(`${this.apiUrl}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      catchError(this.handleError)
    );
  }

  updateProfile(data: { name?: string; email?: string; password?: string }): Observable<any> {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    if (!token) return throwError(() => 'No autenticado');
    return this.http.put(`${this.apiUrl}/profile`, data, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error); // Lanza el objeto completo para que el componente pueda acceder a status y message
  }
}
