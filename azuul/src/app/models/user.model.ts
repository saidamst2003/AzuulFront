export interface User {
  id?: number;
  email: string;
  nom?: string;
  prenom?: string;
  role: string;
  telephone?: string;
  adresse?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  telephone?: string;
  adresse?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Atelier {
[x: string]: any;
  photos: boolean;
 id: number;
  nom: string;
  description: string;
  date: string;
  heure: string;
  photo: string;
  coachId: number;
  categorie?: string; 
}

export interface Image {
  id?: number;
  url: string;
  atelier?: Atelier;
}