import React, { createContext, useContext, useState, useEffect } from 'react';

const DisplaySettingsContext = createContext();

export const DisplaySettingsProvider = ({ children }) => {
  const [displaySettings, setDisplaySettings] = useState(() => {
    const savedSettings = localStorage.getItem('displaySettings');
    return savedSettings ? JSON.parse(savedSettings) : {
      theme: 'light',
      currency: 'INR'
    };
  });

  useEffect(() => {
    localStorage.setItem('displaySettings', JSON.stringify(displaySettings));
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', displaySettings.theme);
  }, [displaySettings]);

  const updateDisplaySettings = (newSettings) => {
    setDisplaySettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  return (
    <DisplaySettingsContext.Provider value={{ displaySettings, updateDisplaySettings }}>
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