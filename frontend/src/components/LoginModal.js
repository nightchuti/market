import { useState } from "react";
import api from "../api";
import "./AuthModal.css";

function LoginModal({ close, switchToRegister }) {
  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async () => {
    try {
      const res = await api.post("/api/auth/login", {
        email: form.email,
        password: form.password
      });

      // เก็บ token + user
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      const user = res.data.user;

      close(); // ปิด modal

      if (
        user.email === "admin@gmail.com" &&
        user.role === "admin"
      ) {
        window.location.href = "/admin";
        return;
      }

      window.location.href = "/";

      // close();
      // window.location.reload();
    } catch (err) {
      console.log(err.response?.data);
      alert(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <button className="close" onClick={close}>×</button>

        <h2>เข้าสู่ระบบ</h2>

        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
        />

        <input
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
        />

        <button className="btn-main" onClick={submit}>
          เข้าสู่ระบบ
        </button>

        <p className="switch">
          ยังไม่มีบัญชี?
          <span onClick={switchToRegister}> สมัครสมาชิก</span>
        </p>
      </div>
    </div>
  );
}

export default LoginModal;
