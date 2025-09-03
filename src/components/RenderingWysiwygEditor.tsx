

import { EditorKit } from '@/components/editor/editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { Plate, usePlateEditor, useEditorValue } from 'platejs/react';
import { useEffect } from 'react';

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
    const editor = usePlateEditor({
    plugins: EditorKit,
    value: initialContent ? [
      {
        type: 'p',
        children: [{ text: initialContent }],
      },
    ] : undefined,
  });

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

  return (
    <div className="h-full w-full flex flex-col">
      <Plate editor={editor}>
          <EditorContainer className="h-full w-full flex flex-col flex-1">
            <Editor 
              placeholder={placeholder}
              variant="none"
              className="h-full w-full flex-1 px-8 py-2 outline-none"
            />
          </EditorContainer>
      </Plate>
    </div>
  );
}
