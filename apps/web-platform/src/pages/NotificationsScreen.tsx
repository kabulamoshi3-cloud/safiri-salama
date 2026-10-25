/**
 * Screen 10: Notifications
 * Notification cards with colored left borders
 */
import React, { useEffect } from 'react';
import { Bell, CheckCircle, Car, Gift, Info, AlertTriangle } from 'lucide-react';
import { i18n } from '../i18n';

interface Notification {
  id: string;
  type: 'success' | 'info' | 'promotion' | 'warning';
  title: string;
  message: string;
  time: string;
}

const NotificationsScreen: React.FC = () => {
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  useEffect(() => {
    return i18n.subscribe(() => forceUpdate());
  }, []);

  // TODO: Fetch from API
  const notifications: Notification[] = [
    {
      id: '1',
      type: 'success',
      title: 'Ride completed',
      message: 'Your trip to 10th Street is complete. Fare: TZS 6,000',
      time: '10:34 AM',
    },
    {
      id: '2',
      type: 'info',
      title: 'Driver on the way',
      message: 'David M. is on the way to your location',
      time: '10:18 AM',
    },
    {
      id: '3',
      type: 'promotion',
      title: 'Promotion',
      message: 'Get 30% off your next ride! Use code SIMNOVA20',
      time: 'Yesterday',
    },
    {
      id: '4',
      type: 'info',
      title: 'System update',
      message: 'New features and improvements for a better experience',
      time: '2 days ago',
    },
    {
      id: '5',
      type: 'warning',
      title: 'Safety reminder',
      message: 'Always share your trip with family for added security',
      time: '3 days ago',
    },
  ];

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-[#128901]" />;
      case 'info':
        return <Info size={20} className="text-[#2563EB]" />;
      case 'promotion':
        return <Gift size={20} className="text-[#7C3AED]" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-red-500" />;
      default:
        return <Bell size={20} className="text-gray-500" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-[#128901]';
      case 'info':
        return 'border-l-[#2563EB]';
      case 'promotion':
        return 'border-l-[#7C3AED]';
      case 'warning':
        return 'border-l-red-500';
      default:
        return 'border-l-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F5F9] pb-20">
      {/* Header */}
      <div className="bg-white px-6 py-8 shadow-sm">
        <h1 className="text-[#0F172A] font-black text-3xl">Notifications</h1>
      </div>

      {/* Notifications List */}
      <div className="px-6 py-6 space-y-3">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`bg-white rounded-xl shadow-sm border-l-4 ${getBorderColor(
              notif.type
            )} p-4 hover:shadow-md transition cursor-pointer`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1">{getIcon(notif.type)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-[#0F172A] font-bold text-sm mb-1">{notif.title}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{notif.message}</p>
                <p className="text-gray-400 text-xs mt-2">{notif.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationsScreen;
