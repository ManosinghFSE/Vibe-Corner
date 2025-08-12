import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

const presets = [
  { key: 'fantasy', label: 'Fantasy' },
  { key: 'scifi', label: 'Sci‑Fi' },
  { key: 'horror', label: 'Horror' },
  { key: 'romance', label: 'Romance' },
  { key: 'adventure', label: 'Adventure' },
  { key: 'mystery', label: 'Mystery' },
] as const;

type PresetKey = typeof presets[number]['key'];

export function ThemeSelector() {
  const { currentTheme, switchTheme } = useTheme();
  return (
    <div className="theme-selector d-flex gap-2 flex-wrap">
      {presets.map(p => (
        <button
          key={p.key}
          className={`btn btn-sm ${currentTheme === p.key ? 'btn-primary' : 'btn-outline-primary'}`}
          onClick={() => switchTheme(p.key as PresetKey)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
} 