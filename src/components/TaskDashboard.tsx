// Task Dashboard Component
import React, { useState, useEffect } from 'react';
import { TaskManagerService } from '../services/TaskManagerService';
import { Task } from '../types/TaskTypes';
import { TaskDetail } from './TaskDetail';

interface TaskDashboardProps {
  visible: boolean;
  onClose: () => void;
}

export const TaskDashboard: React.FC<TaskDashboardProps> = ({ visible, onClose }) => {
  const taskManager = TaskManagerService.getInstance();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (visible) {
      loadTasks();
    }
  }, [visible, refreshTrigger]);

  const loadTasks = () => {
    const allTasks = taskManager.getAllTasks();
    setTasks(allTasks);
  };

  const refreshTasks = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (!visible) return null;

  return (
    <div className="task-dashboard-overlay">
      <div className="task-dashboard">
        <div className="task-dashboard-header">
          <h2>任务管理面板</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="task-dashboard-content">
          {!selectedTaskId ? (
            <>
              <div className="task-summary">
                <div className="summary-stats">
                  <div className="stat-card">
                    <h3>{taskManager.getTasksByStatus('running').length}</h3>
                    <p>运行中</p>
                  </div>
                  <div className="stat-card">
                    <h3>{taskManager.getTasksByStatus('completed').length}</h3>
                    <p>已完成</p>
                  </div>
                  <div className="stat-card">
                    <h3>{taskManager.getTasksByStatus('failed').length}</h3>
                    <p>失败</p>
                  </div>
                  <div className="stat-card">
                    <h3>{tasks.length}</h3>
                    <p>总计</p>
                  </div>
                </div>

                <div className="task-list">
                  {tasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`task-item status-${task.status}`}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <div className="task-info">
                        <h3>{task.topic.substring(0, 50)}{task.topic.length > 50 ? '...' : ''}</h3>
                        <div className="task-meta">
                          <span className="task-status">{getStatusLabel(task.status)}</span>
                          <span className="task-time">
                            {new Date(task.createdAt).toLocaleString('zh-CN')}
                          </span>
                        </div>
                      </div>
                      <div className="task-actions">
                        <span className="progress-percent">
                          {task.progress.length > 0 
                            ? `${Math.round((task.progress[task.progress.length - 1].current / task.progress[task.progress.length - 1].total) * 100)}%` 
                            : '0%'}
                        </span>
                      </div>
                    </div>
                  ))}

                  {tasks.length === 0 && (
                    <div className="no-tasks">
                      <p>暂无任务记录</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <TaskDetail 
              taskId={selectedTaskId} 
              onBack={() => setSelectedTaskId(null)}
              onRefresh={refreshTasks}
            />
          )}
        </div>

        <style jsx>{`
          .task-dashboard-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
          }

          .task-dashboard {
            width: 90%;
            max-width: 1200px;
            height: 80vh;
            background: white;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          .task-dashboard-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1rem;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
          }

          .task-dashboard-header h2 {
            margin: 0;
            color: #2c3e50;
          }

          .close-btn {
            background: #dc3545;
            color: white;
            border: none;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .task-dashboard-content {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
          }

          .task-summary {
            display: flex;
            flex-direction: column;
          }

          .summary-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 1rem;
            margin-bottom: 1.5rem;
          }

          .stat-card {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }

          .stat-card h3 {
            margin: 0 0 0.5rem 0;
            font-size: 1.5rem;
            color: #3498db;
          }

          .task-list {
            flex: 1;
          }

          .task-item {
            padding: 1rem;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            margin-bottom: 0.5rem;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .task-item:hover {
            background: #f8f9fa;
            border-color: #3498db;
          }

          .task-item.status-running {
            border-left: 4px solid #ffc107;
          }

          .task-item.status-completed {
            border-left: 4px solid #28a745;
          }

          .task-item.status-failed {
            border-left: 4px solid #dc3545;
          }

          .task-info h3 {
            margin: 0 0 0.5rem 0;
            color: #2c3e50;
          }

          .task-meta {
            display: flex;
            gap: 1rem;
            font-size: 0.8rem;
            color: #6c757d;
          }

          .task-status {
            padding: 0.2rem 0.5rem;
            border-radius: 12px;
            font-size: 0.7rem;
            text-transform: uppercase;
          }

          .status-created .task-status, .status-running .task-status {
            background: #fff3cd;
            color: #856404;
          }

          .status-completed .task-status {
            background: #d4edda;
            color: #155724;
          }

          .status-failed .task-status {
            background: #f8d7da;
            color: #721c24;
          }

          .task-actions {
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .progress-percent {
            background: #e9ecef;
            padding: 0.2rem 0.5rem;
            border-radius: 12px;
            font-size: 0.8rem;
            color: #495057;
          }

          .no-tasks {
            text-align: center;
            padding: 2rem;
            color: #6c757d;
          }
        `}</style>
      </div>
    </div>
  );
};

const getStatusLabel = (status: Task['status']) => {
  switch(status) {
    case 'created': return '已创建';
    case 'running': return '运行中';
    case 'completed': return '已完成';
    case 'failed': return '失败';
    default: return status;
  }
};