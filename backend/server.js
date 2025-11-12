// Backend API server with file system storage functionality
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(cors());

// Ensure history directory exists
const HISTORY_DIR = path.join(__dirname, 'history');
if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
  console.log(`History directory created at: ${HISTORY_DIR}`);
}

// Environment variables (using same patterns as CIOLLM)
const DASHSCOPE_API_KEY = process.env.DASHSCOPE_API_KEY;
const IDEALAB_API_KEY = process.env.IDEALAB_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Log service following CIOLLM patterns
const logger = {
  info: (module, message, details = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}] [${module}] ${message}`, details);
  },
  error: (module, message, details = {}) => {
    console.error(`[ERROR] [${new Date().toISOString()}] [${module}] ${message}`, details);
  },
  warning: (module, message, details = {}) => {
    console.warn(`[WARNING] [${new Date().toISOString()}] [${module}] ${message}`, details);
  }
};

// LLM Service following CIOLLM patterns
class LLMApiService {
  constructor() {
    // Determine which API key to use (following CIOLLM priority order)
    if (DASHSCOPE_API_KEY) {
      this.apiKey = DASHSCOPE_API_KEY;
      this.baseUrl = process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
      this.provider = 'dashscope';
    } else if (IDEALAB_API_KEY) {
      this.apiKey = IDEALAB_API_KEY;
      this.baseUrl = process.env.IDEALAB_BASE_URL || 'https://idealab.alibaba-inc.com/api/openai/v1';
      this.provider = 'idealab';
    } else if (OPENAI_API_KEY) {
      this.apiKey = OPENAI_API_KEY;
      this.baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
      this.provider = 'openai';
    } else {
      logger.error('llm-service', 'No API key found. Please set DASHSCOPE_API_KEY, IDEALAB_API_KEY, or OPENAI_API_KEY environment variables');
      throw new Error('No API key configured');
    }

    logger.info('llm-service', `Initialized LLM service with ${this.provider} provider`);
  }

  async callLLM(prompt, options = {}) {
    const model = options.model || process.env.DEFAULT_MODEL || 'qwen-max-latest';
    const temperature = options.temperature || 0.7;
    const maxTokens = options.maxTokens || 8000; // Adjusted to work within API limits (max 8192)

    logger.info('llm-service', `Calling LLM with model: ${model}, prompt length: ${prompt.length}`);

    try {
      // For DashScope and similar providers
      if (this.provider === 'dashscope' || this.provider === 'idealab') {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: temperature,
            max_tokens: maxTokens,
            ...options
          }),
          signal: AbortSignal.timeout(1200000) // 20 minute timeout (1,200,000 ms)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}, ${await response.text()}`);
        }

        const data = await response.json();

        let content = '';
        if (data.choices && data.choices[0] && data.choices[0].message) {
          content = data.choices[0].message.content;
        } else {
          content = JSON.stringify(data);
        }

        logger.info('llm-service', `LLM call completed successfully, response length: ${content.length}`);
        return content;
      }

      // For OpenAI
      if (this.provider === 'openai') {
        const configuration = new Configuration({
          apiKey: this.apiKey,
        });

        if (process.env.OPENAI_BASE_URL) {
          configuration.basePath = process.env.OPENAI_BASE_URL;
        }

        const openai = new OpenAIApi(configuration);

        const response = await openai.createChatCompletion({
          model: model,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: temperature,
          max_tokens: maxTokens,
          ...options
        });

        const content = response.data.choices[0].message.content;
        logger.info('llm-service', `LLM call completed successfully, response length: ${content.length}`);
        return content;
      }
    } catch (error) {
      logger.error('llm-service', `LLM call failed`, { error: error.message });
      throw error;
    }
  }
}

// LLM service initialization will be deferred to when it's actually needed
let llmService = null;

// Initialize LLM service only when needed
const getLLMService = () => {
  if (!llmService) {
    try {
      llmService = new LLMApiService();
    } catch (error) {
      logger.error('server', 'Failed to initialize LLM service', { error: error.message });
      throw error;
    }
  }
  return llmService;
};

// API endpoint for LLM calls
app.post('/api/llm/generate', async (req, res) => {
  try {
    const { prompt, options = {} } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const llmService = getLLMService();
    const result = await llmService.callLLM(prompt, options);

    res.json({
      success: true,
      result: result
    });
  } catch (error) {
    logger.error('api', 'LLM generation failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// File system storage endpoints

// Save content to history
app.post('/api/history/save', (req, res) => {
  try {
    const { content, title } = req.body;
    
    if (!content || !title) {
      return res.status(400).json({ error: 'Content and title are required' });
    }

    // Generate a unique filename
    const fileName = `${Date.now()}_${title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\-_]/g, '_').substring(0, 50)}.json`;
    const filePath = path.join(HISTORY_DIR, fileName);
    
    // Write content to file
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    
    logger.info('file-storage', `Content saved to history: ${filePath}`);
    
    res.json({
      success: true,
      fileName: fileName,
      path: filePath
    });
  } catch (error) {
    logger.error('file-storage', 'Failed to save content to history', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get history index organized by sessions
app.get('/api/history/index', (req, res) => {
  try {
    const files = fs.readdirSync(HISTORY_DIR);
    const allFiles = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(HISTORY_DIR, file);
        const stats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        let parsedContent;
        try {
          parsedContent = JSON.parse(content);
        } catch (e) {
          // If parsing fails, use file content as main content
          parsedContent = { title: 'Unknown Content', mainContent: content };
        }
        
        return {
          id: file,
          title: parsedContent.title || file.replace(/\.json$/, '').split('_').slice(1).join('_'),
          timestamp: stats.birthtime.getTime(),
          filePath: filePath,
          type: parsedContent.type || 'generated-content',
          contentPreview: parsedContent.mainContent?.substring(0, 100) || 'No preview'
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first

    // Group files by session (files within 30 minutes of each other)
    const sessions = [];
    const SESSION_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
    
    if (allFiles.length > 0) {
      let currentSession = {
        id: `session-${allFiles[0].timestamp}`,
        title: `会话 ${new Date(allFiles[0].timestamp).toLocaleDateString('zh-CN')} ${new Date(allFiles[0].timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
        startTime: allFiles[0].timestamp,
        endTime: allFiles[0].timestamp,
        tasks: [allFiles[0]]
      };
      
      for (let i = 1; i < allFiles.length; i++) {
        const file = allFiles[i];
        
        // If this file is within the session threshold of the current session, add to it
        if ((currentSession.endTime - file.timestamp) < SESSION_THRESHOLD_MS) {
          currentSession.tasks.push(file);
          // Update session end time to this file's timestamp if it's later
          if (file.timestamp > currentSession.endTime) {
            currentSession.endTime = file.timestamp;
          }
        } else {
          // Finalize the current session and start a new one
          sessions.push(currentSession);
          currentSession = {
            id: `session-${file.timestamp}`,
            title: `会话 ${new Date(file.timestamp).toLocaleDateString('zh-CN')} ${new Date(file.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`,
            startTime: file.timestamp,
            endTime: file.timestamp,
            tasks: [file]
          };
        }
      }
      
      // Add the final session
      if (currentSession) {
        sessions.push(currentSession);
      }
    }

    res.json({
      success: true,
      history: allFiles,  // Send all files for compatibility
      sessions: sessions  // Send organized sessions
    });
  } catch (error) {
    logger.error('file-storage', 'Failed to read history index', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Load content from history
app.get('/api/history/load/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(HISTORY_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    res.json({
      success: true,
      content: JSON.parse(content)
    });
  } catch (error) {
    logger.error('file-storage', 'Failed to load content from history', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Download history file
app.get('/api/history/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(HISTORY_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.download(filePath, filename, (err) => {
      if (err) {
        logger.error('file-storage', 'Failed to download file', { error: err.message });
        res.status(500).json({
          success: false,
          error: err.message
        });
      }
    });
  } catch (error) {
    logger.error('file-storage', 'Failed to download history file', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    provider: llmService?.provider || 'not configured (not initialized yet)',
    historyDir: HISTORY_DIR
  });
});

app.listen(port, () => {
  logger.info('server', `Backend server running on port ${port}`);
  logger.info('server', `History directory: ${HISTORY_DIR}`);
  logger.info('server', 'LLM provider: (initialized on demand)');
  logger.info('server', 'Endpoints: /api/llm/generate, /api/history/save, /api/history/index, /api/history/load/:filename, /api/history/download/:filename, /health');
});