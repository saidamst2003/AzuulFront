
export interface Atelier {
  id?: number;
  nom: string;
  description: string;
  categorie: string;
  date: string; 
  heure: string;
  coachId?: number; 
  coach?: Coach; 
  admin?: Admin; 
  photo?: string; 
  photos?: Image[]; 
}

export interface Coach {
  id: number;
  nom?: string;
  
  prenom?: string;
  fullName?: string;
  email?: string;
  specialite?: string;
}

export interface Admin {
  id: number;
  nom: string;
  prenom: string;
  email: string;
}

export interface Image {
  id?: number;
  url: string;
  atelier?: Atelier;
}

export interface CreateAtelierDTO {
  nom: string;
  description: string;
  categorie: string;
  date: string;
  heure: string;
  coachId: number;
}
