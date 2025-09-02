import { useCallback, useEffect, useRef } from 'react';
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
import { WysiwygKit } from './editor/plugins/wysiwyg-kit';
import './WysiwygEditor.css';

interface ProperWysiwygEditorProps {
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
    >
      {icon}
    </button>
  );
}

function ProperWysiwygEditor({ value, onChange, placeholder, onKeyDown }: ProperWysiwygEditorProps) {
  const isInternalChange = useRef(false);
  const lastValue = useRef(value);
  const lastEditorValue = useRef<any>(null);
  
  // Parse initial value - for now, just use plain text in paragraphs
  const getInitialValue = () => {
    if (!value || value.trim() === '') {
      return [{ type: 'p', children: [{ text: '' }] }];
    }
    
    // Split by double newlines for paragraphs
    const paragraphs = value.split(/\n\n+/);
    return paragraphs.map(para => ({
      type: 'p',
      children: [{ text: para }]
    }));
  };
  
  // Create editor with plugins
  const editor = usePlateEditor({
    plugins: WysiwygKit,
    value: getInitialValue(),
  });

  // Extract text from editor value
  const extractMarkdown = useCallback((nodes: any[]): string => {
    if (!nodes || nodes.length === 0) return '';
    
    return nodes
      .map((node: any) => {
        // Handle text nodes
        if (node.text !== undefined) {
          let text = node.text;
          // Apply formatting marks
          if (node.bold) text = `**${text}**`;
          if (node.italic) text = `*${text}*`;
          if (node.code) text = `\`${text}\``;
          if (node.strikethrough) text = `~~${text}~~`;
          if (node.highlight) text = `==${text}==`;
          if (node.underline) text = `<u>${text}</u>`;
          return text;
        }
        
        // Handle links
        if (node.type === 'a' && node.children) {
          const linkText = extractMarkdown(node.children);
          return `[${linkText}](${node.url || '#'})`;
        }
        
        // Handle block elements
        let childrenText = '';
        
        if (node.children) {
          childrenText = extractMarkdown(node.children);
        }
        
        switch (node.type) {
          case 'h1':
            return `# ${childrenText}`;
          case 'h2':
            return `## ${childrenText}`;
          case 'h3':
            return `### ${childrenText}`;
          case 'h4':
            return `#### ${childrenText}`;
          case 'h5':
            return `##### ${childrenText}`;
          case 'h6':
            return `###### ${childrenText}`;
          case 'blockquote':
            return `> ${childrenText}`;
          case 'code_block':
            return `\`\`\`\n${childrenText}\n\`\`\``;
          case 'ul':
            if (node.children) {
              return node.children
                .map((li: any) => {
                  const itemText = li.children ? extractMarkdown(li.children) : '';
                  return `- ${itemText}`;
                })
                .join('\n');
            }
            break;
          case 'ol':
            if (node.children) {
              return node.children
                .map((li: any, idx: number) => {
                  const itemText = li.children ? extractMarkdown(li.children) : '';
                  return `${idx + 1}. ${itemText}`;
                })
                .join('\n');
            }
            break;
          case 'li':
            return extractMarkdown(node.children || []);
          case 'lic':
            // List item content
            return extractMarkdown(node.children || []);
          case 'p':
            return childrenText;
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
    // Only process if value actually changed
    if (JSON.stringify(editorValue) !== JSON.stringify(lastEditorValue.current)) {
      lastEditorValue.current = editorValue;
      isInternalChange.current = true;
      const markdown = extractMarkdown(editorValue);
      if (markdown !== lastValue.current) {
        lastValue.current = markdown;
        onChange(markdown);
      }
    }
  }, [onChange, extractMarkdown]);

  // Update editor when external value changes
  useEffect(() => {
    if (!isInternalChange.current && value !== lastValue.current) {
      // Parse the markdown to editor format
      const paragraphs = value.split(/\n\n+/);
      const newValue = paragraphs.map(para => ({
        type: 'p',
        children: [{ text: para }]
      }));
      
      editor.children = newValue;
      lastValue.current = value;
      lastEditorValue.current = newValue;
    }
    isInternalChange.current = false;
  }, [value, editor]);

  // Formatting functions using document.execCommand fallback
  const toggleMark = useCallback((mark: string) => {
    const command = mark === 'bold' ? 'bold' : 
                   mark === 'italic' ? 'italic' :
                   mark === 'underline' ? 'underline' :
                   mark === 'strikethrough' ? 'strikeThrough' : null;
    if (command) {
      document.execCommand(command, false);
    }
  }, []);

  const toggleBlock = useCallback((type: string) => {
    if (type === 'h1' || type === 'h2' || type === 'h3') {
      const tag = type.toUpperCase();
      document.execCommand('formatBlock', false, `<${tag}>`);
    } else if (type === 'p') {
      document.execCommand('formatBlock', false, '<P>');
    } else if (type === 'blockquote') {
      document.execCommand('formatBlock', false, '<BLOCKQUOTE>');
    } else if (type === 'ul') {
      document.execCommand('insertUnorderedList', false);
    } else if (type === 'ol') {
      document.execCommand('insertOrderedList', false);
    } else if (type === 'code_block') {
      document.execCommand('formatBlock', false, '<PRE>');
    }
  }, []);

  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      document.execCommand('createLink', false, url);
    }
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          toggleMark('bold');
          break;
        case 'i':
          e.preventDefault();
          toggleMark('italic');
          break;
        case 'u':
          e.preventDefault();
          toggleMark('underline');
          break;
        case 'e':
          e.preventDefault();
          toggleMark('code');
          break;
        case 'h':
          e.preventDefault();
          toggleMark('highlight');
          break;
      }
    }
    
    if (onKeyDown) {
      onKeyDown(e);
    }
  }, [onKeyDown, toggleMark]);

  return (
    <div className="wysiwyg-editor-container">
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => toggleBlock('p')}
            icon={<Type size={18} />}
            tooltip="Paragraph"
          />
          <ToolbarButton
            onClick={() => toggleBlock('h1')}
            icon={<Heading1 size={18} />}
            tooltip="Heading 1"
          />
          <ToolbarButton
            onClick={() => toggleBlock('h2')}
            icon={<Heading2 size={18} />}
            tooltip="Heading 2"
          />
          <ToolbarButton
            onClick={() => toggleBlock('h3')}
            icon={<Heading3 size={18} />}
            tooltip="Heading 3"
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => toggleMark('bold')}
            icon={<Bold size={18} />}
            tooltip="Bold (Cmd+B)"
          />
          <ToolbarButton
            onClick={() => toggleMark('italic')}
            icon={<Italic size={18} />}
            tooltip="Italic (Cmd+I)"
          />
          <ToolbarButton
            onClick={() => toggleMark('underline')}
            icon={<Underline size={18} />}
            tooltip="Underline (Cmd+U)"
          />
          <ToolbarButton
            onClick={() => toggleMark('strikethrough')}
            icon={<Strikethrough size={18} />}
            tooltip="Strikethrough"
          />
          <ToolbarButton
            onClick={() => toggleMark('code')}
            icon={<Code size={18} />}
            tooltip="Inline Code (Cmd+E)"
          />
          <ToolbarButton
            onClick={() => toggleMark('highlight')}
            icon={<Highlighter size={18} />}
            tooltip="Highlight (Cmd+H)"
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => toggleBlock('ul')}
            icon={<List size={18} />}
            tooltip="Bullet List"
          />
          <ToolbarButton
            onClick={() => toggleBlock('ol')}
            icon={<ListOrdered size={18} />}
            tooltip="Numbered List"
          />
          <ToolbarButton
            onClick={() => toggleBlock('blockquote')}
            icon={<Quote size={18} />}
            tooltip="Blockquote"
          />
          <ToolbarButton
            onClick={() => toggleBlock('code_block')}
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

export default ProperWysiwygEditor;