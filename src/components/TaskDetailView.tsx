// Task Detail Viewer Component
import React, { useState, useEffect } from 'react';
import { HistoryService } from '../utils/HistoryService';
import { GeneratedContent } from '../types';

interface TaskDetailViewProps {
  taskId: string;
  onBack: () => void;
}

export const TaskDetailView: React.FC<TaskDetailViewProps> = ({ taskId, onBack }) => {
  const [taskContent, setTaskContent] = useState<GeneratedContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTaskContent();
  }, [taskId]);

  const loadTaskContent = async () => {
    setLoading(true);
    try {
      const content = await HistoryService.loadFromHistory(taskId);
      setTaskContent(content);
    } catch (error) {
      console.error('Error loading task content:', error);
      // Set a default error content
      setTaskContent({
        id: 'error-content',
        title: '加载内容出错',
        mainContent: '无法加载该任务的内容，请稍后重试。',
        nodes: [],
        knowledgeBase: [],
        timestamp: Date.now(),
        generationSteps: [],
        progress: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="task-detail-viewer">
        <div className="detail-header">
          <button className="back-btn" onClick={onBack}>← 返回</button>
          <h2>加载中...</h2>
        </div>
        <div className="detail-content">
          <p>正在加载任务内容...</p>
        </div>
      </div>
    );
  }

  if (!taskContent) {
    return (
      <div className="task-detail-viewer">
        <div className="detail-header">
          <button className="back-btn" onClick={onBack}>← 返回</button>
          <h2>内容未找到</h2>
        </div>
        <div className="detail-content">
          <p>未找到指定任务的内容。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-detail-viewer">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>← 返回</button>
        <h2>{taskContent.title}</h2>
      </div>

      <div className="detail-content">
        <div 
          className="content-display"
          dangerouslySetInnerHTML={{ __html: taskContent.mainContent }} 
        />
      </div>

      <style jsx>{`
        .task-detail-viewer {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.95);
          color: #e2e8f0;
          z-index: 1001;
          display: flex;
          flex-direction: column;
        }

        .detail-header {
          display: flex;
          align-items: center;
          padding: 1rem;
          background: rgba(30, 41, 59, 0.95);
          border-bottom: 1px solid rgba(148, 163, 184, 0.3);
        }

        .back-btn {
          padding: 0.5rem;
          margin-right: 1rem;
          background: #6c757d;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .detail-header h2 {
          margin: 0;
          font-size: 1.2rem;
          color: #e2e8f0;
        }

        .detail-content {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
        }

        .content-display {
          line-height: 1.8;
          color: #cbd5e1;
        }

        .content-display h1, .content-display h2, .content-display h3 {
          color: #93c5fd;
          margin-top: 1.5em;
          margin-bottom: 0.8em;
        }

        .content-display p {
          margin-bottom: 1em;
        }

        .content-display code {
          background-color: #374151;
          padding: 0.2rem 0.4rem;
          border-radius: 3px;
          font-size: 0.9em;
        }

        .content-display pre {
          background-color: #1f2937;
          padding: 1rem;
          border-radius: 6px;
          overflow-x: auto;
          margin: 1rem 0;
        }
      `}</style>
    </div>
  );
};