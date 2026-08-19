/**
 * Live Tracking Component
 * Real-time driver tracking with map, ETA, and distance updates
 */

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

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
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentRoute, setCurrentRoute] = useState<any>(null);
  const [etaAlert, setEtaAlert] = useState<{
    show: boolean;
    oldETA: number;
    newETA: number;
    reason: string;
    type: 'delay' | 'improvement';
  } | null>(null);
  const [routeSuggestion, setRouteSuggestion] = useState<{
    show: boolean;
    currentDuration: number;
    alternativeDuration: number;
    timeSaved: number;
  } | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const driverMarkerRef = useRef<google.maps.Marker | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const pickupMarkerRef = useRef<google.maps.Marker | null>(null);
  const destinationMarkerRef = useRef<google.maps.Marker | null>(null);

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
      const response = await fetch(
        `${process.env.REACT_APP_TRACKING_URL || 'http://localhost:3001'}/api/routes/calculate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origin: { latitude: origin.latitude, longitude: origin.longitude },
            destination: { latitude: destination.latitude, longitude: destination.longitude },
            vehicleType: 'car',
            alternatives: false
          })
        }
      );

      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        setCurrentRoute(route);
        drawRouteOnMap(route.polyline);
      }
    } catch (error) {
      console.error('Failed to fetch route:', error);
    }
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

  // Connect to WebSocket
  useEffect(() => {
    const socketConnection = io(process.env.REACT_APP_TRACKING_URL || 'http://localhost:3001', {
      auth: { token }
    });

    socketConnection.on('connect', () => {
      console.log('✓ Connected to tracking service');
      socketConnection.emit('trip:join', { tripId });
    });

    socketConnection.on('trip:status', (trip) => {
      setTripStatus(trip.status);
      if (trip.currentLocation) {
        updateDriverLocation(trip.currentLocation);
      }
    });

    socketConnection.on('driver:moved', (data: DriverLocation) => {
      updateDriverLocation(data);
    });

    socketConnection.on('trip:started', (trip) => {
      setTripStatus('in_progress');
      
      // Update route to show from current location to destination
      if (driverLocation) {
        fetchAndDrawRoute(driverLocation, dropoffLocation);
      }
    });

    socketConnection.on('trip:completed', () => {
      setTripStatus('completed');
      onArrival?.();
    });

    // Listen for ETA changes
    socketConnection.on('eta:changed', (data: any) => {
      setEtaAlert({
        show: true,
        oldETA: data.previousETA,
        newETA: data.newETA,
        reason: data.reason,
        type: data.newETA > data.previousETA ? 'delay' : 'improvement'
      });

      // Auto-hide after 10 seconds
      setTimeout(() => setEtaAlert(null), 10000);
    });

    // Listen for faster route suggestions
    socketConnection.on('route:faster_available', (data: any) => {
      setRouteSuggestion({
        show: true,
        currentDuration: data.currentDuration,
        alternativeDuration: data.alternativeDuration,
        timeSaved: data.timeSaved
      });
    });

    setSocket(socketConnection);

    return () => {
      socketConnection.disconnect();
    };
  }, [tripId, token]);

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

  const acceptFasterRoute = () => {
    if (!socket) return;
    
    // Notify driver to take alternative route
    socket.emit('driver:reroute:accept', { tripId });
    
    setRouteSuggestion(null);
    
    // Optionally refetch the new route
    const target = tripStatus === 'awaiting_pickup' ? pickupLocation : destinationLocation;
    if (driverLocation) {
      fetchAndDrawRoute(driverLocation, target);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* ETA Change Notification */}
      {etaAlert?.show && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 
          ${etaAlert.type === 'delay' ? 'bg-orange-500' : 'bg-green-500'} 
          text-white px-6 py-4 rounded-lg shadow-2xl max-w-md animate-slide-down`}>
          <div className="flex items-start space-x-3">
            <span className="text-2xl">
              {etaAlert.type === 'delay' ? '⚠️' : '✅'}
            </span>
            <div className="flex-1">
              <p className="font-bold text-lg">ETA Updated</p>
              <p className="text-sm mt-1">
                Previous arrival: {formatETA(etaAlert.oldETA)}
              </p>
              <p className="text-sm">
                New arrival: <span className="font-bold">{formatETA(etaAlert.newETA)}</span>
              </p>
              <p className="text-xs mt-2 opacity-90">{etaAlert.reason}</p>
            </div>
            <button
              onClick={() => setEtaAlert(null)}
              className="text-white hover:text-gray-200 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Faster Route Suggestion */}
      {routeSuggestion?.show && (
        <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-96 
          bg-white rounded-lg shadow-2xl border-2 border-blue-500 p-4 z-50">
          <div className="flex items-start space-x-3">
            <span className="text-3xl">🚦</span>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900">Faster Route Available!</h3>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current route:</span>
                  <span className="font-semibold">{routeSuggestion.currentDuration} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Alternative:</span>
                  <span className="font-semibold text-green-600">
                    {routeSuggestion.alternativeDuration} min
                  </span>
                </div>
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <p className="text-green-700 font-bold text-center">
                    ⚡ Save approximately {routeSuggestion.timeSaved} minutes
                  </p>
                </div>
              </div>
              <div className="mt-4 flex space-x-2">
                <button
                  onClick={acceptFasterRoute}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Take Faster Route
                </button>
                <button
                  onClick={() => setRouteSuggestion(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Keep Current
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div ref={mapRef} className="flex-1 w-full min-h-[400px] rounded-lg" />

      {/* Driver Info Card */}
      {driverLocation && (
        <div className="mt-4 bg-white rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {tripStatus === 'awaiting_pickup' ? 'Driver on the way' : 'Trip in progress'}
              </h3>
              <p className="text-sm text-gray-600">
                {tripStatus === 'awaiting_pickup' 
                  ? 'Your driver is heading to your pickup location'
                  : 'You are on your way to destination'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
              <span className="text-sm text-gray-600">Live</span>
            </div>
          </div>

          {/* Journey Progress Bar (only during in_progress) */}
          {tripStatus === 'in_progress' && currentRoute && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progress</span>
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
              <p className="text-xs text-blue-600 font-medium">ETA</p>
              <p className="text-2xl font-bold text-blue-900">{formatETA(driverLocation.eta)}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-green-600 font-medium">Distance</p>
              <p className="text-2xl font-bold text-green-900">{formatDistance(driverLocation.distance)}</p>
            </div>
          </div>

          {driverLocation.speed && driverLocation.speed > 0 && (
            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-600">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Speed: {Math.round(driverLocation.speed)} km/h
              </div>
              
              {/* Traffic Condition Indicator */}
              {currentRoute?.trafficCondition && (
                <div className={`flex items-center text-xs font-medium px-2 py-1 rounded ${
                  currentRoute.trafficCondition === 'light' ? 'bg-green-100 text-green-700' :
                  currentRoute.trafficCondition === 'moderate' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  🚦 {currentRoute.trafficCondition === 'light' ? 'Light' : 
                      currentRoute.trafficCondition === 'moderate' ? 'Moderate' : 'Heavy'} Traffic
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
