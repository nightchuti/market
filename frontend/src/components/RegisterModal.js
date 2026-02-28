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
  const [passwordStrength, setPasswordStrength] = useState(0); // 0-4

  // ===== Validation Rules =====
  const validate = {
    username: (v) => {
      if (!v) return "กรุณากรอก Username";
      if (v.length < 3 || v.length > 20) return "Username ต้องมี 3-20 ตัวอักษร";
      if (!/^[a-zA-Z0-9_]+$/.test(v)) return "Username ใช้ได้เฉพาะ a-z, A-Z, 0-9, _ เท่านั้น";
      return null;
    },
    email: (v) => {
      if (!v) return "กรุณากรอก Email";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "รูปแบบ Email ไม่ถูกต้อง";
      return null;
    },
    phonenumber: (v) => {
      if (!v) return "กรุณากรอกเบอร์โทรศัพท์";
      if (!/^0[0-9]{9}$/.test(v)) return "เบอร์โทรต้องเริ่มด้วย 0 และมี 10 หลัก";
      return null;
    },
    password: (v) => {
      if (!v) return "กรุณากรอกรหัสผ่าน";
      if (v.length < 8) return "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
      if (!/[A-Z]/.test(v)) return "รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว";
      if (!/[a-z]/.test(v)) return "รหัสผ่านต้องมีตัวอักษรพิมพ์เล็กอย่างน้อย 1 ตัว";
      if (!/[0-9]/.test(v)) return "รหัสผ่านต้องมีตัวเลขอย่างน้อย 1 ตัว";
      if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v))
        return "รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว เช่น !@#$%";
      return null;
    },
  };

  // ===== คำนวณความแข็งแกร่งรหัสผ่าน =====
  const calcStrength = (v) => {
    let score = 0;
    if (v.length >= 8) score++;
    if (/[A-Z]/.test(v)) score++;
    if (/[0-9]/.test(v)) score++;
    if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(v)) score++;
    return score;
  };

  const strengthLabel = ["", "อ่อนมาก", "อ่อน", "ปานกลาง", "แข็งแกร่ง"];
  const strengthColor = ["", "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71"];

  // ===== handle input =====
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    setError("");
    if (name === "password") setPasswordStrength(calcStrength(value));
  };

  // ===== submit register =====
  const submit = async (e) => {
    e.preventDefault();

    // ตรวจสอบทุก field
    for (const field of ["username", "email", "phonenumber", "password"]) {
      const msg = validate[field](form[field]);
      if (msg) { setError(msg); return; }
    }

    if (!form.confirmPassword) { setError("กรุณายืนยันรหัสผ่าน"); return; }
    if (form.password !== form.confirmPassword) { setError("รหัสผ่านไม่ตรงกัน"); return; }

    try {
      setLoading(true);
      const res = await api.post("/api/auth/register", {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        phonenumber: form.phonenumber.trim(),
        password: form.password,
        role: form.role,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      close();
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || "สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  // ===== UI =====
  return (
    <div className="modal-overlay">
      <form className="modal-card" onSubmit={submit}>
        <button type="button" className="close" onClick={close}>×</button>
        <h2>สมัครสมาชิก</h2>

        <input
          name="username"
          placeholder="Username (a-z, A-Z, 0-9, _)"
          value={form.username}
          onChange={handleChange}
          maxLength={20}
          autoComplete="username"
        />

        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
        />

        <input
          name="phonenumber"
          placeholder="เบอร์โทร (0XXXXXXXXX)"
          value={form.phonenumber}
          onChange={handleChange}
          maxLength={10}
          inputMode="numeric"
        />

        <input
          name="password"
          type="password"
          placeholder="Password (อย่างน้อย 8 ตัว, A-Z, 0-9, อักขระพิเศษ)"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
        />

        {/* Password Strength Bar */}
        {form.password.length > 0 && (
          <div style={{ width: "100%", marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    height: 5,
                    borderRadius: 4,
                    background: i <= passwordStrength ? strengthColor[passwordStrength] : "#eee",
                    transition: "background 0.3s",
                  }}
                />
              ))}
            </div>
            <p style={{ fontSize: 12, color: strengthColor[passwordStrength], margin: 0, textAlign: "left" }}>
              ความแข็งแกร่ง: {strengthLabel[passwordStrength]}
            </p>
          </div>
        )}

        <input
          name="confirmPassword"
          type="password"
          placeholder="ยืนยัน Password"
          value={form.confirmPassword}
          onChange={handleChange}
          autoComplete="new-password"
        />

        <select name="role" value={form.role} onChange={handleChange}>
          <option value="nisit">Nisit</option>
          <option value="staff">Staff</option>
          <option value="shop">Shop</option>
        </select>

        {error && <p className="error-text" style={{ color: "#e74c3c", fontSize: 13, margin: "4px 0" }}>{error}</p>}

        <button className="btn-main" type="submit" disabled={loading}>
          {loading ? "กำลังสมัคร..." : "สมัครสมาชิก"}
        </button>
      </form>
    </div>
  );
}

export default RegisterModal;