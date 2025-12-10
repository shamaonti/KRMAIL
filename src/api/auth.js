import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';

export async function registerUser(name, email, password) {
  const res = await axios.post(`${API_BASE_URL}/api/auth/register`, {
    name,
    email,
    password,
  });
  return res.data;
}

export async function loginUser(email, password) {
  const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
    email,
    password,
  });
  return res.data;
}
