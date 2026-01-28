import React, { useState, useEffect } from 'react';
import AdminSideBar from '../../../Layouts/AdminLayouts/AdminSideBar';
import AdminBottomNav from '../../../Layouts/AdminLayouts/AdminBottomNav';
import '../Admin.css';
import './Roles.css';
import { useTranslation } from "react-i18next";
import { Crown, ShieldCheck, ShieldWarning, User, MagnifyingGlass, SortAscending, SortDescending, Plus, X } from "phosphor-react";
import SEO from '../../../Utils/SEO';

const API_URL = import.meta.env.VITE_API;

export default function Roles() {
  const { t } = useTranslation();
  const [admins, setAdmins] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'descending' });
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAdmin, setNewAdmin] = useState({ username: '', role: 'moderator' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalUsers: 0 });
  const [stats, setStats] = useState({ superadmin: 0, admin: 0, moderator: 0, total: 0 });

  // Fetch high role users from API
  useEffect(() => {
    fetchHighRoleUsers();
  }, [filter, sortConfig, pagination.currentPage]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.currentPage !== 1) {
        setPagination({ ...pagination, currentPage: 1 });
      } else {
        fetchHighRoleUsers();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchHighRoleUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: pagination.currentPage,
        limit: 20,
        sortBy: sortConfig.key,
        sortOrder: sortConfig.direction === 'ascending' ? 'asc' : 'desc',
      });

      if (filter !== 'all') {
        params.append('role', filter);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await fetch(`${API_URL}/admin/high-role-users?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setAdmins(data.users);
        setPagination(data.pagination);
        setStats(data.stats);
      } else {
        setError(data.error || 'Failed to fetch high role users');
      }
    } catch (err) {
      console.error('Error fetching high role users:', err);
      setError('Failed to fetch high role users');
    } finally {
      setLoading(false);
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

  const getRoleIcon = (role) => {
    switch(role) {
      case 'superadmin':
        return <Crown size={18} weight="fill" />;
      case 'admin':
        return <ShieldCheck size={18} weight="fill" />;
      case 'moderator':
        return <ShieldWarning size={18} weight="fill" />;
      default:
        return <User size={18} weight="fill" />;
    }
  };

  const handleDeleteAdmin = async (adminId, username, role) => {
    // Determine new role based on current role
    let newRole = 'user';
    let demotionMessage = '';
    
    if (role === 'superadmin') {
      newRole = 'admin';
      demotionMessage = `${t("Super Admin")} → ${t("Admin")}`;
    } else if (role === 'admin') {
      newRole = 'moderator';
      demotionMessage = `${t("Admin")} → ${t("Moderator")}`;
    } else if (role === 'moderator') {
      newRole = 'user';
      demotionMessage = `${t("Moderator")} → ${t("User")}`;
    }

    try {
      // Call API to update user role
      const response = await fetch(`${API_URL}/admin/demote-user/${username}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ newRole }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ "${username}" ${t("has been demoted.")}\n\n📊 ${t("Details:")}:\n- ${demotionMessage}\n- ${t("Privileges adjusted accordingly")}`);
        fetchHighRoleUsers();
      } else {
        alert(`❌ ${t("Failed to demote user:")} ${data.error}`);
      }
    } catch (err) {
      console.error('Error demoting admin:', err);
      alert(`❌ ${t("Error:")} ${err.message}`);
    }
  };

  const handleViewAdmin = (username) => {
    window.open(`/user/${username}`, '_blank');
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.username || !newAdmin.role) {
      alert(t('Please fill in all fields'));
      return;
    }

    try {
      const response = await fetch(`${API_URL}/admin/promote-user`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          username: newAdmin.username,
          role: newAdmin.role,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${t("User")} "${newAdmin.username}" ${t("promoted to")} ${t(newAdmin.role)} ${t("successfully!")}`);
        setShowAddModal(false);
        setNewAdmin({ username: '', role: 'moderator' });
        fetchHighRoleUsers();
      } else {
        alert(`❌ ${t("Failed to promote user:")} ${data.error}`);
      }
    } catch (err) {
      console.error('Error promoting user:', err);
      alert(`❌ ${t("Error:")} ${err.message}`);
    }
  };

  return (
    <>
      <SEO title={"Roles & Admin Management"}
        description={"Manage administrators and their permissions"}
         noIndex={true}
     />
      <AdminSideBar />
      <AdminBottomNav />
      <div className="main-layout admin-layout">
        <div className="margin-container"></div>
        <div style={{ width: "100%" }}>
          <div className="roles-container">
            <div className="admin-header">
              <ShieldCheck size={32} weight="duotone" />
              <h1>{t("Admin & Roles Management")}</h1>
              <p>{t("Manage administrators and their permissions")}</p>
            </div>

            <div className="roles-controls">
              <div className="roles-search">
                <MagnifyingGlass size={20} weight="bold" />
                <input
                  type="text"
                  placeholder={t("Search by username or email...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="roles-actions-row">
                <div className="roles-filters">
                  <button onClick={() => { setFilter('all'); setPagination({ ...pagination, currentPage: 1 }); }} className={filter === 'all' ? 'active' : ''}>
                    {t("All Admins")}
                  </button>
                  <button onClick={() => { setFilter('superadmin'); setPagination({ ...pagination, currentPage: 1 }); }} className={filter === 'superadmin' ? 'active' : ''}>
                    {t("Super Admins")}
                  </button>
                  <button onClick={() => { setFilter('admin'); setPagination({ ...pagination, currentPage: 1 }); }} className={filter === 'admin' ? 'active' : ''}>
                    {t("Admins")}
                  </button>
                  <button onClick={() => { setFilter('moderator'); setPagination({ ...pagination, currentPage: 1 }); }} className={filter === 'moderator' ? 'active' : ''}>
                    {t("Moderators")}
                  </button>
                </div>

                <button className="add-admin-btn" onClick={() => setShowAddModal(true)}>
                  <Plus size={20} weight="bold" />
                  {t("Add Admin/Moderator")}
                </button>
              </div>
            </div>

            <div className="roles-stats">
              <div className="stat-card">
                <span className="stat-label">{t("Total Admins")}</span>
                <span className="stat-value">{stats.total}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">{t("Super Admins")}</span>
                <span className="stat-value">{stats.superadmin}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">{t("Admins")}</span>
                <span className="stat-value">{stats.admin}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">{t("Moderators")}</span>
                <span className="stat-value">{stats.moderator}</span>
              </div>
            </div>

            {loading && <p>{t("Loading...")}</p>}
            {error && <p style={{ color: 'red' }}>{t("Error:")}{" "}{error}</p>}

            {!loading && !error && (
              <>
                <div className="roles-table-container">
                  <table className="roles-table">
                    <thead>
                      <tr>
                        <th onClick={() => requestSort('username')}>{t("Username")} {getSortIcon('username')}</th>
                        <th onClick={() => requestSort('email')}>{t("Email")} {getSortIcon('email')}</th>
                        <th onClick={() => requestSort('role')}>{t("Role")} {getSortIcon('role')}</th>
                        <th onClick={() => requestSort('lastLogin')}>{t("Last Login")} {getSortIcon('lastLogin')}</th>
                        <th onClick={() => requestSort('joinedAt')}>{t("Added")} {getSortIcon('joinedAt')}</th>
                        <th>{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.length > 0 ? (
                        admins.map(admin => (
                          <tr key={admin.id}>
                            <td className="username-cell">{admin.username}</td>
                            <td>{admin.email}</td>
                            <td>
                              <span className={`role-badge ${admin.role}`}>
                                {getRoleIcon(admin.role)}
                                {admin.role === 'superadmin' ? t('Super Admin') : t(admin.role.charAt(0).toUpperCase() + admin.role.slice(1))}
                              </span>
                            </td>
                            <td>{new Date(admin.lastLogin).toLocaleString()}</td>
                            <td>{new Date(admin.joinedAt).toLocaleDateString()}</td>
                            <td className="roles-actions">
                              <button className="action-btn view" onClick={() => handleViewAdmin(admin.username)}>
                                {t("View")}
                              </button>
                              <button className="action-btn delete" onClick={() => handleDeleteAdmin(admin.id, admin.username, admin.role)}>
                                {t("Demote")}
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                            {t("No admins found matching your criteria")}
                          </td>
                        </tr>
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
                      {t("Page")} {pagination.currentPage} {t("of")} {pagination.totalPages} ({pagination.totalUsers} {t("total admins")})
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

      {/* Add Admin Modal */}
      {showAddModal && (
        <div className="roles-container-modal" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("Add New Admin/Moderator")}</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>{t("Username")}</label>
                <input
                  type="text"
                  placeholder={t("Enter username")}
                  value={newAdmin.username}
                  onChange={(e) => setNewAdmin({...newAdmin, username: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>{t("Role")}</label>
                <select
                  value={newAdmin.role}
                  onChange={(e) => setNewAdmin({...newAdmin, role: e.target.value})}
                >
                  <option value="moderator">{t("Moderator")}</option>
                  <option value="admin">{t("Admin")}</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowAddModal(false)}>
                {t("Cancel")}
              </button>
              <button className="submit-btn" onClick={handleAddAdmin}>
                {t("Add Admin")}
              </button>
            </div>
          </div>
        </div>
      )}


    </>
  );
}