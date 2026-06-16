import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('skc_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('skc_token');
      localStorage.removeItem('skc_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  register: (data: { email: string; password: string; fullName: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  updateProfile: (data: { fullName?: string; bio?: string; avatar?: string }) =>
    api.put('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', data),
};

// Skills
export const uploadsApi = {
  uploadImages: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));

    return api.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const skillsApi = {
  getAll: (params?: Record<string, string | number>) =>
    api.get('/skills', { params }),
  getCategories: () => api.get('/skills/categories'),
  getMy: () => api.get('/skills/my'),
  getById: (id: number) => api.get(`/skills/${id}`),
  create: (data: { title: string; description: string; category: string; price: number; coverImage?: string; galleryImages?: string[]; availabilitySlots?: Array<{ day: string; start: string; end: string; label: string }>; isPublished?: boolean }) =>
    api.post('/skills', data),
  update: (id: number, data: Partial<{ title: string; description: string; category: string; price: number; coverImage?: string; galleryImages?: string[]; availabilitySlots?: Array<{ day: string; start: string; end: string; label: string }>; isPublished?: boolean }>) =>
    api.put(`/skills/${id}`, data),
  delete: (id: number) => api.delete(`/skills/${id}`),
};

// Bookings
export const bookingsApi = {
  getMy: (params?: { role?: string; status?: string }) =>
    api.get('/bookings/my', { params }),
  getById: (id: number) => api.get(`/bookings/${id}`),
  create: (data: { skillId: number; scheduledAt: string; durationHours?: number; message?: string }) =>
    api.post('/bookings', data),
  confirm: (id: number) => api.post(`/bookings/${id}/confirm`),
  // Teacher confirmation (accept booking) uses PUT
  teacherConfirm: (id: number) => api.put(`/bookings/${id}/confirm`),
  reject: (id: number, reason?: string) => api.put(`/bookings/${id}/reject`, { reason }),
  complete: (id: number) => api.put(`/bookings/${id}/complete`),
  cancel: (id: number, reason?: string) => api.put(`/bookings/${id}/cancel`, { reason }),
  dispute: (id: number, reason: string) => api.put(`/bookings/${id}/dispute`, { reason }),
};

// Reviews
export const reviewsApi = {
  getBySkill: (skillId: number) => api.get(`/reviews/skill/${skillId}`),
  getByTeacher: (teacherId: number) => api.get(`/reviews/teacher/${teacherId}`),
  create: (data: { bookingId: number; rating: number; comment?: string }) =>
    api.post('/reviews', data),
};

// Transactions
export const transactionsApi = {
  getMy: (params?: { page?: number; limit?: number; type?: string }) =>
    api.get('/transactions/my', { params }),
};

// Admin
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params?: Record<string, string | number>) =>
    api.get('/admin/users', { params }),
  getUserById: (id: number) => api.get(`/admin/users/${id}`),
  updateUserStatus: (id: number, status: string) =>
    api.put(`/admin/users/${id}/status`, { status }),
  adjustSkc: (id: number, amount: number, reason: string) =>
    api.put(`/admin/users/${id}/adjust-skc`, { amount, reason }),
  getSkills: (params?: Record<string, string | number>) =>
    api.get('/admin/skills', { params }),
  approveSkill: (id: number) => api.put(`/admin/skills/${id}/approve`),
  rejectSkill: (id: number, reason: string) =>
    api.put(`/admin/skills/${id}/reject`, { reason }),
  deleteSkill: (id: number) => api.delete(`/admin/skills/${id}`),
  getBookings: (params?: Record<string, string | number>) =>
    api.get('/admin/bookings', { params }),
  resolveDispute: (id: number, resolution: string) =>
    api.put(`/admin/bookings/${id}/resolve-dispute`, { resolution }),
};

// Deposits
export const depositsApi = {
  getQrConfig: () => api.get('/deposits/qr-config'),
  getTiers: () => api.get('/deposits/tiers'),
  submit: (data: { tierId?: number; amount?: number; username: string; email: string; transferProofImage?: string }) => api.post('/deposits/submit', data),
  getMy: () => api.get('/deposits/my'),
  // Admin
  list: () => api.get('/deposits'),
  approve: (id: number) => api.put(`/deposits/${id}/approve`),
  reject: (id: number, reason: string) => api.put(`/deposits/${id}/reject`, { reason }),
  createTier: (data: { amount: number; skc: number }) => api.post('/deposits/tiers', data),
  createQrConfig: (data: { qrImageUrl: string; bankName: string; bankAccount?: string; accountHolder?: string; description?: string; isActive?: boolean }) => api.post('/deposits/qr-config', data),
};
