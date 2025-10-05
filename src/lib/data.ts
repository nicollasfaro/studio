import type { TimeSlot, Appointment } from '@/lib/types';

// This file now only contains mock data that is not yet in Firestore.
// Services and Promotions are now fetched from Firestore.

export const timeSlots: Omit<TimeSlot, 'available'>[] = [
    { time: '09:00' },
    { time: '10:00' },
    { time: '11:00' },
    { time: '12:00' },
    { time: '13:00' },
    { time: '14:00' },
    { time: '15:00' },
    { time: '16:00' },
    { time: '17:00' },
];

// This is kept for the profile page example, but should be replaced with Firestore data.
export const userAppointments: Omit<Appointment, 'clientId' | 'serviceId' | 'endTime' | 'status'> & {serviceName: string; time: string; date: Date; clientName: string}[] = [
  {
    id: 'apt1',
    serviceName: 'Rejuvenating Facial',
    date: new Date(new Date().setDate(new Date().getDate() + 7)),
    time: '14:00',
    clientName: 'Jane Doe',
    startTime: ''
  },
  {
    id: 'apt2',
    serviceName: 'Haircut & Style',
    date: new Date(new Date().setDate(new Date().getDate() + 12)),
    time: '11:00',
    clientName: 'Jane Doe',
    startTime: ''
  },
];

// This is kept for the profile page example, but should be replaced with Firestore data.
export const pastAppointments: Omit<Appointment, 'clientId' | 'serviceId' | 'endTime' | 'status'> & {serviceName: string; time: string; date: Date; clientName: string}[] = [
    {
    id: 'apt3',
    serviceName: 'Deluxe Manicure',
    date: new Date(new Date().setDate(new Date().getDate() - 14)),
    time: '16:00',
    clientName: 'Jane Doe',
    startTime: ''
  },
]
