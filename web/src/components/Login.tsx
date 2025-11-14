import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { BASE_URL } from "../api/axios";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success("Login successful!");
      navigate("/"); // Navigate to home page after successful login
    } catch (err: any) {
      // Extract field-specific validation errors
      const errors = err?.response?.data?.errors;
      if (errors && typeof errors === "object") {
        // Display each field error as a separate toast
        Object.entries(errors).forEach(([_field, messages]) => {
          if (Array.isArray(messages) && messages.length > 0) {
            toast.error(messages[0]); // Show first error message for each field
          }
        });
      } else {
        // Fallback to generic error message
        const errorMessage = err?.response?.data?.message || err?.message || "Login failed";
        toast.error(errorMessage);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign in
            </button>
          </div>
        </form>
        <div className="mt-4">
          <button
            onClick={() => (window.location.href = `${BASE_URL}/auth/oauth/google/start`)}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <img src="https://www.gstatic.com/images/branding/product/1x/gsa_64dp.png" alt="Google" className="w-5 h-5" />
            Continue with Google
          </button>
        </div>
      </div>
    </div>
  );
}
