import axios from 'axios';

const API_BASE_URL = '/api';

export async function registerUser(name, email, password) {
  const res = await axios.post(`${API_BASE_URL}/auth/register`, {
    name,
    email,
    password,
  });
  return res.data;
}

export async function loginUser(email, password) {
  const res = await axios.post(`${API_BASE_URL}/auth/login`, {
    email,
    password,
  });
  return res.data;
}
