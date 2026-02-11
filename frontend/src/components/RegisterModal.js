import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./AuthModal.css";

function RegisterModal({ close }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    phonenumber: "",
    password: "",
    role: "nisit",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async () => {
    try {
      setError("");
      setLoading(true);

      const res = await axios.post(
        "http://localhost:5000/api/auth/register",
        form
      );

      // เก็บ token (ถ้ามี)
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }

      // ไปหน้า home
      navigate("/home");

    } catch (err) {
      setError(err.response?.data?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <button className="close" onClick={close}>×</button>

        <h2>สมัครสมาชิก</h2>

        <input
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
        />

        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />

        <input
          name="phonenumber"
          placeholder="Phone Number"
          value={form.phonenumber}
          onChange={handleChange}
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />

        <select name="role" value={form.role} onChange={handleChange}>
          <option value="nisit">Nisit</option>
          <option value="staff">Staff</option>
          <option value="shop">Shop</option>
        </select>

        {error && <p className="error-text">{error}</p>}

        <button className="btn-main" onClick={submit} disabled={loading}>
          {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </button>
      </div>
    </div>
  );
}

export default RegisterModal;
