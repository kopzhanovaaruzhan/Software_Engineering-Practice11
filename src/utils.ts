import type { Booking, Room } from './types';

export const MAX_BOOKING_MINUTES = 120;
export const MINUTES_PER_DAY = 1440;

export function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function labelToMinutes(label: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(label.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export interface CheckResult {
  available: boolean;
  reasons: string[];
}

export interface RoomFilter {
  minCapacity: number;
  requiredEquipment: string[];
  excludeBlocked: boolean;
}

/** F1–F3 filtering. Pure function — does not mutate rooms or bookings. */
export function filterRooms(rooms: Room[], filter: RoomFilter): Room[] {
  return rooms.filter((room) => {
    if (filter.excludeBlocked && room.blocked) return false;
    if (room.capacity < filter.minCapacity) return false;
    if (filter.requiredEquipment.length > 0) {
      const hasAll = filter.requiredEquipment.every((eq) =>
        room.equipment.includes(eq),
      );
      if (!hasAll) return false;
    }
    return true;
  });
}

/** AC1–AC4 validation. Does NOT mutate bookings (AC5). */
export function checkAvailability(
  start: number,
  end: number,
  roomBlocked: boolean,
  bookings: Booking[],
  currentTime: number,
): CheckResult {
  const reasons: string[] = [];

  // AC1 — valid interval and start after current time
  if (start >= end) {
    reasons.push('Start time must be earlier than end time.');
  }
  if (start < 0 || end > MINUTES_PER_DAY) {
    reasons.push('Times must be within 00:00–24:00.');
  }
  if (start <= currentTime) {
    reasons.push(`Start time must be strictly after the current time (${minutesToLabel(currentTime)}).`);
  }

  // AC2 — max 120 minutes
  if (end - start > MAX_BOOKING_MINUTES) {
    reasons.push(`Bookings cannot exceed ${MAX_BOOKING_MINUTES} minutes (requested ${end - start} min).`);
  }

  // AC3 — room blocked
  if (roomBlocked) {
    reasons.push('This room is currently blocked and cannot be booked.');
  }

  // AC4 — no overlap; touching endpoints allowed
  const overlaps = bookings.filter(
    (b) => b.start < end && start < b.end,
  );
  if (overlaps.length > 0) {
    reasons.push(
      `Overlaps ${overlaps.length} existing booking${overlaps.length > 1 ? 's' : ''} ` +
      `(${overlaps.map((b) => `${minutesToLabel(b.start)}–${minutesToLabel(b.end)}`).join(', ')}).`,
    );
  }

  return { available: reasons.length === 0, reasons };
}
