import React, { useState } from "react";
import { api } from "../api/axios";
import { useAuth } from "../hooks/useAuth";

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [me, setMe] = useState<any>(null);

  const fetchMe = async () => {
    try {
      const res = await api.get("/auth/me");
      setMe(res.data.user);
    } catch {}
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">Welcome, {user?.email}</h1>
      {me && (
        <pre className="mb-4 bg-white p-3 rounded shadow text-sm">
          {JSON.stringify(me, null, 2)}
        </pre>
      )}
      <div className="space-x-3">
        <button
          onClick={fetchMe}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Refresh Me
        </button>
        <button
          onClick={logout}
          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
