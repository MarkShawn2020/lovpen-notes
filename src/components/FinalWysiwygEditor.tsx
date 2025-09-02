import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Plate,
  PlateContent,
  usePlateEditor,
} from '@platejs/core/react';
import { 
  Editor,
  Transforms,
  Text,
  Element as SlateElement,
  Range,
} from 'slate';
import { ReactEditor } from 'slate-react';
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

interface FinalWysiwygEditorProps {
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

// Custom element types
const ELEMENT_PARAGRAPH = 'p';
const ELEMENT_H1 = 'h1';
const ELEMENT_H2 = 'h2';
const ELEMENT_H3 = 'h3';
const ELEMENT_BLOCKQUOTE = 'blockquote';
const ELEMENT_CODE = 'code_block';
const ELEMENT_UL = 'ul';
const ELEMENT_OL = 'ol';
const ELEMENT_LI = 'li';
const ELEMENT_LIC = 'lic';

// Mark types
const MARK_BOLD = 'bold';
const MARK_ITALIC = 'italic';
const MARK_UNDERLINE = 'underline';
const MARK_STRIKETHROUGH = 'strikethrough';
const MARK_CODE = 'code';
const MARK_HIGHLIGHT = 'highlight';

function ToolbarButton({ active, onClick, icon, tooltip }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`toolbar-button ${active ? 'active' : ''}`}
      title={tooltip}
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent focus loss
        e.stopPropagation();
      }}
    >
      {icon}
    </button>
  );
}

// Helper functions for formatting
const isMarkActive = (editor: any, format: string) => {
  const marks = Editor.marks(editor as any);
  return marks ? (marks as any)[format] === true : false;
};

const isBlockActive = (editor: any, format: string) => {
  const { selection } = editor;
  if (!selection) return false;

  const [match] = Array.from(
    Editor.nodes(editor as any, {
      at: Editor.unhangRange(editor as any, selection),
      match: n => 
        !Editor.isEditor(n) && 
        SlateElement.isElement(n) && 
        (n as any).type === format,
    })
  );

  return !!match;
};

const toggleMark = (editor: any, format: string) => {
  console.log('Toggling mark:', format);
  const isActive = isMarkActive(editor, format);
  
  if (isActive) {
    Editor.removeMark(editor as any, format);
  } else {
    Editor.addMark(editor as any, format, true);
  }
  
  // Force re-render
  ReactEditor.focus(editor as any);
};

const toggleBlock = (editor: any, format: string) => {
  console.log('Toggling block:', format);
  const isActive = isBlockActive(editor, format);
  const isList = format === ELEMENT_UL || format === ELEMENT_OL;

  Transforms.unwrapNodes(editor as any, {
    match: n =>
      !Editor.isEditor(n) &&
      SlateElement.isElement(n) &&
      ['ul', 'ol'].includes((n as any).type),
    split: true,
  });

  const newProperties: any = {
    type: isActive ? ELEMENT_PARAGRAPH : isList ? ELEMENT_LI : format,
  };

  Transforms.setNodes(editor as any, newProperties);

  if (!isActive && isList) {
    const block = { type: format, children: [] };
    Transforms.wrapNodes(editor as any, block);
  }
  
  ReactEditor.focus(editor as any);
};

function FinalWysiwygEditor({ value, onChange, placeholder, onKeyDown }: FinalWysiwygEditorProps) {
  const isInternalChange = useRef(false);
  const lastValue = useRef(value);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Parse initial value
  const getInitialValue = () => {
    if (!value || value.trim() === '') {
      return [{ type: ELEMENT_PARAGRAPH, children: [{ text: '' }] }];
    }
    
    // Parse markdown-like syntax
    const lines = value.split('\n');
    const blocks: any[] = [];
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        blocks.push({ type: ELEMENT_H1, children: [{ text: line.substring(2) }] });
      } else if (line.startsWith('## ')) {
        blocks.push({ type: ELEMENT_H2, children: [{ text: line.substring(3) }] });
      } else if (line.startsWith('### ')) {
        blocks.push({ type: ELEMENT_H3, children: [{ text: line.substring(4) }] });
      } else if (line.startsWith('> ')) {
        blocks.push({ type: ELEMENT_BLOCKQUOTE, children: [{ text: line.substring(2) }] });
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        blocks.push({
          type: ELEMENT_UL,
          children: [{
            type: ELEMENT_LI,
            children: [{
              type: ELEMENT_LIC,
              children: [{ text: line.substring(2) }]
            }]
          }]
        });
      } else if (line.trim()) {
        // Parse inline formatting
        let text = line;
        const children: any[] = [];
        
        // Simple regex for bold text
        if (text.includes('**')) {
          const parts = text.split('**');
          for (let i = 0; i < parts.length; i++) {
            if (i % 2 === 1 && parts[i]) {
              children.push({ text: parts[i], bold: true });
            } else if (parts[i]) {
              children.push({ text: parts[i] });
            }
          }
        } else {
          children.push({ text });
        }
        
        blocks.push({ type: ELEMENT_PARAGRAPH, children: children.length > 0 ? children : [{ text }] });
      }
    }
    
    return blocks.length > 0 ? blocks : [{ type: ELEMENT_PARAGRAPH, children: [{ text: '' }] }];
  };
  
  // Create editor with ALL necessary plugins
  const editor = usePlateEditor({
    plugins: WysiwygKit, // Use the complete kit with all plugins
    value: getInitialValue(),
  });

  // Extract markdown from editor
  const extractMarkdown = useCallback((nodes: any[]): string => {
    if (!nodes || nodes.length === 0) return '';
    
    return nodes
      .map((node: any) => {
        if (Text.isText(node)) {
          let text = node.text;
          if ((node as any)[MARK_BOLD]) text = `**${text}**`;
          if ((node as any)[MARK_ITALIC]) text = `*${text}*`;
          if ((node as any)[MARK_CODE]) text = `\`${text}\``;
          if ((node as any)[MARK_STRIKETHROUGH]) text = `~~${text}~~`;
          if ((node as any)[MARK_HIGHLIGHT]) text = `==${text}==`;
          return text;
        }
        
        let childrenText = '';
        if (node.children) {
          childrenText = extractMarkdown(node.children);
        }
        
        switch (node.type) {
          case ELEMENT_H1: return `# ${childrenText}`;
          case ELEMENT_H2: return `## ${childrenText}`;
          case ELEMENT_H3: return `### ${childrenText}`;
          case ELEMENT_BLOCKQUOTE: return `> ${childrenText}`;
          case ELEMENT_UL:
            if (node.children) {
              return node.children
                .map((li: any) => {
                  const content = li.children ? extractMarkdown(li.children) : '';
                  return `- ${content}`;
                })
                .join('\n');
            }
            break;
          case ELEMENT_OL:
            if (node.children) {
              return node.children
                .map((li: any, idx: number) => {
                  const content = li.children ? extractMarkdown(li.children) : '';
                  return `${idx + 1}. ${content}`;
                })
                .join('\n');
            }
            break;
          case ELEMENT_LI:
          case ELEMENT_LIC:
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
    if (!isInternalChange.current) {
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
      const newValue = getInitialValue();
      editor.children = newValue;
      lastValue.current = value;
    }
    isInternalChange.current = false;
  }, [value, editor]);

  // Toolbar handlers
  const handleToggleBold = useCallback(() => {
    if (!editor) return;
    console.log('Toggle bold clicked');
    toggleMark(editor, MARK_BOLD);
    setRefreshKey(k => k + 1); // Force refresh
  }, [editor]);

  const handleToggleItalic = useCallback(() => {
    if (!editor) return;
    console.log('Toggle italic clicked');
    toggleMark(editor, MARK_ITALIC);
    setRefreshKey(k => k + 1);
  }, [editor]);

  const handleToggleUnderline = useCallback(() => {
    if (!editor) return;
    console.log('Toggle underline clicked');
    toggleMark(editor, MARK_UNDERLINE);
    setRefreshKey(k => k + 1);
  }, [editor]);

  const handleToggleStrikethrough = useCallback(() => {
    if (!editor) return;
    console.log('Toggle strikethrough clicked');
    toggleMark(editor, MARK_STRIKETHROUGH);
    setRefreshKey(k => k + 1);
  }, [editor]);

  const handleToggleCode = useCallback(() => {
    if (!editor) return;
    console.log('Toggle code clicked');
    toggleMark(editor, MARK_CODE);
    setRefreshKey(k => k + 1);
  }, [editor]);

  const handleToggleHighlight = useCallback(() => {
    if (!editor) return;
    console.log('Toggle highlight clicked');
    toggleMark(editor, MARK_HIGHLIGHT);
    setRefreshKey(k => k + 1);
  }, [editor]);

  const handleToggleHeading = useCallback((level: string) => {
    if (!editor) return;
    console.log('Toggle heading clicked:', level);
    toggleBlock(editor, level);
    setRefreshKey(k => k + 1);
  }, [editor]);

  const handleToggleList = useCallback((type: string) => {
    if (!editor) return;
    console.log('Toggle list clicked:', type);
    toggleBlock(editor, type);
    setRefreshKey(k => k + 1);
  }, [editor]);

  const handleToggleBlockquote = useCallback(() => {
    if (!editor) return;
    console.log('Toggle blockquote clicked');
    toggleBlock(editor, ELEMENT_BLOCKQUOTE);
    setRefreshKey(k => k + 1);
  }, [editor]);

  const handleToggleCodeBlock = useCallback(() => {
    if (!editor) return;
    console.log('Toggle code block clicked');
    toggleBlock(editor, ELEMENT_CODE);
    setRefreshKey(k => k + 1);
  }, [editor]);

  const insertLink = useCallback(() => {
    const url = prompt('Enter URL:');
    if (url && editor) {
      const { selection } = editor;
      const isCollapsed = selection && Range.isCollapsed(selection);
      const text = isCollapsed ? url : '';
      
      Transforms.insertNodes(editor as any, {
        type: 'a',
        url,
        children: [{ text }],
      } as any);
      
      ReactEditor.focus(editor as any);
      setRefreshKey(k => k + 1);
    }
  }, [editor]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!editor) return;
    
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          handleToggleBold();
          break;
        case 'i':
          e.preventDefault();
          handleToggleItalic();
          break;
        case 'u':
          e.preventDefault();
          handleToggleUnderline();
          break;
        case 'e':
          e.preventDefault();
          handleToggleCode();
          break;
        case 'h':
          e.preventDefault();
          handleToggleHighlight();
          break;
      }
    }
    
    // Markdown shortcuts
    if (e.key === ' ') {
      const { selection } = editor;
      if (selection && Range.isCollapsed(selection)) {
        const [match] = Array.from(
          Editor.nodes(editor as any, {
            at: selection,
            match: n => Text.isText(n),
          })
        );
        
        if (match) {
          const [node, path] = match;
          const text = (node as any).text;
          const start = Range.start(selection);
          const beforeText = text.substring(0, start.offset);
          
          // Check for markdown patterns
          if (beforeText === '#') {
            e.preventDefault();
            Transforms.delete(editor as any, { at: selection, distance: 1, reverse: true });
            toggleBlock(editor, ELEMENT_H1);
          } else if (beforeText === '##') {
            e.preventDefault();
            Transforms.delete(editor as any, { at: selection, distance: 2, reverse: true });
            toggleBlock(editor, ELEMENT_H2);
          } else if (beforeText === '###') {
            e.preventDefault();
            Transforms.delete(editor as any, { at: selection, distance: 3, reverse: true });
            toggleBlock(editor, ELEMENT_H3);
          } else if (beforeText === '-' || beforeText === '*') {
            e.preventDefault();
            Transforms.delete(editor as any, { at: selection, distance: 1, reverse: true });
            toggleBlock(editor, ELEMENT_UL);
          } else if (beforeText === '>') {
            e.preventDefault();
            Transforms.delete(editor as any, { at: selection, distance: 1, reverse: true });
            toggleBlock(editor, ELEMENT_BLOCKQUOTE);
          }
        }
      }
    }
    
    if (onKeyDown) {
      onKeyDown(e);
    }
  }, [editor, onKeyDown, handleToggleBold, handleToggleItalic, handleToggleUnderline, handleToggleCode, handleToggleHighlight]);

  // Check active states
  const isBoldActive = editor ? isMarkActive(editor, MARK_BOLD) : false;
  const isItalicActive = editor ? isMarkActive(editor, MARK_ITALIC) : false;
  const isUnderlineActive = editor ? isMarkActive(editor, MARK_UNDERLINE) : false;
  const isStrikethroughActive = editor ? isMarkActive(editor, MARK_STRIKETHROUGH) : false;
  const isCodeActive = editor ? isMarkActive(editor, MARK_CODE) : false;
  const isHighlightActive = editor ? isMarkActive(editor, MARK_HIGHLIGHT) : false;
  
  const isH1Active = editor ? isBlockActive(editor, ELEMENT_H1) : false;
  const isH2Active = editor ? isBlockActive(editor, ELEMENT_H2) : false;
  const isH3Active = editor ? isBlockActive(editor, ELEMENT_H3) : false;
  const isParagraphActive = editor ? isBlockActive(editor, ELEMENT_PARAGRAPH) : false;
  const isBlockquoteActive = editor ? isBlockActive(editor, ELEMENT_BLOCKQUOTE) : false;
  const isCodeBlockActive = editor ? isBlockActive(editor, ELEMENT_CODE) : false;
  const isULActive = editor ? isBlockActive(editor, ELEMENT_UL) : false;
  const isOLActive = editor ? isBlockActive(editor, ELEMENT_OL) : false;

  return (
    <div className="wysiwyg-editor-container" key={refreshKey}>
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <ToolbarButton
            active={isParagraphActive}
            onClick={() => handleToggleHeading(ELEMENT_PARAGRAPH)}
            icon={<Type size={18} />}
            tooltip="Paragraph"
          />
          <ToolbarButton
            active={isH1Active}
            onClick={() => handleToggleHeading(ELEMENT_H1)}
            icon={<Heading1 size={18} />}
            tooltip="Heading 1 (# )"
          />
          <ToolbarButton
            active={isH2Active}
            onClick={() => handleToggleHeading(ELEMENT_H2)}
            icon={<Heading2 size={18} />}
            tooltip="Heading 2 (## )"
          />
          <ToolbarButton
            active={isH3Active}
            onClick={() => handleToggleHeading(ELEMENT_H3)}
            icon={<Heading3 size={18} />}
            tooltip="Heading 3 (### )"
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            active={isBoldActive}
            onClick={handleToggleBold}
            icon={<Bold size={18} />}
            tooltip="Bold (Cmd+B)"
          />
          <ToolbarButton
            active={isItalicActive}
            onClick={handleToggleItalic}
            icon={<Italic size={18} />}
            tooltip="Italic (Cmd+I)"
          />
          <ToolbarButton
            active={isUnderlineActive}
            onClick={handleToggleUnderline}
            icon={<Underline size={18} />}
            tooltip="Underline (Cmd+U)"
          />
          <ToolbarButton
            active={isStrikethroughActive}
            onClick={handleToggleStrikethrough}
            icon={<Strikethrough size={18} />}
            tooltip="Strikethrough"
          />
          <ToolbarButton
            active={isCodeActive}
            onClick={handleToggleCode}
            icon={<Code size={18} />}
            tooltip="Inline Code (Cmd+E)"
          />
          <ToolbarButton
            active={isHighlightActive}
            onClick={handleToggleHighlight}
            icon={<Highlighter size={18} />}
            tooltip="Highlight (Cmd+H)"
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            active={isULActive}
            onClick={() => handleToggleList(ELEMENT_UL)}
            icon={<List size={18} />}
            tooltip="Bullet List (- or *)"
          />
          <ToolbarButton
            active={isOLActive}
            onClick={() => handleToggleList(ELEMENT_OL)}
            icon={<ListOrdered size={18} />}
            tooltip="Numbered List"
          />
          <ToolbarButton
            active={isBlockquoteActive}
            onClick={handleToggleBlockquote}
            icon={<Quote size={18} />}
            tooltip="Blockquote (>)"
          />
          <ToolbarButton
            active={isCodeBlockActive}
            onClick={handleToggleCodeBlock}
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

export default FinalWysiwygEditor;