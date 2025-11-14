import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { setAccessToken } from "../api/axios";
import { useAuth } from "../hooks/useAuth";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  useEffect(() => {
    const token = params.get("accessToken");
    if (token) {
      setAccessToken(token);
      // fetch user then navigate
      refreshUser()
        .then(() => navigate("/", { replace: true }))
        .catch(() => navigate("/login", { replace: true }));
    } else {
      navigate("/login", { replace: true });
    }
  }, [params, navigate]);

  return <div>Signing you in...</div>;
}
