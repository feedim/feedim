/**
 * Forilove - Database Type Definitions
 * Proper TypeScript interfaces for all database tables
 */

// ============= PROFILES =============

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  coin_balance: number;
  is_admin: boolean;
  is_creator: boolean;
  created_at: string;
  updated_at: string;
}

export type ProfileUpdate = Partial<Omit<Profile, 'id' | 'email' | 'created_at'>>;

// ============= TEMPLATES =============

export interface Template {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  preview_url: string | null;
  category: TemplateCategory;
  template_type: TemplateType;

  // Pricing
  coin_price: number;
  is_free: boolean;
  is_featured: boolean;

  // HTML Template System
  html_content: string | null;
  default_data: Record<string, any> | null;

  // Block-based Template System (legacy)
  blocks: any[] | null;

  // Metadata
  creator_id: string | null;
  view_count: number;
  use_count: number;
  created_at: string;
  updated_at: string;
}

export type TemplateCategory =
  | 'romantic'
  | 'anniversary'
  | 'birthday'
  | 'proposal'
  | 'wedding'
  | 'apology'
  | 'celebration'
  | 'other';

export type TemplateType = 'html' | 'blocks';

export interface TemplateHook {
  key: string;
  type: HookType;
  label: string;
  defaultValue: string;
  description?: string;
}

export type HookType =
  | 'text'
  | 'image'
  | 'textarea'
  | 'color'
  | 'date'
  | 'url'
  | 'background-image'
  | 'video';

export type TemplateInsert = Omit<Template, 'id' | 'view_count' | 'use_count' | 'created_at' | 'updated_at'>;
export type TemplateUpdate = Partial<TemplateInsert>;

// ============= PROJECTS =============

export interface Project {
  id: string;
  user_id: string;
  template_id: string | null;
  title: string;
  slug: string;
  template_type: TemplateType;

  // Content
  content: ProjectContent;

  // Metadata
  view_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  published_at: string | null;

  // Relations (populated by joins)
  templates?: Template;
}

export interface ProjectContent {
  // HTML Template Data
  htmlData?: Record<string, any>;

  // Block-based Data (legacy)
  blocks?: any[];
  styles?: {
    primaryColor?: string;
    secondaryColor?: string;
    backgroundColor?: string;
    fontFamily?: string;
    [key: string]: any;
  };
}

export type ProjectInsert = Omit<Project, 'id' | 'view_count' | 'created_at' | 'updated_at' | 'published_at'>;
export type ProjectUpdate = Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>;

// ============= COIN PACKAGES =============

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  bonus_coins: number;
  price_usd: number;
  price_try: number;
  is_popular: boolean;
  display_order: number;
  created_at: string;
}

export type CoinPackageInsert = Omit<CoinPackage, 'id' | 'created_at'>;

// ============= COIN TRANSACTIONS =============

export interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: TransactionType;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export type TransactionType =
  | 'purchase'
  | 'spend'
  | 'refund'
  | 'bonus'
  | 'admin_adjustment';

export type CoinTransactionInsert = Omit<CoinTransaction, 'id' | 'created_at'>;

// ============= PURCHASES =============

export interface Purchase {
  id: string;
  user_id: string;
  template_id: string;
  coin_price: number;
  created_at: string;

  // Relations (populated by joins)
  templates?: Template;
}

export type PurchaseInsert = Omit<Purchase, 'id' | 'created_at'>;

// ============= SAVED TEMPLATES =============

export interface SavedTemplate {
  id: string;
  user_id: string;
  template_id: string;
  created_at: string;

  // Relations (populated by joins)
  templates?: Template;
}

export type SavedTemplateInsert = Omit<SavedTemplate, 'id' | 'created_at'>;

// ============= COIN PAYMENTS =============

export interface CoinPayment {
  id: string;
  user_id: string;
  package_id: string;
  amount_usd: number;
  amount_try: number | null;
  coins_received: number;
  payment_provider: PaymentProvider;
  payment_status: PaymentStatus;
  provider_payment_id: string | null;
  provider_response: Record<string, any> | null;
  created_at: string;
  completed_at: string | null;

  // Relations (populated by joins)
  coin_packages?: CoinPackage;
  profiles?: Profile;
}

export type PaymentProvider = 'iyzico' | 'stripe' | 'manual';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export type CoinPaymentInsert = Omit<CoinPayment, 'id' | 'created_at' | 'completed_at'>;
export type CoinPaymentUpdate = Partial<Pick<CoinPayment, 'payment_status' | 'provider_payment_id' | 'provider_response' | 'completed_at'>>;

// ============= UTILITY TYPES =============

/**
 * Generic database response type
 */
export interface DbResponse<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Filter options for queries
 */
export interface FilterOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  order?: 'asc' | 'desc';
}
