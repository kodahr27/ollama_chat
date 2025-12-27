import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';
import {
  Bot,
  User,
  Copy,
  Edit2,
  RefreshCw,
  Send,
  StopCircle,
  Trash2,
  Check,
  ChevronDown,
  MessageSquare,
  Zap,
  Clock,
  Keyboard,
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles,
  MoreVertical,
  Wifi,
  WifiOff,
  Cpu,
  Code,
  X,
  Save,
  FileEdit,
  Info
} from 'lucide-react';

const OLLAMA_API_URL = 'http://localhost:11434/api';

// Model information database
const MODEL_INFO = {
  'llama3.1': { contextWindow: 8192, description: 'Meta Llama 3.1' },
  'llama3.1:latest': { contextWindow: 8192, description: 'Meta Llama 3.1' },
  'llama3.2': { contextWindow: 8192, description: 'Meta Llama 3.2' },
  'llama3.2:latest': { contextWindow: 8192, description: 'Meta Llama 3.2' },
  'mistral': { contextWindow: 8192, description: 'Mistral 7B' },
  'mistral:latest': { contextWindow: 8192, description: 'Mistral 7B' },
  'mixtral': { contextWindow: 32768, description: 'Mixtral 8x7B' },
  'mixtral:latest': { contextWindow: 32768, description: 'Mixtral 8x7B' },
  'codellama': { contextWindow: 16384, description: 'Code Llama' },
  'codellama:latest': { contextWindow: 16384, description: 'Code Llama' },
  'phi': { contextWindow: 2048, description: 'Microsoft Phi-2' },
  'phi:latest': { contextWindow: 2048, description: 'Microsoft Phi-2' },
  'neural-chat': { contextWindow: 4096, description: 'Intel Neural Chat' },
  'neural-chat:latest': { contextWindow: 4096, description: 'Intel Neural Chat' },
  'starling-lm': { contextWindow: 8192, description: 'Starling LM' },
  'starling-lm:latest': { contextWindow: 8192, description: 'Starling LM' },
  'qwen': { contextWindow: 8192, description: 'Qwen 7B' },
  'qwen:latest': { contextWindow: 8192, description: 'Qwen 7B' },
  'gemma': { contextWindow: 8192, description: 'Google Gemma' },
  'gemma:latest': { contextWindow: 8192, description: 'Google Gemma' },
  'llama2': { contextWindow: 4096, description: 'Meta Llama 2' },
  'llama2:latest': { contextWindow: 4096, description: 'Meta Llama 2' },
  'dolphin-llama3': { contextWindow: 8192, description: 'Dolphin Llama 3' },
  'dolphin-mistral': { contextWindow: 8192, description: 'Dolphin Mistral' },
  'orca-mini': { contextWindow: 2048, description: 'Orca Mini' },
  'orca-mini:latest': { contextWindow: 2048, description: 'Orca Mini' },
  'vicuna': { contextWindow: 4096, description: 'Vicuna' },
  'vicuna:latest': { contextWindow: 4096, description: 'Vicuna' },
  'wizardcoder': { contextWindow: 8192, description: 'WizardCoder' },
  'wizardcoder:latest': { contextWindow: 8192, description: 'WizardCoder' },
  'wizardlm': { contextWindow: 8192, description: 'WizardLM' },
  'wizardlm:latest': { contextWindow: 8192, description: 'WizardLM' },
  'openhermes': { contextWindow: 4096, description: 'OpenHermes' },
  'openhermes:latest': { contextWindow: 4096, description: 'OpenHermes' },
  'nous-hermes': { contextWindow: 4096, description: 'Nous Hermes' },
  'nous-hermes:latest': { contextWindow: 4096, description: 'Nous Hermes' },
  'deepseek-coder': { contextWindow: 16384, description: 'DeepSeek Coder' },
  'deepseek-coder:latest': { contextWindow: 16384, description: 'DeepSeek Coder' },
  'solar': { contextWindow: 8192, description: 'Solar' },
  'solar:latest': { contextWindow: 8192, description: 'Solar' }
};

// Custom Dropdown Component
const CustomDropdown = ({ options, value, onChange, disabled, placeholder = "Select..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Prevent body scrolling when dropdown is open on mobile
  useEffect(() => {
    if (isOpen && window.innerWidth <= 768) {
      document.body.classList.add('dropdown-open');
    } else {
      document.body.classList.remove('dropdown-open');
    }
    
    return () => {
      document.body.classList.remove('dropdown-open');
    };
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  // Updated keyboard handler
  const handleKeyDown = (e) => {
    if (isOpen && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    }
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div 
      className={`custom-dropdown ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`} 
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
    >
      <button
        className="dropdown-toggle"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            if (!disabled) setIsOpen(!isOpen);
          }
        }}
        disabled={disabled}
        type="button"
      >
        <div className="dropdown-content">
          <Cpu size={16} />
          <span className="dropdown-selected">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown size={16} className="dropdown-arrow" />
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div className="dropdown-backdrop" onClick={() => setIsOpen(false)} />
          
          <div className="dropdown-menu">
            {options.length === 0 ? (
              <div className="dropdown-no-models">
                <div className="no-models-icon">
                  <AlertCircle size={16} />
                </div>
                <div className="no-models-text">
                  <p>No models available</p>
                  <p className="no-models-hint">Check if Ollama is running</p>
                </div>
              </div>
            ) : (
              options.map((option) => {
                const modelInfo = MODEL_INFO[option.value] || MODEL_INFO[`${option.value}:latest`];
                const contextSize = modelInfo?.contextWindow || '?';
                
                return (
                  <button
                    key={option.value}
                    className={`dropdown-item ${value === option.value ? 'selected' : ''}`}
                    onClick={() => handleSelect(option.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSelect(option.value);
                      }
                    }}
                    type="button"
                  >
                    <div className="dropdown-item-content">
                      <Code size={14} />
                      <div className="dropdown-item-info">
                        <span className="dropdown-item-label">{option.label}</span>
                        {modelInfo && (
                          <span className="dropdown-item-context">{contextSize} tokens</span>
                        )}
                      </div>
                    </div>
                    {value === option.value && <Check size={14} className="checkmark" />}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Utility functions
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const formatTime = (date) => {
  return new Date(date).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Local storage keys
const STORAGE_KEYS = {
  CONVERSATION: 'ollama_chat_conversation',
  SETTINGS: 'ollama_chat_settings'
};

// Helper to get model info
const getModelInfo = (modelName) => {
  return MODEL_INFO[modelName] || MODEL_INFO[`${modelName}:latest`] || { 
    contextWindow: 4096, 
    description: modelName 
  };
};

function App() {
  // State
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CONVERSATION);
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved).model || 'llama3.1:latest' : 'llama3.1:latest';
  });
  const [availableModels, setAvailableModels] = useState([]);
  const [ollamaStatus, setOllamaStatus] = useState('checking');
  const [sessionId] = useState(generateSessionId());
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [modelsError, setModelsError] = useState(null);
  
  // Add initialization state
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Inline editing state
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  
  // Refs
  const messagesEndRef = useRef(null);
  const streamBuffer = useRef('');
  const textareaRef = useRef(null);
  const editTextareaRef = useRef(null);
  const isRespondingToEdit = useRef(false);
  const lastProcessedEdit = useRef(null);
  const desktopDropdownRef = useRef(null);
  const mobileDropdownRef = useRef(null);

  // Convert availableModels to dropdown format
  const modelOptions = availableModels.map(model => ({
    value: model,
    label: model
  }));

  // Save messages to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONVERSATION, JSON.stringify(messages));
  }, [messages]);

  // Save settings to localStorage
  useEffect(() => {
    const settings = { 
      model: selectedModel,
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [selectedModel]);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Focus input on load
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Scroll effect
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus edit textarea when editing starts
  useEffect(() => {
    if (editingMessageId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.setSelectionRange(
        editingText.length,
        editingText.length
      );
    }
  }, [editingMessageId, editingText]);

  // Update textarea container data attribute when input changes
  useEffect(() => {
    if (textareaRef.current) {
      const container = textareaRef.current.parentElement;
      container.setAttribute('data-replicated-value', input);
    }
  }, [input]);

  // Model change handler
  const handleModelChange = useCallback(async (newModel) => {
    // If we're changing models mid-conversation, show a confirmation with more info
    if (messages.length > 0 && selectedModel !== newModel && !isLoading && !isStreaming) {
      const modelInfo = getModelInfo(newModel);
      const currentModelInfo = getModelInfo(selectedModel);
      
      let warningMessage = `Changing model from ${selectedModel} to ${newModel}\n\n`;
      
      if (modelInfo && currentModelInfo) {
        if (modelInfo.contextWindow < currentModelInfo.contextWindow) {
          warningMessage += `⚠️ ${newModel} has a smaller context window ` +
                           `(${modelInfo.contextWindow} vs ${currentModelInfo.contextWindow} tokens).\n` +
                           `Some earlier messages may be truncated.\n\n`;
        } else if (modelInfo.contextWindow > currentModelInfo.contextWindow) {
          warningMessage += `✅ ${newModel} has a larger context window ` +
                           `(${modelInfo.contextWindow} vs ${currentModelInfo.contextWindow} tokens).\n` +
                           `More conversation history will be preserved.\n\n`;
        }
      }
      
      warningMessage += `The new model will see the full conversation history.\nContinue?`;
      
      const shouldChange = window.confirm(warningMessage);
      
      if (!shouldChange) {
        return;
      }
    }
    
    // Update the model
    setSelectedModel(newModel);
    
    // Stop any ongoing generation
    if (isStreaming && abortController) {
      abortController.abort();
      setIsLoading(false);
      setIsStreaming(false);
      setAbortController(null);
    }
    
    // Cancel any editing
    if (editingMessageId) {
      cancelEditing();
    }
    
    // Add a system message about the model change
    if (messages.length > 0 && selectedModel !== newModel) {
      const systemMessage = {
        id: Date.now(),
        sender: 'system',
        text: `Model changed from ${selectedModel} to ${newModel}`,
        timestamp: new Date(),
        isPartial: false,
        isSystem: true
      };
      
      setMessages(prev => [...prev, systemMessage]);
    }
    
    // Refresh models list
    await fetchAvailableModels();
  }, [messages, selectedModel, isLoading, isStreaming, abortController, editingMessageId]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Always allow browser shortcuts
      const isBrowserShortcut = 
        (e.key === 'r' && (e.ctrlKey || e.metaKey) && !e.shiftKey) ||
        (e.key === 'r' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        (e.key === 'F5') ||
        (e.key === 't' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'w' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'Tab' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'n' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'l' && (e.ctrlKey || e.metaKey)) ||
        (e.key === 'i' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        (e.key === 'j' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
        (e.key === 'c' && (e.ctrlKey || e.metaKey) && e.shiftKey);

      if (isBrowserShortcut) return;

      // Check if user is in a form element
      const activeElement = document.activeElement;
      const isInFormElement = 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.isContentEditable;

      if (isInFormElement) {
        if (e.ctrlKey || e.metaKey) {
          switch (true) {
            case e.key === '/' && (e.ctrlKey || e.metaKey):
              e.preventDefault();
              e.stopPropagation();
              clearConversation();
              break;
              
            case e.key === 'r' && (e.ctrlKey || e.metaKey) && !isLoading && messages.length > 0:
              e.preventDefault();
              e.stopPropagation();
              regenerateLastMessage();
              break;
              
            case e.key === 'k' && (e.ctrlKey || e.metaKey):
              e.preventDefault();
              e.stopPropagation();
              setInput('');
              activeElement.focus?.();
              break;
          }
        }
        return;
      }

      // Global shortcuts (when NOT in form elements)
      switch (true) {
        case e.key === '/' && (e.ctrlKey || e.metaKey):
          e.preventDefault();
          clearConversation();
          break;
          
        case e.key === 'Escape' && isLoading:
          e.preventDefault();
          stopGeneration();
          break;
          
        case e.key === 'Enter' && !isLoading && !editingMessageId:
          e.preventDefault();
          textareaRef.current?.focus();
          break;
          
        case e.key === 'r' && (e.ctrlKey || e.metaKey) && !isLoading && messages.length > 0:
          e.preventDefault();
          regenerateLastMessage();
          break;
          
        case e.key === 'k' && (e.ctrlKey || e.metaKey):
          e.preventDefault();
          setInput('');
          textareaRef.current?.focus();
          break;
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
    };
  }, [isLoading, messages, editingMessageId]);

  // Check Ollama health and fetch models
  useEffect(() => {
    const initializeApp = async () => {
      const isHealthy = await checkOllamaHealth();
      if (isHealthy) {
        await fetchAvailableModels();
      }
      setIsInitialized(true);
    };
    
    initializeApp();
    
    const interval = setInterval(() => {
      if (isInitialized && !isStreaming && !isLoading) {
        checkOllamaHealth();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkOllamaHealth = async () => {
    if (isStreaming || isLoading) {
      return false;
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${OLLAMA_API_URL}/tags`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setOllamaStatus('connected');
        return true;
      } else {
        setOllamaStatus('error');
        setModelsError('Failed to fetch models from Ollama');
        return false;
      }
    } catch (error) {
      if (!isStreaming && !isLoading) {
        setOllamaStatus('error');
        setModelsError('Cannot connect to Ollama. Make sure it is running on http://localhost:11434');
        console.error('Ollama health check failed:', error);
      }
      return false;
    }
  };

  const fetchAvailableModels = async () => {
    try {
      console.log('Fetching models from Ollama...');
      const response = await fetch(`${OLLAMA_API_URL}/tags`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }
      
      const data = await response.json();
      console.log('Ollama models response:', data);
      
      if (data.models && data.models.length > 0) {
        const modelNames = data.models.map(m => m.name);
        console.log('Available models:', modelNames);
        setAvailableModels(modelNames);
        setModelsError(null);
        
        // If selected model is not available, switch to first available
        if (!modelNames.includes(selectedModel) && modelNames.length > 0) {
          console.log(`Selected model ${selectedModel} not available, switching to ${modelNames[0]}`);
          setSelectedModel(modelNames[0]);
        }
      } else {
        setAvailableModels([]);
        setModelsError('No models found in Ollama. Pull a model first using "ollama pull <model-name>"');
      }
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
      setAvailableModels([]);
      setModelsError(`Failed to fetch models: ${error.message}`);
    }
  };

  const clearConversation = () => {
    if (window.confirm('Are you sure you want to clear the conversation?')) {
      setMessages([]);
      streamBuffer.current = '';
      cancelEditing();
      isRespondingToEdit.current = false;
      lastProcessedEdit.current = null;
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
      setIsStreaming(false);
      isRespondingToEdit.current = false;
      
      if (isStreaming && streamBuffer.current) {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          
          if (lastMessage.sender === 'bot' && lastMessage.isPartial) {
            lastMessage.text = streamBuffer.current + '\n\n[Generation stopped]';
            lastMessage.isPartial = false;
          }
          
          return newMessages;
        });
      }
      
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  // Inline editing functions
  const startEditing = (messageId, currentText) => {
    setEditingMessageId(messageId);
    setEditingText(currentText);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const saveEditedMessage = async (messageId) => {
    if (!editingText.trim() || isLoading || isRespondingToEdit.current) {
      cancelEditing();
      return;
    }

    const editKey = `${messageId}-${editingText}`;
    if (lastProcessedEdit.current === editKey) {
      cancelEditing();
      return;
    }

    lastProcessedEdit.current = editKey;
    isRespondingToEdit.current = true;

    const editedMessageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (editedMessageIndex === -1) {
      isRespondingToEdit.current = false;
      cancelEditing();
      return;
    }

    const editedMessage = messages[editedMessageIndex];
    
    setMessages(prev => {
      const newMessages = prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text: editingText, timestamp: new Date() }
          : msg
      );
      
      return newMessages;
    });

    cancelEditing();

    if (editedMessage.sender === 'user') {
      if (editedMessageIndex === messages.length - 1) {
        setTimeout(async () => {
          if (messages[editedMessageIndex + 1]?.sender === 'bot') {
            setMessages(prev => prev.slice(0, editedMessageIndex + 1));
          }
          
          setTimeout(async () => {
            await sendStreamingResponseForEdit(editingText, true);
            isRespondingToEdit.current = false;
          }, 150);
        }, 50);
      } else {
        setTimeout(() => {
          setMessages(prev => prev.slice(0, editedMessageIndex + 1));
          
          setTimeout(async () => {
            await sendStreamingResponseForEdit(editingText, true);
            isRespondingToEdit.current = false;
          }, 150);
        }, 50);
      }
    } else {
      isRespondingToEdit.current = false;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || isRespondingToEdit.current) return;

    // Check if we have a valid model selected
    if (!selectedModel || availableModels.length === 0) {
      alert('No model selected or available. Please check if Ollama is running and has models.');
      return;
    }

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: input,
      timestamp: new Date(),
      isPartial: false
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    textareaRef.current?.focus();

    await sendStreamingResponse(input, false);
  };

  // Prepare chat messages with context window awareness
  const prepareChatMessages = useCallback((messagesArray, targetModel) => {
    const modelInfo = getModelInfo(targetModel);
    const maxTokens = modelInfo.contextWindow || 4096;
    
    // Convert messages to chat format
    const chatMessages = [];
    const allMessages = [...messagesArray].filter(msg => !msg.isPartial && !msg.isSystem);
    
    // Rough token estimation function
    const estimateTokens = (text) => {
      // Very rough estimation: 4 chars ≈ 1 token, plus some for metadata
      return Math.ceil(text.length / 4) + 20;
    };
    
    // Add messages from newest to oldest until we reach context limit
    let estimatedTokens = 0;
    
    for (let i = allMessages.length - 1; i >= 0; i--) {
      const msg = allMessages[i];
      if (msg.sender === 'user' || msg.sender === 'bot') {
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        const content = msg.text;
        
        const messageTokens = estimateTokens(content);
        
        // Reserve 20% of context for response
        if (estimatedTokens + messageTokens > maxTokens * 0.8) {
          console.log(`Context window limit reached after ${estimatedTokens} tokens for ${targetModel}`);
          break;
        }
        
        chatMessages.unshift({ role, content });
        estimatedTokens += messageTokens;
      }
    }
    
    console.log(`Prepared ${chatMessages.length} messages for ${targetModel}, estimated ${estimatedTokens}/${maxTokens} tokens`);
    return chatMessages;
  }, []);

  const sendStreamingResponse = async (userInput, isEdit = false) => {
    if (!isInitialized || (isLoading && !isEdit)) return;
    
    // Double-check we have the selected model available
    const currentModel = selectedModel;
    if (!currentModel || availableModels.length === 0 || !availableModels.includes(currentModel)) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'bot',
        text: `Error: Model "${currentModel}" is not available. Please select a different model from the dropdown.`,
        timestamp: new Date(),
        isPartial: false,
        isError: true
      }]);
      setIsLoading(false);
      return;
    }
    
    setIsStreaming(true);
    setIsLoading(true);
    streamBuffer.current = '';
    
    // Clear any partial messages
    setMessages(prev => {
      const newMessages = [...prev];
      return newMessages.filter(msg => !(msg.sender === 'bot' && msg.isPartial));
    });

    const botMessageId = Date.now() + 1;
    setMessages(prev => [...prev, {
      id: botMessageId,
      sender: 'bot',
      text: '',
      timestamp: new Date(),
      isPartial: true,
      model: currentModel // Store which model is generating this
    }]);

    try {
      const controller = new AbortController();
      setAbortController(controller);

      const currentMessages = messages.filter(msg => !msg.isPartial);
      
      // Use the context-aware message preparation
      const chatMessages = prepareChatMessages(currentMessages, currentModel);
      
      // Add the new user message
      chatMessages.push({
        role: 'user',
        content: userInput
      });

      console.log('Sending to Ollama API with model:', currentModel, {
        messageCount: chatMessages.length,
        isEdit: isEdit,
        contextWindow: getModelInfo(currentModel).contextWindow
      });

      // Make sure we use the current selected model
      const response = await fetch(`${OLLAMA_API_URL}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          model: currentModel, // Use the current model
          messages: chatMessages,
          stream: true,
          options: {
            temperature: 0.7,
          }
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            
            if (parsed.message?.content) {
              streamBuffer.current += parsed.message.content;
              
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                
                if (lastMessage.sender === 'bot' && lastMessage.isPartial) {
                  lastMessage.text = streamBuffer.current;
                  lastMessage.model = currentModel; // Update model info
                }
                
                return newMessages;
              });
            }
            
            if (parsed.done === true) {
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                
                if (lastMessage.sender === 'bot') {
                  lastMessage.isPartial = false;
                  lastMessage.timestamp = new Date();
                  lastMessage.model = currentModel;
                }
                
                return newMessages;
              });
            }
            
          } catch (e) {
            console.error('Error parsing stream data:', e);
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Stream aborted by user');
      } else {
        console.error('Stream error:', error);
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          
          if (lastMessage.sender === 'bot' && lastMessage.isPartial) {
            lastMessage.text = (streamBuffer.current || '') + `\n\n[Error: ${error.message || 'Failed to connect to Ollama'}]`;
            lastMessage.isPartial = false;
            lastMessage.isError = true;
            lastMessage.model = currentModel;
          }
          
          return newMessages;
        });
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setAbortController(null);
      streamBuffer.current = '';
      if (isEdit) {
        isRespondingToEdit.current = false;
      }
      
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  const sendStreamingResponseForEdit = async (userInput, isEdit = true) => {
    await sendStreamingResponse(userInput, isEdit);
  };

  const regenerateLastMessage = () => {
    if (!isInitialized || messages.length === 0 || isLoading || isRespondingToEdit.current) return;
    
    const lastUserMessageIndex = messages.map((msg, idx) => 
      msg.sender === 'user' ? idx : -1
    ).filter(idx => idx !== -1).pop();
    
    if (lastUserMessageIndex !== undefined) {
      const lastUserMessage = messages[lastUserMessageIndex];
      const nextMessage = messages[lastUserMessageIndex + 1];
      if (nextMessage && nextMessage.sender === 'bot') {
        setMessages(prev => prev.slice(0, lastUserMessageIndex + 1));
      }
      
      setTimeout(async () => {
        await sendStreamingResponse(lastUserMessage.text, false);
      }, 100);
    }
  };

  const handleTextareaKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation();
      sendMessage();
    }
  };

  const handleEditTextareaKeyDown = (e, messageId) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEditedMessage(messageId);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleEditTextChange = (e) => {
    setEditingText(e.target.value);
  };

  const copyMessage = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('Message copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  return (
    <div className="App">
      {/* Header */}
      <div className="app-header">
        <div className="header-left">
          <div className="app-title">
            <Sparkles size={24} className="title-icon" />
            <h1>Ollama Hub</h1>
          </div>
          <div className={`server-status ${ollamaStatus}`}>
            <span className="status-dot"></span>
            {ollamaStatus === 'connected' ? (
              <>
                <Wifi size={14} />
                <span>Connected</span>
              </>
            ) : ollamaStatus === 'checking' ? (
              <>
                <Loader2 size={14} className="spin" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <WifiOff size={14} />
                <span>Disconnected</span>
              </>
            )}
          </div>
        </div>
        
        <div className="header-right">
          {/* Desktop Model Dropdown */}
          <div className="custom-dropdown-wrapper desktop-only" ref={desktopDropdownRef}>
            <CustomDropdown
              options={modelOptions}
              value={selectedModel}
              onChange={handleModelChange}
              disabled={isLoading || ollamaStatus === 'error' || editingMessageId || isRespondingToEdit.current}
              placeholder="Select model..."
            />
          </div>
          
          <button 
            onClick={clearConversation}
            className="icon-btn clear-btn"
            title="Clear conversation (Ctrl+/)"
            disabled={messages.length === 0 || isLoading || editingMessageId || isRespondingToEdit.current}
          >
            <Trash2 size={18} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Chat Window with Mobile Dropdown Container */}
      <div className="chat-window-container">
        <div className="chat-window">
          {messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <MessageSquare size={64} />
              </div>
              <h2>Start a conversation</h2>
              <p className="empty-subtitle">Send a message to begin chatting with {selectedModel}</p>
              
              {/* Show connection status */}
              {ollamaStatus === 'error' && (
                <div className="connection-error">
                  <AlertCircle size={24} />
                  <p>Cannot connect to Ollama</p>
                  <p className="error-hint">Make sure Ollama is running on http://localhost:11434</p>
                </div>
              )}
              
              {availableModels.length === 0 && ollamaStatus === 'connected' && (
                <div className="models-warning">
                  <AlertCircle size={24} />
                  <p>No models available</p>
                  <p className="warning-hint">Pull a model using: ollama pull &lt;model-name&gt;</p>
                </div>
              )}
              
              <div className="hints">
                <div className="hint-item">
                  <Keyboard size={16} />
                  <span><kbd>Enter</kbd> to send message</span>
                </div>
                <div className="hint-item">
                  <Keyboard size={16} />
                  <span><kbd>Shift</kbd> + <kbd>Enter</kbd> for new line</span>
                </div>
                <div className="hint-item">
                  <Keyboard size={16} />
                  <span><kbd>Ctrl</kbd> + <kbd>/</kbd> to clear conversation</span>
                </div>
                <div className="hint-item">
                  <Keyboard size={16} />
                  <span><kbd>Esc</kbd> to stop generation</span>
                </div>
                <div className="hint-item">
                  <Keyboard size={16} />
                  <span><kbd>Ctrl</kbd> + <kbd>R</kbd> to regenerate</span>
                </div>
                <div className="hint-item">
                  <Keyboard size={16} />
                  <span><kbd>Ctrl</kbd> + <kbd>K</kbd> to clear input</span>
                </div>
                <div className="hint-item">
                  <Info size={16} />
                  <span>Switch models anytime - conversation history preserved</span>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div 
                key={msg.id || index} 
                className={`message-container ${msg.sender} ${msg.isSystem ? 'system' : ''} ${editingMessageId === msg.id ? 'editing' : ''}`}
              >
                {msg.isSystem ? (
                  <div className="system-message">
                    <div className="system-icon">
                      <Info size={14} />
                    </div>
                    <span className="system-text">{msg.text}</span>
                    <span className="system-timestamp">
                      <Clock size={10} />
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="sender-badge-container">
                      <div className="sender-badge-outside">
                        <div className="sender-icon">
                          {msg.sender === 'user' ? <User size={18} /> : <Bot size={18} />}
                        </div>
                      </div>
                      <span className="badge-timestamp">
                        <Clock size={10} />
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>

                    <div className="message-bubble">
                      <div 
                        className={`message ${msg.sender} ${msg.isPartial ? 'partial' : ''} ${msg.isError ? 'error' : ''}`}
                      >
                        {msg.model && msg.sender === 'bot' && (
                          <div className="model-badge-inside">
                            <Cpu size={12} />
                            <span>{msg.model}</span>
                          </div>
                        )}
                        
                        <div className="message-content">
                          {editingMessageId === msg.id ? (
                            <div className="edit-container">
                              <div className="edit-textarea-container" data-replicated-value={editingText}>
                                <textarea
                                  ref={editTextareaRef}
                                  value={editingText}
                                  onChange={handleEditTextChange}
                                  onKeyDown={(e) => handleEditTextareaKeyDown(e, msg.id)}
                                  className="edit-textarea"
                                  rows="1"
                                />
                              </div>
                              <div className="edit-actions">
                                <button
                                  onClick={() => saveEditedMessage(msg.id)}
                                  className="action-btn save-btn"
                                  title="Save changes (Enter)"
                                  disabled={isLoading || isRespondingToEdit.current}
                                >
                                  <Save size={16} />
                                  <span>Save</span>
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  className="action-btn cancel-btn"
                                  title="Cancel (Esc)"
                                >
                                  <X size={16} />
                                  <span>Cancel</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {msg.text || (msg.isPartial && (
                                <div className="typing-indicator">
                                  <div className="typing-dots">
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                  </div>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Action buttons container below bubble */}
                      {editingMessageId !== msg.id && !msg.isSystem && (
                        <div className="message-actions-container">
                          {msg.sender === 'user' && !msg.isPartial && !isLoading && (
                            <button 
                              onClick={() => startEditing(msg.id, msg.text)}
                              className="action-btn edit-btn"
                              title="Edit message"
                              disabled={isLoading || editingMessageId || isRespondingToEdit.current}
                            >
                              <Edit2 size={16} />
                              <span>Edit</span>
                            </button>
                          )}
                          <button 
                            onClick={() => copyMessage(msg.text)}
                            className="action-btn copy-btn"
                            title="Copy message"
                            disabled={isLoading || editingMessageId || isRespondingToEdit.current}
                          >
                            <Copy size={16} />
                            <span>Copy</span>
                          </button>
                          {index === messages.length - 1 && msg.sender === 'bot' && !msg.isPartial && (
                            <button 
                              onClick={regenerateLastMessage}
                              className="action-btn regen-btn"
                              title="Regenerate response (Ctrl+R)"
                              disabled={isLoading || editingMessageId || isRespondingToEdit.current}
                            >
                              <RefreshCw size={16} />
                              <span>Regenerate</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Mobile Model Selector */}
        <div className="mobile-model-selector mobile-only">
          <div className="mobile-dropdown-wrapper" ref={mobileDropdownRef}>
            <CustomDropdown
              options={modelOptions}
              value={selectedModel}
              onChange={handleModelChange}
              disabled={isLoading || ollamaStatus === 'error' || editingMessageId || isRespondingToEdit.current}
              placeholder="Select model..."
            />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="input-area">
        <div className="message-input-container" data-replicated-value={input}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleTextareaKeyDown}
            placeholder={isLoading ? `${selectedModel} is thinking...` : `Message ${selectedModel}...`}
            disabled={isLoading || ollamaStatus === 'error' || editingMessageId || isRespondingToEdit.current || availableModels.length === 0}
            className="message-input"
            rows="1"
          />
        </div>
        
        <div className="input-controls">
          <div className="input-info">
            {isLoading && (
              <div className="streaming-status mobile-hide-text">
                <div className="streaming-dots">
                  <span className="streaming-dot"></span>
                  <span className="streaming-dot"></span>
                  <span className="streaming-dot"></span>
                </div>
                <span className="streaming-text">Streaming with {selectedModel}...</span>
              </div>
            )}
            {editingMessageId && (
              <div className="editing-status mobile-hide-text">
                <FileEdit size={14} />
                <span className="editing-text">Editing message...</span>
              </div>
            )}
            {isRespondingToEdit.current && !editingMessageId && (
              <div className="editing-status mobile-hide-text">
                <RefreshCw size={14} className="spin" />
                <span className="editing-text">Regenerating...</span>
              </div>
            )}
            {availableModels.length === 0 && (
              <div className="no-models-warning mobile-hide-text">
                <AlertCircle size={14} />
                <span className="warning-text">No models</span>
              </div>
            )}
          </div>
          
          <div className="input-buttons">
            {isLoading ? (
              <button 
                onClick={stopGeneration}
                className="stop-btn"
                title="Stop generation (Esc)"
                disabled={editingMessageId || isRespondingToEdit.current}
              >
                <StopCircle size={18} />
                <span className="stop-text">Stop</span>
              </button>
            ) : (
              <button 
                onClick={sendMessage}
                disabled={!input.trim() || ollamaStatus === 'error' || editingMessageId || isRespondingToEdit.current || availableModels.length === 0}
                className="send-btn"
                title="Send message (Enter)"
              >
                <Send size={18} />
                <span className="send-text">Send</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;