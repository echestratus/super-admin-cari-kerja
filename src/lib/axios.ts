import axios from "axios"
import { useAuthStore } from "@/store/auth"
import { toast } from "sonner"

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1",
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      if (error.response.status === 401 || error.response.status === 403) {
        toast.error("Session expired or unauthorized. Please log in again.")
        useAuthStore.getState().logout()
        window.location.href = "/login"
      }
    } else if (error.request) {
      toast.error("Network error. Please check your connection.")
    }
    return Promise.reject(error)
  }
)
