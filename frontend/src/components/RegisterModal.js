import { useState } from "react";
import axios from "axios";
import "./AuthModal.css";

function RegisterModal({ close }) {
  const [form, setForm] = useState({
    username: "",
    email: "",
    phonenumber: "",
    password: "",
    confirmPassword: "",
    role: "nisit",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const submit = async () => {
    try {
      setError("");

      // ✅ เช็คแค่กรอกไม่ครบ
      if (
        !form.username ||
        !form.email ||
        !form.phonenumber ||
        !form.password ||
        !form.confirmPassword
      ) {
        setError("กรุณากรอกข้อมูลให้ครบถ้วน");
        return;
      }

      // ✅ เช็ครหัสผ่านตรงกัน
      if (form.password !== form.confirmPassword) {
        setError("รหัสผ่านไม่ตรงกัน");
        return;
      }

      setLoading(true);

      const res = await axios.post(
        "http://localhost:5000/api/auth/register",
        {
          username: form.username,
          email: form.email,
          phonenumber: form.phonenumber,
          password: form.password,
          role: form.role,
        }
      );

      // สมัครเสร็จ = login อัตโนมัติ
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
      }

      if (res.data.user) {
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }

      window.location.reload();

    } catch (err) {
      setError(err.response?.data?.message || "สมัครไม่สำเร็จ");
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

        <input
          name="confirmPassword"
          type="password"
          placeholder="Confirm Password"
          value={form.confirmPassword}
          onChange={handleChange}
        />

        <select
          name="role"
          value={form.role}
          onChange={handleChange}
        >
          <option value="nisit">Nisit</option>
          <option value="staff">Staff</option>
          <option value="shop">Shop</option>
        </select>

        {error && <p className="error-text">{error}</p>}

        <button
          className="btn-main"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </button>
      </div>
    </div>
  );
}

export default RegisterModal;
