/**
 * Trip Sharing Component
 * Share live trip with friends/family for safety
 */

import React, { useState } from 'react';
import axios from 'axios';

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

  const generateShareLink = async () => {
    try {
      setLoading(true);

      const response = await axios.post(
        `${process.env.REACT_APP_TRACKING_URL || 'http://localhost:3001'}/api/safety/trip-share`,
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
      alert('Failed to generate share link. Please try again.');
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
      `🚗 I'm on a DalaSmart trip. Track my journey live:\n${shareLink}\n\nDriver: ${driverName}\nVehicle: ${vehicleInfo}`
    );

    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const shareViaSMS = () => {
    if (!shareLink) return;

    const message = encodeURIComponent(
      `I'm on a DalaSmart trip. Track me: ${shareLink}`
    );

    window.location.href = `sms:?body=${message}`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">🔗 Share Trip</h4>
        <span className="text-xs text-gray-500">For your safety</span>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Share your live trip with friends or family so they can track your journey in real-time.
      </p>

      {!shareLink ? (
        <button
          onClick={generateShareLink}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating Link...' : 'Generate Share Link'}
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
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>

          {/* Quick Share Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={shareViaWhatsApp}
              className="flex items-center justify-center space-x-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </button>

            <button
              onClick={shareViaSMS}
              className="flex items-center justify-center space-x-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              <span>📱</span>
              <span>SMS</span>
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            Link expires in 24 hours or when trip ends
          </p>
        </div>
      )}
    </div>
  );
};

export default TripSharing;
