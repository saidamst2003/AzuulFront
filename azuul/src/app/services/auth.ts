import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { LoginRequest, User } from '../models/user.model';
import { jwtDecode } from 'jwt-decode';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  [x: string]: any;
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:8081';
  private tokenKey = 'token';

  private _user = new BehaviorSubject<User | null>(null);
  public user$ = this._user.asObservable();

  private _isAuthenticated = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this._isAuthenticated.asObservable();

  private loggedIn = new BehaviorSubject<boolean>(this.hasToken());

  constructor(private router: Router) {
    if (this.isBrowser()) {
      const token = this.getToken();
      if (token && !this.isTokenExpired(token)) {
        this.updateState(token);
      }
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  login(loginRequest: LoginRequest): Observable<any> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post<any>(
      `${this.apiUrl}/user/login`,
      loginRequest,
      { headers }
    ).pipe(
      tap(response => {
        if (response && response.token) {
          if (this.isBrowser()) {
            localStorage.setItem(this.tokenKey, response.token);
            this.updateState(response.token);
            console.log('AuthService: Token stored successfully in localStorage.');
          }
        } else {
          console.log('AuthService: Login response did not contain a token.');
        }
      })
    );
  }

  register(registerRequest: any, role: string = 'APPRENANT') {
    return this.http.post(`${this.apiUrl}/user/register/${role}`, registerRequest);
  }

  logout(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(this.tokenKey);
    }
    this._user.next(null);
    this._isAuthenticated.next(false);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  getToken(): string | null {
    if (this.isBrowser()) {
      return localStorage.getItem(this.tokenKey);
    }
    return null;
  }

  getCurrentUser(): User | null {
    return this._user.getValue();
  }

  private updateState(token: string): void {
    const user: User = this.decodeToken(token);
    this._user.next(user);
    this._isAuthenticated.next(true);
  }

  private decodeToken(token: string): any {
    try {
      return jwtDecode(token);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  private isTokenExpired(token: string): boolean {
    try {
      const decoded: any = this.decodeToken(token);
      const expirationDate = new Date(0);
      expirationDate.setUTCSeconds(decoded.exp);
      return expirationDate.valueOf() < new Date().valueOf();
    } catch (error) {
      return true;
    }
  }

  private hasToken(): boolean {
    return this.isBrowser() && !!this.getToken();
  }
}
