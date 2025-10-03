export type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  imageId: string;
};

export type Promotion = {
  id: string;
  title: string;
  description: string;
  imageId: string;
};

export type Appointment = {
  id: string;
  serviceName: string;
  date: Date;
  time: string;
  clientName: string;
};

export type TimeSlot = {
  time: string;
  available: boolean;
};
