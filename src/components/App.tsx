// Main App component
import React, { useState, useEffect } from 'react';
import '../App.css'; // Import the CSS file
import { ContentGenerationConfig, GeneratedContent } from '../types';
import { ContentGenerationService } from './ContentGenerationService';
import { ProgressBar } from './ProgressBar';
import { ContentViewer } from './ContentViewer';
import { GenerationForm } from './GenerationForm';
import { DetailPopup } from './DetailPopup';
import { LogsViewer } from './LogsViewer';
import { HistoryViewer } from './HistoryViewer';
import { HistoryService } from '../utils/HistoryService';
import { PromptTracker } from '../utils/PromptTracker';
import { progressTracker } from '../utils/Logger';
import { TaskDashboard } from './TaskDashboard';
import { TaskLogViewer } from './TaskLogViewer';
import { QueryBasedHistoryViewer } from './QueryBasedHistoryViewer';

// Initialize content service following CIOLLM patterns
const initializeContentService = (): ContentGenerationService => {
  try {
    // Try to initialize with environment variables if available
    const config = {
      apiKey: import.meta.env.VITE_DASHSCOPE_API_KEY,
      model: 'qwen-max-latest',
      temperature: 0.7,
      maxTokens: 8000,
      baseUrl: import.meta.env.VITE_DASHSCOPE_BASE_URL 
    };

    // Only use config if API key is available, otherwise let service handle defaults
    return config.apiKey 
      ? new ContentGenerationService(config) 
      : new ContentGenerationService();
  } catch (error) {
    console.error('Failed to initialize ContentGenerationService:', error);
    // Initialize with fallback config
    return new ContentGenerationService({
      apiKey: 'your-api-key-here', // Will be replaced when user adds their key
      model: 'qwen-max-latest',
      temperature: 0.7,
      maxTokens: 2000,
      baseUrl: import.meta.env.VITE_DASHSCOPE_BASE_URL 
    });
  }
};

const contentService = initializeContentService();

export const App: React.FC = () => {
  const [generatedContent, setGeneratedContent] = React.useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [progressDetails, setProgressDetails] = React.useState('');
  const [selectedDetail, setSelectedDetail] = React.useState<any>(null);
  const [showDetailPopup, setShowDetailPopup] = React.useState(false);
  const [enableKeywordExtraction, setEnableKeywordExtraction] = React.useState(true); // Option for keyword extraction
  const [showTaskLogs, setShowTaskLogs] = React.useState(false); // State for merged task logs
  const [showTaskDashboard, setShowTaskDashboard] = React.useState(false); // State for task dashboard
  const [showQueryBasedHistory, setShowQueryBasedHistory] = React.useState(false); // State for query-based history viewer

  // Effect to track progress
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isGenerating) {
      interval = setInterval(() => {
        const currentProgress = progressTracker.getOverallProgress();
        const progressSteps = progressTracker.getProgress();

        if (progressSteps.length > 0) {
          const currentStep = progressSteps[progressSteps.length - 1];
          setProgress(currentProgress);
          setProgressDetails(`${currentStep.step}${currentStep.details ? ': ' + currentStep.details : ''}`);
        }
      }, 500); // Update every 500ms
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isGenerating]);

  const handleGenerate = async (config: ContentGenerationConfig) => {
    // Include the keyword extraction setting in the config
    const updatedConfig = {
      ...config,
      enableKeywordExtraction: enableKeywordExtraction
    };

    setIsGenerating(true);
    setProgress(0);
    setProgressDetails('初始化中...');

    try {
      // Listen to progress updates from the service
      const content = await contentService.generateContent(updatedConfig);
      setGeneratedContent(content);
    } catch (error) {
      console.error('Error generating content:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDetailClick = (detail: any) => {
    setSelectedDetail(detail);
    setShowDetailPopup(true);
  };

  const handleHistoryItemSelect = async (contentId: string) => {
    try {
      // First, try to load as a content file
      const content = await HistoryService.loadFromHistory(contentId);
      if (content) {
        // Validate content structure before setting
        const validatedContent = {
          id: content.id || `content-${Date.now()}`,
          title: content.title || 'Untitled Content',
          mainContent: content.mainContent || JSON.stringify(content, null, 2) || 'No content',
          nodes: Array.isArray(content.nodes) ? content.nodes : [],
          knowledgeBase: Array.isArray(content.knowledgeBase) ? content.knowledgeBase : [],
          timestamp: content.timestamp || Date.now(),
          generationSteps: Array.isArray(content.generationSteps) ? content.generationSteps : [],
          progress: Array.isArray(content.progress) ? content.progress : []
        };

        // Preserve ongoing generation state if there is one in progress
        if (isGenerating) {
          // Show the history content in a detail popup instead of overwriting
          setSelectedDetail(validatedContent);
          setShowDetailPopup(true);
        } else {
          // Only update the main content if no generation is in progress
          setGeneratedContent(validatedContent);
        }
        
        setShowHistory(false); // Close the history viewer after loading
        return;
      } 
      
      // If not found as content file, try to find as a prompt record
      const promptRecord = PromptTracker.getPromptById(contentId);
      if (promptRecord) {
        // Create content representation for prompt
        const contentWithPrompt = {
          id: `prompt-${contentId}`,
          title: promptRecord.prompt?.substring(0, 50) + (promptRecord.prompt?.length > 50 ? '...' : 'Prompt Record'),
          mainContent: `Prompt: ${promptRecord.prompt || 'No prompt'}\n\nResponse: ${promptRecord.response || 'No response yet'}`,
          nodes: [],
          knowledgeBase: [],
          timestamp: promptRecord.timestamp || Date.now(),
          generationSteps: ['loaded from prompt history'],
          progress: []
        };

        // Preserve ongoing generation state if there is one in progress
        if (isGenerating) {
          // Show the prompt content in a detail popup instead of overwriting
          setSelectedDetail(contentWithPrompt);
          setShowDetailPopup(true);
        } else {
          // Only update the main content if no generation is in progress
          setGeneratedContent(contentWithPrompt);
        }
        
        setShowHistory(false); // Close the history viewer after loading
        return;
      }
      
      console.error('Failed to load content or prompt from history');
    } catch (error) {
      console.error('Error loading from history:', error);
      // If we're in the middle of generating, don't interrupt with an error
      if (isGenerating) {
        // Show error in detail popup instead of interrupting generation
        setSelectedDetail({
          id: 'error-content',
          title: 'Error Loading Content',
          mainContent: `Failed to load content from history: ${error instanceof Error ? error.message : String(error)}`,
          nodes: [],
          knowledgeBase: [],
          timestamp: Date.now(),
          generationSteps: [],
          progress: []
        });
        setShowDetailPopup(true);
      } else {
        // Set a default error content to prevent blank page
        setGeneratedContent({
          id: 'error-content',
          title: 'Error Loading Content',
          mainContent: 'Failed to load content from history. Please try again.',
          nodes: [],
          knowledgeBase: [],
          timestamp: Date.now(),
          generationSteps: [],
          progress: []
        });
      }
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>智识工坊</h1>
        <p>通过多智能体系统生成详实的教学内容</p>
      </header>

      <div className={`app-content-area ${generatedContent ? 'has-output' : 'no-output'}`}>
        {!generatedContent ? (
          // Show input section when no content is generated
          <div className="input-section">
            <GenerationForm 
              onGenerate={handleGenerate} 
              disabled={isGenerating}
              enableKeywordExtraction={enableKeywordExtraction}
              onKeywordExtractionChange={(enabled) => setEnableKeywordExtraction(enabled)}
            />
            
            {isGenerating && (
              <div className="progress-section">
                <ProgressBar progress={progress} details={progressDetails} />
              </div>
            )}
          </div>
        ) : (
          // Show output section full-width when content is generated
          <main className="output-section full-width">
            <ContentViewer
              content={generatedContent}
              onDetailClick={handleDetailClick}
            />
          </main>
        )}
        
        {/* Empty placeholder to maintain layout structure if no content is available */}
        {!generatedContent && (
          <div className="output-section-placeholder"></div>
        )}
      </div>

      <footer className="app-footer">
        <button
          className="footer-btn task-logs-btn"
          onClick={() => setShowTaskLogs(!showTaskLogs)}
        >
          {showTaskLogs ? '隐藏' : '显示'} 当前任务日志
        </button>
        <button
          className="footer-btn history-btn"
          onClick={() => setShowQueryBasedHistory(!showQueryBasedHistory)}
        >
          {showQueryBasedHistory ? '隐藏' : '显示'} 按查询历史
        </button>
        <button
          className="footer-btn task-btn"
          onClick={() => setShowTaskDashboard(!showTaskDashboard)}
        >
          {showTaskDashboard ? '隐藏' : '显示'} 任务面板
        </button>
      </footer>

      {showDetailPopup && selectedDetail && (
        <DetailPopup
          detail={selectedDetail}
          onClose={() => setShowDetailPopup(false)}
        />
      )}

      {showTaskLogs && (
        <TaskLogViewer
          visible={showTaskLogs}
          onClose={() => setShowTaskLogs(false)}
          onItemSelect={handleHistoryItemSelect}
        />
      )}

      {showQueryBasedHistory && (
        <QueryBasedHistoryViewer
          visible={showQueryBasedHistory}
          onClose={() => setShowQueryBasedHistory(false)}
          onItemSelect={handleHistoryItemSelect}
        />
      )}

      {showTaskDashboard && (
        <TaskDashboard
          visible={showTaskDashboard}
          onClose={() => setShowTaskDashboard(false)}
        />
      )}
    </div>
  );
};