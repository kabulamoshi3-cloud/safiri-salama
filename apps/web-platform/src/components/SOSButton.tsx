/**
 * SOS Emergency Button Component
 * Triggers emergency alert with location sharing
 */

import React, { useState } from 'react';
import axios from 'axios';

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

  const handleSOSTrigger = async () => {
    try {
      setLoading(true);

      // Get current location
      const location = await getCurrentLocation();

      // Trigger SOS alert
      const response = await axios.post(
        `${process.env.REACT_APP_TRACKING_URL || 'http://localhost:3001'}/api/safety/sos`,
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
      alert('🚨 Emergency alert sent! Help is on the way. Your emergency contacts have been notified.');

    } catch (error: any) {
      console.error('Failed to trigger SOS:', error);
      alert('Failed to send emergency alert. Please call emergency services directly: 112');
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
            <p className="font-bold">Emergency Alert Active</p>
            <p className="text-sm">Help is on the way</p>
          </div>
        </div>
      </div>
    );
  }

  if (showConfirm) {
    return (
      <div className={`bg-white border-2 border-red-500 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-red-600">⚠️ Emergency SOS</h4>
          <button
            onClick={() => setShowConfirm(false)}
            className="text-gray-500 hover:text-gray-700"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-gray-700 mb-4">
          This will immediately alert:
        </p>

        <ul className="text-sm text-gray-700 mb-4 space-y-1">
          <li>• Your emergency contacts</li>
          <li>• DalaSmart support team</li>
          <li>• Share your live location</li>
        </ul>

        <p className="text-xs text-gray-600 mb-4">
          For life-threatening emergencies, call 112 immediately.
        </p>

        <div className="flex space-x-2">
          <button
            onClick={handleSOSTrigger}
            disabled={loading}
            className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Sending Alert...' : '🚨 Confirm Emergency'}
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            disabled={loading}
            className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
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
        <span>SOS Emergency</span>
      </span>
    </button>
  );
};

export default SOSButton;
