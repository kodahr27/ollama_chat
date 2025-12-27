import React, { useState, useEffect, useRef } from 'react';
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
  FileEdit
} from 'lucide-react';

const OLLAMA_API_URL = 'http://localhost:11434/api';

// Custom Dropdown Component - UPDATED
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

  // Updated keyboard handler - only handles Escape
  const handleKeyDown = (e) => {
    // Only handle Escape key when dropdown is open
    if (isOpen && e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    }
    // Don't stop propagation for other keys
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
            {options.map((option) => (
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
                  <span className="dropdown-item-label">{option.label}</span>
                </div>
                {value === option.value && <Check size={14} className="checkmark" />}
              </button>
            ))}
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
    return saved ? JSON.parse(saved).model || 'llama3.1' : 'llama3.1';
  });
  const [availableModels, setAvailableModels] = useState(['llama3.1']);
  const [ollamaStatus, setOllamaStatus] = useState('checking');
  const [sessionId] = useState(generateSessionId());
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState(null);
  
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
  const dropdownRef = useRef(null); // Add ref for dropdown

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

  // Global keyboard shortcuts - FIXED VERSION
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

      // Don't interfere with browser shortcuts
      if (isBrowserShortcut) return;

      // Check if user is in a form element
      const activeElement = document.activeElement;
      const isInFormElement = 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.isContentEditable;

      // For form elements, only handle Ctrl+ shortcuts (not single keys)
      if (isInFormElement) {
        // Allow Ctrl+ shortcuts even when typing
        if (e.ctrlKey || e.metaKey) {
          // Handle shortcuts that should work even when typing
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
        
        // Don't handle other keys when in form elements
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
      await checkOllamaHealth();
      await fetchAvailableModels();
      setIsInitialized(true); // Mark as initialized
    };
    
    initializeApp();
    
    // Set up periodic health check (only after initialization)
    const interval = setInterval(() => {
      if (isInitialized && !isStreaming && !isLoading) {
        checkOllamaHealth();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkOllamaHealth = async () => {
    // Skip health check if we're streaming to avoid timeout conflicts
    if (isStreaming || isLoading) {
      return;
    }
    
    try {
      // Create a timeout promise instead of using AbortSignal.timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${OLLAMA_API_URL}/tags`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setOllamaStatus('connected');
      } else {
        setOllamaStatus('error');
      }
    } catch (error) {
      // Don't update status or log errors during streaming
      if (!isStreaming && !isLoading) {
        setOllamaStatus('error');
        console.error('Ollama health check failed:', error);
      }
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const response = await fetch(`${OLLAMA_API_URL}/tags`);
      if (response.ok) {
        const data = await response.json();
        if (data.models && data.models.length > 0) {
          const modelNames = data.models.map(m => m.name);
          setAvailableModels(modelNames);
          
          // If selected model is not available, switch to first available
          if (!modelNames.includes(selectedModel) && modelNames.length > 0) {
            setSelectedModel(modelNames[0]);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
    }
  };

  const clearConversation = () => {
    if (window.confirm('Are you sure you want to clear the conversation?')) {
      setMessages([]);
      streamBuffer.current = '';
      cancelEditing();
      isRespondingToEdit.current = false;
      lastProcessedEdit.current = null;
      // Focus input after clearing
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
      
      // Add interrupted message if we were streaming
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
      
      // Focus input after stopping
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

    // Check if this is the same edit we just processed
    const editKey = `${messageId}-${editingText}`;
    if (lastProcessedEdit.current === editKey) {
      cancelEditing();
      return;
    }

    lastProcessedEdit.current = editKey;
    isRespondingToEdit.current = true;

    // Find the index of the message being edited
    const editedMessageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (editedMessageIndex === -1) {
      isRespondingToEdit.current = false;
      cancelEditing();
      return;
    }

    const editedMessage = messages[editedMessageIndex];
    
    // Update the message with the new text
    setMessages(prev => {
      const newMessages = prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, text: editingText, timestamp: new Date() }
          : msg
      );
      
      return newMessages;
    });

    cancelEditing();

    // Handle regeneration based on message type and position
    if (editedMessage.sender === 'user') {
      if (editedMessageIndex === messages.length - 1) {
        // Last user message - just regenerate the bot's response
        setTimeout(async () => {
          // Remove existing bot response if it exists
          if (messages[editedMessageIndex + 1]?.sender === 'bot') {
            setMessages(prev => prev.slice(0, editedMessageIndex + 1));
          }
          
          // Wait for state update, then regenerate
          setTimeout(async () => {
            await sendStreamingResponseForEdit(editingText, true);
            isRespondingToEdit.current = false;
          }, 150);
        }, 50);
      } else {
        // Not the last message - remove all subsequent messages and regenerate
        setTimeout(() => {
          setMessages(prev => prev.slice(0, editedMessageIndex + 1));
          
          // Wait for state update, then regenerate
          setTimeout(async () => {
            await sendStreamingResponseForEdit(editingText, true);
            isRespondingToEdit.current = false;
          }, 150);
        }, 50);
      }
    } else {
      // Bot message - just save the edit, no regeneration needed
      isRespondingToEdit.current = false;
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || isRespondingToEdit.current) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: input,
      timestamp: new Date(),
      isPartial: false
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Focus textarea
    textareaRef.current?.focus();

    await sendStreamingResponse(input, false);
  };

  const sendStreamingResponse = async (userInput, isEdit = false) => {
    if (!isInitialized || (isLoading && !isEdit)) return;
    
    setIsStreaming(true);
    setIsLoading(true);
    streamBuffer.current = '';
    
    // Remove any existing partial bot messages
    setMessages(prev => {
      const newMessages = [...prev];
      // Remove any partial bot messages
      return newMessages.filter(msg => !(msg.sender === 'bot' && msg.isPartial));
    });

    // Add placeholder bot message
    const botMessageId = Date.now() + 1;
    setMessages(prev => [...prev, {
      id: botMessageId,
      sender: 'bot',
      text: '',
      timestamp: new Date(),
      isPartial: true
    }]);

    try {
      const controller = new AbortController();
      setAbortController(controller);

      // Get the current complete messages (excluding the placeholder we just added)
      const currentMessages = messages.filter(msg => !msg.isPartial);
      
      // Prepare messages array for /chat API
      const chatMessages = [];
      
      // Add conversation history from current messages
      currentMessages.forEach(msg => {
        if (msg.sender === 'user') {
          chatMessages.push({
            role: 'user',
            content: msg.text
          });
        } else if (msg.sender === 'bot') {
          chatMessages.push({
            role: 'assistant',
            content: msg.text
          });
        }
      });
      
      // Add the current user message (the one we're responding to)
      chatMessages.push({
        role: 'user',
        content: userInput
      });

      console.log('Sending to Ollama API:', {
        model: selectedModel,
        messageCount: chatMessages.length,
        lastMessage: chatMessages[chatMessages.length - 1],
        isEdit: isEdit
      });

      const response = await fetch(`${OLLAMA_API_URL}/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          model: selectedModel,
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
            
            // /chat API streams message chunks with 'content' field
            if (parsed.message?.content) {
              streamBuffer.current += parsed.message.content;
              
              // Update the last message with streaming content
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                
                if (lastMessage.sender === 'bot' && lastMessage.isPartial) {
                  lastMessage.text = streamBuffer.current;
                }
                
                return newMessages;
              });
            }
            
            // Check if streaming is done
            if (parsed.done === true) {
              // Mark as complete
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMessage = newMessages[newMessages.length - 1];
                
                if (lastMessage.sender === 'bot') {
                  lastMessage.isPartial = false;
                  lastMessage.timestamp = new Date();
                }
                
                return newMessages;
              });
            }
            
          } catch (e) {
            console.error('Error parsing stream data:', e);
            console.log('Raw line that failed to parse:', line);
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
      
      // Focus input after completion
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  };

  // Separate function for edit responses to prevent duplicate calls
  const sendStreamingResponseForEdit = async (userInput, isEdit = true) => {
    await sendStreamingResponse(userInput, isEdit);
  };

  const regenerateLastMessage = () => {
    // Prevent regeneration during initialization or if not ready
    if (!isInitialized || messages.length === 0 || isLoading || isRespondingToEdit.current) return;
    
    // Find the last user message
    const lastUserMessageIndex = messages.map((msg, idx) => 
      msg.sender === 'user' ? idx : -1
    ).filter(idx => idx !== -1).pop();
    
    if (lastUserMessageIndex !== undefined) {
      const lastUserMessage = messages[lastUserMessageIndex];
      // Remove the bot response if it exists
      const nextMessage = messages[lastUserMessageIndex + 1];
      if (nextMessage && nextMessage.sender === 'bot') {
        setMessages(prev => prev.slice(0, lastUserMessageIndex + 1));
      }
      
      // Wait for state update, then regenerate
      setTimeout(async () => {
        await sendStreamingResponse(lastUserMessage.text, false);
      }, 100);
    }
  };

  // Updated textarea keydown handler
  const handleTextareaKeyDown = (e) => {
    // Only handle Enter in textarea
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      e.stopPropagation(); // Prevent event from bubbling up
      sendMessage();
    }
    // Let all other key combinations pass through
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
      // Optional: Show toast notification
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
          <div className="custom-dropdown-wrapper desktop-only" ref={dropdownRef}>
            <CustomDropdown
              options={modelOptions}
              value={selectedModel}
              onChange={setSelectedModel}
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

      {/* Chat Window */}
      <div className="chat-window">
        {messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <MessageSquare size={64} />
            </div>
            <h2>Start a conversation</h2>
            <p className="empty-subtitle">Send a message to begin chatting with {selectedModel}</p>
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
            </div>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div 
              key={msg.id || index} 
              className={`message-container ${msg.sender} ${editingMessageId === msg.id ? 'editing' : ''}`}
            >
              {/* Sender Badge on the OUTSIDE */}
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

              {/* Message Bubble and Actions */}
              <div className="message-bubble">
                <div 
                  className={`message ${msg.sender} ${msg.isPartial ? 'partial' : ''} ${msg.isError ? 'error' : ''}`}
                >
                  {msg.model && msg.sender === 'bot' && (
                    <div className="model-badge-inside">
                      <Cpu size={12} />
                      <span>{selectedModel}</span>
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
                {editingMessageId !== msg.id && (
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
            </div>
          ))
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="input-area">
        {/* Mobile Model Selector - only visible on mobile */}
        <div className="mobile-model-selector mobile-only">
          <div className="custom-dropdown-wrapper mobile-dropdown-wrapper" ref={dropdownRef}>
            <CustomDropdown
              options={modelOptions}
              value={selectedModel}
              onChange={setSelectedModel}
              disabled={isLoading || ollamaStatus === 'error' || editingMessageId || isRespondingToEdit.current}
              placeholder="Select model..."
            />
          </div>
        </div>
        
        <div className="message-input-container" data-replicated-value={input}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleTextareaKeyDown}
            placeholder={isLoading ? `${selectedModel} is thinking...` : `Message ${selectedModel}...`}
            disabled={isLoading || ollamaStatus === 'error' || editingMessageId || isRespondingToEdit.current}
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
                <span className="streaming-text">Streaming...</span>
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
                disabled={!input.trim() || ollamaStatus === 'error' || editingMessageId || isRespondingToEdit.current}
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