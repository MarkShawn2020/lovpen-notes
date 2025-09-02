import { useCallback, useEffect, useRef } from 'react';
import {
  Plate,
  PlateContent,
  usePlateEditor,
} from 'platejs/react';
import { BaseParagraphPlugin } from 'platejs';
import {
  BaseBoldPlugin,
  BaseItalicPlugin,
  BaseUnderlinePlugin,
  BaseStrikethroughPlugin,
  BaseCodePlugin,
  BaseBlockquotePlugin,
  BaseHighlightPlugin,
  BaseH1Plugin,
  BaseH2Plugin,
  BaseH3Plugin,
} from '@platejs/basic-nodes';
import { BaseCodeBlockPlugin } from '@platejs/code-block';
import { BaseListPlugin } from '@platejs/list';
import { BaseLinkPlugin } from '@platejs/link';
import { AutoformatPlugin } from '@platejs/autoformat';
import { deserializeMd } from '@platejs/markdown';
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

interface FixedWysiwygEditorProps {
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

function FixedWysiwygEditor({ value, onChange, placeholder, onKeyDown }: FixedWysiwygEditorProps) {
  const isInternalChange = useRef(false);
  const lastValue = useRef(value);
  
  // Parse initial value
  const getInitialValue = () => {
    if (!value) {
      return [{ type: 'p', children: [{ text: '' }] }];
    }
    
    try {
      // Try to parse markdown
      const editor = usePlateEditor();
      const parsed = deserializeMd(editor, value);
      if (parsed && parsed.length > 0) {
        return parsed;
      }
    } catch (error) {
      console.log('Could not parse as markdown, using plain text');
    }
    
    // Fallback to plain text
    return [{ type: 'p', children: [{ text: value }] }];
  };
  
  // Create editor with plugins
  const editor = usePlateEditor({
    plugins: [
      BaseParagraphPlugin,
      BaseH1Plugin,
      BaseH2Plugin,
      BaseH3Plugin,
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
          rules: [
            // Headings
            {
              mode: 'block',
              type: 'h1',
              match: '# ',
            },
            {
              mode: 'block',
              type: 'h2',
              match: '## ',
            },
            {
              mode: 'block',
              type: 'h3',
              match: '### ',
            },
            // Lists
            {
              mode: 'block',
              type: 'ul',
              match: ['* ', '- '],
            },
            {
              mode: 'block',
              type: 'ol', 
              match: ['1. ', '1) '],
            },
            // Blockquote
            {
              mode: 'block',
              type: 'blockquote',
              match: '> ',
            },
            // Bold
            {
              mode: 'mark',
              type: 'bold',
              match: ['**', '__'],
            },
            // Italic
            {
              mode: 'mark',
              type: 'italic',
              match: ['*', '_'],
            },
            // Code
            {
              mode: 'mark',
              type: 'code',
              match: '`',
            },
            // Strikethrough
            {
              mode: 'mark',
              type: 'strikethrough',
              match: '~~',
            },
            // Highlight
            {
              mode: 'mark',
              type: 'highlight',
              match: '==',
            },
          ],
        },
      }),
    ],
    value: getInitialValue(),
  });

  // Only update editor when value changes from outside
  useEffect(() => {
    if (!isInternalChange.current && value !== lastValue.current) {
      try {
        const parsed = deserializeMd(editor, value);
        if (parsed && parsed.length > 0) {
          editor.children = parsed;
        }
      } catch (error) {
        // If parsing fails, set as plain text
        editor.children = [{ type: 'p', children: [{ text: value }] }];
      }
      lastValue.current = value;
    }
    isInternalChange.current = false;
  }, [value, editor]);

  // Extract text from editor
  const extractText = useCallback((nodes: any[]): string => {
    return nodes
      .map((node: any) => {
        if (node.text !== undefined) {
          let text = node.text;
          if (node.bold) text = `**${text}**`;
          else if (node.italic) text = `*${text}*`;
          else if (node.code) text = `\`${text}\``;
          else if (node.strikethrough) text = `~~${text}~~`;
          else if (node.highlight) text = `==${text}==`;
          else if (node.underline) text = `__${text}__`;
          return text;
        }
        
        if (node.type === 'a' && node.children) {
          const linkText = extractText(node.children);
          return `[${linkText}](${node.url || '#'})`;
        }
        
        let prefix = '';
        let suffix = '';
        
        switch (node.type) {
          case 'h1':
            prefix = '# ';
            break;
          case 'h2':
            prefix = '## ';
            break;
          case 'h3':
            prefix = '### ';
            break;
          case 'blockquote':
            prefix = '> ';
            break;
          case 'ul':
            if (node.children) {
              return node.children
                .map((li: any) => '- ' + extractText(li.children || []))
                .join('\n');
            }
            break;
          case 'ol':
            if (node.children) {
              return node.children
                .map((li: any, idx: number) => `${idx + 1}. ` + extractText(li.children || []))
                .join('\n');
            }
            break;
          case 'li':
            return extractText(node.children || []);
          case 'code_block':
            prefix = '```\n';
            suffix = '\n```';
            break;
        }
        
        if (node.children) {
          return prefix + extractText(node.children) + suffix;
        }
        
        return '';
      })
      .filter(Boolean)
      .join(nodes.some(n => n.type === 'p' || n.type?.startsWith('h')) ? '\n\n' : '\n');
  }, []);

  // Handle editor changes
  const handleChange = useCallback(({ value: editorValue }: any) => {
    isInternalChange.current = true;
    const text = extractText(editorValue);
    lastValue.current = text;
    onChange(text);
  }, [onChange, extractText]);

  // Format functions using document.execCommand for simplicity
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

      <Plate editor={editor} onChange={handleChange}>
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

export default FixedWysiwygEditor;