import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import i18n from '../i18n';

type RootStackParamList = Record<string, object | undefined>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface Coords {
  lat: number;
  lng: number;
}

type MapRouteRouteProps = RouteProp<
  Record<
    string,
    {
      pickupCoords: Coords;
      destinationCoords: Coords;
      polylineCoords: [number, number][];
      driverCoords: Coords | null;
      etaMinutes: number;
    }
  >,
  string
>;

export default function MapRouteScreen({
  route,
  navigation,
}: {
  route: MapRouteRouteProps;
  navigation: NavProp;
}) {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    return i18n.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  const { pickupCoords, destinationCoords, polylineCoords, driverCoords, etaMinutes } =
    route.params;

  const mapRef = useRef<MapView>(null);

  const centerRegion: Region = driverCoords
    ? {
        latitude: driverCoords.lat,
        longitude: driverCoords.lng,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }
    : {
        latitude: pickupCoords.lat,
        longitude: pickupCoords.lng,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  const handleRecenter = () => {
    mapRef.current?.animateToRegion(centerRegion, 600);
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={centerRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Route polyline */}
        {polylineCoords.length > 1 && (
          <Polyline
            coordinates={polylineCoords.map((p) => ({ latitude: p[0], longitude: p[1] }))}
            strokeColor="#00d46a"
            strokeWidth={4}
          />
        )}

        {/* Pickup marker */}
        <Marker
          coordinate={{ latitude: pickupCoords.lat, longitude: pickupCoords.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <Text style={styles.markerEmoji}>📍</Text>
        </Marker>

        {/* Destination marker */}
        <Marker
          coordinate={{ latitude: destinationCoords.lat, longitude: destinationCoords.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <Text style={styles.markerEmoji}>🏁</Text>
        </Marker>

        {/* Live driver marker */}
        {driverCoords !== null && (
          <Marker
            coordinate={{ latitude: driverCoords.lat, longitude: driverCoords.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Text style={styles.driverEmoji}>🚕</Text>
          </Marker>
        )}
      </MapView>

      {/* ETA pill */}
      <View style={styles.etaPill}>
        <Text style={styles.etaText}>
          {i18n.t('arriving_min').replace('{minutes}', String(etaMinutes))}
        </Text>
      </View>

      {/* Back arrow */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>←</Text>
      </TouchableOpacity>

      {/* Recenter button */}
      <TouchableOpacity style={styles.recenterBtn} onPress={handleRecenter}>
        <Text style={styles.recenterText}>⊙</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  markerEmoji: { fontSize: 22 },
  driverEmoji: { fontSize: 26 },

  etaPill: {
    position: 'absolute',
    top: 50,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  etaText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },

  backBtn: {
    position: 'absolute',
    top: 50,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 22,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },

  recenterBtn: {
    position: 'absolute',
    bottom: 40,
    right: 16,
    backgroundColor: '#00d46a',
    borderRadius: 28,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  recenterText: { color: '#ffffff', fontSize: 24 },
});
