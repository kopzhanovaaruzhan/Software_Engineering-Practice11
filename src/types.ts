export interface Booking {
  id: string;
  roomName: string;
  start: number; // minutes from midnight (0–1440)
  end: number; // exclusive endpoint
  bookedBy: string;
  purpose: string;
}

export interface Room {
  id: string;
  name: string;
  building: string;
  capacity: number;
  equipment: string[];
  blocked: boolean;
}
