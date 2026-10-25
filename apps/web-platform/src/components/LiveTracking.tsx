/**
 * Live Tracking Component
 * Real-time driver tracking with map, ETA, and distance updates
 * Uses polling instead of WebSocket for simplicity
 */

import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { i18n } from '../i18n';

interface Location {
  latitude: number;
  longitude: number;
}

interface DriverLocation extends Location {
  heading?: number;
  speed?: number;
  eta: number; // minutes
  distance: number; // meters
}

interface LiveTrackingProps {
  tripId: string;
  driverId: string;
  pickupLocation: Location;
  destinationLocation: Location;
  token: string;
  onArrival?: () => void;
}

const LiveTracking: React.FC<LiveTrackingProps> = ({
  tripId,
  driverId,
  pickupLocation,
  destinationLocation,
  token,
  onArrival
}) => {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [tripStatus, setTripStatus] = useState<'awaiting_pickup' | 'in_progress' | 'completed'>('awaiting_pickup');
  const [currentRoute, setCurrentRoute] = useState<any>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    return i18n.subscribe(() => forceUpdate());
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: pickupLocation.latitude, lng: pickupLocation.longitude },
      zoom: 14,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true
    });

    mapInstanceRef.current = map;

    // Add pickup marker
    pickupMarkerRef.current = new google.maps.Marker({
      position: { lat: pickupLocation.latitude, lng: pickupLocation.longitude },
      map: map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#22c55e',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2
      },
      title: 'Pickup Location'
    });

    // Add destination marker
    destinationMarkerRef.current = new google.maps.Marker({
      position: { lat: destinationLocation.latitude, lng: destinationLocation.longitude },
      map: map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#ef4444',
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2
      },
      title: 'Destination'
    });

    // Fetch and draw initial route
    fetchAndDrawRoute(pickupLocation, destinationLocation);

  }, [pickupLocation, destinationLocation]);

  // Function to decode Google Maps polyline
  const decodePolyline = (encoded: string): google.maps.LatLngLiteral[] => {
    if (!encoded) return [];
    
    const poly: google.maps.LatLngLiteral[] = [];
    let index = 0, len = encoded.length;
    let lat = 0, lng = 0;

    while (index < len) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
      lng += dlng;

      poly.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return poly;
  };

  // Function to fetch route from Google Directions API via our backend
  const fetchAndDrawRoute = async (origin: Location, destination: Location) => {
    try {
      const response = await api.post('/routes/calculate', {
        origin: { latitude: origin.latitude, longitude: origin.longitude },
        destination: { latitude: destination.latitude, longitude: destination.longitude },
        vehicleType: 'car',
        alternatives: false
      });

      const data = response.data;
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setCurrentRoute(route);
        drawRouteOnMap(route.polyline);
      }
    } catch (error) {
      console.error('Failed to fetch route:', error);
      // Fallback: draw straight line
      drawStraightLine(origin, destination);
    }
  };

  // Fallback: draw straight line if route calculation fails
  const drawStraightLine = (origin: Location, destination: Location) => {
    if (!mapInstanceRef.current) return;

    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
    }

    const path = [
      { lat: origin.latitude, lng: origin.longitude },
      { lat: destination.latitude, lng: destination.longitude }
    ];

    const polyline = new google.maps.Polyline({
      path: path,
      strokeColor: tripStatus === 'in_progress' ? '#22c55e' : '#3b82f6',
      strokeWeight: 3,
      strokeOpacity: 0.6,
      map: mapInstanceRef.current,
      geodesic: true
    });

    routePolylineRef.current = polyline;
  };

  // Function to draw route polyline on map
  const drawRouteOnMap = (polylineString: string) => {
    if (!mapInstanceRef.current || !polylineString) return;

    // Remove old polyline
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
    }

    // Decode and draw new polyline
    const path = decodePolyline(polylineString);
    const polyline = new google.maps.Polyline({
      path: path,
      strokeColor: tripStatus === 'in_progress' ? '#22c55e' : '#3b82f6',
      strokeWeight: 5,
      strokeOpacity: 0.8,
      map: mapInstanceRef.current
    });

    routePolylineRef.current = polyline;

    // Fit map bounds to show entire route
    const bounds = new google.maps.LatLngBounds();
    path.forEach(point => bounds.extend(point));
    mapInstanceRef.current.fitBounds(bounds);
  };

  // Polling for driver location - every 5 seconds
  useEffect(() => {
    const fetchDriverLocation = async () => {
      try {
        const response = await api.get(`/trips/${tripId}/location`);
        if (response.data && response.data.driver_location) {
          const location: DriverLocation = {
            latitude: response.data.driver_location.latitude,
            longitude: response.data.driver_location.longitude,
            heading: response.data.driver_location.heading,
            speed: response.data.driver_location.speed,
            eta: response.data.eta || 0,
            distance: response.data.distance || 0
          };
          updateDriverLocation(location);
          
          // Update trip status if changed
          if (response.data.status) {
            setTripStatus(response.data.status);
            if (response.data.status === 'completed') {
              onArrival?.();
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch driver location:', error);
      }
    };

    // Initial fetch
    fetchDriverLocation();

    // Poll every 5 seconds
    const intervalId = setInterval(fetchDriverLocation, 5000);

    return () => clearInterval(intervalId);
  }, [tripId]);

  const updateDriverLocation = (location: DriverLocation) => {
    setDriverLocation(location);

    if (!mapInstanceRef.current) return;

    const position = {
      lat: location.latitude,
      lng: location.longitude
    };

    // Update or create driver marker
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setPosition(position);
      if (location.heading !== undefined) {
        driverMarkerRef.current.setIcon({
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
          rotation: location.heading
        });
      }
    } else {
      driverMarkerRef.current = new google.maps.Marker({
        position: position,
        map: mapInstanceRef.current,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
          rotation: location.heading || 0
        },
        title: 'Driver'
      });
    }

    // Pan map to show driver
    mapInstanceRef.current.panTo(position);
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatETA = (minutes: number): string => {
    if (minutes < 1) return '< 1 min';
    if (minutes === 1) return '1 min';
    return `${minutes} mins`;
  };

  const acceptFasterRoute = async () => {
    try {
      // Notify driver to take alternative route via API
      await api.post(`/trips/${tripId}/reroute`, { accept: true });
      
      setRouteSuggestion(null);
      
      // Optionally refetch the new route
      const target = tripStatus === 'awaiting_pickup' ? pickupLocation : destinationLocation;
      if (driverLocation) {
        fetchAndDrawRoute(driverLocation, target);
      }
    } catch (error) {
      console.error('Failed to accept reroute:', error);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Map */}
      <div ref={mapRef} className="flex-1 w-full min-h-[400px] rounded-lg" />

      {/* Driver Info Card */}
      {driverLocation && (
        <div className="mt-4 bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {tripStatus === 'awaiting_pickup' ? i18n.t('tracking.driver_on_way_title') : i18n.t('trip_in_progress')}
              </h3>
              <p className="text-sm text-gray-600">
                {tripStatus === 'awaiting_pickup'
                  ? i18n.t('tracking.driver_heading_pickup')
                  : i18n.t('tracking.on_way_destination')}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600">{i18n.t('tracking.live')}</span>
            </div>
          </div>

          {/* Journey Progress Bar (only during in_progress) */}
          {tripStatus === 'in_progress' && currentRoute && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>{i18n.t('tracking.progress')}</span>
                <span>
                  {driverLocation.distance && currentRoute.distance 
                    ? Math.round(((currentRoute.distance - driverLocation.distance) / currentRoute.distance) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${driverLocation.distance && currentRoute.distance 
                      ? Math.min(100, Math.round(((currentRoute.distance - driverLocation.distance) / currentRoute.distance) * 100))
                      : 0}%` 
                  }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium">{i18n.t('tracking.eta')}</p>
              <p className="text-2xl font-bold text-blue-900">{formatETA(driverLocation.eta)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600 font-medium">{i18n.t('distance')}</p>
              <p className="text-2xl font-bold text-green-900">{formatDistance(driverLocation.distance)}</p>
            </div>
          </div>

          {driverLocation.speed && driverLocation.speed > 0 && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-600">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {i18n.t('tracking.speed')} {Math.round(driverLocation.speed)} km/h
              </div>
              
              {/* Traffic Condition Indicator */}
              {currentRoute?.trafficCondition && (
                <div className={`flex items-center text-xs font-medium px-2 py-1 rounded ${
                  currentRoute.trafficCondition === 'light' ? 'bg-green-100 text-green-700' :
                  currentRoute.trafficCondition === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  🚦 {currentRoute.trafficCondition === 'light' ? i18n.t('tracking.light_traffic') :
                      currentRoute.trafficCondition === 'moderate' ? i18n.t('tracking.moderate_traffic') : i18n.t('tracking.heavy_traffic')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveTracking;
