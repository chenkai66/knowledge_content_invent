// Progress Bar Component
import React from 'react';

interface ProgressBarProps {
  progress: number;
  details: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress, details }) => {
  return (
    <div className="progress-container">
      <div className="progress-header">
        <span className="progress-text">进度: {progress}%</span>
        <span className="progress-details">{details}</span>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="progress-percentage">{progress}%</div>
      
      <style jsx>{`
        .progress-container {
          margin-top: 1rem;
          position: relative;
        }
        
        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          color: #7f8c8d;
        }
        
        .progress-bar {
          height: 24px;
          background-color: #ecf0f1;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3498db, #2ecc71);
          transition: width 0.3s ease;
          border-radius: 12px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 10px;
          color: white;
          font-size: 0.8rem;
          font-weight: bold;
          text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        }
        
        .progress-percentage {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: #2c3e50;
          font-weight: bold;
          font-size: 0.9rem;
          text-shadow: 0 0 2px white;
        }
      `}</style>
    </div>
  );
};