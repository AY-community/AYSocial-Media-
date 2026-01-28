import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import socket from "./Utils/Socket.js";
import { useAuth } from "./Context/AuthContext";
import { Toaster } from "sonner";
import { showNotificationToast } from "./Components/Notifications/NotificationToast.jsx";

import ProtectedRoute from "./Routes/ProtectedRoute";
import RoleProtectedRoute from "./Routes/RolerotectedRoute.jsx";

import Home from "./Pages/Home";
import Auth from "./Pages/Auth";
import VerifyPage from "./Layouts/AuthLayouts/VerifyRedirect";
import Profile from "./Pages/Profile/MainProfile";
import EditProfile from "./Pages/Profile/EditProfile";
import Saved from "./Pages/Saved/Saved";
import Followers from "./Pages/Followers/Followers";
import Notifications from "./Pages/Notifications/Notfications";
import Settings from "./Pages/Settings/Settings";
import ChangePassword from "./Pages/Settings/ChangePassword/ChangePassword";
import Privacy from "./Pages/Settings/Privacy/Privacy";
import BlockList from "./Pages/Settings/BlockList/BlockList";
import Languages from "./Pages/Settings/Languages/Languages";
import Theme from "./Pages/Settings/Theme/Theme";
import Dashboard from "./Pages/Settings/Dashboard/Dashboard";
import ReportProblem from "./Pages/Settings/ReportProbelm/ReportProblem";
import Explore from "./Pages/Explore/Explore";
import Messages from "./Pages/Messages/Messages";
import Reel from "./Pages/Video/Reel";
import ExploreSharedPost from "./Pages/Explore/ExploreSharedPost";
import SearchResult from "./Pages/Search/SearchResult";
import SearchMobile from "./Pages/Search/SearchMobile";
import Analytics from "./Pages/Admin/Analytics";
import AdminDashboard from "./Pages/Admin/Dashboard";
import Report from "./Pages/Admin/Report";
import Users from "./Pages/Admin/Users";
import Roles from "./Pages/Admin/Roles/Roles";
import ReportContent from "./Pages/Settings/ReportProbelm/ReportContent";
import Reviews from "./Pages/Statics/Reviews.jsx";
import AdminReviews from "./Pages/Admin/Reviews/Reviews.jsx";
import AccessDenied from "./Pages/Admin/Access/AccessDenied.jsx";
 import FooterPrivacy from "./Pages/Statics/Privacy.jsx";
 import FooterAbout from "./Pages/Statics/About.jsx";
 import Creator from "./Pages/Statics/Creator.jsx";

 import NotFound from "./Pages/NotFound/NotFound.jsx";



function App() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?._id) return;

    if (socket.connected) {
      console.log("✅ Socket already connected, registering now");
      socket.emit("register", user._id);
    }

    socket.on("connect", () => {
      console.log("✅ Connected to Socket.IO");
      socket.emit("register", user._id);
    });

    socket.on("new-notification", (notification) => {
      console.log("🔔 New notification:", notification);

      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) => [notification, ...prev]);

      showNotificationToast(notification, navigate);
    });

    return () => {
      socket.off("connect");
      socket.off("new-notification");
    };
  }, [user?._id, navigate]);

  return (
    <>
      <Toaster
        position="top-right"
        expand={true}
        richColors
        closeButton={false}
      />
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/verify/:token" element={<VerifyPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/explore/post/:postId" element={<ExploreSharedPost />} />
          <Route path="/explore/video/:videoId" element={<ExploreSharedPost />} />
          <Route path="/user/:userName" element={<Profile />} />
          <Route path="/user/:userName/post/:postId" element={<Profile />} />
          <Route path="/user/:userName/video/:videoId" element={<Profile />} />
          <Route path="/edit/:userName" element={<EditProfile />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/followers" element={<Followers />} />
          <Route
            path="/notifications"
            element={
              <Notifications
                notifications={notifications}
                setNotifications={setNotifications}
                unreadCount={unreadCount}
                setUnreadCount={setUnreadCount}
              />
            }
          />

          <Route path="/search/:id" element={<SearchResult />} />
          <Route path="/search/mobile" element={<SearchMobile />} />

          <Route path="/settings" element={<Settings />} />
          <Route
            path="/settings/change-password"
            element={<ChangePassword />}
          />
          <Route path="/settings/privacy" element={<Privacy />} />
          <Route path="/settings/blocklist" element={<BlockList />} />
          <Route path="/settings/language" element={<Languages />} />
          <Route path="/settings/theme" element={<Theme />} />
          <Route path="/settings/dashboard" element={<Dashboard />} />
          <Route path="/settings/report/:id" element={<ReportProblem />} />
          <Route path="/settings/reports/:id" element={< ReportContent />} />

            <Route path="/privacy" element={<FooterPrivacy />} />
            <Route path="/about" element={<FooterAbout />} />
          <Route path="/creator" element={<Creator />} />


          <Route path="/chat" element={<Messages />} />
          <Route path="/reel" element={<Reel />} />

          <Route path="/reviews" element={<Reviews />} />



          <Route path="*" element={<NotFound />} />
        </Route>

<Route element={<ProtectedRoute />}>
  <Route element={<RoleProtectedRoute allowedRoles={['superadmin', 'admin', 'moderator']} />}>
    <Route path="/admin/dashboard" element={<AdminDashboard />} />
    <Route path="/admin/analytics" element={<Analytics />} />
  </Route>

  <Route element={<RoleProtectedRoute allowedRoles={['superadmin', 'admin']} />}>
    <Route path="/admin/users" element={<Users />} />
    <Route path="/admin/reports" element={<Report />} />
    <Route path="/admin/reviews" element={<AdminReviews />} />
  </Route>

  <Route element={<RoleProtectedRoute allowedRoles={['superadmin']} />}>
    <Route path="/admin/roles" element={<Roles />} />
  </Route>
</Route>

<Route path="/access-denied" element={<AccessDenied />} />
      </Routes>
    </>
  );
}

export default App;
