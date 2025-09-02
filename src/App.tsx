import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { motion } from 'framer-motion';
import NoteEditor from './components/NoteEditor';
import HistoryArea from './components/HistoryArea';
import { useDatabase } from './hooks/useDatabase';
import { Note } from './types';
import './App.css';

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentContent, setCurrentContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const db = useDatabase();

  useEffect(() => {
    if (db.isReady) {
      loadRecentNotes();
    }
  }, [db.isReady]);

  useEffect(() => {
    const unlisten = listen('toggle-window', () => {
      // Window toggle is handled in Rust, this is just for any UI updates
    });
    
    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  const loadRecentNotes = async () => {
    try {
      const recentNotes = await db.getRecentNotes(3);
      setNotes(recentNotes);
    } catch (error) {
      console.error('Failed to load recent notes:', error);
    }
  };

  const handleSubmit = async () => {
    if (!currentContent.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      // Generate title and tags using LLM
      const [title, tags] = await invoke<[string, string[]]>('generate_title_and_tags', {
        content: currentContent
      });
      
      // Create the note
      const newNote = await db.createNote(currentContent, title, tags);
      
      // Update the notes list
      setNotes(prev => [newNote, ...prev]);
      setCurrentContent('');
    } catch (error) {
      console.error('Failed to create note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResume = async (note: Note) => {
    const separator = currentContent.trim() ? '\n\n---\n\n' : '';
    setCurrentContent(currentContent + separator + note.content);
    
    try {
      await db.resumeNote(note.id);
      await loadRecentNotes();
    } catch (error) {
      console.error('Failed to resume note:', error);
    }
  };

  const handleBranch = async (note: Note) => {
    try {
      const branchedNote = await db.branchNote(note.id);
      setNotes(prev => [branchedNote, ...prev]);
      setCurrentContent(note.content);
    } catch (error) {
      console.error('Failed to branch note:', error);
    }
  };

  const handleShowHistory = async (note: Note) => {
    // TODO: Implement history modal
    console.log('Show history for note:', note.id);
    const history = await db.getNoteHistory(note.id);
    console.log('Note history:', history);
  };

  return (
    <div className="app-container">
      <motion.div 
        className="window-content"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="window-header">
          <h1 className="app-title">LovPen Notes</h1>
        </div>
        
        <HistoryArea
          notes={notes}
          onResume={handleResume}
          onBranch={handleBranch}
          onShowHistory={handleShowHistory}
        />
        
        <NoteEditor
          content={currentContent}
          onChange={setCurrentContent}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </motion.div>
    </div>
  );
}

export default App;