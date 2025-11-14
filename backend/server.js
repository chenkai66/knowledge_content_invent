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
    const { content, title, query } = req.body; // Accept the original query as a parameter
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Use the original query as the directory name if provided, otherwise use the title
    const directoryName = (query || title || 'untitled').replace(/[^a-zA-Z0-9\u4e00-\u9fa5\-_]/g, '_').substring(0, 50);
    const dirPath = path.join(HISTORY_DIR, directoryName);

    // Create directory if it doesn't exist
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Generate a unique filename within the query directory
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.json`;
    const filePath = path.join(dirPath, fileName);
    
    // Write content to file
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    
    logger.info('file-storage', `Content saved to history in query folder: ${directoryName} at ${filePath}`);
    
    res.json({
      success: true,
      fileName: fileName,
      path: filePath,
      queryFolder: directoryName // Return the query folder name for frontend use
    });
  } catch (error) {
    logger.error('file-storage', 'Failed to save content to history', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get history index organized by query folders
app.get('/api/history/index', (req, res) => {
  try {
    const allFiles = [];
    
    // Read all directories and files in the history directory
    const items = fs.readdirSync(HISTORY_DIR);
    
    for (const item of items) {
      const itemPath = path.join(HISTORY_DIR, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        // If it's a directory (organized by query), read the files inside
        const subItems = fs.readdirSync(itemPath);
        for (const subItem of subItems) {
          if (subItem.endsWith('.json')) {
            const filePath = path.join(itemPath, subItem);
            const subStats = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, 'utf8');
            let parsedContent;
            try {
              parsedContent = JSON.parse(content);
            } catch (e) {
              // If parsing fails, use file content as main content
              parsedContent = { title: 'Unknown Content', mainContent: content };
            }
            
            allFiles.push({
              id: subItem,  // Just the filename (not the full path)
              title: parsedContent.title || subItem.replace(/\.json$/, '').split('_').slice(1).join('_'),
              timestamp: subStats.birthtime.getTime(),
              filePath: filePath,  // Full path for internal file operations
              queryFolder: item,   // The topic/query that this content belongs to
              type: parsedContent.type || 'generated-content',
              contentPreview: parsedContent.mainContent?.substring(0, 100) || 'No preview'
            });
          }
        }
      } else if (item.endsWith('.json')) {
        // If it's a direct JSON file (not in a directory), for backward compatibility
        const filePath = path.join(HISTORY_DIR, item);
        const fileStats = fs.statSync(filePath);
        const content = fs.readFileSync(filePath, 'utf8');
        let parsedContent;
        try {
          parsedContent = JSON.parse(content);
        } catch (e) {
          // If parsing fails, use file content as main content
          parsedContent = { title: 'Unknown Content', mainContent: content };
        }
        
        allFiles.push({
          id: item,
          title: parsedContent.title || item.replace(/\.json$/, '').split('_').slice(1).join('_'),
          timestamp: fileStats.birthtime.getTime(),
          filePath: filePath,
          queryFolder: 'unorganized',  // Put in 'unorganized' folder for legacy files
          type: parsedContent.type || 'generated-content',
          contentPreview: parsedContent.mainContent?.substring(0, 100) || 'No preview'
        });
      }
    }
    
    // Sort by timestamp (newest first)
    allFiles.sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      history: allFiles  // Send all organized files
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
app.get('/api/history/load/:id', (req, res) => {
  try {
    const { id } = req.params;  // id is the filename from the index; we need to try different locations
    
    // First, try to find the file in the expected location (by looking through all subdirectories)
    let filePath = null;
    const items = fs.readdirSync(HISTORY_DIR);
    
    for (const item of items) {
      const itemPath = path.join(HISTORY_DIR, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        // If it's a directory, check if the file exists inside
        const subItems = fs.readdirSync(itemPath);
        if (subItems.includes(id)) {
          filePath = path.join(itemPath, id);
          break;
        }
      } else if (item === id) {
        // If it's a direct file (for backward compatibility)
        filePath = itemPath;
        break;
      }
    }
    
    if (!filePath || !fs.existsSync(filePath)) {
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

// Clear all history entries (including organized folders)
app.delete('/api/history/clear', (req, res) => {
  try {
    // Read all items in the history directory
    const items = fs.readdirSync(HISTORY_DIR);
    
    for (const item of items) {
      const itemPath = path.join(HISTORY_DIR, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        // If it's a directory (organized by query), recursively delete its contents
        const subItems = fs.readdirSync(itemPath);
        for (const subItem of subItems) {
          if (subItem.endsWith('.json')) {
            const subFilePath = path.join(itemPath, subItem);
            fs.unlinkSync(subFilePath);  // Remove the file
            logger.info('file-storage', `Deleted history file: ${subFilePath}`);
          }
        }
        // Remove the empty directory
        fs.rmdirSync(itemPath);
        logger.info('file-storage', `Deleted history directory: ${itemPath}`);
      } else if (item.endsWith('.json')) {
        // If it's a direct file, delete it
        fs.unlinkSync(itemPath);  // Remove the file
        logger.info('file-storage', `Deleted history file: ${itemPath}`);
      }
    }
    
    res.json({
      success: true,
      message: `Cleared all history files and directories`
    });
  } catch (error) {
    logger.error('file-storage', 'Failed to clear history', { error: error.message });
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