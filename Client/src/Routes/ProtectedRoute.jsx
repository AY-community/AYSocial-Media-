import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

export default function ProtectedRoute() {
  const { user, loadingUser } = useAuth();

  if (loadingUser) return <div>Loading...</div>;

  return user ? <Outlet /> : <Navigate to="/auth" replace />;
}
