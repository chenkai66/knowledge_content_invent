// Detail Popup Component
import React from 'react';
import { KnowledgeBaseEntry } from '../types';

interface DetailPopupProps {
  detail: KnowledgeBaseEntry;
  onClose: () => void;
}

export const DetailPopup: React.FC<DetailPopupProps> = ({ detail, onClose }) => {
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="popup-header">
          <h2>{detail.term}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="popup-body">
          <div className="definition-section">
            <h3>定义</h3>
            <p>{detail.definition}</p>
          </div>
          
          <div className="context-section">
            <h3>上下文</h3>
            <p>{detail.context}</p>
          </div>
          
          {detail.relatedTerms && detail.relatedTerms.length > 0 && (
            <div className="related-terms-section">
              <h3>相关术语</h3>
              <div className="related-terms">
                {detail.relatedTerms.map((term, index) => (
                  <span key={index} className="related-term">{term}</span>
                ))}
              </div>
            </div>
          )}
          
          <div className="meta-info">
            <p><strong>收录时间:</strong> {new Date(detail.timestamp).toLocaleString('zh-CN')}</p>
          </div>
        </div>
        
        <style jsx>{`
          .popup-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
          }
          
          .popup-content {
            background: white;
            border-radius: 10px;
            width: 90%;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            position: relative;
          }
          
          .popup-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 1.5rem;
            border-bottom: 1px solid #eee;
          }
          
          .popup-header h2 {
            margin: 0;
            color: #2c3e50;
            font-size: 1.5rem;
          }
          
          .close-button {
            background: none;
            border: none;
            font-size: 2rem;
            cursor: pointer;
            color: #7f8c8d;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
          }
          
          .close-button:hover {
            background: #f1f2f6;
            color: #2c3e50;
          }
          
          .popup-body {
            padding: 1.5rem;
          }
          
          .definition-section, .context-section, .related-terms-section {
            margin-bottom: 1.5rem;
          }
          
          .definition-section h3, .context-section h3, .related-terms-section h3 {
            color: #3498db;
            margin-bottom: 0.8rem;
            font-size: 1.1rem;
          }
          
          .popup-body p {
            line-height: 1.6;
            color: #34495e;
          }
          
          .related-terms {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          
          .related-term {
            background: #e3f2fd;
            color: #1976d2;
            padding: 0.3rem 0.7rem;
            border-radius: 15px;
            font-size: 0.9rem;
          }
          
          .meta-info {
            margin-top: 1.5rem;
            padding-top: 1rem;
            border-top: 1px solid #eee;
            color: #7f8c8d;
            font-size: 0.9rem;
          }
        `}</style>
      </div>
    </div>
  );
};