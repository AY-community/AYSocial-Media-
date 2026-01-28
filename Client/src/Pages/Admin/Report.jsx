import React, { useState, useEffect } from 'react';
import AdminSideBar from '../../Layouts/AdminLayouts/AdminSideBar';
import AdminBottomNav from '../../Layouts/AdminLayouts/AdminBottomNav';
import './Admin.css';
import './Report.css';
import { useTranslation } from "react-i18next";
import { ShieldWarning, SortAscending, SortDescending } from "phosphor-react";
import ConfirmDeleteAcccountModal from '../../Layouts/ConfirmLayouts/ConfirmDeleteAccount';
import SEO from '../../Utils/SEO';

const API_URL = import.meta.env.VITE_API;

export default function Report() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'descending' });
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalReports: 0 });
  
  // Modal states
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    reportId: null,
    report: null,
    isSecondConfirmation: false
  });
  const [modalLoading, setModalLoading] = useState(false);

  // Fetch reports from API
  useEffect(() => {
    fetchReports();
  }, [filter, sortConfig, pagination.currentPage]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: pagination.currentPage,
        limit: 20,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction === 'ascending' ? 'asc' : 'desc',
      });

      if (filter === 'user') {
        params.append('type', 'user');
      } else if (filter === 'post' || filter === 'video') {
        params.append('type', 'content');
        params.append('contentType', filter);
      }

      const response = await fetch(`${API_URL}/report/admin/reports?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setReports(data.reports);
        setPagination(data.pagination);
      } else {
        setError(data.error || 'Failed to fetch reports');
      }
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleIgnore = async (reportId) => {
    if (!confirm(t('Are you sure you want to ignore this report?'))) return;
    
    try {
      const response = await fetch(`${API_URL}/report/admin/reports/${reportId}/ignore`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ adminNotes: 'Report ignored by admin' }),
      });

      const data = await response.json();

      if (data.success) {
        fetchReports();
      } else {
        console.error('Failed to ignore report:', data.error);
        alert(`${t("Failed to ignore report:")} ${data.error}`);
      }
    } catch (err) {
      console.error('Error ignoring report:', err);
      alert(`${t("Error:")} ${err.message}`);
    }
  };

  const openDeleteModal = (reportId, report) => {
    setDeleteModal({
      open: true,
      reportId,
      report,
      isSecondConfirmation: false
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      open: false,
      reportId: null,
      report: null,
      isSecondConfirmation: false
    });
    setModalLoading(false);
  };

  const handleFirstConfirmation = () => {
    const { report } = deleteModal;
    
    // If it's a user ban, show second confirmation modal
    if (report.type === 'user') {
      setDeleteModal(prev => ({
        ...prev,
        isSecondConfirmation: true
      }));
    } else {
      // For content, proceed directly to deletion
      handleDeleteConfirmed();
    }
  };

  const handleDeleteConfirmed = async () => {
    const { reportId, report } = deleteModal;
    
    try {
      setModalLoading(true);

      // Step 1: Delete the report first
      const reportResponse = await fetch(`${API_URL}/report/admin/reports/${reportId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const reportData = await reportResponse.json();

      if (!reportData.success) {
        console.error('Failed to delete report:', reportData.error);
        alert(`${t("Failed to delete report:")} ${reportData.error}`);
        closeDeleteModal();
        return;
      }

      // Step 2: Delete the actual content/user based on report type
      if (report.type === 'content') {
        const contentId = report.entityId;
        const ownerId = report.entityData?.contentOwner?._id;
        
        if (!ownerId) {
          console.error('Content owner ID not found');
          alert(t('Error: Content owner ID not found'));
          closeDeleteModal();
          fetchReports();
          return;
        }

        const endpoint = report.contentType === 'video'
          ? `${API_URL}/videos/${contentId}/${ownerId}`
          : `${API_URL}/posts/${contentId}/${ownerId}`;

        const contentResponse = await fetch(endpoint, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        const contentData = await contentResponse.json();
        
        if (contentData.success) {
          alert(`✅ ${report.contentType} ${t("deleted successfully")}`);
        } else {
          console.error(`Failed to delete ${report.contentType}:`, contentData.error);
          alert(`${t("Failed to delete")} ${report.contentType}: ${contentData.error}`);
        }
      } else if (report.type === 'user') {
        const userNameId = report.entityData?.userName || getEntityId(report);
        
        console.log('🔍 Report data:', report);
        console.log('🔍 Entity data:', report.entityData);
        console.log('🔍 Username extracted:', userNameId);
        
        if (!userNameId) {
          console.error('Username not found');
          alert(t('Error: Username not found'));
          closeDeleteModal();
          fetchReports();
          return;
        }

        const banResponse = await fetch(`${API_URL}/account/${userNameId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        const banData = await banResponse.json();
        
        if (banData.success) {
          alert(`✅ ${t("User")} "${userNameId}" ${t("has been permanently banned and deleted.")}\n\n📊 ${t("Details:")}:\n- ${t("Deleted")} ${banData.deletedMedia} ${t("media files")}\n- ${t("All posts, videos, and messages removed")}\n- ${t("All social connections cleaned up")}`);
        } else {
          console.error('Failed to ban user:', banData.error);
          alert(`❌ ${t("Failed to ban user:")} ${banData.error}`);
        }
      }

      closeDeleteModal();
      fetchReports();
      
    } catch (err) {
      console.error('Error in delete operation:', err);
      alert(`❌ ${t("Error in delete operation:")} ${err.message}`);
      closeDeleteModal();
    }
  };

  const handleView = (report) => {
    let viewUrl = '';
    
    if (report.type === 'user') {
      const username = report.entityData?.userName || getEntityId(report);
      viewUrl = `/user/${username}`;
    } else if (report.type === 'content') {
      const contentId = report.entityId;
      const contentType = report.contentType || 'post';
      viewUrl = `/explore/${contentType}/${contentId}`;
    }
    
    if (viewUrl) {
      window.open(viewUrl, '_blank');
    }
  };

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
    setPagination({ ...pagination, currentPage: 1 });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return null;
    }
    if (sortConfig.direction === 'ascending') {
      return <SortAscending size={16} />;
    }
    return <SortDescending size={16} />;
  };

  const getEntityId = (report) => {
    if (report.type === 'user') {
      return report.entityData?.userName || report.entityId;
    }
    return report.entityId;
  };

  const getReportType = (report) => {
    if (report.type === 'content') {
      return report.contentType || 'content';
    }
    return report.type;
  };

  const getDeleteModalType = () => {
    if (!deleteModal.report) return '';
    
    if (deleteModal.report.type === 'user') {
      return deleteModal.isSecondConfirmation 
        ? t('this User Account (FINAL WARNING)') 
        : t('this User Account');
    }
    
    return `${t("this")} ${deleteModal.report.contentType}`;
  };

  return (
    <>
      <SEO title={"Reports Management"}
        description={"Review and manage user-submitted reports"}
         noIndex={true}
     />
      <AdminSideBar />
      <AdminBottomNav />
      <div className="main-layout admin-layout">
        <div className="margin-container"></div>
        <div style={{ width: "100%" }}>
          <div className="report-container">
            <div className="admin-header">
              <ShieldWarning size={32} weight="duotone" />
              <h1>{t("Reports")}</h1>
              <p>{t("Review and manage user-submitted reports")}</p>
            </div>

            <div className="report-filters">
              <button onClick={() => { setFilter('all'); setPagination({ ...pagination, currentPage: 1 }); }} className={filter === 'all' ? 'active' : ''}>{t("All")}</button>
              <button onClick={() => { setFilter('user'); setPagination({ ...pagination, currentPage: 1 }); }} className={filter === 'user' ? 'active' : ''}>{t("Users")}</button>
              <button onClick={() => { setFilter('post'); setPagination({ ...pagination, currentPage: 1 }); }} className={filter === 'post' ? 'active' : ''}>{t("Posts")}</button>
              <button onClick={() => { setFilter('video'); setPagination({ ...pagination, currentPage: 1 }); }} className={filter === 'video' ? 'active' : ''}>{t("Videos")}</button>
            </div>

            {loading && <p>{t("Loading...")}</p>}
            {error && <p style={{ color: 'red' }}>{t("Error:")}{" "}{error}</p>}

            {!loading && !error && (
              <>
                <div className="report-table-container">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th onClick={() => requestSort('type')}>{t("Type")} {getSortIcon('type')}</th>
                        <th onClick={() => requestSort('entityId')}>{t("Entity ID")} {getSortIcon('entityId')}</th>
                        <th onClick={() => requestSort('reason')}>{t("Reason")} {getSortIcon('reason')}</th>
                        <th onClick={() => requestSort('reportedCount')}>{t("Reported Cases")} {getSortIcon('reportedCount')}</th>
                        <th onClick={() => requestSort('createdAt')}>{t("Date")} {getSortIcon('createdAt')}</th>
                        <th>{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reports.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center' }}>{t("No reports found")}</td>
                        </tr>
                      ) : (
                        reports.map(report => (
                          <tr key={report.id}>
                            <td><span className={`report-type-badge ${getReportType(report)}`}>{t(getReportType(report))}</span></td>
                            <td>{getEntityId(report)}</td>
                            <td>{report.reason}</td>
                            <td><span className="report-count-badge">{report.reportedCount}</span></td>
                            <td>{new Date(report.createdAt).toLocaleString()}</td>
                            <td className="report-actions">
                              <button className="action-btn view" onClick={() => handleView(report)}>{t("View")}</button>
                              <button className="action-btn ignore" onClick={() => handleIgnore(report.id)}>{t("Ignore")}</button>
                              <button 
                                className="action-btn delete" 
                                onClick={() => openDeleteModal(report.id, report)}
                                style={report.type === 'user' ? {backgroundColor: '#dc2626', fontWeight: 'bold'} : {}}
                              >
                                {report.type === 'user' ? t('BAN') : t('Delete')}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {pagination.totalPages > 1 && (
                  <div className="pagination" style={{ marginTop: '20px', marginBottom: '40px', textAlign: 'center' }}>
                    <button 
                      onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage - 1 })}
                      disabled={pagination.currentPage === 1}
                      style={{ margin: '0 5px', padding: '8px 16px', cursor: pagination.currentPage === 1 ? 'not-allowed' : 'pointer' }}
                    >
                      {t("Previous")}
                    </button>
                    <span style={{ margin: '0 15px' }}>
                      {t("Page")} {pagination.currentPage} {t("of")} {pagination.totalPages} ({pagination.totalReports} {t("total reports")})
                    </span>
                    <button 
                      onClick={() => setPagination({ ...pagination, currentPage: pagination.currentPage + 1 })}
                      disabled={pagination.currentPage === pagination.totalPages}
                      style={{ margin: '0 5px', padding: '8px 16px', cursor: pagination.currentPage === pagination.totalPages ? 'not-allowed' : 'pointer' }}
                    >
                      {t("Next")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDeleteAcccountModal
        openModal={deleteModal.open}
        onConfirm={deleteModal.isSecondConfirmation ? handleDeleteConfirmed : handleFirstConfirmation}
        onClose={closeDeleteModal}
        buttonLoading={modalLoading}
        type={getDeleteModalType()}
      />
    </>
  );
}