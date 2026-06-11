import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

const api = axios.create({
  // In development, use localhost. In production, use relative path which Vercel will route
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

export const getTextbooks = () => api.get('/textbooks');
export const getLevels = (textbookId) => api.get(`/textbooks/${textbookId}/levels`);
export const getLessons = (levelId) => api.get(`/levels/${levelId}/lessons`);
export const getLessonContent = (lessonId) => api.get(`/lessons/${lessonId}`);
export const addAnnotation = (lessonId, annotationData) => api.post(`/lessons/${lessonId}/annotations`, annotationData);
export const deleteAnnotation = (annotationId) => api.delete(`/annotations/${annotationId}`);

export default api;
