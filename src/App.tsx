import { useState } from 'react';
import './App.css';

function App() {
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState<Array<{id: string, text: string, time: string}>>([]);

  const handleSubmit = () => {
    if (content.trim()) {
      const newNote = {
        id: Date.now().toString(),
        text: content,
        time: new Date().toLocaleTimeString()
      };
      setNotes([newNote, ...notes]);
      setContent('');
    }
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>LovPen Notes</h1>
      </div>
      
      <div className="notes-history">
        <h2>Recent Notes ({notes.length})</h2>
        <div className="notes-list">
          {notes.length === 0 ? (
            <p className="empty-state">No notes yet. Start writing below!</p>
          ) : (
            notes.map(note => (
              <div key={note.id} className="note-item">
                <div className="note-time">{note.time}</div>
                <div className="note-text">{note.text}</div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="editor-section">
        <textarea
          className="note-input"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your note here..."
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <button 
          className="submit-btn"
          onClick={handleSubmit}
          disabled={!content.trim()}
        >
          Submit (⌘+Enter)
        </button>
      </div>
    </div>
  );
}

export default App;