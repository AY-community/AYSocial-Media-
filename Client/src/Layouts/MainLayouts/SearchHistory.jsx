import React from 'react';
import { useTranslation } from 'react-i18next';
import './SearchHistory.css';
import { X } from 'phosphor-react';

const SearchHistory = ({ show, history, loading, onClearHistory, onRemoveItem, onHistoryItemClick }) => {
    const { t } = useTranslation();

    if (!show) {
        return null;
    }

    return (
        <div className="search-history-dropdown">
            <div className="search-history-header">
                <h4>{t("Recent Searches")}</h4>
                <button className="clear-all-btn" onClick={onClearHistory}>{t("Clear All")}</button>
            </div>
            {loading ? (
                <div className="loading-spinner">{t("Loading...")}</div>
            ) : (
                <ul className="search-history-list">
                    {history
                        .filter(item => item.text && item.text.trim() !== '')
                        .map(item => (
                        <li key={item._id} className="search-history-item" onClick={() => onHistoryItemClick(item.text)}>
                            <span>{item.text}</span>
                            <button className="delete-history-item-btn" onClick={(e) => {
                                e.stopPropagation();
                                onRemoveItem(item._id);
                            }}>
                                <X size={16} />
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SearchHistory;