'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Mail, Send, Eye, X, Check, Calendar, Clock, Filter, Plus, Edit3 } from 'lucide-react';
import { LeaveEntry } from '../types';
import { format, subDays, startOfMonth, endOfMonth, isWeekend } from 'date-fns';
import { fr } from 'date-fns/locale';

interface EmailReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  leaves: LeaveEntry[];
  currentYear: number;
  holidays: any[];
  onLeaveUpdate?: (leave: LeaveEntry) => void;
}

const EmailReportModal: React.FC<EmailReportModalProps> = ({
  isOpen,
  onClose,
  leaves,
  currentYear,
  holidays,
  onLeaveUpdate
}) => {
  const [selectedLeaves, setSelectedLeaves] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<('rtt' | 'cp' | 'cet')[]>(['rtt', 'cp', 'cet']);
  const [dateFilter, setDateFilter] = useState<'all' | 'last_week' | 'last_month' | 'current_month'>('last_week');
  const [includeForecast, setIncludeForecast] = useState(true);
  const [includeReal, setIncludeReal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Filtrer les congés selon les critères
  const filteredLeaves = useMemo(() => {
    let filtered = leaves.filter(leave => 
      new Date(leave.startDate).getFullYear() === currentYear &&
      selectedTypes.includes(leave.type)
    );

    // Appliquer le filtre de statut (réel/prévision)
    if (includeForecast && includeReal) {
      // Inclure tous les congés
    } else if (includeForecast && !includeReal) {
      filtered = filtered.filter(leave => leave.isForecast);
    } else if (!includeForecast && includeReal) {
      filtered = filtered.filter(leave => !leave.isForecast);
    } else {
      // Si aucune checkbox n'est cochée, ne rien afficher
      filtered = [];
    }

    // Appliquer le filtre de date
    const now = new Date();
    switch (dateFilter) {
      case 'last_week':
        const weekAgo = subDays(now, 7);
        filtered = filtered.filter(leave => new Date(leave.startDate) >= weekAgo);
        break;
      case 'last_month':
        const monthAgo = subDays(now, 30);
        filtered = filtered.filter(leave => new Date(leave.startDate) >= monthAgo);
        break;
      case 'current_month':
        filtered = filtered.filter(leave => {
          const leaveDate = new Date(leave.startDate);
          return leaveDate >= startOfMonth(now) && leaveDate <= endOfMonth(now);
        });
        break;
    }

    // Trier par date de modification (plus récent en premier)
    return filtered.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [leaves, currentYear, selectedTypes, dateFilter]);

  // Obtenir les congés sélectionnés
  const selectedLeaveEntries = useMemo(() => {
    return filteredLeaves.filter(leave => selectedLeaves.includes(leave.id));
  }, [filteredLeaves, selectedLeaves]);

  // Grouper les congés sélectionnés par date
  const leavesByDate = useMemo(() => {
    const grouped: { [key: string]: LeaveEntry[] } = {};
    
    selectedLeaveEntries.forEach(leave => {
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      
      // Créer une entrée pour chaque jour du congé
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        // Ignorer les week-ends
        if (date.getDay() !== 0 && date.getDay() !== 6) {
          const dateKey = format(date, 'yyyy-MM-dd');
          if (!grouped[dateKey]) {
            grouped[dateKey] = [];
          }
          grouped[dateKey].push(leave);
        }
      }
    });

    // Trier par date
    return Object.keys(grouped)
      .sort()
      .reduce((result, date) => {
        result[date] = grouped[date];
        return result;
      }, {} as { [key: string]: LeaveEntry[] });
  }, [selectedLeaveEntries]);

  const getLeaveTypeIcon = (type: string) => {
    switch (type) {
      case 'rtt': return '🔄';
      case 'cp': return '🏖️';
      case 'cet': return '🏥';
      default: return '📅';
    }
  };

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case 'rtt': return 'RTT';
      case 'cp': return 'CP';
      case 'cet': return 'CET';
      default: return type.toUpperCase();
    }
  };

  // Fonction pour vérifier si une date est un jour férié
  const isHoliday = (date: Date) => {
    const year = date.getFullYear();
    const holidays = [
      `${year}-01-01`, // Jour de l'An
      `${year}-05-01`, // Fête du Travail
      `${year}-05-08`, // Victoire 1945
      `${year}-07-14`, // Fête Nationale
      `${year}-08-15`, // Assomption
      `${year}-11-01`, // Toussaint
      `${year}-11-11`, // Armistice
      `${year}-12-25`  // Noël
    ];
    
    const dateStr = format(date, 'yyyy-MM-dd');
    return holidays.includes(dateStr);
  };

  // Fonction pour vérifier si une date est un jour ouvré (pas weekend ni férié)
  const isWorkingDay = (date: Date) => {
    return !isWeekend(date) && !isHoliday(date);
  };

  // Fonctions de gestion des sélections
  const toggleLeaveSelection = (leaveId: string) => {
    setSelectedLeaves(prev => 
      prev.includes(leaveId) 
        ? prev.filter(id => id !== leaveId)
        : [...prev, leaveId]
    );
  };

  const toggleTypeFilter = (type: 'rtt' | 'cp' | 'cet') => {
    setSelectedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  // Fonctions pour gérer les checkboxes de statut
  const handleForecastChange = (checked: boolean) => {
    setIncludeForecast(checked);
  };

  const handleRealChange = (checked: boolean) => {
    setIncludeReal(checked);
  };

  // Synchroniser les états pour éviter d'avoir les deux décochés
  useEffect(() => {
    if (!includeForecast && !includeReal) {
      setIncludeForecast(true); // Par défaut, cocher Prévision
    }
  }, [includeForecast, includeReal]);

  const selectAllVisible = () => {
    const visibleIds = filteredLeaves.map(leave => leave.id);
    setSelectedLeaves(visibleIds);
  };

  const clearSelection = () => {
    setSelectedLeaves([]);
  };

  // Templates prédéfinis
  const applyTemplate = (template: TemplateType) => {
    const now = new Date();
    let templateLeaves: LeaveEntry[] = [];

    switch (template) {
      case 'recent':
        setDateFilter('last_week');
        setSelectedTypes(['rtt', 'cp', 'cet']);
        setIncludeForecast(true);
        setIncludeReal(false);
        templateLeaves = filteredLeaves.slice(0, 5); // 5 plus récents
        break;
      case 'current_month':
        setDateFilter('current_month');
        setSelectedTypes(['rtt', 'cp', 'cet']);
        setIncludeForecast(true);
        setIncludeReal(false);
        templateLeaves = filteredLeaves;
        break;
      case 'last_week':
        setDateFilter('last_week');
        setSelectedTypes(['rtt', 'cp', 'cet']);
        setIncludeForecast(true);
        setIncludeReal(false);
        templateLeaves = filteredLeaves;
        break;
      case 'urgent_rtt':
        setDateFilter('all');
        setSelectedTypes(['rtt']);
        setIncludeForecast(true);
        setIncludeReal(false);
        // RTT du début d'année (urgent)
        templateLeaves = filteredLeaves.filter(leave => {
          const leaveDate = new Date(leave.startDate);
          return leaveDate.getMonth() <= 2; // Janvier, Février, Mars
        });
        break;
    }

    setSelectedLeaves(templateLeaves.map(leave => leave.id));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Créer le contenu de l'email
      const emailContent = generateEmailContent();
      
      // Simuler l'envoi d'email (à remplacer par une vraie implémentation)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Passer les congés en prévision à réel après l'envoi
      if (onLeaveUpdate) {
        selectedLeaveEntries.forEach(leave => {
          if (leave.isForecast) {
            const updatedLeave = { ...leave, isForecast: false };
            onLeaveUpdate(updatedLeave);
          }
        });
      }
      
      // Ici vous pourriez utiliser un service d'email comme EmailJS, SendGrid, etc.
      console.log('Email content:', emailContent);
      console.log('Congés en prévision passés en réel:', selectedLeaveEntries.filter(l => l.isForecast));
      
      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
        setSelectedLeaves([]);
        setIncludeForecast(true);
        setIncludeReal(false);
      }, 2000);
      
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      alert('Erreur lors de l\'envoi de l\'email');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateEmailContent = () => {
    let content = `Hi Carlo,\n\nPlease find my vacation report below:\n\n`;
    
    // Grouper par type de congé
    const leavesByType = selectedLeaveEntries.reduce((acc, leave) => {
      if (!acc[leave.type]) {
        acc[leave.type] = [];
      }
      acc[leave.type].push(leave);
      return acc;
    }, {} as Record<string, LeaveEntry[]>);

    // Trier les types : RTT, CP, CET
    const typeOrder = ['rtt', 'cp', 'cet'];
    
    typeOrder.forEach(type => {
      if (leavesByType[type] && leavesByType[type].length > 0) {
        const typeLabel = getLeaveTypeLabel(type);
        content += `${typeLabel}\n`;
        
        // Collecter toutes les dates pour ce type
        const allDates: string[] = [];
        
        leavesByType[type].forEach(leave => {
          const startDate = new Date(leave.startDate);
          const endDate = new Date(leave.endDate);
          
          // Si c'est une période d'un seul jour
          if (startDate.toDateString() === endDate.toDateString()) {
            if (isWorkingDay(startDate)) {
              const formattedDate = format(startDate, 'dd MMM yyyy', { locale: fr });
              allDates.push(formattedDate);
            }
          } else {
            // Si c'est une période multi-jours, afficher tous les jours ouvrés
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
              // Ignorer les week-ends et jours fériés
              if (isWorkingDay(currentDate)) {
                const formattedDate = format(currentDate, 'dd MMM yyyy', { locale: fr });
                allDates.push(formattedDate);
              }
              currentDate.setDate(currentDate.getDate() + 1);
            }
          }
        });
        
        // Trier les dates et les afficher
        const uniqueDates = [...new Set(allDates)].sort((a, b) => {
          const dateA = new Date(a);
          const dateB = new Date(b);
          return dateA.getTime() - dateB.getTime();
        });
        
        uniqueDates.forEach(date => {
          content += `• ${date}\n`;
        });
        
        content += `\n`;
      }
    });
    
    content += `Regards,\nDaniel`;
    
    return content;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Mail className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Envoyer le rapport de congés
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Fermer la fenêtre"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isSubmitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Email envoyé avec succès !
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Le rapport a été envoyé à dlepetit.maa@gmail.com
              </p>
            </div>
          ) : (
            <>
              {/* Interface principale */}
                <div className="space-y-4">
                  {/* Filtres */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white">Filtres</h4>
                      <div className="flex space-x-2">
                        <button
                          onClick={selectAllVisible}
                          className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                          title="Sélectionner tous les congés visibles"
                        >
                          Tout sélectionner
                        </button>
                        <button
                          onClick={clearSelection}
                          className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                          title="Effacer la sélection"
                        >
                          Effacer
                        </button>
                      </div>
                    </div>
                    
                    {/* Types de congés */}
                    <div className="flex space-x-4 mb-3">
                      {(['rtt', 'cp', 'cet'] as const).map(type => (
                        <label key={type} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={selectedTypes.includes(type)}
                            onChange={() => toggleTypeFilter(type)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {getLeaveTypeIcon(type)} {getLeaveTypeLabel(type)}
                          </span>
                        </label>
                      ))}
                    </div>

                    {/* Sélection du statut des congés */}
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Type de congés à inclure :
                      </label>
                      <div className="flex space-x-4">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={includeForecast}
                            onChange={(e) => handleForecastChange(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            🔄 Prévision
                          </span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={includeReal}
                            onChange={(e) => handleRealChange(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            🏖️ Réel
                          </span>
                        </label>
                      </div>
                      {includeForecast && (
                        <div className="mt-2 text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                          Les congés en prévision seront passés en réel après l'envoi
                        </div>
                      )}
                    </div>

                    {/* Filtre de période */}
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Période:</span>
                      <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        title="Sélectionner la période"
                      >
                        <option value="last_week">Dernière semaine</option>
                        <option value="last_month">Dernier mois</option>
                        <option value="current_month">Mois en cours</option>
                        <option value="all">Toutes les dates</option>
                      </select>
                    </div>
                  </div>

                  {/* Liste des congés */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredLeaves.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Aucun congé trouvé avec les filtres sélectionnés
                      </div>
                    ) : (
                      filteredLeaves.map(leave => (
                        <div
                          key={leave.id}
                          className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                            selectedLeaves.includes(leave.id)
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedLeaves.includes(leave.id)}
                              onChange={() => toggleLeaveSelection(leave.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              title={`Sélectionner le congé ${getLeaveTypeLabel(leave.type)} du ${format(new Date(leave.startDate), 'dd/MM/yyyy', { locale: fr })}`}
                            />
                            <div>
                              <div className="flex items-center space-x-2">
                                <span>{getLeaveTypeIcon(leave.type)}</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                  {format(new Date(leave.startDate), 'dd MMM yyyy', { locale: fr })}
                                  {leave.startDate !== leave.endDate && 
                                    ` - ${format(new Date(leave.endDate), 'dd MMM yyyy', { locale: fr })}`
                                  }
                                </span>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  leave.type === 'rtt' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                                  leave.type === 'cp' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                                  'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                }`}>
                                  {getLeaveTypeLabel(leave.type)}
                                </span>
                                {leave.isForecast && (
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">
                                    (P)
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {leave.workingDays} jour{leave.workingDays > 1 ? 's' : ''} • 
                                Modifié {(() => {
                                  const dateStr = leave.updatedAt || leave.createdAt;
                                  if (!dateStr) return 'Date inconnue';
                                  const date = new Date(dateStr);
                                  if (isNaN(date.getTime())) return 'Date invalide';
                                  return format(date, 'dd/MM à HH:mm', { locale: fr });
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              {/* Preview et résumé */}
              {selectedLeaves.length > 0 && (
                <div className="mt-6 space-y-4">
                  {/* Résumé */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                      Résumé des congés sélectionnés
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="font-medium text-blue-800 dark:text-blue-300">RTT:</span>
                        <span className="ml-2 text-blue-700 dark:text-blue-400">
                          {selectedLeaveEntries.filter(l => l.type === 'rtt').reduce((sum, l) => sum + l.workingDays, 0)} jours
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-blue-800 dark:text-blue-300">CP:</span>
                        <span className="ml-2 text-blue-700 dark:text-blue-400">
                          {selectedLeaveEntries.filter(l => l.type === 'cp').reduce((sum, l) => sum + l.workingDays, 0)} jours
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-blue-800 dark:text-blue-300">CET:</span>
                        <span className="ml-2 text-blue-700 dark:text-blue-400">
                          {selectedLeaveEntries.filter(l => l.type === 'cet').reduce((sum, l) => sum + l.workingDays, 0)} jours
                        </span>
                      </div>
                    </div>
                    {selectedLeaveEntries.some(leave => leave.isForecast) && (
                      <div className="text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded p-2">
                        📅 {selectedLeaveEntries.filter(l => l.isForecast).length} congé(s) en prévision seront passés en réel après l'envoi
                      </div>
                    )}
                  </div>

                  {/* Aperçu email */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Aperçu de l'email</h4>
                    <div className="font-mono text-sm">
                      <div className="text-gray-600 dark:text-gray-400 mb-2">
                        <strong>À:</strong> dlepetit.maa@gmail.com
                      </div>
                      <div className="text-gray-600 dark:text-gray-400 mb-4">
                        <strong>Objet:</strong> Rapport de congés {currentYear}
                      </div>
                      <div className="whitespace-pre-line text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-3 rounded border">
                        {generateEmailContent()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isSubmitted && (
          <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              {selectedLeaves.length > 0 ? (
                <>
                  <Check className="h-4 w-4 text-green-600" />
                  <span>{selectedLeaves.length} congé{selectedLeaves.length > 1 ? 's' : ''} sélectionné{selectedLeaves.length > 1 ? 's' : ''}</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  <span>Sélectionnez des congés pour l'email</span>
                </>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedLeaves.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                title={selectedLeaves.length === 0 ? "Sélectionnez des congés à envoyer" : "Envoyer le rapport par email"}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Envoi...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Envoyer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailReportModal;
