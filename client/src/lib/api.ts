import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear token and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("admin_token");
      window.location.href = "/login";
    }
    return Promise.reject(err as Error);
  }
);

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: "admin" | "editor";
}

export interface LoginResponse {
  token: string;
  user: AdminUser;
}

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>("/api/auth/login", { email, password }),
  logout: () => api.post("/api/auth/logout"),
  me: () => api.get<AdminUser>("/api/auth/me"),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post("/api/auth/change-password", { currentPassword, newPassword }),
};

// ── Mass Times ────────────────────────────────────────────────────────────────

export interface MassTime {
  id: number;
  day: string;
  times: string[];
  location: string;
  locationTimes?: string | null;
  language: string;
  notes?: string;
  isActive: boolean;
  sortOrder: number;
}

export type MassTimeInput = Omit<MassTime, "id">;

export const massTimesApi = {
  getAll: () => api.get<MassTime[]>("/api/mass-times"),
  create: (data: MassTimeInput) => api.post<MassTime>("/api/mass-times", data),
  update: (id: number, data: Partial<MassTimeInput>) =>
    api.put<MassTime>(`/api/mass-times/${id}`, data),
  delete: (id: number) => api.delete(`/api/mass-times/${id}`),
  reorder: (ids: number[]) => api.post("/api/mass-times/reorder", { ids }),
};

// ── Events ────────────────────────────────────────────────────────────────────

export interface Event {
  id: number;
  title: string;
  description: string;
  date: string;
  endDate?: string;
  time: string;
  location: string;
  locationTimes?: string | null;
  category: string;
  imageUrl?: string;
  isRecurring: boolean;
  recurringPattern?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EventInput = Omit<Event, "id" | "createdAt" | "updatedAt">;

export const eventsApi = {
  getAll: (params?: { published?: boolean; category?: string }) =>
    api.get<Event[]>("/api/events", { params }),
  getById: (id: number) => api.get<Event>(`/api/events/${id}`),
  create: (data: EventInput) => api.post<Event>("/api/events", data),
  update: (id: number, data: Partial<EventInput>) =>
    api.put<Event>(`/api/events/${id}`, data),
  delete: (id: number) => api.delete(`/api/events/${id}`),
  uploadImage: (id: number, formData: FormData) =>
    api.post<Event>(`/api/events/${id}/image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// ── Gallery ───────────────────────────────────────────────────────────────────

export interface GalleryImage {
  id: number;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  album?: string;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
}

export const galleryApi = {
  getAll: (params?: { album?: string; includeHidden?: boolean }) =>
    params?.includeHidden
      ? api.get<GalleryImage[]>('/api/gallery/admin', { params: { album: params.album } })
      : api.get<GalleryImage[]>('/api/gallery', { params }),
  upload: (formData: FormData) =>
    api.post<GalleryImage>("/api/gallery/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id: number, data: Partial<Pick<GalleryImage, "title" | "description" | "album" | "sortOrder" | "isPublished">>) =>
    api.put<GalleryImage>(`/api/gallery/${id}`, data),
  delete: (id: number) => api.delete(`/api/gallery/${id}`),
  getAlbums: (includeHidden?: boolean) =>
    includeHidden ? api.get<string[]>('/api/gallery/albums/admin') : api.get<string[]>('/api/gallery/albums'),
};

// ── Bulletins ─────────────────────────────────────────────────────────────────

export interface Bulletin {
  id: number;
  title: string;
  date: string;
  fileUrl: string;
  fileSize?: number;
  isPublished: boolean;
  createdAt: string;
}

export const bulletinsApi = {
  getAll: () => api.get<Bulletin[]>("/api/bulletins"),
  upload: (formData: FormData) =>
    api.post<Bulletin>("/api/bulletins/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  update: (id: number, data: Partial<Pick<Bulletin, "title" | "date" | "isPublished">>) =>
    api.put<Bulletin>(`/api/bulletins/${id}`, data),
  delete: (id: number) => api.delete(`/api/bulletins/${id}`),
};

// ── Parish Info ───────────────────────────────────────────────────────────────

export interface ParishInfo {
  id: number;
  parishName: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  officeHours: string;
  facebookUrl?: string;
  youtubeUrl?: string;
  instagramUrl?: string;
  missionStatement: string;
  welcomeMessage: string;
  updatedAt: string;
}

export const parishInfoApi = {
  get: () => api.get<ParishInfo>("/api/parish-info"),
  update: (data: Partial<Omit<ParishInfo, "id" | "updatedAt">>) =>
    api.put<ParishInfo>("/api/parish-info", data),
};

// ── Parish Priest ─────────────────────────────────────────────────────────────────

export interface PriestProfile {
  id: number;
  name: string;
  title: string;
  bio: string;
  shortBio: string;
  photoUrl?: string;
  ordainedYear?: number;
  email?: string;
  phone?: string;
  updatedAt: string;
}

export const priestApi = {
  get: () => api.get<PriestProfile>("/api/priest"),
  update: (data: Partial<Omit<PriestProfile, "id" | "updatedAt">>) =>
    api.put<PriestProfile>("/api/priest", data),
  uploadPhoto: (formData: FormData) =>
    api.post<PriestProfile>("/api/priest/photo", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  setPhotoFromGallery: (galleryImageId: number) =>
    api.post<PriestProfile>("/api/priest/photo-from-gallery", { galleryImageId }),
};

// ── Sacraments ────────────────────────────────────────────────────────────────

export interface SacramentContent {
  id: number;
  slug: string;
  name: string;
  description: string;
  requirements?: string;
  process?: string;
  contactInfo?: string;
  isActive: boolean;
  updatedAt: string;
}

export const sacramentsApi = {
  getAll: () => api.get<SacramentContent[]>("/api/sacraments"),
  getById: (id: number) => api.get<SacramentContent>(`/api/sacraments/${id}`),
  update: (id: number, data: Partial<Omit<SacramentContent, "id" | "slug" | "updatedAt">>) =>
    api.put<SacramentContent>(`/api/sacraments/${id}`, data),
};

// ── Rentals ───────────────────────────────────────────────────────────────────

export interface RentalSpace {
  id: number;
  name: string;
  description: string;
  capacity?: number;
  pricePerHour?: number;
  pricePerDay?: number;
  amenities: string[];
  imageUrls: string[];
  bookingEmail: string;
  bookingPhone?: string;
  notes?: string;
  isAvailable: boolean;
  updatedAt: string;
}

export const rentalsApi = {
  getAll: () => api.get<RentalSpace[]>("/api/rentals"),
  getById: (id: number) => api.get<RentalSpace>(`/api/rentals/${id}`),
  create: (data: Omit<RentalSpace, "id" | "updatedAt">) =>
    api.post<RentalSpace>("/api/rentals", data),
  update: (id: number, data: Partial<Omit<RentalSpace, "id" | "updatedAt">>) =>
    api.put<RentalSpace>(`/api/rentals/${id}`, data),
  delete: (id: number) => api.delete(`/api/rentals/${id}`),
  // Reuse central gallery upload endpoint to store rental images and return gallery image metadata
  uploadImage: (formData: FormData) =>
    api.post<GalleryImage>("/api/gallery/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// ── Get Involved / Ministries ─────────────────────────────────────────────────

export interface Ministry {
  id: number;
  name: string;
  description: string;
  meetingTime?: string;
  contactName?: string;
  contactEmail?: string;
  imageUrl?: string;
  category: string;
  isActive: boolean;
  sortOrder: number;
}

export const ministriesApi = {
  getAll: () => api.get<Ministry[]>("/api/ministries"),
  create: (data: Omit<Ministry, "id">) => api.post<Ministry>("/api/ministries", data),
  update: (id: number, data: Partial<Omit<Ministry, "id">>) =>
    api.put<Ministry>(`/api/ministries/${id}`, data),
  delete: (id: number) => api.delete(`/api/ministries/${id}`),
};

// ── Dashboard Stats ───────────────────────────────────────────────────────────

export interface DashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  totalGalleryImages: number;
  totalBulletins: number;
  lastUpdated: string;
}

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>("/api/dashboard/stats"),
};

// ── Pastoral Unit Parishes ────────────────────────────────────────────────────

export interface PastoralParish {
  id: number;
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  facebookUrl?: string;
  massTimes?: string;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
}

export type PastoralParishInput = Omit<PastoralParish, "id" | "updatedAt">;

export const pastoralUnitApi = {
  getAll: () => api.get<PastoralParish[]>("/api/pastoral-unit"),
  create: (data: PastoralParishInput) => api.post<PastoralParish>("/api/pastoral-unit", data),
  update: (id: number, data: Partial<PastoralParishInput>) =>
    api.put<PastoralParish>(`/api/pastoral-unit/${id}`, data),
  delete: (id: number) => api.delete(`/api/pastoral-unit/${id}`),
};

// ── Pages ─────────────────────────────────────────────────────────────────────

export interface Page {
  id: number;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonical?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: string | null;
  robots?: string | null;
  imageUrl: string | null;
  bodyImageUrl: string | null;
  bodyImageCaption: string | null;
  isPublished: boolean;
  showInNav: boolean;
  navLabel: string | null;
  navPosition: "top" | "church" | "ministries" | "sacraments" | "sacraments-faith-education";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export type PageInput = Omit<Page, "id" | "createdAt" | "updatedAt" | "imageUrl" | "bodyImageUrl" | "bodyImageCaption"> & {
  imageUrl?: string | null;
  bodyImageUrl?: string | null;
  bodyImageCaption?: string | null;
};

export const pagesApi = {
  getAll: () => api.get<Page[]>("/api/pages"),
  getBySlug: (slug: string) => api.get<Page>(`/api/pages/${slug}`),
  create: (data: Omit<PageInput, "slug"> & { slug?: string }) =>
    api.post<Page>("/api/pages", data),
  update: (id: number, data: Partial<PageInput>) =>
    api.put<Page>(`/api/pages/${id}`, data),
  delete: (id: number) => api.delete(`/api/pages/${id}`),
  uploadImage: (id: number, formData: FormData) =>
    api.post<Page>(`/api/pages/${id}/image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  uploadBodyImage: (id: number, formData: FormData) =>
    api.post<Page>(`/api/pages/${id}/body-image`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};

// ── Contact Messages (admin) ────────────────────────────────────────────────

export interface ContactMessageRecord {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export const contactMessagesApi = {
  getAll: () => api.get<ContactMessageRecord[]>("/api/contact-messages"),
  getById: (id: number) => api.get<ContactMessageRecord>(`/api/contact-messages/${id}`),
  update: (id: number, data: Partial<Pick<ContactMessageRecord, "isRead"> | Record<string, unknown>>) =>
    api.put<ContactMessageRecord>(`/api/contact-messages/${id}`, data),
  delete: (id: number) => api.delete(`/api/contact-messages/${id}`),
};

// ── Users ─────────────────────────────────────────────────────────────────────

export interface AdminUserRecord {
  id: number;
  email: string;
  name: string;
  role: "admin" | "editor";
  createdAt: string;
}

export type NewUserInput = {
  email: string;
  name: string;
  password: string;
  role: "admin" | "editor";
};

export const usersApi = {
  getAll: () => api.get<AdminUserRecord[]>("/api/users"),
  create: (data: NewUserInput) => api.post<AdminUserRecord>("/api/users", data),
  update: (id: number, data: { name?: string; role?: "admin" | "editor" }) =>
    api.put<AdminUserRecord>(`/api/users/${id}`, data),
  delete: (id: number) => api.delete(`/api/users/${id}`),
};

// ── Storage ────────────────────────────────────────────────────────────────────

export interface BlobFile {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: string;
  ext: string;
  isOrphan: boolean;
}

export interface StorageInfo {
  available: boolean;
  blobs: BlobFile[];
  usedBytes: number;
  limitBytes: number;
}

export const storageApi = {
  getInfo: () => api.get<StorageInfo>("/api/storage"),
  deleteFile: (url: string) => api.delete("/api/storage/file", { data: { url } }),
  deleteOrphans: () => api.delete("/api/storage/orphans"),
};

// ── Homepage Content ───────────────────────────────────────────────────────────

export interface HomepageContent {
  id: number;
  heroVideoUrl?: string | null;
  heroImageUrl: string;
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  updatedAt: string;
}

export interface HomepageFeaturedSection {
  id: number;
  sectionNumber: number;
  icon: string;
  title: string;
  description: string;
  linkTarget: string;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface HomepageData {
  hero: HomepageContent;
  sections: HomepageFeaturedSection[];
}

export const homepageApi = {
  get: () => api.get<HomepageData>("/api/homepage"),
  getAdmin: () => api.get<HomepageData>("/api/homepage/admin"),
  updateHero: (data: Partial<Omit<HomepageContent, "id" | "updatedAt" | "heroVideoUrl" | "heroImageUrl">>) =>
    api.put<HomepageContent>("/api/homepage/hero", data),
  uploadImage: (formData: FormData) =>
    api.post<HomepageContent>("/api/homepage/hero/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  uploadVideo: (formData: FormData) =>
    api.post<HomepageContent>("/api/homepage/hero/video", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteImage: () => api.delete("/api/homepage/hero/image"),
  deleteVideo: () => api.delete("/api/homepage/hero/video"),
  updateSections: (sections: Omit<HomepageFeaturedSection, "updatedAt">[]) =>
    api.put<HomepageFeaturedSection[]>("/api/homepage/sections", sections),
  getSections: () => api.get<HomepageFeaturedSection[]>("/api/homepage/sections"),
};

