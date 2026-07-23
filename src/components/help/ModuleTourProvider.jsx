import React, { createContext, useContext, useMemo } from "react";
import { useModuleTour } from "@/hooks/useModuleTour";
import ModuleTourOverlay from "@/components/help/ModuleTourOverlay";

const ModuleTourContext = createContext(null);

export function ModuleTourProvider({ children }) {
  const tour = useModuleTour();

  const value = useMemo(
    () => ({ openTour: tour.openTour }),
    [tour.openTour],
  );

  return (
    <ModuleTourContext.Provider value={value}>
      {children}
      <ModuleTourOverlay
        open={tour.open}
        module={tour.module}
        stepIndex={tour.stepIndex}
        onStepChange={tour.setStepIndex}
        onDismiss={tour.dismiss}
      />
    </ModuleTourContext.Provider>
  );
}

export function useModuleTourActions() {
  const ctx = useContext(ModuleTourContext);
  return ctx || { openTour: () => {} };
}
