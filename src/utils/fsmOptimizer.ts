// FSM Routing and Schedule Optimizer

export interface Coordinate {
  lat: number;
  lng: number;
}

// Memory cache for geocoded starting addresses to keep client responsive and avoid redundant network calls
const geocodeCache: Record<string, Coordinate> = {};

/**
 * Fetches the coordinates of a French address using the free, official and CORS-friendly French Government Address API.
 */
export async function geocodeAddress(address: string): Promise<Coordinate | null> {
  if (!address || address.trim() === '') return null;
  const cleaned = address.trim();
  if (geocodeCache[cleaned]) {
    return geocodeCache[cleaned];
  }

  try {
    const response = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(cleaned)}&limit=1`
    );
    if (!response.ok) throw new Error('Geocoding response not ok');
    const data = await response.json();
    if (data?.features?.[0]?.geometry?.coordinates) {
      const [lng, lat] = data.features[0].geometry.coordinates;
      const coord = { lat, lng };
      geocodeCache[cleaned] = coord;
      return coord;
    }
  } catch (error) {
    console.error('Failed to geocode address:', cleaned, error);
  }
  return null;
}

/**
 * Calculates the Haversine distance between two coordinates in kilometers.
 */
export function getHaversineDistance(c1: Coordinate, c2: Coordinate): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Orders missions using a Nearest-Neighbor Traveling Salesperson algorithm.
 * Starts from the technician's start address and proceeds point-by-point,
 * sorting either by closest (proche) or furthest (loin).
 */
export function sortMissionsByProximity(
  missions: any[],
  startCoord: Coordinate,
  equipmentCoords: Record<string, Coordinate>,
  preference: 'loin' | 'proche' = 'proche'
): any[] {
  if (missions.length === 0) return [];

  const unvisited = [...missions];
  const ordered: any[] = [];
  let currentCoord = startCoord;

  while (unvisited.length > 0) {
    let selectedIdx = -1;
    let selectedDist = preference === 'loin' ? -1 : Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const m = unvisited[i];
      const coord = equipmentCoords[m.defibIdentifiant] || { lat: 48.8566, lng: 2.3522 }; // Fallback to Paris if coords missing
      const dist = getHaversineDistance(currentCoord, coord);

      if (preference === 'loin') {
        if (dist > selectedDist) {
          selectedDist = dist;
          selectedIdx = i;
        }
      } else {
        if (dist < selectedDist) {
          selectedDist = dist;
          selectedIdx = i;
        }
      }
    }

    if (selectedIdx !== -1) {
      const [chosenMission] = unvisited.splice(selectedIdx, 1);
      ordered.push(chosenMission);
      currentCoord = equipmentCoords[chosenMission.defibIdentifiant] || currentCoord;
    } else {
      // Safeguard
      ordered.push(...unvisited);
      break;
    }
  }

  return ordered;
}

/**
 * Utility to parse time slot like "14:00pm" or "8:30am" into total minutes from midnight.
 */
function parseSlotToMinutes(slot: string): number {
  if (!slot) return 480; // Default to 08:00
  const match = slot.match(/^(\d+):(\d+)(am|pm)$/i);
  if (!match) return 480;
  const hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  return hour * 60 + minute;
}

/**
 * Utility to format minutes from midnight into slot strings matching option values (e.g., "14:00pm" or "8:30am").
 */
function formatMinutesToSlot(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const mm = m < 30 ? '00' : '30';
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${h}:${mm}${suffix}`;
}

/**
 * Formats a Date object to "YYYY-MM-DD".
 */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Increments a Date object by 1 day.
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

const FRENCH_DAYS = [
  'Dimanche', // 0
  'Lundi',    // 1
  'Mardi',    // 2
  'Mercredi', // 3
  'Jeudi',    // 4
  'Vendredi', // 5
  'Samedi'    // 6
];

function parseTimeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

function getEquipmentIntervals(date: Date, eq: any): { start: number; end: number }[] {
  if (!eq) {
    // Default standard workday: 08:00 to 18:00
    return [{ start: 480, end: 1080 }];
  }

  // 1. Parse schedules if present
  let parsedSchedules: any[] = [];
  if (eq.horaires) {
    try {
      parsedSchedules = JSON.parse(eq.horaires);
    } catch (e) {
      parsedSchedules = [];
    }
  }

  const hasDefinedSchedules = Array.isArray(parsedSchedules) && parsedSchedules.some((s: any) => s.days && s.days.length > 0);

  if (hasDefinedSchedules) {
    const dayName = FRENCH_DAYS[date.getDay()];
    const todaySchedule = parsedSchedules.find((s: any) => s.days && s.days.includes(dayName));
    if (!todaySchedule) {
      return []; // Closed on this day
    }

    if (todaySchedule.fermetureMidi) {
      const intervals = [];
      const openMorning = parseTimeStringToMinutes(todaySchedule.openMorning || '09:00');
      const closeMorning = parseTimeStringToMinutes(todaySchedule.closeMorning || '12:00');
      const openAfternoon = parseTimeStringToMinutes(todaySchedule.openAfternoon || '14:00');
      const closeAfternoon = parseTimeStringToMinutes(todaySchedule.closeAfternoon || '18:00');

      if (closeMorning > openMorning) {
        intervals.push({ start: openMorning, end: closeMorning });
      }
      if (closeAfternoon > openAfternoon) {
        intervals.push({ start: openAfternoon, end: closeAfternoon });
      }
      return intervals;
    } else {
      const openContinuous = parseTimeStringToMinutes(todaySchedule.openContinuous || '09:00');
      const closeContinuous = parseTimeStringToMinutes(todaySchedule.closeContinuous || '17:00');
      if (closeContinuous > openContinuous) {
        return [{ start: openContinuous, end: closeContinuous }];
      }
      return [];
    }
  }

  // 2. Fallback to basic week/weekend/24/7 flags
  const day = date.getDay();
  const isWeekend = day === 0 || day === 6;

  let isOpen = false;
  if (eq.acces247 === true) {
    isOpen = true;
  } else if (isWeekend) {
    isOpen = eq.accesWeekend === true;
  } else {
    isOpen = eq.accesSemaine === true || eq.accesSemaine === undefined;
  }

  if (isOpen) {
    // Default to technician standard hours: 08:00 to 18:00
    return [{ start: 480, end: 1080 }];
  }

  return [];
}

function getTechnicianIntervals(date: Date, tech: any): { start: number; end: number }[] {
  if (!tech || !tech.semaineTypique || !Array.isArray(tech.semaineTypique) || tech.semaineTypique.length === 0) {
    // Default standard workday: 08:00 to 18:00 (480 to 1080)
    return [{ start: 480, end: 1080 }];
  }

  const dayName = FRENCH_DAYS[date.getDay()];
  const todaySchedule = tech.semaineTypique.find((s: any) => s.days && s.days.includes(dayName));
  if (!todaySchedule) {
    return []; // Closed/Off on this day
  }

  if (todaySchedule.fermetureMidi) {
    const intervals = [];
    const openMorning = parseTimeStringToMinutes(todaySchedule.openMorning || '08:00');
    const closeMorning = parseTimeStringToMinutes(todaySchedule.closeMorning || '12:00');
    const openAfternoon = parseTimeStringToMinutes(todaySchedule.openAfternoon || '14:00');
    const closeAfternoon = parseTimeStringToMinutes(todaySchedule.closeAfternoon || '18:00');

    if (closeMorning > openMorning) {
      intervals.push({ start: openMorning, end: closeMorning });
    }
    if (closeAfternoon > openAfternoon) {
      intervals.push({ start: openAfternoon, end: closeAfternoon });
    }
    return intervals;
  } else {
    const openContinuous = parseTimeStringToMinutes(todaySchedule.openContinuous || '08:00');
    const closeContinuous = parseTimeStringToMinutes(todaySchedule.closeContinuous || '18:00');
    if (closeContinuous > openContinuous) {
      return [{ start: openContinuous, end: closeContinuous }];
    }
    return [];
  }
}

function getOverlappingIntervals(date: Date, eq: any, tech?: any): { start: number; end: number }[] {
  const eqIntervals = getEquipmentIntervals(date, eq);
  const techIntervals = getTechnicianIntervals(date, tech);

  const overlaps: { start: number; end: number }[] = [];
  for (const eqInt of eqIntervals) {
    for (const techInt of techIntervals) {
      const start = Math.max(eqInt.start, techInt.start);
      const end = Math.min(eqInt.end, techInt.end);
      if (end > start) {
        overlaps.push({ start, end });
      }
    }
  }
  return overlaps;
}

/**
 * Determines if the given day of the week conforms to the opening/access rules.
 * Day of week: 0 = Sunday, 6 = Saturday, 1-5 = Monday-Friday.
 */
function isDateOpenForEquipment(date: Date, eq: any, tech?: any): boolean {
  return getOverlappingIntervals(date, eq, tech).length > 0;
}

/**
 * Auto-schedules optimized tour missions sequentially.
 * Allocates 1h15 (75 minutes) per mission.
 * Standard workhours: 08:00 to 18:00.
 * If manual overrides exist on date or slot, respects them and updates the scheduling cursor!
 */
export function scheduleMissions(
  missions: any[],
  tourStartDate: string,
  equipmentDetails: Record<string, any>,
  tech?: any
): any[] {
  // Base date cursor
  let currentCursorDate = new Date(tourStartDate || new Date().toISOString().split('T')[0]);
  if (isNaN(currentCursorDate.getTime())) {
    currentCursorDate = new Date();
  }
  
  let currentCursorMinutes = 0; // Start at midnight, naturally matching earliest work interval of the day

  return missions.map((m) => {
    const eq = equipmentDetails[m.defibIdentifiant];

    // If both date AND slot are manually forced, we jump our cursor to that time
    if (m.isManualDate && m.isManualSlot && m.estimatedDate && m.estimatedSlot) {
      currentCursorDate = new Date(m.estimatedDate);
      if (isNaN(currentCursorDate.getTime())) {
        currentCursorDate = new Date(tourStartDate);
      }
      currentCursorMinutes = parseSlotToMinutes(m.estimatedSlot);

      // End time of this forced mission is +75 minutes
      const endMinutes = currentCursorMinutes + 75;
      currentCursorMinutes = endMinutes;
      if (currentCursorMinutes >= 1440) {
        currentCursorDate = addDays(currentCursorDate, 1);
        currentCursorMinutes = 0;
      }
      return {
        ...m,
        estimatedDate: m.estimatedDate,
        estimatedSlot: m.estimatedSlot,
      };
    }

    // If ONLY date is manually forced, we jump date cursor and schedule slot automatically
    if (m.isManualDate && m.estimatedDate) {
      currentCursorDate = new Date(m.estimatedDate);
      if (isNaN(currentCursorDate.getTime())) {
        currentCursorDate = new Date(tourStartDate);
      }
      // Schedule slot on this date or roll forward if closed
      let assignedStartMinutesForcedDate = 0;
      while (true) {
        const intervals = getOverlappingIntervals(currentCursorDate, eq, tech);
        let found = false;
        for (const interval of intervals) {
          const candidateStart = Math.max(currentCursorMinutes, interval.start);
          if (candidateStart + 75 <= interval.end) {
            assignedStartMinutesForcedDate = candidateStart;
            found = true;
            break;
          }
        }
        if (found) {
          break;
        }
        currentCursorDate = addDays(currentCursorDate, 1);
        currentCursorMinutes = 0;
      }

      const slot = formatMinutesToSlot(assignedStartMinutesForcedDate);
      currentCursorMinutes = assignedStartMinutesForcedDate + 75;
      if (currentCursorMinutes >= 1440) {
        currentCursorDate = addDays(currentCursorDate, 1);
        currentCursorMinutes = 0;
      }
      return {
        ...m,
        estimatedDate: formatDate(currentCursorDate),
        estimatedSlot: slot,
      };
    }

    // If ONLY slot is manually forced, we keep current date cursor (if open) and use that slot
    if (m.isManualSlot && m.estimatedSlot) {
      const targetSlotMinutes = parseSlotToMinutes(m.estimatedSlot);
      while (true) {
        const intervals = getOverlappingIntervals(currentCursorDate, eq, tech);
        const foundInterval = intervals.find(interval => 
          targetSlotMinutes >= interval.start && (targetSlotMinutes + 75) <= interval.end
        );
        if (foundInterval) {
          break;
        }
        currentCursorDate = addDays(currentCursorDate, 1);
        currentCursorMinutes = 0;
      }
      const dateStr = formatDate(currentCursorDate);
      currentCursorMinutes = targetSlotMinutes + 75;
      if (currentCursorMinutes >= 1440) {
        currentCursorDate = addDays(currentCursorDate, 1);
        currentCursorMinutes = 0;
      }
      return {
        ...m,
        estimatedDate: dateStr,
        estimatedSlot: m.estimatedSlot,
      };
    }

    // Regular Auto-Scheduling: sequential 1h15 slots matching open hours & days for both equipment & technician
    let assignedStartMinutes = 0;
    while (true) {
      const intervals = getOverlappingIntervals(currentCursorDate, eq, tech);
      let found = false;
      for (const interval of intervals) {
        const candidateStart = Math.max(currentCursorMinutes, interval.start);
        if (candidateStart + 75 <= interval.end) {
          assignedStartMinutes = candidateStart;
          found = true;
          break;
        }
      }
      if (found) {
        break;
      }
      // Rollover to next day at 00:00
      currentCursorDate = addDays(currentCursorDate, 1);
      currentCursorMinutes = 0;
    }

    const assignedDate = formatDate(currentCursorDate);
    const assignedSlot = formatMinutesToSlot(assignedStartMinutes);

    // Increment cursor for the next mission
    currentCursorMinutes = assignedStartMinutes + 75;
    if (currentCursorMinutes >= 1440) {
      currentCursorDate = addDays(currentCursorDate, 1);
      currentCursorMinutes = 0;
    }

    return {
      ...m,
      estimatedDate: assignedDate,
      estimatedSlot: assignedSlot,
    };
  });
}
