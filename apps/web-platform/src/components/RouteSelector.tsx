/**
 * Route Selector Component
 * Shows multiple route options with traffic, cost, time, and distance comparison
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { i18n } from '../i18n';

interface Location {
  latitude: number;
  longitude: number;
}

interface RouteOption {
  type: 'fastest' | 'shortest' | 'cheapest' | 'alternative';
  distance: number;
  duration: number;
  durationInTraffic?: number;
  cost: number;
  polyline: string;
  trafficCondition: 'light' | 'moderate' | 'heavy';
  warnings?: string[];
}

interface RouteSelectorProps {
  origin: Location;
  destination: Location;
  vehicleType: 'car' | 'bajaji' | 'boda-boda';
  onRouteSelect: (route: RouteOption) => void;
}

const RouteSelector: React.FC<RouteSelectorProps> = ({
  origin,
  destination,
  vehicleType,
  onRouteSelect
}) => {
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    return i18n.subscribe(() => forceUpdate());
  }, []);

  useEffect(() => {
    fetchRoutes();
  }, [origin, destination, vehicleType]);

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await axios.post(
        `${import.meta.env.VITE_TRACKING_URL || 'http://localhost:3001'}/api/routes/calculate`,
        {
          origin,
          destination,
          vehicleType,
          alternatives: true
        }
      );

      setRoutes(response.data.routes);
      setSelectedRoute(response.data.routes[0]); // Auto-select first route

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to calculate routes');
      console.error('Route calculation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRouteSelect = (route: RouteOption) => {
    setSelectedRoute(route);
    onRouteSelect(route);
  };

  const formatDistance = (meters: number): string => {
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatCost = (amount: number): string => {
    return `TZS ${amount.toLocaleString()}`;
  };

  const getTrafficColor = (condition: string): string => {
    switch (condition) {
      case 'light': return 'text-green-600 bg-green-50';
      case 'moderate': return 'text-yellow-600 bg-yellow-50';
      case 'heavy': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRouteLabel = (type: string): { labelKey: string; icon: string; color: string } => {
    switch (type) {
      case 'fastest':
        return { labelKey: 'route.fastest', icon: '⚡', color: 'bg-blue-500' };
      case 'shortest':
        return { labelKey: 'route.shortest', icon: '📏', color: 'bg-green-500' };
      case 'cheapest':
        return { labelKey: 'route.cheapest', icon: '💰', color: 'bg-purple-500' };
      default:
        return { labelKey: 'route.alternative', icon: '🔀', color: 'bg-gray-500' };
    }
  };

  const getTrafficLabel = (condition: string): string => {
    switch (condition) {
      case 'light': return i18n.t('route.light_traffic');
      case 'moderate': return i18n.t('route.moderate_traffic');
      case 'heavy': return i18n.t('route.heavy_traffic');
      default: return condition;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">{i18n.t('route.calculating')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchRoutes}
          className="mt-2 text-sm text-red-700 underline hover:text-red-800"
        >
          {i18n.t('route.try_again')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{i18n.t('route.choose_your_route')}</h3>
        <span className="text-sm text-gray-600">{routes.length} {i18n.t('route.options_available')}</span>
      </div>

      <div className="space-y-3">
        {routes.map((route, index) => {
          const routeInfo = getRouteLabel(route.type);
          const isSelected = selectedRoute === route;

          return (
            <button
              key={index}
              onClick={() => handleRouteSelect(route)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {/* Route Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-white text-xs font-medium ${routeInfo.color}`}>
                    {routeInfo.icon} {i18n.t(routeInfo.labelKey)}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTrafficColor(route.trafficCondition)}`}>
                    {getTrafficLabel(route.trafficCondition)}
                  </span>
                </div>
                {isSelected && (
                  <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>

              {/* Route Details */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-500">{i18n.t('common.time')}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDuration(route.durationInTraffic || route.duration)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{i18n.t('distance')}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDistance(route.distance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{i18n.t('route.cost')}</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCost(route.cost)}
                  </p>
                </div>
              </div>

              {/* Traffic Delay Warning */}
              {route.durationInTraffic && route.durationInTraffic > route.duration * 1.2 && (
                <div className="mt-3 flex items-center text-sm text-orange-600">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  +{formatDuration(route.durationInTraffic - route.duration)} {i18n.t('route.delay_due_traffic')}
                </div>
              )}

              {/* Warnings */}
              {route.warnings && route.warnings.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  ⚠️ {route.warnings[0]}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary */}
      {selectedRoute && (
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{i18n.t('route.selected')}</span> {i18n.t(getRouteLabel(selectedRoute.type).labelKey)} {i18n.t('route.route_word')}
            - {formatDuration(selectedRoute.durationInTraffic || selectedRoute.duration)} {i18n.t('route.trip_word')}
            {i18n.t('route.for_word')} {formatCost(selectedRoute.cost)}
          </p>
        </div>
      )}
    </div>
  );
};

export default RouteSelector;
