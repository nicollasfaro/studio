







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
  hasCustomSchedule?: boolean;
  customStartTime?: string;
  customEndTime?: string;
  customWorkingDays?: number[];
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
  status: 'Marcado' | 'confirmado' | 'cancelado' | 'finalizado' | 'contestado';
  clientName: string;
  clientEmail: string;
  hairLength?: 'curto' | 'medio' | 'longo';
  hairPhotoUrl?: string | null;
  finalPrice?: number;
  viewedByAdmin?: boolean;
  contestStatus?: 'pending' | 'accepted' | 'rejected';
  contestReason?: string;
  contestedHairLength?: 'curto' | 'medio' | 'longo';
  contestedPrice?: number;
  serviceName?: string; // Added for convenience in UI components
  adminTyping?: boolean;
  clientTyping?: boolean;
  hasUnreadAdminMessage?: boolean;
  hasUnreadClientMessage?: boolean;
};

export type ChatMessage = {
    id: string;
    appointmentId: string;
    senderId: string; // user.uid or 'admin'
    senderName: string;
    text: string;
    timestamp: any; // Use 'any' for serverTimestamp() compatibility
    isRead: boolean;
}

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
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    photoURL?: string;
    fcmTokens?: string[];
    providerId?: string;
    googleAccessToken?: string;
    googleRefreshToken?: string;
}

export type SocialMediaLinks = {
  facebook?: string;
  instagram?: string;
  twitter?: string;
}

export type GalleryImage = {
  id: string;
  imageUrl: string;
  description: string;
  fileName: string;
  createdAt: string;
};

export type HeroBanner = {
  imageId: string;
  largeText: string;
  smallText: string;
  buttonText: string;
};
    
export type BusinessHours = {
  startTime: string;
  endTime: string;
  workingDays: number[]; // 0 for Sunday, 1 for Monday, etc.
}

export type BusinessLocation = {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

export type WhatsAppMessage = {
    to: string;
    from: string;
    body: string;
};
    

    




    

    