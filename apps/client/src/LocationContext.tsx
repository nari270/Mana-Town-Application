import { createContext, useContext, useState, type ReactNode } from 'react';

type LocationContextValue = {
  detectedLocality: string;
  selectedLocality: string;
  locality: string;
  setDetectedLocality: (locality: string) => void;
  setSelectedLocality: (locality: string) => void;
};

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [detectedLocality, setDetectedLocality] = useState('');
  const [selectedLocality, setSelectedLocality] = useState('');

  return (
    <LocationContext.Provider
      value={{
        detectedLocality,
        selectedLocality,
        locality: selectedLocality || detectedLocality,
        setDetectedLocality,
        setSelectedLocality,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within LocationProvider');
  }
  return context;
}
