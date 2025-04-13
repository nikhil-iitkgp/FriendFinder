import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:7000"; // Backend URL

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export const getNearbyFriendsByWiFi = async () => {
  try {
      const response = await api.get("/api/friends/nearby-wifi");
      return response.data;
  } catch (error) {
      console.error("Error fetching nearby friends:", error);
      return [];
  }
};


export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = token;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};
