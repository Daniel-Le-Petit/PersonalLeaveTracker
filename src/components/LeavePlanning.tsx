'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, Clock, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

interface LeavePlanningProps {
  leaves: any[];
  currentYear: number;
  holidays: any[];
}

interface PlanningRecommendation {
  month: string;
  rttRecommended: number;
  cpRecommended: number;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

const LeavePlanning: React.FC<LeavePlanningProps> = ({ leaves, currentYear, holidays }) => {
  const [showDetails, setShowDetails] = useState(false);

  const planningData = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const rttTaken = leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && leave.type === 'rtt'
    ).reduce((sum, leave) => sum + leave.workingDays, 0);
    
    const cpTaken = leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && leave.type === 'cp'
    ).reduce((sum, leave) => sum + leave.workingDays, 0);

    const rttRemaining = 29 - rttTaken;
    const cpRemaining = 72.5 - cpTaken; // Total CP/CET - CP pris
    
    // Calcul des mois restants
    const monthsRemaining = 12 - currentMonth;
    const rttDeadlineMonths = currentMonth <= 1 ? 14 - currentMonth : 2 - currentMonth + 12; // Jusqu'à fin février année suivante
    
    // Recommandations intelligentes
    const recommendations: PlanningRecommendation[] = [];
    
    // Jours fériés par défaut si pas chargés
    let holidaysArray = Array.isArray(holidays) ? holidays : [];
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

    // Vérifier les prévisions déjà saisies
    const plannedPeriods = leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && 
      (leave.type === 'rtt' || leave.type === 'cp') &&
      new Date(leave.startDate) >= new Date() // Futur
    );

    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    for (let i = currentMonth; i < 12; i++) {
      const monthName = monthNames[i];
      let rttRec = 0;
      let cpRec = 0;
      let reason = '';
      let priority: 'high' | 'medium' | 'low' = 'low';

      // Calculer les jours ouvrés dans le mois
      const monthStart = new Date(currentYear, i, 1);
      const monthEnd = new Date(currentYear, i + 1, 0);
      const monthHolidays = holidaysArray.filter(h => {
        const holidayDate = new Date(h.date);
        return holidayDate.getMonth() === i && holidayDate.getFullYear() === currentYear;
      });

      // Compter les jours ouvrés (excluant week-ends et jours fériés)
      let workingDaysInMonth = 0;
      let currentDate = new Date(monthStart);
      while (currentDate <= monthEnd) {
        const dayOfWeek = currentDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = monthHolidays.some(h => 
          new Date(h.date).toDateString() === currentDate.toDateString()
        );
        
        if (!isWeekend && !isHoliday) {
          workingDaysInMonth++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Vérifier les prévisions déjà planifiées pour ce mois
      const plannedInMonth = plannedPeriods.filter(leave => {
        const leaveDate = new Date(leave.startDate);
        return leaveDate.getMonth() === i;
      });

      const plannedRttInMonth = plannedInMonth
        .filter(leave => leave.type === 'rtt')
        .reduce((sum, leave) => sum + leave.workingDays, 0);
      
      const plannedCpInMonth = plannedInMonth
        .filter(leave => leave.type === 'cp')
        .reduce((sum, leave) => sum + leave.workingDays, 0);

      // Recommandations RTT (priorité haute - deadline fin février)
      if (i <= 1 || (currentMonth > 1 && i >= currentMonth)) {
        const rttNeeded = Math.max(0, rttRemaining - plannedRttInMonth);
        if (rttNeeded > 0) {
          rttRec = Math.min(Math.ceil(rttNeeded / Math.max(1, rttDeadlineMonths - (i - currentMonth))), workingDaysInMonth);
          if (i <= 1) {
            reason = 'Deadline RTT fin février';
            priority = 'high';
          } else {
            reason = 'Consommation RTT recommandée';
            priority = 'medium';
          }
        }
      }

      // Recommandations CP (27 jours recommandés par an)
      const cpTargetPerYear = 27;
      const cpNeeded = Math.max(0, Math.min(cpRemaining, cpTargetPerYear - cpTaken) - plannedCpInMonth);
      if (cpNeeded > 0) {
        cpRec = Math.min(Math.ceil(cpNeeded / Math.max(1, monthsRemaining - (i - currentMonth))), workingDaysInMonth);
        if (reason) reason += ' + ';
        reason += 'Objectif 27 CP/an';
        if (priority === 'low') priority = 'medium';
      }

      // Ajustements selon les mois et jours fériés
      if (i === 11 || i === 0) { // Décembre/Janvier
        rttRec = Math.max(rttRec, Math.ceil(rttRemaining * 0.3));
        reason = 'Fin d\'année - consommer RTT';
        priority = 'high';
      }

      if (i >= 6 && i <= 8) { // Été
        cpRec = Math.max(cpRec, 3);
        if (reason) reason += ' + ';
        reason += 'Période estivale';
        if (priority === 'low') priority = 'medium';
      }

      // Bonus pour les mois avec jours fériés
      if (monthHolidays.length > 0) {
        if (reason) reason += ' + ';
        reason += `${monthHolidays.length} jour(s) férié(s)`;
        if (priority === 'low') priority = 'medium';
        // Recommander plus de CP pour profiter des jours fériés
        cpRec = Math.max(cpRec, monthHolidays.length);
      }

      recommendations.push({
        month: monthName,
        rttRecommended: Math.min(rttRec, rttRemaining),
        cpRecommended: Math.min(cpRec, cpRemaining),
        reason,
        priority
      });
    }

    return {
      rttTaken,
      rttRemaining,
      cpTaken,
      cpRemaining,
      rttDeadlineMonths,
      recommendations,
      rttUrgency: rttDeadlineMonths <= 3 ? 'high' : rttDeadlineMonths <= 6 ? 'medium' : 'low'
    };
  }, [leaves, currentYear]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-green-600 dark:text-green-400';
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'medium': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default: return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Planification Intelligente des Congés
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Recommandations pour optimiser votre consommation de congés
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            {showDetails ? 'Masquer' : 'Détails'}
          </button>
        </div>
      </div>
      
      <div className="card-body p-6">
        {/* Résumé urgent */}
        <div className="mb-6 p-4 rounded-lg border-2 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <div className="flex items-center space-x-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <h4 className="font-semibold text-orange-800 dark:text-orange-200">Points d'attention</h4>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-orange-700 dark:text-orange-300">RTT restants :</span>
              <span className="font-semibold text-orange-800 dark:text-orange-200">
                {planningData.rttRemaining} jours
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-700 dark:text-orange-300">Deadline RTT :</span>
              <span className="font-semibold text-orange-800 dark:text-orange-200">
                Fin février {currentYear + 1} ({planningData.rttDeadlineMonths} mois)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-orange-700 dark:text-orange-300">Objectif CP/an :</span>
              <span className="font-semibold text-orange-800 dark:text-orange-200">
                27 jours (recommandé)
              </span>
            </div>
          </div>
        </div>

        {/* Graphiques de répartition recommandée */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* RTT Planning */}
          <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <Clock className="h-4 w-4 mr-2 text-red-500" />
              Planification RTT
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>RTT pris</span>
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {planningData.rttTaken} jours
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div 
                  className="bg-red-500 h-4 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${(planningData.rttTaken / 29) * 100}%` }}
                >
                  {planningData.rttTaken}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span>RTT restants</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {planningData.rttRemaining} jours
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                ⚠️ À consommer avant fin février {currentYear + 1}
              </div>
            </div>
          </div>

          {/* CP Planning */}
          <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
              <Calendar className="h-4 w-4 mr-2 text-blue-500" />
              Planification CP
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>CP pris</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {planningData.cpTaken} jours
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div 
                  className="bg-blue-500 h-4 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                  style={{ width: `${(planningData.cpTaken / 27) * 100}%` }}
                >
                  {planningData.cpTaken}
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span>Objectif annuel</span>
                <span className="font-semibold text-gray-600 dark:text-gray-400">
                  27 jours
                </span>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                ✅ Objectif {planningData.cpTaken >= 27 ? 'atteint' : 'en cours'}
              </div>
            </div>
          </div>
        </div>

        {/* Recommandations détaillées */}
        {showDetails && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Recommandations mensuelles
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {planningData.recommendations.map((rec, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${getPriorityBg(rec.priority)}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {rec.month}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(rec.priority)} bg-white dark:bg-gray-800`}>
                      {rec.priority}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    {rec.rttRecommended > 0 && (
                      <div className="flex justify-between">
                        <span className="text-red-600 dark:text-red-400">RTT:</span>
                        <span className="font-semibold">{rec.rttRecommended} jour(s)</span>
                      </div>
                    )}
                    {rec.cpRecommended > 0 && (
                      <div className="flex justify-between">
                        <span className="text-blue-600 dark:text-blue-400">CP:</span>
                        <span className="font-semibold">{rec.cpRecommended} jour(s)</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      {rec.reason}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeavePlanning;
