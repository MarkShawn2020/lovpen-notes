import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import './App.css';

interface Note {
  id: string;
  text: string;
  title: string;
  time: string;
  tags: string[];
}

function App() {
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const notesListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 监听窗口切换事件
    const unlisten = listen('toggle-window', () => {
      console.log('Window toggled');
    });
    
    return () => {
      unlisten.then(fn => fn());
    };
  }, []);

  // 当笔记更新时，滚动到底部
  useEffect(() => {
    if (notesListRef.current) {
      const container = notesListRef.current.parentElement;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [notes]);

  const handleSubmit = async () => {
    if (content.trim()) {
      // 生成标题和标签（暂时使用简单逻辑）
      const firstLine = content.split('\n')[0].substring(0, 50);
      const title = firstLine || 'Untitled Note';
      const tags = content.includes('#') ? ['markdown'] : ['text'];
      
      const newNote: Note = {
        id: Date.now().toString(),
        text: content,
        title,
        time: new Date().toLocaleString(),
        tags
      };
      
      setNotes([...notes, newNote]);
      setContent('');
      
      // 尝试调用后端生成标题
      try {
        const [generatedTitle, generatedTags] = await invoke<[string, string[]]>('generate_title_and_tags', {
          content: content
        });
        newNote.title = generatedTitle;
        newNote.tags = generatedTags;
        setNotes(prev => [...prev.slice(0, -1), newNote]);
      } catch (error) {
        console.log('Using local title generation');
      }
    }
  };

  const handleResume = (note: Note) => {
    const separator = content.trim() ? '\n\n---\n\n' : '';
    setContent(content + separator + note.text);
  };

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>📝 LovPen Notes</h1>
        <div className="view-modes">
          <button 
            className={viewMode === 'edit' ? 'active' : ''}
            onClick={() => setViewMode('edit')}
          >
            Edit
          </button>
          <button 
            className={viewMode === 'split' ? 'active' : ''}
            onClick={() => setViewMode('split')}
          >
            Split
          </button>
          <button 
            className={viewMode === 'preview' ? 'active' : ''}
            onClick={() => setViewMode('preview')}
          >
            Preview
          </button>
        </div>
      </div>
      
      <div className="notes-history">
        <h2>Recent Notes ({notes.length})</h2>
        <div className="notes-list" ref={notesListRef}>
          {notes.length === 0 ? (
            <p className="empty-state">No notes yet. Start writing below!</p>
          ) : (
            notes.map(note => (
              <div key={note.id} className="note-item">
                <div className="note-header">
                  <div className="note-title">{note.title}</div>
                  <div className="note-time">{note.time}</div>
                </div>
                <div className="note-preview">
                  {note.text.substring(0, 100)}...
                </div>
                <div className="note-footer">
                  <div className="note-tags">
                    {note.tags.map((tag, i) => (
                      <span key={i} className="tag">#{tag}</span>
                    ))}
                  </div>
                  <button 
                    className="resume-btn"
                    onClick={() => handleResume(note)}
                    title="Resume this note"
                  >
                    ▶
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="editor-section">
        <div className={`editor-container view-${viewMode}`}>
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className="editor-pane">
              <textarea
                className="note-input"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your note in Markdown...
                
# Heading
**Bold** and *italic*
- List items
[Links](url)"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
            </div>
          )}
          
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className="preview-pane">
              <div className="markdown-preview">
                {content ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {content}
                  </ReactMarkdown>
                ) : (
                  <p className="preview-empty">Preview will appear here...</p>
                )}
              </div>
            </div>
          )}
        </div>
        
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