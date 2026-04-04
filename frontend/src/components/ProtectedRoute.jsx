// ProtectedRoute.jsx
import Navbar from "./Navbar";

export default function ProtectedRoute({ children }) {
  return (
    <div className="min-h-screen bg-[#0B1220] text-white">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}