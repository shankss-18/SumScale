import axios from 'axios';

// Base URL: Vite environment variable or local dev proxy
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// In-memory token storage with localStorage backup for reload persistence
let inMemoryAccessToken = localStorage.getItem('access_token');
let onUnauthorizedCallback = null;

export const setAccessToken = (token) => {
  inMemoryAccessToken = token;
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
};

export const getAccessToken = () => inMemoryAccessToken;

export const setUnauthorizedCallback = (callback) => {
  onUnauthorizedCallback = callback;
};

// Request Interceptor: Attach Bearer token from memory if present
apiClient.interceptors.request.use(
  (config) => {
    if (inMemoryAccessToken) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Catch 401 Unauthorized and redirect to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      setAccessToken(null);
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth Endpoints ---
export const apiRegister = (email, password, phoneNumber = null) =>
  apiClient.post('/auth/register', { email, password, phone_number: phoneNumber });

export const apiLogin = (emailOrPhone, password) =>
  apiClient.post('/auth/login', { email: emailOrPhone, password });

export const apiSendOTP = (identifier, purpose = 'login') =>
  apiClient.post('/auth/send-otp', { identifier, purpose });

export const apiVerifyOTP = (identifier, otpCode, fullName = null) =>
  apiClient.post('/auth/verify-otp', { identifier, otp_code: otpCode, full_name: fullName });

export const apiGetMe = () => apiClient.get('/auth/me');

// --- Case Endpoints ---
export const apiCreateCase = (department, description) =>
  apiClient.post('/cases', { department, description });

export const apiUploadCaseFile = (caseId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return apiClient.post(`/cases/${caseId}/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const apiAnalyzeCase = (caseId, language = 'en') =>
  apiClient.post(`/cases/${caseId}/analyze?language=${language}`);

export const apiClarifyCase = (caseId, answers) =>
  apiClient.post(`/cases/${caseId}/clarify`, answers);

export const apiListCases = (params = {}) =>
  apiClient.get('/cases', { params });

export const apiGetCase = (caseId) =>
  apiClient.get(`/cases/${caseId}`);

export const apiDeleteCase = (caseId) =>
  apiClient.delete(`/cases/${caseId}`);

export const apiUpdateCaseTitle = (caseId, title) =>
  apiClient.patch(`/cases/${caseId}/title`, { title });

export const apiSaveCaseChatHistory = (caseId, messages) =>
  apiClient.post(`/cases/${caseId}/messages`, { messages });


export const getFileDownloadUrl = (caseId, fileId) =>
  `${API_BASE_URL}/cases/${caseId}/files/${fileId}`;

// --- Chat & Reminders ---
export const apiChat = (message, language = 'en', chatHistory = []) =>
  apiClient.post('/chat', { message, language, chat_history: chatHistory });

export const apiListReminders = (statusFilter = null) => {
  const params = statusFilter ? { status: statusFilter } : {};
  return apiClient.get('/reminders', { params });
};

export const apiCompleteReminder = (reminderId) =>
  apiClient.put(`/reminders/${reminderId}/complete`);
