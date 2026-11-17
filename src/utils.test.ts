import { describe, expect, it } from 'vitest';
import { checkAvailability, filterRooms } from './utils';
import type { Booking, Room } from './types';

const NOW = 540;
const DEFAULT_BOOKING: Booking = {
  id: 'fixture-booking',
  roomName: 'A-101',
  start: 600,
  end: 660,
  bookedBy: 'Fixture User',
  purpose: 'Fixture Booking',
};

function freshBookings(): Booking[] {
  return [{ ...DEFAULT_BOOKING }];
}

function expectAvailability(
  start: number,
  end: number,
  expected: boolean,
  options: {
    blocked?: boolean;
    bookings?: Booking[];
    now?: number;
    reasonIncludes?: string;
  } = {},
): void {
  const bookings = options.bookings ?? freshBookings();
  const before = JSON.stringify(bookings);

  const result = checkAvailability(
    start,
    end,
    options.blocked ?? false,
    bookings,
    options.now ?? NOW,
  );

  expect(result.available).toBe(expected);
  if (options.reasonIncludes !== undefined) {
    expect(result.reasons.some((reason) => reason.includes(options.reasonIncludes!))).toBe(true);
  }
  expect(JSON.stringify(bookings)).toBe(before);
}

describe('checkAvailability', () => {
  describe('T01–T07: interval, current-time, and duration rules', () => {
    it('T01: allows a request touching the booking endpoint after it', () => {
      expectAvailability(660, 720, true);
    });

    it('T02: rejects a request that starts exactly at the current time', () => {
      expectAvailability(540, 570, false, {
        reasonIncludes: 'strictly after the current time',
      });
    });

    it('T03: rejects a zero-duration request', () => {
      expectAvailability(720, 720, false, {
        reasonIncludes: 'Start time must be earlier than end time',
      });
    });

    it('T04: rejects a reversed time range', () => {
      expectAvailability(750, 720, false, {
        reasonIncludes: 'Start time must be earlier than end time',
      });
    });

    it('T05: rejects a request whose end is past the end of the day', () => {
      expectAvailability(1380, 1441, false, {
        reasonIncludes: 'within 00:00–24:00',
      });
    });

    it('T06: allows a request of exactly 120 minutes when otherwise valid', () => {
      expectAvailability(720, 840, true);
    });

    it('T07: rejects a request of 121 minutes', () => {
      expectAvailability(720, 841, false, {
        reasonIncludes: 'cannot exceed 120 minutes',
      });
    });
  });

  describe('T08–T14: overlap and room-state rules', () => {
    it('T08: allows a request touching the booking endpoint before it', () => {
      expectAvailability(570, 600, true);
    });

    it('T09: rejects a partial overlap', () => {
      expectAvailability(630, 690, false, {
        reasonIncludes: 'Overlaps 1 existing booking',
      });
    });

    it('T10: rejects a request that contains the existing booking', () => {
      expectAvailability(570, 690, false, {
        reasonIncludes: 'Overlaps 1 existing booking',
      });
    });

    it('T11: rejects a request inside the existing booking', () => {
      expectAvailability(615, 645, false, {
        reasonIncludes: 'Overlaps 1 existing booking',
      });
    });

    it('T12: rejects an identical interval', () => {
      expectAvailability(600, 660, false, {
        reasonIncludes: 'Overlaps 1 existing booking',
      });
    });

    it('T13: rejects a request when the room is blocked', () => {
      expectAvailability(660, 720, false, {
        blocked: true,
        reasonIncludes: 'room is currently blocked',
      });
    });

    it('T14: allows a non-overlapping request when there are no bookings', () => {
      expectAvailability(630, 690, true, { bookings: [] });
    });
  });

  describe('additional boundary cases', () => {
    it('accepts a request ending exactly at 24:00', () => {
      expectAvailability(1320, 1440, true, { bookings: [] });
    });

    it('rejects a request that starts before now even without a booking conflict', () => {
      expectAvailability(539, 570, false, {
        bookings: [],
        reasonIncludes: 'strictly after the current time',
      });
    });

    it('rejects a request with a negative start time', () => {
      expectAvailability(-1, 30, false, {
        bookings: [],
        reasonIncludes: 'within 00:00–24:00',
      });
    });

    it('rejects a request that starts one minute after now but overlaps a booking', () => {
      expectAvailability(541, 601, false, {
        reasonIncludes: 'Overlaps 1 existing booking',
      });
    });
  });

  it('preserves the booking data after every availability check', () => {
    const bookings = freshBookings();
    const before = JSON.stringify(bookings);

    checkAvailability(660, 720, false, bookings, NOW);
    checkAvailability(630, 690, false, bookings, NOW);
    checkAvailability(660, 720, true, bookings, NOW);

    expect(JSON.stringify(bookings)).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// filterRooms — F1–F4 regression tests
// ---------------------------------------------------------------------------

const TEST_ROOMS: Room[] = [
  { id: 'r1', name: 'Alpha', building: 'A', capacity: 40, equipment: ['Projector', 'Whiteboard'], blocked: false },
  { id: 'r2', name: 'Beta', building: 'A', capacity: 25, equipment: ['Whiteboard'], blocked: false },
  { id: 'r3', name: 'Gamma', building: 'B', capacity: 50, equipment: ['Projector', 'Whiteboard', 'Audio System'], blocked: true },
  { id: 'r4', name: 'Delta', building: 'B', capacity: 15, equipment: ['Audio System'], blocked: false },
];

describe('filterRooms', () => {
  it('F1: excludes rooms below the requested capacity', () => {
    const result = filterRooms(TEST_ROOMS, {
      minCapacity: 30,
      requiredEquipment: [],
      excludeBlocked: true,
    });
    expect(result.map((r) => r.name)).toEqual(['Alpha']);
  });

  it('F1: includes rooms that exactly meet the capacity threshold', () => {
    const result = filterRooms(TEST_ROOMS, {
      minCapacity: 25,
      requiredEquipment: [],
      excludeBlocked: true,
    });
    expect(result.map((r) => r.name)).toEqual(['Alpha', 'Beta']);
  });

  it('F2: includes only rooms containing ALL selected equipment', () => {
    const result = filterRooms(TEST_ROOMS, {
      minCapacity: 0,
      requiredEquipment: ['Projector', 'Whiteboard'],
      excludeBlocked: true,
    });
    expect(result.map((r) => r.name)).toEqual(['Alpha']);
  });

  it('F2: returns all non-blocked rooms when no equipment is required', () => {
    const result = filterRooms(TEST_ROOMS, {
      minCapacity: 0,
      requiredEquipment: [],
      excludeBlocked: true,
    });
    expect(result.map((r) => r.name)).toEqual(['Alpha', 'Beta', 'Delta']);
  });

  it('F3: excludes blocked rooms when excludeBlocked is true', () => {
    const result = filterRooms(TEST_ROOMS, {
      minCapacity: 0,
      requiredEquipment: [],
      excludeBlocked: true,
    });
    expect(result.some((r) => r.blocked)).toBe(false);
  });

  it('F3: includes blocked rooms when excludeBlocked is false', () => {
    const result = filterRooms(TEST_ROOMS, {
      minCapacity: 0,
      requiredEquipment: [],
      excludeBlocked: false,
    });
    expect(result.some((r) => r.blocked)).toBe(true);
  });

  it('F4: returns an empty array when no rooms match the filters', () => {
    const result = filterRooms(TEST_ROOMS, {
      minCapacity: 100,
      requiredEquipment: [],
      excludeBlocked: true,
    });
    expect(result).toEqual([]);
  });

  it('F1+F2+F3: combines capacity, equipment, and blocked filters together', () => {
    const result = filterRooms(TEST_ROOMS, {
      minCapacity: 20,
      requiredEquipment: ['Whiteboard'],
      excludeBlocked: true,
    });
    expect(result.map((r) => r.name)).toEqual(['Alpha', 'Beta']);
  });

  it('does not mutate the input rooms array', () => {
    const before = JSON.stringify(TEST_ROOMS);
    filterRooms(TEST_ROOMS, {
      minCapacity: 50,
      requiredEquipment: ['Projector'],
      excludeBlocked: true,
    });
    expect(JSON.stringify(TEST_ROOMS)).toBe(before);
  });
});
