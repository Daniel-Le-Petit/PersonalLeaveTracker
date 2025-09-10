'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Save, Trash2, Edit3 } from 'lucide-react';

interface LeaveFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (leave: any) => void;
  onDelete?: (id: string) => void;
  leave?: any;
  selectedDate?: Date;
}

const LeaveFormModal: React.FC<LeaveFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  leave,
  selectedDate
}) => {
  const [formData, setFormData] = useState({
    type: 'cp',
    startDate: '',
    endDate: '',
    workingDays: 1,
    isForecast: false,
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (leave) {
      setFormData({
        type: leave.type || 'cp',
        startDate: leave.startDate || '',
        endDate: leave.endDate || '',
        workingDays: leave.workingDays || 1,
        isForecast: leave.isForecast || false,
        description: leave.description || ''
      });
    } else if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setFormData(prev => ({
        ...prev,
        startDate: dateStr,
        endDate: dateStr
      }));
    }
  }, [leave, selectedDate]);

  const leaveTypes = [
    { value: 'rtt', label: 'RTT', color: 'bg-red-500', description: 'Récupération du Temps de Travail' },
    { value: 'cp', label: 'CP', color: 'bg-blue-500', description: 'Congés Payés' },
    { value: 'cet', label: 'CET', color: 'bg-green-500', description: 'Compte Epargne Temps' }
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.startDate) {
      newErrors.startDate = 'Date de début requise';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'Date de fin requise';
    }
    if (formData.startDate && formData.endDate && new Date(formData.startDate) > new Date(formData.endDate)) {
      newErrors.endDate = 'La date de fin doit être après la date de début';
    }
    if (formData.workingDays < 1) {
      newErrors.workingDays = 'Au moins 1 jour requis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const leaveData = {
      ...formData,
      id: leave?.id || Date.now().toString(),
      workingDays: Number(formData.workingDays)
    };

    onSave(leaveData);
    onClose();
  };

  const handleDelete = () => {
    if (leave?.id && onDelete) {
      onDelete(leave.id);
      onClose();
    }
  };

  const calculateWorkingDays = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      let days = 0;
      let current = new Date(start);

      while (current <= end) {
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclure week-ends
          days++;
        }
        current.setDate(current.getDate() + 1);
      }

      setFormData(prev => ({ ...prev, workingDays: days }));
    }
  };

  useEffect(() => {
    calculateWorkingDays();
  }, [formData.startDate, formData.endDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            {leave ? (
              <>
                <Edit3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Modifier le congé
                </h3>
              </>
            ) : (
              <>
                <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Nouveau congé
                </h3>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type de congé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type de congé
            </label>
            <div className="grid grid-cols-3 gap-2">
              {leaveTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.type === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-full ${type.color} mx-auto mb-1`} />
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {type.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date de début
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.startDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.startDate && (
                <p className="text-red-500 text-xs mt-1">{errors.startDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.endDate ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              {errors.endDate && (
                <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Jours ouvrés */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Jours ouvrés
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                value={formData.workingDays}
                onChange={(e) => setFormData(prev => ({ ...prev, workingDays: Number(e.target.value) }))}
                className={`flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                  errors.workingDays ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              />
              <button
                type="button"
                onClick={calculateWorkingDays}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="Recalculer automatiquement"
              >
                <Clock className="h-4 w-4" />
              </button>
            </div>
            {errors.workingDays && (
              <p className="text-red-500 text-xs mt-1">{errors.workingDays}</p>
            )}
          </div>

          {/* Type de saisie */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isForecast}
                onChange={(e) => setFormData(prev => ({ ...prev, isForecast: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Prévision (pas encore pris)
              </span>
            </label>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description (optionnel)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Ex: Vacances d'été, Récupération..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              {leave && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex items-center space-x-2 px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Supprimer</span>
                </button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="h-4 w-4" />
                <span>{leave ? 'Modifier' : 'Créer'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveFormModal;
