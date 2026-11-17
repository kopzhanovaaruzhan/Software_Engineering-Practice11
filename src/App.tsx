import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  CalendarCheck,
  DoorClosed,
  Users,
  Filter,
  SearchX,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { rooms, initialBookings, allEquipment } from './data';
import {
  checkAvailability,
  filterRooms,
  minutesToLabel,
  labelToMinutes,
  MAX_BOOKING_MINUTES,
} from './utils';
import type { Booking } from './types';
import { generateExplanation } from './explain';
import type { ExplainOutcome } from './explain';

function App() {
  const [bookings] = useState<Booking[]>(initialBookings);
  const [roomName, setRoomName] = useState(rooms[0].name);
  const [startLabel, setStartLabel] = useState('08:00');
  const [endLabel, setEndLabel] = useState('09:00');
  const [currentTime, setCurrentTime] = useState(7 * 60 + 30);

  // Filter state (F1–F3)
  const [minCapacity, setMinCapacity] = useState(0);
  const [requiredEquipment, setRequiredEquipment] = useState<string[]>([]);

  // F1–F3: filter rooms by capacity, equipment, and blocked status
  const filteredRooms = useMemo(
    () =>
      filterRooms(rooms, {
        minCapacity,
        requiredEquipment,
        excludeBlocked: true,
      }),
    [minCapacity, requiredEquipment],
  );

  // F5: if the selected room is no longer in the filtered list, switch to the
  // first available room (or clear selection when the list is empty)
  useEffect(() => {
    if (filteredRooms.length === 0) return;
    const stillVisible = filteredRooms.some((r) => r.name === roomName);
    if (!stillVisible) {
      setRoomName(filteredRooms[0].name);
    }
  }, [filteredRooms, roomName]);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.name === roomName) ?? null,
    [roomName],
  );

  const roomBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.roomName === roomName)
        .sort((a, b) => a.start - b.start),
    [bookings, roomName],
  );

  const startMin = labelToMinutes(startLabel);
  const endMin = labelToMinutes(endLabel);

  // F5: result recalculates whenever room, times, or current time change
  const result = useMemo(() => {
    if (!selectedRoom) {
      return { available: false, reasons: ['Select a room to check availability.'] };
    }
    if (startMin === null || endMin === null) {
      return { available: false, reasons: ['Enter valid times in HH:MM format (00:00–23:59).'] };
    }
    return checkAvailability(
      startMin,
      endMin,
      selectedRoom.blocked,
      roomBookings,
      currentTime,
    );
  }, [selectedRoom, startMin, endMin, roomBookings, currentTime]);

  const invalidInput = startMin === null || endMin === null;

  // Explanation is cosmetic only; the deterministic result above stays authoritative.
  const [explanation, setExplanation] = useState<ExplainOutcome | null>(null);
  const [explaining, setExplaining] = useState(false);
  const requestSeq = useRef(0);

  const requestExplanation = async () => {
    if (!selectedRoom || invalidInput) return;
    const seq = ++requestSeq.current;
    setExplaining(true);
    setExplanation(null);
    const outcome = await generateExplanation({
      roomName: selectedRoom.name,
      startLabel,
      endLabel,
      result,
    });
    if (seq === requestSeq.current) {
      setExplanation(outcome);
      setExplaining(false);
    }
  };

  useEffect(() => {
    requestSeq.current += 1;
    setExplanation(null);
    setExplaining(false);
  }, [roomName, startLabel, endLabel, currentTime]);

  const toggleEquipment = (eq: string) => {
    setRequiredEquipment((prev) =>
      prev.includes(eq) ? prev.filter((e) => e !== eq) : [...prev, eq],
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 text-slate-800">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
            <CalendarCheck size={28} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Smart Campus Room Availability
          </h1>
          <p className="mt-2 text-sm text-slate-500 sm:text-base">
            Check whether a campus room is available for your requested time slot.
          </p>
        </header>

        {/* Current time control */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <Clock size={18} className="text-blue-600" />
          <label htmlFor="current-time" className="text-sm font-medium text-slate-600">
            Current time:
          </label>
          <input
            id="current-time"
            type="time"
            value={minutesToLabel(currentTime)}
            onChange={(e) => {
              const v = labelToMinutes(e.target.value);
              if (v !== null) setCurrentTime(v);
            }}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
          />
          <span className="text-xs text-slate-400">Used to reject past start times.</span>
        </div>

        {/* Filter controls (F1–F2) */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Filter size={16} className="text-blue-600" />
            Filter Rooms
          </h2>

          {/* Capacity filter */}
          <div className="mb-4">
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-600">
              <Users size={14} />
              Minimum capacity: <span className="font-semibold text-slate-800">{minCapacity}</span>
            </label>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={minCapacity}
              onChange={(e) => setMinCapacity(Number(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>

          {/* Equipment filter */}
          <div>
            <span className="mb-2 block text-sm font-medium text-slate-600">
              Required equipment
            </span>
            <div className="flex flex-wrap gap-2">
              {allEquipment.map((eq) => {
                const active = requiredEquipment.includes(eq);
                return (
                  <button
                    key={eq}
                    onClick={() => toggleEquipment(eq)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                      active
                        ? 'border-blue-500 bg-blue-600 text-white'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    {eq}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="grid gap-6 md:grid-cols-5">
          {/* Form card */}
          <section className="md:col-span-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Building2 size={20} className="text-blue-600" />
              Select a Room
            </h2>

            {/* F4: empty state */}
            {filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 py-12 text-center">
                <SearchX size={36} className="mb-3 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">
                  No rooms match your filters.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Try lowering the capacity or removing equipment requirements.
                </p>
              </div>
            ) : (
              /* Room selection grid */
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setRoomName(room.name)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-all ${
                      roomName === room.name
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{room.name}</p>
                      <p className="text-xs text-slate-400">
                        {room.building} · cap {room.capacity}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-400">
                        {room.equipment.join(', ')}
                      </p>
                    </div>
                    {room.blocked && (
                      <span className="ml-2 flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                        <DoorClosed size={10} /> Blocked
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Time inputs */}
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start-time" className="mb-1.5 block text-sm font-medium text-slate-600">
                  Start time
                </label>
                <input
                  id="start-time"
                  type="time"
                  value={startLabel}
                  onChange={(e) => setStartLabel(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none ${
                    invalidInput
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                />
              </div>
              <div>
                <label htmlFor="end-time" className="mb-1.5 block text-sm font-medium text-slate-600">
                  End time
                </label>
                <input
                  id="end-time"
                  type="time"
                  value={endLabel}
                  onChange={(e) => setEndLabel(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none ${
                    invalidInput
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                />
              </div>
            </div>

            {/* Duration hint */}
            {!invalidInput && (
              <p className="mt-3 text-xs text-slate-400">
                Duration: <span className="font-medium text-slate-500">{endMin! - startMin!} min</span>
                {endMin! - startMin! > MAX_BOOKING_MINUTES && (
                  <span className="font-semibold text-red-500">
                    {' '}
                    · exceeds {MAX_BOOKING_MINUTES} min limit
                  </span>
                )}
              </p>
            )}
          </section>

          {/* Result card */}
          <section className="md:col-span-2 flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Availability</h2>

            <div
              className={`mb-4 flex flex-1 flex-col items-center justify-center rounded-xl p-6 text-center transition-all ${
                result.available
                  ? 'bg-green-50 ring-1 ring-green-200'
                  : 'bg-red-50 ring-1 ring-red-200'
              }`}
            >
              {result.available ? (
                <CheckCircle2 size={40} className="mb-2 text-green-600" />
              ) : (
                <XCircle size={40} className="mb-2 text-red-500" />
              )}
              <p
                className={`text-xl font-bold ${
                  result.available ? 'text-green-700' : 'text-red-600'
                }`}
              >
                {result.available ? 'Available' : 'Unavailable'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Room {roomName} · {startLabel}–{endLabel}
              </p>
            </div>

            {!result.available && (
              <ul className="space-y-1.5">
                {result.reasons.map((reason, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700"
                  >
                    <XCircle size={14} className="mt-0.5 shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            )}
            {result.available && (
              <p className="text-xs text-slate-400">
                No conflicts found. This is a check only — no booking is created.
              </p>
            )}

            {/* Optional AI explanation — always visually separate from the verdict */}
            {selectedRoom && !invalidInput && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                {!explanation && (
                  <button
                    onClick={requestExplanation}
                    disabled={explaining}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-all hover:border-blue-300 hover:bg-blue-50 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Sparkles size={13} className="text-blue-500" />
                    {explaining ? 'Generating…' : 'Explain this result'}
                  </button>
                )}
                {explanation?.kind === 'ok' && (
                  <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3">
                    <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-blue-500">
                      <Sparkles size={11} />
                      AI-generated explanation — not the booking status
                    </p>
                    <p className="text-xs leading-relaxed text-slate-600">{explanation.text}</p>
                  </div>
                )}
                {explanation?.kind === 'fallback' && (
                  <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                    <p className="flex items-start gap-1.5 text-xs text-amber-700">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                      {explanation.reason} The confirmed status above remains authoritative.
                    </p>
                  </div>
                )}
                {explanation?.kind === 'rejected' && (
                  <p className="text-xs text-slate-400">{explanation.reason}</p>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Existing bookings table */}
        {selectedRoom && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Existing Bookings — {roomName}
            </h2>
            {roomBookings.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-400">
                No existing bookings for this room.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase text-slate-400">
                      <th className="py-2 pr-4 font-medium">Time</th>
                      <th className="py-2 pr-4 font-medium">Duration</th>
                      <th className="py-2 pr-4 font-medium">Booked by</th>
                      <th className="py-2 font-medium">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomBookings.map((b) => (
                      <tr key={b.id} className="border-b border-slate-50 last:border-0">
                        <td className="py-2.5 pr-4 font-medium text-slate-700">
                          {minutesToLabel(b.start)}–{minutesToLabel(b.end)}
                        </td>
                        <td className="py-2.5 pr-4 text-slate-500">{b.end - b.start} min</td>
                        <td className="py-2.5 pr-4 text-slate-500">{b.bookedBy}</td>
                        <td className="py-2.5 text-slate-500">{b.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-400">
              Bookings data is read-only and never modified by the availability check.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
