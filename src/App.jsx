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
  Wifi,
  WifiOff,
  Cpu,
  Code,
  X,
  Save,
  FileEdit,
  Info,
  Download,
  Upload,
  ChevronRight,
  Maximize2,
  Minimize2,
  CheckSquare,
  Square,
  Terminal,
  FileCode,
  Search,
  ChevronUp,
  Brain,
  Zap as Lightning,
  BookOpen,
  Cpu as Processor
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { 
  vscDarkPlus, 
  vs, 
  atomDark, 
  dracula, 
  tomorrow, 
  materialDark 
} from 'react-syntax-highlighter/dist/esm/styles/prism';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const OLLAMA_API_URL = 'http://localhost:11434/api';
const CACHE_TTL = 5 * 60 * 1000;
const STORAGE_KEYS = {
  CONVERSATION: 'ollama_chat_conversation',
  SETTINGS: 'ollama_chat_settings',
  MODEL_CACHE: 'ollama_model_cache'
};

const CODE_THEMES = {
  'vsc-dark-plus': { name: 'VS Code Dark+', style: vscDarkPlus, type: 'dark' },
  'vs': { name: 'Visual Studio', style: vs, type: 'light' },
  'atom-dark': { name: 'Atom Dark', style: atomDark, type: 'dark' },
  'dracula': { name: 'Dracula', style: dracula, type: 'dark' },
  'tomorrow': { name: 'Tomorrow', style: tomorrow, type: 'light' },
  'material-dark': { name: 'Material Dark', style: materialDark, type: 'dark' }
};

// Helper function for formatting
const formatNumber = (num) => {
  if (typeof num !== 'number') return num;
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
};

const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const shouldTreatAsCommand = (text) => {
  if (!text || !text.trim()) return false;
  
  const trimmedText = text.trim();
  
  const shellPatterns = [
    /^[a-z0-9_-]+\s+-[a-zA-Z0-9]/,
    /^[a-z0-9_-]+\s+--[a-z-]+/,
    /^[a-z0-9_-]+\s+\/[^\s]+/,
    /^[a-z0-9_-]+\s+~/,
    /^[a-z0-9_-]+\s+\$[A-Z_]+/,
  ];
  
  const shellCommands = [
    'ls', 'cd', 'pwd', 'rm', 'cp', 'mv', 'mkdir', 'rmdir',
    'cat', 'grep', 'find', 'sed', 'awk', 'chmod', 'chown',
    'ssh', 'scp', 'curl', 'wget', 'git', 'docker', 'npm',
    'pip', 'python', 'node', 'java', 'go', 'rustc', 'cargo',
    'echo', 'export', 'source', 'alias', 'unalias', 'which',
    'whereis', 'locate', 'updatedb', 'tar', 'gzip', 'gunzip',
    'zip', 'unzip', 'ps', 'kill', 'killall', 'top', 'htop',
    'df', 'du', 'free', 'uname', 'whoami', 'id', 'groups',
    'sudo', 'su', 'passwd', 'apt', 'apt-get', 'yum', 'dnf',
    'pacman', 'brew', 'systemctl', 'service', 'journalctl'
  ];
  
  const firstWord = trimmedText.split(/\s+/)[0].toLowerCase();
  
  if (shellCommands.includes(firstWord)) {
    return true;
  }
  
  for (const pattern of shellPatterns) {
    if (pattern.test(trimmedText)) {
      return true;
    }
  }
  
  if (trimmedText.includes(' && ') || trimmedText.includes(' | ') || 
      trimmedText.includes(' > ') || trimmedText.includes(' 2>') ||
      trimmedText.includes(' >> ') || trimmedText.includes(' < ') ||
      trimmedText.startsWith('./') || trimmedText.startsWith('../') ||
      trimmedText.startsWith('~/') || trimmedText.startsWith('$(') ||
      trimmedText.includes('`')) {
    return true;
  }
  
  if (trimmedText.includes('/') && (trimmedText.includes('.') || trimmedText.includes('-'))) {
    const pathParts = trimmedText.split('/');
    if (pathParts.length > 1 && pathParts[pathParts.length - 1].includes('.')) {
      return true;
    }
  }
  
  return false;
};

const detectLanguageFromCode = (code) => {
  if (!code || !code.trim()) return 'text';
  
  const trimmedCode = code.trim();
  const firstLines = code.substring(0, 200).toLowerCase();
  
  if (code.length < 100 && !code.includes('\n') && !code.includes('```')) {
    if (shouldTreatAsCommand(code)) {
      return 'bash';
    }
    
    const wordCount = code.split(/\s+/).length;
    const specialChars = (code.match(/[{}()\[\]=<>;]/g) || []).length;
    
    if (wordCount <= 3 && specialChars === 0 && !code.includes('://')) {
      const isSimpleReference = /^[\w.-]+$/.test(trimmedCode) || 
                               /^[\w.-]+\.[a-z]{2,4}$/i.test(trimmedCode) ||
                               /^[A-Z_][A-Z0-9_]*$/.test(trimmedCode);
      
      if (isSimpleReference) {
        return 'text';
      }
    }
  }
  
  if ((trimmedCode.startsWith('{') && trimmedCode.endsWith('}')) || 
      (trimmedCode.startsWith('[') && trimmedCode.endsWith(']'))) {
    try {
      JSON.parse(code);
      return 'json';
    } catch {
      // Not valid JSON, continue with other checks
    }
  }
  
  const languagePatterns = [
    { lang: 'python', pattern: /^(def\s+\w+\s*\(|import\s+\w+|from\s+\w+|class\s+\w+|print\s*\(|if\s+\w+:|for\s+\w+\s+in|async\s+def|await\s+)/m },
    { lang: 'javascript', pattern: /^(function\s+\w+|const\s+\w+|let\s+\w+|console\.|export\s+|import\s+|=>|async\s+function|await\s+)/m },
    { lang: 'typescript', pattern: /^(interface\s+\w+|type\s+\w+|:\s*(string|number|boolean|any)\s*[=;]|declare\s+)/m },
    { lang: 'java', pattern: /^(public\s+class|private\s+\w+|import\s+java\.|@Override|System\.out\.)/m },
    { lang: 'cpp', pattern: /^(#include\s+<|int\s+main\s*\(|std::|using\s+namespace)/m },
    { lang: 'go', pattern: /^(func\s+\w+\s*\(|package\s+\w+|import\s+\(|var\s+\w+|fmt\.)/m },
    { lang: 'rust', pattern: /^(fn\s+\w+\s*\(|let\s+\w+|impl\s+\w+|match\s+\w+|->|use\s+\w+)/m },
    { lang: 'php', pattern: /^(<\?php|echo\s+|function\s+\w+\(|\$\w+\s*=)/m },
    { lang: 'html', pattern: /^(<!doctype\s+html|<html|<head|<body|<div|<p|<h[1-6]|<script|<style)/m },
    { lang: 'css', pattern: /^(\.\w+\s*\{|\w+\s*\{|\s*[\w-]+\s*:\s*[^;]+;\s*$|@media|@keyframes)/m },
    { lang: 'sql', pattern: /^(select\s+.+\s+from|insert\s+into|update\s+\w+\s+set|create\s+table|alter\s+table|drop\s+table)/m },
    { lang: 'bash', pattern: /^(#!\/bin\/\w+|echo\s+|cd\s+|export\s+|if\s+\[|\w+\(\)|for\s+\w+\s+in|while\s+)/m },
    { lang: 'yaml', pattern: /^(\s*\w+:\s*\S+|^---\s*$|^\.\.\.\s*$)/m },
    { lang: 'markdown', pattern: /^(#{1,6}\s+\w+|^[-*+]\s+\w+|^\d+\.\s+\w+|^>\s+\w+)/m },
  ];
  
  for (const { lang, pattern } of languagePatterns) {
    if (pattern.test(code)) {
      if (lang === 'bash') {
        if (code.includes('```') || code.includes('\n') || 
            code.startsWith('$ ') || code.startsWith('# ') ||
            shouldTreatAsCommand(code)) {
          return 'bash';
        }
      }
      return lang;
    }
  }
  
  const isInlineCodeLike = code.includes('`') && code.length < 100 && !code.includes('```');
  if (isInlineCodeLike) {
    return 'text';
  }
  
  if (code.includes('=') && !code.includes('==') && code.split('\n').length > 1) {
    const lines = code.split('\n');
    const configLines = lines.filter(line => line.includes('=') && !line.trim().startsWith('#')).length;
    if (configLines > lines.length * 0.3) {
      return 'bash';
    }
  }
  
  return 'text';
};

const CodeBlock = React.memo(({ language, code, onCopy, isInline = false }) => {
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wrapLines, setWrapLines] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(() => {
    const saved = localStorage.getItem('code_theme');
    return saved || 'vsc-dark-plus';
  });

  const detectedLanguage = language || detectLanguageFromCode(code);

  const shouldBeInline = !isInline && (
    (detectedLanguage === 'text' && code.length < 80) ||
    (code.split('\n').length === 1 && code.length < 120)
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (onCopy) onCopy();
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const toggleLineNumbers = () => setShowLineNumbers(!showLineNumbers);
  const toggleWrapLines = () => setWrapLines(!wrapLines);

  const lineCount = code.split('\n').length;

  const themeStyle = CODE_THEMES[selectedTheme]?.style || vscDarkPlus;

  if (isInline || shouldBeInline) {
    const isCommand = shouldTreatAsCommand(code);
    const className = `inline-code ${isCommand ? 'command' : ''}`;
    return (
      <code className={className}>
        {code}
      </code>
    );
  }

  return (
    <div className="code-block-wrapper">
      <div className="code-header">
        <div className="code-header-left">
          <div className="language-badge">
            <FileCode size={14} />
            <span className="language-name">{detectedLanguage || 'text'}</span>
            <span className="line-count">{lineCount} line{lineCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="code-header-right">
          <button onClick={handleCopy} className="code-action-btn copy-btn" title="Copy code">
            {copied ? <CheckSquare size={14} /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          {lineCount > 8 && (
            <button onClick={() => setIsExpanded(!isExpanded)} className="code-action-btn expand-btn" title={isExpanded ? 'Collapse' : 'Expand'}>
              {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
          <button onClick={toggleLineNumbers} className="code-action-btn line-numbers-btn" title={showLineNumbers ? 'Hide line numbers' : 'Show line numbers'}>
            {showLineNumbers ? <CheckSquare size={14} /> : <Square size={14} />}
            <span>Lines</span>
          </button>
          <button onClick={toggleWrapLines} className="code-action-btn wrap-btn" title={wrapLines ? 'Disable line wrapping' : 'Enable line wrapping'}>
            {wrapLines ? <CheckSquare size={14} /> : <Square size={14} />}
            <span>Wrap</span>
          </button>
        </div>
      </div>
      <div className={`code-content ${isExpanded ? 'expanded' : ''}`}>
        <SyntaxHighlighter
          language={detectedLanguage}
          style={themeStyle}
          showLineNumbers={showLineNumbers}
          wrapLines={wrapLines}
          lineNumberStyle={{ minWidth: '3em' }}
          customStyle={{ margin: 0, padding: '1rem' }}
          codeTagProps={{ style: { background: 'transparent' } }}
          PreTag="div"
          useInlineStyles={true}
        >
          {code}
        </SyntaxHighlighter>
      </div>
      <div className="code-footer">
        <span className="character-count">{code.length} characters</span>
        <div className="theme-selector">
          <select 
            value={selectedTheme} 
            onChange={(e) => {
              setSelectedTheme(e.target.value);
              localStorage.setItem('code_theme', e.target.value);
            }} 
            className="theme-select"
          >
            {Object.entries(CODE_THEMES).map(([key, theme]) => (
              <option key={key} value={key}>{theme.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
});

const MarkdownComponents = {
  h1: ({node, ...props}) => <h1 {...props} className="markdown-h1" />,
  h2: ({node, ...props}) => <h2 {...props} className="markdown-h2" />,
  h3: ({node, ...props}) => <h3 {...props} className="markdown-h3" />,
  h4: ({node, ...props}) => <h4 {...props} className="markdown-h4" />,
  h5: ({node, ...props}) => <h5 {...props} className="markdown-h5" />,
  h6: ({node, ...props}) => <h6 {...props} className="markdown-h6" />,
  
  p: ({node, children, ...props}) => <p {...props} className="markdown-p">{children}</p>,
  
  ul: ({node, ...props}) => <ul {...props} className="markdown-ul" />,
  
  ol: ({node, ...props}) => <ol {...props} className="markdown-ol" />,
  
  li: ({node, children, ...props}) => <li {...props} className="markdown-li">{children}</li>,
  
  blockquote: (props) => <blockquote {...props} className="markdown-blockquote" />,
  
  code: ({node, inline, className, children, ...props}) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : 'text';
    const codeString = String(children).replace(/\n$/, '');
    
    if (inline) {
      const isCommand = shouldTreatAsCommand(codeString);
      const commandClass = isCommand ? 'command' : '';
      return <code {...props} className={`inline-code ${commandClass}`}>{children}</code>;
    }
    
    const isLikelyCode = detectLanguageFromCode(codeString) !== 'text';
    const isSingleLine = !codeString.includes('\n');
    
    if (!isLikelyCode && (isSingleLine && codeString.length < 80)) {
      const isCommand = shouldTreatAsCommand(codeString);
      const commandClass = isCommand ? 'command' : '';
      return <code {...props} className={`inline-code ${commandClass}`}>{children}</code>;
    }
    
    return (
      <div>
        <CodeBlock
          language={language === 'text' ? detectLanguageFromCode(codeString) : language}
          code={codeString}
          onCopy={() => {}}
        />
      </div>
    );
  },
  
  inlineCode: ({node, children, ...props}) => {
    const codeString = String(children).replace(/\n$/, '');
    const isCommand = shouldTreatAsCommand(codeString);
    const commandClass = isCommand ? 'command' : '';
    return <code {...props} className={`inline-code ${commandClass}`}>{children}</code>;
  },
  
  a: (props) => <a {...props} className="markdown-link" target="_blank" rel="noopener noreferrer" />,
  
  img: (props) => <img {...props} className="markdown-img" />,
  
  table: (props) => (
    <div className="markdown-table-container">
      <table {...props} className="markdown-table" />
    </div>
  ),
  thead: (props) => <thead {...props} className="markdown-thead" />,
  tbody: (props) => <tbody {...props} className="markdown-tbody" />,
  tr: (props) => <tr {...props} className="markdown-tr" />,
  th: ({node, ...props}) => <th {...props} className="markdown-th" />,
  td: ({node, ...props}) => <td {...props} className="markdown-td" />,
  
  hr: (props) => <hr {...props} className="markdown-hr" />,
  
  strong: (props) => <strong {...props} className="markdown-strong" />,
  
  em: (props) => <em {...props} className="markdown-em" />,
  
  del: (props) => <del {...props} className="markdown-del" />,
  
  input: (props) => {
    if (props.type === 'checkbox') {
      return <input {...props} className="markdown-checkbox" />;
    }
    return <input {...props} />;
  },
  
  tasklist: (props) => <ul {...props} className="markdown-tasklist" />,
  
  pre: (props) => {
    const children = React.Children.toArray(props.children);
    const isCodeBlock = children.some(child => 
      React.isValidElement(child) && child.type === 'code'
    );
    
    if (isCodeBlock) {
      return <div {...props} className="markdown-pre" />;
    }
    
    return <pre {...props} className="markdown-pre" />;
  },
};

const MemoizedMessageContent = React.memo(({ text }) => {
  return (
    <div className="message-markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={MarkdownComponents}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}, (prevProps, nextProps) => prevProps.text === nextProps.text);

const formatTime = (date) => new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const globalModelInfoCache = (() => {
  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MODEL_CACHE);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };

  const saveToStorage = (cache) => {
    try {
      localStorage.setItem(STORAGE_KEYS.MODEL_CACHE, JSON.stringify(cache));
    } catch (error) {
      console.warn('Failed to save model cache:', error);
    }
  };

  let cache = loadFromStorage();

  return {
    get: (modelName) => {
      const cached = cache[modelName];
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.data;
      return null;
    },
    set: (modelName, data) => {
      cache[modelName] = { data, timestamp: Date.now() };
      saveToStorage(cache);
    },
    clear: () => {
      cache = {};
      saveToStorage(cache);
    }
  };
})();

const estimateTokens = (text) => {
  if (!text) return 0;
  
  const charCount = text.length;
  const specialChars = (text.match(/[^\w\s]/g) || []).length;
  const whitespace = (text.match(/\s/g) || []).length;
  
  let tokens = Math.ceil(charCount / 4);
  
  if (text.includes('```')) {
    tokens += 20;
  }
  
  const lines = text.split('\n').length;
  tokens += Math.ceil(lines * 0.5);
  
  tokens += Math.ceil(specialChars * 0.3);
  
  return Math.max(tokens, 1);
};

const getModelInfo = async (modelName) => {
  const cached = globalModelInfoCache.get(modelName);
  if (cached) return cached;

  const defaultInfo = {
    contextWindow: 4096,
    description: modelName,
    details: {},
    source: 'default',
    family: '',
    parameterSize: '',
    quantization: '',
    estimatedTokens: (text) => estimateTokens(text)
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${OLLAMA_API_URL}/show`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelName }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      let contextWindow = 4096;
      let description = modelName;
      let foundContext = false;

      if (data.model_info) {
        for (const [key, value] of Object.entries(data.model_info)) {
          if (key.endsWith('.context_length') && typeof value === 'number') {
            contextWindow = value;
            foundContext = true;
            break;
          }
        }
        if (!foundContext && data.model_info.context_length && typeof data.model_info.context_length === 'number') {
          contextWindow = data.model_info.context_length;
          foundContext = true;
        }
      }

      if (!foundContext && data.parameters?.num_ctx && typeof data.parameters.num_ctx === 'number') {
        contextWindow = data.parameters.num_ctx;
        foundContext = true;
      }

      if (!foundContext && data.details?.context_length && typeof data.details.context_length === 'number') {
        contextWindow = data.details.context_length;
        foundContext = true;
      }

      if (!foundContext && data.context_length && typeof data.context_length === 'number') {
        contextWindow = data.context_length;
        foundContext = true;
      }

      if (data.remote_model) description = data.remote_model;
      else if (data.model_info?.general?.basename) description = data.model_info.general.basename;
      else if (data.model) description = data.model;
      else if (data.name) description = data.name;

      let architecture = '';
      if (data.details?.family) architecture = data.details.family;
      else if (data.model_info?.['general.architecture']) architecture = data.model_info['general.architecture'];

      const info = {
        contextWindow: contextWindow,
        description: description,
        architecture: architecture,
        family: data.details?.family || '',
        parameterSize: data.details?.parameter_size || '',
        quantization: data.details?.quantisation_level || '',
        details: data.details || {},
        parameters: data.parameters || {},
        modelInfo: data.model_info || {},
        rawData: data,
        source: foundContext ? 'api' : 'api-no-context',
        estimatedTokens: (text) => estimateTokens(text)
      };

      globalModelInfoCache.set(modelName, info);
      return info;
    } else {
      const errorText = await response.text();
      console.error(`Failed to fetch model info for ${modelName}:`, errorText);
    }
  } catch (error) {
    if (error.name !== 'AbortError') console.error(`Error fetching model info for ${modelName}:`, error);
  }

  globalModelInfoCache.set(modelName, defaultInfo);
  return defaultInfo;
};

const CustomDropdown = ({ options, value, onChange, disabled, placeholder = "Select...", isMobile = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredModel, setHoveredModel] = useState(null);
  const [hoveredModelInfo, setHoveredModelInfo] = useState(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const dropdownRef = useRef(null);
  const isMounted = useRef(true);
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobile, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const fetchModelInfoForTooltip = useCallback(debounce(async (modelName) => {
    if (!modelName || !isMounted.current) return;
    
    setIsLoadingInfo(true);
    try {
      const info = await getModelInfo(modelName);
      if (isMounted.current) {
        setHoveredModelInfo(info);
        setIsLoadingInfo(false);
      }
    } catch (error) {
      console.error('Failed to fetch model info:', error);
      if (isMounted.current) setIsLoadingInfo(false);
    }
  }, 300), []);

  useEffect(() => {
    if (hoveredModel) {
      fetchModelInfoForTooltip(hoveredModel);
    } else {
      setHoveredModelInfo(null);
    }
    
    return () => {
      fetchModelInfoForTooltip.cancel?.();
    };
  }, [hoveredModel, fetchModelInfoForTooltip]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    }
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`custom-dropdown ${isMobile ? 'mobile' : ''} ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`} ref={dropdownRef} onKeyDown={handleKeyDown}>
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
        aria-label={`Select model. Current: ${selectedOption?.label || placeholder}`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`model-dropdown-list-${isMobile ? 'mobile' : 'desktop'}`}
      >
        <div className="dropdown-content">
          <Cpu size={isMobile ? 20 : 16} aria-hidden="true" />
          <span className="dropdown-selected" title={selectedOption?.label}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown size={isMobile ? 20 : 16} className="dropdown-arrow" aria-hidden="true" />
      </button>
      {isOpen && (
        <>
          <div className="dropdown-backdrop" onClick={() => setIsOpen(false)} aria-hidden="true" />
          <div 
            className="dropdown-menu"
            id={`model-dropdown-list-${isMobile ? 'mobile' : 'desktop'}`}
            role="listbox"
            aria-label="Available models"
          >
            {options.length === 0 ? (
              <div className="dropdown-no-models" role="alert">
                <div className="no-models-icon">
                  <AlertCircle size={isMobile ? 20 : 16} aria-hidden="true" />
                </div>
                <div className="no-models-text">
                  <p>No models available</p>
                  <p className="no-models-hint">Check if Ollama is running</p>
                </div>
              </div>
            ) : (
              options.map((option, index) => {
                const isHovered = hoveredModel === option.value;
                const currentModelInfo = isHovered ? hoveredModelInfo : null;
                
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
                    onMouseEnter={() => !isTouchDevice && setHoveredModel(option.value)}
                    onMouseLeave={() => !isTouchDevice && setHoveredModel(null)}
                    onTouchStart={() => isTouchDevice && setHoveredModel(option.value)}
                    onTouchEnd={() => isTouchDevice && setTimeout(() => setHoveredModel(null), 100)}
                    type="button"
                    role="option"
                    aria-selected={value === option.value}
                    aria-label={`Select ${option.label}`}
                  >
                    <div className="dropdown-item-content">
                      <Code size={isMobile ? 18 : 14} aria-hidden="true" />
                      <div className="dropdown-item-info">
                        <span className="dropdown-item-label" title={option.label}>
                          {option.label}
                        </span>
                        <span className="dropdown-item-context">
                          {isLoadingInfo && isHovered ? (
                            <span className="loading-text">Loading model info...</span>
                          ) : currentModelInfo ? (
                            <>
                              {formatNumber(currentModelInfo.contextWindow)} tokens
                            </>
                          ) : (
                            isMobile ? 'Tap to select' : 'Hover for details'
                          )}
                        </span>
                      </div>
                    </div>
                    {value === option.value && <Check size={isMobile ? 18 : 14} className="checkmark" aria-hidden="true" />}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
      {hoveredModel && hoveredModelInfo && !isMobile && (
        <div className="model-tooltip" role="tooltip">
          <div className="model-tooltip-content">
            <h4>{hoveredModelInfo.description}</h4>
            <div className="model-stats">
              <div className="model-stat">
                <span className="stat-label">Context:</span>
                <span className="stat-value">{formatNumber(hoveredModelInfo.contextWindow)} tokens</span>
              </div>
              {hoveredModelInfo.architecture && (
                <div className="model-stat">
                  <span className="stat-label">Architecture:</span>
                  <span className="stat-value">{hoveredModelInfo.architecture}</span>
                </div>
              )}
              {hoveredModelInfo.family && (
                <div className="model-stat">
                  <span className="stat-label">Family:</span>
                  <span className="stat-value">{hoveredModelInfo.family}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MessageComponent = React.memo(({ 
  msg, 
  index, 
  messages, 
  editingMessageId, 
  editingText, 
  editTextareaRef,
  isLoading,
  isRespondingToEdit,
  handleEditTextChange,
  handleEditTextareaKeyDown,
  saveEditedMessage,
  cancelEditing,
  startEditing,
  copyMessage,
  regenerateLastMessage,
  selectedModel,
  isSearchResult,
  isCurrentSearchResult
}) => {
  const messageRef = useRef(null);
  
  useEffect(() => {
    if (isCurrentSearchResult && messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isCurrentSearchResult]);

  return (
    <div 
      className={`message-container ${msg.sender} ${msg.isSystem ? 'system' : ''} ${editingMessageId === msg.id ? 'editing' : ''} ${isSearchResult ? 'search-result' : ''} ${isCurrentSearchResult ? 'current-search-result' : ''}`}
      data-message-id={msg.id}
      ref={messageRef}
    >
      {msg.isSystem ? (
        <div className="system-message">
          <div className="system-icon">
            <Info size={14} aria-hidden="true" />
          </div>
          <span className="system-text">{msg.text}</span>
          <span className="system-timestamp">
            <Clock size={10} aria-hidden="true" />
            {formatTime(msg.timestamp)}
          </span>
        </div>
      ) : (
        <>
          <div className="sender-badge-container">
            <div className="sender-badge-outside">
              <div className="sender-icon">
                {msg.sender === 'user' ? <User size={18} aria-hidden="true" /> : <Bot size={18} aria-hidden="true" />}
              </div>
            </div>
            <span className="badge-timestamp">
              <Clock size={10} aria-hidden="true" />
              {formatTime(msg.timestamp)}
            </span>
          </div>
          <div className="message-bubble">
            <div className={`message ${msg.sender} ${msg.isPartial ? 'partial' : ''} ${msg.isError ? 'error' : ''}`}>
              {msg.model && msg.sender === 'bot' && (
                <div className="model-badge-inside">
                  <Cpu size={12} aria-hidden="true" />
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
                        aria-label="Edit message"
                      />
                    </div>
                    <div className="edit-actions">
                      <button onClick={() => saveEditedMessage(msg.id)} className="action-btn save-btn" title="Save changes (Enter)" disabled={isLoading || isRespondingToEdit.current}>
                        <Save size={16} aria-hidden="true" />
                        <span>Save</span>
                      </button>
                      <button onClick={cancelEditing} className="action-btn cancel-btn" title="Cancel (Esc)">
                        <X size={16} aria-hidden="true" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.isPartial && !msg.text ? (
                      <div className="typing-indicator">
                        <div className="typing-dots">
                          <span className="typing-dot"></span>
                          <span className="typing-dot"></span>
                          <span className="typing-dot"></span>
                        </div>
                      </div>
                    ) : (
                      <MemoizedMessageContent text={msg.text} />
                    )}
                  </>
                )}
              </div>
            </div>
            {editingMessageId !== msg.id && !msg.isSystem && (
              <div className="message-actions-container">
                {msg.sender === 'user' && !msg.isPartial && !isLoading && (
                  <button onClick={() => startEditing(msg.id, msg.text)} className="action-btn edit-btn" title="Edit message" disabled={isLoading || editingMessageId || isRespondingToEdit.current}>
                    <Edit2 size={16} aria-hidden="true" />
                    <span>Edit</span>
                  </button>
                )}
                <button onClick={() => copyMessage(msg.text)} className="action-btn copy-btn" title="Copy message" disabled={isLoading || editingMessageId || isRespondingToEdit.current}>
                  <Copy size={16} aria-hidden="true" />
                  <span>Copy</span>
                </button>
                {index === messages.length - 1 && msg.sender === 'bot' && !msg.isPartial && (
                  <button onClick={regenerateLastMessage} className="action-btn regen-btn" title="Regenerate response (Ctrl+R)" disabled={isLoading || editingMessageId || isRespondingToEdit.current}>
                    <RefreshCw size={16} aria-hidden="true" />
                    <span>Regenerate</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}, (prevProps, nextProps) => prevProps.msg.id === nextProps.msg.id && prevProps.msg.text === nextProps.msg.text && prevProps.msg.isPartial === nextProps.msg.isPartial && prevProps.msg.isError === nextProps.msg.isError && prevProps.editingMessageId === nextProps.editingMessageId && prevProps.editingText === nextProps.editingText && prevProps.isLoading === nextProps.isLoading && prevProps.index === nextProps.index && prevProps.isSearchResult === nextProps.isSearchResult && prevProps.isCurrentSearchResult === nextProps.isCurrentSearchResult);

const AccessibilityAnnouncer = ({ announcement }) => (
  <div 
    className="visually-hidden" 
    aria-live="polite" 
    aria-atomic="true"
  >
    {announcement}
  </div>
);

function App() {
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
  const [isStreaming, setIsStreaming] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [activeAnnouncement, setActiveAnnouncement] = useState('');
  const [showModelSwitchModal, setShowModelSwitchModal] = useState(false);
  const [newModelToSwitchTo, setNewModelToSwitchTo] = useState(null);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);
  
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const editTextareaRef = useRef(null);
  const isRespondingToEdit = useRef(false);
  const lastProcessedEdit = useRef(null);
  const exportRef = useRef(null);
  const searchInputRef = useRef(null);
  const isMounted = useRef(true);

  const announce = useCallback((message, priority = 'polite') => {
    if (!isMounted.current) return;
    setActiveAnnouncement(message);
    setTimeout(() => {
      if (isMounted.current) setActiveAnnouncement('');
    }, 1000);
  }, []);

  const modelOptions = availableModels.map(model => ({ value: model, label: model }));

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONVERSATION, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    const settings = { model: selectedModel };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [selectedModel]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (editingMessageId && editTextareaRef.current) {
      editTextareaRef.current.focus();
      editTextareaRef.current.setSelectionRange(editingText.length, editingText.length);
    }
  }, [editingMessageId, editingText]);

  const prepareChatMessages = useCallback((messagesArray, targetModel, currentUserInput = null) => {
    const modelInfo = globalModelInfoCache.get(targetModel);
    const maxTokens = modelInfo?.contextWindow || 4096;
    const estimateFunc = modelInfo?.estimatedTokens || estimateTokens;
    
    const chatMessages = [];
    
    const allMessages = [...messagesArray].filter(msg => !msg.isPartial);
    
    let estimatedTokens = chatMessages.reduce((sum, msg) => sum + estimateFunc(msg.content), 0);
    
    const conversationHistory = [];
    
    for (let i = 0; i < allMessages.length; i++) {
      const msg = allMessages[i];
      if (msg.sender === 'user' || msg.sender === 'bot') {
        const role = msg.sender === 'user' ? 'user' : 'assistant';
        const content = msg.text;
        const messageTokens = estimateFunc(content);
        
        if (conversationHistory.length === 0 || 
            conversationHistory[conversationHistory.length - 1].role !== role) {
          
          if (estimatedTokens + messageTokens > maxTokens * 0.9) {
            while (estimatedTokens + messageTokens > maxTokens * 0.9 && conversationHistory.length > 0) {
              const removed = conversationHistory.shift();
              estimatedTokens -= estimateFunc(removed.content);
            }
            
            if (estimatedTokens + messageTokens > maxTokens * 0.9) break;
          }
          
          conversationHistory.push({ role, content });
          estimatedTokens += messageTokens;
        } else {
          const lastMessage = conversationHistory[conversationHistory.length - 1];
          lastMessage.content += '\n' + content;
          estimatedTokens += estimateFunc('\n' + content);
        }
      }
    }
    
    if (currentUserInput) {
      const userMessageTokens = estimateFunc(currentUserInput);
      
      while (estimatedTokens + userMessageTokens > maxTokens * 0.9 && conversationHistory.length > 0) {
        const removed = conversationHistory.shift();
        estimatedTokens -= estimateFunc(removed.content);
      }
      
      if (estimatedTokens + userMessageTokens <= maxTokens * 0.9) {
        if (conversationHistory.length > 0 && 
            conversationHistory[conversationHistory.length - 1].role === 'user') {
          conversationHistory[conversationHistory.length - 1].content += '\n' + currentUserInput;
        } else {
          conversationHistory.push({ role: 'user', content: currentUserInput });
        }
      }
    }
    
    return conversationHistory;
  }, []);

  const performModelSwitch = useCallback(async (newModel) => {
    if (!newModel) return;
    
    const oldModel = selectedModel;
    setSelectedModel(newModel);
    announce(`Model changed from ${oldModel} to ${newModel}`);
    
    if (messages.length > 0) {
      const systemMessage = {
        id: Date.now(),
        sender: 'system',
        text: `Model changed from ${oldModel} to ${newModel}`,
        timestamp: new Date(),
        isPartial: false,
        isSystem: true
      };
      setMessages(prev => [...prev, systemMessage]);
    }
    
    await fetchAvailableModels();
    
    setNewModelToSwitchTo(null);
  }, [selectedModel, messages, announce]);

  const handleModelChange = useCallback(async (newModel) => {
    if (newModel === selectedModel) return;
    
    if (isLoading || isStreaming || editingMessageId || isRespondingToEdit.current) {
      announce(`Cannot change model while ${isLoading ? 'generating' : 'editing'}. Please wait.`, 'assertive');
      return;
    }
    
    if (messages.length === 0) {
      setSelectedModel(newModel);
      announce(`Model set to ${newModel}`);
      return;
    }
    
    setNewModelToSwitchTo(newModel);
    setShowModelSwitchModal(true);
    
  }, [messages, selectedModel, isLoading, isStreaming, editingMessageId, isRespondingToEdit, announce]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const isBrowserShortcut = (e.key === 'r' && (e.ctrlKey || e.metaKey) && !e.shiftKey) || 
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
      
      const activeElement = document.activeElement;
      const isInFormElement = activeElement.tagName === 'TEXTAREA' || 
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
            case (e.ctrlKey || e.metaKey) && e.key === 'f':
              e.preventDefault();
              e.stopPropagation();
              setIsSearchOpen(true);
              setTimeout(() => searchInputRef.current?.focus(), 0);
              break;
          }
        }
        return;
      }
      
      switch (true) {
        case e.key === '/' && (e.ctrlKey || e.metaKey):
          e.preventDefault();
          e.stopPropagation();
          clearConversation();
          break;
        case e.key === 'Escape' && isLoading:
          e.preventDefault();
          e.stopPropagation();
          stopGeneration();
          break;
        case e.key === 'Enter' && !isLoading && !editingMessageId:
          e.preventDefault();
          textareaRef.current?.focus();
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
          textareaRef.current?.focus();
          break;
        case (e.ctrlKey || e.metaKey) && e.key === 'f':
          e.preventDefault();
          e.stopPropagation();
          setIsSearchOpen(true);
          setTimeout(() => searchInputRef.current?.focus(), 0);
          break;
      }
    };
    
    document.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, [isLoading, messages, editingMessageId]);

  const checkOllamaHealth = async (retryCount = 0) => {
    if (isStreaming || isLoading) return false;
    
    const maxRetries = 2;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch(`${OLLAMA_API_URL}/tags?_t=${Date.now()}`, { 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setOllamaStatus('connected');
        return true;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      if (!isStreaming && !isLoading) {
        if (error.name === 'AbortError') {
          setOllamaStatus('error');
        } else if (error.message.includes('Failed to fetch')) {
          setOllamaStatus('error');
        } else {
          setOllamaStatus('error');
        }
        
        if (retryCount < maxRetries) {
          setTimeout(() => checkOllamaHealth(retryCount + 1), 2000);
        }
      }
      return false;
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${OLLAMA_API_URL}/tags`, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      
      const data = await response.json();
      if (data.models && data.models.length > 0) {
        const modelNames = data.models.map(m => m.name);
        setAvailableModels(modelNames);
        if (!modelNames.includes(selectedModel) && modelNames.length > 0) setSelectedModel(modelNames[0]);
      } else {
        setAvailableModels([]);
      }
    } catch (error) {
      console.error('Failed to fetch Ollama models:', error);
      setAvailableModels([]);
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      const isHealthy = await checkOllamaHealth();
      if (isHealthy) await fetchAvailableModels();
      setIsInitialized(true);
    };
    initializeApp();
    
    const interval = setInterval(() => {
      if (isInitialized && !isStreaming && !isLoading) checkOllamaHealth();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isInitialized, isStreaming, isLoading]);

  const clearConversation = () => {
    if (window.confirm('Are you sure you want to clear the conversation?')) {
      setMessages([]);
      cancelEditing();
      isRespondingToEdit.current = false;
      lastProcessedEdit.current = null;
      setIsMobileDropdownOpen(false);
      setTimeout(() => textareaRef.current?.focus(), 0);
      announce('Conversation cleared');
    }
  };

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
      setIsStreaming(false);
      isRespondingToEdit.current = false;
      setIsMobileDropdownOpen(false);
      
      setTimeout(() => textareaRef.current?.focus(), 0);
      announce('Generation stopped');
    }
  };

  const startEditing = (messageId, currentText) => {
    setEditingMessageId(messageId);
    setEditingText(currentText);
    setIsMobileDropdownOpen(false);
    announce('Editing message. Press Escape to cancel or Enter to save.');
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
    
    setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, text: editingText, timestamp: new Date() } : msg));
    cancelEditing();
    
    if (messages[editedMessageIndex].sender === 'user') {
      if (editedMessageIndex === messages.length - 1) {
        setTimeout(async () => {
          if (messages[editedMessageIndex + 1]?.sender === 'bot') {
            setMessages(prev => prev.slice(0, editedMessageIndex + 1));
          }
          setTimeout(async () => {
            await sendStreamingResponse(editingText, true);
            isRespondingToEdit.current = false;
          }, 150);
        }, 50);
      } else {
        setTimeout(() => {
          setMessages(prev => prev.slice(0, editedMessageIndex + 1));
          setTimeout(async () => {
            await sendStreamingResponse(editingText, true);
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
    
    if (!selectedModel || availableModels.length === 0) {
      announce('No model selected or available. Please check if Ollama is running and has models.', 'assertive');
      alert('No model selected or available. Please check if Ollama is running and has models.');
      return;
    }
    
    announce(`Sending message to ${selectedModel}`);
    
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
    setIsMobileDropdownOpen(false);
    textareaRef.current?.focus();
    
    await sendStreamingResponse(input, false);
  };

  const sendStreamingResponse = async (userInput, isEdit = false) => {
    if (!isInitialized || (isLoading && !isEdit)) return;
    
    const currentModel = selectedModel;
    if (!currentModel || availableModels.length === 0 || !availableModels.includes(currentModel)) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        sender: 'bot',
        text: `Error: Model "${currentModel}" is not available.`,
        timestamp: new Date(),
        isPartial: false,
        isError: true
      }]);
      setIsLoading(false);
      return;
    }
    
    setIsStreaming(true);
    setIsLoading(true);
    
    setMessages(prev => prev.filter(msg => !(msg.sender === 'bot' && msg.isPartial)));
    
    const botMessageId = Date.now() + 1;
    let fullResponse = '';
    
    const botMessage = {
      id: botMessageId,
      sender: 'bot',
      text: '',
      timestamp: new Date(),
      isPartial: true,
      model: currentModel
    };
    
    setMessages(prev => [...prev, botMessage]);
    
    try {
      const controller = new AbortController();
      setAbortController(controller);
      
      const currentMessages = messages.filter(msg => !msg.isPartial);
      const chatMessages = prepareChatMessages(currentMessages, currentModel, userInput);
      
      const response = await fetch(`${OLLAMA_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model: currentModel, 
          messages: chatMessages, 
          stream: true, 
          options: { temperature: 0.7 } 
        }),
        signal: controller.signal
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          try {
            const jsonStr = line.startsWith('data: ') ? line.substring(6) : line;
            const data = JSON.parse(jsonStr);
            
            if (data.message?.content) {
              fullResponse += data.message.content;
              
              setMessages(prev => {
                const newMessages = [...prev];
                const messageIndex = newMessages.findIndex(msg => msg.id === botMessageId);
                if (messageIndex !== -1) {
                  newMessages[messageIndex] = {
                    ...newMessages[messageIndex],
                    text: fullResponse
                  };
                }
                return newMessages;
              });
            }
            
            if (data.done) {
              setMessages(prev => prev.map(msg => 
                msg.id === botMessageId 
                  ? { ...msg, text: fullResponse, isPartial: false }
                  : msg
              ));
              return;
            }
          } catch (e) {
            // Skip parsing errors
          }
        }
      }
      
      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId 
          ? { ...msg, text: fullResponse, isPartial: false }
          : msg
      ));
      
    } catch (error) {
      console.error('Stream error:', error);
      
      setMessages(prev => prev.map(msg => 
        msg.id === botMessageId 
          ? { 
              ...msg, 
              text: fullResponse + (error.name === 'AbortError' ? '\n\n[Generation stopped]' : `\n\n[Error: ${error.message}]`),
              isPartial: false,
              isError: error.name !== 'AbortError'
            }
          : msg
      ));
      
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setAbortController(null);
      setIsMobileDropdownOpen(false);
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const regenerateLastMessage = () => {
    if (!isInitialized || messages.length === 0 || isLoading || isRespondingToEdit.current) return;
    
    const lastUserMessageIndex = messages.map((msg, idx) => msg.sender === 'user' ? idx : -1)
                                         .filter(idx => idx !== -1)
                                         .pop();
    
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

  const handleInputChange = (e) => setInput(e.target.value);
  const handleEditTextChange = (e) => setEditingText(e.target.value);

  const copyMessage = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      announce('Message copied to clipboard');
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const exportConversation = () => {
    const data = { messages, model: selectedModel, timestamp: new Date().toISOString(), version: '1.0' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ollama-chat-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportOptions(false);
    setIsMobileDropdownOpen(false);
    announce('Conversation exported successfully');
  };

  const importConversation = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.messages && Array.isArray(data.messages)) {
            if (window.confirm('Replace current conversation with imported one?')) {
              setMessages(data.messages);
              if (data.model && availableModels.includes(data.model)) setSelectedModel(data.model);
              setShowExportOptions(false);
              setIsMobileDropdownOpen(false);
              announce('Conversation imported successfully');
            }
          } else {
            alert('Invalid conversation file format.');
          }
        } catch (error) {
          alert('Error reading conversation file.');
          console.error('Import error:', error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const searchConversation = useCallback((term) => {
    if (!term.trim()) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }
    
    const results = [];
    messages.forEach((msg, index) => {
      if (msg.text.toLowerCase().includes(term.toLowerCase()) && !msg.isSystem) {
        results.push({
          index,
          message: msg,
          matches: msg.text.toLowerCase().split(term.toLowerCase()).length - 1
        });
      }
    });
    
    setSearchResults(results);
    setCurrentSearchIndex(results.length > 0 ? 0 : -1);
    
    if (results.length > 0) {
      announce(`Found ${results.length} search result${results.length !== 1 ? 's' : ''}`);
    }
  }, [messages, announce]);

  useEffect(() => {
    searchConversation(searchTerm);
  }, [searchTerm, searchConversation]);

  const LoadingSkeleton = () => (
    <div className="loading-skeleton">
      <div className="skeleton-line"></div>
      <div className="skeleton-line"></div>
      <div className="skeleton-line"></div>
    </div>
  );

  return (
    <div className="App">
      <AccessibilityAnnouncer announcement={activeAnnouncement} />
      
      {/* Simplified Model Switch Modal */}
      {showModelSwitchModal && (
        <div className="modal-overlay" onClick={() => setShowModelSwitchModal(false)}>
          <div className="model-switch-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-content">
                <Cpu size={20} />
                <h3>Switch Model</h3>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => setShowModelSwitchModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-content">
              <div className="model-switch-names">
                <div className="model-name-section">
                  <div className="model-label">Current</div>
                  <div className="model-name current" title={selectedModel}>
                    {selectedModel}
                  </div>
                </div>
                <div className="model-switch-arrow">
                  <ChevronRight size={16} />
                </div>
                <div className="model-name-section">
                  <div className="model-label">New</div>
                  <div className="model-name new" title={newModelToSwitchTo}>
                    {newModelToSwitchTo}
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <p className="modal-note">
                  The new model will continue the conversation with available context.
                </p>
                <div className="modal-actions">
                  <button 
                    className="modal-btn secondary"
                    onClick={() => setShowModelSwitchModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="modal-btn primary"
                    onClick={() => {
                      performModelSwitch(newModelToSwitchTo);
                      setShowModelSwitchModal(false);
                    }}
                  >
                    Switch Model
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="app-header">
        <div className="header-left">
          <div className="app-title">
            <Sparkles size={24} className="title-icon" aria-hidden="true" />
            <h1>Ollama Hub</h1>
          </div>
          <div className={`server-status ${ollamaStatus}`}>
            <span className="status-dot" aria-hidden="true"></span>
            {ollamaStatus === 'connected' ? (
              <>
                <Wifi size={14} aria-hidden="true" />
                <span>Connected</span>
              </>
            ) : ollamaStatus === 'checking' ? (
              <>
                <Loader2 size={14} className="spin" aria-hidden="true" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <WifiOff size={14} aria-hidden="true" />
                <span>Disconnected</span>
              </>
            )}
          </div>
        </div>
        <div className="header-right">
          <div className="search-container">
            <button 
              onClick={() => {
                setIsSearchOpen(!isSearchOpen);
                setIsMobileDropdownOpen(false);
                if (!isSearchOpen) {
                  setTimeout(() => searchInputRef.current?.focus(), 0);
                }
              }}
              className="icon-btn search-btn"
              title="Search conversation (Ctrl+F)"
              disabled={messages.length === 0}
            >
              <Search size={18} />
            </button>
            
            {isSearchOpen && (
              <div className="search-panel">
                <div className="search-input-wrapper">
                  <Search size={16} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search in conversation..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                    }}
                    className="search-input"
                  />
                  {searchTerm && (
                    <button 
                      onClick={() => {
                        setSearchTerm('');
                        setSearchResults([]);
                      }}
                      className="clear-search-btn"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                {searchResults.length > 0 && (
                  <div className="search-results">
                    <div className="search-results-header">
                      <span>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</span>
                      <div className="search-navigation">
                        <button 
                          onClick={() => {
                            const newIndex = currentSearchIndex > 0 ? currentSearchIndex - 1 : searchResults.length - 1;
                            setCurrentSearchIndex(newIndex);
                          }}
                          className="search-nav-btn"
                          disabled={searchResults.length <= 1}
                        >
                          <ChevronUp size={14} />
                        </button>
                        <span>{currentSearchIndex + 1} / {searchResults.length}</span>
                        <button 
                          onClick={() => {
                            const newIndex = currentSearchIndex < searchResults.length - 1 ? currentSearchIndex + 1 : 0;
                            setCurrentSearchIndex(newIndex);
                          }}
                          className="search-nav-btn"
                          disabled={searchResults.length <= 1}
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {searchTerm && searchResults.length === 0 && (
                  <div className="no-search-results">
                    No results found for "{searchTerm}"
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="custom-dropdown-wrapper desktop-only">
            <CustomDropdown
              options={modelOptions}
              value={selectedModel}
              onChange={handleModelChange}
              disabled={isLoading || ollamaStatus === 'error' || editingMessageId || isRespondingToEdit.current}
              placeholder="Select model..."
              isMobile={false}
            />
          </div>
          <div className="export-import-container" ref={exportRef}>
            <button onClick={() => {
              setShowExportOptions(!showExportOptions);
              setIsMobileDropdownOpen(false);
            }} className="icon-btn export-btn" title="Export/Import conversation" disabled={isLoading || editingMessageId || isRespondingToEdit.current}>
              <Download size={18} />
              <span>Export</span>
            </button>
            {showExportOptions && (
              <div className="export-options">
                <button onClick={exportConversation} className="export-option">
                  <Download size={16} />
                  <span>Export Conversation</span>
                </button>
                <button onClick={importConversation} className="export-option">
                  <Upload size={16} />
                  <span>Import Conversation</span>
                </button>
              </div>
            )}
          </div>
          <button onClick={clearConversation} className="icon-btn clear-btn" title="Clear conversation (Ctrl+/)" disabled={messages.length === 0 || isLoading || editingMessageId || isRespondingToEdit.current}>
            <Trash2 size={18} />
            <span>Clear</span>
          </button>
        </div>
      </div>
      <div className="chat-window-container">
        <div className="chat-window">
          {!isInitialized ? (
            <div className="empty-state">
              <LoadingSkeleton />
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <MessageSquare size={64} aria-hidden="true" />
              </div>
              <h2>Start a conversation</h2>
              <p className="empty-subtitle">Send a message to begin chatting with {selectedModel}</p>
              {ollamaStatus === 'error' && (
                <div className="connection-error">
                  <AlertCircle size={24} aria-hidden="true" />
                  <p>Cannot connect to Ollama</p>
                  <p className="error-hint">Make sure Ollama is running on http://localhost:11434</p>
                </div>
              )}
              {availableModels.length === 0 && ollamaStatus === 'connected' && (
                <div className="models-warning">
                  <AlertCircle size={24} aria-hidden="true" />
                  <p>No models available</p>
                  <p className="warning-hint">Pull a model using: ollama pull &lt;model-name&gt;</p>
                </div>
              )}
              <div className="hints">
                <div className="hint-item">
                  <Keyboard size={16} aria-hidden="true" />
                  <span><kbd>Enter</kbd> to send message</span>
                </div>
                <div className="hint-item">
                  <Keyboard size={16} aria-hidden="true" />
                  <span><kbd>Shift</kbd> + <kbd>Enter</kbd> for new line</span>
                </div>
                <div className="hint-item">
                  <Keyboard size={16} aria-hidden="true" />
                  <span><kbd>Ctrl</kbd> + <kbd>/</kbd> to clear conversation</span>
                </div>
                <div className="hint-item">
                  <Keyboard size={16} aria-hidden="true" />
                  <span><kbd>Esc</kbd> to stop generation</span>
                </div>
                <div className="hint-item">
                  <Keyboard size={16} aria-hidden="true" />
                  <span><kbd>Ctrl</kbd> + <kbd>R</kbd> to regenerate</span>
                </div>
                <div className="hint-item">
                  <Keyboard size={16} aria-hidden="true" />
                  <span><kbd>Ctrl</kbd> + <kbd>K</kbd> to clear input</span>
                </div>
                <div className="hint-item">
                  <Info size={16} aria-hidden="true" />
                  <span>Switch models anytime - conversation history preserved</span>
                </div>
                <div className="hint-item">
                  <Terminal size={16} aria-hidden="true" />
                  <span>Code blocks are automatically detected and highlighted</span>
                </div>
                <div className="hint-item">
                  <Search size={16} aria-hidden="true" />
                  <span><kbd>Ctrl</kbd> + <kbd>F</kbd> to search conversation</span>
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isSearchResult = searchResults.some(result => result.message.id === msg.id);
              const isCurrentSearchResult = isSearchResult && 
                searchResults[currentSearchIndex]?.message.id === msg.id;
              
              return (
                <MessageComponent
                  key={msg.id || index}
                  msg={msg}
                  index={index}
                  messages={messages}
                  editingMessageId={editingMessageId}
                  editingText={editingText}
                  editTextareaRef={editTextareaRef}
                  isLoading={isLoading}
                  isRespondingToEdit={isRespondingToEdit}
                  handleEditTextChange={handleEditTextChange}
                  handleEditTextareaKeyDown={handleEditTextareaKeyDown}
                  saveEditedMessage={saveEditedMessage}
                  cancelEditing={cancelEditing}
                  startEditing={startEditing}
                  copyMessage={copyMessage}
                  regenerateLastMessage={regenerateLastMessage}
                  selectedModel={selectedModel}
                  isSearchResult={isSearchResult}
                  isCurrentSearchResult={isCurrentSearchResult}
                />
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Enhanced Mobile Model Selector - Floating Button */}
        <div className="mobile-model-selector floating">
          <div className="mobile-dropdown-wrapper">
            <div className={`custom-dropdown mobile ${isMobileDropdownOpen ? 'open' : ''}`}>
              <button
                className="floating-model-toggle"
                onClick={() => setIsMobileDropdownOpen(!isMobileDropdownOpen)}
                disabled={isLoading || ollamaStatus === 'error' || editingMessageId || isRespondingToEdit.current}
                type="button"
                aria-label={`Current model: ${selectedModel}. Tap to change.`}
                aria-expanded={isMobileDropdownOpen}
              >
                <div className="dropdown-content">
                  <Cpu size={16} aria-hidden="true" />
                  <span className="dropdown-selected" title={selectedModel}>
                    {selectedModel}
                  </span>
                </div>
                <ChevronDown size={16} className="dropdown-arrow" aria-hidden="true" />
              </button>
              
              {isMobileDropdownOpen && (
                <>
                  <div 
                    className="floating-dropdown-backdrop" 
                    onClick={() => setIsMobileDropdownOpen(false)} 
                    aria-hidden="true"
                  />
                  <div 
                    className="floating-dropdown-menu"
                    role="listbox"
                    aria-label="Available models"
                  >
                    {modelOptions.length === 0 ? (
                      <div className="dropdown-no-models" role="alert">
                        <div className="no-models-icon">
                          <AlertCircle size={16} aria-hidden="true" />
                        </div>
                        <div className="no-models-text">
                          <p>No models</p>
                          <p className="no-models-hint">Check Ollama</p>
                        </div>
                      </div>
                    ) : (
                      modelOptions.map((option) => (
                        <button
                          key={option.value}
                          className={`dropdown-item ${selectedModel === option.value ? 'selected' : ''}`}
                          onClick={() => {
                            handleModelChange(option.value);
                            setIsMobileDropdownOpen(false);
                          }}
                          type="button"
                          role="option"
                          aria-selected={selectedModel === option.value}
                        >
                          <div className="dropdown-item-content">
                            <Code size={14} aria-hidden="true" />
                            <div className="dropdown-item-info">
                              <span className="dropdown-item-label">
                                {option.label}
                              </span>
                            </div>
                          </div>
                          {selectedModel === option.value && (
                            <Check size={14} className="checkmark" aria-hidden="true" />
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Input Area with Send Button on the Right */}
      <div className="input-area">
        <div className="message-input-wrapper">
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
              aria-label="Message input"
            />
          </div>
          
          {/* Status messages positioned inside the input wrapper */}
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
                <FileEdit size={14} aria-hidden="true" />
                <span className="editing-text">Editing message...</span>
              </div>
            )}
            {isRespondingToEdit.current && !editingMessageId && (
              <div className="editing-status mobile-hide-text">
                <RefreshCw size={14} className="spin" aria-hidden="true" />
                <span className="editing-text">Regenerating...</span>
              </div>
            )}
            {availableModels.length === 0 && (
              <div className="no-models-warning mobile-hide-text">
                <AlertCircle size={14} aria-hidden="true" />
                <span className="warning-text">No models</span>
              </div>
            )}
          </div>
          
          {/* Send/Stop Button positioned to the right */}
          <div className="input-buttons">
            {isLoading ? (
              <button onClick={stopGeneration} className="stop-btn" title="Stop generation (Esc)" disabled={editingMessageId || isRespondingToEdit.current}>
                <StopCircle size={18} aria-hidden="true" />
                <span className="stop-text">Stop</span>
              </button>
            ) : (
              <button onClick={sendMessage} disabled={!input.trim() || ollamaStatus === 'error' || editingMessageId || isRespondingToEdit.current || availableModels.length === 0} className="send-btn" title="Send message (Enter)">
                <Send size={18} aria-hidden="true" />
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