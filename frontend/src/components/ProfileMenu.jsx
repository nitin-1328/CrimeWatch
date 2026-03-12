import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    navigate('/login');
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-2 bg-bg/40 hover:bg-bg/60 px-3 py-1 rounded-md"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] flex items-center justify-center text-white font-semibold">NW</div>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-card-dark p-2">
          <button className="w-full text-left px-3 py-2 text-sm text-white hover:bg-bg/60 rounded">Profile</button>
          <button className="w-full text-left px-3 py-2 text-sm text-white hover:bg-bg/60 rounded">Settings</button>
          <button className="w-full text-left px-3 py-2 text-sm text-white hover:bg-bg/60 rounded">Help</button>
          <hr className="my-2 border-t border-bg/60" />
          <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-bg/60 rounded">Logout</button>
        </div>
      )}
    </div>
  );
}
