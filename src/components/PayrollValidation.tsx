'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calendar, CheckCircle, AlertTriangle, XCircle, Plus, Trash2, Edit3, Download, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { PayrollData, type PayrollValidation, LeaveEntry } from '../types'

interface PayrollValidationProps {
  leaves: LeaveEntry[];
  currentYear: number;
  onDataUpdate?: () => void;
  onYearChange?: (year: number) => void;
}

export default function PayrollValidation({ leaves, currentYear, onDataUpdate, onYearChange }: PayrollValidationProps) {
  const [payrollData, setPayrollData] = useState<PayrollData[]>([])
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const currentMonth = new Date().getMonth() + 1
    return currentMonth === 1 ? 12 : currentMonth - 1
  })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingData, setEditingData] = useState<PayrollData | null>(null)
  const [formData, setFormData] = useState<Partial<PayrollData>>({})

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ]

  const goToPreviousMonth = () => {
    setSelectedMonth(prev => prev === 1 ? 12 : prev - 1)
  }

  const goToNextMonth = () => {
    setSelectedMonth(prev => prev === 12 ? 1 : prev + 1)
  }

  const goToCurrentMonth = () => {
    const currentMonth = new Date().getMonth() + 1
    setSelectedMonth(currentMonth === 1 ? 12 : currentMonth - 1)
  }

  const setCurrentYear = (year: number) => {
    if (onYearChange) {
      onYearChange(year)
    }
  }


  // Charger les données de feuille de paie
  useEffect(() => {
    loadPayrollData()
  }, [currentYear])

  const loadPayrollData = async () => {
    try {
      const stored = localStorage.getItem(`payroll-data-${currentYear}`)
      if (stored) {
        setPayrollData(JSON.parse(stored))
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de feuille de paie:', error)
    }
  }

  const savePayrollData = async (data: PayrollData[]) => {
    try {
      localStorage.setItem(`payroll-data-${currentYear}`, JSON.stringify(data))
      setPayrollData(data)
      onDataUpdate?.()
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
    }
  }

  // Calculer les données attendues basées sur les congés saisis
  const calculateExpectedData = (month: number, year: number) => {
    const monthLeaves = leaves.filter(leave => {
      const leaveDate = new Date(leave.startDate)
      return leaveDate.getMonth() + 1 === month && leaveDate.getFullYear() === year
    })

    const previousMonth = month === 1 ? 12 : month - 1
    const previousYear = month === 1 ? year - 1 : year
    const previousMonthLeaves = leaves.filter(leave => {
      const leaveDate = new Date(leave.startDate)
      return leaveDate.getMonth() + 1 === previousMonth && leaveDate.getFullYear() === previousYear
    })

    // Calculs RTT - RTT pris dans le mois précédent
    const rttLeaves = previousMonthLeaves.filter(leave => leave.type === 'rtt')
    const rttPrisDansMois = rttLeaves.reduce((sum, leave) => sum + leave.workingDays, 0)

    // Calculs CP
    const cpPrisDansMois = monthLeaves
      .filter(leave => leave.type === 'cp')
      .reduce((sum, leave) => sum + leave.workingDays, 0)

    // Calculer le nombre de jours CP du mois précédent (utiliser workingDays qui exclut les week-ends)
    const cpPrisMoisPrecedentCount = previousMonthLeaves
      .filter(leave => leave.type === 'cp')
      .reduce((sum, leave) => sum + leave.workingDays, 0)

    // Calculs CET
    const cetPrisDansMois = monthLeaves
      .filter(leave => leave.type === 'cet')
      .reduce((sum, leave) => sum + leave.workingDays, 0)

    return {
      rttPrisDansMois,
      rttLeavesDates: rttLeaves.map(leave => ({
        startDate: leave.startDate,
        endDate: leave.endDate,
        workingDays: leave.workingDays
      })),
      cpPrisDansMois,
      cpPrisMoisPrecedent: cpPrisMoisPrecedentCount,
      cetPrisDansMois
    }
  }

  // Valider les données
  const validatePayrollData = (data: PayrollData): PayrollValidation => {
    const expected = calculateExpectedData(data.month, data.year)
    
    // Validation RTT
    const rttValidation = {
      saisie: data.rttPrisDansMois,
      calculee: expected.rttPrisDansMois,
      difference: data.rttPrisDansMois - expected.rttPrisDansMois,
      status: (Math.abs(data.rttPrisDansMois - expected.rttPrisDansMois) <= 0.5 ? 'valid' : 
              Math.abs(data.rttPrisDansMois - expected.rttPrisDansMois) <= 1 ? 'warning' : 'error') as 'valid' | 'warning' | 'error',
      rttLeavesDates: expected.rttLeavesDates
    }

    // Validation CP mois précédent
    const cpPrisValidation = {
      saisies: data.cpPrisMoisPrecedent,
      calculees: expected.cpPrisMoisPrecedent,
      manquantes: [],
      enTrop: [],
      status: (Math.abs(expected.cpPrisMoisPrecedent - data.cpPrisMoisPrecedent.length) <= 0.5 ? 'valid' : 
              Math.abs(expected.cpPrisMoisPrecedent - data.cpPrisMoisPrecedent.length) <= 1 ? 'warning' : 'error') as 'valid' | 'warning' | 'error'
    }

    // Calcul du score global
    const validations = [rttValidation, cpPrisValidation]
    const validCount = validations.filter(v => v.status === 'valid').length
    const scoreGlobal = Math.round((validCount / validations.length) * 100)
    
    const statusGlobal = scoreGlobal >= 90 ? 'valid' : scoreGlobal >= 70 ? 'warning' : 'error'

    return {
      month: data.month,
      year: data.year,
      cpAvenir: { saisie: data.cpAvenir, calculee: 0, difference: 0, status: 'valid' },
      cpEcoules: { saisie: data.cpEcoules, calculee: 0, difference: 0, status: 'valid' },
      cpReliquat: { saisie: data.cpReliquat, calculee: 0, difference: 0, status: 'valid' },
      rttPrisDansMois: rttValidation,
      soldeCet: { 
        saisie: data.soldeCet, 
        calculee: expected.cetPrisDansMois, 
        difference: data.soldeCet - expected.cetPrisDansMois, 
        status: Math.abs(data.soldeCet - expected.cetPrisDansMois) <= 0.5 ? 'valid' : 
                Math.abs(data.soldeCet - expected.cetPrisDansMois) <= 1 ? 'warning' : 'error'
      },
      cpPrisMoisPrecedent: cpPrisValidation,
      joursFeries: { saisies: data.joursFeries, calculees: [], manquantes: [], enTrop: [], status: 'valid' },
      scoreGlobal,
      statusGlobal
    }
  }

  const validations = useMemo(() => {
    return payrollData
      .filter(data => data.month === selectedMonth)
      .map(validatePayrollData)
  }, [payrollData, leaves, selectedMonth])

  const openModal = (data?: PayrollData) => {
    if (data) {
      setEditingData(data)
      setFormData(data)
    } else {
      setEditingData(null)
      setFormData({
        month: selectedMonth,
        year: currentYear,
        cpAvenir: 0,
        cpEcoules: 0,
        cpReliquat: 0,
        rttPrisDansMois: 0,
        soldeCet: 0,
        cpPrisMoisPrecedent: [],
        joursFeries: []
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingData(null)
    setFormData({})
  }

  // Normaliser les dates au format YYYY-MM-DD
  const normalizeDate = (dateStr: string): string => {
    // Gérer différents formats de dates
    if (dateStr.includes('/')) {
      // Format DD/MM/YYYY
      const parts = dateStr.split('/')
      if (parts.length === 3) {
        const [day, month, year] = parts
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    } else if (dateStr.includes('-') && dateStr.split('-')[0].length <= 2) {
      // Format DD-MM-YYYY
      const parts = dateStr.split('-')
      if (parts.length === 3 && parts[0].length <= 2) {
        const [day, month, year] = parts
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }
    // Format déjà en YYYY-MM-DD ou autre format non reconnu
    return dateStr
  }

  const handleSave = () => {
    if (!formData.month || !formData.year) {
      toast.error('Veuillez sélectionner un mois et une année')
      return
    }

    // Normaliser les dates et filtrer les lignes vides
    const normalizedCpPris = (formData.cpPrisMoisPrecedent || [])
      .filter(line => line.trim()) // Filtrer les lignes vides
      .map(normalizeDate)
    const normalizedJoursFeries = (formData.joursFeries || [])
      .filter(line => line.trim()) // Filtrer les lignes vides
      .map(normalizeDate)

    const newData: PayrollData = {
      id: editingData?.id || Date.now().toString(),
      month: formData.month!,
      year: formData.year!,
      cpAvenir: formData.cpAvenir || 0,
      cpEcoules: formData.cpEcoules || 0,
      cpReliquat: formData.cpReliquat || 0,
      rttPrisDansMois: formData.rttPrisDansMois || 0,
      soldeCet: formData.soldeCet || 0,
      cpPrisMoisPrecedent: normalizedCpPris,
      joursFeries: normalizedJoursFeries,
      createdAt: editingData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    const updatedData = editingData 
      ? payrollData.map(d => d.id === editingData.id ? newData : d)
      : [...payrollData, newData]

    savePayrollData(updatedData)
    closeModal()
    toast.success(editingData ? 'Données mises à jour' : 'Données ajoutées')
  }

  const handleDelete = (id: string) => {
    const updatedData = payrollData.filter(d => d.id !== id)
    savePayrollData(updatedData)
    toast.success('Données supprimées')
  }

  const getStatusIcon = (status: 'valid' | 'warning' | 'error') => {
    switch (status) {
      case 'valid': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getStatusColor = (status: 'valid' | 'warning' | 'error') => {
    switch (status) {
      case 'valid': return 'bg-green-50 border-green-200 text-green-800'
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'error': return 'bg-red-50 border-red-200 text-red-800'
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                📋 Validation Feuilles de Paie
              </h2>
              <div className="flex items-center space-x-4 mt-2">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentYear(currentYear - 1)}
                    className="px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Année précédente"
                  >
                    ←
                  </button>
                  <span className="px-3 py-1 text-sm font-medium bg-blue-500 text-white rounded">{currentYear}</span>
                  <button
                    onClick={() => setCurrentYear(currentYear + 1)}
                    className="px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Année suivante"
                  >
                    →
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={goToPreviousMonth}
                    className="px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Mois précédent"
                  >
                    ←
                  </button>
                  <span className="px-3 py-1 text-sm font-medium bg-blue-500 text-white rounded">{monthNames[selectedMonth - 1]}</span>
                  <button
                    onClick={goToNextMonth}
                    className="px-2 py-1 text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    title="Mois suivant"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              title="Ajouter une feuille de paie"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="card-body">
        {validations.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              Aucune donnée de feuille de paie saisie pour {monthNames[selectedMonth - 1]} {currentYear}
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Cliquez sur "Ajouter" pour commencer la validation
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {validations.map((validation, index) => {
              const data = payrollData.filter(d => d.month === selectedMonth)[index]
              return (
                <div key={data.id} className={`border rounded-lg p-4 ${getStatusColor(validation.statusGlobal)}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(validation.statusGlobal)}
                      <div>
                        <h3 className="font-semibold">
                          {monthNames[data.month - 1]} {data.year}
                        </h3>
                        <p className="text-sm opacity-75">
                          Score de validation: {validation.scoreGlobal}%
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openModal(data)}
                        className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                        title="Modifier"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(data.id)}
                        className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* RTT Pris dans le mois précédent */}
                    <div className={`rounded p-3 border-2 ${validation.rttPrisDansMois.status === 'valid' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">RTT {monthNames[selectedMonth === 1 ? 11 : selectedMonth - 2]} {selectedMonth === 1 ? currentYear - 1 : currentYear}</span>
                        {getStatusIcon(validation.rttPrisDansMois.status)}
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>- Feuille de paie:</span>
                          <span className="font-medium">{validation.rttPrisDansMois.saisie}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>- Calendrier:</span>
                          <span className="font-medium">{validation.rttPrisDansMois.calculee}</span>
                        </div>
                        {validation.rttPrisDansMois.difference !== 0 && (
                          <div className={`text-xs font-medium ${validation.rttPrisDansMois.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            Différence: {validation.rttPrisDansMois.difference > 0 ? '+' : ''}{validation.rttPrisDansMois.difference}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CP Pris mois précédent */}
                    <div className={`rounded p-3 border-2 ${validation.cpPrisMoisPrecedent.status === 'valid' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">CP {monthNames[selectedMonth === 1 ? 11 : selectedMonth - 2]} {selectedMonth === 1 ? currentYear - 1 : currentYear}</span>
                        {getStatusIcon(validation.cpPrisMoisPrecedent.status)}
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>- Feuille de paie:</span>
                          <span className="font-medium">{validation.cpPrisMoisPrecedent.saisies.length} jours</span>
                        </div>
                        <div className="flex justify-between">
                          <span>- Calendrier:</span>
                          <span className="font-medium">{validation.cpPrisMoisPrecedent.calculees} jours</span>
                        </div>
                        {validation.cpPrisMoisPrecedent.manquantes.length > 0 && (
                          <div className="text-xs text-red-600">
                            <div className="font-medium">Manquants:</div>
                            <div className="ml-2">{validation.cpPrisMoisPrecedent.manquantes.map(date => {
                              const d = new Date(date)
                              return d.toLocaleDateString('fr-FR')
                            }).join(', ')}</div>
                          </div>
                        )}
                        {validation.cpPrisMoisPrecedent.enTrop.length > 0 && (
                          <div className="text-xs text-yellow-600">
                            <div className="font-medium">En trop:</div>
                            <div className="ml-2">{validation.cpPrisMoisPrecedent.enTrop.map(date => {
                              const d = new Date(date)
                              return d.toLocaleDateString('fr-FR')
                            }).join(', ')}</div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Solde CET */}
                    <div className={`rounded p-3 border-2 ${validation.soldeCet.status === 'valid' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Solde CET {currentYear}</span>
                        {getStatusIcon(validation.soldeCet.status)}
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>- Feuille de paie:</span>
                          <span className="font-medium">{validation.soldeCet.saisie}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>- Calendrier:</span>
                          <span className="font-medium">{validation.soldeCet.calculee}</span>
                        </div>
                        {validation.soldeCet.difference !== 0 && (
                          <div className={`text-xs font-medium ${validation.soldeCet.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            Différence: {validation.soldeCet.difference > 0 ? '+' : ''}{validation.soldeCet.difference}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Résumé des incohérences - affiché seulement s'il y a des problèmes */}
                  {(validation.rttPrisDansMois.difference !== 0 || 
                    validation.cpPrisMoisPrecedent.manquantes.length > 0 || 
                    validation.cpPrisMoisPrecedent.enTrop.length > 0 || 
                    validation.soldeCet.difference !== 0) && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                      <div className="flex items-center mb-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                        <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Incohérences détectées</h4>
                      </div>
                      <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                        {validation.rttPrisDansMois.difference !== 0 && (
                          <div>• RTT: {validation.rttPrisDansMois.difference > 0 ? 'Trop de jours saisis' : 'Jours manquants'} ({Math.abs(validation.rttPrisDansMois.difference)} jour{Math.abs(validation.rttPrisDansMois.difference) > 1 ? 's' : ''})</div>
                        )}
                        {validation.cpPrisMoisPrecedent.manquantes.length > 0 && (
                          <div>• CP: {validation.cpPrisMoisPrecedent.manquantes.length} jour{validation.cpPrisMoisPrecedent.manquantes.length > 1 ? 's' : ''} manquant{validation.cpPrisMoisPrecedent.manquantes.length > 1 ? 's' : ''}</div>
                        )}
                        {validation.cpPrisMoisPrecedent.enTrop.length > 0 && (
                          <div>• CP: {validation.cpPrisMoisPrecedent.enTrop.length} jour{validation.cpPrisMoisPrecedent.enTrop.length > 1 ? 's' : ''} en trop</div>
                        )}
                        {validation.soldeCet.difference !== 0 && (
                          <div>• CET: Différence de {Math.abs(validation.soldeCet.difference)} jour{Math.abs(validation.soldeCet.difference) > 1 ? 's' : ''}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Corrections suggérées - affiché seulement s'il y a des problèmes ou si tout est cohérent */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
                      <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                        {validation.rttPrisDansMois.status === 'valid' && validation.cpPrisMoisPrecedent.status === 'valid' && validation.soldeCet.status === 'valid' 
                          ? 'Validation réussie' 
                          : 'Corrections attendues'
                        } :
                      </h4>
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300 space-y-3">
                      {validation.rttPrisDansMois.difference !== 0 && (
                        <div>
                          <div className="font-semibold mb-1">• <strong>RTT:</strong> {validation.rttPrisDansMois.difference > 0 ? 'Réduire' : 'Augmenter'} le nombre de jours saisis</div>
                          <div className="ml-4 text-xs space-y-1">
                            <div>📊 <strong>Feuille de paie:</strong> {validation.rttPrisDansMois.saisie} jour{validation.rttPrisDansMois.saisie > 1 ? 's' : ''} RTT pris en {monthNames[data.month === 1 ? 11 : data.month - 2]} {data.month === 1 ? data.year - 1 : data.year}</div>
                            <div>📅 <strong>Congés enregistrés:</strong> {validation.rttPrisDansMois.calculee} jour{validation.rttPrisDansMois.calculee > 1 ? 's' : ''} RTT trouvé{validation.rttPrisDansMois.calculee > 1 ? 's' : ''} dans le système</div>
                            {validation.rttPrisDansMois.rttLeavesDates && validation.rttPrisDansMois.rttLeavesDates.length > 0 && (
                              <div>📅 <strong>Dates dans le calendrier:</strong> {validation.rttPrisDansMois.rttLeavesDates.map((leave, index) => (
                                <span key={index}>
                                  {new Date(leave.startDate).toLocaleDateString('fr-FR')} - {new Date(leave.endDate).toLocaleDateString('fr-FR')} ({leave.workingDays} jour{leave.workingDays > 1 ? 's' : ''})
                                  {index < validation.rttPrisDansMois.rttLeavesDates!.length - 1 ? ', ' : ''}
                                </span>
                              ))}</div>
                            )}
                            <div>⚖️ <strong>Action:</strong> {validation.rttPrisDansMois.difference > 0 ? 'Réduire de' : 'Augmenter de'} {Math.abs(validation.rttPrisDansMois.difference)} jour{Math.abs(validation.rttPrisDansMois.difference) > 1 ? 's' : ''} sur la feuille de paie</div>
                          </div>
                        </div>
                      )}
                      {validation.cpPrisMoisPrecedent.manquantes.length > 0 && (
                        <div>
                          <div className="font-semibold mb-1">• <strong>CP {monthNames[selectedMonth === 1 ? 11 : selectedMonth - 2]}:</strong> Ajouter les dates manquantes</div>
                          <div className="ml-4 text-xs space-y-1">
                            <div>📊 <strong>Feuille de paie:</strong> {validation.cpPrisMoisPrecedent.saisies.length} jour{validation.cpPrisMoisPrecedent.saisies.length > 1 ? 's' : ''} CP saisis</div>
                            <div>📋 <strong>Dates sur feuille de paie:</strong> {validation.cpPrisMoisPrecedent.saisies.map(date => {
                              const d = new Date(date)
                              return d.toLocaleDateString('fr-FR')
                            }).join(', ')}</div>
                            <div>📅 <strong>Congés enregistrés:</strong> {validation.cpPrisMoisPrecedent.calculees} jour{validation.cpPrisMoisPrecedent.calculees > 1 ? 's' : ''} CP trouvé{validation.cpPrisMoisPrecedent.calculees > 1 ? 's' : ''} dans le système (jours ouvrés uniquement)</div>
                            <div>➕ <strong>Dates à ajouter:</strong> {validation.cpPrisMoisPrecedent.manquantes.map(date => {
                              const d = new Date(date)
                              return d.toLocaleDateString('fr-FR')
                            }).join(', ')}</div>
                            <div>💡 <strong>Raison:</strong> Ces dates sont dans vos congés enregistrés mais pas sur votre feuille de paie</div>
                          </div>
                        </div>
                      )}
                      {validation.cpPrisMoisPrecedent.enTrop.length > 0 && (
                        <div>
                          <div className="font-semibold mb-1">• <strong>CP {monthNames[selectedMonth === 1 ? 11 : selectedMonth - 2]}:</strong> Supprimer les dates en trop</div>
                          <div className="ml-4 text-xs space-y-1">
                            <div>📊 <strong>Feuille de paie:</strong> {validation.cpPrisMoisPrecedent.saisies.length} jour{validation.cpPrisMoisPrecedent.saisies.length > 1 ? 's' : ''} CP saisis</div>
                            <div>📋 <strong>Dates sur feuille de paie:</strong> {validation.cpPrisMoisPrecedent.saisies.map(date => {
                              const d = new Date(date)
                              return d.toLocaleDateString('fr-FR')
                            }).join(', ')}</div>
                            <div>📅 <strong>Congés enregistrés:</strong> {validation.cpPrisMoisPrecedent.calculees} jour{validation.cpPrisMoisPrecedent.calculees > 1 ? 's' : ''} CP trouvé{validation.cpPrisMoisPrecedent.calculees > 1 ? 's' : ''} dans le système (jours ouvrés uniquement)</div>
                            <div>➖ <strong>Dates à supprimer:</strong> {validation.cpPrisMoisPrecedent.enTrop.map(date => {
                              const d = new Date(date)
                              return d.toLocaleDateString('fr-FR')
                            }).join(', ')}</div>
                            <div>💡 <strong>Raison:</strong> Ces dates sont sur votre feuille de paie mais pas dans vos congés enregistrés</div>
                          </div>
                        </div>
                      )}
                      {validation.soldeCet.difference !== 0 && (
                        <div>
                          <div className="font-semibold mb-1">• <strong>Solde CET:</strong> Ajuster le solde</div>
                          <div className="ml-4 text-xs space-y-1">
                            <div>📊 <strong>Feuille de paie:</strong> {validation.soldeCet.saisie} jour{validation.soldeCet.saisie > 1 ? 's' : ''} CET</div>
                            <div>📅 <strong>Congés enregistrés:</strong> {validation.soldeCet.calculee} jour{validation.soldeCet.calculee > 1 ? 's' : ''} CET trouvé{validation.soldeCet.calculee > 1 ? 's' : ''} dans le système</div>
                            <div>⚖️ <strong>Action:</strong> {validation.soldeCet.difference > 0 ? 'Réduire de' : 'Augmenter de'} {Math.abs(validation.soldeCet.difference)} jour{Math.abs(validation.soldeCet.difference) > 1 ? 's' : ''} le solde CET</div>
                          </div>
                        </div>
                      )}
                      {validation.rttPrisDansMois.status === 'valid' && validation.cpPrisMoisPrecedent.status === 'valid' && validation.soldeCet.status === 'valid' && (
                        <div className="text-green-600 dark:text-green-400">✅ Toutes les données sont cohérentes !</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de saisie */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingData ? 'Modifier' : 'Ajouter'} Données Feuille de Paie
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Mois et Année */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Mois
                    </label>
                    <select
                      value={formData.month || ''}
                      onChange={(e) => setFormData({...formData, month: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      {monthNames.map((month, index) => (
                        <option key={index} value={index + 1}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Année
                    </label>
                    <input
                      type="number"
                      value={formData.year || ''}
                      onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                {/* Soldes CP */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CP à venir
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cpAvenir || ''}
                      onChange={(e) => setFormData({...formData, cpAvenir: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CP écoulés
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cpEcoules || ''}
                      onChange={(e) => setFormData({...formData, cpEcoules: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CP reliquat
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.cpReliquat || ''}
                      onChange={(e) => setFormData({...formData, cpReliquat: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                {/* RTT et CET */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      RTT Pris sur {monthNames[selectedMonth === 1 ? 11 : selectedMonth - 2]}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.rttPrisDansMois || ''}
                      onChange={(e) => setFormData({...formData, rttPrisDansMois: e.target.value === '' ? 0 : parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Solde CET {currentYear}
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.soldeCet || ''}
                      onChange={(e) => setFormData({...formData, soldeCet: e.target.value === '' ? 0 : parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                {/* CP pris mois précédent */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CP {monthNames[selectedMonth === 1 ? 11 : selectedMonth - 2]} (dates)
                  </label>
                  <textarea
                    value={(formData.cpPrisMoisPrecedent || []).join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n')
                      setFormData({...formData, cpPrisMoisPrecedent: lines})
                    }}
                    placeholder="Une date par ligne (formats acceptés):&#10;• DD-MM-YYYY: 15-07-2025&#10;• DD/MM/YYYY: 15/07/2025&#10;• YYYY-MM-DD: 2025-07-15&#10;&#10;Exemple:&#10;15-07-2025&#10;16-07-2025&#10;17-07-2025&#10;18-07-2025"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={6}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formats acceptés: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD (une date par ligne)
                  </p>
                </div>

                {/* Jours fériés */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Jours fériés du mois
                  </label>
                  <textarea
                    value={(formData.joursFeries || []).join('\n')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n')
                      setFormData({...formData, joursFeries: lines})
                    }}
                    placeholder="Une date par ligne (formats acceptés):&#10;• DD-MM-YYYY: 14-07-2025&#10;• DD/MM/YYYY: 14/07/2025&#10;• YYYY-MM-DD: 2025-07-14&#10;&#10;Exemple:&#10;14-07-2025"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    rows={4}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formats acceptés: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD (une date par ligne)
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  {editingData ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
