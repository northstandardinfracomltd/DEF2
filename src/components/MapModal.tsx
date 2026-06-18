import React, { useState, useMemo, useEffect } from 'react';
import { Defibrillateur, Client, Variable } from '../types';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  defibrillateurs: Defibrillateur[];
  clients: Client[];
  variables: Variable[];
}

// Sub-component to programmatically handle centering and zooming the Leaflet map
function ChangeMapView({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom]);
  return null;
}

// Helper functions for date parsing to match getSafetyStatus from DefibTab
function parseDateHelper(dStr: string | undefined | null): Date | null {
  if (!dStr) return null;
  const parts = dStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month, day);
    }
  }
  const fallback = Date.parse(dStr);
  if (!isNaN(fallback)) {
    return new Date(fallback);
  }
  return null;
}

function computeProchaineMaintenance(derniereM: string | undefined | null): string {
  if (!derniereM) return '';
  const parsed = parseDateHelper(derniereM);
  if (!parsed) return '';
  const next = new Date(parsed);
  next.setFullYear(next.getFullYear() + 1);
  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, '0');
  const d = String(next.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getSafetyStatusColor(df: Defibrillateur): string {
  const datesToCheck: Date[] = [];
  
  // 1. Prochaine maintenance
  const prochaineMaintStr = computeProchaineMaintenance(df.derniereMaintenance);
  const mDate = parseDateHelper(prochaineMaintStr);
  if (mDate) datesToCheck.push(mDate);

  // 2. Péremption Électrode A
  const eADate = parseDateHelper(df.peremptionElectrodeA);
  if (eADate) datesToCheck.push(eADate);

  // 3. Péremption Électrode P
  const ePDate = parseDateHelper(df.peremptionElectrodeP);
  if (ePDate) datesToCheck.push(ePDate);

  // 4. Péremption Batterie
  const bDate = parseDateHelper(df.peremptionBatterie);
  if (bDate) datesToCheck.push(bDate);

  if (datesToCheck.length === 0) {
    return '#94a3b8'; // gray
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const hasExpired = datesToCheck.some(d => {
    const checkDate = new Date(d);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  });
  if (hasExpired) {
    return '#ef4444'; // red
  }

  const getDaysDiff = (targetDate: Date) => {
    const checkDate = new Date(targetDate);
    checkDate.setHours(0, 0, 0, 0);
    const diffTime = checkDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const hasUnder3Months = datesToCheck.some(d => {
    const dDiff = getDaysDiff(d);
    return dDiff >= 0 && dDiff < 90;
  });
  if (hasUnder3Months) {
    return '#f97316'; // orange
  }

  const hasUnder6Months = datesToCheck.some(d => {
    const dDiff = getDaysDiff(d);
    return dDiff >= 90 && dDiff <= 180;
  });
  if (hasUnder6Months) {
    return '#3b82f6'; // blue
  }

  return '#94a3b8'; // gray fallback
}

// Custom Leaflet marker generator (no AED text, no border, matches getSafetyStatus color)
const createCustomIcon = (colorHex: string, selected: boolean) => {
  const selectStyle = selected 
    ? `transform: scale(1.5);` 
    : ``;
  
  return L.divIcon({
    html: `
      <div style="
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background-color: ${colorHex};
        border: 1.5px solid white;
        ${selectStyle}
        transition: all 0.2s ease-in-out;
      "></div>
    `,
    className: 'custom-leaflet-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });
};

// Popup Content component using map trigger actions
function PopupContent({ 
  df, 
  clientDenomination
}: { 
  df: Defibrillateur; 
  clientDenomination: string;
}) {
  const map = useMap();
  return (
    <div className="font-sans text-left" style={{ fontFamily: "'DefibeoMain', 'Civilprom', sans-serif", fontSize: '18px', color: '#000000', padding: '0px', lineHeight: '1.4', cursor: 'default', userSelect: 'none' }}>
      <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '2px', color: '#000000', fontFamily: "'DefibeoMain', 'Civilprom', sans-serif", cursor: 'default' }}>
        {df.identifiant}
      </div>
      <div style={{ fontWeight: 'normal', fontSize: '18px', color: '#000000', marginBottom: '2px', fontFamily: "'DefibeoMain', 'Civilprom', sans-serif", cursor: 'default' }}>
        {clientDenomination}
      </div>
      <div style={{ fontWeight: 'normal', fontSize: '18px', color: '#000000', marginBottom: '6px', fontFamily: "'DefibeoMain', 'Civilprom', sans-serif", cursor: 'default' }}>
        {df.numVoie ? `${df.numVoie}, ` : ''}{df.ville} {df.cp ? `(${df.cp})` : ''}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          map.closePopup();
        }}
        style={{
          fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
          fontSize: '16px',
          color: 'rgb(53, 86, 236)',
          background: 'none',
          border: 'none',
          padding: 0,
          margin: '4px 0 0 0',
          cursor: 'pointer',
          textDecoration: 'none',
          display: 'block'
        }}
      >
        Fermer
      </button>
    </div>
  );
}

export default function MapModal({
  isOpen,
  onClose,
  defibrillateurs,
  clients,
  variables
}: MapModalProps) {
  const [selectedDefibId, setSelectedDefibId] = useState<string | null>(null);
  
  // Real coordinates configuration
  const [mapCenter, setMapCenter] = useState<[number, number]>([46.603354, 1.888334]);
  const [mapZoom, setMapZoom] = useState<number>(6);
  const [geocodedCoords, setGeocodedCoords] = useState<Record<string, [number, number]>>({});

  // Maps configurations
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);

  // Set initial selected item when opened
  useEffect(() => {
    if (isOpen && defibrillateurs.length > 0 && selectedDefibId === null) {
      setSelectedDefibId(defibrillateurs[0].id);
    }
  }, [isOpen, defibrillateurs, selectedDefibId]);

  // Background geocoding helper using OSM Nominatim
  useEffect(() => {
    if (!isOpen) return;

    const toGeocode = defibrillateurs.filter(df => {
      const lat = parseFloat(df.latitude);
      const lng = parseFloat(df.longitude);
      const hasValidCo = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && lat !== 48.8566; // ignore placeholder default
      return !hasValidCo && !geocodedCoords[df.id] && (df.ville || df.numVoie);
    });

    if (toGeocode.length === 0) return;

    let active = true;

    const geocodeAll = async () => {
      for (const df of toGeocode) {
        if (!active) break;
        const addressQuery = `${df.numVoie ? df.numVoie + ', ' : ''}${df.cp ? df.cp + ' ' : ''}${df.ville}${df.pays ? ', ' : ''}${df.pays || 'France'}`;
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}`);
          const data = await response.json();
          if (data && data.length > 0) {
            const first = data[0];
            const lat = parseFloat(first.lat);
            const lon = parseFloat(first.lon);
            if (!isNaN(lat) && !isNaN(lon) && active) {
              setGeocodedCoords(prev => ({
                ...prev,
                [df.id]: [lat, lon]
              }));
            }
          }
        } catch (err) {
          console.error("Geocoding failed for: ", addressQuery, err);
        }
        // Polite delay of 1.2s to comply with OpenStreetMap guidelines/Limits
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
    };

    geocodeAll();

    return () => {
      active = false;
    };
  }, [isOpen, defibrillateurs]);

  // Map active coordinates mapper
  const getDeviceCoords = (df: Defibrillateur): [number, number] | null => {
    const lat = parseFloat(df.latitude);
    const lng = parseFloat(df.longitude);
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
      return [lat, lng];
    }
    return geocodedCoords[df.id] || null;
  };

  // Center on selected device
  useEffect(() => {
    if (selectedDefibId) {
      const activeDf = defibrillateurs.find(df => df.id === selectedDefibId);
      if (activeDf) {
        const coords = getDeviceCoords(activeDf);
        if (coords) {
          setMapCenter(coords);
          setMapZoom(13);
        }
      }
    }
  }, [selectedDefibId, geocodedCoords]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-[120] w-screen h-screen overflow-hidden flex flex-col" id="map-modal-overlay">
      <style>{`
        /* Style adjustments to completely remove box-shadow effect on Popup wrapper info div */
        .leaflet-popup-content-wrapper {
          box-shadow: none !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 12px !important;
          background: #ffffff !important;
        }
        .leaflet-popup-tip {
          box-shadow: none !important;
          border: 1px solid #e2e8f0 !important;
          background: #ffffff !important;
        }
        .leaflet-popup-content {
          margin: 12px 16px !important;
        }
      `}</style>

      <div className="relative w-full h-full flex-1">
        
        {/* Floating Close Button on Top of the Map in signature blue style */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[1000]"
          style={{
            backgroundColor: 'rgb(53, 86, 236)',
            boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px, rgba(8, 8, 8, 0.08) 0px 4px 4px, rgb(53, 86, 236) 0px 7px 0px -12px, rgba(255, 255, 255, 0.12) 0px 6px 12px inset',
            borderRadius: '12px',
            fontSize: '18px',
            padding: '9px 19px',
            fontWeight: 'normal',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
            transition: 'all 0.1s ease-in-out'
          }}
        >
          Fermer
        </button>

        {/* Real OpenStreetMap Leaflet Container */}
        <MapContainer 
          center={mapCenter} 
          zoom={mapZoom} 
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <ChangeMapView center={mapCenter} zoom={mapZoom} />

          {/* Plot Markers */}
          {defibrillateurs.map(df => {
            const coords = getDeviceCoords(df);
            if (!coords) return null;

            const isSelected = df.id === selectedDefibId;
            const statusColor = getSafetyStatusColor(df);
            const clientDenomination = clientMap.get(df.clientId)?.denomination || '';

            return (
              <Marker
                key={df.id}
                position={coords}
                icon={createCustomIcon(statusColor, isSelected)}
                eventHandlers={{
                  click: (e) => {
                    setSelectedDefibId(df.id);
                    e.target.openPopup();
                  },
                  mouseover: (e) => {
                    e.target.openPopup();
                  }
                }}
              >
                <Popup closeButton={false}>
                  <PopupContent df={df} clientDenomination={clientDenomination} />
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
