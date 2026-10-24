import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/Button';

interface TrafficSegment {
  id: string;
  name: string;
  currentSpeed?: number;
  status?: string;
  confidence?: number;
}

interface TrafficResponse {
  segments?: TrafficSegment[];
  confidence?: number;
  timestamp?: string;
}

const TrafficPage: React.FC = () => {
  const [segments, setSegments] = useState<TrafficSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    const fetchTraffic = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get<TrafficResponse>('/tracking/traffic/segments');
        
        setSegments(response.data.segments || []);
        setConfidence(response.data.confidence || null);
        setLastUpdated(
          response.data.timestamp
            ? new Date(response.data.timestamp).toLocaleString()
            : new Date().toLocaleString()
        );
      } catch (err) {
        setError('Unable to load traffic data. Please try again later.');
        console.error('Traffic fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTraffic();
  }, []);

  const getStatusBadge = (status?: string) => {
    const statusLower = status?.toLowerCase() || '';
    
    if (statusLower === 'free_flow' || statusLower === 'light') {
      return (
        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
          Free Flow
        </span>
      );
    } else if (statusLower === 'moderate') {
      return (
        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
          Moderate
        </span>
      );
    } else if (
      statusLower === 'heavy' ||
      statusLower === 'congested' ||
      statusLower === 'standstill'
    ) {
      return (
        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
          Heavy Traffic
        </span>
      );
    } else {
      return (
        <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">
          {status || 'Unknown'}
        </span>
      );
    }
  };

  return (
    <div>
      {/* Header Section */}
      <section className="bg-gradient-to-br from-primary to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Live Traffic Insights</h1>
          <p className="text-xl max-w-3xl mx-auto">
            Real-time traffic updates to help you plan your journey
          </p>
        </div>
      </section>

      {/* Traffic Data Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Confidence and Last Updated */}
          <div className="mb-8 text-center">
            <p className="text-lg mb-2">
              <span className="font-semibold">Data Confidence: </span>
              {confidence !== null ? `${Math.round(confidence * 100)}%` : 'N/A'}
            </p>
            <p className="text-gray-600">Last updated: {lastUpdated}</p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-gray-600">Loading traffic data...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Traffic Segments */}
          {!loading && !error && segments.length > 0 && (
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        Road Segment
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        Speed (km/h)
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {segments.map((segment) => (
                      <tr key={segment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-900">{segment.name}</td>
                        <td className="px-6 py-4 text-gray-700">
                          {segment.currentSpeed ? Math.round(segment.currentSpeed) : 'N/A'}
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(segment.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && !error && segments.length === 0 && (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-600">No traffic data available at the moment.</p>
            </div>
          )}

          {/* Disclaimer */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Note: </span>
              Traffic data is updated every 5 minutes. Actual conditions may vary.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-12 text-center">
            <p className="text-lg mb-4">
              Book a ride to use smart routing and avoid traffic
            </p>
            <Link to="/login?intent=book">
              <Button variant="primary">Book a Ride</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TrafficPage;
