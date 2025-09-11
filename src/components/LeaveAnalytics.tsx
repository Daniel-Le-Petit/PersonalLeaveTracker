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
    
    // Calculs de base
    const rttTaken = leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && leave.type === 'rtt'
    ).reduce((sum, leave) => sum + leave.workingDays, 0);
    
    const cpTaken = leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && leave.type === 'cp'
    ).reduce((sum, leave) => sum + leave.workingDays, 0);

    const cetTaken = leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && leave.type === 'cet'
    ).reduce((sum, leave) => sum + leave.workingDays, 0);

    const rttRemaining = 29 - rttTaken;
    const cpRemaining = 72.5 - cpTaken;
    const cetRemaining = 0; // CET pas nécessaire à partir de 2026

    // Taux d'utilisation
    const rttUsageRate = (rttTaken / 29) * 100;
    const cpUsageRate = (cpTaken / 27) * 100; // Objectif 27 jours/an
    const totalUsageRate = ((rttTaken + cpTaken) / (29 + 27)) * 100;

    // Analyse mensuelle
    const monthlyStats = [];
    for (let month = 0; month < 12; month++) {
      const monthLeaves = leaves.filter(leave => {
        const leaveDate = new Date(leave.startDate);
        return leaveDate.getFullYear() === currentYear && leaveDate.getMonth() === month;
      });

      const monthRtt = monthLeaves.filter(l => l.type === 'rtt').reduce((sum, l) => sum + l.workingDays, 0);
      const monthCp = monthLeaves.filter(l => l.type === 'cp').reduce((sum, l) => sum + l.workingDays, 0);
      const monthCet = monthLeaves.filter(l => l.type === 'cet').reduce((sum, l) => sum + l.workingDays, 0);

      monthlyStats.push({
        month,
        rtt: monthRtt,
        cp: monthCp,
        cet: monthCet,
        total: monthRtt + monthCp + monthCet
      });
    }

    // Tendances
    const currentQuarter = Math.floor(currentMonth / 3);
    const quarters = [
      { name: 'Q1', months: [0, 1, 2], total: 0 },
      { name: 'Q2', months: [3, 4, 5], total: 0 },
      { name: 'Q3', months: [6, 7, 8], total: 0 },
      { name: 'Q4', months: [9, 10, 11], total: 0 }
    ];

    quarters.forEach(quarter => {
      quarter.total = monthlyStats
        .filter(stat => quarter.months.includes(stat.month))
        .reduce((sum, stat) => sum + stat.total, 0);
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

        {/* Métriques principales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg border bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">RTT</span>
              <span className={`text-sm font-bold ${getUsageColor(analytics.rttUsageRate)}`}>
                {analytics.rttUsageRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full ${getUsageBg(analytics.rttUsageRate)}`}
                style={{ width: `${Math.min(100, analytics.rttUsageRate)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{analytics.rttTaken}/29 jours</span>
              <span>{analytics.rttRemaining} restants</span>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">CP</span>
              <span className={`text-sm font-bold ${getUsageColor(analytics.cpUsageRate)}`}>
                {analytics.cpUsageRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full ${getUsageBg(analytics.cpUsageRate)}`}
                style={{ width: `${Math.min(100, analytics.cpUsageRate)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{analytics.cpTaken}/27 jours</span>
              <span>{analytics.cpRemaining} restants</span>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</span>
              <span className={`text-sm font-bold ${getUsageColor(analytics.totalUsageRate)}`}>
                {analytics.totalUsageRate.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full ${getUsageBg(analytics.totalUsageRate)}`}
                style={{ width: `${Math.min(100, analytics.totalUsageRate)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>{analytics.rttTaken + analytics.cpTaken}/56 jours</span>
              <span>{analytics.rttRemaining + analytics.cpRemaining} restants</span>
            </div>
          </div>
        </div>

        {/* Graphique mensuel */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Évolution mensuelle
          </h4>
          <div className="space-y-2">
            {analytics.monthlyStats.map((stat, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-8 text-xs font-medium text-gray-600 dark:text-gray-400">
                  {monthNames[stat.month]}
                </div>
                <div className="flex-1 flex space-x-1">
                  {stat.rtt > 0 && (
                    <div 
                      className="bg-red-500 rounded-sm"
                      style={{ width: `${(stat.rtt / 5) * 100}%`, height: '20px' }}
                      title={`RTT: ${stat.rtt} jours`}
                    />
                  )}
                  {stat.cp > 0 && (
                    <div 
                      className="bg-blue-500 rounded-sm"
                      style={{ width: `${(stat.cp / 5) * 100}%`, height: '20px' }}
                      title={`CP: ${stat.cp} jours`}
                    />
                  )}
                  {stat.cet > 0 && (
                    <div 
                      className="bg-green-500 rounded-sm"
                      style={{ width: `${(stat.cet / 5) * 100}%`, height: '20px' }}
                      title={`CET: ${stat.cet} jours`}
                    />
                  )}
                  {stat.total === 0 && (
                    <div className="w-full h-5 bg-gray-200 dark:bg-gray-700 rounded-sm" />
                  )}
                </div>
                <div className="w-8 text-xs text-gray-600 dark:text-gray-400 text-right">
                  {stat.total}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tendances par trimestre */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Tendances par trimestre
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {analytics.quarters.map((quarter, index) => (
              <div key={index} className="p-3 rounded-lg border bg-white dark:bg-gray-800 text-center">
                <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {quarter.name}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {quarter.total}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  jours
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prévisions */}
        <div className="p-4 rounded-lg border-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            📊 Prévisions fin d'année
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-700 dark:text-gray-300">RTT projeté:</span>
              <span className="font-semibold text-red-600 dark:text-red-400 ml-2">
                {analytics.projectedRttUsage.toFixed(1)}/29 jours
              </span>
            </div>
            <div>
              <span className="text-gray-700 dark:text-gray-300">CP projeté:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400 ml-2">
                {analytics.projectedCpUsage.toFixed(1)}/27 jours
              </span>
            </div>
            <div>
              <span className="text-gray-700 dark:text-gray-300">Deadline RTT:</span>
              <span className="font-semibold text-orange-600 dark:text-orange-400 ml-2">
                {analytics.rttDeadlineMonths} mois
              </span>
            </div>
            <div>
              <span className="text-gray-700 dark:text-gray-300">Objectif CP:</span>
              <span className={`font-semibold ml-2 ${
                analytics.cpUsageRate >= 100 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {analytics.cpUsageRate >= 100 ? 'Atteint' : 'En cours'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveAnalytics;

