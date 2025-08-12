import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type ThemeName = 'fantasy' | 'scifi' | 'horror' | 'romance' | 'adventure' | 'mystery' | 'custom';

type ThemeContextValue = {
  currentTheme: ThemeName;
  switchTheme: (name: ThemeName) => void;
  customTheme: any;
  setCustomTheme: (t: any) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('fantasy');
  const [customTheme, setCustomTheme] = useState<any>(null);

  const switchTheme = (name: ThemeName) => {
    setCurrentTheme(name);
  };

  useEffect(() => {
    document.body.dataset.theme = currentTheme;
  }, [currentTheme]);

  const value = useMemo(() => ({ currentTheme, switchTheme, customTheme, setCustomTheme }), [currentTheme, customTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
} 