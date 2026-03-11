export interface InitialUser {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  accountType: string;
  isPremium: boolean;
  premiumPlan: string | null;
  isVerified: boolean;
  role: string;
  status?: string;
  copyrightEligible?: boolean;
  accountPrivate?: boolean;
  locale?: string;
  emailVerified?: boolean;
}
