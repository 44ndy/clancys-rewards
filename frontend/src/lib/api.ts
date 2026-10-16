// Clancy's API client.
import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

export type Role = "customer" | "owner" | "manager" | "host" | "waiter";

export type User = {
  user_id: string;
  email: string;
  name: string;
  role: Role;
  picture?: string | null;
  active?: boolean;
  created_at: string;
};

export type Restaurant = {
  name: string;
  tagline: string;
  description: string;
  logo_url?: string;
  cover_url?: string;
  interior_url?: string;
  address: string;
  phone: string;
  hours: string;
  instagram?: string;
  primary_color: string;
  accent_color: string;
};

export type Reward = {
  reward_id: string;
  name: string;
  description: string;
  visits_required: number;
  reward_type: string;
  value?: string;
  expires_days: number;
  image_url?: string | null;
  active: boolean;
};

export type Loyalty = {
  visits: number;
  lifetime_visits: number;
  rewards: Reward[];
  next_reward?: Reward | null;
};

export type Promotion = {
  promotion_id: string;
  title: string;
  description: string;
  image_url?: string | null;
  banner_color?: string;
  valid_from?: string | null;
  valid_until?: string | null;
  push_on_publish?: boolean;
  active: boolean;
};

export type MenuItem = {
  item_id: string;
  /** Service: Breakfast / Lunch / Dinner / Dessert (data, not a code list). */
  category: string;
  /** Heading inside the service: Starters, Mains, Sides... */
  course?: string | null;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  available: boolean;
  order: number;
};

export type ScanCustomer = { user_id: string; name: string };
/** What /qr/scan hands the floor: who, where they stand, what to hand over. */
export type ScanResult =
  | {
      kind: "visit";
      status: "ok";
      customer: ScanCustomer;
      visits: number;
      goal: number | null;
      unlocked: { reward_id: string; name: string }[];
    }
  | {
      kind: "redeem";
      /** pending until a member of staff confirms the hand-over. */
      status: "pending" | "delivered";
      customer: ScanCustomer;
      redemption_id: string;
      reward: string;
      visits_spent: number;
    };
export type Redemption = {
  redemption_id: string;
  reward_id: string;
  reward_name: string;
  visits_spent: number;
  redeemed_at: string;
  /** Absent on redemptions made before two-step delivery existed: treat as delivered. */
  status?: "pending" | "delivered";
  delivered_at?: string | null;
};
export type QRStatus = { used: boolean; purpose: "visit" | "redeem"; result: ScanResult | null };

export type MenuCourse = { course: string | null; items: MenuItem[] };
export type MenuSection = { category: string; items: MenuItem[]; courses: MenuCourse[] };

export type DashboardData = {
  total_customers: number;
  active_members: number;
  rewards_redeemed_total: number;
  today_visits: number;
  week_visits: number;
  week_redemptions: number;
  daily_visits_series: { date: string; count: number }[];
  top_rewards: { name: string; count: number }[];
};

/** Turn a stored image path into something an <Image> can fetch. */
export function imageUrl(u?: string | null): string | undefined {
  if (!u) return undefined;
  return /^https?:\/\//i.test(u) ? u : `${BASE}${u}`;
}

const TOKEN_KEY = "clancys_auth_token";
export const tokenStore = {
  async get(): Promise<string | null> {
    return await storage.secureGet<string>(TOKEN_KEY, "");
  },
  async set(t: string) {
    await storage.secureSet(TOKEN_KEY, t);
  },
  async clear() {
    await storage.secureRemove(TOKEN_KEY);
  },
};

async function request<T = any>(
  path: string,
  opts: { method?: string; body?: any; auth?: boolean } = {}
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.auth !== false) {
    const t = await tokenStore.get();
    if (t) headers["Authorization"] = `Bearer ${t}`;
  }
  const r = await fetch(`${BASE}/api${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!r.ok) {
    let d = `HTTP ${r.status}`;
    try { d = (await r.json()).detail || d; } catch {}
    throw new Error(d);
  }
  if (r.status === 204) return undefined as unknown as T;
  return (await r.json()) as T;
}

export const api = {
  // auth
  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: User }>("/auth/register",
      { method: "POST", body: { email, password, name }, auth: false }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/auth/login",
      { method: "POST", body: { email, password }, auth: false }),
  googleLogin: (id_token: string, nonce?: string) =>
    request<{ token: string; user: User }>("/auth/google",
      { method: "POST", body: { id_token, nonce }, auth: false }),
  me: () => request<User>("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),

  // restaurant
  restaurant: () => request<Restaurant>("/restaurant", { auth: false }),

  // loyalty
  loyalty: () => request<Loyalty>("/loyalty"),
  rewards: () => request<Reward[]>("/rewards", { auth: false }),
  redemptions: () => request<Redemption[]>("/redemptions"),
  deliverRedemption: (rid: string) =>
    request<Redemption>(`/redemptions/${rid}/deliver`, { method: "POST" }),
  qrStatus: (token: string) =>
    request<QRStatus>(`/qr/status/${encodeURIComponent(token)}`),
  generateQR: (purpose: "visit" | "redeem" = "visit", reward_id?: string) =>
    request<{ token: string; expires_at: string; purpose: string }>("/qr/generate",
      { method: "POST", body: { purpose, reward_id } }),
  scanQR: (token: string) =>
    request<ScanResult>("/qr/scan", { method: "POST", body: { token } }),

  // promotions & menu (public)
  promotions: () => request<Promotion[]>("/promotions", { auth: false }),
  menu: () => request<MenuSection[]>("/menu", { auth: false }),

  // push
  registerPush: (platform: string, device_token: string) =>
    request("/register-push", { method: "POST", body: { platform, device_token } }),

  // ----- ADMIN -----
  adminDashboard: () => request<DashboardData>("/admin/dashboard"),
  adminListRewards: () => request<Reward[]>("/admin/rewards"),
  adminCreateReward: (b: Omit<Reward, "reward_id">) =>
    request<Reward>("/admin/rewards", { method: "POST", body: b }),
  adminUpdateReward: (id: string, b: Omit<Reward, "reward_id">) =>
    request<Reward>(`/admin/rewards/${id}`, { method: "PATCH", body: b }),
  adminDeleteReward: (id: string) =>
    request(`/admin/rewards/${id}`, { method: "DELETE" }),

  adminListPromotions: () => request<Promotion[]>("/admin/promotions"),
  adminCreatePromotion: (b: Omit<Promotion, "promotion_id">) =>
    request<Promotion>("/admin/promotions", { method: "POST", body: b }),
  adminUpdatePromotion: (id: string, b: Omit<Promotion, "promotion_id">) =>
    request<Promotion>(`/admin/promotions/${id}`, { method: "PATCH", body: b }),
  adminDeletePromotion: (id: string) =>
    request(`/admin/promotions/${id}`, { method: "DELETE" }),

  adminListMenu: () => request<MenuItem[]>("/admin/menu"),
  adminCreateMenu: (b: Omit<MenuItem, "item_id">) =>
    request<MenuItem>("/admin/menu", { method: "POST", body: b }),
  adminUpdateMenu: (id: string, b: Omit<MenuItem, "item_id">) =>
    request<MenuItem>(`/admin/menu/${id}`, { method: "PATCH", body: b }),
  adminDeleteMenu: (id: string) =>
    request(`/admin/menu/${id}`, { method: "DELETE" }),

  // Uploads. The API answers with a path, not a URL, so an image keeps working
  // when the backend moves between localhost, the LAN address and production.
  adminUploadImage: async (uri: string, name = "photo.jpg") => {
    const form = new FormData();
    const type = /\.png$/i.test(uri) ? "image/png" : /\.webp$/i.test(uri) ? "image/webp" : "image/jpeg";
    // React Native's FormData takes this shape; the DOM's File type does not describe it.
    form.append("file", { uri, name, type } as unknown as Blob);
    return request<{ url: string; bytes: number }>("/admin/uploads", { method: "POST", body: form });
  },

  adminListStaff: () => request<User[]>("/admin/staff"),
  adminCreateStaff: (b: { email: string; name: string; role: string; password: string }) =>
    request<User>("/admin/staff", { method: "POST", body: b }),
  adminUpdateStaff: (id: string, b: Partial<{ name: string; role: string; active: boolean }>) =>
    request<User>(`/admin/staff/${id}`, { method: "PATCH", body: b }),
  adminDeleteStaff: (id: string) =>
    request(`/admin/staff/${id}`, { method: "DELETE" }),

  adminListCustomers: () =>
    request<(User & { visits: number; lifetime_visits: number })[]>("/admin/customers"),
  adminActivityLog: () =>
    request<any[]>("/admin/activity-log"),
};

export { BASE };
