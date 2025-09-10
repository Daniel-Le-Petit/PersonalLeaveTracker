'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'

interface DateInputWithHelpersProps {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  className?: string
}

export default function DateInputWithHelpers({
  value,
  onChange,
  label,
  placeholder = "DD/MM/YYYY",
  className = ""
}: DateInputWithHelpersProps) {
  const [isFocused, setIsFocused] = useState(false)

  // Convertir la valeur en date pour les calculs
  const getDateValue = () => {
    if (!value) return new Date()
    try {
      // Essayer de parser la date au format DD/MM/YYYY
      const parts = value.split('/')
      if (parts.length === 3) {
        const day = parseInt(parts[0])
        const month = parseInt(parts[1]) - 1 // Les mois commencent à 0
        const year = parseInt(parts[2])
        const date = new Date(year, month, day)
        // Vérifier que la date est valide
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
          return date
        }
      }
      // Fallback: essayer de parser comme ISO
      return parseISO(value)
    } catch {
      return new Date()
    }
  }

  // Formater la date pour l'affichage
  const formatDateForDisplay = (date: Date) => {
    return format(date, 'dd/MM/yyyy')
  }

  // Convertir la date en format DD/MM/YYYY pour le stockage
  const formatDateForStorage = (date: Date) => {
    return format(date, 'dd/MM/yyyy')
  }

  const handleDateChange = (newDate: Date) => {
    onChange(formatDateForStorage(newDate))
  }

  const handlePreviousDay = () => {
    const currentDate = getDateValue()
    const newDate = addDays(currentDate, -1)
    console.log('Previous day:', currentDate, '->', newDate)
    handleDateChange(newDate)
  }

  const handleNextDay = () => {
    const currentDate = getDateValue()
    const newDate = addDays(currentDate, 1)
    console.log('Next day:', currentDate, '->', newDate)
    handleDateChange(newDate)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      
      <div className="flex items-center space-x-2">
        {/* Bouton jour précédent */}
        <button
          type="button"
          onClick={handlePreviousDay}
          className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors border border-gray-200 dark:border-gray-600"
          title="Jour précédent (-1 jour)"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Input de date */}
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        />

        {/* Bouton jour suivant */}
        <button
          type="button"
          onClick={handleNextDay}
          className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors border border-gray-200 dark:border-gray-600"
          title="Jour suivant (+1 jour)"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Affichage de la date formatée quand l'input est vide */}
      {!value && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Aujourd'hui: {formatDateForDisplay(new Date())}
        </div>
      )}

      {/* Affichage de la date formatée quand l'input est focusé */}
      {isFocused && value && (
        <div className="text-xs text-blue-600 dark:text-blue-400">
          {formatDateForDisplay(getDateValue())}
        </div>
      )}
    </div>
  )
}
