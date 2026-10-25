/**
 * Trip Sharing Component
 * Share live trip with friends/family for safety
 */

import React, { useState } from 'react';
import axios from 'axios';
import { i18n } from '../i18n';

interface Location {
  latitude: number;
  longitude: number;
}

interface TripSharingProps {
  tripId: string;
  passengerId: string;
  driverId: string;
  driverName: string;
  vehicleInfo: string;
  pickupLocation: Location;
  dropoffLocation: Location;
}

const TripSharing: React.FC<TripSharingProps> = ({
  tripId,
  passengerId,
  driverId,
  driverName,
  vehicleInfo,
  pickupLocation,
  dropoffLocation
}) => {
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    return i18n.subscribe(() => forceUpdate());
  }, []);

  const generateShareLink = async () => {
    try {
      setLoading(true);

      const response = await axios.post(
        `${import.meta.env.VITE_TRACKING_URL || 'http://localhost:3001'}/api/safety/trip-share`,
        {
          tripId,
          passengerId,
          driverId,
          driverName,
          vehicleInfo,
          pickupLocation,
          dropoffLocation,
          sharedWith: []
        }
      );

      setShareLink(response.data.shareLink);

    } catch (error) {
      console.error('Failed to generate share link:', error);
      alert(i18n.t('share.link_failed'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const shareViaWhatsApp = () => {
    if (!shareLink) return;

    const message = encodeURIComponent(
      `${i18n.t('share.whatsapp_prefix')}\n${shareLink}\n\n${i18n.t('share.driver_label')}: ${driverName}\n${i18n.t('share.vehicle_label')}: ${vehicleInfo}`
    );

    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareViaSMS = () => {
    if (!shareLink) return;

    const message = encodeURIComponent(
      `${i18n.t('share.sms_prefix')} ${shareLink}`
    );

    window.location.href = `sms:?body=${message}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">🔗 {i18n.t('share_trip')}</h4>
        <span className="text-xs text-gray-500">{i18n.t('share.for_safety')}</span>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        {i18n.t('share.desc')}
      </p>

      {!shareLink ? (
        <button
          onClick={generateShareLink}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? i18n.t('share.generating') : i18n.t('share.generate')}
        </button>
      ) : (
        <div className="space-y-3">
          {/* Share Link Display */}
          <div className="flex items-center space-x-2 bg-gray-50 p-3 rounded-lg">
            <input
              type="text"
              value={shareLink}
              readOnly
              className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
            />
            <button
              onClick={copyToClipboard}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {copied ? i18n.t('share.copied') : i18n.t('share.copy')}
            </button>
          </div>

          {/* Quick Share Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={shareViaWhatsApp}
              className="flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
            >
              <span>💬</span>
              <span>{i18n.t('whatsapp')}</span>
            </button>

            <button
              onClick={shareViaSMS}
              className="flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              <span>📱</span>
              <span>{i18n.t('share.sms')}</span>
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            {i18n.t('share.expires')}
          </p>
        </div>
      )}
    </div>
  );
};

export default TripSharing;
