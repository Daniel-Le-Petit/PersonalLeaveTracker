'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
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

  // Préparer les données pour les graphiques
  const prepareChartData = (leaveType: 'rtt' | 'cp' | 'cet') => {
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]

    const data = []
    let cumulativeTaken = 0
    let cumulativeRemaining = 0

    for (let month = 1; month <= 12; month++) {
      // Calculer les congés pris ce mois
      const monthLeaves = yearLeaves.filter(leave => {
        const leaveDate = new Date(leave.startDate)
        return leave.type === leaveType && leaveDate.getMonth() === month - 1
      })

      const takenThisMonth = monthLeaves.reduce((sum, leave) => sum + leave.workingDays, 0)
      cumulativeTaken += takenThisMonth

      // Calculer les congés restants (logique différente selon le type)
      let remainingThisMonth = 0
      if (leaveType === 'rtt') {
        // RTT : 2 par mois, cumulatif
        const totalAvailable = month * 2
        remainingThisMonth = Math.max(0, totalAvailable - cumulativeTaken)
      } else if (leaveType === 'cp') {
        // CP : 25 par an, disponibles dès janvier
        const totalAvailable = 25
        remainingThisMonth = Math.max(0, totalAvailable - cumulativeTaken)
      } else if (leaveType === 'cet') {
        // CET : logique spécifique selon vos besoins
        const totalAvailable = 10 // À ajuster selon vos quotas
        remainingThisMonth = Math.max(0, totalAvailable - cumulativeTaken)
      }

      cumulativeRemaining = remainingThisMonth

      data.push({
        mois: monthNames[month - 1],
        pris: cumulativeTaken,
        restants: cumulativeRemaining,
        prisCeMois: takenThisMonth
      })
    }

    return data
  }

  const rttData = prepareChartData('rtt')
  const cpData = prepareChartData('cp')
  const cetData = prepareChartData('cet')

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

  return (
    <div className="space-y-8">
      {/* Graphique RTT */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            📊 RTT cumulés pris et restants - {currentYear}
          </h2>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={rttData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="mois" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 12 }}
                label={{ value: 'Jours RTT', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="pris" 
                fill="#ef4444" 
                name="RTT pris cumulés"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="restants" 
                fill="#22c55e" 
                name="RTT restants cumulés"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Graphique CP */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            📊 CP cumulés pris et restants - {currentYear}
          </h2>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cpData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="mois" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 12 }}
                label={{ value: 'Jours CP', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="pris" 
                fill="#3b82f6" 
                name="CP pris cumulés"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="restants" 
                fill="#22c55e" 
                name="CP restants cumulés"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Graphique CET */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            📊 CET cumulés pris et restants - {currentYear}
          </h2>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={cetData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="mois" 
                className="text-xs"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fontSize: 12 }}
                label={{ value: 'Jours CET', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar 
                dataKey="pris" 
                fill="#8b5cf6" 
                name="CET pris cumulés"
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="restants" 
                fill="#22c55e" 
                name="CET restants cumulés"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
