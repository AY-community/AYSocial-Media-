import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './Search.css';
import { MagnifyingGlass, X } from 'phosphor-react';

const API_URL = import.meta.env.VITE_API;

const Search = () => {
    const { t } = useTranslation();
    const [isFocused, setIsFocused] = useState(false);
    const [searchHistory, setSearchHistory] = useState([]);
    const searchContainerRef = useRef(null);

    useEffect(() => {
        const fetchSearchHistory = async () => {
            if (isFocused) {
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
            }
        };

        fetchSearchHistory();
    }, [isFocused]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
                setIsFocused(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="search-container" ref={searchContainerRef}>
            <div className="search-input-wrapper">
                <MagnifyingGlass size={20} className="search-icon" />
                <input
                    type="text"
                    placeholder={t("Search...")}
                    onFocus={() => setIsFocused(true)}
                />
            </div>
            {isFocused && (
                <div className="search-history-dropdown">
                    <div className="search-history-header">
                        <h4>{t("Recent Searches")}</h4>
                        <button className="clear-all-btn">{t("Clear All")}</button>
                    </div>
                    <ul className="search-history-list">
                        {searchHistory.map(item => (
                            <li key={item._id} className="search-history-item">
                                <span>{item.query}</span>
                                <button className="delete-history-item-btn">
                                    <X size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default Search;