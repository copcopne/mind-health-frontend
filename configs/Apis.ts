import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = 'http://10.0.2.2:8080/MindHealth/api';
export const endpoints = {
    login: '/auth/login',
    refresh: '/auth/refresh',
    verifyRequest: '/auth/email-verify/request',
    verify: '/auth/email-verify',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',

    users: '/users',
    profile: '/users/profile'
};
const api = axios.create({
    baseURL: BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("accessToken") || null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
