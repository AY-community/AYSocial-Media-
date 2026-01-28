import React, { useState, useEffect } from 'react';
import AdminSideBar from '../../../Layouts/AdminLayouts/AdminSideBar';
import AdminBottomNav from '../../../Layouts/AdminLayouts/AdminBottomNav';
import '../Admin.css';
import './Reviews.css';
import { useTranslation } from "react-i18next";
import { Star, Heart, SortAscending, SortDescending, CaretLeft, CaretRight } from "phosphor-react";
 import SEO from '../../../Utils/SEO';

const API_URL = import.meta.env.VITE_API;

export default function AdminReviews() {
  const { t } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    fetchReviews();
  }, [filter, sortBy, order, currentPage]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        status: filter,
        sortBy: sortBy,
        order: order,
      });

      const response = await fetch(`${API_URL}/review?${params}`, {
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setReviews(data.reviews);
        setPagination(data.pagination);
        setCounts(data.counts);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestSort = (key) => {
    if (sortBy === key) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setOrder('asc');
    }
    setCurrentPage(1);
  };

  const getSortIcon = (key) => {
    if (sortBy !== key) return null;
    return order === 'asc' ? <SortAscending size={16} /> : <SortDescending size={16} />;
  };

  const handleApprove = async (id) => {
    try {
      const response = await fetch(`${API_URL}/review/approve/${id}`, {
        method: 'PUT',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        fetchReviews();
      }
    } catch (error) {
      console.error('Error approving review:', error);
    }
  };

  const handleReject = async (id) => {
    try {
      const response = await fetch(`${API_URL}/review/reject/${id}`, {
        method: 'PUT',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        fetchReviews();
      }
    } catch (error) {
      console.error('Error rejecting review:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_URL}/review/delete/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        fetchReviews();
      }
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="admin-review-star-display">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
          <Star
            key={value}
            size={16}
            weight={rating >= value ? "fill" : "regular"}
            className={`admin-review-star-icon ${rating >= value ? "filled" : ""}`}
          />
        ))}
      </div>
    );
  };

  const getRatingLabel = (rating) => {
    if (rating <= 2) return t('Poor');
    if (rating <= 4) return t('Fair');
    if (rating <= 6) return t('Good');
    if (rating <= 8) return t('Very Good');
    return t('Excellent');
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  return (
    <>
      <SEO title={"Reviews Management"}
        description={"Manage user feedback and reviews"}
         noIndex={true}
     />

      <AdminSideBar />
      <AdminBottomNav />
      <div className="main-layout admin-layout">
        <div className="margin-container"></div>
        <div style={{ width: "100%" }}>
          <div className="admin-review-container">
            <div className="admin-header">
              <Heart size={32} weight="duotone" />
              <h1>{t("Reviews Management")}</h1>
              <p>{t("Manage user feedback and reviews")}</p>
            </div>

            <div className="admin-review-filters">
              <button onClick={() => handleFilterChange('all')} className={filter === 'all' ? 'active' : ''}>
                {t("All")} ({counts.all})
              </button>
              <button onClick={() => handleFilterChange('pending')} className={filter === 'pending' ? 'active' : ''}>
                {t("Pending")} ({counts.pending})
              </button>
              <button onClick={() => handleFilterChange('approved')} className={filter === 'approved' ? 'active' : ''}>
                {t("Approved")} ({counts.approved})
              </button>
              <button onClick={() => handleFilterChange('rejected')} className={filter === 'rejected' ? 'active' : ''}>
                {t("Rejected")} ({counts.rejected})
              </button>
            </div>

            {loading ? (
              <div className="admin-review-loading">
                <div className="spinner"></div>
                <p>{t("Loading reviews...")}</p>
              </div>
            ) : (
              <>
                <div className="admin-review-table-container">
                  <table className="admin-review-table">
                    <thead>
                      <tr>
                        <th onClick={() => requestSort('userName')}>{t("User")} {getSortIcon('userName')}</th>
                        <th onClick={() => requestSort('rating')}>{t("Rating")} {getSortIcon('rating')}</th>
                        <th>{t("Feedback")}</th>
                        <th onClick={() => requestSort('createdAt')}>{t("Date")} {getSortIcon('createdAt')}</th>
                        <th>{t("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.length === 0 ? (
                        <tr>
                          <td colSpan="5" style={{ textAlign: 'center' }}>{t("No reviews found")}</td>
                        </tr>
                      ) : (
                        reviews.map(review => (
                          <tr key={review.id}>
                            <td>
                              <div className="admin-review-user-info">
                                <strong>{review.userName}</strong>
                                <span className="admin-review-user-id">{review.userId}</span>
                              </div>
                            </td>
                            <td>
                              <div className="admin-review-rating-cell">
                                {renderStars(review.rating)}
                                <div className="admin-review-rating-info">
                                  <span className="admin-review-rating-label">{getRatingLabel(review.rating)}</span>
                                  <span className="admin-review-rating-number">({review.rating}/10)</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="admin-review-feedback-cell">
                                {review.feedback}
                              </div>
                            </td>
                            <td>{new Date(review.createdAt).toLocaleString()}</td>
                            <td className="admin-review-actions">
                              <button 
                                className="admin-review-action-btn approve"
                                onClick={() => handleApprove(review.id)}
                              >
                                {t("Approve")}
                              </button>
                              <button 
                                className="admin-review-action-btn reject"
                                onClick={() => handleReject(review.id)}
                              >
                                {t("Reject")}
                              </button>
                              <button 
                                className="admin-review-action-btn delete"
                                onClick={() => handleDelete(review.id)}
                              >
                                {t("Delete")}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination - Only show if more than 1 page */}
                {pagination.totalPages > 1 && (
                  <div className="admin-review-pagination">
                    <button 
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      disabled={!pagination.hasPrevPage}
                      className="pagination-btn"
                    >
                      <CaretLeft size={16} />
                      {t("Previous")}
                    </button>
                    
                    <span className="pagination-info">
                      {t("Page")} {pagination.currentPage} {t("of")} {pagination.totalPages} ({pagination.totalReviews} {t("total")})
                    </span>
                    
                    <button 
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      disabled={!pagination.hasNextPage}
                      className="pagination-btn"
                    >
                      {t("Next")}
                      <CaretRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}