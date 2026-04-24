import axios from "axios";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const generateAdFromImage = async (imageFile) => {
  const formData = new FormData();
  formData.append("productImage", imageFile);

  const response = await axios.post("/api/ads/generate", formData, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  return response.data;
};

export const fetchAdHistory = async (page = 1) => {
  const response = await axios.get(`/api/ads/history?page=${page}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  return response.data;
};

export const fetchVideoLibrary = async (page = 1, limit = 12) => {
  const response = await axios.get(`/api/ads/videos?page=${page}&limit=${limit}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });

  return response.data;
};
