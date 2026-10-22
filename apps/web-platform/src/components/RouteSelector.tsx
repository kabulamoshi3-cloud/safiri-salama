/**
 * Route Selector Component
 * Shows multiple route options with traffic, cost, time, and distance comparison
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';

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

  const getRouteLabel = (type: string): { label: string; icon: string; color: string } => {
    switch (type) {
      case 'fastest':
        return { label: 'Fastest', icon: '⚡', color: 'bg-blue-500' };
      case 'shortest':
        return { label: 'Shortest', icon: '📏', color: 'bg-green-500' };
      case 'cheapest':
        return { label: 'Cheapest', icon: '💰', color: 'bg-purple-500' };
      default:
        return { label: 'Alternative', icon: '🔀', color: 'bg-gray-500' };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Calculating routes...</span>
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
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Choose Your Route</h3>
        <span className="text-sm text-gray-600">{routes.length} options available</span>
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
                    {routeInfo.icon} {routeInfo.label}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTrafficColor(route.trafficCondition)}`}>
                    {route.trafficCondition} traffic
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
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDuration(route.durationInTraffic || route.duration)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Distance</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDistance(route.distance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Cost</p>
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
                  +{formatDuration(route.durationInTraffic - route.duration)} delay due to traffic
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
            <span className="font-semibold">Selected:</span> {getRouteLabel(selectedRoute.type).label} route
            - {formatDuration(selectedRoute.durationInTraffic || selectedRoute.duration)} trip
            for {formatCost(selectedRoute.cost)}
          </p>
        </div>
      )}
    </div>
  );
};

export default RouteSelector;
