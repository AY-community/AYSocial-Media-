import React, { useEffect, useState } from 'react';
import AdminSideBar from '../../Layouts/AdminLayouts/AdminSideBar';
import AdminBottomNav from '../../Layouts/AdminLayouts/AdminBottomNav';
import './Admin.css';
import { useTranslation } from "react-i18next";
import {
  Users,
  FileText,
  MonitorPlay,
  Flag,
  TrendUp,
  Warning,
  CheckCircle,
  ShieldCheck,
  ClipboardText,
} from "phosphor-react";
import SEO from '../../Utils/SEO';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalReviews: 0,
    totalPosts: 0,
    totalVideos: 0,
    pendingReports: 0,
    todaySignups: 0,
    todayPosts: 0,
  });

  const [recentActivity, setRecentActivity] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API}/dashboard/dashboard`, {
        method: "GET",
        credentials: "include", // This sends cookies!
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status); // Debug

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch dashboard data");
      }

      const data = await response.json();
      console.log("Dashboard data:", data); // Debug
      
      if (data.success) {
        setStats(data.stats);
        setRecentActivity(data.recentActivity || []);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <AdminSideBar />
        <AdminBottomNav />
        <div className="main-layout admin-layout">
          <div className="margin-container"></div>
          <div style={{ width: "100%" }}>
            <div className="admin-loading">{t("Loading...")}</div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <AdminSideBar />
        <AdminBottomNav />
        <div className="main-layout admin-layout">
          <div className="margin-container"></div>
          <div style={{ width: "100%" }}>
            <div className="admin-error">
              <Warning size={48} weight="duotone" />
              <p>{t("Error loading dashboard:")}{" "}{error}</p>
              <button onClick={fetchDashboardData}>{t("Retry")}</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO title={"Admin Dashboard"}
        description={"Overview of your platform statistics and activity"}
         noIndex={true}
     />
      <AdminSideBar />
      <AdminBottomNav />
      <div className="main-layout admin-layout">
        <div className="margin-container"></div>
        <div style={{ width: "100%" }}>
          <div className="admin-dashboard-container">
            {/* Header */}
            <div className="admin-header">
              <ShieldCheck size={32} weight="duotone" />
              <h1>{t("Admin Dashboard")}</h1>
              <p>{t("Overview of your platform statistics and activity")}</p>
            </div>

            {/* Stats Grid */}
            <div className="admin-stats-grid">
              {/* Total Users */}
              <div className="admin-stat-card">
                <div className="admin-stat-icon users">
                  <Users size={24} weight="duotone" />
                </div>
                <div className="admin-stat-content">
                  <h3>{stats.totalUsers.toLocaleString()}</h3>
                  <p>{t("Total Users")}</p>
                  <span className="admin-stat-badge success">
                    +{stats.todaySignups} {t("today")}
                  </span>
                </div>
              </div>

              {/* Active Users */}
              <div className="admin-stat-card">
                <div className="admin-stat-icon active">
                  <TrendUp size={24} weight="duotone" />
                </div>
                <div className="admin-stat-content">
                  <h3>{stats.activeUsers.toLocaleString()}</h3>
                  <p>{t("Active Users")}</p>
                  <span className="admin-stat-badge info">{t("Last 30 days")}</span>
                </div>
              </div>

              {/* Total Reviews */}
              <div className="admin-stat-card">
                <div className="admin-stat-icon reviews">
                  <ClipboardText size={24} weight="duotone" />
                </div>
                <div className="admin-stat-content">
                  <h3>{stats.totalReviews.toLocaleString()}</h3>
                  <p>{t("Total Reviews")}</p>
                  <span className="admin-stat-badge info">{t("User Feedback")}</span>
                </div>
              </div>

              {/* Total Posts */}
              <div className="admin-stat-card">
                <div className="admin-stat-icon posts">
                  <FileText size={24} weight="duotone" />
                </div>
                <div className="admin-stat-content">
                  <h3>{stats.totalPosts.toLocaleString()}</h3>
                  <p>{t("Total Posts")}</p>
                  <span className="admin-stat-badge success">
                    +{stats.todayPosts} {t("today")}
                  </span>
                </div>
              </div>

              {/* Total Videos */}
              <div className="admin-stat-card">
                <div className="admin-stat-icon videos">
                  <MonitorPlay size={24} weight="duotone" />
                </div>
                <div className="admin-stat-content">
                  <h3>{stats.totalVideos.toLocaleString()}</h3>
                  <p>{t("Total Videos")}</p>
                </div>
              </div>

              {/* Pending Reports */}
              <div className="admin-stat-card alert">
                <div className="admin-stat-icon warning">
                  <Flag size={24} weight="duotone" />
                </div>
                <div className="admin-stat-content">
                  <h3>{stats.pendingReports.toLocaleString()}</h3>
                  <p>{t("Pending Reports")}</p>
                  <span className="admin-stat-badge warning">
                    {t("Needs Review")}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="admin-recent-activity">
              <h2>{t("Recent Activity")}</h2>
              <div className="admin-activity-list">
                {recentActivity.length === 0 ? (
                  <div className="admin-no-activity">
                    <CheckCircle size={48} weight="duotone" />
                    <p>{t("No recent activity")}</p>
                  </div>
                ) : (
                  recentActivity.map((activity, index) => (
                    <div key={index} className="admin-activity-item">
                      <div className="admin-activity-icon">
                        {activity.type === "review" && (
                          <CheckCircle size={20} weight="fill" />
                        )}
                        {activity.type === "report" && (
                          <Flag size={20} weight="fill" />
                        )}
                      </div>
                      <div className="admin-activity-content">
                        <p>{activity.message}</p>
                        <span>{activity.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}