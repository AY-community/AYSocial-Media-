import React, { useEffect, useState } from 'react';
import AdminSideBar from '../../Layouts/AdminLayouts/AdminSideBar';
import AdminBottomNav from '../../Layouts/AdminLayouts/AdminBottomNav';
import './Admin.css';
import { useTranslation } from "react-i18next";
import { ChartBar, Warning } from "phosphor-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import SEO from '../../Utils/SEO';

export default function Analytics() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    userGrowthPercent: 0,
    activeUsers: 0,
    activeUserGrowthPercent: 0,
    newSignupsToday: 0,
    pendingReportsThisWeek: 0,
  });

  const [charts, setCharts] = useState({
    userGrowthDaily: [],
    contentPerDay: [],
    reportsByType: [],
    activeUsersOverTime: [],
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API}/dashboard/analytics`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch analytics data");
      }

      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
        setCharts(data.charts);
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      setError(error.message);
      setLoading(false);
    }
  };

  const CHART_COLORS = ['#8A2BE2', '#4CAF50', '#FF9800', '#dc3545'];

  const tooltipStyles = {
    backgroundColor: 'var(--third-color)',
    border: `1px solid var(--input-border-color)`,
    borderRadius: '8px',
    padding: '8px 12px',
  };

  const tooltipLabelStyle = {
    color: 'var(--text-color)',
    fontWeight: '600',
  };

  const tooltipItemStyle = {
    color: 'var(--text-color)',
  };

  if (loading) {
    return (
      <>
        <AdminSideBar />
        <div className="main-layout admin-layout">
          <div className="margin-container"></div>
          <div style={{ width: "100%" }}>
            <div className="admin-loading">{t("Loading analytics...")}</div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <AdminSideBar />
        <div className="main-layout admin-layout">
          <div className="margin-container"></div>
          <div style={{ width: "100%" }}>
            <div className="admin-error">
              <Warning size={48} weight="duotone" />
              <p>{t("Error loading analytics:")}{" "}{error}</p>
              <button onClick={fetchAnalyticsData}>{t("Retry")}</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  const statsCards = [
    { 
      label: t('Total Users'), 
      value: stats.totalUsers.toLocaleString(), 
      sub: `${stats.userGrowthPercent > 0 ? '+' : ''}${stats.userGrowthPercent}% ${t('from last week')}`, 
      border: 'primary-border' 
    },
    { 
      label: t('Active Users'), 
      value: stats.activeUsers.toLocaleString(), 
      sub: `${stats.activeUserGrowthPercent > 0 ? '+' : ''}${stats.activeUserGrowthPercent}% ${t('from last week')}`, 
      border: 'success-border' 
    },
    { 
      label: t('New Signups'), 
      value: stats.newSignupsToday.toLocaleString(), 
      sub: t('Today'), 
      border: 'info-border' 
    },
    { 
      label: t('Pending Reports'), 
      value: stats.pendingReportsThisWeek.toLocaleString(), 
      sub: t('This week'), 
      border: 'danger-border' 
    },
  ];

  return (
    <>
      <SEO title={"Admin Analytics"}
        description={"Track your platform's performance and user engagement"}
         noIndex={true}
     />
      <AdminSideBar />
      <AdminBottomNav />

      <div className="main-layout admin-layout">
        <div className="margin-container"></div>
        <div style={{ width: "100%" }}>
          <div className="analytics-container">
            {/* Header */}
            <div className="admin-header">
              <ChartBar size={32} weight="duotone" />
              <h1>{t("Analytics")}</h1>
              <p>{t("Track your platform's performance and user engagement")}</p>
            </div>

            {/* Stats Cards */}
            <div className="analytics-stats-grid">
              {statsCards.map((stat, idx) => (
                <div key={idx} className={`analytics-stat-card ${stat.border}`}>
                  <div className="analytics-stat-label">{stat.label}</div>
                  <div className="analytics-stat-value">{stat.value}</div>
                  <div className="analytics-stat-sub">{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="analytics-charts-grid">
              {/* Line Chart - User Growth */}
              <div className="analytics-chart-card">
                <div className="analytics-chart-header">
                  <h3>{t("User Signups")}</h3>
                  <span className="analytics-chart-subtitle">{t("Daily Growth")}</span>
                </div>
                <div className="analytics-chart-body">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={charts.userGrowthDaily} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--input-border-color)" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: 'var(--secondary-text-color)', fontSize: 12 }} 
                      />
                      <YAxis 
                        tick={{ fill: 'var(--secondary-text-color)', fontSize: 12 }} 
                      />
                      <Tooltip 
                        contentStyle={tooltipStyles}
                        labelStyle={tooltipLabelStyle}
                        itemStyle={tooltipItemStyle}
                      />
                      <Legend wrapperStyle={{ color: 'var(--text-color)' }} />
                      <Line
                        type="monotone"
                        dataKey="signups"
                        stroke="#8A2BE2"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#8A2BE2' }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart - Content */}
              <div className="analytics-chart-card">
                <div className="analytics-chart-header">
                  <h3>{t("Content Posted")}</h3>
                  <span className="analytics-chart-subtitle">{t("Posts vs Videos")}</span>
                </div>
                <div className="analytics-chart-body">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={charts.contentPerDay} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--input-border-color)" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: 'var(--secondary-text-color)', fontSize: 12 }} 
                      />
                      <YAxis 
                        tick={{ fill: 'var(--secondary-text-color)', fontSize: 12 }} 
                      />
                      <Tooltip 
                        contentStyle={tooltipStyles}
                        labelStyle={tooltipLabelStyle}
                        itemStyle={tooltipItemStyle}
                      />
                      <Legend wrapperStyle={{ color: 'var(--text-color)' }} />
                      <Bar dataKey="posts" name={t("Posts")} fill="#8A2BE2" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="videos" name={t("Videos")} fill="#2196F3" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart - Reports */}
              <div className="analytics-chart-card">
                <div className="analytics-chart-header">
                  <h3>{t("Reports Breakdown")}</h3>
                  <span className="analytics-chart-subtitle">{t("By Content Type")}</span>
                </div>
                <div className="analytics-chart-body centered">
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Tooltip 
                        contentStyle={tooltipStyles}
                        labelStyle={tooltipLabelStyle}
                        itemStyle={tooltipItemStyle}
                      />
                      <Legend wrapperStyle={{ color: 'var(--text-color)' }} />
                      <Pie
                        data={charts.reportsByType}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={4}
                        label
                      >
                        {charts.reportsByType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Area Chart - Active Users */}
              <div className="analytics-chart-card">
                <div className="analytics-chart-header">
                  <h3>{t("Active Users Trend")}</h3>
                  <span className="analytics-chart-subtitle">{t("Weekly Engagement")}</span>
                </div>
                <div className="analytics-chart-body">
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={charts.activeUsersOverTime} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorActiveUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2196F3" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#2196F3" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--input-border-color)" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: 'var(--secondary-text-color)', fontSize: 12 }} 
                      />
                      <YAxis 
                        tick={{ fill: 'var(--secondary-text-color)', fontSize: 12 }} 
                      />
                      <Tooltip 
                        contentStyle={tooltipStyles}
                        labelStyle={tooltipLabelStyle}
                        itemStyle={tooltipItemStyle}
                      />
                      <Legend wrapperStyle={{ color: 'var(--text-color)' }} />
                      <Area
                        type="monotone"
                        dataKey="active"
                        name={t("Active Users")}
                        stroke="#2196F3"
                        fill="url(#colorActiveUsers)"
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}