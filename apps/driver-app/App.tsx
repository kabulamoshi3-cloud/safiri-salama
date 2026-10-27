import React, { useEffect } from 'react';
import AppRoot from './src/App';

export default function App() {
  useEffect(() => {
    // Lazy import to prevent startup crash if native module not available
    import('./src/services/BackgroundLocation').catch((err) =>
      console.warn('BackgroundLocation init failed:', err)
    );
  }, []);

  return <AppRoot />;
}
