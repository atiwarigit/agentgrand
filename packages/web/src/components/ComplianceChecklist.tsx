// @ts-ignore
import React from 'react';
import { ComplianceItem } from '../types/grantProposalDataSchema.js';

interface ComplianceChecklistProps {
  items: ComplianceItem[];
  onUpdateStatus: (itemId: string, status: ComplianceItem['status']) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
}

export function ComplianceChecklist({ items, onUpdateStatus, onUpdateNotes }: ComplianceChecklistProps) {
  const getStatusColor = (status: ComplianceItem['status']) => {
    switch (status) {
      case 'ok':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'needs-attention':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const getStatusIcon = (status: ComplianceItem['status']) => {
    switch (status) {
      case 'ok':
        return '✓';
      case 'needs-attention':
        return '⚠';
      default:
        return '○';
    }
  };

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className={`px-2 py-1 rounded text-sm font-medium border ${getStatusColor(item.status)}`}>
              <span className="inline-block w-4 text-center">
                {getStatusIcon(item.status)}
              </span>
            </div>
            
            <div className="flex-1">
              <div className="font-medium text-gray-900 mb-2">
                {item.requirement}
              </div>
              
              <div className="flex items-center space-x-4 mb-3">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <select
                  value={item.status}
                  onChange={(e) => onUpdateStatus(item.id, e.target.value as ComplianceItem['status'])}
                  className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="pending">Pending Review</option>
                  <option value="ok">OK</option>
                  <option value="needs-attention">Needs Attention</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution Notes:
                </label>
                <textarea
                  value={item.notes || ''}
                  onChange={(e) => onUpdateNotes(item.id, e.target.value)}
                  placeholder="Add notes about how this requirement is being addressed..."
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 h-20 resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}