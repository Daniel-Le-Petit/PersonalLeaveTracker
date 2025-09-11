'use client'

import React from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface DateInputWithButtonsProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  className?: string
}

const DateInputWithButtons: React.FC<DateInputWithButtonsProps> = ({
  label,
  value,
  onChange,
  placeholder = "DD/MM/YYYY (ex: 02/01/2024)",
  required = false,
  className = ""
}) => {
  // Fonction pour convertir DD/MM/YYYY vers Date
  const parseFrenchDate = (dateStr: string): Date | null => {
    if (!dateStr) return null
    const parts = dateStr.split('/')
    if (parts.length !== 3) return null
    
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1 // Les mois commencent à 0
    const year = parseInt(parts[2], 10)
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null
    
    return new Date(year, month, day)
  }

  // Fonction pour convertir Date vers DD/MM/YYYY
  const formatFrenchDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Fonction pour ajuster la date
  const adjustDate = (increment: number) => {
    const currentDate = parseFrenchDate(value)
    if (currentDate) {
      const newDate = new Date(currentDate)
      newDate.setDate(newDate.getDate() + increment)
      onChange(formatFrenchDate(newDate))
    } else {
      // Si la date n'est pas valide, utiliser la date d'aujourd'hui
      const today = new Date()
      today.setDate(today.getDate() + increment)
      onChange(formatFrenchDate(today))
    }
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label} {required && '*'}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="input input-mobile pl-12 pr-4"
          required={required}
          placeholder={placeholder}
        />
        <div className="absolute left-1 top-1/2 transform -translate-y-1/2 flex flex-col space-y-0.5">
          <button
            type="button"
            onClick={() => adjustDate(1)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Ajouter un jour"
          >
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-gray-700 dark:border-b-gray-200"></div>
          </button>
          <button
            type="button"
            onClick={() => adjustDate(-1)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Soustraire un jour"
          >
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-gray-700 dark:border-t-gray-200"></div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default DateInputWithButtons
