/**
 * SOS Emergency Button Component
 * Triggers emergency alert with location sharing
 */

import React, { useState } from 'react';
import axios from 'axios';
import { i18n } from '../i18n';

interface Location {
  latitude: number;
  longitude: number;
}

interface SOSButtonProps {
  tripId: string;
  userId: string;
  userType: 'passenger' | 'driver';
  getCurrentLocation: () => Promise<Location>;
  className?: string;
}

const SOSButton: React.FC<SOSButtonProps> = ({
  tripId,
  userId,
  userType,
  getCurrentLocation,
  className = ''
}) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertTriggered, setAlertTriggered] = useState(false);

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    return i18n.subscribe(() => forceUpdate());
  }, []);

  const handleSOSTrigger = async () => {
    try {
      setLoading(true);

      // Get current location
      const location = await getCurrentLocation();

      // Trigger SOS alert
      const response = await axios.post(
        `${import.meta.env.VITE_TRACKING_URL || 'http://localhost:3001'}/api/safety/sos`,
        {
          tripId,
          userId,
          userType,
          location
        }
      );

      setAlertTriggered(true);
      setShowConfirm(false);

      // Show success message
      alert(i18n.t('sos.alert_sent'));

    } catch (error: any) {
      console.error('Failed to trigger SOS:', error);
      alert(i18n.t('sos.alert_failed'));
    } finally {
      setLoading(false);
    }
  };

  if (alertTriggered) {
    return (
      <div className={`bg-red-500 text-white rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
          <div>
            <p className="font-bold">{i18n.t('sos.alert_active')}</p>
            <p className="text-sm">{i18n.t('sos.help_on_way')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (showConfirm) {
    return (
      <div className={`bg-white border-2 border-red-500 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-red-600">⚠️ {i18n.t('emergency_sos')}</h4>
          <button
            onClick={() => setShowConfirm(false)}
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-700 mb-4">
          {i18n.t('sos.alert_notify')}
        </p>

        <ul className="text-sm text-gray-700 mb-4 space-y-1">
          <li>{i18n.t('sos.notify_contacts')}</li>
          <li>{i18n.t('sos.notify_support')}</li>
          <li>{i18n.t('sos.notify_location')}</li>
        </ul>

        <p className="text-xs text-gray-600 mb-4">
          {i18n.t('sos.life_threatening')}
        </p>

        <div className="flex space-x-2">
          <button
            onClick={handleSOSTrigger}
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? i18n.t('sos.sending') : `🚨 ${i18n.t('sos.confirm_emergency')}`}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={loading}
            className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {i18n.t('cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      className={`bg-red-600 text-white py-3 px-6 rounded-lg font-bold hover:bg-red-700 transition-all shadow-lg hover:shadow-xl ${className}`}
    >
      <span className="flex items-center space-x-2">
        <span>🚨</span>
        <span>{i18n.t('sos.emergency_btn')}</span>
      </span>
    </button>
  );
};

export default SOSButton;
