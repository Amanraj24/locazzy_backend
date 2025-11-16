// FILE: lib/types.ts
// TypeScript type definitions
// ============================================

export interface User {
  user_id: string;
  full_name: string;
  phone_number: string;
  email?: string;
  profile_picture_url?: string;
  created_at?: Date;
}

export interface ShopOwner {
  owner_id: string;
  business_name: string;
  owner_name?: string;
  phone_number: string;
  email?: string;
  profile_picture_url?: string;
  is_verified?: boolean;
}

export interface Shop {
  shop_id: string;
  owner_id: string;
  shop_name: string;
  description?: string;
  latitude: number;
  longitude: number;
  formatted_address?: string;
  street_address?: string;
  locality?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  plus_code?: string;
  visibility_radius_km: number;
  is_visible: boolean;
  is_online: boolean;
  total_views?: number;
  total_chats?: number;
  average_rating?: number;
  total_ratings?: number;
}

export interface Message {
  message_id: string;
  conversation_id: string;
  sender_type: 'shop' | 'customer';
  sender_id: string;
  message_text: string;
  attachment_url?: string;
  is_read: boolean;
  created_at: Date;
}

export interface Rating {
  rating_id: string;
  shop_id: string;
  user_id: string;
  rating_value: number;
  review_comment?: string;
  created_at: Date;
}
