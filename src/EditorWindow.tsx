import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { emit } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
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

function EditorWindow() {
  const [note, setNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');

  useEffect(() => {
    // 获取URL参数中的noteId
    const params = new URLSearchParams(window.location.search);
    const noteId = params.get('noteId');
    
    if (noteId) {
      // 从localStorage读取note数据
      const noteData = localStorage.getItem(`note-${noteId}`);
      if (noteData) {
        const parsedNote = JSON.parse(noteData) as Note;
        setNote(parsedNote);
        setContent(parsedNote.text);
      }
    }
  }, []);

  const handleSave = async () => {
    if (note && content.trim()) {
      // 更新note
      const updatedNote: Note = {
        ...note,
        text: content,
        title: content.split('\n')[0].substring(0, 50) || 'Untitled Note',
        time: new Date().toLocaleString()
      };

      // 向主窗口发送更新
      await emit(`note-updated-${note.id}`, updatedNote);
      
      // 更新localStorage
      localStorage.setItem(`note-${note.id}`, JSON.stringify(updatedNote));
      
      // 更新本地状态
      setNote(updatedNote);
    }
  };

  const handleClose = async () => {
    const currentWindow = getCurrentWebviewWindow();
    await currentWindow.close();
  };

  if (!note) {
    return (
      <div className="app-container">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          Loading note...
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <h1>✏️ Edit: {note.title}</h1>
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
      
      <div className="editor-section" style={{ marginTop: '0' }}>
        <div className={`editor-container view-${viewMode}`}>
          {(viewMode === 'edit' || viewMode === 'split') && (
            <div className="editor-pane">
              <textarea
                className="note-input"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Edit your note in Markdown..."
                onKeyDown={(e) => {
                  if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSave();
                  }
                  if (e.key === 'w' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleClose();
                  }
                }}
                autoFocus
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
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          <button 
            className="submit-btn"
            onClick={handleSave}
            disabled={!content.trim()}
            style={{ flex: 1 }}
          >
            Save (⌘+S)
          </button>
          <button 
            className="submit-btn"
            onClick={handleClose}
            style={{ 
              flex: 1,
              background: 'linear-gradient(135deg, #e0e0e0 0%, #bdbdbd 100%)'
            }}
          >
            Close (⌘+W)
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditorWindow;