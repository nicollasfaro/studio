import type { Service, Promotion, TimeSlot, Appointment } from '@/lib/types';

export const services: Service[] = [
  {
    id: 'haircut-style',
    name: 'Haircut & Style',
    description: 'A customized haircut and professional styling to fit your look and lifestyle. Includes a wash and blow-dry.',
    price: 80,
    duration: 60,
    imageId: 'haircut',
  },
  {
    id: 'manicure-deluxe',
    name: 'Deluxe Manicure',
    description: 'Pamper your hands with our deluxe manicure, including nail shaping, cuticle care, a relaxing hand massage, and polish.',
    price: 50,
    duration: 45,
    imageId: 'manicure',
  },
  {
    id: 'facial-rejuvenate',
    name: 'Rejuvenating Facial',
    description: 'A deep-cleansing and hydrating facial treatment that revitalizes your skin, leaving it smooth, bright, and youthful.',
    price: 120,
    duration: 75,
    imageId: 'facial',
  },
  {
    id: 'massage-therapy',
    name: 'Swedish Massage',
    description: 'A classic full-body massage using long, flowing strokes to reduce tension, improve circulation, and promote relaxation.',
    price: 100,
    duration: 60,
    imageId: 'massage',
  },
  {
    id: 'pedicure-spa',
    name: 'Spa Pedicure',
    description: 'Treat your feet to a spa pedicure with a warm soak, exfoliation, nail care, massage, and your choice of polish.',
    price: 65,
    duration: 60,
    imageId: 'pedicure',
  },
  {
    id: 'makeup-pro',
    name: 'Professional Makeup',
    description: 'Get ready for any special occasion with a professional makeup application by our talented artists.',
    price: 90,
    duration: 60,
    imageId: 'makeup',
  },
];

export const promotions: Promotion[] = [
  {
    id: 'promo-midweek',
    title: 'Mid-Week Pamper Package',
    description: 'Recharge your week! Get a Rejuvenating Facial and a Deluxe Manicure for only $150. Available Tuesday-Thursday.',
    imageId: 'promo1',
  },
  {
    id: 'promo-bff',
    title: 'Best Friends Beauty Day',
    description: 'Book any two services with a friend and you both receive 20% off your total bill. Share the glamour!',
    imageId: 'promo2',
  },
  {
    id: 'promo-hair',
    title: 'Hair Refresh Special',
    description: 'Get 15% off any Haircut & Style when you book a color treatment at the same time. Time for a new look!',
    imageId: 'haircut'
  }
];

export const timeSlots: TimeSlot[] = [
    { time: '09:00', available: true },
    { time: '10:00', available: false },
    { time: '11:00', available: true },
    { time: '12:00', available: true },
    { time: '13:00', available: false },
    { time: '14:00', available: true },
    { time: '15:00', available: true },
    { time: '16:00', available: false },
    { time: '17:00', available: true },
];

export const userAppointments: Appointment[] = [
  {
    id: 'apt1',
    serviceName: 'Rejuvenating Facial',
    date: new Date(new Date().setDate(new Date().getDate() + 7)),
    time: '14:00',
    clientName: 'Jane Doe',
  },
  {
    id: 'apt2',
    serviceName: 'Haircut & Style',
    date: new Date(new Date().setDate(new Date().getDate() + 12)),
    time: '11:00',
    clientName: 'Jane Doe',
  },
];

export const pastAppointments: Appointment[] = [
    {
    id: 'apt3',
    serviceName: 'Deluxe Manicure',
    date: new Date(new Date().setDate(new Date().getDate() - 14)),
    time: '16:00',
    clientName: 'Jane Doe',
  },
]
