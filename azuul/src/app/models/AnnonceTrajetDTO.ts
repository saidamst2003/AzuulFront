export interface AnnonceTrajetDTO {
  id?: number;
  destination: string;
  dateCreation?: string;
  typeMarchandise: string;
  description?: string;
  prix?: number;
  conducteurId?: number;
  conducteurNom?: string;
  conducteurEmail?: string;
  statut?: string;
  createdAt?: string;
  updatedAt?: string;
}

export enum TypeMarchandise {
  FRAGILE = 'FRAGILE',
  VOLUMINEUX = 'VOLUMINEUX',
  STANDARD = 'STANDARD',
  DANGEREUX = 'DANGEREUX'
} 