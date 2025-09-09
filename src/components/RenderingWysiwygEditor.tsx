

import { EditorKit } from '@/components/editor/editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { Plate, usePlateEditor, useEditorValue } from 'platejs/react';
import { useEffect, useRef } from 'react';
import { ReactEditor } from 'slate-react';
import { Transforms, Editor as SlateEditor } from 'slate';

interface RenderingWysiwygEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
}

export default function RenderingWysiwygEditor({ 
  initialContent = '', 
  onChange,
  placeholder = "Type your amazing content here..." 
}: RenderingWysiwygEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editor = usePlateEditor({
    plugins: EditorKit,
    value: initialContent ? [
      {
        type: 'p',
        children: [{ text: initialContent }],
      },
    ] : undefined,
  });

  // Reset editor when initialContent becomes empty
  useEffect(() => {
    if (editor && initialContent === '') {
      // Clear the editor content
      editor.children = [
        {
          type: 'p',
          children: [{ text: '' }],
        },
      ];
      if (typeof editor.onChange === 'function') {
        editor.onChange();
      }
    }
  }, [initialContent, editor]);

  // Handle content changes
  useEffect(() => {
    if (onChange && editor) {
      const handleChange = () => {
        const content = editor.children
          .map((node: any) => 
            node.children?.map((child: any) => child.text).join('') || ''
          )
          .join('\n');
        onChange(content);
      };

      // Listen for editor changes
      editor.onChange = handleChange;
    }
  }, [editor, onChange]);

  // Handle clicks on the editor container to focus at the end
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if the click is on the container itself or empty space
    const target = e.target as HTMLElement;
    
    // Check if we clicked on empty space (no content element)
    const isEmptyAreaClick = !target.closest('[data-slate-node]') && 
                             !target.closest('[data-slate-editor]');
    
    if (isEmptyAreaClick && editor) {
      // Focus the editor
      ReactEditor.focus(editor as any);
      
      // Move cursor to the end of the last block
      const lastPath = [editor.children.length - 1];
      const end = SlateEditor.end(editor as any, lastPath);
      
      Transforms.select(editor as any, {
        anchor: end,
        focus: end
      });
    }
  };

  return (
    <div 
      ref={containerRef}
      className="h-full w-full flex flex-col"
      onClick={handleContainerClick}
    >
      <Plate editor={editor}>
          <EditorContainer className="h-full w-full flex flex-col flex-1">
            <Editor 
              placeholder={placeholder}
              variant="none"
              className="h-full w-full flex-1 px-8 py-2 outline-none caret-primary select-text selection:bg-brand/25"
            />
          </EditorContainer>
      </Plate>
    </div>
  );
}
