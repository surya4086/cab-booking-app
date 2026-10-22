

import axios from 'axios'

const api = axios.create({
  baseURL: 'https://cab-booking-app-4rla.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Automatically attach the saved JWT to API requests.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

export default api
