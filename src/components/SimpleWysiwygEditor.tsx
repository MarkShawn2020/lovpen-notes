import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Plate,
  PlateContent,
  usePlateEditor,
} from '@platejs/core/react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Type,
  CodeSquare,
  Highlighter,
  Link,
} from 'lucide-react';
import './WysiwygEditor.css';

interface SimpleWysiwygEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

interface ToolbarButtonProps {
  active?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  tooltip?: string;
}

function ToolbarButton({ active, onClick, icon, tooltip }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`toolbar-button ${active ? 'active' : ''}`}
      title={tooltip}
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent focus loss
      }}
    >
      {icon}
    </button>
  );
}

function SimpleWysiwygEditor({ value, onChange, placeholder, onKeyDown }: SimpleWysiwygEditorProps) {
  const isInternalChange = useRef(false);
  const lastValue = useRef(value);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [activeMarks, setActiveMarks] = useState<Set<string>>(new Set());
  const [activeBlock, setActiveBlock] = useState<string>('p');
  
  // Parse initial value
  const getInitialValue = () => {
    if (!value || value.trim() === '') {
      return [{ type: 'p', children: [{ text: '' }] }];
    }
    
    // Parse markdown-like syntax
    const lines = value.split('\n');
    const blocks: any[] = [];
    let currentList: any = null;
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        blocks.push({ type: 'h1', children: [{ text: line.substring(2) }] });
      } else if (line.startsWith('## ')) {
        blocks.push({ type: 'h2', children: [{ text: line.substring(3) }] });
      } else if (line.startsWith('### ')) {
        blocks.push({ type: 'h3', children: [{ text: line.substring(4) }] });
      } else if (line.startsWith('> ')) {
        blocks.push({ type: 'blockquote', children: [{ text: line.substring(2) }] });
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        const itemText = line.substring(2);
        if (!currentList || currentList.type !== 'ul') {
          currentList = { type: 'ul', children: [] };
          blocks.push(currentList);
        }
        currentList.children.push({
          type: 'li',
          children: [{ type: 'lic', children: [{ text: itemText }] }]
        });
      } else if (line.match(/^\d+\. /)) {
        const itemText = line.replace(/^\d+\. /, '');
        if (!currentList || currentList.type !== 'ol') {
          currentList = { type: 'ol', children: [] };
          blocks.push(currentList);
        }
        currentList.children.push({
          type: 'li',
          children: [{ type: 'lic', children: [{ text: itemText }] }]
        });
      } else if (line.trim()) {
        currentList = null;
        // Parse inline marks
        const text = line;
        const children: any[] = [];
        
        // Simple parsing for bold and italic
        if (text.includes('**') || text.includes('*')) {
          children.push({ text });
        } else {
          children.push({ text });
        }
        
        blocks.push({ type: 'p', children });
      } else if (blocks.length > 0) {
        // Empty line, reset list
        currentList = null;
      }
    }
    
    return blocks.length > 0 ? blocks : [{ type: 'p', children: [{ text: '' }] }];
  };
  
  // Create editor with minimal plugins
  const editor = usePlateEditor({
    plugins: [],
    value: getInitialValue(),
  });

  // Apply formatting using native contentEditable commands
  const applyFormat = useCallback((command: string, value?: string) => {
    const editorElement = editorContainerRef.current?.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editorElement) return;
    
    editorElement.focus();
    
    // Ensure we have a selection
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // Create a selection if none exists
      const range = document.createRange();
      range.selectNodeContents(editorElement);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    
    // Execute the command
    const result = document.execCommand(command, false, value);
    
    // Update active states
    updateActiveStates();
    
    // Trigger change event
    setTimeout(() => {
      const event = new Event('input', { bubbles: true });
      editorElement.dispatchEvent(event);
    }, 0);
    
    return result;
  }, []);

  // Update active formatting states
  const updateActiveStates = useCallback(() => {
    const marks = new Set<string>();
    if (document.queryCommandState('bold')) marks.add('bold');
    if (document.queryCommandState('italic')) marks.add('italic');
    if (document.queryCommandState('underline')) marks.add('underline');
    if (document.queryCommandState('strikeThrough')) marks.add('strikethrough');
    setActiveMarks(marks);
    
    const formatBlock = document.queryCommandValue('formatBlock').toLowerCase();
    setActiveBlock(formatBlock || 'p');
  }, []);

  // Format handlers
  const toggleBold = useCallback(() => applyFormat('bold'), [applyFormat]);
  const toggleItalic = useCallback(() => applyFormat('italic'), [applyFormat]);
  const toggleUnderline = useCallback(() => applyFormat('underline'), [applyFormat]);
  const toggleStrikethrough = useCallback(() => applyFormat('strikeThrough'), [applyFormat]);
  
  const toggleCode = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const text = selection.toString();
      applyFormat('insertText', `\`${text}\``);
    }
  }, [applyFormat]);
  
  const toggleHighlight = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const text = selection.toString();
      applyFormat('insertText', `==${text}==`);
    }
  }, [applyFormat]);

  const setBlockType = useCallback((tag: string) => {
    applyFormat('formatBlock', `<${tag}>`);
  }, [applyFormat]);

  const toggleList = useCallback((type: 'ul' | 'ol') => {
    const command = type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList';
    applyFormat(command);
  }, [applyFormat]);

  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      applyFormat('createLink', url);
    }
  }, [applyFormat]);

  // Extract markdown from editor
  const extractMarkdown = useCallback((nodes: any[]): string => {
    if (!nodes || nodes.length === 0) return '';
    
    return nodes
      .map((node: any) => {
        if (node.text !== undefined) {
          let text = node.text;
          if (node.bold) text = `**${text}**`;
          if (node.italic) text = `*${text}*`;
          if (node.code) text = `\`${text}\``;
          if (node.strikethrough) text = `~~${text}~~`;
          if (node.highlight) text = `==${text}==`;
          return text;
        }
        
        let childrenText = '';
        if (node.children) {
          childrenText = extractMarkdown(node.children);
        }
        
        switch (node.type) {
          case 'h1': return `# ${childrenText}`;
          case 'h2': return `## ${childrenText}`;
          case 'h3': return `### ${childrenText}`;
          case 'blockquote': return `> ${childrenText}`;
          case 'ul':
            if (node.children) {
              return node.children
                .map((li: any) => `- ${extractMarkdown(li.children || [])}`)
                .join('\n');
            }
            break;
          case 'ol':
            if (node.children) {
              return node.children
                .map((li: any, idx: number) => `${idx + 1}. ${extractMarkdown(li.children || [])}`)
                .join('\n');
            }
            break;
          case 'li':
          case 'lic':
            return extractMarkdown(node.children || []);
          default:
            return childrenText;
        }
        
        return childrenText;
      })
      .filter(Boolean)
      .join('\n\n');
  }, []);

  // Handle editor changes
  const handleEditorChange = useCallback(({ value: editorValue }: any) => {
    if (JSON.stringify(editorValue) !== JSON.stringify(editor.children)) {
      isInternalChange.current = true;
      const markdown = extractMarkdown(editorValue);
      if (markdown !== lastValue.current) {
        lastValue.current = markdown;
        onChange(markdown);
      }
    }
  }, [editor, onChange, extractMarkdown]);

  // Update editor when external value changes
  useEffect(() => {
    if (!isInternalChange.current && value !== lastValue.current) {
      const newValue = getInitialValue();
      editor.children = newValue;
      lastValue.current = value;
    }
    isInternalChange.current = false;
  }, [value, editor]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          toggleBold();
          break;
        case 'i':
          e.preventDefault();
          toggleItalic();
          break;
        case 'u':
          e.preventDefault();
          toggleUnderline();
          break;
        case 'e':
          e.preventDefault();
          toggleCode();
          break;
        case 'h':
          e.preventDefault();
          toggleHighlight();
          break;
      }
    }
    
    // Handle markdown shortcuts
    if (e.key === ' ') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const container = range.startContainer;
        const text = container.textContent || '';
        const offset = range.startOffset;
        
        // Check for markdown patterns at line start
        if (offset > 0) {
          const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
          const lineText = text.substring(lineStart, offset);
          
          if (lineText === '#') {
            e.preventDefault();
            applyFormat('formatBlock', '<h1>');
            applyFormat('insertText', ' ');
          } else if (lineText === '##') {
            e.preventDefault();
            applyFormat('formatBlock', '<h2>');
            applyFormat('insertText', ' ');
          } else if (lineText === '###') {
            e.preventDefault();
            applyFormat('formatBlock', '<h3>');
            applyFormat('insertText', ' ');
          } else if (lineText === '-' || lineText === '*') {
            e.preventDefault();
            applyFormat('insertUnorderedList');
            applyFormat('insertText', ' ');
          } else if (lineText === '1.') {
            e.preventDefault();
            applyFormat('insertOrderedList');
            applyFormat('insertText', ' ');
          } else if (lineText === '>') {
            e.preventDefault();
            applyFormat('formatBlock', '<blockquote>');
            applyFormat('insertText', ' ');
          }
        }
      }
    }
    
    updateActiveStates();
    
    if (onKeyDown) {
      onKeyDown(e);
    }
  }, [onKeyDown, toggleBold, toggleItalic, toggleUnderline, toggleCode, toggleHighlight, applyFormat, updateActiveStates]);

  // Update active states on selection change
  useEffect(() => {
    const handleSelectionChange = () => {
      updateActiveStates();
    };
    
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [updateActiveStates]);

  return (
    <div className="wysiwyg-editor-container" ref={editorContainerRef}>
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <ToolbarButton
            active={activeBlock === 'p' || activeBlock === 'div'}
            onClick={() => setBlockType('p')}
            icon={<Type size={18} />}
            tooltip="Paragraph"
          />
          <ToolbarButton
            active={activeBlock === 'h1'}
            onClick={() => setBlockType('h1')}
            icon={<Heading1 size={18} />}
            tooltip="Heading 1 (# )"
          />
          <ToolbarButton
            active={activeBlock === 'h2'}
            onClick={() => setBlockType('h2')}
            icon={<Heading2 size={18} />}
            tooltip="Heading 2 (## )"
          />
          <ToolbarButton
            active={activeBlock === 'h3'}
            onClick={() => setBlockType('h3')}
            icon={<Heading3 size={18} />}
            tooltip="Heading 3 (### )"
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            active={activeMarks.has('bold')}
            onClick={toggleBold}
            icon={<Bold size={18} />}
            tooltip="Bold (Cmd+B)"
          />
          <ToolbarButton
            active={activeMarks.has('italic')}
            onClick={toggleItalic}
            icon={<Italic size={18} />}
            tooltip="Italic (Cmd+I)"
          />
          <ToolbarButton
            active={activeMarks.has('underline')}
            onClick={toggleUnderline}
            icon={<Underline size={18} />}
            tooltip="Underline (Cmd+U)"
          />
          <ToolbarButton
            active={activeMarks.has('strikethrough')}
            onClick={toggleStrikethrough}
            icon={<Strikethrough size={18} />}
            tooltip="Strikethrough"
          />
          <ToolbarButton
            onClick={toggleCode}
            icon={<Code size={18} />}
            tooltip="Inline Code (Cmd+E)"
          />
          <ToolbarButton
            onClick={toggleHighlight}
            icon={<Highlighter size={18} />}
            tooltip="Highlight (Cmd+H)"
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => toggleList('ul')}
            icon={<List size={18} />}
            tooltip="Bullet List (- or *)"
          />
          <ToolbarButton
            onClick={() => toggleList('ol')}
            icon={<ListOrdered size={18} />}
            tooltip="Numbered List (1.)"
          />
          <ToolbarButton
            active={activeBlock === 'blockquote'}
            onClick={() => setBlockType('blockquote')}
            icon={<Quote size={18} />}
            tooltip="Blockquote (>)"
          />
          <ToolbarButton
            active={activeBlock === 'pre'}
            onClick={() => setBlockType('pre')}
            icon={<CodeSquare size={18} />}
            tooltip="Code Block"
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            onClick={insertLink}
            icon={<Link size={18} />}
            tooltip="Insert Link"
          />
        </div>
      </div>

      <Plate editor={editor} onChange={handleEditorChange}>
        <PlateContent
          className="wysiwyg-content"
          placeholder={placeholder || "Start writing..."}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </Plate>
    </div>
  );
}

export default SimpleWysiwygEditor;