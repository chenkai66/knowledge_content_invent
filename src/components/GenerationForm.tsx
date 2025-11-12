// Generation Form Component
import React, { useState, useEffect } from 'react';
import { ContentGenerationConfig } from '../types';
import { HistoryTracker } from './HistoryTracker';

interface GenerationFormProps {
  onGenerate: (config: ContentGenerationConfig) => void;
  disabled: boolean;
  enableKeywordExtraction?: boolean;
  onKeywordExtractionChange?: (enabled: boolean) => void;
}

export const GenerationForm: React.FC<GenerationFormProps> = ({ 
  onGenerate, 
  disabled, 
  enableKeywordExtraction: propEnableKeywordExtraction = true,
  onKeywordExtractionChange 
}) => {
  const [topic, setTopic] = useState('');
  const [localEnableKeywordExtraction, setLocalEnableKeywordExtraction] = useState(propEnableKeywordExtraction);

  // Sync local state with prop if it changes
  useEffect(() => {
    setLocalEnableKeywordExtraction(propEnableKeywordExtraction ?? true);
  }, [propEnableKeywordExtraction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Fixed configuration as per requirements
    const config: ContentGenerationConfig = {
      topic,
      depth: 'deep',          // Always deep
      style: 'technical',      // Always technical/professional
      targetAudience: 'beginner', // Professional but understandable by beginners
      wordCount: 30000,        // Always 30,000 words
      includeExamples: true,
      includeDiagrams: false,
      maxRecurseDepth: 3,
      enableKeywordExtraction: localEnableKeywordExtraction  // Use the local state value
    };

    onGenerate(config);
  };

  const handleKeywordExtractionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setLocalEnableKeywordExtraction(newValue);
    if (onKeywordExtractionChange) {
      onKeywordExtractionChange(newValue);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="generation-form">
      <div className="compact-form-row">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="输入主题"
          required
          disabled={disabled}
          className="compact-topic-input"
        />
        <button
          type="submit"
          className="compact-generate-button"
          disabled={disabled || !topic.trim()}
        >
          {disabled ? '生成中...' : '生成'}
        </button>
      </div>

      <div className="form-options-grid">
        <div className="option-section">
          <label className="option-checkbox">
            <input
              type="checkbox"
              checked={localEnableKeywordExtraction}
              onChange={handleKeywordExtractionChange}
            />
            启用关键词提取
          </label>
        </div>
        <div className="option-section">
          {/* Space for additional options */}
        </div>
        <div className="option-section">
          {/* Space for additional options */}
        </div>
      </div>

      <HistoryTracker />

      <style jsx>{`
        .generation-form {
          display: flex;
          flex-direction: column;
          width: 100%;
        }

        .compact-form-row {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .compact-topic-input {
          flex: 1;
          padding: 0.5rem 0.75rem;
          border: 2px solid rgba(148, 163, 184, 0.4);
          border-radius: 6px;
          font-size: 0.9rem;
          background: rgba(15, 23, 42, 0.7);
          color: #f8fafc;
        }

        .compact-topic-input:focus {
          outline: none;
          border-color: #93c5fd;
          box-shadow: 0 0 0 2px rgba(147, 197, 253, 0.3);
        }

        .compact-generate-button {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.9rem;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .compact-generate-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.3);
          background: linear-gradient(135deg, #2563eb, #1e40af);
        }

        .compact-generate-button:disabled {
          background: #94a3b8;
          cursor: not-allowed;
          transform: none;
        }

        .form-options-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.8rem;
          margin: 1rem 0 0.5rem 0;
        }

        .option-section {
          display: flex;
          align-items: center;
          padding: 0.5rem;
          background: rgba(30, 41, 59, 0.4);
          border-radius: 6px;
        }

        .option-checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #e2e8f0;
          font-size: 0.85rem;
        }

        .option-checkbox input[type="checkbox"] {
          width: 1rem;
          height: 1rem;
          cursor: pointer;
        }

        .history-tracker {
          margin-top: 0.5rem;
        }
      `}</style>
    </form>
  );
};