

export type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  imageId: string;
  originalPrice?: number;
  isPriceFrom?: boolean;
  priceShortHair?: number;
  priceMediumHair?: number;
  priceLongHair?: number;
};

export type Promotion = {
  id: string;
  name: string;
  description: string;
  imageId: string;
  discountPercentage: number;
  startDate: string;
  endDate: string;
  serviceIds: string[];
};

export type Appointment = {
  id: string;
  clientId: string;
  serviceId: string;
  startTime: string;
  endTime: string;
  status: 'Marcado' | 'confirmado' | 'cancelado' | 'finalizado';
  clientName: string;
  clientEmail: string;
  hairLength?: 'curto' | 'medio' | 'longo';
  hairPhotoUrl?: string | null;
  finalPrice?: number;
};

export type TimeSlot = {
  time: string;
  available: boolean;
};

export type User = {
    id: string;
    name:string;
    email: string;
    createdAt: string;
    isAdmin?: boolean;
}

export type SocialMediaLinks = {
  facebook?: string;
  instagram?: string;
  twitter?: string;
}
