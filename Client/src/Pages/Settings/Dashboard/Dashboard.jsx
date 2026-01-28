import { useEffect, useState, useRef } from "react";
import Header from "../../../Layouts/MainLayouts/Header";
import MainSideBar from "../../../Layouts/MainLayouts/MainSideBar";
import {
  ChartBar,
  CaretLeft,
  Users,
  Article,
  Heart,
  ChatCircle,
  TrendUp,
  TrendDown,
  VideoCamera,
} from "phosphor-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../Context/AuthContext";
import "./dashboard.css";
import SEO from "../../../Utils/SEO";

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const chartContainerRef = useRef(null);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth > 768 && window.innerWidth <= 1024);

  const [stats, setStats] = useState([
    {
      label: "Followers",
      value: 0,
      icon: <Users size={24} weight="duotone" />,
      change: "+0%",
    },
    {
      label: "Posts",
      value: 0,
      icon: <Article size={24} weight="duotone" />,
      change: "+0%",
    },
    {
      label: "Videos",
      value: 0,
      icon: <VideoCamera size={24} weight="duotone" />,
      change: "+0%",
    },
    {
      label: "Likes",
      value: 0,
      icon: <Heart size={24} weight="duotone" />,
      change: "+0%",
    },
    {
      label: "Comments",
      value: 0,
      icon: <ChatCircle size={24} weight="duotone" />,
      change: "+0%",
    },
  ]);

  const [topPosts, setTopPosts] = useState([
    { id: 1, title: "-", likes: 0, comments: 0, image: null, createdAt: null },
    { id: 2, title: "-", likes: 0, comments: 0, image: null, createdAt: null },
    { id: 3, title: "-", likes: 0, comments: 0, image: null, createdAt: null },
  ]);

  const [topVideos, setTopVideos] = useState([
    { id: 1, title: "-", likes: 0, comments: 0, videoUrl: null, createdAt: null },
    { id: 2, title: "-", likes: 0, comments: 0, videoUrl: null, createdAt: null },
    { id: 3, title: "-", likes: 0, comments: 0, videoUrl: null, createdAt: null },
  ]);

  const [chartData, setChartData] = useState(
    Array.from({ length: 30 }, (_, i) => ({ day: i + 1, value: 0 }))
  );
  
  // Generate date labels for the last 30 days
  const generateDateLabels = () => {
    const labels = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'short' });
      
      labels.push(`${day} ${month}`);
    }
    
    return labels;
  };
  
  const dayLabels = generateDateLabels();

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user || !user._id) {
        console.log("No user found, skipping analytics fetch");
        return;
      }

      try {
        const userId = user._id;
        console.log("Fetching analytics for user:", userId);

        const response = await fetch(
          `${import.meta.env.VITE_API}/analytics/dashboard/${userId}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch analytics data");
        }

        const data = await response.json();
        console.log("Analytics data:", data);

        setStats([
          {
            label: "Followers",
            value: data.summary.followers,
            icon: <Users size={24} weight="duotone" />,
            change: data.summary.changes?.followers || "+0%",
          },
          {
            label: "Posts",
            value: data.summary.posts,
            icon: <Article size={24} weight="duotone" />,
            change: data.summary.changes?.posts || "+0%",
          },
          {
            label: "Videos",
            value: data.summary.videos,
            icon: <VideoCamera size={24} weight="duotone" />,
            change: data.summary.changes?.videos || "+0%",
          },
          {
            label: "Likes",
            value: data.summary.likes,
            icon: <Heart size={24} weight="duotone" />,
            change: data.summary.changes?.likes || "+0%",
          },
          {
            label: "Comments",
            value: data.summary.comments || 0,
            icon: <ChatCircle size={24} weight="duotone" />,
            change: data.summary.changes?.comments || "+0%",
          },
        ]);

        setTopPosts(
          data.topPosts.map((p) => ({
            id: p._id,
            title: p.title,
            likes: p.likes,
            comments: p.comments || 0,
            image: p.image || null,
            createdAt: p.createdAt,
          }))
        );

        setTopVideos(
          data.topVideos.map((v) => ({
            id: v._id,
            title: v.title,
            likes: v.likes,
            comments: v.comments || 0,
            videoUrl: v.videoUrl,
            image: v.image,
            createdAt: v.createdAt,
          }))
        );

        console.log("Top Posts detailed:", JSON.stringify(data.topPosts, null, 2));
        console.log("Top Videos detailed:", JSON.stringify(data.topVideos, null, 2));

        const normalized = Array.from({ length: 30 }, (_, idx) => {
          const day = idx + 1;
          const match = (data.chartData || []).find((d) => Number(d.day) === day);
          return { day, value: Number(match?.value) || 0 };
        });
        setChartData(normalized);
      } catch (err) {
        console.error("Error fetching analytics:", err);
      }
    };

    fetchAnalytics();
  }, [user]);

  // Handle window resize with debounce
  useEffect(() => {
    let timeoutId;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        setIsMobile(width <= 768);
        setIsTablet(width > 768 && width <= 1024);
        
        if (chartContainerRef.current) {
          setChartDimensions({
            width: chartContainerRef.current.offsetWidth,
            height: chartContainerRef.current.offsetHeight
          });
        }
      }, 150);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Measure chart container
  useEffect(() => {
    if (chartContainerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const { width, height } = entry.contentRect;
          setChartDimensions({ width, height });
        }
      });

      resizeObserver.observe(chartContainerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  const maxValue = Math.max(...chartData.map((d) => d.value), 10);

  // Get responsive chart height
  const getChartHeight = () => {
    if (isMobile) return 300;
    if (isTablet) return 400;
    return 450;
  };

  // Helper function to get Cloudinary thumbnail from video URL
  const getCloudinaryThumbnail = (videoUrl) => {
    if (!videoUrl) return null;
    
    const urlParts = videoUrl.split("/");
    const uploadIndex = urlParts.findIndex((part) => part === "upload");

    if (uploadIndex === -1) return null;

    const cloudName = urlParts[3];
    const pathAfterUpload = urlParts.slice(uploadIndex + 1).join("/");
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, "");

    return `https://res.cloudinary.com/${cloudName}/video/upload/w_400,h_300,c_fill,f_jpg,so_1/${publicId}.jpg`;
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const getPrimaryColor = () => {
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary-color")
      .trim();
    return primaryColor || "#3b82f6";
  };

  const getPrimaryColorRgba = (alpha) => {
    const primaryColorRgb = getComputedStyle(document.documentElement)
      .getPropertyValue("--primary-color-rgb")
      .trim();
    if (primaryColorRgb) {
      return `rgba(${primaryColorRgb}, ${alpha})`;
    }
    return `rgba(59, 130, 246, ${alpha})`;
  };

  // Convert hex color to rgba string
  const hexToRgba = (hex, alpha) => {
    if (!hex) return null;
    const c = hex.replace('#','');
    if (c.length !== 6) return null;
    const r = parseInt(c.slice(0,2), 16);
    const g = parseInt(c.slice(2,4), 16);
    const b = parseInt(c.slice(4,6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getSecondaryColorRgba = (alpha) => {
    const css = getComputedStyle(document.documentElement);
    const secondary = css.getPropertyValue('--secondary-color').trim();
    if (!secondary) return `rgba(0,0,0,${alpha})`;

    if (secondary.startsWith('rgb(') || secondary.startsWith('rgba(')) {
      const matches = secondary.match(/rgba?\(([^)]+)\)/);
      if (matches) {
        const parts = matches[1].split(',').map(p => p.trim());
        const [r,g,b] = parts;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    }

    if (secondary.startsWith('#')) {
      const rgba = hexToRgba(secondary, alpha);
      if (rgba) return rgba;
    }

    return `rgba(0,0,0,${alpha})`;
  };

  const lineData = {
    labels: dayLabels,
    datasets: [
      {
        label: t("Engagement"),
        data: chartData.map((d) => d.value),
        fill: true,
        backgroundColor: getSecondaryColorRgba(0.16),
        borderColor: getPrimaryColor(),
        borderWidth: 3,
        tension: 0.4,
        pointRadius: (context) => {
          // Only show points for labels that are displayed on mobile/tablet
          if (isMobile || isTablet) {
            const index = context.dataIndex;
            const chart = context.chart;
            const xAxis = chart.scales.x;
            const ticks = xAxis.ticks;
            // Check if this index corresponds to a displayed tick
            const isDisplayed = ticks.some(tick => tick.index === index);
            return isDisplayed ? 3 : 0;
          }
          return 3;
        },
        pointHoverRadius: (isMobile || isTablet) ? 5 : 6,
        pointHitRadius: 10,
        pointBackgroundColor: getPrimaryColor(),
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointHoverBackgroundColor: getPrimaryColor(),
        pointHoverBorderColor: "#fff",
      },
    ],
  };

  const allZero = chartData.every((d) => (Number(d.value) || 0) === 0);

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: isMobile ? 5 : 10,
        right: isMobile ? 10 : 20,
        bottom: isMobile ? 5 : 10,
        left: isMobile ? 5 : 10,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        intersect: false,
        mode: "index",
        padding: isMobile ? 8 : 12,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: isMobile ? 12 : 14,
        },
        bodyFont: {
          size: isMobile ? 11 : 13,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: true,
          color: getComputedStyle(document.documentElement).getPropertyValue("--input-border-color").trim() || "#eee",
          lineWidth: 1,
        },
        ticks: {
          maxRotation: isMobile ? 45 : 0,
          minRotation: isMobile ? 45 : 0,
          autoSkip: true,
          maxTicksLimit: isMobile ? 6 : (isTablet ? 10 : 15),
          callback: (val, index, ticks) => {
            return dayLabels[index] || "";
          },
          font: {
            size: isMobile ? 10 : 12,
          },
          padding: isMobile ? 5 : 10,
        },
      },
      y: {
        beginAtZero: true,
        min: 0,
        suggestedMax: allZero ? 10 : undefined,
        grace: '15%',
        grid: {
          display: true,
          drawOnChartArea: true,
          drawTicks: false,
          color: getComputedStyle(document.documentElement).getPropertyValue("--input-border-color").trim() || "#eee",
          lineWidth: 1,
        },
        ticks: {
          display: true,
          precision: 0,
          padding: isMobile ? 8 : 15,
          color: getComputedStyle(document.documentElement).getPropertyValue("--text-color").trim() || "#666",
          font: {
            size: isMobile ? 11 : 14,
          },
          maxTicksLimit: isMobile ? 6 : 10,
          stepSize: allZero ? 1 : Math.max(1, Math.ceil(maxValue / 8)),
        },
      },
    },
  };

  return (
    <>
      <SEO title="Dashboard"
        description="View your analytics and insights on AYSocial."
        noIndex={false}
      />
      <Header />
      <MainSideBar />
      <div className="main-layout">
        <div className="margin-container"></div>
        <div style={{ width: "100%" }}>
          <div className="dashboard-container">
            <div className="dashboard-info-banner">
              <button
                className="dashboard-back-btn"
                onClick={() => navigate("/settings")}
              >
                <CaretLeft size={20} weight="bold" />
                {t("Back to Settings")}
              </button>
              <div className="dashboard-header-content">
                <ChartBar size={32} weight="duotone" />
                <h1>{t("Dashboard")}</h1>
                <p>{t("View your analytics and insights")}</p>
              </div>
            </div>

            <div className="dashboard-stats-grid">
              {stats.map((stat, index) => {
                const isNegative = stat.change.startsWith('-');
                return (
                  <div key={index} className="dashboard-stat-card">
                    <div className="stat-icon">{stat.icon}</div>
                    <div className="stat-content">
                      <p className="stat-label">{t(stat.label)}</p>
                      <h3 className="stat-value">{stat.value}</h3>
                      <span className={`stat-change ${isNegative ? 'negative' : 'positive'}`}>
                        {isNegative ? (
                          <TrendDown size={14} weight="bold" />
                        ) : (
                          <TrendUp size={14} weight="bold" />
                        )}
                        {stat.change}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="dashboard-card">
              <div className="setting-header">
                <h2>{t("Engagement Overview")}</h2>
                <p className="setting-description">
                  {t("Your engagement metrics over the last 30 days")}
                </p>
              </div>
              <div className="chart-container">
                <div className="chart-wrapper">
                  <div 
                    ref={chartContainerRef}
                    style={{ width: "100%", height: `${getChartHeight()}px`, position: "relative" }}
                  >
                    <Line 
                      key={`${chartDimensions.width}-${chartDimensions.height}-${isMobile}`}
                      data={lineData} 
                      options={lineOptions} 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-content-grid">
              <div className="dashboard-card">
                <div className="setting-header">
                  <h2>
                    <Article
                      size={20}
                      weight="duotone"
                      style={{ marginRight: "8px" }}
                    />
                    {t("Top 3 Posts")}
                  </h2>
                  <p className="setting-description">
                    {t("Your most engaging posts this month")}
                  </p>
                </div>
                <div className="top-items-list">
                  {topPosts.map((post, index) => (
                    <div key={post.id} className="top-item">
                      {post.image && (
                        <img 
                          src={post.image} 
                          alt={post.title} 
                          className="item-image"
                          style={{
                            width: "50px",
                            height: "50px",
                            objectFit: "cover",
                            borderRadius: "8px",
                            marginRight: "12px"
                          }}
                        />
                      )}
                      <div className="item-details">
                        <p className="item-title">{post.title}</p>
                        <div className="item-stats">
                          <span>
                            <Heart size={14} weight="fill" /> {post.likes}
                          </span>
                          <span>
                            <ChatCircle size={14} weight="fill" />{" "}
                            {post.comments}
                          </span>
                          {post.createdAt && (
                            <span style={{ fontSize: "12px", opacity: 0.7 }}>
                              • {formatDate(post.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dashboard-card">
                <div className="setting-header">
                  <h2>
                    <VideoCamera
                      size={20}
                      weight="duotone"
                      style={{ marginRight: "8px" }}
                    />
                    {t("Top 3 Videos")}
                  </h2>
                  <p className="setting-description">
                    {t("Your most engaging videos this month")}
                  </p>
                  </div>
                <div className="top-items-list">
                  {topVideos.map((video, index) => {
                    const thumbnail = getCloudinaryThumbnail(video.videoUrl);
                    return (
                      <div key={video.id} className="top-item">
                        {thumbnail && (
                          <img 
                            src={thumbnail} 
                            alt={video.title} 
                            className="item-image"
                            style={{
                              width: "50px",
                              height: "50px",
                              objectFit: "cover",
                              borderRadius: "8px",
                              marginRight: "12px"
                            }}
                          />
                        )}
                        <div className="item-details">
                          <p className="item-title">{video.title}</p>
                          <div className="item-stats">
                            <span>
                              <Heart size={14} weight="fill" /> {video.likes}
                            </span>
                            <span>
                              <ChatCircle size={14} weight="fill" />{" "}
                              {video.comments}
                            </span>
                            {video.createdAt && (
                              <span style={{ fontSize: "12px", opacity: 0.7 }}>
                                • {formatDate(video.createdAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}