import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { Play, GitBranch, History, Hash } from 'lucide-react';
import { Note } from '../types';
import './HistoryArea.css';

interface HistoryAreaProps {
  notes: Note[];
  onResume: (note: Note) => void;
  onBranch: (note: Note) => void;
  onShowHistory: (note: Note) => void;
}

function HistoryArea({ notes, onResume, onBranch, onShowHistory }: HistoryAreaProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    return format(date, 'MMM d, yyyy');
  };

  const truncateContent = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  return (
    <div className="history-area">
      <div className="history-header">
        <h2>Recent Notes</h2>
        <span className="note-count">{notes.length}</span>
      </div>
      
      <div className="notes-list">
        <AnimatePresence>
          {notes.map((note, index) => (
            <motion.div
              key={note.id}
              className="note-card"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="note-header">
                <h3 className="note-title">
                  {note.title || 'Untitled Note'}
                </h3>
                <span className="note-time">{formatTime(note.updated_at)}</span>
              </div>
              
              <p className="note-preview">
                {truncateContent(note.content)}
              </p>
              
              <div className="note-footer">
                <div className="note-tags">
                  {note.tags.map((tag, i) => (
                    <span key={i} className="note-tag">
                      <Hash size={10} />
                      {tag}
                    </span>
                  ))}
                </div>
                
                <div className="note-actions">
                  <motion.button
                    className="action-button resume"
                    onClick={() => onResume(note)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Resume writing"
                  >
                    <Play size={14} />
                  </motion.button>
                  
                  <motion.button
                    className="action-button branch"
                    onClick={() => onBranch(note)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="Create branch"
                  >
                    <GitBranch size={14} />
                  </motion.button>
                  
                  <motion.button
                    className="action-button history"
                    onClick={() => onShowHistory(note)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title="View history"
                  >
                    <History size={14} />
                  </motion.button>
                </div>
              </div>
              
              {note.version > 1 && (
                <span className="version-badge">v{note.version}</span>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default HistoryArea;