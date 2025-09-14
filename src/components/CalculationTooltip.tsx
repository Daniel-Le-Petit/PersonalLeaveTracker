'use client'

import React, { useState, useEffect, useRef } from 'react'
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
  const tooltipRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => setIsVisible(true)
  const handleMouseLeave = () => setIsVisible(false)
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsVisible(!isVisible)
  }
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsVisible(!isVisible)
  }

  // Fermer le tooltip quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setIsVisible(false)
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isVisible])

  return (
    <div 
      ref={tooltipRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
    >
      {children}
      {isVisible && (
        <div className="absolute z-[9999] w-80 sm:w-72 p-4 mt-2 text-sm text-white bg-gray-900 dark:bg-gray-700 rounded-lg shadow-lg border border-gray-600 dark:border-gray-500 left-1/2 transform -translate-x-1/2">
          <div className="flex items-start space-x-3">
            <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-blue-300 mb-2">
                Calcul: {value}
              </div>
              <div className="text-gray-300 text-xs leading-relaxed">
                {calculation.split('\n').map((line, index) => (
                  <React.Fragment key={index}>
                    {line}
                    {index < calculation.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
          {/* Flèche du tooltip */}
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 border-l border-t border-gray-600 dark:border-gray-500"></div>
        </div>
      )}
    </div>
  )
}

export default CalculationTooltip
