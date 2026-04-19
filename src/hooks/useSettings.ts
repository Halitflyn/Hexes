import { useState, useEffect } from 'react';

export const useSettings = () => {
  const [thicknessMultiplier, setThicknessMultiplier] = useState(() => {
    return Number(localStorage.getItem('hex_thickness_multiplier')) || 1.0;
  });

  useEffect(() => {
    const handleStorage = () => {
      setThicknessMultiplier(Number(localStorage.getItem('hex_thickness_multiplier')) || 1.0);
    };
    window.addEventListener('hex_settings_changed', handleStorage);
    return () => window.removeEventListener('hex_settings_changed', handleStorage);
  }, []);

  const updateThickness = (val: number) => {
    setThicknessMultiplier(val);
    localStorage.setItem('hex_thickness_multiplier', String(val));
    window.dispatchEvent(new Event('hex_settings_changed'));
  };

  return { thicknessMultiplier, updateThickness };
};
