import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../api/axios";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const res = await API.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.access_token);
      nav("/dashboard");
    } catch {
      alert("Invalid email or password");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black px-4">
      <div className="w-full max-w-md bg-gray-800/50 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-gray-700">
        
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          CrimeWatch Login
        </h1>

        <form onSubmit={handleLogin} className="space-y-5">
          
          <div>
            <label className="text-gray-300 text-sm">Email</label>
            <input
              type="email"
              className="w-full mt-1 px-4 py-2 rounded-lg bg-gray-900 text-gray-200 border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-gray-300 text-sm">Password</label>
            <input
              type="password"
              className="w-full mt-1 px-4 py-2 rounded-lg bg-gray-900 text-gray-200 border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition text-white font-semibold"
          >
            Login
          </button>
        </form>

        <p className="text-gray-400 text-center mt-6">
          First time?{" "}
          <Link to="/register" className="text-blue-400 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
