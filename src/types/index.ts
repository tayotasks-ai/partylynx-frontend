export interface Party {
  _id: string;
  id?: string;
  name: string;
  hostDisplayName: string;
  inviteToken: string;
  maxCapacity: number;
  currentGuests: number;
  createdAt: string;
}

export interface Photo {
  _id: string;
  partyId: string;
  guestId: string;
  uploaderDisplayName: string;
  mediaUrl: string;
  timestamp: string;
  isOptimistic?: boolean;
  uploadFailed?: boolean;
}

export interface AuthData {
  token: string;
  guestId: string;
  displayName: string;
  role: 'host' | 'guest';
}
