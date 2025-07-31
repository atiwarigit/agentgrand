// @ts-ignore
import React, { useState, ReactNode } from 'react';

interface SectionCardProps {
  title: string;
  icon?: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  collapsible?: boolean;
}

export function SectionCard({ 
  title, 
  icon, 
  children, 
  defaultExpanded = true, 
  collapsible = true 
}: SectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
      <div 
        className={`p-4 border-b border-gray-200 ${collapsible ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={toggleExpanded}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon && <span className="text-xl">{icon}</span>}
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          {collapsible && (
            <span className="text-gray-500">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
        </div>
      </div>
      {isExpanded && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}