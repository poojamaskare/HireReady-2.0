import React from 'react';
import { HeroSection } from '../components/HeroSection';

interface LandingPageProps {
  onGetStarted?: () => void;
  onLoginClick?: () => void;
}

export default function LandingPage({ onGetStarted, onLoginClick }: LandingPageProps) {
  const handleBeginJourney = () => {
    // Navigate to login or dashboard
    if (onLoginClick) {
      onLoginClick();
    } else if (onGetStarted) {
      onGetStarted();
    }
  };

  return (
    <div>
      <HeroSection onBeginJourney={handleBeginJourney} />
      {/* Add additional sections below if needed */}
    </div>
  );
}
