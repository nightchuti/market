import { useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import LoginModal from "../components/LoginModal";
import RegisterModal from "../components/RegisterModal";

export default function Layout() {
  const [login, setLogin] = useState(false);
  const [register, setRegister] = useState(false);

  return (
    <>
      <Navbar
        onLogin={() => setLogin(true)}
        onRegister={() => setRegister(true)}
      />
      <div style={{ paddingTop: "72px" }}>
        <Outlet />
      </div>

      {login && <LoginModal close={() => setLogin(false)} />}
      {register && <RegisterModal close={() => setRegister(false)} />}
    </>
  );
}
