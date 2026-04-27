import axios from 'axios';

const api = axios.create({
  // In development, use localhost. In production, use relative path which Vercel will route
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

export const getTextbooks = () => api.get('/textbooks');
export const getLevels = (textbookId) => api.get(`/textbooks/${textbookId}/levels`);
export const getLessons = (levelId) => api.get(`/levels/${levelId}/lessons`);
export const getLessonContent = (lessonId) => api.get(`/lessons/${lessonId}`);
export const addAnnotation = (lessonId, annotationData) => api.post(`/lessons/${lessonId}/annotations`, annotationData);
export const deleteAnnotation = (annotationId) => api.delete(`/annotations/${annotationId}`);

export default api;
