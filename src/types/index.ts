// Types pour l'application de gestion des congés

export type LeaveType = 'cp' | 'rtt' | 'cet' | 'sick';

export interface LeaveEntry {
  id: string;
  type: LeaveType;
  startDate: string; // Format ISO
  endDate: string;   // Format ISO
  workingDays: number;
  notes?: string;
  isHalfDay?: boolean;
  halfDayType?: 'morning' | 'afternoon';
  isForecast: boolean; // true = prévision, false = congé réel
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  type: LeaveType;
  total: number;
  used: number;
  remaining: number;
  carryover?: number; // Jours reportés des années précédentes
}

// Nouveau type pour les reliquats de congés
export interface CarryoverLeave {
  id: string;
  type: LeaveType;
  year: number; // Année d'origine
  days: number; // Nombre de jours reportés
  description?: string; // Description optionnelle
  createdAt: string;
  updatedAt: string;
}

export interface LeaveQuota {
  type: LeaveType;
  yearlyQuota: number;
  carryover?: number; // Report de l'année précédente
}

export interface PublicHoliday {
  id: string;
  date: string; // Format ISO
  name: string;
  country: string;
}

export interface AppSettings {
  firstDayOfWeek: 'monday' | 'sunday';
  country: string;
  publicHolidays: PublicHoliday[];
  quotas: LeaveQuota[];
  darkMode: boolean;
  notifications: boolean;
}

export interface LeaveStats {
  totalDays: number;
  byType: Record<LeaveType, number>;
  byMonth: Record<string, number>;
}

export interface CalendarDay {
  date: string;
  isLeave: boolean;
  leaveType?: LeaveType;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
}

export interface ExportData {
  leaves: LeaveEntry[];
  balances: LeaveBalance[];
  settings: AppSettings;
  exportDate: string;
}

// Types pour les filtres
export interface LeaveFilters {
  year?: number;
  month?: number;
  type?: LeaveType;
  dateRange?: {
    start: string;
    end: string;
  };
}

// Types pour les formulaires
export interface AddLeaveForm {
  type: LeaveType;
  startDate: string;
  endDate: string;
  notes?: string;
}

export interface EditLeaveForm extends AddLeaveForm {
  id: string;
}

// Types pour les notifications
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

// Types pour l'import/export
export interface CSVLeaveEntry {
  type: string;
  startDate: string;
  endDate: string;
  workingDays: string;
  notes?: string;
}

export interface ExcelLeaveEntry {
  Type: string;
  'Date de début': string;
  'Date de fin': string;
  'Jours ouvrés': number;
  'Notes'?: string;
}
