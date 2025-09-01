'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { LeaveEntry } from '../types'

interface LeaveChartsProps {
  leaves: LeaveEntry[]
  currentYear: number
}

export default function LeaveCharts({ leaves, currentYear }: LeaveChartsProps) {
  // Filtrer les congés de l'année courante
  const yearLeaves = leaves.filter(leave => 
    new Date(leave.startDate).getFullYear() === currentYear
  )

  // Préparer les données pour les graphiques mensuels
  const prepareMonthlyData = () => {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]

    const monthlyData = []
    let cumulativeRTT = 0
    let cumulativeCP = 0
    let cumulativeCET = 0

    for (let month = 1; month <= 12; month++) {
      // Calculer les congés pris ce mois
      const monthLeaves = yearLeaves.filter(leave => {
        const leaveDate = new Date(leave.startDate)
        return leaveDate.getMonth() === month - 1
      })

      const rttTaken = monthLeaves
        .filter(leave => leave.type === 'rtt')
        .reduce((sum, leave) => sum + leave.workingDays, 0)
      
      const cpTaken = monthLeaves
        .filter(leave => leave.type === 'cp')
        .reduce((sum, leave) => sum + leave.workingDays, 0)
      
      const cetTaken = monthLeaves
        .filter(leave => leave.type === 'cet')
        .reduce((sum, leave) => sum + leave.workingDays, 0)

      cumulativeRTT += rttTaken
      cumulativeCP += cpTaken
      cumulativeCET += cetTaken

      // Calculer les congés restants
      const rttAvailable = month * 2 // 2 RTT par mois
      const cpAvailable = 25 // 25 CP par an
      const cetAvailable = 10 // 10 CET par an

      const rttRemaining = Math.max(0, rttAvailable - cumulativeRTT)
      const cpRemaining = Math.max(0, cpAvailable - cumulativeCP)
      const cetRemaining = Math.max(0, cetAvailable - cumulativeCET)

      monthlyData.push({
        month: month,
        monthName: monthNames[month - 1],
        rtt: {
          pris: cumulativeRTT,
          restants: rttRemaining,
          prisCeMois: rttTaken
        },
        cp: {
          pris: cumulativeCP,
          restants: cpRemaining,
          prisCeMois: cpTaken
        },
        cet: {
          pris: cumulativeCET,
          restants: cetRemaining,
          prisCeMois: cetTaken
        }
      })
    }

    return monthlyData
  }

  const monthlyData = prepareMonthlyData()

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value} jours
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const COLORS = {
    rtt: ['#ef4444', '#22c55e'], // Rouge pour pris, Vert pour restants
    cp: ['#3b82f6', '#22c55e'],  // Bleu pour pris, Vert pour restants
    cet: ['#8b5cf6', '#22c55e']  // Violet pour pris, Vert pour restants
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          📊 Graphiques mensuels des congés - {currentYear}
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          RTT, CP et CET pris vs restants par mois
        </p>
      </div>

      {/* Grille des graphiques mensuels */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {monthlyData.map((monthData) => (
          <div key={monthData.month} className="card">
            <div className="card-header p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
                {monthData.monthName}
              </h3>
            </div>
            <div className="card-body p-4">
              {/* Graphique RTT */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                  RTT
                </h4>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pris', value: monthData.rtt.pris },
                        { name: 'Restants', value: monthData.rtt.restants }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {[
                        { name: 'Pris', value: monthData.rtt.pris },
                        { name: 'Restants', value: monthData.rtt.restants }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.rtt[index]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Pris: {monthData.rtt.pris}</span>
                    <span>Restants: {monthData.rtt.restants}</span>
                  </div>
                </div>
              </div>

              {/* Graphique CP */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                  CP
                </h4>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pris', value: monthData.cp.pris },
                        { name: 'Restants', value: monthData.cp.restants }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {[
                        { name: 'Pris', value: monthData.cp.pris },
                        { name: 'Restants', value: monthData.cp.restants }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.cp[index]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Pris: {monthData.cp.pris}</span>
                    <span>Restants: {monthData.cp.restants}</span>
                  </div>
                </div>
              </div>

              {/* Graphique CET */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                  CET
                </h4>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pris', value: monthData.cet.pris },
                        { name: 'Restants', value: monthData.cet.restants }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={20}
                      outerRadius={50}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {[
                        { name: 'Pris', value: monthData.cet.pris },
                        { name: 'Restants', value: monthData.cet.restants }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.cet[index]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="text-center text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Pris: {monthData.cet.pris}</span>
                    <span>Restants: {monthData.cet.restants}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Légende */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-center">
          🎨 Légende des couleurs
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300">RTT - Pris</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300">CP - Pris</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300">CET - Pris</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-700 dark:text-gray-300">Restants</span>
          </div>
        </div>
      </div>
    </div>
  )
}
