import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { Trash2, Star, Pin, X, Play, Edit } from 'lucide-react';
import './App.css';

interface Note {
  id: string;
  text: string;
  title: string;
  time: string;
  tags: string[];
  favorite?: boolean;
  pinned?: boolean;
}

function App() {
  const [content, setContent] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');
  const [resumingNoteId, setResumingNoteId] = useState<string | null>(null);
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

  // 当笔记更新时，滚动到底部（仅当没有pinned notes时）
  useEffect(() => {
    if (notesListRef.current) {
      const container = notesListRef.current.parentElement;
      if (container) {
        const hasPinnedNotes = notes.some(note => note.pinned);
        if (!hasPinnedNotes) {
          container.scrollTop = container.scrollHeight;
        }
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
      
      // 如果正在resume一个note，删除它
      let updatedNotes = notes;
      if (resumingNoteId) {
        updatedNotes = notes.filter(note => note.id !== resumingNoteId);
        setResumingNoteId(null);
      }
      
      setNotes([...updatedNotes, newNote]);
      setContent('');
      
      // 尝试调用后端生成标题
      try {
        const [generatedTitle, generatedTags] = await invoke<[string, string[]]>('generate_title_and_tags', {
          content: content
        });
        newNote.title = generatedTitle;
        newNote.tags = generatedTags;
        setNotes(prev => {
          // 重新计算，因为可能已经删除了resumed note
          const baseNotes = resumingNoteId 
            ? prev.filter(note => note.id !== resumingNoteId)
            : prev;
          return [...baseNotes.slice(0, -1), newNote];
        });
      } catch (error) {
        console.log('Using local title generation');
      }
    }
  };

  const handleDelete = (noteId: string) => {
    setNotes(notes.filter(note => note.id !== noteId));
    // 如果删除的是正在resume的note，清理状态
    if (resumingNoteId === noteId) {
      setResumingNoteId(null);
    }
  };

  const handleFavorite = (noteId: string) => {
    setNotes(notes.map(note => 
      note.id === noteId 
        ? { ...note, favorite: !note.favorite }
        : note
    ));
  };

  const handlePin = (noteId: string) => {
    setNotes(notes.map(note => 
      note.id === noteId 
        ? { ...note, pinned: !note.pinned }
        : note
    ));
  };

  const handleResume = (note: Note) => {
    // 如果已经在resume这个note，取消它
    if (resumingNoteId === note.id) {
      setResumingNoteId(null);
      // 移除编辑器中的resumed内容（从开头移除）
      const separator = '\n\n---\n\n';
      const resumedContent = note.text + separator;
      if (content.startsWith(resumedContent)) {
        setContent(content.slice(resumedContent.length));
      } else if (content === note.text) {
        setContent('');
      }
    } else {
      // 开始resume这个note - 将resumed内容放在前面
      setResumingNoteId(note.id);
      const separator = content.trim() ? '\n\n---\n\n' : '';
      setContent(note.text + separator + content);
    }
  };

  const handleOpenInNewWindow = async (note: Note) => {
    // 将note数据存储到localStorage以便新窗口访问
    localStorage.setItem(`note-${note.id}`, JSON.stringify(note));
    
    // 创建新窗口编辑note
    const webview = new WebviewWindow(`note-editor-${note.id}`, {
      url: `/editor.html?noteId=${note.id}`,
      title: `Edit: ${note.title}`,
      width: 600,
      height: 500,
      resizable: true,
      center: true
    });
    
    // 监听来自编辑窗口的更新
    await listen<Note>(`note-updated-${note.id}`, (event) => {
      const updatedNote = event.payload;
      setNotes(notes.map(n => n.id === updatedNote.id ? updatedNote : n));
    });
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
            [...notes]
              .sort((a, b) => {
                // Pinned notes come first
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                return 0; // Keep original order for same pin status
              })
              .map(note => (
              <div 
                key={note.id} 
                className={`note-item ${resumingNoteId === note.id ? 'resuming' : ''} ${note.favorite ? 'favorite' : ''} ${note.pinned ? 'pinned' : ''}`}
                onClick={() => handleOpenInNewWindow(note)}
                style={{ cursor: 'pointer' }}
              >
                <div className="note-header">
                  <div className="note-title">
                    {note.pinned && <Pin className="icon-inline pinned" size={14} />}
                    {note.favorite && <Star className="icon-inline favorited" size={14} />}
                    {note.title}
                  </div>
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
                  <div className="note-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className={`action-btn pin-btn ${note.pinned ? 'active' : ''}`}
                      onClick={() => handlePin(note.id)}
                      title={note.pinned ? "Unpin note" : "Pin note"}
                    >
                      <Pin size={14} />
                    </button>
                    <button 
                      className={`action-btn favorite-btn ${note.favorite ? 'active' : ''}`}
                      onClick={() => handleFavorite(note.id)}
                      title={note.favorite ? "Unfavorite note" : "Favorite note"}
                    >
                      <Star size={14} />
                    </button>
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => handleDelete(note.id)}
                      title="Delete note"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button 
                      className={`action-btn resume-btn ${resumingNoteId === note.id ? 'cancel' : ''}`}
                      onClick={() => handleResume(note)}
                      title={resumingNoteId === note.id ? "Cancel resume" : "Resume this note"}
                    >
                      {resumingNoteId === note.id ? <X size={14} /> : <Play size={14} />}
                    </button>
                  </div>
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