// ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import Navbar from "./Navbar";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
