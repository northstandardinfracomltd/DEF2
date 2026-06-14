import React, { useState, useMemo } from 'react';
import { Defibrillateur, Client, Variable } from '../types';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Search,
  MapPin,
  Building,
  CheckCircle2,
  AlertTriangle,
  Battery,
  Shield,
  Activity,
  Compass,
  Layers,
  HelpCircle
} from 'lucide-react';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  defibrillateurs: Defibrillateur[];
  clients: Client[];
  variables: Variable[];
}

// Major French cities to anchor on the visual map for coordinate reference
const ANCHOR_CITIES = [
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'Bordeaux', lat: 44.8378, lng: -0.5792 },
  { name: 'Nantes', lat: 47.2184, lng: -1.5536 },
  { name: 'Lyon', lat: 45.7640, lng: 4.8357 },
  { name: 'Marseille', lat: 43.2965, lng: 5.3698 },
  { name: 'Lille', lat: 50.6292, lng: 3.0573 },
  { name: 'Strasbourg', lat: 48.5734, lng: 7.7521 },
  { name: 'Toulouse', lat: 43.6047, lng: 1.4442 },
  { name: 'Nice', lat: 43.7102, lng: 7.2620 },
  { name: 'Brest', lat: 48.3903, lng: -4.4860 },
];

export default function MapModal({
  isOpen,
  onClose,
  defibrillateurs,
  clients,
  variables
}: MapModalProps) {
  const [mapSearch, setMapSearch] = useState('');
  const [selectedDefibId, setSelectedDefibId] = useState<string | null>(
    defibrillateurs.length > 0 ? defibrillateurs[0].id : null
  );
  const [viewportZoom, setViewportZoom] = useState<number>(1);
  const [viewportPan, setViewportPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Map configuration lookups
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const variableMap = useMemo(() => new Map(variables.map(v => [v.id, v])), [variables]);

  // Translate coordinates to percentage within our stylized France viewport
  // France approximate coordinates bbox: Longitude [-5.5, 9.8], Latitude [41.0, 51.2]
  const getXY = (latStr: string, lngStr: string) => {
    const lat = parseFloat(latStr) || 48.8566;
    const lng = parseFloat(lngStr) || 2.3522;

    const minLat = 41.0;
    const maxLat = 51.2;
    const minLng = -5.5;
    const maxLng = 9.8;

    // Convert to percentage
    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = (1 - (lat - minLat) / (maxLat - minLat)) * 100;

    return { x, y };
  };

  // Filter plotted defibrillators
  const filteredPlotted = useMemo(() => {
    return defibrillateurs.filter(df => {
      const clientName = clientMap.get(df.clientId)?.denomination || '';
      const modelName = variableMap.get(df.modeleId)?.nom || '';
      const query = mapSearch.toLowerCase();
      return (
        (df.identifiant || '').toLowerCase().includes(query) ||
        (df.numeroSerie || '').toLowerCase().includes(query) ||
        (df.ville || '').toLowerCase().includes(query) ||
        (df.region || '').toLowerCase().includes(query) ||
        clientName.toLowerCase().includes(query) ||
        modelName.toLowerCase().includes(query)
      );
    });
  }, [defibrillateurs, mapSearch, clientMap, variableMap]);

  if (!isOpen) return null;

  const currentSelected = defibrillateurs.find(df => df.id === selectedDefibId);
  const activeClientName = currentSelected ? clientMap.get(currentSelected.clientId)?.denomination : '';
  const activeModelName = currentSelected ? variableMap.get(currentSelected.modeleId)?.nom : '';

  // Viewport Zoom handlers
  const handleZoomIn = () => setViewportZoom(z => Math.min(z + 0.3, 3));
  const handleZoomOut = () => setViewportZoom(z => Math.max(z - 0.3, 0.8));
  const handleResetViewport = () => {
    setViewportZoom(1);
    setViewportPan({ x: 0, y: 0 });
  };

  // Viewport dragging handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - viewportPan.x, y: e.clientY - viewportPan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setViewportPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Focus directly on a device coordinate point
  const handleFocusOnDevice = (dfId: string, lat: string, lng: string) => {
    setSelectedDefibId(dfId);
    
    // Smooth centering conversion
    const latVal = parseFloat(lat) || 48.8566;
    const lngVal = parseFloat(lng) || 2.3522;
    const pt = getXY(latVal.toString(), lngVal.toString());

    // Calculate centering offsets for a 100% relative coordinates container
    // Place point in the center of the viewport
    setViewportZoom(1.8);
    // Approximate translation to center the point (each percent corresponds to map size equivalent)
    // Map SVG is roughly 500px wide. Centering on coord %:
    const offsetX = (50 - pt.x) * 4.5;
    const offsetY = (50 - pt.y) * 4.5;
    setViewportPan({ x: offsetX, y: offsetY });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6" id="map-modal-overlay">
      <div className="bg-white w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200" id="map-modal-dialog">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
              <Compass className="w-6 h-6 text-indigo-600 animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800 tracking-tight font-gochi">Cartographie des Équipements</h3>
              <p className="text-xs text-slate-500">Localisation géographique & statut opérationnel de vos parcs ({filteredPlotted.length} affichés)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Grid */}
        <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden">
          
          {/* Map Area */}
          <div className="flex-1 bg-slate-950 relative overflow-hidden select-none flex flex-col">
            
            {/* Visual Grid Lines Overlay for premium GIS look */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            
            {/* Lat/Long borders metrics */}
            <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-slate-400 font-mono text-[10px] px-2.5 py-1.5 rounded-lg border border-slate-800 space-y-0.5 pointer-events-none z-10 shadow-lg">
              <div>GEO: France (BETA)</div>
              <div>BBox: [-5.5W , 9.8E] [41.0S , 51.2N]</div>
              {currentSelected && (
                <div className="text-indigo-400 font-semibold">Active: [{currentSelected.latitude}, {currentSelected.longitude}]</div>
              )}
            </div>

            {/* Map Controls */}
            <div className="absolute bottom-4 right-4 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-800 flex flex-col gap-1 z-10 shadow-xl">
              <button
                onClick={handleZoomIn}
                title="Zoomer (+)"
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleZoomOut}
                title="Dézoomer (-)"
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetViewport}
                title="Réinitialiser la vue"
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer border-t border-slate-800"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Floating Info Help */}
            <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] text-slate-400 flex items-center gap-1.5 pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Conforme
              <span className="w-2 h-2 rounded-full bg-rose-500 ml-1.5"></span> Non conforme / Alerte
            </div>

            {/* Interactive Vector Map Screen Canvas */}
            <div
              className={`flex-1 relative w-full h-full flex items-center justify-center cursor-move transition-transform duration-100 ease-out`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                transform: `scale(${viewportZoom}) translate(${viewportPan.x / viewportZoom}px, ${viewportPan.y / viewportZoom}px)`,
                transformOrigin: 'center center'
              }}
            >
              {/* FRANCE CARTOGRAPHIC SVG WRAPPER */}
              <div className="w-[500px] h-[500px] relative flex items-center justify-center">
                
                {/* France Visual Stylized Polygonal Contour Backing */}
                <svg
                  viewBox="0 0 100 100"
                  className="w-full h-full text-slate-800/80 fill-slate-900/90 [stroke-linejoin:round]"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Grid Lines */}
                  <line x1="10" y1="0" x2="10" y2="100" stroke="#334155" strokeWidth="0.1" strokeDasharray="1,1" />
                  <line x1="30" y1="0" x2="30" y2="100" stroke="#334155" strokeWidth="0.1" strokeDasharray="1,1" />
                  <line x1="50" y1="0" x2="50" y2="100" stroke="#334155" strokeWidth="0.1" strokeDasharray="1,1" />
                  <line x1="70" y1="0" x2="70" y2="100" stroke="#334155" strokeWidth="0.1" strokeDasharray="1,1" />
                  <line x1="90" y1="0" x2="90" y2="100" stroke="#334155" strokeWidth="0.1" strokeDasharray="1,1" />

                  <line x1="0" y1="20" x2="100" y2="20" stroke="#334155" strokeWidth="0.1" strokeDasharray="1,1" />
                  <line x1="0" y1="40" x2="100" y2="40" stroke="#334155" strokeWidth="0.1" strokeDasharray="1,1" />
                  <line x1="0" y1="60" x2="100" y2="60" stroke="#334155" strokeWidth="0.1" strokeDasharray="1,1" />
                  <line x1="0" y1="80" x2="100" y2="80" stroke="#334155" strokeWidth="0.1" strokeDasharray="1,1" />

                  {/* High Quality Stylized hexagon/coastline boundary of mainland France */}
                  <polygon
                    points="
                      37,5     45,3     53,4     62,9     66,13    72,13    76,17    
                      73,26    79,32    84,27    86,30    85,38    95,49    93,54    
                      96,57    88,61    86,67    88,71    84,78    86,83    80,82    
                      75,85    66,81    55,87    52,86    50,91    48,93    46,92    
                      45,86    41,85    38,82    32,82    26,86    22,81    12,81    
                      15,75    11,74    13,70    19,69    19,60    15,55    10,54    
                      11,46    3,46     1,43     6,38     4,34     9,32     16,34    
                      21,30    23,20    26,17    31,17    32,12    37,12    37,5
                    "
                    stroke="#475569"
                    strokeWidth="0.6"
                    className="transition-colors duration-250 cursor-pointer hover:fill-slate-900"
                  />
                  
                  {/* Corsica Island Polygon */}
                  <polygon
                    points="88,88 91,85 91,91 90,94 87,93"
                    stroke="#475569"
                    strokeWidth="0.6"
                  />
                </svg>

                {/* Major Anchor Cities on French map */}
                {ANCHOR_CITIES.map(city => {
                  const pt = getXY(city.lat.toString(), city.lng.toString());
                  return (
                    <div
                      key={city.name}
                      style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
                    >
                      <span className="w-1.5 h-1.5 bg-slate-700 rounded-full"></span>
                      <span className="text-[7px] text-slate-500 font-mono scale-[0.8] tracking-tight">{city.name}</span>
                    </div>
                  );
                })}

                {/* Plotted Active Defibrillator Pins */}
                {filteredPlotted.map(df => {
                  const pt = getXY(df.latitude, df.longitude);
                  const isSelected = df.id === selectedDefibId;
                  const isConforme = df.conforme === 'Oui';
                  
                  return (
                    <button
                      key={df.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDefibId(df.id);
                      }}
                      style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 group z-20 flex items-center justify-center transition-all ${
                        isSelected ? 'scale-125' : 'hover:scale-115'
                      }`}
                      title={`${df.identifiant} - ${df.ville}`}
                    >
                      {/* Pulse circle for selected */}
                      {isSelected && (
                        <span className={`absolute -inset-2.5 rounded-full animate-ping opacity-35 ${
                          isConforme ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}></span>
                      )}

                      {/* Pin Container */}
                      <span className={`w-4 h-4 rounded-full border-2 bg-slate-900 flex items-center justify-center shadow-lg transition-transform ${
                        isSelected 
                          ? (isConforme ? 'border-emerald-400 bg-emerald-550' : 'border-rose-400 bg-rose-550')
                          : (isConforme ? 'border-emerald-500/80' : 'border-rose-550/80')
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isConforme ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                      </span>

                      {/* Micro floating Identifier label */}
                      <span className={`absolute top-5 bg-slate-950/90 text-white font-bold font-sans text-[8px] px-1 py-0.5 rounded-sm whitespace-nowrap border border-slate-700 transition-opacity ${
                        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}>
                        {df.identifiant}
                      </span>
                    </button>
                  );
                })}

              </div>

            </div>

          </div>

          {/* Sidebar - list of sites and selected item details */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-200 flex flex-col bg-slate-50 overflow-hidden" id="map-modal-sidebar">
            
            {/* SEARCH */}
            <div className="p-4 border-b border-slate-200 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={mapSearch}
                  onChange={(e) => setMapSearch(e.target.value)}
                  placeholder="Rechercher sur la carte..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            {/* List scroll panel */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredPlotted.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Aucun défibrillateur ne correspond à votre recherche sur la carte.
                </div>
              ) : (
                filteredPlotted.map(df => {
                  const isSelected = df.id === selectedDefibId;
                  const isConforme = df.conforme === 'Oui';
                  const cl = clientMap.get(df.clientId);

                  return (
                    <button
                      key={df.id}
                      onClick={() => handleFocusOnDevice(df.id, df.latitude, df.longitude)}
                      className={`w-full p-3 text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-50/70 border-l-4 border-indigo-600 pl-2' 
                          : 'hover:bg-slate-100/50'
                      }`}
                    >
                      <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${isConforme ? 'text-emerald-500' : 'text-rose-500'}`} />
                      
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 justify-between">
                          <span className="font-bold text-xs text-slate-800 font-mono">{df.identifiant}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                            isConforme ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {isConforme ? 'Conforme' : 'Alerte'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 font-semibold truncate mt-0.5">{cl?.denomination || 'Client Inconnu'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{df.ville} ({df.region})</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* SELECTED EQUIPMENT CARD DETAILS PANEL */}
            {currentSelected ? (
              <div className="p-4 border-t border-slate-200 bg-white space-y-3">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 relative">
                  <div className="absolute top-2 right-2 flex items-center justify-center">
                    <span className={`w-2.5 h-2.5 rounded-full ${currentSelected.conforme === 'Oui' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  </div>

                  <div className="text-[11px] text-indigo-600 font-mono font-bold tracking-tight uppercase">Fiche Technique Rapide</div>
                  <h4 className="text-sm font-bold text-slate-800 font-mono mt-1">{currentSelected.identifiant}</h4>
                  
                  {/* Model */}
                  {activeModelName && (
                    <p className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">{activeModelName}</p>
                  )}

                  <hr className="my-2 border-slate-200/80" />

                  {/* Address info */}
                  <div className="space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-start gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span className="truncate" title={activeClientName}>{activeClientName}</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                      <span className="truncate">{currentSelected.numVoie ? `${currentSelected.numVoie}, ` : ''}{currentSelected.ville}</span>
                    </div>

                    {/* Battery status */}
                    <div className="flex items-center gap-2 pt-1.5">
                      <Battery className={`w-4 h-4 shrink-0 ${
                        parseInt(currentSelected.pourcentageBatterie || '100') < 20 ? 'text-rose-500' : 'text-emerald-500'
                      }`} />
                      <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            parseInt(currentSelected.pourcentageBatterie || '100') < 20 ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${currentSelected.pourcentageBatterie || '100'}%` }}
                        ></div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500">{currentSelected.pourcentageBatterie || '100'}%</span>
                    </div>
                  </div>
                </div>

                {/* Helper action hint */}
                <p className="text-[10px] text-slate-400 text-center italic">
                  Utilisez les contrôles de zoom pour naviguer ou cliquez sur un marqueur.
                </p>
              </div>
            ) : (
              <div className="p-4 border-t border-slate-200 bg-white text-center text-xs text-slate-400">
                Aucun appareil sélectionné.
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
