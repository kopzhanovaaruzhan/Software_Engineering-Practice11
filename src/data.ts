import type { Booking, Room } from './types';

export const rooms: Room[] = [
  {
    id: 'a-101',
    name: 'A-101',
    building: 'Engineering Block',
    capacity: 40,
    equipment: ['Projector', 'Whiteboard', 'Video Conferencing'],
    blocked: false,
  },
  {
    id: 'a-102',
    name: 'A-102',
    building: 'Engineering Block',
    capacity: 30,
    equipment: ['Whiteboard', 'Audio System'],
    blocked: false,
  },
  {
    id: 'b-201',
    name: 'B-201',
    building: 'Science Block',
    capacity: 25,
    equipment: ['Projector', 'Whiteboard'],
    blocked: true,
  },
  {
    id: 'b-202',
    name: 'B-202',
    building: 'Science Block',
    capacity: 50,
    equipment: ['Projector', 'Whiteboard', 'Video Conferencing', 'Audio System'],
    blocked: false,
  },
  {
    id: 'c-301',
    name: 'C-301',
    building: 'Library Wing',
    capacity: 20,
    equipment: ['Whiteboard'],
    blocked: false,
  },
  {
    id: 'c-302',
    name: 'C-302',
    building: 'Library Wing',
    capacity: 15,
    equipment: ['Projector', 'Audio System'],
    blocked: false,
  },
];

export const allEquipment: string[] = [
  'Projector',
  'Whiteboard',
  'Video Conferencing',
  'Audio System',
];

export const initialBookings: Booking[] = [
  { id: 'b1', roomName: 'A-101', start: 9 * 60, end: 10 * 60, bookedBy: 'Dr. Patel', purpose: 'Data Structures Lab' },
  { id: 'b2', roomName: 'A-101', start: 14 * 60, end: 15 * 60 + 30, bookedBy: 'Prof. Lee', purpose: 'Faculty Meeting' },
  { id: 'b3', roomName: 'A-102', start: 11 * 60, end: 12 * 60, bookedBy: 'Ms. Garcia', purpose: 'Tutorial Session' },
  { id: 'b4', roomName: 'B-202', start: 13 * 60, end: 14 * 60, bookedBy: 'Dr. Khan', purpose: 'Research Seminar' },
  { id: 'b5', roomName: 'B-202', start: 16 * 60, end: 17 * 60, bookedBy: 'CS Club', purpose: 'Coding Workshop' },
  { id: 'b6', roomName: 'C-301', start: 10 * 60, end: 11 * 60 + 30, bookedBy: 'Library Staff', purpose: 'Study Group' },
  { id: 'b7', roomName: 'C-302', start: 15 * 60, end: 16 * 60, bookedBy: 'Book Club', purpose: 'Reading Circle' },
];
