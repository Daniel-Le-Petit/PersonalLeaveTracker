'use client';

import React, { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, MapPin, Clock, Gift, Sun, AlertTriangle, TrendingUp, Plus, Edit3, Trash2 } from 'lucide-react';
import LeaveFormModal from './LeaveFormModal';

interface LeaveCalendarProps {
  leaves: any[];
  currentYear: number;
  holidays: any[];
  onLeaveAdd?: (leave: any) => void;
  onLeaveUpdate?: (leave: any) => void;
  onLeaveDelete?: (id: string) => void;
  onYearChange?: (year: number) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayName?: string;
  leave?: any;
  suggestions?: string[];
}

const LeaveCalendar: React.FC<LeaveCalendarProps> = ({ 
  leaves, 
  currentYear, 
  holidays, 
  onLeaveAdd, 
  onLeaveUpdate, 
  onLeaveDelete,
  onYearChange
}) => {
  const [viewMode] = useState<'calendar' | 'timeline'>('calendar');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isMobile, setIsMobile] = useState(false);


  // Détection mobile
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Jours fériés par défaut
  const holidaysArray = useMemo(() => {
    if (Array.isArray(holidays) && holidays.length > 0) {
      // Filtrer les jours fériés pour l'année courante du calendrier
      return holidays.filter(h => {
        const holidayYear = new Date(h.date).getFullYear();
        return holidayYear === currentYear;
      });
    }
    
    // Générer les jours fériés pour l'année courante du calendrier
    const holidaysForYear = [
      { date: `${currentYear}-01-01`, name: 'Jour de l\'An' },
      { date: `${currentYear}-05-01`, name: 'Fête du Travail' },
      { date: `${currentYear}-05-08`, name: 'Victoire 1945' },
      { date: `${currentYear}-07-14`, name: 'Fête Nationale' },
      { date: `${currentYear}-08-15`, name: 'Assomption' },
      { date: `${currentYear}-11-01`, name: 'Toussaint' },
      { date: `${currentYear}-11-11`, name: 'Armistice' },
      { date: `${currentYear}-12-25`, name: 'Noël' }
    ];

    // Ajouter les fêtes mobiles (approximation simple)
    if (currentYear === 2025) {
      holidaysForYear.push(
        { date: '2025-04-21', name: 'Lundi de Pâques' },
        { date: '2025-05-29', name: 'Ascension' },
      );
    } else if (currentYear === 2026) {
      holidaysForYear.push(
        { date: '2026-04-06', name: 'Lundi de Pâques' },
        { date: '2026-05-14', name: 'Ascension' },
      );
    }

    return holidaysForYear;
  }, [holidays, currentYear]);

  // Calcul des suggestions intelligentes
  const smartSuggestions = useMemo(() => {
    const suggestions = [];
    const currentDate = new Date();
    const rttRemaining = 29 - leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && leave.type === 'rtt'
    ).reduce((sum, leave) => sum + leave.workingDays, 0);

    // Analyser chaque mois pour des suggestions (pour l'année courante)
    const startMonth = currentYear === currentDate.getFullYear() ? currentDate.getMonth() : 0;
    for (let month = startMonth; month < 12; month++) {
      const monthStart = new Date(currentYear, month, 1);
      const monthEnd = new Date(currentYear, month + 1, 0);
      const monthHolidays = holidaysArray.filter(h => {
        const holidayDate = new Date(h.date);
        return holidayDate.getMonth() === month && holidayDate.getFullYear() === currentYear;
      });

      if (monthHolidays.length > 0) {
        // Calculer les ponts possibles
        monthHolidays.forEach(holiday => {
          const holidayDate = new Date(holiday.date);
          const dayOfWeek = holidayDate.getDay();
          
          // Pont du vendredi (férié le lundi)
          if (dayOfWeek === 1) {
            const friday = new Date(holidayDate);
            friday.setDate(friday.getDate() - 3);
            suggestions.push({
              date: friday,
              type: 'bridge',
              reason: `Pont ${holiday.name}`,
              efficiency: 4, // 1 jour de congé = 4 jours de repos
              priority: 'high'
            });
          }
          
          // Pont du lundi (férié le vendredi)
          if (dayOfWeek === 5) {
            const monday = new Date(holidayDate);
            monday.setDate(monday.getDate() + 3);
            suggestions.push({
              date: monday,
              type: 'bridge',
              reason: `Pont ${holiday.name}`,
              efficiency: 4,
              priority: 'high'
            });
          }
        });
      }

      // Suggestions saisonnières
      if (month >= 6 && month <= 8) { // Été
        suggestions.push({
          date: new Date(currentYear, month, 15),
          type: 'seasonal',
          reason: 'Période estivale',
          efficiency: 1,
          priority: 'medium'
        });
      }

      // Urgence RTT (seulement pour l'année courante)
      if (currentYear === currentDate.getFullYear() && month <= 1 && rttRemaining > 0) { // Janvier/Février
        suggestions.push({
          date: new Date(currentYear, month, 1),
          type: 'urgent',
          reason: 'Deadline RTT fin février',
          efficiency: 1,
          priority: 'high'
        });
      }
    }

    return suggestions.sort((a, b) => b.priority.localeCompare(a.priority));
  }, [leaves, currentYear, holidaysArray]);


  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];



  const setCurrentYear = (year: number) => {
    if (onYearChange) {
      onYearChange(year)
    }
  };

  // Gestion des congés
  const handleDayClick = (day: CalendarDay) => {
    if (day.leave) {
      // Modifier un congé existant
      setSelectedLeave(day.leave);
      setSelectedDate(null);
    } else {
      // Créer un nouveau congé
      setSelectedLeave(null);
      setSelectedDate(day.date);
    }
    setIsModalOpen(true);
  };

  const handleSaveLeave = (leave: any) => {
    if (selectedLeave) {
      // Modification
      onLeaveUpdate?.(leave);
    } else {
      // Création
      onLeaveAdd?.(leave);
    }
    setIsModalOpen(false);
    setSelectedLeave(null);
    setSelectedDate(null);
  };

  const handleDeleteLeave = (id: string) => {
    onLeaveDelete?.(id);
    setIsModalOpen(false);
    setSelectedLeave(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLeave(null);
    setSelectedDate(null);
  };

  const getLeaveColor = (leave: any) => {
    switch (leave.type) {
      case 'rtt': return 'bg-red-500 text-white';
      case 'cp': return 'bg-blue-500 text-white';
      case 'cet': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getSuggestionColor = (suggestion: string) => {
    if (suggestion.includes('Pont')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
    if (suggestion.includes('Deadline')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    if (suggestion.includes('estivale')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Calendrier des Congés
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                Ajoutez, modifiez ou supprimez des jours de RTT, CP ou CET
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card-body p-6">
        {viewMode === 'calendar' ? (
          <>
            {/* Navigation du calendrier */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
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
              </div>
              <div className="flex flex-col space-y-2">
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    ℹ️ RTT total = {leaves.filter(leave => 
                      new Date(leave.startDate).getFullYear() === currentYear && leave.type === 'rtt'
                    ).reduce((sum, leave) => sum + leave.workingDays, 0)} jours
                  </span>
                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    ℹ️ CP/CET total = {leaves.filter(leave => 
                      new Date(leave.startDate).getFullYear() === currentYear && (leave.type === 'cp' || leave.type === 'cet')
                    ).reduce((sum, leave) => sum + leave.workingDays, 0)} jours
                  </span>
                </div>
              </div>
            </div>

            {/* Calendrier horizontal scrollable - 12 mois */}
            <div className="overflow-x-auto">
              <div className="flex space-x-6 min-w-max">
                {Array.from({ length: 12 }, (_, monthIndex) => {
                  const month = monthIndex
                  const year = currentYear
                  const firstDay = new Date(year, month, 1)
                  const lastDay = new Date(year, month + 1, 0)
                  const startDate = new Date(firstDay)
                  startDate.setDate(startDate.getDate() - firstDay.getDay())
                  
                  const monthDays: CalendarDay[] = []
                  const today = new Date()
                  
                  for (let i = 0; i < 42; i++) {
                    const date = new Date(startDate)
                    date.setDate(startDate.getDate() + i)
                    
                    const isCurrentMonth = date.getMonth() === month
                    const isToday = date.toDateString() === today.toDateString()
                    const isWeekend = date.getDay() === 0 || date.getDay() === 6
                    
                    // Vérifier si c'est un jour férié
                    const holiday = holidaysArray.find(h => 
                      new Date(h.date).toDateString() === date.toDateString()
                    )
                    
                    // Vérifier si c'est un jour de congé
                    const leave = leaves.find(l => {
                      const startDate = new Date(l.startDate)
                      const endDate = new Date(l.endDate)
                      
                      const currentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
                      const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
                      const normalizedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
                      
                      const isInPeriod = currentDate >= normalizedStart && currentDate <= normalizedEnd
                      
                      // Afficher les congés seulement sur les jours du mois courant
                      if (isInPeriod && !isWeekend && !holiday && startDate.getFullYear() === year && isCurrentMonth) {
                        return true
                      }
                      
                      return false
                    })

                    // Suggestions pour ce jour
                    const daySuggestions = smartSuggestions.filter(s => 
                      s.date.toDateString() === date.toDateString()
                    )

                    monthDays.push({
                      date,
                      isCurrentMonth,
                      isToday,
                      isWeekend,
                      isHoliday: !!holiday,
                      holidayName: holiday?.name,
                      leave,
                      suggestions: daySuggestions.map(s => s.reason)
                    })
                  }

                  return (
                    <div key={month} className="flex-shrink-0 w-80">
                      {/* En-tête du mois */}
                      <div className="text-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {monthNames[month]} {year}
                        </h3>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {monthDays.filter(day => day.isCurrentMonth && day.leave).length} congés
                        </div>
                      </div>

                      {/* En-têtes des jours */}
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                          <div key={day} className="p-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Grille du mois */}
                      <div className="grid grid-cols-7 gap-1">
                        {monthDays.map((day, dayIndex) => (
                          <div
                            key={dayIndex}
                            onClick={() => handleDayClick(day)}
                            className={`
                              min-h-[60px] p-1 border border-gray-200 dark:border-gray-700 rounded cursor-pointer
                              transition-all duration-200 hover:shadow-md hover:scale-105
                              ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                              ${day.isWeekend || day.isHoliday ? 'bg-gray-100 dark:bg-gray-800' : ''}
                              ${!day.isWeekend && !day.isHoliday ? (day.isCurrentMonth ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800') : ''}
                              ${day.leave ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'hover:bg-green-50 dark:hover:bg-green-900/20'}
                            `}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className={`text-xs font-medium ${
                                day.isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                              }`}>
                                {day.date.getDate()}
                              </span>
                              {day.isHoliday && (
                                <Gift className="h-2 w-2 text-red-500" />
                              )}
                            </div>
                            
                            {day.leave && (
                              <div className={`text-xs p-1 rounded mb-1 ${getLeaveColor(day.leave)} flex items-center justify-between`}>
                                <span className="text-xs">{day.leave.type.toUpperCase()}</span>
                                {day.leave.isForecast && (
                                  <span className="text-xs opacity-75">(P)</span>
                                )}
                              </div>
                            )}
                            
                            {/* Indicateur d'ajout pour les jours vides */}
                            {!day.leave && day.isCurrentMonth && !day.isWeekend && !day.isHoliday && (
                              <div className="flex items-center justify-center h-4 mb-1">
                                <Plus className="h-2 w-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            )}
                            
                            {day.suggestions && day.suggestions.length > 0 && (
                              <div className="space-y-1">
                                {day.suggestions.slice(0, 1).map((suggestion, idx) => (
                                  <div key={idx} className={`text-xs p-1 rounded ${getSuggestionColor(suggestion)}`}>
                                    {suggestion}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {day.holidayName && (
                              <div className="text-xs text-red-600 dark:text-red-400 font-medium truncate">
                                {day.holidayName}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          /* Vue Timeline améliorée */
          <div className="space-y-6">
            <div className="text-center">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Opportunités de congés
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Les meilleures périodes pour optimiser vos congés
              </p>
            </div>

            {/* Légende */}
            <div className="flex flex-wrap justify-center gap-4 text-xs">
              <div className="flex items-center space-x-1">
                <MapPin className="h-3 w-3 text-purple-500" />
                <span className="text-gray-600 dark:text-gray-400">Ponts</span>
              </div>
              <div className="flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <span className="text-gray-600 dark:text-gray-400">Urgent</span>
              </div>
              <div className="flex items-center space-x-1">
                <Sun className="h-3 w-3 text-yellow-500" />
                <span className="text-gray-600 dark:text-gray-400">Saisonnier</span>
              </div>
            </div>
            
            {/* Suggestions par catégorie */}
            <div className="space-y-4">
              {/* Ponts (priorité haute) */}
              {smartSuggestions.filter(s => s.type === 'bridge').length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-purple-500" />
                    🌉 Ponts à saisir
                  </h5>
                  <div className="space-y-2">
                    {smartSuggestions.filter(s => s.type === 'bridge').map((suggestion, index) => (
                      <div key={index} className="p-3 rounded-lg border bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-purple-900 dark:text-purple-200">
                            {suggestion.reason}
                          </span>
                          <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                            {suggestion.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                          🎯 1 jour de congé = {suggestion.efficiency} jours de repos
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Urgent (RTT) */}
              {smartSuggestions.filter(s => s.type === 'urgent').length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
                    ⚠️ Actions urgentes
                  </h5>
                  <div className="space-y-2">
                    {smartSuggestions.filter(s => s.type === 'urgent').map((suggestion, index) => (
                      <div key={index} className="p-3 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-red-900 dark:text-red-200">
                            {suggestion.reason}
                          </span>
                          <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                            {suggestion.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          🚨 À planifier rapidement
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Saisonnier */}
              {smartSuggestions.filter(s => s.type === 'seasonal').length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                    <Sun className="h-4 w-4 mr-2 text-yellow-500" />
                    ☀️ Périodes recommandées
                  </h5>
                  <div className="space-y-2">
                    {smartSuggestions.filter(s => s.type === 'seasonal').map((suggestion, index) => (
                      <div key={index} className="p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-yellow-900 dark:text-yellow-200">
                            {suggestion.reason}
                          </span>
                          <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                            {suggestion.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                          📅 Bonne période pour prendre des congés
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message si aucune suggestion */}
              {smartSuggestions.length === 0 && (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Aucune suggestion particulière pour le moment
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Consultez le calendrier pour voir les jours fériés
                  </p>
                </div>
              )}
            </div>
          </div>
        )}


      </div>

      {/* Modal de saisie */}
        <LeaveFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveLeave}
          onDelete={handleDeleteLeave}
          leave={selectedLeave}
          selectedDate={selectedDate}
          holidays={holidays}
        />
    </div>
  );
};

export default LeaveCalendar;
