// Minimal backend API server with file system storage functionality
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

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

// Log service
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

// File system storage endpoints

// Save content to history
app.post('/api/history/save', (req, res) => {
  try {
    const { content, title, type = 'unknown' } = req.body;
    
    if (!content || !title) {
      return res.status(400).json({ error: 'Content and title are required' });
    }

    // Generate a unique filename based on type
    let fileName;
    if (type === 'prompt-record') {
      fileName = `prompt_${Date.now()}_${title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\-_]/g, '_').substring(0, 50)}.json`;
    } else {
      fileName = `${Date.now()}_${title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\-_]/g, '_').substring(0, 50)}.json`;
    }
    
    const filePath = path.join(HISTORY_DIR, fileName);
    
    // Write content to file
    fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    
    logger.info('file-storage', `Content of type ${type} saved to history: ${filePath}`);
    
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

// Get history index
app.get('/api/history/index', (req, res) => {
  try {
    const files = fs.readdirSync(HISTORY_DIR);
    const historyIndex = files
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(HISTORY_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          id: file,
          title: file.replace(/\.json$/, '').split('_').slice(1).join('_'),
          timestamp: stats.birthtime.getTime(),
          filePath: filePath
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
    
    res.json({
      success: true,
      history: historyIndex
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
    historyDir: HISTORY_DIR
  });
});

app.listen(port, () => {
  logger.info('server', `Minimal backend server running on port ${port}`);
  logger.info('server', `History directory: ${HISTORY_DIR}`);
  logger.info('server', 'Endpoints: /api/history/save, /api/history/index, /api/history/load/:filename, /api/history/download/:filename, /health');
});