import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import React from 'react';

// Mock leaflet and react-leaflet before importing LiveMap
vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({ setView: vi.fn(), remove: vi.fn() })),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    marker: vi.fn(() => ({ addTo: vi.fn(), bindPopup: vi.fn(), setLatLng: vi.fn() })),
    divIcon: vi.fn(() => ({})),
    icon: vi.fn(() => ({})),
    Icon: {
      Default: {
        prototype: { _getIconUrl: undefined },
        mergeOptions: vi.fn(),
      },
    },
  },
  Icon: {
    Default: {
      prototype: { _getIconUrl: undefined },
      mergeOptions: vi.fn(),
    },
  },
  map: vi.fn(() => ({ setView: vi.fn(), remove: vi.fn() })),
  tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
  marker: vi.fn(() => ({ addTo: vi.fn(), bindPopup: vi.fn(), setLatLng: vi.fn() })),
  divIcon: vi.fn(() => ({})),
  icon: vi.fn(() => ({})),
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: () => null,
  Popup: () => null,
  Circle: () => null,
}));

// Suppress leaflet.css import
vi.mock('leaflet/dist/leaflet.css', () => ({}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => {
      const map: Record<string, string> = {
        nav_live_map: 'Live Map',
      };
      return map[k] ?? k;
    },
  }),
}));

import LiveMap from '../pages/LiveMap';

describe('LiveMap', () => {
  it('renders map container', () => {
    render(<LiveMap />);
    expect(screen.getByTestId('map')).toBeTruthy();
  });

  it('renders page heading', () => {
    render(<LiveMap />);
    expect(screen.getByText('Live Map')).toBeInTheDocument();
  });

  it('renders All filter button', () => {
    render(<LiveMap />);
    expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
  });
});
