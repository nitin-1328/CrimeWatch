import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const nav = useNavigate();
  const handled = useRef(false); // ← prevents double execution

  useEffect(() => {
    if (handled.current) return; // ← skip second run
    handled.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (token) {
      localStorage.setItem("token", token);
      nav("/dashboard", { replace: true });
    } else {
      nav("/login", { replace: true });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      Signing you in...
    </div>
  );
}