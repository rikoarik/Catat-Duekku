import React, { createContext, useContext, useEffect, useState } from 'react';

import { AppTourOverlay, TargetRect } from '../components/app-tour-overlay';
import { useLanguage } from '@/core/i18n/language-context';
import { isAppTourCompleted, setAppTourCompleted } from '@/core/lib/tour-storage';

export interface TourStepDef {
  id: string;
  targetId: string;
  titleKey: string;
  descKey: string;
}

export const TOUR_STEPS: TourStepDef[] = [
  { id: '1', targetId: 'tour-total-balance', titleKey: 'tour.step1Title', descKey: 'tour.step1Desc' },
  { id: '2', targetId: 'tour-wallets-list', titleKey: 'tour.step2Title', descKey: 'tour.step2Desc' },
  { id: '3', targetId: 'tour-transaction-filter', titleKey: 'tour.step3Title', descKey: 'tour.step3Desc' },
  { id: '4', targetId: 'tour-add-transaction-btn', titleKey: 'tour.step4Title', descKey: 'tour.step4Desc' },
  { id: '5', targetId: 'tour-scan-receipt-btn', titleKey: 'tour.step5Title', descKey: 'tour.step5Desc' },
  { id: '6', targetId: 'tour-budget-limits', titleKey: 'tour.step6Title', descKey: 'tour.step6Desc' },
  { id: '7', targetId: 'tour-analytics-chart', titleKey: 'tour.step7Title', descKey: 'tour.step7Desc' },
  { id: '8', targetId: 'tour-notifications-btn', titleKey: 'tour.step8Title', descKey: 'tour.step8Desc' },
  { id: '9', targetId: 'tour-security-settings', titleKey: 'tour.step9Title', descKey: 'tour.step9Desc' },
  { id: '10', targetId: 'tour-theme-language', titleKey: 'tour.step10Title', descKey: 'tour.step10Desc' },
];

interface TourContextType {
  isTourActive: boolean;
  currentStepIndex: number;
  startTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  registerTargetLayout: (targetId: string, layout: TargetRect) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetLayouts, setTargetLayouts] = useState<Record<string, TargetRect>>({});

  useEffect(() => {
    async function checkAutoStart() {
      const completed = await isAppTourCompleted();
      if (!completed) {
        // Small delay to allow UI components to lay out
        setTimeout(() => {
          setIsTourActive(true);
          setCurrentStepIndex(0);
        }, 1200);
      }
    }
    checkAutoStart();
  }, []);

  const registerTargetLayout = (targetId: string, layout: TargetRect) => {
    setTargetLayouts((prev) => ({
      ...prev,
      [targetId]: layout,
    }));
  };

  const startTour = () => {
    setCurrentStepIndex(0);
    setIsTourActive(true);
  };

  const nextStep = async () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      await finishTour();
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const skipTour = async () => {
    await finishTour();
  };

  const finishTour = async () => {
    setIsTourActive(false);
    await setAppTourCompleted(true);
  };

  const currentStepDef = TOUR_STEPS[currentStepIndex];
  const activeTargetRect = currentStepDef ? targetLayouts[currentStepDef.targetId] : null;

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        currentStepIndex,
        startTour,
        nextStep,
        prevStep,
        skipTour,
        registerTargetLayout,
      }}
    >
      {children}
      <AppTourOverlay
        currentStep={currentStepIndex}
        description={currentStepDef ? t(currentStepDef.descKey as any) : ''}
        targetRect={activeTargetRect}
        title={currentStepDef ? t(currentStepDef.titleKey as any) : ''}
        totalSteps={TOUR_STEPS.length}
        visible={isTourActive}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
      />
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
