import { useCallback, useEffect, useState } from 'react';
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

interface RealWysiwygEditorProps {
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

function RealWysiwygEditor({ value, onChange, placeholder, onKeyDown }: RealWysiwygEditorProps) {
  const [editorKey, setEditorKey] = useState(0);
  
  // Create editor with all necessary plugins
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
            // Code block
            {
              mode: 'block',
              type: 'code_block',
              match: '```',
              triggerAtBlockStart: false,
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
    // Initialize with parsed content
    value: parseMarkdownToSlate(value),
  });

  // Parse markdown-like text to Slate format
  function parseMarkdownToSlate(text: string): any[] {
    if (!text) {
      return [{ type: 'p', children: [{ text: '' }] }];
    }

    const lines = text.split('\n');
    const blocks: any[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line.trim() && blocks.length > 0) {
        continue;
      }
      
      // Headings
      if (line.startsWith('# ')) {
        blocks.push({
          type: 'h1',
          children: [{ text: line.substring(2) }],
        });
      } else if (line.startsWith('## ')) {
        blocks.push({
          type: 'h2',
          children: [{ text: line.substring(3) }],
        });
      } else if (line.startsWith('### ')) {
        blocks.push({
          type: 'h3',
          children: [{ text: line.substring(4) }],
        });
      }
      // Blockquote
      else if (line.startsWith('> ')) {
        blocks.push({
          type: 'blockquote',
          children: [{ text: line.substring(2) }],
        });
      }
      // Lists
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        blocks.push({
          type: 'ul',
          children: [{
            type: 'li',
            children: [{ text: line.substring(2) }],
          }],
        });
      }
      else if (/^\d+\.\s/.test(line)) {
        const text = line.replace(/^\d+\.\s/, '');
        blocks.push({
          type: 'ol',
          children: [{
            type: 'li',
            children: [{ text }],
          }],
        });
      }
      // Regular paragraph
      else {
        blocks.push({
          type: 'p',
          children: parseInlineMarks(line),
        });
      }
    }
    
    return blocks.length > 0 ? blocks : [{ type: 'p', children: [{ text: '' }] }];
  }

  // Parse inline marks (bold, italic, etc.)
  function parseInlineMarks(text: string): any[] {
    const children: any[] = [];
    let current = '';
    let i = 0;
    
    while (i < text.length) {
      // Check for bold
      if (text.substring(i, i + 2) === '**' || text.substring(i, i + 2) === '__') {
        if (current) {
          children.push({ text: current });
          current = '';
        }
        const marker = text.substring(i, i + 2);
        const endIndex = text.indexOf(marker, i + 2);
        if (endIndex !== -1) {
          const boldText = text.substring(i + 2, endIndex);
          children.push({ text: boldText, bold: true });
          i = endIndex + 2;
          continue;
        }
      }
      // Check for italic
      else if ((text[i] === '*' || text[i] === '_') && text[i + 1] !== text[i]) {
        if (current) {
          children.push({ text: current });
          current = '';
        }
        const marker = text[i];
        const endIndex = text.indexOf(marker, i + 1);
        if (endIndex !== -1) {
          const italicText = text.substring(i + 1, endIndex);
          children.push({ text: italicText, italic: true });
          i = endIndex + 1;
          continue;
        }
      }
      // Check for code
      else if (text[i] === '`') {
        if (current) {
          children.push({ text: current });
          current = '';
        }
        const endIndex = text.indexOf('`', i + 1);
        if (endIndex !== -1) {
          const codeText = text.substring(i + 1, endIndex);
          children.push({ text: codeText, code: true });
          i = endIndex + 1;
          continue;
        }
      }
      // Check for strikethrough
      else if (text.substring(i, i + 2) === '~~') {
        if (current) {
          children.push({ text: current });
          current = '';
        }
        const endIndex = text.indexOf('~~', i + 2);
        if (endIndex !== -1) {
          const strikeText = text.substring(i + 2, endIndex);
          children.push({ text: strikeText, strikethrough: true });
          i = endIndex + 2;
          continue;
        }
      }
      
      current += text[i];
      i++;
    }
    
    if (current) {
      children.push({ text: current });
    }
    
    return children.length > 0 ? children : [{ text: '' }];
  }

  // Update editor value when prop changes
  useEffect(() => {
    if (value !== extractTextFromEditor()) {
      const newValue = parseMarkdownToSlate(value);
      editor.children = newValue;
      setEditorKey(k => k + 1); // Force re-render
    }
  }, [value]);

  // Extract text from editor (simplified)
  const extractTextFromEditor = useCallback(() => {
    return editor.children
      .map((block: any) => {
        if (block.type === 'h1') return '# ' + extractInlineText(block.children);
        if (block.type === 'h2') return '## ' + extractInlineText(block.children);
        if (block.type === 'h3') return '### ' + extractInlineText(block.children);
        if (block.type === 'blockquote') return '> ' + extractInlineText(block.children);
        if (block.type === 'ul') {
          return block.children
            .map((li: any) => '- ' + extractInlineText(li.children))
            .join('\n');
        }
        if (block.type === 'ol') {
          return block.children
            .map((li: any, idx: number) => `${idx + 1}. ` + extractInlineText(li.children))
            .join('\n');
        }
        return extractInlineText(block.children);
      })
      .filter(Boolean)
      .join('\n');
  }, [editor.children]);

  // Extract inline text with marks
  const extractInlineText = (children: any[]): string => {
    return children.map((child: any) => {
      if (child.text !== undefined) {
        let text = child.text;
        if (child.bold) text = `**${text}**`;
        else if (child.italic) text = `*${text}*`;
        else if (child.code) text = `\`${text}\``;
        else if (child.strikethrough) text = `~~${text}~~`;
        else if (child.highlight) text = `==${text}==`;
        return text;
      }
      if (child.type === 'a' && child.children) {
        return `[${extractInlineText(child.children)}](${child.url || '#'})`;
      }
      if (child.children) {
        return extractInlineText(child.children);
      }
      return '';
    }).join('');
  };

  // Handle changes
  const handleChange = useCallback(() => {
    const text = extractTextFromEditor();
    onChange(text);
  }, [extractTextFromEditor, onChange]);

  // Formatting commands using execCommand (fallback approach)
  const applyFormat = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    setTimeout(handleChange, 0);
  }, [handleChange]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          applyFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          applyFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          applyFormat('underline');
          break;
      }
    }
    
    if (onKeyDown) {
      onKeyDown(e);
    }
  }, [onKeyDown, applyFormat]);

  return (
    <div className="wysiwyg-editor-container">
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => applyFormat('formatBlock', '<p>')}
            icon={<Type size={18} />}
            tooltip="Paragraph"
          />
          <ToolbarButton
            onClick={() => applyFormat('formatBlock', '<h1>')}
            icon={<Heading1 size={18} />}
            tooltip="Heading 1"
          />
          <ToolbarButton
            onClick={() => applyFormat('formatBlock', '<h2>')}
            icon={<Heading2 size={18} />}
            tooltip="Heading 2"
          />
          <ToolbarButton
            onClick={() => applyFormat('formatBlock', '<h3>')}
            icon={<Heading3 size={18} />}
            tooltip="Heading 3"
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => applyFormat('bold')}
            icon={<Bold size={18} />}
            tooltip="Bold (Cmd+B)"
          />
          <ToolbarButton
            onClick={() => applyFormat('italic')}
            icon={<Italic size={18} />}
            tooltip="Italic (Cmd+I)"
          />
          <ToolbarButton
            onClick={() => applyFormat('underline')}
            icon={<Underline size={18} />}
            tooltip="Underline (Cmd+U)"
          />
          <ToolbarButton
            onClick={() => applyFormat('strikethrough')}
            icon={<Strikethrough size={18} />}
            tooltip="Strikethrough"
          />
          <ToolbarButton
            onClick={() => {
              const selection = window.getSelection();
              if (selection && selection.toString()) {
                document.execCommand('insertHTML', false, `<code>${selection.toString()}</code>`);
                handleChange();
              }
            }}
            icon={<Code size={18} />}
            tooltip="Inline Code"
          />
          <ToolbarButton
            onClick={() => {
              const selection = window.getSelection();
              if (selection && selection.toString()) {
                document.execCommand('insertHTML', false, `<mark>${selection.toString()}</mark>`);
                handleChange();
              }
            }}
            icon={<Highlighter size={18} />}
            tooltip="Highlight"
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => applyFormat('insertUnorderedList')}
            icon={<List size={18} />}
            tooltip="Bullet List"
          />
          <ToolbarButton
            onClick={() => applyFormat('insertOrderedList')}
            icon={<ListOrdered size={18} />}
            tooltip="Numbered List"
          />
          <ToolbarButton
            onClick={() => applyFormat('formatBlock', '<blockquote>')}
            icon={<Quote size={18} />}
            tooltip="Blockquote"
          />
          <ToolbarButton
            onClick={() => applyFormat('formatBlock', '<pre>')}
            icon={<CodeSquare size={18} />}
            tooltip="Code Block"
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => {
              const url = prompt('Enter URL:');
              if (url) {
                applyFormat('createLink', url);
              }
            }}
            icon={<Link size={18} />}
            tooltip="Insert Link"
          />
        </div>
      </div>

      <Plate 
        key={editorKey}
        editor={editor} 
        onChange={handleChange}
      >
        <PlateContent
          className="wysiwyg-content"
          placeholder={placeholder || "Start writing..."}
          onKeyDown={handleKeyDown}
          autoFocus
          contentEditable
          suppressContentEditableWarning
        />
      </Plate>
    </div>
  );
}

export default RealWysiwygEditor;