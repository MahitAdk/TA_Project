import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

const authApi = axios.create({
  baseURL: `${API_BASE_URL}/api/auth`,
});

export const registerUser = (data) => authApi.post("/register", data);
export const loginUser = (data) => authApi.post("/login", data);
