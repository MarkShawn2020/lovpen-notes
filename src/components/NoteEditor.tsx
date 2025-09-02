import { useCallback, KeyboardEvent } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Send } from 'lucide-react';
import { motion } from 'framer-motion';
import './NoteEditor.css';

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

function NoteEditor({ content, onChange, onSubmit, isSubmitting }: NoteEditorProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSubmit();
    }
  }, [onSubmit]);

  return (
    <div className="note-editor" onKeyDown={handleKeyDown}>
      <div className="editor-wrapper">
        <MDEditor
          value={content}
          onChange={(val) => onChange(val || '')}
          preview="edit"
          hideToolbar
          height={300}
          data-color-mode="light"
          textareaProps={{
            placeholder: "Start writing... (Cmd+Enter to submit)",
            style: {
              fontSize: '14px',
              lineHeight: '1.6',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }
          }}
        />
      </div>
      
      <motion.button
        className="submit-button"
        onClick={onSubmit}
        disabled={!content.trim() || isSubmitting}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Send size={18} />
      </motion.button>
    </div>
  );
}

export default NoteEditor;