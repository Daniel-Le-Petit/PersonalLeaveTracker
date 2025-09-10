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
  onLeaveDelete 
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [viewMode, setViewMode] = useState<'calendar' | 'timeline'>('calendar');
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
    if (Array.isArray(holidays) && holidays.length > 0) return holidays;
    return [
      { date: '2025-01-01', name: 'Jour de l\'An' },
      { date: '2025-04-21', name: 'Lundi de Pâques' },
      { date: '2025-05-01', name: 'Fête du Travail' },
      { date: '2025-05-08', name: 'Victoire 1945' },
      { date: '2025-05-29', name: 'Ascension' },
      { date: '2025-06-09', name: 'Lundi de Pentecôte' },
      { date: '2025-07-14', name: 'Fête Nationale' },
      { date: '2025-08-15', name: 'Assomption' },
      { date: '2025-11-01', name: 'Toussaint' },
      { date: '2025-11-11', name: 'Armistice' },
      { date: '2025-12-25', name: 'Noël' }
    ];
  }, [holidays]);

  // Calcul des suggestions intelligentes
  const smartSuggestions = useMemo(() => {
    const suggestions = [];
    const currentDate = new Date();
    const rttRemaining = 29 - leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear && leave.type === 'rtt'
    ).reduce((sum, leave) => sum + leave.workingDays, 0);

    // Analyser chaque mois pour des suggestions
    for (let month = currentDate.getMonth(); month < 12; month++) {
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

      // Urgence RTT
      if (month <= 1 && rttRemaining > 0) { // Janvier/Février
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

  // Génération du calendrier
  const calendarDays = useMemo(() => {
    const year = currentYear;
    const firstDay = new Date(year, currentMonth, 1);
    const lastDay = new Date(year, currentMonth + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days: CalendarDay[] = [];
    const today = new Date();
    
    // Debug: afficher les congés chargés
    console.log('Congés chargés pour le calendrier:', leaves);
    console.log('Année courante:', currentYear);
    console.log('Mois courant:', currentMonth);
    console.log('Jours fériés:', holidaysArray);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === currentMonth;
      const isToday = date.toDateString() === today.toDateString();
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      
      // Debug pour les week-ends
      if (isWeekend && isCurrentMonth) {
        console.log(`Week-end détecté: ${date.toDateString()}, jour: ${date.getDay()}`);
      }
      
      // Vérifier si c'est un jour férié
      const holiday = holidaysArray.find(h => 
        new Date(h.date).toDateString() === date.toDateString()
      );
      
      // Debug pour les jours fériés
      if (holiday && isCurrentMonth) {
        console.log(`Jour férié détecté: ${date.toDateString()}, ${holiday.name}`);
      }
      
      // Vérifier si c'est un jour de congé (seulement sur les jours ouvrés)
      const leave = leaves.find(l => {
        const startDate = new Date(l.startDate);
        const endDate = new Date(l.endDate);
        
        // Normaliser les dates pour comparaison (ignorer l'heure)
        const currentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const normalizedStart = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const normalizedEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        // Vérifier si la date est dans la période du congé
        const isInPeriod = currentDate >= normalizedStart && currentDate <= normalizedEnd;
        
        // Ne montrer le congé que sur les jours ouvrés (pas les week-ends ni jours fériés)
        if (isInPeriod && !isWeekend && !holiday) {
          return true;
        }
        
        return false;
      });

      // Suggestions pour ce jour
      const daySuggestions = smartSuggestions.filter(s => 
        s.date.toDateString() === date.toDateString()
      );

      days.push({
        date,
        isCurrentMonth,
        isToday,
        isWeekend,
        isHoliday: !!holiday,
        holidayName: holiday?.name,
        leave,
        suggestions: daySuggestions.map(s => s.reason)
      });
    }
    
    return days;
  }, [currentMonth, currentYear, leaves, holidaysArray, smartSuggestions]);

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  // Calculer les jours pris pour le mois courant
  const currentMonthStats = useMemo(() => {
    const monthLeaves = leaves.filter(leave => {
      const leaveDate = new Date(leave.startDate);
      return leaveDate.getFullYear() === currentYear && leaveDate.getMonth() === currentMonth;
    });

    const rttDays = monthLeaves
      .filter(leave => leave.type === 'rtt')
      .reduce((sum, leave) => sum + leave.workingDays, 0);

    const cpDays = monthLeaves
      .filter(leave => leave.type === 'cp')
      .reduce((sum, leave) => sum + leave.workingDays, 0);

    return { rttDays, cpDays };
  }, [leaves, currentYear, currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth(prev => prev === 0 ? 11 : prev - 1);
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => prev === 11 ? 0 : prev + 1);
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Calendrier des Congés
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Timeline et suggestions intelligentes
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                💡 Les congés ne s'affichent que sur les jours ouvrés (exclut WE et jours fériés)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'calendar' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Calendrier
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 text-sm rounded transition-colors ${
                viewMode === 'timeline' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Timeline
            </button>
          </div>
        </div>
      </div>
      
      <div className="card-body p-6">
        {viewMode === 'calendar' ? (
          <>
            {/* Navigation du calendrier */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={goToPreviousMonth}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  (RTT={currentMonthStats.rttDays})
                </span>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {monthNames[currentMonth]} {currentYear}
                </h2>
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                  (CP={currentMonthStats.cpDays})
                </span>
              </div>
              <button
                onClick={goToNextMonth}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* Grille du calendrier */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
                  {day}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  onClick={() => handleDayClick(day)}
                  className={`
                    min-h-[80px] p-1 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer
                    transition-all duration-200 hover:shadow-md hover:scale-105
                    ${day.isToday ? 'ring-2 ring-blue-500' : ''}
                    ${day.isWeekend || day.isHoliday ? 'bg-gray-100 dark:bg-gray-800' : ''}
                    ${!day.isWeekend && !day.isHoliday ? (day.isCurrentMonth ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800') : ''}
                    ${day.leave ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20' : 'hover:bg-green-50 dark:hover:bg-green-900/20'}
                  `}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-medium ${
                      day.isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                    }`}>
                      {day.date.getDate()}
                    </span>
                    {day.isHoliday && (
                      <Gift className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                  
                  {day.leave && (
                    <div className={`text-xs p-1 rounded mb-1 ${getLeaveColor(day.leave)} flex items-center justify-between`}>
                      <span>{day.leave.type.toUpperCase()}</span>
                      {day.leave.isForecast && (
                        <span className="text-xs opacity-75">(P)</span>
                      )}
                    </div>
                  )}
                  
                  {/* Indicateur d'ajout pour les jours vides */}
                  {!day.leave && day.isCurrentMonth && !day.isWeekend && (
                    <div className="flex items-center justify-center h-6 mb-1">
                      <Plus className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  
                  
                  {day.suggestions && day.suggestions.length > 0 && (
                    <div className="space-y-1">
                      {day.suggestions.slice(0, 2).map((suggestion, idx) => (
                        <div key={idx} className={`text-xs p-1 rounded ${getSuggestionColor(suggestion)}`}>
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {day.holidayName && (
                    <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                      {day.holidayName}
                    </div>
                  )}
                </div>
              ))}
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

        {/* Debug des données */}
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
            </div>
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <p className="font-medium mb-1">🔍 Debug - Congés chargés :</p>
              <div className="text-xs space-y-1">
                <p>Total congés: {leaves.length}</p>
                <p>Année: {currentYear}</p>
                <p>Mois: {currentMonth + 1}</p>
                {leaves.filter(l => new Date(l.startDate).getMonth() === currentMonth).map((leave, idx) => (
                  <p key={idx}>
                    {leave.type} - {new Date(leave.startDate).toLocaleDateString('fr-FR')} à {new Date(leave.endDate).toLocaleDateString('fr-FR')}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions d'utilisation */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start space-x-2">
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
            </div>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">💡 Comment utiliser le calendrier :</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Cliquez sur un jour vide</strong> pour ajouter un congé</li>
                <li>• <strong>Cliquez sur un congé existant</strong> pour le modifier ou le supprimer</li>
                <li>• <strong>(P)</strong> = Prévision (pas encore pris)</li>
                <li>• <strong>Suggestions colorées</strong> = Meilleures périodes pour prendre des congés</li>
              </ul>
            </div>
          </div>
        </div>
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
