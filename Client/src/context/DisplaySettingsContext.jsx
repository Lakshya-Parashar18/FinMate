import React, { createContext, useContext, useState, useLayoutEffect } from 'react';

const DisplaySettingsContext = createContext();
const THEME_OPTIONS = new Set(['light', 'dark', 'system']);

const getSystemTheme = () => (
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
);

const getInitialDisplaySettings = () => {
  const defaults = {
    theme: 'dark',
    currency: 'INR',
    sidebarLayout: 'expanded',
    firstDayOfWeek: 'monday',
    numberFormat: 'indian',
    chartStyle: 'gradient',
    insightDensity: 'rich'
  };

  try {
    const savedSettings = JSON.parse(localStorage.getItem('displaySettings'));
    if (!savedSettings) return defaults;

    return {
      theme: THEME_OPTIONS.has(savedSettings.theme) ? savedSettings.theme : defaults.theme,
      currency: savedSettings.currency || defaults.currency,
      sidebarLayout: savedSettings.sidebarLayout || defaults.sidebarLayout,
      firstDayOfWeek: savedSettings.firstDayOfWeek || defaults.firstDayOfWeek,
      numberFormat: savedSettings.numberFormat || defaults.numberFormat,
      chartStyle: savedSettings.chartStyle || defaults.chartStyle,
      insightDensity: savedSettings.insightDensity || defaults.insightDensity
    };
  } catch {
    return defaults;
  }
};

export const DisplaySettingsProvider = ({ children }) => {
  const [displaySettings, setDisplaySettings] = useState(getInitialDisplaySettings);

  useLayoutEffect(() => {
    localStorage.setItem('displaySettings', JSON.stringify(displaySettings));

    const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      const resolvedTheme = displaySettings.theme === 'system'
        ? (systemThemeQuery.matches ? 'dark' : 'light')
        : displaySettings.theme;

      document.documentElement.setAttribute('data-theme', resolvedTheme);
      document.documentElement.style.colorScheme = resolvedTheme;
    };

    applyTheme();

    // Dynamically adjust sidebar width CSS variable
    const isCondensed = displaySettings.sidebarLayout === 'condensed';
    document.documentElement.style.setProperty('--sidebar-width', isCondensed ? '80px' : '260px');

    if (displaySettings.theme !== 'system') return undefined;

    systemThemeQuery.addEventListener('change', applyTheme);
    return () => systemThemeQuery.removeEventListener('change', applyTheme);
  }, [displaySettings]);

  const conversionRate = 0.012;

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
    if (displaySettings.currency === 'INR') {
      // numberFormat: 'indian' → en-IN (1,00,000), 'international' → en-US (100,000)
      const locale = displaySettings.numberFormat === 'international' ? 'en-US' : 'en-IN';
      return `₹${amount.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      const converted = amount * conversionRate;
      return `$${converted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  const formatCurrencyRaw = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 0;
    if (displaySettings.currency === 'INR') {
      return amount;
    } else {
      return amount * conversionRate;
    }
  };

  const updateDisplaySettings = (newSettings) => {
    setDisplaySettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  return (
    <DisplaySettingsContext.Provider value={{
      displaySettings,
      currency: displaySettings.currency,
      numberFormat: displaySettings.numberFormat,
      chartStyle: displaySettings.chartStyle,
      insightDensity: displaySettings.insightDensity,
      updateDisplaySettings,
      formatCurrency,
      formatCurrencyRaw
    }}>
      {children}
    </DisplaySettingsContext.Provider>
  );
};

export const useDisplaySettings = () => {
  const context = useContext(DisplaySettingsContext);
  if (!context) {
    throw new Error('useDisplaySettings must be used within a DisplaySettingsProvider');
  }
  return context;
}; 
