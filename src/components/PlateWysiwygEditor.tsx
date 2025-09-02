import { useCallback, useEffect, useRef } from 'react';
import {
  Plate,
  PlateContent,
  usePlateEditor,
  ParagraphPlugin,
} from '@platejs/core/react';
import {
  BaseBoldPlugin,
  BaseItalicPlugin,
  BaseUnderlinePlugin,
  BaseStrikethroughPlugin,
  BaseCodePlugin,
  BaseHighlightPlugin,
  BaseBlockquotePlugin,
  BaseH1Plugin,
  BaseH2Plugin,
  BaseH3Plugin,
  BaseH4Plugin,
  BaseH5Plugin,
  BaseH6Plugin,
} from '@platejs/basic-nodes';
import { BaseCodeBlockPlugin } from '@platejs/code-block';
import { BaseListPlugin } from '@platejs/list';
import { BaseLinkPlugin } from '@platejs/link';
import { AutoformatPlugin } from '@platejs/autoformat';
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

interface PlateWysiwygEditorProps {
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

// Autoformat rules for Markdown shortcuts
const autoformatRules = [
  // Headings
  {
    mode: 'block' as const,
    type: 'h1',
    match: '# ',
  },
  {
    mode: 'block' as const,
    type: 'h2',
    match: '## ',
  },
  {
    mode: 'block' as const,
    type: 'h3',
    match: '### ',
  },
  // Lists
  {
    mode: 'block' as const,
    type: 'ul',
    match: ['* ', '- ', '+ '],
  },
  {
    mode: 'block' as const,
    type: 'ol', 
    match: ['1. ', '1) '],
  },
  // Blockquote
  {
    mode: 'block' as const,
    type: 'blockquote',
    match: '> ',
  },
  // Code block
  {
    mode: 'block' as const,
    type: 'code_block',
    match: '```',
    triggerAtBlockStart: false,
  },
  // Bold
  {
    mode: 'mark' as const,
    type: 'bold',
    match: ['**', '__'],
  },
  // Italic
  {
    mode: 'mark' as const,
    type: 'italic',
    match: ['*', '_'],
  },
  // Code
  {
    mode: 'mark' as const,
    type: 'code',
    match: '`',
  },
  // Strikethrough
  {
    mode: 'mark' as const,
    type: 'strikethrough',
    match: '~~',
  },
  // Highlight
  {
    mode: 'mark' as const,
    type: 'highlight',
    match: '==',
  },
];

function PlateWysiwygEditor({ value, onChange, placeholder, onKeyDown }: PlateWysiwygEditorProps) {
  const isInternalChange = useRef(false);
  const lastValue = useRef(value);
  const lastEditorValue = useRef<any>(null);
  const editorRef = useRef<any>(null);
  
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
    plugins: [
      ParagraphPlugin,
      BaseH1Plugin,
      BaseH2Plugin,
      BaseH3Plugin,
      BaseH4Plugin,
      BaseH5Plugin,
      BaseH6Plugin,
      BaseBoldPlugin,
      BaseItalicPlugin,
      BaseUnderlinePlugin,
      BaseStrikethroughPlugin,
      BaseCodePlugin,
      BaseHighlightPlugin,
      BaseBlockquotePlugin,
      BaseCodeBlockPlugin,
      BaseListPlugin,
      BaseLinkPlugin,
      AutoformatPlugin.configure({
        options: {
          rules: autoformatRules,
        },
      }),
    ],
    value: getInitialValue(),
  });

  // Store editor ref for use in callbacks
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

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
            // List item
            if (node.children) {
              return node.children
                .map((child: any) => {
                  if (child.type === 'lic') {
                    return extractMarkdown(child.children || []);
                  }
                  return extractMarkdown([child]);
                })
                .join('');
            }
            break;
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
      const paragraphs = value.split(/\n\n+/).filter(p => p.trim());
      const newValue = paragraphs.length > 0 
        ? paragraphs.map(para => ({
            type: 'p',
            children: [{ text: para }]
          }))
        : [{ type: 'p', children: [{ text: '' }] }];
      
      editor.children = newValue;
      lastValue.current = value;
      lastEditorValue.current = newValue;
    }
    isInternalChange.current = false;
  }, [value, editor]);

  // Formatting functions using Plate editor selection and transforms
  const handleToggleMark = useCallback((mark: string) => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;
    
    // Use execCommand as fallback for marks
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    switch (mark) {
      case 'bold':
        document.execCommand('bold', false);
        break;
      case 'italic':
        document.execCommand('italic', false);
        break;
      case 'underline':
        document.execCommand('underline', false);
        break;
      case 'strikethrough':
        document.execCommand('strikeThrough', false);
        break;
      case 'code':
        // For inline code, wrap in backticks
        const selectedText = selection.toString();
        if (selectedText) {
          document.execCommand('insertText', false, `\`${selectedText}\``);
        }
        break;
      case 'highlight':
        // For highlight, wrap in ==
        const highlightText = selection.toString();
        if (highlightText) {
          document.execCommand('insertText', false, `==${highlightText}==`);
        }
        break;
    }
  }, []);

  const handleToggleBlock = useCallback((type: string) => {
    const currentEditor = editorRef.current;
    if (!currentEditor) return;
    
    // Use execCommand for block formatting
    switch (type) {
      case 'h1':
        document.execCommand('formatBlock', false, '<H1>');
        break;
      case 'h2':
        document.execCommand('formatBlock', false, '<H2>');
        break;
      case 'h3':
        document.execCommand('formatBlock', false, '<H3>');
        break;
      case 'p':
        document.execCommand('formatBlock', false, '<P>');
        break;
      case 'blockquote':
        document.execCommand('formatBlock', false, '<BLOCKQUOTE>');
        break;
      case 'ul':
        document.execCommand('insertUnorderedList', false);
        break;
      case 'ol':
        document.execCommand('insertOrderedList', false);
        break;
      case 'code_block':
        document.execCommand('formatBlock', false, '<PRE>');
        break;
    }
  }, []);

  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url) {
      document.execCommand('createLink', false, url);
    }
  }, []);

  // Check if marks/blocks are active
  const checkMarkActive = useCallback((mark: string) => {
    // Simple check using queryCommandState
    switch (mark) {
      case 'bold':
        return document.queryCommandState('bold');
      case 'italic':
        return document.queryCommandState('italic');
      case 'underline':
        return document.queryCommandState('underline');
      case 'strikethrough':
        return document.queryCommandState('strikeThrough');
      default:
        return false;
    }
  }, []);

  const checkBlockActive = useCallback((type: string) => {
    // Check block type using formatBlock
    const formatBlock = document.queryCommandValue('formatBlock').toLowerCase();
    
    switch (type) {
      case 'h1':
        return formatBlock === 'h1';
      case 'h2':
        return formatBlock === 'h2';
      case 'h3':
        return formatBlock === 'h3';
      case 'p':
        return formatBlock === 'p' || formatBlock === 'div' || formatBlock === '';
      case 'blockquote':
        return formatBlock === 'blockquote';
      case 'ul':
        return document.queryCommandState('insertUnorderedList');
      case 'ol':
        return document.queryCommandState('insertOrderedList');
      case 'code_block':
        return formatBlock === 'pre';
      default:
        return false;
    }
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          handleToggleMark('bold');
          break;
        case 'i':
          e.preventDefault();
          handleToggleMark('italic');
          break;
        case 'u':
          e.preventDefault();
          handleToggleMark('underline');
          break;
        case 'e':
          e.preventDefault();
          handleToggleMark('code');
          break;
        case 'h':
          e.preventDefault();
          handleToggleMark('highlight');
          break;
      }
    }
    
    if (onKeyDown) {
      onKeyDown(e);
    }
  }, [onKeyDown, handleToggleMark]);

  return (
    <div className="wysiwyg-editor-container">
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <ToolbarButton
            active={checkBlockActive('p')}
            onClick={() => handleToggleBlock('p')}
            icon={<Type size={18} />}
            tooltip="Paragraph"
          />
          <ToolbarButton
            active={checkBlockActive('h1')}
            onClick={() => handleToggleBlock('h1')}
            icon={<Heading1 size={18} />}
            tooltip="Heading 1 (# )"
          />
          <ToolbarButton
            active={checkBlockActive('h2')}
            onClick={() => handleToggleBlock('h2')}
            icon={<Heading2 size={18} />}
            tooltip="Heading 2 (## )"
          />
          <ToolbarButton
            active={checkBlockActive('h3')}
            onClick={() => handleToggleBlock('h3')}
            icon={<Heading3 size={18} />}
            tooltip="Heading 3 (### )"
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            active={checkMarkActive('bold')}
            onClick={() => handleToggleMark('bold')}
            icon={<Bold size={18} />}
            tooltip="Bold (Cmd+B or **text**)"
          />
          <ToolbarButton
            active={checkMarkActive('italic')}
            onClick={() => handleToggleMark('italic')}
            icon={<Italic size={18} />}
            tooltip="Italic (Cmd+I or *text*)"
          />
          <ToolbarButton
            active={checkMarkActive('underline')}
            onClick={() => handleToggleMark('underline')}
            icon={<Underline size={18} />}
            tooltip="Underline (Cmd+U)"
          />
          <ToolbarButton
            active={checkMarkActive('strikethrough')}
            onClick={() => handleToggleMark('strikethrough')}
            icon={<Strikethrough size={18} />}
            tooltip="Strikethrough (~~text~~)"
          />
          <ToolbarButton
            active={checkMarkActive('code')}
            onClick={() => handleToggleMark('code')}
            icon={<Code size={18} />}
            tooltip="Inline Code (Cmd+E or `code`)"
          />
          <ToolbarButton
            active={checkMarkActive('highlight')}
            onClick={() => handleToggleMark('highlight')}
            icon={<Highlighter size={18} />}
            tooltip="Highlight (Cmd+H or ==text==)"
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            active={checkBlockActive('ul')}
            onClick={() => handleToggleBlock('ul')}
            icon={<List size={18} />}
            tooltip="Bullet List (- or * )"
          />
          <ToolbarButton
            active={checkBlockActive('ol')}
            onClick={() => handleToggleBlock('ol')}
            icon={<ListOrdered size={18} />}
            tooltip="Numbered List (1. )"
          />
          <ToolbarButton
            active={checkBlockActive('blockquote')}
            onClick={() => handleToggleBlock('blockquote')}
            icon={<Quote size={18} />}
            tooltip="Blockquote (> )"
          />
          <ToolbarButton
            active={checkBlockActive('code_block')}
            onClick={() => handleToggleBlock('code_block')}
            icon={<CodeSquare size={18} />}
            tooltip="Code Block (```)"
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

export default PlateWysiwygEditor;