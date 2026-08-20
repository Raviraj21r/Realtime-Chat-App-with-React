import axios from "axios";

const BASE_URL = import.meta.env.MODE === "development" 
  ? "http://localhost:3000" 
  : "https://realtime-chat-app-with-react.onrender.com";

export const axiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
});

export { BASE_URL };