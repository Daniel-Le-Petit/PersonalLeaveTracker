'use client';

import React, { useMemo } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Target, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface LeaveAnalyticsProps {
  leaves: any[];
  currentYear: number;
  holidays: any[];
}

const LeaveAnalytics: React.FC<LeaveAnalyticsProps> = ({ leaves, currentYear, holidays }) => {
  const analytics = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentDate = new Date();
    
    // Calculs de base - RÉEL (congés effectivement pris)
    const rttTakenReal = leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && 
      leave.type === 'rtt' && 
      !leave.isForecast
    ).reduce((sum, leave) => sum + leave.workingDays, 0);
    
    const cpTakenReal = leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && 
      leave.type === 'cp' && 
      !leave.isForecast
    ).reduce((sum, leave) => sum + leave.workingDays, 0);

    const cetTakenReal = leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && 
      leave.type === 'cet' && 
      !leave.isForecast
    ).reduce((sum, leave) => sum + leave.workingDays, 0);

    // Calculs de base - PRÉVISIONS (congés planifiés)
    const rttPlanned = leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && 
      leave.type === 'rtt' && 
      leave.isForecast
    ).reduce((sum, leave) => sum + leave.workingDays, 0);
    
    const cpPlanned = leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && 
      leave.type === 'cp' && 
      leave.isForecast
    ).reduce((sum, leave) => sum + leave.workingDays, 0);

    const cetPlanned = leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && 
      leave.type === 'cet' && 
      leave.isForecast
    ).reduce((sum, leave) => sum + leave.workingDays, 0);

    // Totaux (réel + prévisions)
    const rttTaken = rttTakenReal + rttPlanned;
    const cpTaken = cpTakenReal + cpPlanned;
    const cetTaken = cetTakenReal + cetPlanned;

    const rttRemaining = 29 - rttTaken;
    const cpRemaining = 72.5 - cpTaken;
    const cetRemaining = 0; // CET pas nécessaire à partir de 2026

    // Taux d'utilisation
    const rttUsageRate = (rttTaken / 29) * 100;
    const cpUsageRate = (cpTaken / 27) * 100; // Objectif 27 jours/an
    const totalUsageRate = ((rttTaken + cpTaken) / (29 + 27)) * 100;

    // Analyse mensuelle - Séparer réel et prévisions
    const monthlyStats = [];
    for (let month = 0; month < 12; month++) {
      const monthLeaves = leaves.filter(leave => {
        const leaveDate = new Date(leave.startDate);
        return leaveDate.getFullYear() === currentYear && leaveDate.getMonth() === month;
      });

      // Réel
      const monthRttReal = monthLeaves.filter(l => l.type === 'rtt' && !l.isForecast).reduce((sum, l) => sum + l.workingDays, 0);
      const monthCpReal = monthLeaves.filter(l => l.type === 'cp' && !l.isForecast).reduce((sum, l) => sum + l.workingDays, 0);
      const monthCetReal = monthLeaves.filter(l => l.type === 'cet' && !l.isForecast).reduce((sum, l) => sum + l.workingDays, 0);

      // Prévisions
      const monthRttPlanned = monthLeaves.filter(l => l.type === 'rtt' && l.isForecast).reduce((sum, l) => sum + l.workingDays, 0);
      const monthCpPlanned = monthLeaves.filter(l => l.type === 'cp' && l.isForecast).reduce((sum, l) => sum + l.workingDays, 0);
      const monthCetPlanned = monthLeaves.filter(l => l.type === 'cet' && l.isForecast).reduce((sum, l) => sum + l.workingDays, 0);

      // Totaux
      const monthRtt = monthRttReal + monthRttPlanned;
      const monthCp = monthCpReal + monthCpPlanned;
      const monthCet = monthCetReal + monthCetPlanned;

      monthlyStats.push({
        month,
        rtt: monthRtt,
        rttReal: monthRttReal,
        rttPlanned: monthRttPlanned,
        cp: monthCp,
        cpReal: monthCpReal,
        cpPlanned: monthCpPlanned,
        cet: monthCet,
        cetReal: monthCetReal,
        cetPlanned: monthCetPlanned,
        total: monthRtt + monthCp + monthCet,
        totalReal: monthRttReal + monthCpReal + monthCetReal,
        totalPlanned: monthRttPlanned + monthCpPlanned + monthCetPlanned
      });
    }

    // Tendances - Séparer réel et prévisions
    const currentQuarter = Math.floor(currentMonth / 3);
    const quarters = [
      { name: 'Q1', months: [0, 1, 2], total: 0, totalReal: 0, totalPlanned: 0 },
      { name: 'Q2', months: [3, 4, 5], total: 0, totalReal: 0, totalPlanned: 0 },
      { name: 'Q3', months: [6, 7, 8], total: 0, totalReal: 0, totalPlanned: 0 },
      { name: 'Q4', months: [9, 10, 11], total: 0, totalReal: 0, totalPlanned: 0 }
    ];

    quarters.forEach(quarter => {
      const quarterStats = monthlyStats.filter(stat => quarter.months.includes(stat.month));
      quarter.total = quarterStats.reduce((sum, stat) => sum + stat.total, 0);
      quarter.totalReal = quarterStats.reduce((sum, stat) => sum + stat.totalReal, 0);
      quarter.totalPlanned = quarterStats.reduce((sum, stat) => sum + stat.totalPlanned, 0);
    });

    // Prévisions
    const monthsRemaining = 12 - currentMonth;
    const rttDeadlineMonths = currentMonth <= 1 ? 14 - currentMonth : 2 - currentMonth + 12;
    
    const projectedRttUsage = rttTaken + (rttRemaining / rttDeadlineMonths) * monthsRemaining;
    const projectedCpUsage = cpTaken + (Math.min(cpRemaining, 27 - cpTaken) / monthsRemaining) * monthsRemaining;

    // Alertes
    const alerts = [];
    if (rttDeadlineMonths <= 3 && rttRemaining > 0) {
      alerts.push({
        type: 'urgent',
        message: `⚠️ ${rttRemaining} RTT à consommer avant fin février ${currentYear + 1}`,
        icon: AlertTriangle
      });
    }
    if (cpUsageRate < 50 && currentMonth >= 6) {
      alerts.push({
        type: 'warning',
        message: `📊 Objectif CP: ${cpTaken}/27 jours (${cpUsageRate.toFixed(1)}%)`,
        icon: Target
      });
    }
    if (totalUsageRate > 80) {
      alerts.push({
        type: 'success',
        message: `✅ Excellent taux d'utilisation: ${totalUsageRate.toFixed(1)}%`,
        icon: CheckCircle
      });
    }

    return {
      rttTaken, cpTaken, cetTaken,
      rttTakenReal, cpTakenReal, cetTakenReal,
      rttPlanned, cpPlanned, cetPlanned,
      rttRemaining, cpRemaining, cetRemaining,
      rttUsageRate, cpUsageRate, totalUsageRate,
      monthlyStats, quarters, projectedRttUsage, projectedCpUsage,
      alerts, rttDeadlineMonths
    };
  }, [leaves, currentYear]);

  const monthNames = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
    'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
  ];

  const getUsageColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 dark:text-green-400';
    if (rate >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getUsageBg = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center space-x-3">
          <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Analytics & Prévisions
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Tendances et projections des congés
            </p>
          </div>
        </div>
      </div>
      
      <div className="card-body p-6">
        {/* Alertes */}
        {analytics.alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {analytics.alerts.map((alert, index) => (
              <div key={index} className={`flex items-center space-x-2 p-3 rounded-lg ${
                alert.type === 'urgent' ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' :
                alert.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800' :
                'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              }`}>
                <alert.icon className={`h-4 w-4 ${
                  alert.type === 'urgent' ? 'text-red-600 dark:text-red-400' :
                  alert.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-green-600 dark:text-green-400'
                }`} />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {alert.message}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Comparaison Réel vs Prévisions */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Target className="h-4 w-4 mr-2" />
            📊 Réel vs Prévisions - {currentYear}
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* RTT */}
            <div className="p-4 rounded-lg border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold text-red-700 dark:text-red-300">RTT</span>
                <span className="text-sm text-red-600 dark:text-red-400">29 jours max</span>
              </div>
              
              <div className="space-y-3">
                {/* Réel */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">✅ Réel:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    {analytics.rttTakenReal} jours
                  </span>
                </div>
                
                {/* Prévisions */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">📅 Prévisions:</span>
                  <span className="font-bold text-orange-600 dark:text-orange-400">
                    {analytics.rttPlanned} jours
                  </span>
                </div>
                
                {/* Total */}
                <div className="flex items-center justify-between pt-2 border-t border-red-200 dark:border-red-700">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Total:</span>
                  <span className="font-bold text-red-700 dark:text-red-300">
                    {analytics.rttTaken}/29 jours
                  </span>
                </div>
                
                {/* Barre de progression */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div className="h-3 rounded-full flex">
                    <div 
                      className="bg-red-500"
                      style={{ width: `${(analytics.rttTakenReal / 29) * 100}%` }}
                      title={`Réel: ${analytics.rttTakenReal} jours`}
                    />
                    <div 
                      className="bg-orange-400"
                      style={{ width: `${(analytics.rttPlanned / 29) * 100}%` }}
                      title={`Prévisions: ${analytics.rttPlanned} jours`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* CP */}
            <div className="p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold text-blue-700 dark:text-blue-300">CP</span>
                <span className="text-sm text-blue-600 dark:text-blue-400">27 jours objectif</span>
              </div>
              
              <div className="space-y-3">
                {/* Réel */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">✅ Réel:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {analytics.cpTakenReal} jours
                  </span>
                </div>
                
                {/* Prévisions */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">📅 Prévisions:</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">
                    {analytics.cpPlanned} jours
                  </span>
                </div>
                
                {/* Total */}
                <div className="flex items-center justify-between pt-2 border-t border-blue-200 dark:border-blue-700">
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Total:</span>
                  <span className="font-bold text-blue-700 dark:text-blue-300">
                    {analytics.cpTaken}/27 jours
                  </span>
                </div>
                
                {/* Barre de progression */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div className="h-3 rounded-full flex">
                    <div 
                      className="bg-blue-500"
                      style={{ width: `${(analytics.cpTakenReal / 27) * 100}%` }}
                      title={`Réel: ${analytics.cpTakenReal} jours`}
                    />
                    <div 
                      className="bg-purple-400"
                      style={{ width: `${(analytics.cpPlanned / 27) * 100}%` }}
                      title={`Prévisions: ${analytics.cpPlanned} jours`}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Graphique mensuel - Réel vs Prévisions */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Évolution mensuelle - Réel vs Prévisions
          </h4>
          <div className="space-y-3">
            {analytics.monthlyStats.map((stat, index) => (
              <div key={index} className="space-y-2">
                {/* Mois */}
                <div className="flex items-center space-x-3">
                  <div className="w-8 text-xs font-medium text-gray-600 dark:text-gray-400">
                    {monthNames[stat.month]}
                  </div>
                  
                  {/* Barres de progression */}
                  <div className="flex-1 space-y-1">
                    {/* Réel */}
                    <div className="flex space-x-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-8">Réel:</span>
                      <div className="flex-1 flex space-x-1">
                        {stat.rttReal > 0 && (
                          <div 
                            className="bg-red-500 rounded-sm"
                            style={{ width: `${(stat.rttReal / 5) * 100}%`, height: '16px' }}
                            title={`RTT Réel: ${stat.rttReal} jours`}
                          />
                        )}
                        {stat.cpReal > 0 && (
                          <div 
                            className="bg-blue-500 rounded-sm"
                            style={{ width: `${(stat.cpReal / 5) * 100}%`, height: '16px' }}
                            title={`CP Réel: ${stat.cpReal} jours`}
                          />
                        )}
                        {stat.cetReal > 0 && (
                          <div 
                            className="bg-green-500 rounded-sm"
                            style={{ width: `${(stat.cetReal / 5) * 100}%`, height: '16px' }}
                            title={`CET Réel: ${stat.cetReal} jours`}
                          />
                        )}
                        {stat.totalReal === 0 && (
                          <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-sm" />
                        )}
                      </div>
                      <div className="w-6 text-xs text-gray-600 dark:text-gray-400 text-right">
                        {stat.totalReal}
                      </div>
                    </div>
                    
                    {/* Prévisions */}
                    <div className="flex space-x-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400 w-8">Plan:</span>
                      <div className="flex-1 flex space-x-1">
                        {stat.rttPlanned > 0 && (
                          <div 
                            className="bg-red-300 dark:bg-red-400 rounded-sm border border-red-500"
                            style={{ width: `${(stat.rttPlanned / 5) * 100}%`, height: '16px' }}
                            title={`RTT Planifié: ${stat.rttPlanned} jours`}
                          />
                        )}
                        {stat.cpPlanned > 0 && (
                          <div 
                            className="bg-blue-300 dark:bg-blue-400 rounded-sm border border-blue-500"
                            style={{ width: `${(stat.cpPlanned / 5) * 100}%`, height: '16px' }}
                            title={`CP Planifié: ${stat.cpPlanned} jours`}
                          />
                        )}
                        {stat.cetPlanned > 0 && (
                          <div 
                            className="bg-green-300 dark:bg-green-400 rounded-sm border border-green-500"
                            style={{ width: `${(stat.cetPlanned / 5) * 100}%`, height: '16px' }}
                            title={`CET Planifié: ${stat.cetPlanned} jours`}
                          />
                        )}
                        {stat.totalPlanned === 0 && (
                          <div className="w-full h-4 bg-gray-100 dark:bg-gray-600 rounded-sm border border-gray-300 dark:border-gray-500" />
                        )}
                      </div>
                      <div className="w-6 text-xs text-gray-600 dark:text-gray-400 text-right">
                        {stat.totalPlanned}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Légende */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Légende :</div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <div className="font-medium text-gray-600 dark:text-gray-400">Réel :</div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-sm"></div>
                  <span>RTT</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-sm"></div>
                  <span>CP</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-sm"></div>
                  <span>CET</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-gray-600 dark:text-gray-400">Prévisions :</div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-300 dark:bg-red-400 rounded-sm border border-red-500"></div>
                  <span>RTT</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-300 dark:bg-blue-400 rounded-sm border border-blue-500"></div>
                  <span>CP</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-300 dark:bg-green-400 rounded-sm border border-green-500"></div>
                  <span>CET</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tendances par trimestre - Réel vs Prévisions */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Tendances par trimestre - Réel vs Prévisions
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {analytics.quarters.map((quarter, index) => (
              <div key={index} className="p-4 rounded-lg border-2 bg-white dark:bg-gray-800">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3 text-center">
                  {quarter.name}
                </div>
                
                {/* Réel */}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">✅ Réel:</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {quarter.totalReal}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${quarter.totalReal > 0 ? Math.min(100, (quarter.totalReal / 15) * 100) : 0}%` }}
                    />
                  </div>
                </div>
                
                {/* Prévisions */}
                <div className="mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">📅 Plan:</span>
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {quarter.totalPlanned}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-orange-400 h-2 rounded-full"
                      style={{ width: `${quarter.totalPlanned > 0 ? Math.min(100, (quarter.totalPlanned / 15) * 100) : 0}%` }}
                    />
                  </div>
                </div>
                
                {/* Total */}
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Total:</span>
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                      {quarter.total}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prévisions fin d'année - Réel vs Prévisions */}
        <div className="p-4 rounded-lg border-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            📊 Prévisions fin d'année - Réel vs Prévisions
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* RTT */}
            <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
              <div className="text-lg font-semibold text-red-700 dark:text-red-300 mb-3">RTT</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">✅ Réel actuel:</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">
                    {analytics.rttTakenReal}/29 jours
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">📅 Planifié:</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {analytics.rttPlanned}/29 jours
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-red-200 dark:border-red-700">
                  <span className="text-gray-700 dark:text-gray-300">🎯 Projeté fin d'année:</span>
                  <span className="font-semibold text-red-700 dark:text-red-300">
                    {analytics.projectedRttUsage.toFixed(1)}/29 jours
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">⏰ Deadline:</span>
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {analytics.rttDeadlineMonths} mois
                  </span>
                </div>
              </div>
            </div>

            {/* CP */}
            <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
              <div className="text-lg font-semibold text-blue-700 dark:text-blue-300 mb-3">CP</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">✅ Réel actuel:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                    {analytics.cpTakenReal}/27 jours
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">📅 Planifié:</span>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    {analytics.cpPlanned}/27 jours
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-200 dark:border-blue-700">
                  <span className="text-gray-700 dark:text-gray-300">🎯 Projeté fin d'année:</span>
                  <span className="font-semibold text-blue-700 dark:text-blue-300">
                    {analytics.projectedCpUsage.toFixed(1)}/27 jours
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-700 dark:text-gray-300">📊 Objectif:</span>
                  <span className={`font-semibold ${
                    analytics.cpUsageRate >= 100 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {analytics.cpUsageRate >= 100 ? 'Atteint' : 'En cours'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveAnalytics;

