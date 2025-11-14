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
  private apiKey: string;  // Following CIOLLM pattern of storing key as instance variable
  private baseUrl: string;

  constructor(config?: LLMConfig) {
    // Follow CIOLLM pattern: try to get API key from environment, throw error if not found
    const dashscopeApiKey = import.meta.env.VITE_DASHSCOPE_API_KEY;
    const idealabApiKey = import.meta.env.VITE_IDEALAB_API_KEY;
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

    // Try each API key in order, following priority: Dashscope > Idealab > OpenAI
    this.apiKey = config?.apiKey || dashscopeApiKey || idealabApiKey || openaiApiKey;

    if (!this.apiKey || this.apiKey === 'your-api-key-here') {
      logger.error('real-llm-service', 'No API key found. Please set VITE_DASHSCOPE_API_KEY, VITE_IDEALAB_API_KEY, or VITE_OPENAI_API_KEY environment variables');
      this.apiKey = 'your-api-key-here'; // fallback to prevent crashes
    }

    // Determine base URL based on API key used, similar to CIOLLM
    if (config?.baseUrl) {
      this.baseUrl = config.baseUrl;
    } else if (dashscopeApiKey && this.apiKey === dashscopeApiKey) {
      this.baseUrl = import.meta.env.VITE_DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    } else if (idealabApiKey && this.apiKey === idealabApiKey) {
      this.baseUrl = import.meta.env.VITE_IDEALAB_BASE_URL || 'https://idealab.alibaba-inc.com/api/openai/v1';
    } else if (openaiApiKey && this.apiKey === openaiApiKey) {
      this.baseUrl = import.meta.env.VITE_OPENAI_BASE_URL || 'https://api.openai.com/v1';
    } else {
      this.baseUrl = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    }

    // Set config using CIOLLM patterns
    this.config = {
      apiKey: this.apiKey,
      model: config?.model || import.meta.env.VITE_DEFAULT_MODEL || 'qwen-max-latest',
      temperature: config?.temperature || 0.7,
      maxTokens: config?.maxTokens || 8000, // Set to appropriate value within API limits (max 8192)
      baseUrl: this.baseUrl
    };
  }

  async callLLM(prompt: string, options: LLMCallOptions = {}): Promise<string> {
    // Track the prompt with potential task context
    const taskId = TaskContext.getCurrentTask();
    const promptId = PromptTracker.savePrompt(prompt, {
      model: options.model || this.config.model,
      temperature: options.temperature || this.config.temperature,
      maxTokens: options.maxTokens || this.config.maxTokens,
      taskId
    }, taskId);

    // Log the prompt call
    logger.info('real-llm-service', `Calling real LLM with prompt`, {
      promptId,
      model: options.model || this.config.model,
      taskId
    });

    // Send real-time log indicating start of LLM call
    const logEntry = {
      id: promptId,
      timestamp: Date.now(),
      level: 'info' as const,
      module: 'real-llm-service',
      message: 'Starting LLM call',
      details: {
        promptId,
        model: options.model || this.config.model,
        taskId,
        promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
      }
    };

    // Broadcast real-time log
    realTimeLogger.logRealTime(logEntry);

    // Retry mechanism for rate limit errors (HTTP 429)
    const maxRetries = 3;
    let attempts = 0;
    
    while (attempts <= maxRetries) {
      try {
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
                  model: options.model || this.config.model,
                  temperature: options.temperature || this.config.temperature,
                  max_tokens: options.maxTokens || this.config.maxTokens,
                  ...options
                }
              })
            });

            if (!backendResponse.ok) {
              // Check if it's a rate limit error
              if (backendResponse.status === 429 || 
                  (await backendResponse.text()).includes('limit_requests')) {
                attempts++;
                if (attempts <= maxRetries) {
                  const delay = Math.pow(2, attempts) * 1000; // Exponential backoff: 2s, 4s, 8s
                  logger.warning('real-llm-service', `Rate limit exceeded (attempt ${attempts}), retrying in ${delay}ms`, {
                    promptId,
                    taskId,
                    attempts
                  });
                  await new Promise(resolve => setTimeout(resolve, delay));
                  continue; // Retry
                } else {
                  throw new Error(`Rate limit exceeded after ${maxRetries} retries: ${backendResponse.status} ${backendResponse.statusText}`);
                }
              }
              throw new Error(`Backend service error: ${backendResponse.status} ${backendResponse.statusText}`);
            }

            responseData = await backendResponse.json();
            if (!responseData.success) {
              // Check if it's a rate limit error in the response body
              if (responseData.error && responseData.error.code === 'limit_requests') {
                attempts++;
                if (attempts <= maxRetries) {
                  const delay = Math.pow(2, attempts) * 1000; // Exponential backoff: 2s, 4s, 8s
                  logger.warning('real-llm-service', `Rate limit exceeded from backend (attempt ${attempts}), retrying in ${delay}ms`, {
                    promptId,
                    taskId,
                    attempts
                  });
                  await new Promise(resolve => setTimeout(resolve, delay));
                  continue; // Retry
                } else {
                  throw new Error(`Rate limit exceeded after ${maxRetries} retries: ${responseData.error.message}`);
                }
              }
              throw new Error(responseData.error || 'Backend service returned error');
            }

            // For backend approach, we already have the content
            const content = responseData.result;

            // Update the prompt record with the response and success status
            PromptTracker.updatePrompt(promptId, {
              response: content,
              model: options.model || this.config.model,
              status: 'success'
            });

            // Send real-time log for response
            realTimeLogger.logRealTime({
              id: `${promptId}-response`,
              timestamp: Date.now(),
              level: 'info' as const,
              module: 'real-llm-service',
              message: 'LLM response received',
              details: {
                promptId,
                model: options.model || this.config.model,
                taskId,
                responsePreview: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
                responseLength: content.length
              }
            });

            logger.info('real-llm-service', `LLM call completed via backend`, { promptId, taskId });
            return content;
          } catch (backendError) {
            // Check if it's a rate limit related error
            const errorMsg = (backendError as Error).message;
            if (errorMsg.includes('limit_requests') || errorMsg.includes('rate limit')) {
              attempts++;
              if (attempts <= maxRetries) {
                const delay = Math.pow(2, attempts) * 1000; // Exponential backoff: 2s, 4s, 8s
                logger.warning('real-llm-service', `Rate limit error from backend (attempt ${attempts}), retrying in ${delay}ms`, {
                  promptId,
                  taskId,
                  attempts,
                  error: errorMsg
                });
                await new Promise(resolve => setTimeout(resolve, delay));
                continue; // Retry
              } else {
                // If retry attempts are exhausted, return a placeholder response
                logger.error('real-llm-service', `Rate limit exceeded after ${maxRetries} retries via backend, skipping this term`, {
                  promptId,
                  taskId,
                  error: errorMsg
                });
                
                // Update the prompt record with the specific error message
                PromptTracker.updatePrompt(promptId, {
                  response: `Rate limit exceeded after ${maxRetries} retries, skipping this term.`,
                  model: options.model || this.config.model,
                  status: 'error'
                });

                // This term will not be shown in the results
                return `Rate limit error occurred, skipping this term.`;
              }
            }
            
            // If backend fails for other reasons, log and continue with direct API call
            logger.warning('real-llm-service', `Backend service unavailable, falling back to direct API call`, {
              error: errorMsg,
              taskId
            });
          }
        }

        // Determine the correct API key and base URL for this specific call
        let apiKey = this.apiKey;
        let baseUrl = this.baseUrl;

        const modelToUse = options.model || this.config.model;
        const temperatureToUse = options.temperature || this.config.temperature;
        const maxTokensToUse = options.maxTokens || this.config.maxTokens;

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
        if (this.apiKey === 'your-api-key-here') {
          const mockResponse = `This is a mock response because no API key is configured.
To get real content, please set your API key using one of these environment variables:
- VITE_DASHSCOPE_API_KEY for Qwen/DashScope
- VITE_IDEALAB_API_KEY for Idealab
- VITE_OPENAI_API_KEY for OpenAI

Your prompt was: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"`;

          // Update the prompt record with the mock response and pending status
          PromptTracker.updatePrompt(promptId, {
            response: mockResponse,
            model: modelToUse,
            status: 'success' // Mark as success since it's a mock response
          });

          // Send real-time log for mock response
          realTimeLogger.logRealTime({
            id: `${promptId}-mock-response`,
            timestamp: Date.now(),
            level: 'info' as const,
            module: 'real-llm-service',
            message: 'Mock LLM response generated (no API key configured)',
            details: {
              promptId,
              model: modelToUse,
              taskId,
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

          logger.info('real-llm-service', `Mock LLM call completed (no API key configured)`, { promptId, taskId });
          return mockResponse;
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
          // Check if this is a timeout, CORS, or other network error
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
            taskId,
            error: errorObj.message,
            baseUrl,
            model: modelToUse,
            errorType: errorObj.name
          });

          // Update the prompt record with the error and status
          PromptTracker.updatePrompt(promptId, {
            response: errorMessage,
            model: modelToUse,
            status: errorObj.name === 'AbortError' ? 'timeout' : 'error'
          });

          // Send real-time log for error
          realTimeLogger.logRealTime({
            id: `${promptId}-error`,
            timestamp: Date.now(),
            level: 'error' as const,
            module: 'real-llm-service',
            message: 'LLM call failed with network error',
            details: {
              promptId,
              model: modelToUse,
              taskId,
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
            taskId,
            status: response.status,
            statusText: response.statusText,
            errorBody,
            model: modelToUse
          });

          // Check for rate limit error specifically
          if (response.status === 429 || errorBody.includes('limit_requests')) {
            attempts++;
            if (attempts <= maxRetries) {
              const delay = Math.pow(2, attempts) * 1000; // Exponential backoff: 2s, 4s, 8s
              logger.warning('real-llm-service', `Rate limit exceeded (attempt ${attempts}), retrying in ${delay}ms`, {
                promptId,
                taskId,
                attempts,
                status: response.status,
                statusText: response.statusText
              });
              await new Promise(resolve => setTimeout(resolve, delay));
              continue; // Retry
            } else {
              // If retry attempts are exhausted, return a placeholder response
              logger.error('real-llm-service', `Rate limit exceeded after ${maxRetries} retries, skipping this term`, {
                promptId,
                taskId,
                status: response.status,
                statusText: response.statusText,
                errorBody
              });
              
              // Update the prompt record with the specific error message
              PromptTracker.updatePrompt(promptId, {
                response: `Rate limit exceeded after ${maxRetries} retries, skipping this term.`,
                model: modelToUse,
                status: 'error'
              });

              // Send real-time log for error
              realTimeLogger.logRealTime({
                id: `${promptId}-error`,
                timestamp: Date.now(),
                level: 'error' as const,
                module: 'real-llm-service',
                message: 'LLM call failed with rate limit error after retries',
                details: {
                  promptId,
                  model: modelToUse,
                  taskId,
                  error: `Rate limit exceeded after ${maxRetries} retries, skipping this term.`
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

              // This term will not be shown in the results
              return `Rate limit error occurred, skipping this term.`;
            }
          }

          const errorMessage = `HTTP error: ${response.status} ${response.statusText}. ${errorBody}`;

          // Update the prompt record with the error and status
          PromptTracker.updatePrompt(promptId, {
            response: errorMessage,
            model: modelToUse,
            status: 'error'
          });

          // Send real-time log for error
          realTimeLogger.logRealTime({
            id: `${promptId}-error`,
            timestamp: Date.now(),
            level: 'error' as const,
            module: 'real-llm-service',
            message: 'LLM call failed with HTTP error',
            details: {
              promptId,
              model: modelToUse,
              taskId,
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

        // Update the prompt record with the response and success status
        PromptTracker.updatePrompt(promptId, {
          response: content,
          model: modelToUse,
          status: 'success'
        });

        // Send real-time log for response
        realTimeLogger.logRealTime({
          id: `${promptId}-response`,
          timestamp: Date.now(),
          level: 'info' as const,
          module: 'real-llm-service',
          message: 'LLM response received',
          details: {
            promptId,
            model: modelToUse,
            taskId,
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

        logger.info('real-llm-service', `LLM call completed`, { promptId, taskId });

        return content;
      } catch (error) {
        logger.error('real-llm-service', `LLM call failed`, {
          promptId,
          taskId,
          error: error instanceof Error ? error.message : String(error)
        });

        // Check if it's a rate limit error that should trigger a retry
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('limit_requests') || errorMsg.includes('rate limit') || errorMsg.includes('429')) {
          attempts++;
          if (attempts <= maxRetries) {
            const delay = Math.pow(2, attempts) * 1000; // Exponential backoff: 2s, 4s, 8s
            logger.warning('real-llm-service', `Rate limit error (attempt ${attempts}), retrying in ${delay}ms`, {
              promptId,
              taskId,
              attempts,
              error: errorMsg
            });
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Retry
          } else {
            // If retry attempts are exhausted, return a placeholder response
            logger.error('real-llm-service', `Rate limit exceeded after ${maxRetries} retries, skipping this term`, {
              promptId,
              taskId,
              error: errorMsg
            });
            
            // Update the prompt record with the specific error message
            PromptTracker.updatePrompt(promptId, {
              response: `Rate limit exceeded after ${maxRetries} retries, skipping this term.`,
              model: options.model || this.config.model,
              status: 'error'
            });

            // Send real-time log for error
            realTimeLogger.logRealTime({
              id: `${promptId}-error`,
              timestamp: Date.now(),
              level: 'error' as const,
              module: 'real-llm-service',
              message: 'LLM call failed with rate limit error after retries',
              details: {
                promptId,
                model: options.model || this.config.model,
                taskId,
                error: `Rate limit exceeded after ${maxRetries} retries, skipping this term.`
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

            // This term will not be shown in the results
            return `Rate limit error occurred, skipping this term.`;
          }
        }

        // For non-rate-limit errors, don't retry
        // Update the prompt record with the error and status
        PromptTracker.updatePrompt(promptId, {
          response: `Error: ${(error as Error).message}`,
          model: options.model || this.config.model,
          status: 'error'
        });

        // Send real-time log for error
        realTimeLogger.logRealTime({
          id: `${promptId}-error`,
          timestamp: Date.now(),
          level: 'error' as const,
          module: 'real-llm-service',
          message: 'LLM call failed with general error',
          details: {
            promptId,
            model: options.model || this.config.model,
            taskId,
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
}