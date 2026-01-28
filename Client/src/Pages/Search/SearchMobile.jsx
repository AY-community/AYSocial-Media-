import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, X } from 'phosphor-react';
import SEO from '../../Utils/SEO';
import './SearchMobile.css';
const API_URL = import.meta.env.VITE_API;

const SearchMobile = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchHistory, setSearchHistory] = useState([]);

    const fetchSearchHistory = async () => {
        try {
            const response = await fetch(`${API_URL}/feed/search-history`, {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setSearchHistory(data.history);
            }
        } catch (error) {
            console.error('Error fetching search history:', error);
        }
    };

    useEffect(() => {
        fetchSearchHistory();
    }, []);

    const handleSearch = async (e) => {
        if (e.key === 'Enter' && searchQuery.trim() !== '') {
            const trimmedQuery = searchQuery.trim();
            try {
                await fetch(`${API_URL}/feed/search-history`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ text: trimmedQuery }),
                });
                navigate(`/search/${trimmedQuery}`);
            } catch (error) {
                console.error('Error adding to search history:', error);
            }
        }
    };

    const handleHistoryItemClick = (query) => {
        if (query) {
            navigate(`/search/${query}`);
        }
    };

    const handleRemoveItem = async (e, searchId) => {
        e.stopPropagation();
        try {
            const response = await fetch(`${API_URL}/feed/search-history/${searchId}`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (response.ok) {
                setSearchHistory(currentHistory => currentHistory.filter(item => item._id !== searchId));
            }
        } catch (error) {
            console.error('Error removing search item:', error);
        }
    };

    const handleClearHistory = async () => {
        try {
            const response = await fetch(`${API_URL}/feed/search-history`, {
                method: 'DELETE',
                credentials: 'include',
            });
            if (response.ok) {
                setSearchHistory([]);
            }
        } catch (error) {
            console.error('Error clearing search history:', error);
        }
    };

    return (
        <>
        <SEO
            title={"Search"}
            description={"Search for posts, users, and more on AYSocial."}
            noIndex={false}
        />
        <div className="search-mobile-page">
            <div className="search-mobile-header">
                <button onClick={() => navigate(-1)} className="back-btn">
                    <ArrowLeft size={24} />
                </button>
                <input
                    type="text"
                    placeholder={t("Search...")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearch}
                    autoFocus
                />
            </div>

            <div className="search-mobile-history">
                <div className="history-header">
                    <h4>{t("Recent")}</h4>
                    {searchHistory.length > 0 && (
                        <button onClick={handleClearHistory} className="clear-all-btn">
                            {t("Clear All")}
                        </button>
                    )}
                </div>
                <ul className="history-list">
                    {searchHistory.filter(item => item.text && item.text.trim() !== '').map(item => (
                        <li key={item._id} onClick={() => handleHistoryItemClick(item.text)}>
                            <span>{item.text}</span>
                            <button onClick={(e) => handleRemoveItem(e, item._id)} className="delete-item-btn">
                                <X size={16} />
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
        </>
    );
};

export default SearchMobile;