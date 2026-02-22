import { Navigate } from "react-router-dom";

const AdminRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (
    !user ||
    user.email !== "admin@gmail.com" ||
    user.role !== "admin"
  ) {
    return <Navigate to="/" />;
  }

  return children;
};

export default AdminRoute;