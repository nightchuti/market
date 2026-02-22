import { useState } from "react";
import "./AuthModal.css";
import api from "../api";

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

  // ===== handle input =====
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  // ===== submit register =====
  const submit = async (e) => {
    e.preventDefault();
    try {
      setError("");

      // ✅ ตรวจสอบกรอกครบ
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

      // ✅ ตรวจสอบรหัสผ่านตรงกัน
      if (form.password !== form.confirmPassword) {
        setError("รหัสผ่านไม่ตรงกัน");
        return;
      }

      setLoading(true);

      console.log("Register payload:", {
        username: form.username,
        email: form.email,
        phonenumber: form.phonenumber,
        password: form.password,
        role: form.role,
      });

      const res = await api.post("/api/auth/register", {
        username: form.username,
        email: form.email,
        phonenumber: form.phonenumber,
        password: form.password,
        role: form.role,
      });

      // ✅ สมัครเสร็จ → login อัตโนมัติ
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      close();
      window.location.reload();

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  // ===== UI =====
  return (
    <div className="modal-overlay">
      <form className="modal-card" onSubmit={submit}>

        <button
          type="button"
          className="close"
          onClick={close}
        >
          ×
        </button>

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
          type="submit"
          disabled={loading}
        >
          {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </button>

      </form>
    </div>
  );
}

export default RegisterModal;
