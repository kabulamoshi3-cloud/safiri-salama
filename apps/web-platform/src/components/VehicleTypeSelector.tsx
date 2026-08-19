/**
 * Vehicle Type Selector
 * Compare car, bajaji, and boda-boda options with pricing
 */

import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Location {
  latitude: number;
  longitude: number;
}

interface VehicleEstimate {
  vehicleType: 'car' | 'bajaji' | 'boda-boda';
  estimatedCost: number;
  estimatedDuration: number;
  estimatedDistance: number;
  baseRate: number;
  minimumFare: number;
}

interface VehicleTypeSelectorProps {
  origin: Location;
  destination: Location;
  onVehicleSelect: (vehicleType: string) => void;
}

const VehicleTypeSelector: React.FC<VehicleTypeSelectorProps> = ({
  origin,
  destination,
  onVehicleSelect
}) => {
  const [estimates, setEstimates] = useState<VehicleEstimate[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('car');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEstimates();
  }, [origin, destination]);

  const fetchEstimates = async () => {
    try {
      setLoading(true);

      const response = await axios.post(
        `${process.env.REACT_APP_TRACKING_URL || 'http://localhost:3001'}/api/routes/compare-vehicles`,
        { origin, destination }
      );

      setEstimates(response.data.comparison);
      setSelectedVehicle(response.data.recommendation);
      onVehicleSelect(response.data.recommendation);

    } catch (error) {
      console.error('Failed to fetch vehicle estimates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleSelect = (vehicleType: string) => {
    setSelectedVehicle(vehicleType);
    onVehicleSelect(vehicleType);
  };

  const getVehicleInfo = (type: string) => {
    switch (type) {
      case 'car':
        return {
          name: 'Car',
          icon: '🚗',
          description: 'Comfortable sedan, 4 passengers',
          color: 'blue'
        };
      case 'bajaji':
        return {
          name: 'Bajaji',
          icon: '🛺',
          description: '3-wheeler, 3 passengers, budget-friendly',
          color: 'green'
        };
      case 'boda-boda':
        return {
          name: 'Boda-Boda',
          icon: '🏍️',
          description: 'Motorcycle, 1 passenger, fastest in traffic',
          color: 'orange'
        };
      default:
        return {
          name: 'Vehicle',
          icon: '🚙',
          description: '',
          color: 'gray'
        };
    }
  };

  const formatCost = (amount: number): string => {
    return `TZS ${amount.toLocaleString()}`;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Select Vehicle Type</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {estimates.map((estimate) => {
          const vehicleInfo = getVehicleInfo(estimate.vehicleType);
          const isSelected = selectedVehicle === estimate.vehicleType;
          const isCheapest = estimate === estimates[0];

          return (
            <button
              key={estimate.vehicleType}
              onClick={() => handleVehicleSelect(estimate.vehicleType)}
              className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? `border-${vehicleInfo.color}-500 bg-${vehicleInfo.color}-50`
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              {/* Best Value Badge */}
              {isCheapest && (
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded">
                  BEST VALUE
                </div>
              )}

              {/* Vehicle Icon and Name */}
              <div className="flex items-center space-x-3 mb-3">
                <span className="text-4xl">{vehicleInfo.icon}</span>
                <div>
                  <h4 className="font-semibold text-gray-900">{vehicleInfo.name}</h4>
                  <p className="text-xs text-gray-600">{vehicleInfo.description}</p>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-gray-600">Estimated fare</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatCost(estimate.estimatedCost)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Time</span>
                  <span className="font-medium text-gray-900">
                    {formatDuration(estimate.estimatedDuration)}
                  </span>
                </div>

                <div className="text-xs text-gray-500 mt-2">
                  Base rate: {formatCost(estimate.baseRate)}/km
                </div>
              </div>

              {/* Selection Indicator */}
              {isSelected && (
                <div className="absolute top-2 left-2">
                  <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
        <p className="text-blue-800">
          💡 <span className="font-semibold">Tip:</span> Boda-bodas are fastest in heavy traffic. 
          Bajajis offer the best value for short trips.
        </p>
      </div>
    </div>
  );
};

export default VehicleTypeSelector;
