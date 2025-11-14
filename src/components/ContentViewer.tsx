// Content Viewer Component
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css'; // Import KaTeX CSS for math rendering
import { GeneratedContent } from '../types';

interface ContentViewerProps {
  content: GeneratedContent;
  onDetailClick: (detail: any) => void;
}

export const ContentViewer: React.FC<ContentViewerProps> = ({ content, onDetailClick }) => {
  // Fallback to empty content if content is not properly structured
  const safeContent = content || {
    id: 'default',
    title: 'Default Title',
    mainContent: '',
    nodes: [],
    knowledgeBase: [],
    timestamp: Date.now(),
    generationSteps: [],
    progress: []
  };

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSection = (id: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSections(newExpanded);
  };

  // Function to handle clickable concepts that are already marked in the content
  const setupClickableConcepts = (node: HTMLElement | null) => {
    if (!node) return;

    // Find all span elements with class clickable-concept
    const conceptSpans = node.querySelectorAll('.clickable-concept');
    conceptSpans.forEach(span => {
      const term = span.getAttribute('data-term');
      if (term) {
        // Find the corresponding entry in knowledgeBase
        const entry = safeContent.knowledgeBase.find((kbEntry: any) => kbEntry.term === term);
        if (entry) {
          span.addEventListener('click', (e) => {
            e.stopPropagation();
            onDetailClick(entry);
          });
        }
      }
    });
  };

  // Function to download content as a document
  const downloadContentAsDocument = () => {
    try {
      // Create a comprehensive document content
      let documentContent = `# ${safeContent.title}\n\n`;
      documentContent += `生成时间: ${new Date(safeContent.timestamp).toLocaleString('zh-CN')}\n\n`;
      documentContent += `${safeContent.mainContent}\n\n`;
      
      if (safeContent.knowledgeBase && safeContent.knowledgeBase.length > 0) {
        documentContent += `## 知识库\n\n`;
        safeContent.knowledgeBase.forEach(entry => {
          documentContent += `### ${entry.term}\n`;
          documentContent += `${entry.definition}\n\n`;
        });
      }
      
      documentContent += `\n\n生成于知识内容生成器`;
      
      // Create a Blob and download
      const blob = new Blob([documentContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const fileName = `${safeContent.title.replace(/[^a-z0-9]/gi, '_')}_${new Date(safeContent.timestamp).getTime()}.md`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading content:', error);
      alert('下载内容时出错: ' + error.message);
    }
  };

  // Setup clickable concepts after the component renders
  useEffect(() => {
    const mainContentDiv = document.querySelector('.main-content');
    if (mainContentDiv) {
      setupClickableConcepts(mainContentDiv);
    }
  }, [safeContent]);

  // Function to wrap terms in the content with clickable spans (fallback for unannotated content)
  const highlightTerms = (text: string) => {
    // If content already has clickable-concept spans, don't highlight again
    if (text?.includes('clickable-concept')) {
      return text;
    }
    
    let result = text || '';
    
    // Highlight terms from knowledge base
    if (safeContent.knowledgeBase && Array.isArray(safeContent.knowledgeBase)) {
      for (const entry of safeContent.knowledgeBase) {
        if (entry && entry.term) {
          const termRegex = new RegExp(`\\b${entry.term}\\b`, 'gi');
          result = result.replace(termRegex, 
            `<span class="highlighted-term" data-term="${entry.term}">${entry.term}</span>`
          );
        }
      }
    }
    
    return result;
  };

  // Custom component for rendering paragraphs with highlighted terms
  const Paragraph = ({ children }: { children: React.ReactNode }) => {
    if (typeof children === 'string') {
      const highlightedContent = highlightTerms(children);
      return (
        <p
          dangerouslySetInnerHTML={{ __html: highlightedContent }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('highlighted-term') || target.classList.contains('clickable-concept')) {
              const term = target.getAttribute('data-term');
              if (term) {
                const knowledgeEntry = safeContent.knowledgeBase.find(k => k.term === term);
                if (knowledgeEntry) {
                  onDetailClick(knowledgeEntry);
                }
              }
            }
          }}
        />
      );
    }
    return <p>{children}</p>;
  };

  return (
    <div className="content-viewer" style={{ width: '100%' }}>
      <div className="content-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ color: '#1e293b' }}>{safeContent.title}</h1>
          <button 
            className="download-btn"
            onClick={downloadContentAsDocument}
            title="下载结果文档"
          >
            📄 下载文档
          </button>
        </div>
        <div className="content-meta">
          <span>生成时间: {new Date(safeContent.timestamp).toLocaleString('zh-CN')}</span>
          <span>阅读时间: ~{Math.ceil((safeContent.mainContent || '').split(' ').length / 200)} 分钟</span>
        </div>
      </div>

      <div className="main-content">
        {(safeContent.mainContent || '').includes('Error occurred while calling the LLM') ? (
          <div className="error-message">
            <span className="error-title">⚠️ Content Generation Error:</span>
            <span className="error-content">{safeContent.mainContent}</span>
            {(safeContent.mainContent || '').includes('CORS') && (
              <>
                <br /><br />
                <strong>Solution:</strong> This error often occurs due to CORS restrictions when calling APIs directly from a browser.
                Consider using a backend service to make the API calls or configure a proxy.
              </>
            )}
          </div>
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex, rehypeRaw]}
            components={{
              p: ({ node, ...props }) => <p {...props} className="paragraph" />,
              h1: ({ node, ...props }) => <h1 {...props} className="section-title" />,
              h2: ({ node, ...props }) => <h2 {...props} className="subsection-title" />,
              h3: ({ node, ...props }) => <h3 {...props} className="subsubsection-title" />,
              li: ({ node, ...props }) => <li {...props} className="list-item" />,
              ul: ({ node, ...props }) => <ul {...props} className="unordered-list" />,
              ol: ({ node, ...props }) => <ol {...props} className="ordered-list" />,
              blockquote: ({ node, ...props }) => <blockquote {...props} className="blockquote" />,
              code: ({ node, inline, className, children, ...props }) => {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <pre className={`code-block ${className}`}>
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {safeContent.mainContent}
          </ReactMarkdown>
        )}
      </div>

      {/* Integrate knowledge base entries directly into the content flow */} 
      {safeContent.knowledgeBase.length > 0 && (
        <>
          <h2 style={{ marginTop: '2rem', color: '#2c3e50' }}>知识库</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '0.8rem', marginTop: '1rem' }}>
            {safeContent.knowledgeBase.map((entry) => (
              <div
                key={entry.id}
                className="knowledge-entry"
                onClick={() => onDetailClick(entry)}
                style={{ 
                  padding: '0.8rem',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '0.9rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e9ecef';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <h3 style={{ margin: '0', color: '#2980b9', fontSize: '1rem' }}>{entry.term}</h3>
              </div>
            ))}
          </div>
        </>
      )}

      <style jsx>{`
        .content-viewer {
          max-width: 800px;
          width: 100%;
          word-wrap: break-word;
          overflow-wrap: break-word;
          overflow-x: auto;
          box-sizing: border-box;
          display: block;
        }

        .content-header {
          margin-bottom: 2rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eee;
        }

        .content-header h1 {
          margin: 0 0 0.5rem 0;
          color: #2c3e50;
          font-size: 2rem;
        }
        
        .download-btn {
          padding: 0.5rem 1rem;
          background-color: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.9rem;
          transition: background-color 0.2s;
        }
        
        .download-btn:hover {
          background-color: #2980b9;
        }

        .content-meta {
          display: flex;
          gap: 1.5rem;
          color: #7f8c8d;
          font-size: 0.9rem;
        }

        .main-content {
          line-height: 1.8;
          color: #1e293b; /* Dark text for better readability on white background */
          overflow-wrap: break-word;
          word-wrap: break-word;
          background-color: white; /* Light background as requested */
          padding: 1.5rem;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.05);
          /* Remove any block-separating styling */
        }
        
        .main-content :global(.katex-display) {
          overflow-x: auto;
          overflow-y: hidden;
        }
        
        .main-content :global(.katex) {
          white-space: nowrap;
        }
        
        .main-content :global(h1),
        .main-content :global(h2),
        .main-content :global(h3) {
          margin-top: 1.5em;
          margin-bottom: 0.8em;
          color: #2c3e50;
          /* Remove any visual blocking */
          display: inline-block;
          width: 100%;
        }
        
        .main-content :global(p) {
          margin-bottom: 1em;
          /* Ensure inline flow */
        }
        
        .main-content :global(pre) {
          background-color: #f8f9fa !important;
          border: 1px solid #e9ecef !important;
          border-radius: 4px !important;
          padding: 1rem !important;
          overflow-x: auto !important;
          margin: 1rem 0 !important;
          /* Reduce visual separation */
        }
        
        .main-content :global(code) {
          background-color: #f8f9fa !important;
          padding: 0.2rem 0.4rem !important;
          border-radius: 3px !important;
          font-size: 0.9em !important;
        }
        
        .main-content :global(blockquote) {
          border-left: 4px solid #3498db;
          padding-left: 1rem;
          margin: 1rem 0;
          color: #7f8c8d;
          background-color: #f8f9fa;
          padding: 0.5rem 1rem;
          border-radius: 0 4px 4px 0;
          /* Minimize visual separation */
        }
        
        .main-content :global(ul),
        .main-content :global(ol) {
          padding-left: 1.5rem;
          margin: 1rem 0;
          /* Remove visual blocking */
        }
        
        .main-content :global(li) {
          margin-bottom: 0.5rem;
        }
        
        .content-section {
          margin-bottom: 2rem;
          padding: 1rem;
          border-left: 3px solid #3498db;
          background-color: #f8f9fa;
          border-radius: 0 4px 4px 0;
          /* Remove any blocking appearance */
        }
        
        .knowledge-entry {
          /* Ensure inline flow instead of blocky appearance */
          margin-bottom: 1.5rem;
          padding-bottom: 1rem;
          border-bottom: 1px solid #eee;
          cursor: pointer;
          /* Remove any blocking visual styles */
        }
        
        .main-content :global(.katex-display) {
          margin: 1em 0;
          text-align: center;
        }

        .section-title {
          color: #2c3e50;
          border-bottom: 1px solid #eee;
          padding-bottom: 0.5rem;
          margin-top: 2rem;
          margin-bottom: 1rem;
        }

        .subsection-title {
          color: #3498db;
          margin-top: 1.8rem;
          margin-bottom: 1rem;
        }

        .subsubsection-title {
          color: #2ecc71;
          margin-top: 1.5rem;
          margin-bottom: 0.8rem;
        }

        .list-item {
          margin-bottom: 0.5rem;
        }
        
        pre, .code-block {
          background-color: #f8f9fa;
          border: 1px solid #e9ecef;
          border-radius: 4px;
          padding: 1rem;
          overflow-x: auto;
          margin: 1rem 0;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .highlighted-term {
          background-color: #fff3cd;
          border-bottom: 2px dashed #ffc107;
          padding: 0 2px;
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .clickable-concept {
          background-color: #fff3cd;
          border-bottom: 2px dashed #ffc107;
          padding: 0 2px;
          border-radius: 2px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .highlighted-term:hover, .clickable-concept:hover {
          background-color: #ffeaa7;
          transform: scale(1.02);
        }

        .knowledge-base {
          margin-top: 3rem;
          padding-top: 2rem;
          border-top: 1px solid #eee;
        }

        .knowledge-base h2 {
          color: #2c3e50;
          margin-bottom: 1.5rem;
        }

        .knowledge-entries {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 0.8rem;
        }

        .knowledge-entries > div {
          display: block;
          margin-bottom: 0;
        }

        .knowledge-entry {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.9rem;
        }

        .knowledge-entry:hover {
          background: #e9ecef;
          border-color: #adb5bd;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }

        .knowledge-term {
          margin: 0;
          color: #2980b9;
          font-size: 1rem;
        }
      `}</style>
    </div>
  );
};