import { useState } from "react";
import "./AuthModal.css";
import { api } from "../api";

function LoginModal({ close, switchToRegister }) {
  const [form, setForm] = useState({});

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async () => {
    try {
      const res = await api.post("/api/auth/login", form);

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      close();
    } catch (err) {
      alert("Login failed");
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
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
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
