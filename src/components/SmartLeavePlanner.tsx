'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, MapPin, Clock, Gift, Sun, Snowflake } from 'lucide-react';

interface SmartLeavePlannerProps {
  leaves: any[];
  currentYear: number;
  holidays: any[] | undefined | null;
}

interface LeavePeriod {
  startDate: string;
  endDate: string;
  workingDays: number;
  type: 'rtt' | 'cp';
  reason: string;
  efficiency: number; // Pourcentage d'optimisation
  holidaysIncluded: string[];
}

const SmartLeavePlanner: React.FC<SmartLeavePlannerProps> = ({ leaves, currentYear, holidays }) => {
  const [plannedPeriods, setPlannedPeriods] = useState<LeavePeriod[]>([
    {
      startDate: '2025-11-11',
      endDate: '2025-11-22',
      workingDays: 0,
      type: 'cp',
      reason: 'Vacances novembre',
      efficiency: 0,
      holidaysIncluded: []
    },
    {
      startDate: '2025-12-24',
      endDate: '2025-12-31',
      workingDays: 0,
      type: 'cp',
      reason: 'Vacances Noël',
      efficiency: 0,
      holidaysIncluded: []
    }
  ]);

  const currentMonth = new Date().getMonth();
  const isSeptember = currentMonth === 8; // Septembre = index 8

  // Calcul automatique des RTT et CP restants
  const leaveStats = useMemo(() => {
    const rttTaken = leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && leave.type === 'rtt'
    ).reduce((sum, leave) => sum + leave.workingDays, 0);
    
    const cpTaken = leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && leave.type === 'cp'
    ).reduce((sum, leave) => sum + leave.workingDays, 0);

    const rttRemaining = 29 - rttTaken;
    const cpRemaining = 72.5 - cpTaken; // Total CP/CET - CP pris

    return { rttTaken, cpTaken, rttRemaining, cpRemaining };
  }, [leaves, currentYear]);

  const optimizationResults = useMemo(() => {
    // Debug: vérifier le type de holidays
    console.log('Holidays type:', typeof holidays, 'Is array:', Array.isArray(holidays), 'Value:', holidays);
    console.log('Holidays length:', holidays?.length);
    if (holidays && holidays.length > 0) {
      console.log('First holiday:', holidays[0]);
    }
    
    const results = plannedPeriods.map(period => {
      const start = new Date(period.startDate);
      const end = new Date(period.endDate);
      
      // Vérification robuste que holidays est un tableau
      let holidaysArray = Array.isArray(holidays) ? holidays : [];
      
      // Si pas de jours fériés chargés, utiliser les jours fériés 2025 par défaut
      if (holidaysArray.length === 0) {
        holidaysArray = [
          { date: '2025-01-01', name: 'Jour de l\'An' },
          { date: '2025-04-21', name: 'Lundi de Pâques' },
          { date: '2025-05-01', name: 'Fête du Travail' },
          { date: '2025-05-08', name: 'Victoire 1945' },
          { date: '2025-05-29', name: 'Ascension' },
          { date: '2025-06-09', name: 'Lundi de Pentecôte' },
          { date: '2025-07-14', name: 'Fête Nationale' },
          { date: '2025-08-15', name: 'Assomption' },
          { date: '2025-11-01', name: 'Toussaint' },
          { date: '2025-11-11', name: 'Armistice' },
          { date: '2025-12-25', name: 'Noël' }
        ];
      }
      
      const holidaysInPeriod = holidaysArray.filter(holiday => {
        const holidayDate = new Date(holiday.date);
        return holidayDate >= start && holidayDate <= end;
      });

      // Calcul des jours ouvrés dans la période
      let workingDays = 0;
      let currentDate = new Date(start);
      
      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidaysInPeriod.some(h => 
          new Date(h.date).toDateString() === currentDate.toDateString()
        );
        
        if (!isWeekend && !isHoliday) {
          workingDays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calcul de l'efficacité (jours fériés / jours de congés)
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const efficiency = holidaysInPeriod.length > 0 ? 
        (holidaysInPeriod.length / workingDays) * 100 : 0;

      return {
        ...period,
        workingDays,
        efficiency: Math.round(efficiency),
        holidaysIncluded: holidaysInPeriod.map(h => h.name)
      };
    });

    return results;
  }, [plannedPeriods, holidays]);

  const recommendations = useMemo(() => {
    const recs = [];
    
    // Analyse novembre
    const novemberPeriod = optimizationResults[0];
    if (novemberPeriod) {
      let holidaysArray = Array.isArray(holidays) ? holidays : [];
      if (holidaysArray.length === 0) {
        holidaysArray = [
          { date: '2025-11-01', name: 'Toussaint' },
          { date: '2025-11-11', name: 'Armistice' }
        ];
      }
      const novHolidays = holidaysArray.filter(h => {
        const date = new Date(h.date);
        return date.getMonth() === 10; // Novembre
      });
      
      if (novHolidays.length > 0) {
        recs.push({
          period: 'Novembre',
          recommendation: `Excellente période ! ${novHolidays.length} jour(s) férié(s) en novembre`,
          type: 'cp',
          days: novemberPeriod.workingDays,
          efficiency: novemberPeriod.efficiency,
          icon: <Gift className="h-4 w-4" />
        });
      }
    }

    // Analyse Noël
    const christmasPeriod = optimizationResults[1];
    if (christmasPeriod) {
      let holidaysArray = Array.isArray(holidays) ? holidays : [];
      if (holidaysArray.length === 0) {
        holidaysArray = [
          { date: '2025-12-25', name: 'Noël' }
        ];
      }
      const decHolidays = holidaysArray.filter(h => {
        const date = new Date(h.date);
        return date.getMonth() === 11; // Décembre
      });
      
      recs.push({
        period: 'Noël',
        recommendation: `Période optimale ! ${decHolidays.length} jour(s) férié(s) en décembre`,
        type: 'cp',
        days: christmasPeriod.workingDays,
        efficiency: christmasPeriod.efficiency,
        icon: <Snowflake className="h-4 w-4" />
      });
    }

    // Recommandations supplémentaires
    const remainingRtt = leaveStats.rttRemaining;
    const remainingCp = leaveStats.cpRemaining - optimizationResults.reduce((sum, p) => sum + p.workingDays, 0);
    
    if (remainingRtt > 0) {
      recs.push({
        period: 'RTT restants',
        recommendation: `Utilisez vos ${remainingRtt} RTT restants avant fin février ${currentYear + 1}`,
        type: 'rtt',
        days: remainingRtt,
        efficiency: 0,
        icon: <Clock className="h-4 w-4" />
      });
    }

    if (remainingCp > 0) {
      recs.push({
        period: 'CP restants',
        recommendation: `Planifiez vos ${remainingCp} CP restants sur l'année`,
        type: 'cp',
        days: remainingCp,
        efficiency: 0,
        icon: <Sun className="h-4 w-4" />
      });
    }

    return recs;
  }, [optimizationResults, leaveStats, currentYear]);

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 50) return 'text-green-600 dark:text-green-400';
    if (efficiency >= 25) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getEfficiencyBg = (efficiency: number) => {
    if (efficiency >= 50) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    if (efficiency >= 25) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center space-x-3">
          <MapPin className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Planificateur Intelligent avec Jours Fériés
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Optimisez vos congés en profitant des jours fériés
            </p>
          </div>
        </div>
      </div>
      
      <div className="card-body p-6">
        {/* Résumé des congés */}
        <div className="mb-6 p-4 rounded-lg border bg-gray-50 dark:bg-gray-800">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">État de vos congés</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">RTT restants</span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                {leaveStats.rttRemaining} jours
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">CP restants</span>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {leaveStats.cpRemaining} jours
              </span>
            </div>
          </div>
        </div>

        {/* Analyse des périodes planifiées */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Vos périodes planifiées
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {optimizationResults.map((period, index) => (
              <div key={index} className={`p-3 rounded-lg border ${getEfficiencyBg(period.efficiency)}`}>
                <div className="flex justify-between items-center mb-1">
                  <h5 className="font-medium text-gray-900 dark:text-white text-sm">
                    {period.reason}
                  </h5>
                  <span className={`text-sm font-bold ${getEfficiencyColor(period.efficiency)}`}>
                    {period.efficiency}%
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {new Date(period.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {new Date(period.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600 dark:text-gray-400">
                    {period.workingDays} jour(s) de congé
                  </span>
                  {period.holidaysIncluded.length > 0 && (
                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                      +{period.holidaysIncluded.length} jour férié
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommandations synthétisées */}
        <div className="p-4 rounded-lg border-2 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <Gift className="h-4 w-4 mr-2" />
            🎯 Stratégie optimale
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Novembre (11-22)</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">8 CP</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Noël (24-31 déc)</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">5 CP</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">RTT restants</span>
              <span className="font-semibold text-red-600 dark:text-red-400">{leaveStats.rttRemaining} RTT</span>
            </div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                ⚠️ RTT à consommer avant fin février 2026
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SmartLeavePlanner;
