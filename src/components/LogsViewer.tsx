// Logs Viewer Component
import React, { useState, useEffect } from 'react';
import { logger, realTimeLogger } from '../utils/Logger';
import { LogEntry } from '../utils/Logger';

interface LogsViewerProps {
  visible?: boolean;
  onClose?: () => void;
}

export const LogsViewer: React.FC<LogsViewerProps> = ({ visible = false, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'warning' | 'error' | 'debug'>('all');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (visible) {
      // Initialize with existing logs
      setLogs(logger.getLogs().slice(-50)); // Limit to last 50 logs
      
      // Subscribe to real-time log updates
      const unsubscribe = realTimeLogger.addListener((log) => {
        setLogs(prevLogs => {
          // Keep only the most recent 100 logs to prevent memory issues
          const newLogs = [...prevLogs, log];
          return newLogs.length > 100 ? newLogs.slice(-100) : newLogs;
        });
      });

      // Also get regular logs that might be missed by real-time
      const interval = setInterval(() => {
        setLogs(prevLogs => {
          const allLogs = [...prevLogs, ...logger.getLogs()];
          // Remove duplicates and keep most recent
          const uniqueLogs = Array.from(
            new Map(allLogs.map(log => [log.id, log])).values()
          ).sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
          return uniqueLogs;
        });
      }, 3000);

      return () => {
        unsubscribe();
        clearInterval(interval);
      };
    }
  }, [visible]);

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.level === filter);

  if (!visible) return null;

  return (
    <div className="logs-viewer">
      <div className="logs-header">
        <h3>系统日志</h3>
        <div className="logs-controls">
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">全部</option>
            <option value="info">信息</option>
            <option value="warning">警告</option>
            <option value="error">错误</option>
            <option value="debug">调试</option>
          </select>
          <button onClick={() => setLogs([])} className="clear-btn">清空</button>
          <button onClick={onClose} className="close-btn">关闭</button>
        </div>
      </div>
      
      <div className="logs-content">
        {filteredLogs.length === 0 ? (
          <div className="no-logs">暂无日志</div>
        ) : (
          filteredLogs.slice().reverse().map(log => (
            <div key={log.id} className={`log-entry log-${log.level}`}>
              <div className="log-header">
                <span className="log-timestamp">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="log-module">{log.module}</span>
                <span className={`log-level log-level-${log.level}`}>{log.level.toUpperCase()}</span>
              </div>
              <div className="log-message">{log.message}</div>
              {log.details && (
                <details className="log-details">
                  <summary>详情</summary>
                  <pre>{JSON.stringify(log.details, null, 2)}</pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
      
      <style jsx>{`
        .logs-viewer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 300px;
          background: rgba(15, 23, 42, 0.95); /* Dark background */
          border-top: 2px solid #475569; /* Darker border */
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }
        
        .logs-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: rgba(30, 41, 59, 0.95); /* Dark header */
          border-bottom: 1px solid rgba(148, 163, 184, 0.3);
        }
        
        .logs-header h3 {
          margin: 0;
          font-size: 1rem;
          color: #e2e8f0; /* Light text */
        }
        
        .logs-controls {
          display: flex;
          gap: 0.5rem;
        }
        
        .logs-controls select {
          padding: 0.2rem;
          background: rgba(30, 41, 59, 0.95); /* Dark dropdown background */
          color: #e2e8f0; /* Light dropdown text */
          border: 1px solid rgba(148, 163, 184, 0.4);
        }
        
        .clear-btn, .close-btn {
          padding: 0.2rem 0.5rem;
          cursor: pointer;
          background: rgba(55, 65, 85, 0.7); /* Dark button */
          color: #e2e8f0; /* Light text */
          border: 1px solid rgba(148, 163, 184, 0.4);
          border-radius: 4px;
        }
        
        .logs-content {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
          font-family: monospace;
          font-size: 0.8rem;
          color: #e2e8f0; /* Light text */
        }
        
        .log-entry {
          padding: 0.5rem;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          margin-bottom: 0.2rem;
          border-radius: 4px;
          background: rgba(30, 41, 59, 0.6); /* Dark entry background */
        }
        
        .log-entry.log-info { background-color: rgba(56, 189, 248, 0.2); color: #7dd3fc; }
        .log-entry.log-warning { background-color: rgba(250, 204, 21, 0.2); color: #fef08a; }
        .log-entry.log-error { background-color: rgba(239, 68, 68, 0.2); color: #fca5a5; }
        .log-entry.log-debug { background-color: rgba(16, 185, 129, 0.2); color: #86efac; }
        
        .log-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.2rem;
          font-weight: bold;
          color: #cbd5e1; /* Light header text */
        }
        
        .log-timestamp {
          color: #94a3b8; /* Light timestamp */
          font-size: 0.7rem;
        }
        
        .log-module {
          color: #93c5fd; /* Light module color */
        }
        
        .log-level {
          padding: 0.1rem 0.3rem;
          border-radius: 3px;
          font-size: 0.7rem;
          font-weight: bold;
        }
        
        .log-level-info { background-color: #22d3ee; color: #0f172a; }
        .log-level-warning { background-color: #fbbf24; color: #0f172a; }
        .log-level-error { background-color: #f87171; color: white; }
        .log-level-debug { background-color: #34d399; color: #0f172a; }
        
        .log-message {
          word-break: break-word;
          color: #e2e8f0; /* Light message text */
        }
        
        .log-details {
          margin-top: 0.3rem;
          color: #cbd5e1; /* Light details text */
        }
        
        .log-details pre {
          background: rgba(15, 23, 42, 0.9); /* Dark code block background */
          border: 1px solid rgba(148, 163, 184, 0.3);
          padding: 0.5rem;
          border-radius: 4px;
          overflow: auto;
          max-height: 100px;
          color: #cbd5e1; /* Light code text */
        }
        
        .no-logs {
          text-align: center;
          padding: 1rem;
          color: #94a3b8; /* Lighter grey */
        }
      `}</style>
    </div>
  );
};