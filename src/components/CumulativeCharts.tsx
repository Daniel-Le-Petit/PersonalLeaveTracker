'use client'

import { LeaveEntry, CarryoverLeave } from '../types'

interface CumulativeChartsProps {
  leaves: LeaveEntry[]
  carryovers: CarryoverLeave[]
  currentYear: number
  settings?: any
}

export default function CumulativeCharts({ leaves, carryovers, currentYear, settings }: CumulativeChartsProps) {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  // Calculer les données cumulées pour RTT
  const calculateRTTData = () => {
    const monthlyData = months.map((month, monthIndex) => {
      const monthNumber = monthIndex + 1
      
      // Filtrer les RTT pour ce mois et l'année
      const monthLeaves = leaves.filter(leave => {
        const leaveDate = new Date(leave.startDate)
        return leave.type === 'rtt' && 
               leaveDate.getFullYear() === currentYear && 
               leaveDate.getMonth() === monthIndex
      })

      // Calculer le total des jours pour ce mois
      const monthTotal = monthLeaves.reduce((sum, leave) => sum + leave.workingDays, 0)

      // Calculer le cumul jusqu'à ce mois
      const cumulativeTaken = leaves
        .filter(leave => {
          const leaveDate = new Date(leave.startDate)
          return leave.type === 'rtt' && 
                 leaveDate.getFullYear() === currentYear && 
                 leaveDate.getMonth() <= monthIndex
        })
        .reduce((sum, leave) => sum + leave.workingDays, 0)

      // Calculer le cumul restant (quota - cumul pris + reliquat)
      let quota = 0
      if (settings && settings.quotas) {
        const quotaEntry = settings.quotas.find((q: any) => q.type === 'rtt')
        quota = quotaEntry ? quotaEntry.quota : 10
      } else {
        quota = 10 // Valeur par défaut pour RTT
      }
      const carryover = carryovers.find(c => c.type === 'rtt')?.days || 0
      const cumulativeRemaining = Math.max(0, quota + carryover - cumulativeTaken)

      return {
        month,
        monthTotal,
        cumulativeTaken,
        cumulativeRemaining
      }
    })

    return monthlyData
  }

  // Calculer les données cumulées pour CP + CET combinés
  const calculateCPCETData = () => {
    const monthlyData = months.map((month, monthIndex) => {
      const monthNumber = monthIndex + 1
      
      // Filtrer les CP et CET pour ce mois et l'année
      const monthLeaves = leaves.filter(leave => {
        const leaveDate = new Date(leave.startDate)
        return (leave.type === 'cp' || leave.type === 'cet') && 
               leaveDate.getFullYear() === currentYear && 
               leaveDate.getMonth() === monthIndex
      })

      // Calculer le total des jours pour ce mois
      const monthTotal = monthLeaves.reduce((sum, leave) => sum + leave.workingDays, 0)

      // Calculer le cumul jusqu'à ce mois
      const cumulativeTaken = leaves
        .filter(leave => {
          const leaveDate = new Date(leave.startDate)
          return (leave.type === 'cp' || leave.type === 'cet') && 
                 leaveDate.getFullYear() === currentYear && 
                 leaveDate.getMonth() <= monthIndex
        })
        .reduce((sum, leave) => sum + leave.workingDays, 0)

      // Calculer le cumul restant (quota CP + quota CET - cumul pris + reliquats)
      let quotaCP = 0
      let quotaCET = 0
      if (settings && settings.quotas) {
        const quotaCPEntry = settings.quotas.find((q: any) => q.type === 'cp')
        const quotaCETEntry = settings.quotas.find((q: any) => q.type === 'cet')
        quotaCP = quotaCPEntry ? quotaCPEntry.quota : 25
        quotaCET = quotaCETEntry ? quotaCETEntry.quota : 0
      } else {
        quotaCP = 25 // Valeur par défaut pour CP
        quotaCET = 0 // Valeur par défaut pour CET
      }
      
      const carryoverCP = carryovers.find(c => c.type === 'cp')?.days || 0
      const carryoverCET = carryovers.find(c => c.type === 'cet')?.days || 0
      const totalQuota = quotaCP + quotaCET
      const totalCarryover = carryoverCP + carryoverCET
      const cumulativeRemaining = Math.max(0, totalQuota + totalCarryover - cumulativeTaken)

      return {
        month,
        monthTotal,
        cumulativeTaken,
        cumulativeRemaining
      }
    })

    return monthlyData
  }

  const rttData = calculateRTTData()
  const cpCetData = calculateCPCETData()

  const renderChart = (data: any[], title: string, colorTaken: string, colorRemaining: string) => {
    const maxValue = Math.max(
      ...data.map(d => Math.max(d.cumulativeTaken || 0, d.cumulativeRemaining || 0))
    )
    
    // Éviter les valeurs NaN ou 0
    const safeMaxValue = isNaN(maxValue) || maxValue === 0 ? 1 : maxValue
    const chartHeight = 200
    const barWidth = 30
    const barSpacing = 10

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {title}
        </h3>
        <div className="relative" style={{ height: chartHeight }}>
          {/* Axe Y */}
          <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500">
            {[0, Math.ceil(safeMaxValue / 4), Math.ceil(safeMaxValue / 2), Math.ceil(safeMaxValue * 3 / 4), safeMaxValue].map((value, i) => (
              <div key={i} className="flex items-center">
                <span className="w-8 text-right">{value}</span>
                <div className="w-2 h-px bg-gray-300 ml-2"></div>
              </div>
            ))}
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
                    {monthData.month.substring(0, 3)}
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {renderChart(rttData, 'RTT cumulés pris et restants', 'bg-red-500', 'bg-green-500')}
      {renderChart(cpCetData, 'CP + CET cumulés pris et restants', 'bg-blue-500', 'bg-yellow-500')}
    </div>
  )
}
