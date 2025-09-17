// Types de base pour les congés
export type LeaveType = 'cp' | 'rtt' | 'cet' | 'pipe' | 'sick';

export interface LeaveEntry {
  id: string;
  type: LeaveType;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  workingDays: number;
  notes?: string;
  isHalfDay?: boolean;
  halfDayType?: 'morning' | 'afternoon';
  isForecast?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicHoliday {
  id: string;
  date: string; // ISO date string
  name: string;
  year: number;
  country?: string;
}

export interface AppSettings {
  id?: string;
  firstDayOfWeek: 'monday' | 'sunday';
  country: string;
  publicHolidays: PublicHoliday[];
  quotas: { type: LeaveType; yearlyQuota: number }[];
  darkMode: boolean;
  notifications: boolean;
  // Legacy properties for backward compatibility
  rttQuota?: number;
  cpQuota?: number;
  cetQuota?: number;
  year?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveBalance {
  type: LeaveType;
  taken: number;
  used: number; // Alias pour taken
  remaining: number;
  total: number;
  year: number;
}

export interface CarryoverLeave {
  id: string;
  type: LeaveType;
  year: number;
  days: number;
  description?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  leaves: LeaveEntry[];
}

// Types pour la validation des feuilles de paie
export interface PayrollData {
  id: string;
  month: number; // 1-12
  year: number;
  
  // Données de la feuille de paie
  cpReliquat: number; // Reliquat CP du mois précédent
  rttPrisDansMois: number; // RTT pris du mois précédent
  soldeCet: number; // Solde CET du mois précédent
  
  // CP pris du mois précédent (dates spécifiques)
  cpPrisMoisPrecedent: string[]; // ["2025-07-15", "2025-07-16", "2025-07-17", "2025-07-18"]
  
  // Jours fériés du mois précédent
  joursFeries: string[]; // ["2025-07-14"]
  
  // Métadonnées
  createdAt: string;
  updatedAt: string;
}

export interface PayrollValidation {
  month: number;
  year: number;
  
  // Données saisies vs calculées
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
    rttLeavesDates?: {
      startDate: string;
      endDate: string;
      workingDays: number;
    }[];
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
    calculees: number;
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