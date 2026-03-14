// ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import Navbar from "./Navbar";

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  // Check token expiry if it's a JWT
  const isTokenValid = () => {
    if (!token) return false;
    try {
      // JWT format: header.payload.signature
      const payload = JSON.parse(atob(token.split(".")[1]));
      // exp is in seconds, Date.now() is in milliseconds
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("token"); // clean up expired token
        return false;
      }
      return true;
    } catch {
      // Not a JWT or malformed — just check if token exists
      return !!token;
    }
  };

  if (!isTokenValid()) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}