// Prompt History Viewer Component
import React, { useState, useEffect } from 'react';
import { PromptTracker, PromptRecord } from '../utils/PromptTracker';

interface PromptHistoryViewerProps {
  visible?: boolean;
  onClose?: () => void;
}

export const PromptHistoryViewer: React.FC<PromptHistoryViewerProps> = ({ visible = false, onClose }) => {
  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'with-response' | 'without-response'>('all');

  useEffect(() => {
    if (visible) {
      loadPrompts();
    }
  }, [visible]);

  const loadPrompts = () => {
    const promptData = PromptTracker.getPromptHistory();
    // Sort by timestamp, newest first
    const sortedPrompts = promptData.sort((a, b) => b.timestamp - a.timestamp);
    setPrompts(sortedPrompts);
  };

  const filteredPrompts = prompts.filter(prompt => {
    if (filter === 'with-response') return prompt.response != null;
    if (filter === 'without-response') return prompt.response == null;
    return true;
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  if (!visible) return null;

  return (
    <div className="prompt-history-viewer">
      <div className="history-header">
        <h3>提示历史</h3>
        <div className="history-controls">
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">全部</option>
            <option value="with-response">有响应</option>
            <option value="without-response">无响应</option>
          </select>
          <button onClick={loadPrompts} className="refresh-btn">刷新</button>
          <button onClick={onClose} className="close-btn">关闭</button>
        </div>
      </div>

      <div className="history-content">
        {filteredPrompts.length === 0 ? (
          <p className="no-history">暂无提示历史</p>
        ) : (
          <div className="prompt-list">
            {filteredPrompts.map((prompt) => (
              <div key={prompt.id} className="prompt-item">
                <div className="prompt-header">
                  <span className="prompt-timestamp">{formatDate(prompt.timestamp)}</span>
                  {prompt.metadata?.model && (
                    <span className="prompt-model">模型: {prompt.metadata.model}</span>
                  )}
                </div>
                <div className="prompt-content">
                  <div className="prompt-text">
                    <strong>提示:</strong>
                    <div className="prompt-content-text">{prompt.prompt}</div>
                  </div>
                  {prompt.response && (
                    <div className="response-text">
                      <strong>响应:</strong>
                      <div className="response-content-text">{prompt.response}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .prompt-history-viewer {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 400px;
          background: rgba(15, 23, 42, 0.95); /* Dark background */
          backdrop-filter: blur(10px);
          border-top: 2px solid #475569; /* Darker border */
          color: #e2e8f0; /* Light text */
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem;
          background: rgba(30, 41, 59, 0.95); /* Dark header */
          border-bottom: 1px solid rgba(148, 163, 184, 0.3); /* Darker border */
        }

        .history-header h3 {
          margin: 0;
          font-size: 1rem;
          color: #e2e8f0; /* Light text */
        }

        .history-controls {
          display: flex;
          gap: 0.5rem;
        }

        .history-controls select {
          padding: 0.2rem;
          background: rgba(15, 23, 42, 0.9); /* Dark dropdown background */
          color: #e2e8f0; /* Light dropdown text */
          border: 1px solid rgba(148, 163, 184, 0.4); /* Darker border */
        }

        .refresh-btn, .close-btn {
          padding: 0.2rem 0.5rem;
          border: 1px solid rgba(148, 163, 184, 0.5); /* Darker border */
          background: rgba(51, 65, 85, 0.7); /* Dark button background */
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.8rem;
          color: #cbd5e1; /* Light text */
        }

        .refresh-btn:hover, .close-btn:hover {
          background: rgba(71, 85, 105, 0.9); /* Slightly lighter on hover */
          border-color: rgba(165, 180, 252, 0.6); /* Lighter border on hover */
          color: #f8fafc; /* Lighter text on hover */
        }

        .history-content {
          flex: 1;
          overflow-y: auto;
          padding: 0.5rem;
          color: #e2e8f0; /* Light text */
        }

        .no-history {
          text-align: center;
          color: #94a3b8; /* Lighter grey for better contrast */
          margin: 1rem 0;
        }

        .prompt-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .prompt-item {
          padding: 0.8rem;
          border: 1px solid rgba(148, 163, 184, 0.3); /* Darker border */
          border-radius: 4px;
          background: rgba(30, 41, 59, 0.6); /* Darker background */
        }

        .prompt-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.8rem;
          color: #94a3b8; /* Lighter grey for better contrast */
        }

        .prompt-model {
          background: rgba(71, 85, 105, 0.7); /* Darker background */
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          color: #cbd5e1; /* Light text */
        }

        .prompt-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .prompt-text, .response-text {
          padding: 0.5rem;
          background: rgba(15, 23, 42, 0.7); /* Dark background */
          border-radius: 4px;
          border-left: 3px solid #60a5fa; /* Lighter blue accent */
          max-height: 200px;
          overflow-y: auto;
          color: #e2e8f0; /* Light text */
        }

        .response-text {
          border-left-color: #34d399; /* Lighter green accent */
        }

        .prompt-content-text, .response-content-text {
          margin: 0;
          line-height: 1.5;
          word-break: break-word;
          white-space: pre-wrap;
          color: #e2e8f0; /* Light text for content */
        }
      `}</style>
    </div>
  );
};