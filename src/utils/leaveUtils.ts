import { addDays, format, isAfter, isBefore, isSameDay, isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDay, CarryoverLeave, LeaveBalance, LeaveEntry, LeaveType, PublicHoliday } from '../types';

// Configuration des types de congés
export const LEAVE_TYPES = {
  cp: { label: 'Congés Payés', color: 'leave-cp', icon: '🏖️' },
  rtt: { label: 'RTT', color: 'leave-rtt', icon: '📅' },
  cet: { label: 'CET', color: 'leave-cet', icon: '🏥' },
  pipe: { label: 'PIPE', color: 'leave-pipe', icon: '🔧' },
  sick: { label: 'Maladie', color: 'leave-sick', icon: '🏥' },
} as const;

// Types de congés qui comptent dans les statistiques principales (exclut PIPE)
export const LEAVE_TYPES_FOR_STATS: LeaveType[] = ['cp', 'rtt', 'cet'];

// Types de congés qui comptent dans les quotas (exclut PIPE, prevision, reel)
export const LEAVE_TYPES_FOR_QUOTAS: LeaveType[] = ['cp', 'rtt', 'cet'];

/**
 * Vérifie si un type de congé doit être inclus dans les statistiques principales
 */
export function isLeaveTypeForStats(type: LeaveType): boolean {
  return LEAVE_TYPES_FOR_STATS.includes(type);
}

/**
 * Vérifie si un type de congé doit être inclus dans les quotas
 */
export function isLeaveTypeForQuotas(type: LeaveType): boolean {
  return LEAVE_TYPES_FOR_QUOTAS.includes(type);
}

// Jours fériés français 2024
export const FRENCH_HOLIDAYS_2024: PublicHoliday[] = [
  { id: '1', date: '2024-01-01', name: 'Jour de l\'an', year: 2024, country: 'FR' },
  { id: '2', date: '2024-05-01', name: 'Fête du travail', year: 2024, country: 'FR' },
  { id: '3', date: '2024-05-08', name: 'Victoire 1945', year: 2024, country: 'FR' },
  { id: '4', date: '2024-05-09', name: 'Ascension', year: 2024, country: 'FR' },
  { id: '5', date: '2024-05-20', name: 'Lundi de Pentecôte', year: 2024, country: 'FR' },
  { id: '6', date: '2024-07-14', name: 'Fête nationale', year: 2024, country: 'FR' },
  { id: '7', date: '2024-08-15', name: 'Assomption', year: 2024, country: 'FR' },
  { id: '8', date: '2024-11-01', name: 'Toussaint', year: 2024, country: 'FR' },
  { id: '9', date: '2024-11-11', name: 'Armistice', year: 2024, country: 'FR' },
  { id: '10', date: '2024-12-25', name: 'Noël', year: 2024, country: 'FR' },
];

// Jours fériés français 2025
export const FRENCH_HOLIDAYS_2025: PublicHoliday[] = [
  { id: '1', date: '2025-01-01', name: 'Jour de l\'an', year: 2025, country: 'FR' },
  { id: '2', date: '2025-05-01', name: 'Fête du travail', year: 2025, country: 'FR' },
  { id: '3', date: '2025-05-08', name: 'Victoire 1945', year: 2025, country: 'FR' },
  { id: '4', date: '2025-05-29', name: 'Ascension', year: 2025, country: 'FR' },
  { id: '5', date: '2025-06-09', name: 'Lundi de Pentecôte', year: 2025, country: 'FR' },
  { id: '6', date: '2025-07-14', name: 'Fête nationale', year: 2025, country: 'FR' },
  { id: '7', date: '2025-08-15', name: 'Assomption', year: 2025, country: 'FR' },
  { id: '8', date: '2025-11-01', name: 'Toussaint', year: 2025, country: 'FR' },
  { id: '9', date: '2025-11-11', name: 'Armistice', year: 2025, country: 'FR' },
  { id: '10', date: '2025-12-25', name: 'Noël', year: 2025, country: 'FR' },
];

/**
 * Calcule le nombre de jours ouvrés entre deux dates
 */
export function calculateWorkingDays(
  startDate: string, 
  endDate: string, 
  holidays: PublicHoliday[] = [],
  isHalfDay: boolean = false,
  halfDayType?: 'morning' | 'afternoon'
): number {
  // Parse dates safely using new Date() instead of parseISO
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Validate dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.error('Invalid date input:', { startDate, endDate });
    return 0;
  }
  
  let workingDays = 0;
  let currentDate = start;

  while (!isAfter(currentDate, end)) {
    if (!isWeekend(currentDate) && !isHoliday(currentDate, holidays)) {
      workingDays++;
    }
    currentDate = addDays(currentDate, 1);
  }

  // Si c'est un demi-jour, ajuster le calcul
  if (isHalfDay && workingDays > 0) {
    // Si c'est le même jour (début = fin), c'est 0.5 jour
    if (isSameDay(start, end)) {
      workingDays = 0.5;
    } else {
      // Pour les périodes de plusieurs jours, on peut ajuster selon le type de demi-jour
      // Par défaut, on garde le calcul normal car les demi-jours sont généralement
      // appliqués au premier ou dernier jour selon le contexte
    }
  }

  return workingDays;
}

/**
 * Vérifie si une date est un jour férié
 */
export function isHoliday(date: Date, holidays: PublicHoliday[]): boolean {
  return holidays.some(holiday => {
    const holidayDate = new Date(holiday.date);
    // Comparer les dates en format YYYY-MM-DD pour éviter les problèmes de timezone
    const dateStr = date.toISOString().split('T')[0];
    const holidayStr = holidayDate.toISOString().split('T')[0];
    return dateStr === holidayStr;
  });
}

/**
 * Obtient les jours fériés pour une année donnée
 */
export function getHolidaysForYear(year: number): PublicHoliday[] {
  if (year === 2024) return FRENCH_HOLIDAYS_2024;
  if (year === 2025) return FRENCH_HOLIDAYS_2025;
  
  // Pour les autres années, on peut étendre ou utiliser une API
  return [];
}

/**
 * Calcule le solde de congés pour chaque type en incluant les reliquats
 */
export function calculateLeaveBalances(
  leaves: LeaveEntry[],
  quotas: { type: LeaveType; yearlyQuota: number }[],
  carryovers: CarryoverLeave[] = [],
  year: number = new Date().getFullYear()
): LeaveBalance[] {
  const balances: LeaveBalance[] = [];

  quotas.forEach(quota => {
    const yearLeaves = leaves.filter(leave => 
      leave.type === quota.type && 
      new Date(leave.startDate).getFullYear() === year
    );

    const used = yearLeaves.reduce((total, leave) => total + leave.workingDays, 0);
    
    // Calculer les reliquats pour ce type de congé
    const carryoverDays = carryovers
      .filter(carryover => carryover.type === quota.type)
      .reduce((total, carryover) => total + carryover.days, 0);
    
    // Le total inclut le quota annuel + les reliquats
    const totalWithCarryover = quota.yearlyQuota + carryoverDays;
    const remaining = Math.max(0, totalWithCarryover - used);

    balances.push({
      type: quota.type,
      total: totalWithCarryover,
      taken: used,
      used: used, // Alias pour taken
      remaining,
      year
    });
  });

  return balances;
}

/**
 * Calcule les reliquats disponibles pour une année donnée
 */
export function calculateAvailableCarryover(
  carryovers: CarryoverLeave[],
  year: number = new Date().getFullYear()
): Record<LeaveType, number> {
  const available: Record<LeaveType, number> = {
    cp: 0, rtt: 0, cet: 0, pipe: 0, sick: 0
  };

  carryovers.forEach(carryover => {
    available[carryover.type] += carryover.days;
  });

  return available;
}

/**
 * Génère un résumé des reliquats par année
 */
export function generateCarryoverSummary(carryovers: CarryoverLeave[]): {
  byYear: Record<number, CarryoverLeave[]>;
  byType: Record<LeaveType, CarryoverLeave[]>;
  totalByType: Record<LeaveType, number>;
} {
  const byYear: Record<number, CarryoverLeave[]> = {};
  const byType: Record<LeaveType, CarryoverLeave[]> = {
    cp: [], rtt: [], cet: [], pipe: [], sick: []
  };
  const totalByType: Record<LeaveType, number> = {
    cp: 0, rtt: 0, cet: 0, pipe: 0, sick: 0
  };

  carryovers.forEach(carryover => {
    // Par année
    if (!byYear[carryover.year]) {
      byYear[carryover.year] = [];
    }
    byYear[carryover.year].push(carryover);

    // Par type
    byType[carryover.type].push(carryover);
    totalByType[carryover.type] += carryover.days;
  });

  return { byYear, byType, totalByType };
}

/**
 * Valide si les RTT peuvent être pris pour un mois donné
 * Les RTT s'accumulent à la fin du mois, donc on ne peut les prendre
 * que si le mois correspondant est passé
 */
export function canTakeRTTForMonth(
  targetMonth: number, // 1-12
  targetYear: number,
  currentDate: Date = new Date()
): { canTake: boolean; reason?: string; availableDays: number } {
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();
  
  // Si on est dans une année future, on ne peut pas encore prendre les RTT
  if (targetYear > currentYear) {
    return {
      canTake: false,
      reason: `Les RTT de ${targetYear} ne sont pas encore disponibles`,
      availableDays: 0
    };
  }
  
  // Si on est dans une année passée, on peut prendre les RTT
  if (targetYear < currentYear) {
    return {
      canTake: true,
      availableDays: 2 // 2 RTT par mois
    };
  }
  
  // Même année : vérifier si le mois est passé
  if (targetMonth < currentMonth) {
    return {
      canTake: true,
      availableDays: 2
    };
  } else if (targetMonth === currentMonth) {
    // Pour le mois en cours, on peut prendre les RTT dès le début du mois
    return {
      canTake: true,
      availableDays: 2
    };
  } else {
    // Mois futur - possible en prévision
    return {
      canTake: true,
      availableDays: 2,
      reason: `RTT disponible en prévision pour ${targetYear}`
    };
  }
}

/**
 * Calcule le nombre total de RTT disponibles pour une période donnée
 */
export function calculateAvailableRTTForPeriod(
  startDate: Date,
  endDate: Date,
  currentDate: Date = new Date()
): { totalAvailable: number; details: Array<{ month: number; year: number; available: number; canTake: boolean }> } {
  const details: Array<{ month: number; year: number; available: number; canTake: boolean }> = [];
  let totalAvailable = 0;
  
  const current = new Date(startDate);
  
  while (current <= endDate) {
    const month = current.getMonth() + 1;
    const year = current.getFullYear();
    
    const validation = canTakeRTTForMonth(month, year, currentDate);
    
    details.push({
      month,
      year,
      available: validation.availableDays,
      canTake: validation.canTake
    });
    
    // Pour les prévisions, on compte tous les mois (passés, présents et futurs)
    totalAvailable += validation.availableDays;
    
    // Passer au mois suivant
    current.setMonth(current.getMonth() + 1);
  }
  
  return { totalAvailable, details };
}

/**
 * Calcule le nombre total de RTT disponibles actuellement
 * (depuis le début de l'année jusqu'à maintenant)
 */
export function calculateCurrentAvailableRTT(
  currentDate: Date = new Date(),
  year: number = currentDate.getFullYear()
): { totalAvailable: number; details: Array<{ month: number; available: number; canTake: boolean; reason?: string }> } {
  const details: Array<{ month: number; available: number; canTake: boolean; reason?: string }> = [];
  let totalAvailable = 0;
  
  // Parcourir tous les mois de l'année (y compris les mois futurs en prévision)
  for (let month = 1; month <= 12; month++) {
    const validation = canTakeRTTForMonth(month, year, currentDate);
    
    details.push({
      month,
      available: validation.availableDays,
      canTake: validation.canTake,
      reason: validation.reason
    });
    
    // Pour les prévisions, on compte tous les mois (passés, présents et futurs)
    totalAvailable += validation.availableDays;
  }
  
  return { totalAvailable, details };
}

// Nouvelle fonction pour calculer les données séparées par type (réel vs prévision)
export function calculateMonthlyLeaveSummarySeparated(
  leaves: LeaveEntry[],
  quotas: { type: LeaveType; yearlyQuota: number }[],
  carryovers: CarryoverLeave[] = [],
  year: number = new Date().getFullYear()
): {
  months: Array<{
    month: number;
    monthName: string;
    rtt: {
      real: { taken: number; cumul: number; remaining: number };
      forecast: { taken: number; cumul: number; remaining: number };
    };
    cp: {
      real: { taken: number; cumul: number; remaining: number };
      forecast: { taken: number; cumul: number; remaining: number };
    };
  }>;
  yearlyTotals: {
    rtt: { real: number; forecast: number; total: number };
    cp: { real: number; forecast: number; total: number };
  };
} {
  const months = [];
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();

  // Récupérer les quotas
  const rttQuota = quotas.find(q => q.type === 'rtt')?.yearlyQuota || 23;
  const cpQuota = quotas.find(q => q.type === 'cp')?.yearlyQuota || 25;
  const cetQuota = quotas.find(q => q.type === 'cet')?.yearlyQuota || 5;
  const totalCPCETQuota = cpQuota + cetQuota;

  // Récupérer les reliquats
  const rttCarryover = carryovers.find(c => c.type === 'rtt')?.days || 0;
  const cpCarryover = carryovers.find(c => c.type === 'cp')?.days || 0;
  const cetCarryover = carryovers.find(c => c.type === 'cet')?.days || 0;
  const totalCPCETCarryover = cpCarryover + cetCarryover;

  // Ajouter la ligne des reliquats au début
  months.push({
    month: 0,
    monthName: 'Reliquats',
    rtt: {
      real: { taken: 0, cumul: 0, remaining: rttCarryover },
      forecast: { taken: 0, cumul: 0, remaining: rttCarryover }
    },
    cp: {
      real: { taken: 0, cumul: 0, remaining: totalCPCETCarryover },
      forecast: { taken: 0, cumul: 0, remaining: totalCPCETCarryover }
    }
  });

  let rttCumulReal = 0;
  let rttCumulForecast = 0;
  let cpCumulReal = 0;
  let cpCumulForecast = 0;

  for (let month = 1; month <= 12; month++) {
    // Filtrer les congés pour ce mois et cette année
    const monthLeaves = leaves.filter(leave => {
      const leaveDate = new Date(leave.startDate);
      return leaveDate.getFullYear() === year && leaveDate.getMonth() === month - 1;
    });

    // Séparer les congés réels et les prévisions
    // Si le mois est passé, les prévisions deviennent réelles
    const isMonthPassed = year < currentYear || (year === currentYear && month < currentMonth);
    const isCurrentMonth = year === currentYear && month === currentMonth;
    
    // Congés réels : tous les congés non marqués comme prévision OU les prévisions des mois passés
    const rttReal = monthLeaves
      .filter(leave => leave.type === 'rtt' && (!leave.isForecast || isMonthPassed))
      .reduce((sum, leave) => sum + leave.workingDays, 0);

    const cpReal = monthLeaves
      .filter(leave => leave.type === 'cp' && (!leave.isForecast || isMonthPassed))
      .reduce((sum, leave) => sum + leave.workingDays, 0);

    // Pour les prévisions, compter les congés marqués comme prévision des mois futurs
    // ET les congés non marqués comme prévision des mois futurs (pour simulation)
    const rttForecast = monthLeaves
      .filter(leave => leave.type === 'rtt' && (leave.isForecast || (!isMonthPassed && !isCurrentMonth)))
      .reduce((sum, leave) => sum + leave.workingDays, 0);

    const cpForecast = monthLeaves
      .filter(leave => leave.type === 'cp' && (leave.isForecast || (!isMonthPassed && !isCurrentMonth)))
      .reduce((sum, leave) => sum + leave.workingDays, 0);

    // Calculer les cumuls
    rttCumulReal += rttReal;
    rttCumulForecast += rttForecast;
    cpCumulReal += cpReal;
    cpCumulForecast += cpForecast;

    // Calculer les soldes restants (cumuls inversés)
    // Les reliquats sont déjà inclus dans les quotas totaux
    const rttRemainingReal = Math.max(0, rttQuota + rttCarryover - rttCumulReal);
    const rttRemainingForecast = Math.max(0, rttQuota + rttCarryover - rttCumulReal - rttCumulForecast);
    const cpRemainingReal = Math.max(0, totalCPCETQuota + totalCPCETCarryover - cpCumulReal);
    const cpRemainingForecast = Math.max(0, totalCPCETQuota + totalCPCETCarryover - cpCumulReal - cpCumulForecast);

    months.push({
      month,
      monthName: monthNames[month - 1],
      rtt: {
        real: { taken: rttReal, cumul: rttCumulReal, remaining: rttRemainingReal },
        forecast: { taken: rttForecast, cumul: rttCumulForecast, remaining: rttRemainingForecast }
      },
      cp: {
        real: { taken: cpReal, cumul: cpCumulReal, remaining: cpRemainingReal },
        forecast: { taken: cpForecast, cumul: cpCumulForecast, remaining: cpRemainingForecast }
      }
    });
  }

  return {
    months,
    yearlyTotals: {
      rtt: { real: rttCumulReal, forecast: rttCumulForecast, total: rttCumulReal + rttCumulForecast },
      cp: { real: cpCumulReal, forecast: cpCumulForecast, total: cpCumulReal + cpCumulForecast }
    }
  };
}

// Fonction utilitaire pour vérifier si deux congés correspondent à la même période
function isSamePeriod(forecast: LeaveEntry, real: LeaveEntry): boolean {
  // Si c'est un seul jour, vérifier la date exacte
  if (forecast.workingDays === 1 && real.workingDays === 1) {
    return forecast.startDate === real.startDate;
  }
  
  // Si c'est une période, vérifier si les dates se chevauchent
  const forecastStart = new Date(forecast.startDate);
  const forecastEnd = new Date(forecast.endDate);
  const realStart = new Date(real.startDate);
  const realEnd = new Date(real.endDate);
  
  // Vérifier si les périodes se chevauchent
  return forecastStart <= realEnd && realStart <= forecastEnd;
}


/**
 * Génère les données du calendrier pour un mois donné
 */
export function generateCalendarDays(
  year: number,
  month: number,
  leaves: LeaveEntry[],
  holidays: PublicHoliday[]
): CalendarDay[] {
  const days: CalendarDay[] = [];
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  let currentDate = startDate;
  while (currentDate <= endDate) {
    const dateStr = format(currentDate, 'yyyy-MM-dd');
    const leave = leaves.find(l => {
      const leaveStart = new Date(l.startDate);
      const leaveEnd = new Date(l.endDate);
      return (
        isSameDay(currentDate, leaveStart) ||
        isSameDay(currentDate, leaveEnd) ||
        (isAfter(currentDate, leaveStart) && isBefore(currentDate, leaveEnd))
      );
    });

    const holiday = holidays.find(h => {
      const holidayDate = new Date(h.date);
      return isSameDay(currentDate, holidayDate);
    });

    days.push({
      date: currentDate,
      isCurrentMonth: currentDate.getMonth() === month,
      isToday: isSameDay(currentDate, new Date()),
      isWeekend: isWeekend(currentDate),
      isHoliday: !!holiday,
      leaves: leave ? [leave] : [],
    });

    currentDate = addDays(currentDate, 1);
  }

  return days;
}

/**
 * Formate une date pour l'affichage
 */
export function formatDate(date: string | Date, formatStr: string = 'dd/MM/yyyy'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Validate the date
  if (isNaN(dateObj.getTime())) {
    console.error('Invalid date for formatting:', date);
    return 'Date invalide';
  }
  
  return format(dateObj, formatStr, { locale: fr });
}

/**
 * Obtient le nom du type de congé
 */
export function getLeaveTypeLabel(type: LeaveType): string {
  return LEAVE_TYPES[type].label;
}

/**
 * Obtient la couleur du type de congé
 */
export function getLeaveTypeColor(type: LeaveType): string {
  return LEAVE_TYPES[type].color;
}

/**
 * Obtient l'icône du type de congé
 */
export function getLeaveTypeIcon(type: LeaveType): string {
  return LEAVE_TYPES[type].icon;
}

/**
 * Valide une période de congés
 */
export function validateLeavePeriod(
  startDate: string,
  endDate: string,
  existingLeaves: LeaveEntry[],
  excludeId?: string
): { isValid: boolean; error?: string } {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isAfter(start, end)) {
    return { isValid: false, error: 'La date de début doit être antérieure à la date de fin' };
  }

  // Vérifier les chevauchements avec les congés existants
  const overlapping = existingLeaves
    .filter(leave => leave.id !== excludeId)
    .some(leave => {
      const leaveStart = new Date(leave.startDate);
      const leaveEnd = new Date(leave.endDate);
      
      return (
        (isAfter(start, leaveStart) && isBefore(start, leaveEnd)) ||
        (isAfter(end, leaveStart) && isBefore(end, leaveEnd)) ||
        (isBefore(start, leaveStart) && isAfter(end, leaveEnd)) ||
        isSameDay(start, leaveStart) ||
        isSameDay(end, leaveEnd)
      );
    });

  if (overlapping) {
    return { isValid: false, error: 'Cette période chevauche un congé existant' };
  }

  return { isValid: true };
}

/**
 * Calcule les statistiques des congés
 */
export function calculateLeaveStats(leaves: LeaveEntry[], year: number): {
  totalDays: number;
  byType: Record<LeaveType, number>;
  byMonth: Record<string, number>;
} {
  const yearLeaves = leaves.filter(leave => 
    new Date(leave.startDate).getFullYear() === year
  );

  // Calculer le total des jours en excluant PIPE
  const totalDays = yearLeaves
    .filter(leave => isLeaveTypeForStats(leave.type))
    .reduce((total, leave) => total + leave.workingDays, 0);
  
  const byType: Record<LeaveType, number> = {
    cp: 0, rtt: 0, cet: 0, pipe: 0, sick: 0
  };
  
  const byMonth: Record<string, number> = {};

  yearLeaves.forEach(leave => {
    byType[leave.type] += leave.workingDays;
    
    // Inclure dans les statistiques mensuelles seulement si c'est un type de congé valide
    if (isLeaveTypeForStats(leave.type)) {
      const leaveStart = new Date(leave.startDate);
      const month = format(leaveStart, 'yyyy-MM');
      byMonth[month] = (byMonth[month] || 0) + leave.workingDays;
    }
  });

  return { totalDays, byType, byMonth };
}

/**
 * Convertit une date du format français (DD/MM/YYYY) vers le format ISO (YYYY-MM-DD)
 */
export function frenchDateToISO(frenchDate: string): string {
  if (!frenchDate || frenchDate.length !== 10) return ''
  
  const parts = frenchDate.split('/')
  if (parts.length !== 3) return ''
  
  const [day, month, year] = parts
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

/**
 * Convertit une date du format ISO (YYYY-MM-DD) vers le format français (DD/MM/YYYY)
 */
export function isoDateToFrench(isoDate: string): string {
  if (!isoDate || isoDate.length !== 10) return ''
  
  const parts = isoDate.split('-')
  if (parts.length !== 3) return ''
  
  const [year, month, day] = parts
  return `${day}/${month}/${year}`
}

/**
 * Valide une date au format français (DD/MM/YYYY)
 */
export function isValidFrenchDate(frenchDate: string): boolean {
  if (!frenchDate || frenchDate.length !== 10) return false
  
  const parts = frenchDate.split('/')
  if (parts.length !== 3) return false
  
  const [day, month, year] = parts
  const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const date = new Date(isoDate)
  
  return !isNaN(date.getTime()) && 
         date.getFullYear() >= 2020 && 
         date.getFullYear() <= 2030
}
