import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../Context/AuthContext";

export default function RoleProtectedRoute({ allowedRoles }) {
  const { user, loadingUser } = useAuth();

  if (loadingUser) return <div>Loading...</div>;

  if (!user) return <Navigate to="/auth" replace />;

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/access-denied" replace />;
  }

  return <Outlet />;
}