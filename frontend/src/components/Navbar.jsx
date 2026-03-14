import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import ProfileMenu from "./ProfileMenu";

const tabs = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/heatmap", label: "Heatmap" },
  { to: "/saferoute", label: "Safe Route" },
  { to: "/report", label: "Report" },
  { to: "/analytics", label: "Analytics" }
];

export default function Navbar() {
  const location = useLocation();
  const [activePath, setActivePath] = useState(location.pathname);

  useEffect(() => setActivePath(location.pathname), [location.pathname]);

  return (
    <header className="bg-gradient-to-b from-[#071028]/60 via-transparent to-transparent backdrop-blur sticky top-0 z-40">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="text-2xl font-semibold text-accent">CrimeWatch</div>

          <nav className="hidden md:flex gap-6 items-end">
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `relative px-2 py-1 text-sm font-medium transition-colors ${isActive ? "text-white" : "text-[#9AA8B2]"
                  }`
                }
              >
                {({ isActive }) => (
                  <span className="inline-flex flex-col items-center">
                    <span>{tab.label}</span>
                    <span
                      className={`block h-0.5 w-full rounded mt-2 transform transition-transform duration-300 origin-left ${isActive ? "scale-x-100 bg-gradient-to-r from-[#3B82F6] to-[#7C3AED]" : "scale-x-0 bg-transparent"
                        }`}
                    />
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-sm text-[#9AA8B2]">Signed in</div>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}

