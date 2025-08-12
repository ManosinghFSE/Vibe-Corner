import React, { useMemo } from 'react';
import Particles from 'react-particles';
import { useTheme } from '../../contexts/ThemeContext';

export function ParticlesBackground() {
  const { currentTheme } = useTheme();

  const options = useMemo(() => {
    switch (currentTheme) {
      case 'fantasy':
        return {
          background: { color: { value: 'transparent' } },
          particles: {
            number: { value: 40 },
            color: { value: ['#a78bfa', '#60a5fa', '#34d399'] },
            size: { value: { min: 1, max: 3 } },
            move: { enable: true, speed: 0.6 },
            links: { enable: false },
            opacity: { value: 0.6 },
          }
        } as any;
      case 'scifi':
        return {
          background: { color: { value: 'transparent' } },
          particles: {
            number: { value: 60 },
            color: { value: ['#22d3ee', '#06b6d4'] },
            size: { value: { min: 1, max: 2 } },
            move: { enable: true, speed: 1.2 },
            links: { enable: true, color: '#22d3ee', opacity: 0.4 },
            opacity: { value: 0.7 },
          }
        } as any;
      case 'horror':
        return {
          background: { color: { value: 'transparent' } },
          particles: {
            number: { value: 25 },
            color: { value: ['#111827', '#ef4444'] },
            size: { value: { min: 1, max: 4 } },
            move: { enable: true, speed: 0.3 },
            links: { enable: false },
            opacity: { value: 0.5 },
          }
        } as any;
      case 'romance':
        return {
          background: { color: { value: 'transparent' } },
          particles: {
            number: { value: 35 },
            color: { value: ['#f472b6', '#fb7185'] },
            size: { value: { min: 1, max: 3 } },
            move: { enable: true, speed: 0.5 },
            links: { enable: false },
            opacity: { value: 0.6 },
          }
        } as any;
      case 'adventure':
        return {
          background: { color: { value: 'transparent' } },
          particles: {
            number: { value: 30 },
            color: { value: ['#10b981', '#f59e0b'] },
            size: { value: { min: 1, max: 3 } },
            move: { enable: true, speed: 0.8 },
            links: { enable: false },
            opacity: { value: 0.6 },
          }
        } as any;
      case 'mystery':
      default:
        return {
          background: { color: { value: 'transparent' } },
          particles: {
            number: { value: 28 },
            color: { value: ['#64748b', '#94a3b8'] },
            size: { value: { min: 1, max: 2 } },
            move: { enable: true, speed: 0.5 },
            links: { enable: false },
            opacity: { value: 0.5 },
          }
        } as any;
    }
  }, [currentTheme]);

  return (
    <Particles id="story-particles" options={options} />
  );
} 