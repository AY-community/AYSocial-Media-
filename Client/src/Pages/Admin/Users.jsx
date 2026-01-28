import React, { useState, useEffect } from 'react';
import AdminSideBar from '../../Layouts/AdminLayouts/AdminSideBar';
import AdminBottomNav from '../../Layouts/AdminLayouts/AdminBottomNav';
import './Admin.css';
import './Users.css';
import { useTranslation } from "react-i18next";
import { Users as UsersIcon, MagnifyingGlass, SortAscending, SortDescending } from "phosphor-react";
import ConfirmDeleteAcccountModal from '../../Layouts/ConfirmLayouts/ConfirmDeleteAccount';
import DefaultProfilePic from '../../Assets/Profile/defaultProfilePic.jpg';
import SEO from '../../Utils/SEO';

const API_URL = import.meta.env.VITE_API;

export default function Users() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'descending' });
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalUsers: 0 });
  
  // Modal states
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    userId: null,
    username: null,
    isSecondConfirmation: false
  });
  const [modalLoading, setModalLoading] = useState(false);

  // Search suggestions
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch users from API
  useEffect(() => {
    fetchUsers();
  }, [filter, sortConfig, pagination.currentPage]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pagination.currentPage !== 1) {
        setPagination({ ...pagination, currentPage: 1 });
      } else {
        fetchUsers();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch search suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchTerm.trim() === '') {
        setSearchSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        setIsSearching(true);
        const response = await fetch(`${API_URL}/search-users?query=${searchTerm}&limit=5`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        const data = await response.json();

        if (data.success) {
          setSearchSuggestions(data.users);
          setShowSuggestions(data.users.length > 0);
        }
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchUsers = async () => {
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

      const response = await fetch(`${API_URL}/all-users?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
        setPagination(data.pagination);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users');
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

  const handleDeleteUser = (userId, username) => {
    setDeleteModal({
      open: true,
      userId,
      username,
      isSecondConfirmation: false
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      open: false,
      userId: null,
      username: null,
      isSecondConfirmation: false
    });
    setModalLoading(false);
  };

  const handleFirstConfirmation = () => {
    setDeleteModal(prev => ({
      ...prev,
      isSecondConfirmation: true
    }));
  };

  const handleDeleteConfirmed = async () => {
    const { username } = deleteModal;
    
    try {
      setModalLoading(true);

      const response = await fetch(`${API_URL}/account/${username}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ ${t("User")} "${username}" ${t("has been permanently deleted.")}\n\n📊 ${t("Details:")}:\n- ${t("Deleted")} ${data.deletedMedia} ${t("media files")}\n- ${t("All posts, videos, and messages removed")}\n- ${t("All social connections cleaned up")}`);
        closeDeleteModal();
        fetchUsers();
      } else {
        alert(`❌ ${t("Failed to delete user:")} ${data.error}`);
        closeDeleteModal();
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      alert(`❌ ${t("Error:")} ${err.message}`);
      closeDeleteModal();
    }
  };

  const handleViewUser = (username) => {
    window.open(`/user/${username}`, '_blank');
  };

  const handleSelectSuggestion = (username) => {
    setSearchTerm(username);
    setShowSuggestions(false);
  };

  return (
    <>
      <SEO title={"Users Management"}
        description={"Manage all registered users and their accounts"}
         noIndex={true}
     />
      <AdminSideBar />
      <AdminBottomNav />
      <div className="main-layout admin-layout">
        <div className="margin-container"></div>
        <div style={{ width: "100%" }}>
          <div className="users-container">
            <div className="admin-header">
              <UsersIcon size={32} weight="duotone" />
              <h1>{t("Users Management")}</h1>
              <p>{t("Manage all registered users and their accounts")}</p>
            </div>

            <div className="users-controls">
              <div className="users-search" style={{ position: 'relative' }}>
                <MagnifyingGlass size={20} weight="bold" />
                <input
                  type="text"
                  placeholder={t("Search by username or email...")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                
                {/* Search Suggestions Dropdown */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <div className="search-suggestions" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'var(--third-color)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    marginTop: '4px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    zIndex: 1000,
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {searchSuggestions.map(user => (
                      <div
                        key={user.id}
                        onClick={() => handleSelectSuggestion(user.username)}
                        style={{
                          padding: '12px 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.03)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <img 
                          src={user.profilePic || DefaultProfilePic} 
                          alt={user.username}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--primary-text-color)' }}>
                            {user.username}
                            {user.verified && <span style={{ color: '#3b82f6', marginLeft: '4px' }}>✓</span>}
                          </div>
                          {user.name && (
                            <div style={{ fontSize: '12px', color: 'var(--secondary-text-color)' }}>
                              {user.name}
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--secondary-text-color)' }}>
                          {user.followers} {t("followers")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="users-filters">
                <button onClick={() => { setFilter('all'); setPagination({ ...pagination, currentPage: 1 }); }} className={filter === 'all' ? 'active' : ''}>
                  {t("All Users")}
                </button>
                <button onClick={() => { setFilter('user'); setPagination({ ...pagination, currentPage: 1 }); }} className={filter === 'user' ? 'active' : ''}>
                  {t("Users")}
                </button>
                <button onClick={() => { setFilter('moderator'); setPagination({ ...pagination, currentPage: 1 }); }} className={filter === 'moderator' ? 'active' : ''}>
                  {t("Moderators")}
                </button>
                <button onClick={() => { setFilter('admin'); setPagination({ ...pagination, currentPage: 1 }); }} className={filter === 'admin' ? 'active' : ''}>
                  {t("Admins")}
                </button>
              </div>
            </div>

            {loading && <p>{t("Loading...")}</p>}
            {error && <p style={{ color: 'red' }}>{t("Error:")}{" "}{error}</p>}

            {!loading && !error && (
              <>
                <div className="users-table-container">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th onClick={() => requestSort('username')}>{t("Username")} {getSortIcon('username')}</th>
                        <th onClick={() => requestSort('email')}>{t("Email")} {getSortIcon('email')}</th>
                        <th onClick={() => requestSort('role')}>{t("Role")} {getSortIcon('role')}</th>
                        <th onClick={() => requestSort('posts')}>{t("Posts")} {getSortIcon('posts')}</th>
                        <th onClick={() => requestSort('reports')}>{t("Reports")} {getSortIcon('reports')}</th>
                        <th onClick={() => requestSort('joinedAt')}>{t("Joined")} {getSortIcon('joinedAt')}</th>
                        <th>{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length > 0 ? (
                        users.map(user => (
                          <tr key={user.id}>
                            <td className="username-cell">{user.username}</td>
                            <td>{user.email}</td>
                            <td><span className={`role-badge ${user.role}`}>{t(user.role)}</span></td>
                            <td>{user.posts}</td>
                            <td>
                              <span className={user.reports > 0 ? 'reports-warning' : ''}>
                                {user.reports}
                              </span>
                            </td>
                            <td>{new Date(user.joinedAt).toLocaleDateString()}</td>
                            <td className="users-actions">
                              <button className="action-btn view" onClick={() => handleViewUser(user.username)}>
                                {t("View")}
                              </button>
                              <button className="action-btn delete" onClick={() => handleDeleteUser(user.id, user.username)}>
                                {t("Delete")}
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                            {t("No users found matching your criteria")}
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
                      {t("Page")} {pagination.currentPage} {t("of")} {pagination.totalPages} ({pagination.totalUsers} {t("total users")})
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
        type={deleteModal.isSecondConfirmation ? `${t("User Account")} "${deleteModal.username}" ${t("(FINAL WARNING)")}` : `${t("User Account")} "${deleteModal.username}"`}
      />
    </>
  );
}