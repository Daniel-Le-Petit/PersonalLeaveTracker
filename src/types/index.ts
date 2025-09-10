// ... existing code ...

// Types pour la validation des feuilles de paie
export interface PayrollData {
  id: string;
  month: number; // 1-12
  year: number;
  
  // Données de la feuille de paie
  cpAvenir: number; // Solde CP à venir
  cpEcoules: number; // Solde CP écoulés
  cpReliquat: number; // Solde CP reliquat
  rttPrisDansMois: number; // Jour RTT Pris dans Mois
  soldeCet: number; // Solde CET
  
  // CP pris le mois précédent (dates spécifiques)
  cpPrisMoisPrecedent: string[]; // ["2025-07-15", "2025-07-16", "2025-07-17", "2025-07-18"]
  
  // Jours fériés du mois
  joursFeries: string[]; // ["2025-07-14"]
  
  // Métadonnées
  createdAt: string;
  updatedAt: string;
}

export interface PayrollValidation {
  month: number;
  year: number;
  
  // Données saisies vs calculées
  cpAvenir: {
    saisie: number;
    calculee: number;
    difference: number;
    status: 'valid' | 'warning' | 'error';
  };
  
  cpEcoules: {
    saisie: number;
    calculee: number;
    difference: number;
    status: 'valid' | 'warning' | 'error';
  };
  
  cpReliquat: {
    saisie: number;
    calculee: number;
    difference: number;
    status: 'valid' | 'warning' | 'error';
  };
  
  rttPrisDansMois: {
    saisie: number;
    calculee: number;
    difference: number;
    status: 'valid' | 'warning' | 'error';
  };
  
  soldeCet: {
    saisie: number;
    calculee: number;
    difference: number;
    status: 'valid' | 'warning' | 'error';
  };
  
  // Validation des dates CP
  cpPrisMoisPrecedent: {
    saisies: string[];
    calculees: string[];
    manquantes: string[];
    enTrop: string[];
    status: 'valid' | 'warning' | 'error';
  };
  
  // Validation des jours fériés
  joursFeries: {
    saisies: string[];
    calculees: string[];
    manquantes: string[];
    enTrop: string[];
    status: 'valid' | 'warning' | 'error';
  };
  
  // Score global de validation
  scoreGlobal: number; // 0-100
  statusGlobal: 'valid' | 'warning' | 'error';
}