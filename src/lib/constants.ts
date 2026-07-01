export const APP_NAME = import.meta.env.VITE_APP_BRAND_NAME || 'ATS Outreach';
export const DEFAULT_CALENDLY_URL =
  import.meta.env.VITE_CALENDLY_URL || 'https://calendly.com/your-link';
export const PAGE_SIZE = 200;

// ─── Role-based access groups ─────────────────────────────────────────
// Single source of truth for the role arrays that were previously duplicated
// inline across ~16 files. Use `hasRole(user?.role, ROLE_GROUPS.X)` for access
// checks so each group's membership is defined in exactly one place.
export const ROLE_GROUPS = {
  /** Internal staff (Review Queue, Clients, cross-tenant data). */
  INTERNAL: ['super_admin', 'admin', 'operator', 'analyst'],
  /** Full platform admins. */
  ADMINS: ['super_admin', 'admin'],
  /** Can manage users (invite / disable / delete). */
  MANAGE_USERS: ['super_admin', 'admin', 'client_admin'],
  /** Can action creators (approve / reject / shortlist + workflow). */
  MANAGE_CREATORS: ['super_admin', 'admin', 'operator', 'client_admin', 'client_marketing'],
  /** Can run campaign operations / discovery. */
  CAMPAIGN_OPS: ['super_admin', 'admin', 'operator', 'client_admin'],
  /** Admins + client marketing (offer / partnership management). */
  MARKETING_AND_ADMINS: ['super_admin', 'admin', 'client_admin', 'client_marketing'],
} as const;

/** True when `role` is a member of the given access group. */
export const hasRole = (role: string | null | undefined, group: readonly string[]): boolean =>
  !!role && group.includes(role);
