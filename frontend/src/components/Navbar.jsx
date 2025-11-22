import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <nav className="w-full bg-gray-900 border-b border-gray-700 shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">

        {/* Left Side */}
        <div className="flex items-center space-x-6">
          <Link
            to="/dashboard"
            className="text-xl font-bold text-green-400 hover:text-green-300 transition"
          >
            CrimeWatch
          </Link>

          <div className="hidden md:flex items-center space-x-4">
            <Link to="/dashboard" className="text-gray-300 hover:text-white transition">
              Dashboard
            </Link>

            <Link to="/heatmap" className="text-gray-300 hover:text-white transition">
              Heatmap
            </Link>

            <Link to="/saferoute" className="text-gray-300 hover:text-white transition">
              Safe Route
            </Link>

            <Link to="/report" className="text-gray-300 hover:text-white transition">
              Report
            </Link>

            {/* NEW: ANALYTICS TAB */}
            <Link to="/analytics" className="text-gray-300 hover:text-white transition">
              Analytics
            </Link>
          </div>
        </div>

        {/* Right Side */}
        <div>
          <button
            onClick={logout}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition shadow-md"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
