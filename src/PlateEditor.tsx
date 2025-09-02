import { useCallback, useEffect, useState } from 'react';
import {
  Plate,
  PlateContent,
  usePlateEditor,
} from 'platejs/react';
import { 
  BaseBoldPlugin,
  BaseItalicPlugin,
  BaseUnderlinePlugin,
  BaseStrikethroughPlugin,
  BaseCodePlugin,
  BaseHeadingPlugin,
  BaseBlockquotePlugin
} from '@platejs/basic-nodes';
import { BaseParagraphPlugin } from 'platejs';
import { BaseCodeBlockPlugin } from '@platejs/code-block';
import { BaseListPlugin } from '@platejs/list';
import { BaseLinkPlugin } from '@platejs/link';
import { AutoformatPlugin } from '@platejs/autoformat';
import { deserializeMd, serializeMd } from '@platejs/markdown';
import './PlateEditor.css';

interface PlateEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

function PlateEditor({ value, onChange, placeholder, onKeyDown }: PlateEditorProps) {
  const [initialValue, setInitialValue] = useState<any[]>([]);

  // Create editor with plugins
  const editor = usePlateEditor({
    plugins: [
      BaseParagraphPlugin,
      BaseHeadingPlugin,
      BaseBoldPlugin,
      BaseItalicPlugin,
      BaseUnderlinePlugin,
      BaseStrikethroughPlugin,
      BaseCodePlugin,
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
          ],
        },
      }),
    ],
    value: initialValue,
  });

  // Parse markdown to Slate value on mount and when value changes
  useEffect(() => {
    if (value) {
      try {
        const parsed = deserializeMd(editor, value);
        setInitialValue(parsed);
      } catch (error) {
        console.error('Error parsing markdown:', error);
        setInitialValue([{ type: 'p', children: [{ text: value }] }]);
      }
    } else {
      setInitialValue([{ type: 'p', children: [{ text: '' }] }]);
    }
  }, [value, editor]);

  // Handle value changes
  useEffect(() => {
    try {
      // Serialize to markdown
      const markdown = serializeMd(editor);
      onChange(markdown);
    } catch (error) {
      console.error('Error serializing to markdown:', error);
    }
  }, [editor.children, onChange, editor]);

  // Handle keyboard events
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Pass through to parent if needed
    if (onKeyDown) {
      onKeyDown(e);
    }
  }, [onKeyDown]);

  return (
    <div className="plate-editor-container">
      <Plate editor={editor}>
        <PlateContent
          className="plate-content"
          placeholder={placeholder || "Start writing..."}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </Plate>
    </div>
  );
}

export default PlateEditor;