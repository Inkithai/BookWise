// src/components/subscription/FeatureFilterTabs.tsx
'use client';

import React from 'react';

export type FilterType = 'all' | 'active' | 'free';

interface Tab {
  key: FilterType;
  label: string;
}

const TABS: Tab[] = [
  { key: 'all',     label: 'All Features' },
  { key: 'active',  label: 'My Active Features' },
  { key: 'free',    label: 'Free Available' },
];

interface FeatureFilterTabsProps {
  activeFilter: FilterType;
  onChange: (filter: FilterType) => void;
}

const FeatureFilterTabs: React.FC<FeatureFilterTabsProps> = ({ activeFilter, onChange }) => {
  return (
    <div className="flex gap-2 flex-wrap mb-6">
      {TABS.map((tab) => {
        const isActive = activeFilter === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className="px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-150"
            style={{
              border: isActive ? '1.5px solid #0D9488' : '1.5px solid #E5E7EB',
              background: isActive ? '#0D9488' : '#fff',
              color: isActive ? '#fff' : '#6B7280',
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

export default FeatureFilterTabs;