import axios from "axios";

const BASE_URL = "http://localhost:3000";

export const axiosInstance = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
});

export { BASE_URL };
