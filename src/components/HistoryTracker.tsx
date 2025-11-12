// History Tracking Component
import React, { useState, useEffect } from 'react';
import { LocalStorageService } from '../utils/LocalStorageService';
import { SearchResult } from '../types';

interface HistoryEntry {
  id: string;
  prompt: string;
  timestamp: number;
}

export const HistoryTracker: React.FC = () => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchResult[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'generation' | 'search'>('generation');

  useEffect(() => {
    loadHistories();
  }, []);

  const loadHistories = () => {
    const generationHistory = LocalStorageService.getGenerationHistory();
    const searchHistory = LocalStorageService.getSearchHistory();
    setHistory(generationHistory);
    setSearchHistory(searchHistory);
  };

  const clearHistory = () => {
    LocalStorageService.clearAll();
    setHistory([]);
    setSearchHistory([]);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  const loadSearchResult = (searchItem: SearchResult) => {
    // For now, just log it
    console.log('Loading search result:', searchItem);
    // In the future, this would populate the main content area with search content
  };

  return (
    <div className="history-tracker">
      <div className="history-header" onClick={() => setExpanded(!expanded)}>
        <h3>历史记录</h3>
        <span className="toggle-icon">{expanded ? '▲' : '▼'}</span>
      </div>
      
      {expanded && (
        <div className="history-content">
          <div className="history-tabs">
            <button 
              className={`tab-btn ${viewMode === 'generation' ? 'active' : ''}`}
              onClick={() => setViewMode('generation')}
            >
              生成历史
            </button>
            <button 
              className={`tab-btn ${viewMode === 'search' ? 'active' : ''}`}
              onClick={() => setViewMode('search')}
            >
              搜索历史
            </button>
          </div>
          
          <div className="history-actions">
            <button onClick={loadHistories} className="refresh-btn">刷新</button>
            <button onClick={clearHistory} className="clear-btn">清空</button>
          </div>
          
          {viewMode === 'generation' ? (
            history.length === 0 ? (
              <p className="no-history">暂无生成历史</p>
            ) : (
              <ul className="history-list">
                {history.map((entry) => (
                  <li key={entry.id} className="history-item">
                    <div className="history-prompt" title={entry.prompt}>
                      <strong>主题:</strong> {entry.prompt.length > 50 ? entry.prompt.substring(0, 50) + '...' : entry.prompt}
                    </div>
                    <div className="history-timestamp">{formatDate(entry.timestamp)}</div>
                  </li>
                ))}
              </ul>
            )
          ) : (
            searchHistory.length === 0 ? (
              <p className="no-history">暂无搜索历史</p>
            ) : (
              <ul className="search-history-list">
                {searchHistory.map((searchItem) => (
                  <li key={searchItem.id} className="search-history-item">
                    <div 
                      className="search-query" 
                      title={searchItem.query}
                      onClick={() => loadSearchResult(searchItem)}
                    >
                      <strong>搜索:</strong> {searchItem.query.length > 50 ? searchItem.query.substring(0, 50) + '...' : searchItem.query}
                    </div>
                    <div className="search-timestamp">{formatDate(searchItem.timestamp)}</div>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      )}
      
      <style jsx>{`
        .history-tracker {
          background: rgba(15, 23, 42, 0.9); /* Dark background */
          border: 1px solid rgba(148, 163, 184, 0.4);
          border-radius: 8px;
          margin-top: 1rem;
        }
        
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.8rem;
          background: rgba(30, 41, 59, 0.95); /* Darker header */
          border-radius: 8px 8px 0 0;
          cursor: pointer;
          border-bottom: 1px solid rgba(148, 163, 184, 0.3);
        }
        
        .history-header h3 {
          margin: 0;
          font-size: 1rem;
          color: #e2e8f0; /* Light text */
        }
        
        .toggle-icon {
          font-size: 0.8rem;
          color: #94a3b8; /* Light text */
        }
        
        .history-content {
          padding: 1rem;
          background: rgba(15, 23, 42, 0.8); /* Dark content background */
        }
        
        .history-tabs {
          display: flex;
          margin-bottom: 1rem;
          border-bottom: 1px solid rgba(148, 163, 184, 0.3);
        }
        
        .tab-btn {
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          color: #94a3b8; /* Light inactive tab text */
        }
        
        .tab-btn.active {
          color: #e2e8f0; /* Light active tab text */
          border-bottom-color: #60a5fa;
        }
        
        .history-actions {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
        
        .refresh-btn, .clear-btn {
          padding: 0.3rem 0.8rem;
          border: 1px solid rgba(148, 163, 184, 0.5);
          background: rgba(30, 41, 59, 0.7); /* Dark button background */
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          color: #cbd5e1; /* Light button text */
        }
        
        .refresh-btn:hover, .clear-btn:hover {
          background: rgba(55, 65, 85, 0.9); /* Slightly lighter on hover */
          border-color: rgba(165, 180, 252, 0.6);
          color: #f8fafc; /* Lighter text on hover */
        }
        
        .no-history {
          text-align: center;
          color: #94a3b8; /* Light text */
          margin: 1rem 0;
        }
        
        .history-list, .search-history-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        
        .history-item, .search-history-item {
          padding: 0.8rem;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          background: rgba(30, 41, 59, 0.5); /* Dark item background */
        }
        
        .history-item:hover, .search-history-item:hover {
          background-color: rgba(55, 65, 85, 0.7); /* Lighter on hover */
        }
        
        .history-item:last-child, .search-history-item:last-child {
          border-bottom: none;
        }
        
        .history-prompt, .search-query {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #e2e8f0; /* Light text */
        }
        
        .search-query:hover {
          color: #93c5fd; /* Highlight on hover */
          text-decoration: underline;
        }
        
        .history-timestamp, .search-timestamp {
          font-size: 0.8rem;
          color: #94a3b8; /* Light timestamp */
          white-space: nowrap;
          margin-left: 1rem;
        }
      `}</style>
    </div>
  );
};