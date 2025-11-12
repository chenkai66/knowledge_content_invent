// Real LLM Service following CIOLLM patterns
import { PromptTracker } from './PromptTracker';
import { HistoryService } from './HistoryService';
import { logger, realTimeLogger } from './Logger';
import { TaskManagerService } from '../services/TaskManagerService';
import { TaskContext } from './TaskContext';

export interface LLMConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  baseUrl?: string;
}

export interface LLMCallOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class RealLLMService {
  private config: LLMConfig;
  private api_key: string;  // Following CIOLLM pattern of storing key as instance variable
  private base_url: string;

  constructor(config?: LLMConfig) {
    // Follow CIOLLM pattern: try to get API key from environment, throw error if not found
    const dashscopeApiKey = import.meta.env.VITE_DASHSCOPE_API_KEY;
    const idealabApiKey = import.meta.env.VITE_IDEALAB_API_KEY;
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    // Try each API key in order, following priority: Dashscope > Idealab > OpenAI
    this.api_key = config?.apiKey || dashscopeApiKey || idealabApiKey || openaiApiKey;
    
    if (!this.api_key) {
      logger.error('real-llm-service', 'No API key found. Please set VITE_DASHSCOPE_API_KEY, VITE_IDEALAB_API_KEY, or VITE_OPENAI_API_KEY environment variables');
      this.api_key = 'your-api-key-here'; // fallback to prevent crashes
    }
    
    // Determine base URL based on API key used, similar to CIOLLM
    if (config?.baseUrl) {
      this.base_url = config.baseUrl;
    } else if (dashscopeApiKey && this.api_key === dashscopeApiKey) {
      this.base_url = import.meta.env.VITE_DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    } else if (idealabApiKey && this.api_key === idealabApiKey) {
      this.base_url = import.meta.env.VITE_IDEALAB_BASE_URL || 'https://idealab.alibaba-inc.com/api/openai/v1';
    } else if (openaiApiKey && this.api_key === openaiApiKey) {
      this.base_url = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';
    } else {
      this.base_url = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    }

    // Set config using CIOLLM patterns
    this.config = {
      apiKey: this.api_key,
      model: config?.model || import.meta.env.VITE_DEFAULT_MODEL || 'qwen-max-latest',
      temperature: config?.temperature || 0.7,
      maxTokens: config?.maxTokens || 8000, // Set to appropriate value within API limits (max 8192)
      baseUrl: this.base_url
    };
  }

  async callLLM(prompt: string, options: LLMCallOptions = {}): Promise<string> {
    // Get the current task context if available
    const currentTaskId = TaskContext.getCurrentTask();
    
    // Track the prompt
    const promptId = PromptTracker.savePrompt(prompt, {
      model: options.model || this.config.model,
      temperature: options.temperature || this.config.temperature,
      maxTokens: options.maxTokens || this.config.maxTokens
    }, currentTaskId); // Pass the current task ID if available

    // Send real-time log
    const logEntry = {
      id: promptId,
      timestamp: Date.now(),
      level: 'info' as const,
      module: 'real-llm-service',
      message: `Starting LLM call`,
      details: {
        promptId,
        model: options.model || this.config.model,
        promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
      }
    };
    
    logger.info('real-llm-service', `Calling real LLM with prompt`, {
      promptId,
      model: options.model || this.config.model
    });
    
    // Broadcast real-time log
    realTimeLogger.logRealTime(logEntry);

    try {
      // Prepare the request to the real LLM API following CIOLLM patterns
      const modelToUse = options.model || this.config.model;
      const temperatureToUse = options.temperature || this.config.temperature;
      const maxTokensToUse = options.maxTokens || this.config.maxTokens;
      
      // Determine the correct API key and base URL for this specific call
      let apiKey = this.api_key;
      let baseUrl = this.base_url;
      
      if (modelToUse.includes('idealab')) {
        const key = import.meta.env.VITE_IDEALAB_API_KEY;
        if (key) {
          apiKey = key;
          baseUrl = import.meta.env.VITE_IDEALAB_BASE_URL || 'https://idealab.alibaba-inc.com/api/openai/v1';
        }
      } else if (modelToUse.includes('openai')) {
        const key = import.meta.env.VITE_OPENAI_API_KEY;
        if (key) {
          apiKey = key;
          baseUrl = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';
        }
      } else if (modelToUse.includes('dashscope') || modelToUse.includes('qwen')) {
        const key = import.meta.env.VITE_DASHSCOPE_API_KEY;
        if (key) {
          apiKey = key;
          baseUrl = import.meta.env.VITE_DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
        }
      }

      // Check if API key is a placeholder (user hasn't configured it yet)
      if (this.api_key === 'your-api-key-here') {
        const mockResponse = `This is a mock response because no API key is configured. 
To get real content, please set your API key using one of these environment variables:
- VITE_DASHSCOPE_API_KEY for Qwen/DashScope
- VITE_IDEALAB_API_KEY for Idealab
- VITE_OPENAI_API_KEY for OpenAI

Your prompt was: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`;
        
        // Update the prompt record with the mock response
        PromptTracker.updatePrompt(promptId, {
          response: mockResponse,
          model: modelToUse
        });
        
        // Send real-time log for mock response
        realTimeLogger.logRealTime({
          id: `${promptId}-response`,
          timestamp: Date.now(),
          level: 'info' as const,
          module: 'real-llm-service',
          message: `Mock LLM response generated (no API key configured)`,
          details: {
            promptId,
            model: modelToUse,
            responsePreview: mockResponse.substring(0, 100) + (mockResponse.length > 100 ? '...' : ''),
            responseLength: mockResponse.length
          }
        });
        
        // Save prompt record to file-based history as well
        try {
          const promptRecord = PromptTracker.getPromptById(promptId);
          if (promptRecord) {
            await HistoryService.savePromptToHistory(promptRecord);
          }
        } catch (error) {
          logger.warning('real-llm-service', 'Failed to save prompt to file-based history', { error });
        }
        
        logger.info('real-llm-service', `Mock LLM call completed (no API key configured)`, { promptId });
        return mockResponse;
      }

      // First, try to use a backend service if available (following CIOLLM server-side pattern)
      // This is the recommended approach to avoid CORS issues
      const useBackend = import.meta.env.VITE_USE_BACKEND_PROXY === 'true';
      
      let response;
      let responseData;
      
      if (useBackend) {
        // Call our backend proxy service
        try {
          const backendResponse = await fetch('/api/llm/generate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: prompt,
              options: {
                model: modelToUse,
                temperature: temperatureToUse,
                max_tokens: maxTokensToUse,
                ...options
              }
            })
          });
          
          if (!backendResponse.ok) {
            throw new Error(`Backend service error: ${backendResponse.status} ${backendResponse.statusText}`);
          }
          
          responseData = await backendResponse.json();
          if (!responseData.success) {
            throw new Error(responseData.error || 'Backend service returned error');
          }
          
          // For backend approach, we already have the content
          const content = responseData.result;
          
          // Update the prompt record with the response
          PromptTracker.updatePrompt(promptId, {
            response: content,
            model: modelToUse
          });
          
          // Send real-time log for response
          realTimeLogger.logRealTime({
            id: `${promptId}-response`,
            timestamp: Date.now(),
            level: 'info' as const,
            module: 'real-llm-service',
            message: `LLM response received`,
            details: {
              promptId,
              model: modelToUse,
              responsePreview: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
              responseLength: content.length
            }
          });
          
          // Save prompt record to file-based history as well
          try {
            const promptRecord = PromptTracker.getPromptById(promptId);
            if (promptRecord) {
              await HistoryService.savePromptToHistory(promptRecord);
            }
          } catch (error) {
            logger.warning('real-llm-service', 'Failed to save prompt to file-based history', { error });
          }
          
          logger.info('real-llm-service', `LLM call completed via backend`, { promptId });
          return content;
        } catch (backendError) {
          // If backend fails, log the error but continue with direct API call
          logger.warning('real-llm-service', `Backend service unavailable, falling back to direct API call`, {
            error: (backendError as Error).message
          });
        }
      }
      
      // Make the direct API call with enhanced error handling
      // This approach may face CORS restrictions in browser environments
      const targetUrl = `${baseUrl}/chat/completions`;
      
      try {
        response = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            // Add this header to help with some proxy configurations
            'User-Agent': 'Knowledge-Content-Invent/1.0'
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: temperatureToUse,
            max_tokens: maxTokensToUse,
            ...options  // Allow additional options to be passed through
          }),
          // Add timeout and other fetch options for better reliability
          signal: AbortSignal.timeout(1200000) // 20 minute timeout (1,200,000 ms) to accommodate complex LLM requests
        });
      } catch (fetchError) {
        // Check if this is a CORS/network error vs. other types of errors
        const errorObj = fetchError as Error;
        let errorMessage = '';
        
        if (errorObj.name === 'AbortError') {
          errorMessage = `Request timeout: The LLM API call took more than 20 minutes. This may indicate network issues or a particularly complex request. The 'qwen-max-latest' model can take extended time for complex content generation.`;
        } else if (errorObj.message.includes('CORS') || errorObj.message.includes('cross-origin')) {
          errorMessage = `CORS error: The browser is blocking the request. This commonly happens when calling LLM APIs directly from a browser. Recommended solutions: 1) Set up a backend proxy service, 2) Use VITE_USE_BACKEND_PROXY=true in your environment to use the backend service, 3) Configure a proxy in your development server.`;
        } else {
          errorMessage = `Network error: ${errorObj.message}. This may be due to CORS restrictions when calling the API directly from the browser, or network connectivity issues. Recommended: Use a backend service to proxy API calls.`;
        }
        
        logger.error('real-llm-service', `Network error during LLM call`, { 
          promptId, 
          error: errorObj.message,
          baseUrl,
          model: modelToUse,
          errorType: errorObj.name
        });
        
        // Update the prompt record with the error
        PromptTracker.updatePrompt(promptId, {
          response: errorMessage,
          model: modelToUse
        });
        
        // Send real-time log for error
        realTimeLogger.logRealTime({
          id: `${promptId}-error`,
          timestamp: Date.now(),
          level: 'error' as const,
          module: 'real-llm-service',
          message: `LLM call failed with network error`,
          details: {
            promptId,
            model: modelToUse,
            error: errorMessage
          }
        });
        
        // Save prompt record to file-based history as well
        try {
          const promptRecord = PromptTracker.getPromptById(promptId);
          if (promptRecord) {
            await HistoryService.savePromptToHistory(promptRecord);
          }
        } catch (error) {
          logger.warning('real-llm-service', 'Failed to save prompt to file-based history', { error });
        }
        
        return errorMessage;
      }

      if (!response.ok) {
        const errorBody = await response.text();
        logger.error('real-llm-service', `HTTP error during LLM call`, { 
          promptId, 
          status: response.status,
          statusText: response.statusText,
          errorBody,
          model: modelToUse
        });
        
        const errorMessage = `HTTP error: ${response.status} ${response.statusText}. ${errorBody}`;
        
        // Update the prompt record with the error
        PromptTracker.updatePrompt(promptId, {
          response: errorMessage,
          model: modelToUse
        });
        
        // Send real-time log for error
        realTimeLogger.logRealTime({
          id: `${promptId}-error`,
          timestamp: Date.now(),
          level: 'error' as const,
          module: 'real-llm-service',
          message: `LLM call failed with HTTP error`,
          details: {
            promptId,
            model: modelToUse,
            error: errorMessage
          }
        });
        
        // Save prompt record to file-based history as well
        try {
          const promptRecord = PromptTracker.getPromptById(promptId);
          if (promptRecord) {
            await HistoryService.savePromptToHistory(promptRecord);
          }
        } catch (error) {
          logger.warning('real-llm-service', 'Failed to save prompt to file-based history', { error });
        }
        
        return errorMessage;
      }

      const data = await response.json();
      
      // Extract the response content similar to CIOLLM
      let content = '';
      if (data.choices && data.choices[0] && data.choices[0].message) {
        content = data.choices[0].message.content;
      } else {
        // Fallback in case the response structure is different
        content = JSON.stringify(data);
      }
      
      // Update the prompt record with the response
      PromptTracker.updatePrompt(promptId, {
        response: content,
        model: modelToUse
      });
      
      // Send real-time log for response
      realTimeLogger.logRealTime({
        id: `${promptId}-response`,
        timestamp: Date.now(),
        level: 'info' as const,
        module: 'real-llm-service',
        message: `LLM response received`,
        details: {
          promptId,
          model: modelToUse,
          responsePreview: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          responseLength: content.length
        }
      });
      
      // Save prompt record to file-based history as well
      try {
        const promptRecord = PromptTracker.getPromptById(promptId);
        if (promptRecord) {
          await HistoryService.savePromptToHistory(promptRecord);
        }
      } catch (error) {
        logger.warning('real-llm-service', 'Failed to save prompt to file-based history', { error });
      }
      
      logger.info('real-llm-service', `LLM call completed`, { promptId });
      
      return content;
    } catch (error) {
      logger.error('real-llm-service', `LLM call failed`, {
        promptId,
        error: error instanceof Error ? error.message : String(error)
      });

      // Update the prompt record with the error
      PromptTracker.updatePrompt(promptId, {
        response: `Error: ${(error as Error).message}`,
        model: options.model || this.config.model
      });

      // Send real-time log for error
      realTimeLogger.logRealTime({
        id: `${promptId}-error`,
        timestamp: Date.now(),
        level: 'error' as const,
        module: 'real-llm-service',
        message: `LLM call failed with general error`,
        details: {
          promptId,
          model: options.model || this.config.model,
          error: (error as Error).message
        }
      });
      
      // Save prompt record to file-based history as well
      try {
        const promptRecord = PromptTracker.getPromptById(promptId);
        if (promptRecord) {
          await HistoryService.savePromptToHistory(promptRecord);
        }
      } catch (error) {
        logger.warning('real-llm-service', 'Failed to save prompt to file-based history', { error });
      }

      // Return an error response instead of throwing
      return `Error occurred while calling the LLM: ${(error as Error).message}`;
    }
  }
}