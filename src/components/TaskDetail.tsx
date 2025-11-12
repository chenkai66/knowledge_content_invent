// Task Detail Component
import React, { useState, useEffect } from 'react';
import { TaskManagerService } from '../services/TaskManagerService';
import { TaskPromptRecord } from '../types/TaskTypes';

interface TaskDetailProps {
  taskId: string;
  onBack: () => void;
  onRefresh: () => void;
}

export const TaskDetail: React.FC<TaskDetailProps> = ({ taskId, onBack, onRefresh }) => {
  const taskManager = TaskManagerService.getInstance();
  const [task, setTask] = useState(taskManager.getTask(taskId)!!);
  const [promptHistory, setPromptHistory] = useState<TaskPromptRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTaskDetail();
    const interval = setInterval(loadTaskDetail, 2000); // Refresh every 2 seconds to show real-time progress

    return () => clearInterval(interval);
  }, [taskId]);

  const loadTaskDetail = () => {
    const currentTask = taskManager.getTask(taskId);
    if (currentTask) {
      setTask(currentTask);
    }
    
    const prompts = taskManager.getTaskPromptHistory(taskId);
    setPromptHistory(prompts);
    setLoading(false);
  };

  const getStatusClass = (status: string) => {
    switch(status) {
      case 'running': return 'status-running';
      case 'completed': return 'status-completed';
      case 'failed': return 'status-failed';
      default: return 'status-default';
    }
  };

  if (!task) {
    return (
      <div className="task-detail">
        <div className="detail-header">
          <button className="back-btn" onClick={onBack}>← 返回</button>
          <h2>任务不存在</h2>
        </div>
        <div className="no-task">
          <p>找不到指定的任务</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-detail">
      <div className="detail-header">
        <button className="back-btn" onClick={onBack}>← 返回</button>
        <h2>{task.topic}</h2>
      </div>

      <div className="task-overview">
        <div className="overview-item">
          <label>任务ID:</label>
          <span>{task.id}</span>
        </div>
        <div className="overview-item">
          <label>状态:</label>
          <span className={`status-badge ${getStatusClass(task.status)}`}>
            {getStatusLabel(task.status)}
          </span>
        </div>
        <div className="overview-item">
          <label>创建时间:</label>
          <span>{new Date(task.createdAt).toLocaleString('zh-CN')}</span>
        </div>
        {task.startedAt && (
          <div className="overview-item">
            <label>开始时间:</label>
            <span>{new Date(task.startedAt).toLocaleString('zh-CN')}</span>
          </div>
        )}
        {task.completedAt && (
          <div className="overview-item">
            <label>完成时间:</label>
            <span>{new Date(task.completedAt).toLocaleString('zh-CN')}</span>
          </div>
        )}
        <div className="overview-item">
          <label>进度:</label>
          <div className="progress-bar-container">
            <div 
              className="progress-bar-fill"
              style={{ 
                width: `${task.progress.length > 0 
                  ? `${Math.round((task.progress[task.progress.length - 1].current / task.progress[task.progress.length - 1].total) * 100)}%` 
                  : '0%'}` 
              }}
            ></div>
            <span className="progress-text">
              {task.progress.length > 0 
                ? `${Math.round((task.progress[task.progress.length - 1].current / task.progress[task.progress.length - 1].total) * 100)}%` 
                : '0%'}
            </span>
          </div>
        </div>
      </div>

      <div className="task-content-section">
        <h3>任务成果</h3>
        {task.status === 'completed' && task.currentContent ? (
          <div className="task-result">
            <p><strong>标题:</strong> {task.currentContent.title}</p>
            <p><strong>字数:</strong> {task.currentContent.mainContent.length} 字符</p>
            <p><strong>知识点:</strong> {task.currentContent.knowledgeBase.length} 个</p>
          </div>
        ) : task.status === 'running' ? (
          <div className="task-progress">
            <p>正在生成内容...</p>
            {task.progress.map((step, index) => (
              <div key={index} className="progress-step">
                <span className={`step-status ${step.status === 'completed' ? 'completed' : step.status === 'in-progress' ? 'in-progress' : 'pending'}`}>
                  {step.step} - {step.details || ''}
                </span>
              </div>
            ))}
          </div>
        ) : task.status === 'failed' ? (
          <div className="task-error">
            <p>任务执行失败</p>
          </div>
        ) : (
          <div className="task-waiting">
            <p>等待执行...</p>
          </div>
        )}
      </div>

      <div className="task-prompt-history">
        <h3>大模型输入输出记录</h3>
        {promptHistory.length > 0 ? (
          <div className="prompt-list">
            {promptHistory.map((record) => (
              <div key={record.id} className="prompt-record">
                <div className="prompt-section">
                  <h4>输入:</h4>
                  <p>{record.prompt}</p>
                </div>
                {record.response && (
                  <div className="response-section">
                    <h4>输出:</h4>
                    <p>{record.response}</p>
                  </div>
                )}
                <div className="record-time">
                  {new Date(record.timestamp).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>暂无大模型输入输出记录</p>
        )}
      </div>

      <style jsx>{`
        .task-detail {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .detail-header {
          display: flex;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #dee2e6;
        }

        .back-btn {
          background: #6c757d;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          cursor: pointer;
          margin-right: 1rem;
        }

        .detail-header h2 {
          margin: 0;
          color: #2c3e50;
          flex: 1;
        }

        .task-overview {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .overview-item {
          display: flex;
          flex-direction: column;
        }

        .overview-item label {
          font-weight: bold;
          margin-bottom: 0.2rem;
          color: #495057;
        }

        .status-badge {
          display: inline-block;
          padding: 0.2rem 0.5rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: bold;
          width: fit-content;
        }

        .status-running {
          background: #fff3cd;
          color: #856404;
        }

        .status-completed {
          background: #d4edda;
          color: #155724;
        }

        .status-failed {
          background: #f8d7da;
          color: #721c24;
        }

        .status-default {
          background: #e2e3e5;
          color: #383d41;
        }

        .progress-bar-container {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .progress-bar-fill {
          height: 20px;
          background: linear-gradient(to right, #3498db, #2ecc71);
          border-radius: 10px;
          min-width: 0;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.8rem;
          color: #6c757d;
        }

        .task-content-section {
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .task-result, .task-progress, .task-error, .task-waiting {
          padding: 1rem;
          background: white;
          border-radius: 4px;
          border-left: 3px solid #3498db;
        }

        .progress-step {
          margin: 0.5rem 0;
          padding: 0.5rem;
          background: #f8f9fa;
          border-radius: 4px;
        }

        .step-status {
          padding: 0.2rem 0.5rem;
          border-radius: 12px;
          font-size: 0.8rem;
        }

        .step-status.completed {
          background: #d4edda;
          color: #155724;
        }

        .step-status.in-progress {
          background: #fff3cd;
          color: #856404;
        }

        .step-status.pending {
          background: #d7f0ff;
          color: #006ba6;
        }

        .task-prompt-history {
          flex: 1;
          overflow-y: auto;
        }

        .prompt-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .prompt-record {
          border: 1px solid #e9ecef;
          border-radius: 8px;
          padding: 1rem;
          background: white;
        }

        .prompt-section, .response-section {
          margin-bottom: 1rem;
        }

        .prompt-section h4, .response-section h4 {
          margin: 0 0 0.5rem 0;
          color: #495057;
        }

        .prompt-section p, .response-section p {
          margin: 0;
          line-height: 1.5;
          word-break: break-word;
        }

        .record-time {
          font-size: 0.75rem;
          color: #6c757d;
          text-align: right;
        }
      `}</style>
    </div>
  );
};

const getStatusLabel = (status: string) => {
  switch(status) {
    case 'created': return '已创建';
    case 'running': return '运行中';
    case 'completed': return '已完成';
    case 'failed': return '失败';
    default: return status;
  }
};