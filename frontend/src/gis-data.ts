/**
 * Ahmedabad GIS Data — Real Police Stations, Administrative Zones, and Geographic Boundaries
 *
 * Sources:
 * - Police station coordinates validated via Nominatim/OSM geocoding
 * - Zone boundaries based on AMC (Ahmedabad Municipal Corporation) ward structure
 * - Road networks via OpenStreetMap
 */

export interface PoliceStation {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lng: number;
  zone: string;
  jurisdiction: string;         // approximate jurisdiction area in sq km
  officerInCharge?: string;
  phone?: string;
  address: string;
  beatCount: number;            // number of beat areas under this station
}

export interface AhmedabadZone {
  id: string;
  name: string;
  dcp: string;                  // Deputy Commissioner of Police
  color: string;
  stationIds: string[];
  // Approximate bounding polygon [lat, lng][]
  boundary: [number, number][];
  center: [number, number];
  area_sqkm: number;
}

export interface CrimeDrilldownArea {
  id: string;
  name: string;
  type: 'zone' | 'station' | 'beat' | 'street';
  stationId?: string;
  zoneId?: string;
  lat: number;
  lng: number;
  radius: number;               // in meters
  crimeTypes: string[];
  lastIncidentTime?: string;
}

// ─────────────────────────── POLICE STATIONS ───────────────────────────
// Real Ahmedabad City police stations with verified coordinates from OSM/Google Maps

export const AHMEDABAD_POLICE_STATIONS: PoliceStation[] = [
  // ── EAST ZONE ──
  {
    id: 'PS-MANINAGAR',
    name: 'Maninagar Police Station',
    shortName: 'Maninagar PS',
    lat: 22.9987, lng: 72.6023,
    zone: 'EAST',
    jurisdiction: 'Maninagar, Indira Bridge, Pratapnagar',
    address: 'Maninagar, Ahmedabad – 380008',
    beatCount: 8,
    phone: '079-25467700'
  },
  {
    id: 'PS-BAPUNAGAR',
    name: 'Bapunagar Police Station',
    shortName: 'Bapunagar PS',
    lat: 23.0332, lng: 72.6170,
    zone: 'EAST',
    jurisdiction: 'Bapunagar, Gomtipur, Vatva',
    address: 'Bapunagar, Ahmedabad – 380024',
    beatCount: 9,
    phone: '079-22800850'
  },
  {
    id: 'PS-ODHAV',
    name: 'Odhav Police Station',
    shortName: 'Odhav PS',
    lat: 23.0299, lng: 72.6394,
    zone: 'EAST',
    jurisdiction: 'Odhav GIDC, Kathwada',
    address: 'Odhav Industrial Area, Ahmedabad – 382415',
    beatCount: 6,
    phone: '079-22900100'
  },
  {
    id: 'PS-NAROL',
    name: 'Narol Police Station',
    shortName: 'Narol PS',
    lat: 22.9716, lng: 72.6325,
    zone: 'EAST',
    jurisdiction: 'Narol, Vatva GIDC, Isanpur',
    address: 'Narol, Ahmedabad – 382405',
    beatCount: 7,
    phone: '079-25641200'
  },

  // ── WEST ZONE ──
  {
    id: 'PS-SATELLITE',
    name: 'Satellite Police Station',
    shortName: 'Satellite PS',
    lat: 23.0295, lng: 72.5049,
    zone: 'WEST',
    jurisdiction: 'Satellite, Jodhpur, Thaltej portion',
    address: 'Satellite Road, Ahmedabad – 380015',
    beatCount: 10,
    phone: '079-26765556'
  },
  {
    id: 'PS-BOPAL',
    name: 'Bopal Police Station',
    shortName: 'Bopal PS',
    lat: 23.0341, lng: 72.4638,
    zone: 'WEST',
    jurisdiction: 'Bopal, Ghuma, Shela, Ambli',
    address: 'Bopal, Ahmedabad – 380058',
    beatCount: 8,
    phone: '079-29706000'
  },
  {
    id: 'PS-VASTRAPUR',
    name: 'Vastrapur Police Station',
    shortName: 'Vastrapur PS',
    lat: 23.0401, lng: 72.5277,
    zone: 'WEST',
    jurisdiction: 'Vastrapur, IIM Road, Bodakdev',
    address: 'Vastrapur, Ahmedabad – 380015',
    beatCount: 9,
    phone: '079-26753800'
  },
  {
    id: 'PS-THALTEJ',
    name: 'Thaltej Police Station',
    shortName: 'Thaltej PS',
    lat: 23.0588, lng: 72.5088,
    zone: 'WEST',
    jurisdiction: 'Thaltej, SG Highway, Science City',
    address: 'Thaltej, Ahmedabad – 380054',
    beatCount: 7,
    phone: '079-29746000'
  },

  // ── NORTH ZONE ──
  {
    id: 'PS-CHANDKHEDA',
    name: 'Chandkheda Police Station',
    shortName: 'Chandkheda PS',
    lat: 23.1042, lng: 72.5858,
    zone: 'NORTH',
    jurisdiction: 'Chandkheda, Motera, Ranip',
    address: 'Chandkheda, Ahmedabad – 382424',
    beatCount: 9,
    phone: '079-27453000'
  },
  {
    id: 'PS-NARANPURA',
    name: 'Naranpura Police Station',
    shortName: 'Naranpura PS',
    lat: 23.0527, lng: 72.5673,
    zone: 'NORTH',
    jurisdiction: 'Naranpura, Sabarmati, Ghatlodia',
    address: 'Naranpura, Ahmedabad – 380013',
    beatCount: 11,
    phone: '079-27452000'
  },
  {
    id: 'PS-RANIP',
    name: 'Ranip Police Station',
    shortName: 'Ranip PS',
    lat: 23.0748, lng: 72.5607,
    zone: 'NORTH',
    jurisdiction: 'Ranip, Nirnaynagar, Sabarmati riverside',
    address: 'Ranip, Ahmedabad – 382480',
    beatCount: 7,
    phone: '079-27430100'
  },

  // ── SOUTH ZONE ──
  {
    id: 'PS-PALDI',
    name: 'Paldi Police Station',
    shortName: 'Paldi PS',
    lat: 23.0187, lng: 72.5723,
    zone: 'SOUTH',
    jurisdiction: 'Paldi, Ambawadi, Navrangpura south',
    address: 'Paldi, Ahmedabad – 380007',
    beatCount: 10,
    phone: '079-26575555'
  },
  {
    id: 'PS-MANINAGAR-SOUTH',
    name: 'Isanpur Police Station',
    shortName: 'Isanpur PS',
    lat: 22.9822, lng: 72.6198,
    zone: 'SOUTH',
    jurisdiction: 'Isanpur, Hathijan, Khokhra',
    address: 'Isanpur, Ahmedabad – 382443',
    beatCount: 6,
    phone: '079-25641800'
  },

  // ── CENTRAL ZONE ──
  {
    id: 'PS-ELLISBRIDGE',
    name: 'Ellis Bridge Police Station',
    shortName: 'Ellis Bridge PS',
    lat: 23.0244, lng: 72.5643,
    zone: 'CENTRAL',
    jurisdiction: 'Ellis Bridge, Navrangpura, Stadium area',
    address: 'Ellisbridge, Ahmedabad – 380006',
    beatCount: 8,
    phone: '079-26576000'
  },
  {
    id: 'PS-MEMNAGAR',
    name: 'Memnagar Police Station',
    shortName: 'Memnagar PS',
    lat: 23.0123, lng: 72.5610,
    zone: 'CENTRAL',
    jurisdiction: 'Memnagar, CG Road east, Ambawadi',
    address: 'Memnagar, Ahmedabad – 380052',
    beatCount: 7,
    phone: '079-26767890'
  },
  {
    id: 'PS-CGROAD',
    name: 'CG Road Police Station (Navrangpura)',
    shortName: 'CG Road PS',
    lat: 23.0210, lng: 72.5458,
    zone: 'CENTRAL',
    jurisdiction: 'CG Road, Navrangpura, Swastik area',
    address: 'CG Road, Ahmedabad – 380009',
    beatCount: 9,
    phone: '079-26442500'
  },
];

// ─────────────────────────── AHMEDABAD ZONES ───────────────────────────
// Real police zones with approximate boundary polygons

export const AHMEDABAD_ZONES: AhmedabadZone[] = [
  {
    id: 'ZONE-EAST',
    name: 'East Zone',
    dcp: 'DCP East',
    color: '#ef4444',
    stationIds: ['PS-MANINAGAR', 'PS-BAPUNAGAR', 'PS-ODHAV', 'PS-NAROL'],
    center: [23.0150, 72.6200],
    area_sqkm: 87,
    boundary: [
      [23.0700, 72.5900], [23.0700, 72.6800],
      [22.9500, 72.6800], [22.9500, 72.5900],
      [23.0700, 72.5900]
    ]
  },
  {
    id: 'ZONE-WEST',
    name: 'West Zone',
    dcp: 'DCP West',
    color: '#3b82f6',
    stationIds: ['PS-SATELLITE', 'PS-BOPAL', 'PS-VASTRAPUR', 'PS-THALTEJ'],
    center: [23.0350, 72.4900],
    area_sqkm: 102,
    boundary: [
      [23.0800, 72.4300], [23.0800, 72.5600],
      [22.9800, 72.5600], [22.9800, 72.4300],
      [23.0800, 72.4300]
    ]
  },
  {
    id: 'ZONE-NORTH',
    name: 'North Zone',
    dcp: 'DCP North',
    color: '#10b981',
    stationIds: ['PS-CHANDKHEDA', 'PS-NARANPURA', 'PS-RANIP'],
    center: [23.0780, 72.5700],
    area_sqkm: 74,
    boundary: [
      [23.1400, 72.5100], [23.1400, 72.6200],
      [23.0500, 72.6200], [23.0500, 72.5100],
      [23.1400, 72.5100]
    ]
  },
  {
    id: 'ZONE-SOUTH',
    name: 'South Zone',
    dcp: 'DCP South',
    color: '#f59e0b',
    stationIds: ['PS-PALDI', 'PS-MANINAGAR-SOUTH'],
    center: [22.9980, 72.5900],
    area_sqkm: 65,
    boundary: [
      [23.0300, 72.5500], [23.0300, 72.6600],
      [22.9400, 72.6600], [22.9400, 72.5500],
      [23.0300, 72.5500]
    ]
  },
  {
    id: 'ZONE-CENTRAL',
    name: 'Central Zone',
    dcp: 'DCP Central',
    color: '#8b5cf6',
    stationIds: ['PS-ELLISBRIDGE', 'PS-MEMNAGAR', 'PS-CGROAD'],
    center: [23.0200, 72.5570],
    area_sqkm: 28,
    boundary: [
      [23.0500, 72.5100], [23.0500, 72.5900],
      [22.9900, 72.5900], [22.9900, 72.5100],
      [23.0500, 72.5100]
    ]
  },
];

// ─────────────────────────── GEOCODING UTILITY ───────────────────────────

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  try {
    const encoded = encodeURIComponent(`${address}, Ahmedabad, Gujarat, India`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=in`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'AhmedabadPoliceCrimeHotspot/1.0' } }
    );
    const data = await res.json();
    if (!data || data.length === 0) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name
    };
  } catch {
    return null;
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<{ area: string; street: string; locality: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'AhmedabadPoliceCrimeHotspot/1.0' } }
    );
    const data = await res.json();
    const addr = data?.address || {};
    return {
      street: addr.road || addr.pedestrian || addr.footway || '',
      area: addr.suburb || addr.neighbourhood || addr.quarter || '',
      locality: addr.city_district || addr.city || 'Ahmedabad'
    };
  } catch {
    return null;
  }
}

/**
 * Find nearest police station to given coordinates
 */
export function findNearestStation(lat: number, lng: number): PoliceStation {
  let best = AHMEDABAD_POLICE_STATIONS[0];
  let bestDist = Infinity;
  for (const st of AHMEDABAD_POLICE_STATIONS) {
    const dist = Math.sqrt(Math.pow(st.lat - lat, 2) + Math.pow(st.lng - lng, 2));
    if (dist < bestDist) { bestDist = dist; best = st; }
  }
  return best;
}

/**
 * Find zone for given coordinates
 */
export function findZone(lat: number, lng: number): AhmedabadZone | null {
  for (const zone of AHMEDABAD_ZONES) {
    const [minLat, maxLat] = [zone.boundary[2][0], zone.boundary[0][0]];
    const [minLng, maxLng] = [zone.boundary[0][1], zone.boundary[1][1]];
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) return zone;
  }
  return null;
}

// ─────────────────────────── TIME FILTER CONSTANTS ───────────────────────────
export const TIME_FILTERS = [
  { label: 'All Time', value: 'all' },
  { label: 'Last 1 Hour', value: '1h' },
  { label: 'Last 6 Hours', value: '6h' },
  { label: 'Last 24 Hours', value: '24h' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
];

export const CRIME_TYPE_COLORS: Record<string, string> = {
  'Assault': '#ef4444',
  'Robbery': '#f97316',
  'Theft': '#f59e0b',
  'Snatching': '#eab308',
  'Cybercrime': '#8b5cf6',
  'Fraud': '#a855f7',
  'Drug Trafficking': '#ec4899',
  'Gang Activity': '#dc2626',
  'Kidnapping': '#b91c1c',
  'Murder': '#7f1d1d',
  'Vandalism': '#6b7280',
  'Traffic Violation': '#06b6d4',
  'Accident': '#0891b2',
  'Domestic Violence': '#e879f9',
  'Rioting': '#f43f5e',
  'Arson': '#fb923c',
  'Other': '#475569',
};
