import { Property, User, LandlordProfile, PaymentTransaction, ContactUnlock, AdminAnalytics, Report, Notification } from '../types/index.ts';

const API_BASE = '/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  auth: {
    me: () => request<{ user: User | null; landlordProfile?: LandlordProfile }>('/auth/me'),
    login: (credentials: { email: string; password: string }) =>
      request<{ user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    register: (data: {
      email: string;
      password: string;
      fullName: string;
      phone: string;
      role: 'TENANT' | 'LANDLORD';
      landlordRole?: 'LANDLORD' | 'LANDLADY' | 'PROPERTY_OWNER' | 'PROPERTY_MANAGER';
      secondaryPhone?: string;
      businessName?: string;
    }) =>
      request<{ user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
  },

  // Properties
  properties: {
    list: (params: {
      propertyType?: string;
      district?: string;
      minRent?: number;
      maxRent?: number;
      bedrooms?: number;
      q?: string;
      sort?: string;
    } = {}) => {
      const query = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          query.set(key, String(val));
        }
      });
      return request<{ properties: Property[]; total: number }>(`/properties?${query.toString()}`);
    },
    get: (idOrSlug: string) => request<{ property: Property }>(`/properties/${idOrSlug}`),
    getContact: (id: string) =>
      request<{
        propertyId: string;
        contact: {
          name: string;
          role: string;
          phone: string;
          callUrl: string;
          whatsappUrl: string;
          whatsappEnabled: boolean;
        };
      }>(`/properties/${id}/contact`),
    create: (data: Partial<Property>) =>
      request<{ property: Property }>('/properties', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Property>) =>
      request<{ property: Property }>(`/properties/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => request<{ success: boolean }>(`/properties/${id}`, { method: 'DELETE' }),
    toggleFavorite: (id: string, isFav: boolean) =>
      request<{ success: boolean }>(`/properties/${id}/favorite`, {
        method: isFav ? 'DELETE' : 'POST',
      }),
  },

  // Payments & Contact Unlocks
  payments: {
    initiate: (data: { propertyId: string; phoneNumber: string; paymentMethod: string; idempotencyKey?: string }) =>
      request<{
        success: boolean;
        amountUGX: number;
        currency: string;
        transaction: { id: string; internalReference: string; status: string; provider: string; payerPhoneMasked: string };
        requiresAction: boolean;
        actionType: string;
        instructions: string;
      }>('/payments/initiate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    status: (transactionId: string) =>
      request<{
        transaction: { id: string; internalReference: string; amountUGX: number; currency: string; status: string };
        contactUnlock?: { revealedPhone: string; revealedLandlordName: string; whatsappEnabled: boolean; unlockedAt: string };
        failureReason?: string;
      }>(`/payments/${transactionId}/status`),
    history: () => request<{ transactions: PaymentTransaction[] }>('/payments/history'),
    unlocks: () => request<{ unlocks: ContactUnlock[] }>('/payments/unlocks'),
  },

  // Landlord Portal
  landlord: {
    properties: () => request<{ properties: Property[] }>('/landlord/properties'),
    profile: () => request<{ profile: LandlordProfile }>('/landlord/profile'),
    stats: () =>
      request<{
        totalListings: number;
        activeListings: number;
        pendingListings: number;
        rentedListings: number;
        totalViews: number;
        totalUnlocks: number;
      }>('/landlord/stats'),
    submitVerification: (data: {
      businessName?: string;
      nationalIdNumber: string;
      ownershipProofType: string;
      publicContactPhone?: string;
      whatsappEnabled?: boolean;
      bio?: string;
    }) =>
      request<{ success: boolean; message: string; profile: LandlordProfile }>('/landlord/verification', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateContactSettings: (data: {
      publicContactPhone: string;
      secondaryPhone?: string;
      landlordRole?: string;
      whatsappEnabled?: boolean;
    }) =>
      request<{
        success: boolean;
        message: string;
        profile: LandlordProfile;
        requiresPhoneVerification: boolean;
      }>('/landlord/contact-settings', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    verifyPhone: (code: string) =>
      request<{ success: boolean; message: string; profile: LandlordProfile }>('/landlord/verify-phone', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),
    getContactProperties: () =>
      request<{
        properties: Array<{
          id: string;
          slug: string;
          title: string;
          monthlyRentUGX: number;
          location: any;
          usesCustomContact: boolean;
          effectiveContactPhone: string;
          effectiveContactName: string;
          effectiveRole: string;
        }>;
      }>('/landlord/contact-properties'),
  },

  // Admin Portal
  admin: {
    analytics: () => request<{ analytics: AdminAnalytics }>('/admin/analytics'),
    users: () => request<{ users: User[] }>('/admin/users'),
    updateUserStatus: (id: string, isActive: boolean) =>
      request<{ success: boolean; user: User }>(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      }),
    landlords: () => request<{ landlords: (LandlordProfile & { userEmail?: string; userName?: string; userPhone?: string })[] }>('/admin/landlords'),
    updateLandlordVerification: (id: string, status: string, rejectionReason?: string) =>
      request<{ success: boolean; profile: LandlordProfile }>(`/admin/landlords/${id}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({ status, rejectionReason }),
      }),
    properties: () => request<{ properties: (Property & { landlord: { displayName: string; email?: string; phone?: string; isVerified: boolean } })[] }>('/admin/properties'),
    updatePropertyStatus: (id: string, data: { status?: string; isFeatured?: boolean; rejectionReason?: string }) =>
      request<{ success: boolean; property: Property }>(`/admin/properties/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    transactions: () => request<{ transactions: PaymentTransaction[] }>('/admin/transactions'),
    reports: () => request<{ reports: Report[] }>('/admin/reports'),
    updateReport: (id: string, data: { status: string; adminNotes?: string }) =>
      request<{ success: boolean; report: Report }>(`/admin/reports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    auditLogs: () => request<{ logs: Array<{ id: string; action: string; actorEmail?: string; actorRole?: string; targetType: string; targetId: string; createdAt: string; details?: unknown }> }>('/admin/audit-logs'),
  },

  // Reports
  reports: {
    create: (data: { propertyId: string; reason: string; description: string }) =>
      request<{ success: boolean; message: string; report: Report }>('/reports', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // Notifications
  notifications: {
    list: () => request<{ notifications: Notification[]; unreadCount: number }>('/notifications'),
    markRead: (id: string) => request<{ success: boolean }>(`/notifications/${id}/read`, { method: 'PATCH' }),
  },
};
