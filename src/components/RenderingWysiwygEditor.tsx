

import { EditorKit } from '@/components/editor/editor-kit';
import { Editor, EditorContainer } from '@/components/ui/editor';
import { Plate, usePlateEditor } from 'platejs/react';


export default function Page() {
    const editor = usePlateEditor({
    plugins: EditorKit,

  });

  return (
    <Plate editor={editor}>      {/* Provides editor context */}
      <EditorContainer>         {/* Styles the editor area */}
        <Editor placeholder="Type your amazing content here..." />
      </EditorContainer>
    </Plate>
  );
}
