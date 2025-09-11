'use client'

import React, { useState } from 'react'
import { Info } from 'lucide-react'

interface CalculationTooltipProps {
  value: number | string
  calculation: string
  children: React.ReactNode
  className?: string
}

const CalculationTooltip: React.FC<CalculationTooltipProps> = ({
  value,
  calculation,
  children,
  className = ""
}) => {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className="absolute z-50 w-64 p-3 mt-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg border border-gray-600 dark:border-gray-500">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-blue-300 mb-1">
                Calcul: {value}
              </div>
              <div className="text-gray-300 text-xs leading-relaxed">
                {calculation}
              </div>
            </div>
          </div>
          {/* Flèche du tooltip */}
          <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45 border-l border-t border-gray-600 dark:border-gray-500"></div>
        </div>
      )}
    </div>
  )
}

export default CalculationTooltip
