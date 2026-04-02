'use client';

import React, { useState } from 'react';
import clsx from 'clsx';

interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  onChange?: (tabId: string) => void;
  variant?: 'line' | 'pill';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTabId,
  onChange,
  variant = 'line',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTabId || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeTabItem = tabs.find((t) => t.id === activeTab);

  return (
    <div className="w-full">
      <div
        className={clsx(
          'flex border-b border-gray-200',
          variant === 'pill' && 'border-0 gap-2 mb-6'
        )}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            disabled={tab.disabled}
            className={clsx(
              'px-4 py-3 font-medium transition-all duration-300 flex items-center gap-2 whitespace-nowrap',
              variant === 'line' &&
                activeTab === tab.id &&
                'text-primary-600 border-b-2 border-primary-600',
              variant === 'line' &&
                activeTab !== tab.id &&
                'text-gray-600 hover:text-gray-900',
              variant === 'pill' &&
                activeTab === tab.id &&
                'bg-primary-600 text-white rounded-lg',
              variant === 'pill' &&
                activeTab !== tab.id &&
                'bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg',
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-6">{activeTabItem?.content}</div>
    </div>
  );
};
