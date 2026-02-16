import axios from "axios";

const api = axios.create({
  baseURL: "https://testt-zu9t.onrender.com",
  headers: {
    "Content-Type": "application/json"
  }
});

export default api;
