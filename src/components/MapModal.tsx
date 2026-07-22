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
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  fsmTours?: any[];
  executeNouvelleTournee?: () => void;
  executeAddToTrier?: () => void;
  executeAddTournee?: (targetTourId: string) => void;
  isAnySelectedInTour?: boolean;
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

// Custom Leaflet marker generator (no AED text, matches getSafetyStatus color, shows selection outline and checkmark if checked)
const createCustomIcon = (colorHex: string, activeFocused: boolean, isChecked: boolean) => {
  const scaleStyle = activeFocused 
    ? `transform: scale(1.5);` 
    : isChecked ? `transform: scale(1.3);` : ``;

  const borderStyle = isChecked
    ? `border: 2px solid #fe4eba; box-shadow: 0 0 0 3px rgba(254, 78, 186, 0.4);`
    : `border: 1.5px solid white;`;

  const checkMarkSvg = isChecked
    ? `<span style="position: absolute; top: -1px; left: 1.5px; font-size: 10px; color: white; font-weight: bold; line-height: 1;">✓</span>`
    : ``;

  return L.divIcon({
    html: `
      <div style="
        position: relative;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background-color: ${colorHex};
        ${borderStyle}
        ${scaleStyle}
        transition: all 0.2s ease-in-out;
      ">${checkMarkSvg}</div>
    `,
    className: 'custom-leaflet-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });
};

// Popup Content component using map trigger actions and selection checkbox
function PopupContent({ 
  df, 
  clientDenomination,
  isChecked,
  onToggleSelect
}: { 
  df: Defibrillateur; 
  clientDenomination: string;
  isChecked: boolean;
  onToggleSelect?: (id: string) => void;
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

      {/* Radio Check / Checkbox Selection */}
      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <label 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            cursor: 'pointer', 
            fontSize: '16px', 
            fontWeight: 'bold', 
            color: '#000000',
            userSelect: 'none'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input 
            type="checkbox" 
            checked={isChecked}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect?.(df.id);
            }}
            style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#fe4eba' }}
          />
          <span>Sélectionner pour tournée</span>
        </label>
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
          margin: '8px 0 0 0',
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
  variables,
  selectedIds = [],
  onToggleSelect,
  fsmTours = [],
  executeNouvelleTournee,
  executeAddToTrier,
  executeAddTournee,
  isAnySelectedInTour = false
}: MapModalProps) {
  const [selectedDefibId, setSelectedDefibId] = useState<string | null>(null);
  const [isTourDropdownOpen, setIsTourDropdownOpen] = useState(false);
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  
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
        
        {/* Top-Right Header Container: Tournée button (en haut à gauche de Fermer) + Fermer button */}
        <div className="absolute top-4 right-4 z-[1000] flex items-center gap-3">
          {/* Tournée Dropdown Container */}
          <div className="relative">
            <button
              type="button"
              disabled={isAnySelectedInTour}
              onClick={() => {
                if (selectedIds.length === 0) {
                  alert("Veuillez d'abord sélectionner au moins un défibrillateur sur la carte.");
                  return;
                }
                if (!isAnySelectedInTour) {
                  setIsTourDropdownOpen(!isTourDropdownOpen);
                }
              }}
              title={
                selectedIds.length === 0
                  ? "Sélectionnez au moins un défibrillateur"
                  : isAnySelectedInTour
                  ? "Action impossible : l'un des défibrillateurs sélectionnés fait déjà partie d'une tournée."
                  : "Associer à une tournée"
              }
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid rgb(218 218 218)',
                borderRadius: '12px',
                fontSize: '18px',
                padding: '9px 19px',
                fontWeight: 'normal',
                color: '#000000',
                cursor: isAnySelectedInTour ? 'not-allowed' : 'pointer',
                opacity: isAnySelectedInTour ? 0.6 : 1,
                fontFamily: "'DefibeoMain', 'Civilprom', sans-serif",
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
              }}
            >
              {selectedIds.length > 0 && (
                <span
                  style={{
                    backgroundColor: '#fe4eba',
                    color: '#ffffff',
                    borderRadius: '9999px',
                    padding: '2px 8px',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}
                >
                  {selectedIds.length}
                </span>
              )}
              <span>Tournée</span>
            </button>

            {/* Dropdown Menu */}
            {isTourDropdownOpen && !isAnySelectedInTour && (
              <div 
                className="absolute right-0 mt-1 w-72 bg-white rounded-lg z-[1050] py-2.5 font-sans animate-fadeIn"
                style={{ 
                  fontSize: '18px',
                  border: '1px solid rgb(218 218 218)',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div className="px-3 pb-2 bg-transparent flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      executeNouvelleTournee?.();
                      setIsTourDropdownOpen(false);
                      onClose();
                    }}
                    style={{
                      backgroundColor: '#f3f4f6',
                      borderRadius: '12px',
                      fontSize: '18px',
                      padding: '9px 19px',
                      fontWeight: 'normal',
                      color: '#000000',
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                      fontFamily: "'DefibeoMain', 'Civilprom', sans-serif"
                    }}
                    className="w-full text-center transition-colors cursor-pointer hover:bg-slate-200"
                  >
                    Nouvelle Tournée
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      executeAddToTrier?.();
                      setIsTourDropdownOpen(false);
                      onClose();
                    }}
                    style={{
                      backgroundColor: '#000000',
                      borderRadius: '12px',
                      fontSize: '18px',
                      padding: '9px 19px',
                      fontWeight: 'normal',
                      color: '#ffffff',
                      border: 'none',
                      cursor: 'pointer',
                      width: '100%',
                      fontFamily: "'DefibeoMain', 'Civilprom', sans-serif"
                    }}
                    className="w-full text-center transition-colors cursor-pointer hover:opacity-90"
                  >
                    À trier
                  </button>
                </div>

                {selectedDraftId && (
                  <div className="px-3 pb-2 bg-transparent">
                    <button
                      type="button"
                      onClick={() => {
                        executeAddTournee?.(selectedDraftId);
                        setIsTourDropdownOpen(false);
                        setSelectedDraftId(null);
                        onClose();
                      }}
                      style={{
                        backgroundColor: 'rgb(53, 86, 236)',
                        borderRadius: '12px',
                        fontSize: '18px',
                        padding: '9px 19px',
                        fontWeight: 'normal',
                        color: '#ffffff',
                        border: 'none',
                        cursor: 'pointer',
                        width: '100%',
                        boxShadow: 'rgba(255, 255, 255, 0.2) 0px 1px 1px inset, rgba(8, 8, 8, 0.2) 0px 1px 2px',
                        fontFamily: "'DefibeoMain', 'Civilprom', sans-serif"
                      }}
                      className="w-full text-center transition-colors cursor-pointer hover:bg-blue-700"
                    >
                      Confirmer l'action
                    </button>
                  </div>
                )}
                
                {(() => {
                  const drafts = (fsmTours || []).filter(t => (t.status || 'Brouillon') === 'Brouillon' && t.id !== 'a-trier');
                  if (drafts.length === 0) {
                    return (
                      <div className="px-4 py-2 text-black font-sans text-center" style={{ fontSize: '15px' }}>
                        Aucune tournée en brouillon
                      </div>
                    );
                  }
                  return drafts.map(t => {
                    const isSelected = selectedDraftId === t.id;
                    const tourTitle = t.title || 'Nouvelle Tournée';
                    const displayTitle = tourTitle.length > 25 ? tourTitle.substring(0, 25) + '(...)' : tourTitle;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setSelectedDraftId(isSelected ? null : t.id);
                        }}
                        className="w-full text-left px-4 py-2 font-semibold truncate cursor-pointer border-0 bg-transparent hover:bg-slate-50 font-sans"
                        style={{ 
                          fontSize: '16px',
                          color: isSelected ? 'rgb(254, 78, 186)' : '#000000',
                          textDecoration: isSelected ? 'underline' : 'none'
                        }}
                      >
                        {displayTitle}
                      </button>
                    );
                  });
                })()}
              </div>
            )}
          </div>

          {/* Floating Close Button in signature blue style */}
          <button
            onClick={onClose}
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
        </div>

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

            const isFocused = df.id === selectedDefibId;
            const isChecked = selectedIds.includes(df.id);
            const statusColor = getSafetyStatusColor(df);
            const clientDenomination = clientMap.get(df.clientId)?.denomination || '';

            return (
              <Marker
                key={df.id}
                position={coords}
                icon={createCustomIcon(statusColor, isFocused, isChecked)}
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
                  <PopupContent 
                    df={df} 
                    clientDenomination={clientDenomination} 
                    isChecked={isChecked}
                    onToggleSelect={onToggleSelect}
                  />
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
