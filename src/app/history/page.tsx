'use client'

import { ArrowLeft, Calendar, Edit, Filter, Search, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { LeaveEntry } from '../../types'
import { formatDate } from '../../utils/leaveUtils'
import { leaveStorage } from '../../utils/storage'
import { useRouter } from 'next/navigation'

export default function HistoryPage() {
  const [leaves, setLeaves] = useState<LeaveEntry[]>([])
  const [filteredLeaves, setFilteredLeaves] = useState<LeaveEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [selectedMode, setSelectedMode] = useState('all')

  const router = useRouter()

  useEffect(() => {
    loadLeaves()
  }, [])

  useEffect(() => {
    filterLeaves()
  }, [leaves, searchTerm, selectedType, selectedYear, selectedMode])

  const loadLeaves = async () => {
    try {
      const leavesData = await leaveStorage.getLeaves()
      setLeaves(leavesData)
    } catch (error) {
      console.error('Erreur lors du chargement des congés:', error)
      toast.error('Erreur lors du chargement des congés')
    } finally {
      setIsLoading(false)
    }
  }

  const filterLeaves = () => {
    let filtered = leaves

    // Filtre par année
    if (selectedYear !== 'all') {
      filtered = filtered.filter(leave => 
        new Date(leave.startDate).getFullYear().toString() === selectedYear
      )
    }

    // Filtre par type
    if (selectedType !== 'all') {
      filtered = filtered.filter(leave => leave.type === selectedType)
    }

    // Filtre par mode (Réel/Prévisions)
    if (selectedMode !== 'all') {
      if (selectedMode === 'real') {
        filtered = filtered.filter(leave => !leave.isForecast)
      } else if (selectedMode === 'forecast') {
        filtered = filtered.filter(leave => leave.isForecast)
      }
    }

    // Filtre par recherche
    if (searchTerm) {
      filtered = filtered.filter(leave =>
        leave.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        leave.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatDate(leave.startDate).includes(searchTerm) ||
        formatDate(leave.endDate).includes(searchTerm)
      )
    }

    // Tri par date de début (plus récent en premier)
    filtered.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

    setFilteredLeaves(filtered)
  }

  const handleDelete = async (leaveId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce congé ?')) {
      return
    }

    try {
      const updatedLeaves = leaves.filter(leave => leave.id !== leaveId)
      await leaveStorage.saveLeaves(updatedLeaves)
      setLeaves(updatedLeaves)
      toast.success('Congé supprimé avec succès')
    } catch (error) {
      console.error('Erreur lors de la suppression:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const getLeaveTypeLabel = (type: string) => {
    const types = {
      cp: 'CP - Congés payés',
      rtt: 'RTT - Réduction du temps de travail',
      sick: 'Maladie',
      
    }
    return types[type as keyof typeof types] || type
  }

  const getLeaveTypeColor = (type: string) => {
    const colors = {
      cp: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      rtt: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      sick: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      
    }
          return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  const getYears = () => {
    const years = new Set(leaves.map(leave => new Date(leave.startDate).getFullYear()))
    return Array.from(years).sort((a, b) => b - a)
  }

  const getTypes = () => {
    return Array.from(new Set(leaves.map(leave => leave.type)))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner h-12 w-12"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <Link href="/" className="btn-secondary">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  📅 Historique des congés
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Consultez et gérez tous vos congés
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {filteredLeaves.length} congé{filteredLeaves.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>

            {/* Filtre par année */}
            <div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="select"
                title="Sélectionner une année"
              >
                <option value="all">Toutes les années</option>
                {getYears().map(year => (
                  <option key={year} value={year.toString()}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par type */}
            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="select"
                title="Sélectionner un type de congé"
              >
                <option value="all">Tous les types</option>
                {getTypes().map(type => (
                  <option key={type} value={type}>
                    {getLeaveTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtre par mode */}
            <div>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="select"
                title="Sélectionner un mode (Réel/Prévisions)"
              >
                <option value="all">Tous les modes</option>
                <option value="real">Réel</option>
                <option value="forecast">Prévisions</option>
              </select>
            </div>

            {/* Bouton de réinitialisation */}
            <div>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedType('all')
                  setSelectedYear(new Date().getFullYear().toString())
                  setSelectedMode('all')
                }}
                className="btn-secondary w-full"
              >
                <Filter className="w-4 h-4 mr-2" />
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredLeaves.length > 0 ? (
          <div className="card">
            <div className="overflow-x-auto">
              <table className="table">
                <thead className="table-header">
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                      Date
                    </th>
                    <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                      Type
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                      Jours
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                      Mode
                    </th>
                    <th className="px-4 py-2 text-center text-sm font-semibold text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {filteredLeaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="table-cell">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">
                            {new Date(leave.startDate).getFullYear()}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${getLeaveTypeColor(leave.type)}`}>
                          {leave.type.toUpperCase()}
                        </span>
                        {leave.isHalfDay && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                            ({leave.halfDayType === 'morning' ? 'Matin' : 'Après-midi'})
                          </span>
                        )}
                      </td>
                      <td className="table-cell">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {leave.workingDays}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-1">
                          jour{leave.workingDays > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${leave.isForecast ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                          {leave.isForecast ? 'Prévision' : 'Réel'}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              // Naviguer vers la page d'édition
                              router.push(`/edit/${leave.id}`)
                            }}
                            className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200"
                            title="Modifier"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(leave.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                            title="Supprimer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body">
              <div className="text-center py-12">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {leaves.length === 0 ? 'Aucun congé enregistré' : 'Aucun congé trouvé'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {leaves.length === 0 
                    ? 'Commencez par ajouter votre premier congé'
                    : 'Essayez de modifier vos critères de recherche'
                  }
                </p>
                {leaves.length === 0 && (
                  <Link href="/add" className="btn-primary">
                    <Calendar className="w-4 h-4 mr-2" />
                    Ajouter un congé
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Statistiques */}
        {filteredLeaves.length > 0 && (
          <div className="mt-8">
            <div className="card">
              <div className="card-header">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  📊 Statistiques
                </h2>
              </div>
              <div className="card-body">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {filteredLeaves.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Congé{filteredLeaves.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {filteredLeaves.reduce((sum, leave) => sum + leave.workingDays, 0)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Jours totaux
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Math.round(filteredLeaves.reduce((sum, leave) => sum + leave.workingDays, 0) / filteredLeaves.length * 10) / 10}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Jours moyens
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {new Set(filteredLeaves.map(leave => leave.type)).size}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Types utilisés
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
