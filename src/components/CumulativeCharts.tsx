'use client'

import { LeaveEntry, CarryoverLeave } from '../types'
import { calculateMonthlyLeaveSummarySeparated } from '../utils/leaveUtils'

interface CumulativeChartsProps {
  leaves: LeaveEntry[]
  carryovers: CarryoverLeave[]
  currentYear: number
  settings?: any
}

export default function CumulativeCharts({ leaves, carryovers, currentYear, settings }: CumulativeChartsProps) {
  // Utiliser les données déjà calculées par calculateMonthlyLeaveSummarySeparated
  const monthlyData = calculateMonthlyLeaveSummarySeparated(
    leaves,
    settings?.quotas || [],
    carryovers,
    currentYear
  )

  // Transformer les données pour les graphiques
  const rttData = monthlyData.months.map(monthData => ({
    month: monthData.monthName.substring(0, 3),
    cumulativeTaken: monthData.rtt.real.cumul + monthData.rtt.forecast.cumul,
    cumulativeRemaining: monthData.rtt.real.remaining + monthData.rtt.forecast.remaining
  }))

  const cpCetData = monthlyData.months.map(monthData => ({
    month: monthData.monthName.substring(0, 3),
    cumulativeTaken: monthData.cp.real.cumul + monthData.cp.forecast.cumul,
    cumulativeRemaining: monthData.cp.real.remaining + monthData.cp.forecast.remaining
  }))

  // Calculer la valeur maximale pour l'échelle
  const allValues = [...rttData, ...cpCetData].flatMap(d => [d.cumulativeTaken, d.cumulativeRemaining])
  const maxValue = Math.max(...allValues, 1)
  const safeMaxValue = isNaN(maxValue) || maxValue === 0 ? 1 : maxValue

  const chartHeight = 200
  const barWidth = 20

  const renderChart = (data: any[], title: string, colorTaken: string, colorRemaining: string) => {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
          📊 {title}
        </h3>
        
        {/* Axe Y */}
        <div className="flex">
          <div className="w-12 flex flex-col justify-between text-xs text-gray-600 dark:text-gray-400" style={{ height: chartHeight }}>
            <div>{Math.ceil(safeMaxValue)}</div>
            <div>{Math.ceil(safeMaxValue * 0.75)}</div>
            <div>{Math.ceil(safeMaxValue * 0.5)}</div>
            <div>{Math.ceil(safeMaxValue * 0.25)}</div>
            <div>0</div>
          </div>

          {/* Graphique */}
          <div className="ml-12 flex items-end space-x-2" style={{ height: chartHeight - 40 }}>
            {data.map((monthData, index) => {
              const takenHeight = ((monthData.cumulativeTaken || 0) / safeMaxValue) * (chartHeight - 40)
              const remainingHeight = ((monthData.cumulativeRemaining || 0) / safeMaxValue) * (chartHeight - 40)
              
              return (
                <div key={index} className="flex flex-col items-center space-y-1">
                  {/* Barre des cumulés pris */}
                  <div
                    className={`${colorTaken} rounded-t-sm`}
                    style={{
                      width: barWidth,
                      height: Math.max(takenHeight, 2)
                    }}
                    title={`${monthData.month}: ${monthData.cumulativeTaken || 0} jours pris cumulés`}
                  />
                  
                  {/* Barre des cumulés restants */}
                  <div
                    className={`${colorRemaining} rounded-b-sm`}
                    style={{
                      width: barWidth,
                      height: Math.max(remainingHeight, 2)
                    }}
                    title={`${monthData.month}: ${monthData.cumulativeRemaining || 0} jours restants cumulés`}
                  />
                  
                  {/* Label du mois */}
                  <div className="text-xs text-gray-600 dark:text-gray-400 text-center w-12 -rotate-45 origin-top-left">
                    {monthData.month}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Légende */}
        <div className="flex justify-center space-x-6 mt-4 text-sm">
          <div className="flex items-center">
            <div className={`w-4 h-4 ${colorTaken} rounded mr-2`}></div>
            <span className="text-gray-700 dark:text-gray-300">Cumulés pris</span>
          </div>
          <div className="flex items-center">
            <div className={`w-4 h-4 ${colorRemaining} rounded mr-2`}></div>
            <span className="text-gray-700 dark:text-gray-300">Cumulés restants</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-12">
      {/* Graphique RTT - Complètement séparé */}
      {renderChart(rttData, 'RTT cumulés pris et restants', 'bg-red-500', 'bg-green-500')}
      
      {/* Graphique CP + CET - Complètement séparé */}
      {renderChart(cpCetData, 'CP + CET cumulés pris et restants', 'bg-blue-500', 'bg-yellow-500')}
    </div>
  )
}