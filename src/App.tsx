import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import {
  WebviewWindow,
  getAllWebviewWindows,
} from "@tauri-apps/api/webviewWindow";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import confetti from "canvas-confetti";
import { Clock, Pin, Play, Send, Star, Trash2, X } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState, useMemo } from "react";
import "./App.css";
import lovpenLogo from "./assets/lovpen-logo.svg";
import RenderingWysiwygEditor from "./components/RenderingWysiwygEditor";

interface Note {
  id: string;
  text: string;
  title: string;
  time: string;
  tags: string[];
  favorite?: boolean;
  pinned?: boolean;
}

// Memoized toolbar button to prevent re-renders
const RecentNotesButton = memo(({ 
  onClick 
}: { 
  onClick: () => void;
}) => (
  <button
    className="toolbar-btn recent-notes-toggle"
    onClick={onClick}
    title="Toggle Recent Notes"
  >
    <Clock size={18} />
  </button>
));

const SendButton = memo(({ 
  disabled, 
  onClick 
}: { 
  disabled: boolean; 
  onClick: () => void;
}) => (
  <button
    className="send-btn"
    onClick={onClick}
    disabled={disabled}
    title="Submit (⌘+Enter)"
  >
    <Send size={18} />
  </button>
));

// Memoized toolbar to prevent any re-renders
const EditorToolbar = memo(({ 
  onToggleNotes,
  onSubmit,
  submitDisabled
}: {
  onToggleNotes: () => void;
  onSubmit: () => void;
  submitDisabled: boolean;
}) => (
  <div className="editor-toolbar">
    <div className="toolbar-left">
      <RecentNotesButton onClick={onToggleNotes} />
    </div>
    <div className="toolbar-right">
      <SendButton disabled={submitDisabled} onClick={onSubmit} />
    </div>
  </div>
));

function App() {
  const [content, setContent] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [viewMode, setViewMode] = useState<
    "edit" | "preview" | "split" | "wysiwyg"
  >("split");
  const [resumingNoteId, setResumingNoteId] = useState<string | null>(null);
  const [showRecentNotes, setShowRecentNotes] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const notesListRef = useRef<HTMLDivElement>(null);
  const baseWindowSize = useRef<{ width: number; height: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isExpandedRef = useRef(false);

  // Calculate note statistics
  const noteStats = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const todayNotes = notes.filter(n => 
      new Date(n.time).toDateString() === today
    );
    
    const weekNotes = notes.filter(n => 
      new Date(n.time) >= weekAgo
    );
    
    // Calculate streak (consecutive days with notes)
    const streak = (() => {
      const sortedDates = [...new Set(notes.map(n => 
        new Date(n.time).toDateString()
      ))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      
      let count = 0;
      const checkDate = new Date();
      
      for (let i = 0; i < 30; i++) {
        if (sortedDates.includes(checkDate.toDateString())) {
          count++;
        } else if (count > 0) {
          break;
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }
      
      return count;
    })();
    
    const totalChars = notes.reduce((acc, n) => acc + n.text.length, 0);
    const avgLength = notes.length > 0 ? Math.round(totalChars / notes.length) : 0;
    
    return {
      total: notes.length,
      today: todayNotes.length,
      favorites: notes.filter(n => n.favorite).length,
      pinned: notes.filter(n => n.pinned).length,
      weekCount: weekNotes.length,
      avgLength,
      streak
    };
  }, [notes]);

  // Set window to expanded size on mount and keep it there
  useEffect(() => {
    const initializeWindow = async () => {
      const appWindow = getCurrentWindow();
      
      // Always keep window at expanded size
      baseWindowSize.current = {
        width: 420,  // Fixed width from tauri.conf.json
        height: 640  // Original height - we'll adjust on first run
      };
      
      // Set window to original size initially (will expand on first use)
      await appWindow.setSize(new LogicalSize(
        baseWindowSize.current.width,
        baseWindowSize.current.height
      ));
      
      console.log('Window initialized at size:', baseWindowSize.current);
    };
    initializeWindow();
  }, []); // Only run once on mount

  useEffect(() => {
    // 监听窗口切换事件
    const unlisten = listen("toggle-window", () => {
      console.log("Window toggled");
    });

    // 监听所有note更新事件（全局监听器）
    console.log("Setting up global note update listener...");
    const unlistenNoteUpdate = listen<Note>(
      "global-note-updated",
      async (event) => {
        const updatedNote = event.payload;
        console.log("Main window received global note update:", updatedNote);
        console.log("Event type:", event.event);
        console.log("Full event:", event);

        // 立即更新UI - 使用函数式更新确保获取最新状态
        setNotes((prevNotes) => {
          console.log("Previous notes count:", prevNotes.length);
          console.log("Previous notes:", prevNotes);
          const existingNoteIndex = prevNotes.findIndex(
            (n) => n.id === updatedNote.id
          );

          if (existingNoteIndex !== -1) {
            // 更新已存在的note
            console.log("Found existing note at index:", existingNoteIndex);
            const newNotes = [...prevNotes];
            newNotes[existingNoteIndex] = updatedNote;
            console.log("Notes after update:", newNotes);
            return newNotes;
          } else {
            // 如果note不存在，可能是新创建的，添加到列表
            console.log("Note not found in list, adding as new");
            return [...prevNotes, updatedNote];
          }
        });

        // 强制重新渲染
        console.log("Update complete, forcing re-render...");
      }
    );

    // 添加键盘快捷键监听（开发者工具）
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + I 打开开发者工具
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "I") {
        e.preventDefault();
        try {
          const { getCurrentWebviewWindow } = await import(
            "@tauri-apps/api/webviewWindow"
          );
          const currentWindow = getCurrentWebviewWindow();
          await invoke("open_devtools", { window: currentWindow });
        } catch (error) {
          console.error("Failed to open devtools:", error);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      unlisten.then((fn) => fn());
      unlistenNoteUpdate.then((fn) => fn());
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // 当笔记更新时，滚动到底部（仅当没有pinned notes时）
  useEffect(() => {
    if (notesListRef.current) {
      const container = notesListRef.current.parentElement;
      if (container) {
        const hasPinnedNotes = notes.some((note) => note.pinned);
        if (!hasPinnedNotes) {
          container.scrollTop = container.scrollHeight;
        }
      }
    }
  }, [notes]);

  // 启动时同步后端存储的notes
  useEffect(() => {
    const syncWithBackend = async () => {
      try {
        const backendNotes = await invoke<Note[]>("get_all_temp_notes");
        console.log("Found notes in backend:", backendNotes.length);

        if (backendNotes.length > 0) {
          // 合并后端的notes到当前状态
          setNotes((prevNotes) => {
            const noteMap = new Map(prevNotes.map((n) => [n.id, n]));

            // 用后端的数据更新或添加notes
            backendNotes.forEach((backendNote) => {
              noteMap.set(backendNote.id, backendNote);
            });

            return Array.from(noteMap.values());
          });
        }
      } catch (error) {
        console.error("Failed to sync with backend:", error);
      }
    };

    syncWithBackend();
  }, []); // 只在组件挂载时运行一次

  const handleSubmit = async () => {
    if (content.trim()) {
      // 生成标题和标签（暂时使用简单逻辑）
      const firstLine = content.split("\n")[0].substring(0, 50);
      const title = firstLine || "Untitled Note";
      const tags = content.includes("#") ? ["markdown"] : ["text"];

      const newNote: Note = {
        id: Date.now().toString(),
        text: content,
        title,
        time: new Date().toLocaleString(),
        tags,
      };

      // 如果正在resume一个note，删除它
      let updatedNotes = notes;
      if (resumingNoteId) {
        updatedNotes = notes.filter((note) => note.id !== resumingNoteId);
        setResumingNoteId(null);
        // 从后端也删除resumed note
        await invoke("remove_temp_note", { id: resumingNoteId });
      }

      setNotes([...updatedNotes, newNote]);
      setContent("");

      // 触发confetti动画
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff3366', '#ff66cc', '#ff99dd', '#9966ff', '#6699ff'],
        ticks: 200,
        gravity: 1.2,
        scalar: 1.2,
        shapes: ['star', 'circle'],
        drift: 0
      });

      // 存储到后端
      await invoke("store_temp_note", { note: newNote });

      // 尝试调用后端生成标题
      try {
        const [generatedTitle, generatedTags] = await invoke<
          [string, string[]]
        >("generate_title_and_tags", {
          content: content,
        });
        newNote.title = generatedTitle;
        newNote.tags = generatedTags;
        setNotes((prev) => {
          // 重新计算，因为可能已经删除了resumed note
          const baseNotes = resumingNoteId
            ? prev.filter((note) => note.id !== resumingNoteId)
            : prev;
          return [...baseNotes.slice(0, -1), newNote];
        });
        // 更新后端存储的note
        await invoke("store_temp_note", { note: newNote });
      } catch (error) {
        console.log("Using local title generation");
      }
    }
  };

  const handleDelete = async (noteId: string) => {
    setNotes(notes.filter((note) => note.id !== noteId));
    // 从后端删除
    await invoke("remove_temp_note", { id: noteId });
    // 如果删除的是正在resume的note，清理状态
    if (resumingNoteId === noteId) {
      setResumingNoteId(null);
    }
  };

  const handleFavorite = async (noteId: string) => {
    const updatedNotes = notes.map((note) =>
      note.id === noteId ? { ...note, favorite: !note.favorite } : note
    );
    setNotes(updatedNotes);
    // 更新后端
    const updatedNote = updatedNotes.find((n) => n.id === noteId);
    if (updatedNote) {
      await invoke("store_temp_note", { note: updatedNote });
    }
  };

  const handlePin = async (noteId: string) => {
    const updatedNotes = notes.map((note) =>
      note.id === noteId ? { ...note, pinned: !note.pinned } : note
    );
    setNotes(updatedNotes);
    // 更新后端
    const updatedNote = updatedNotes.find((n) => n.id === noteId);
    if (updatedNote) {
      await invoke("store_temp_note", { note: updatedNote });
    }
  };

  const handleResume = (note: Note) => {
    // 如果已经在resume这个note，取消它
    if (resumingNoteId === note.id) {
      setResumingNoteId(null);
      // 移除编辑器中的resumed内容（从开头移除）
      const separator = "\n\n---\n\n";
      const resumedContent = note.text + separator;
      if (content.startsWith(resumedContent)) {
        setContent(content.slice(resumedContent.length));
      } else if (content === note.text) {
        setContent("");
      }
    } else {
      // 开始resume这个note - 将resumed内容放在前面
      setResumingNoteId(note.id);
      const separator = content.trim() ? "\n\n---\n\n" : "";
      setContent(note.text + separator + content);
    }
  };

  const handleOpenInNewWindow = async (note: Note) => {
    try {
      // 检查是否已经有打开的窗口
      const windowLabel = `note-editor-${note.id}`;
      const existingWindows = await getAllWebviewWindows();
      const existingWindow = existingWindows.find(
        (w) => w.label === windowLabel
      );

      if (existingWindow) {
        // 如果窗口已存在，聚焦到该窗口
        await existingWindow.setFocus();
        console.log("Focusing existing window for note:", note.id);
        return;
      }

      // 先检查后端是否已有该note的数据（可能是之前保存的）
      let noteToOpen: Note;
      try {
        const backendNote = await invoke<Note | null>("get_temp_note", {
          id: note.id,
        });
        if (backendNote) {
          console.log("Found existing note in backend:", note.id);
          noteToOpen = backendNote;
          // 同步更新主窗口的状态
          setNotes((prevNotes) =>
            prevNotes.map((n) => (n.id === note.id ? backendNote : n))
          );
        } else {
          // 如果后端没有，使用当前的note数据
          noteToOpen = notes.find((n) => n.id === note.id) || note;
          await invoke("store_temp_note", { note: noteToOpen });
          console.log("Stored new note to backend:", note.id);
        }
      } catch (error) {
        console.error("Error checking backend storage:", error);
        // 如果出错，使用当前数据
        noteToOpen = notes.find((n) => n.id === note.id) || note;
        await invoke("store_temp_note", { note: noteToOpen });
      }

      // 在开发环境中使用完整的开发服务器URL
      const isDev = window.location.hostname === "localhost";
      const url = isDev
        ? `http://localhost:1420/editor.html?noteId=${note.id}`
        : `/editor.html?noteId=${note.id}`;

      console.log("Opening window with URL:", url);

      // 创建新窗口编辑note
      const webview = new WebviewWindow(windowLabel, {
        url: url,
        title: `Edit: ${noteToOpen.title}`,
        width: 600,
        height: 500,
        resizable: true,
        center: true,
        alwaysOnTop: true, // 确保编辑窗口在最上层
        focus: true, // 立即获得焦点
        skipTaskbar: false, // 在任务栏显示
      });

      // 确保窗口获得焦点
      await webview.once("tauri://created", async () => {
        await webview.setFocus();
        console.log("Editor window created and focused for note:", note.id);
      });

      // 监听窗口关闭事件（全局监听器会处理更新）
      await webview.once("tauri://destroyed", async () => {
        console.log("Editor window closed for note:", note.id);
      });
    } catch (error) {
      console.error("Failed to open editor window:", error);
      alert(`Failed to open editor window: ${error}`);
    }
  };

  const handleHeaderMouseDown = async () => {
    try {
      const appWindow = getCurrentWindow();
      await appWindow.startDragging();
    } catch (error) {
      console.error("Failed to start dragging:", error);
    }
  };

  // Toggle function - Resize window WITH panel animation
  const handleToggleRecentNotes = useCallback(async () => {
    const appWindow = getCurrentWindow();
    
    if (!panelRef.current || !baseWindowSize.current) {
      console.error('Panel ref or base size not initialized');
      return;
    }
    
    if (!isExpandedRef.current) {
      // Expanding
      isExpandedRef.current = true;
      
      // First resize window
      await appWindow.setSize(new LogicalSize(
        baseWindowSize.current.width,
        baseWindowSize.current.height + 250
      ));
      
      // Then animate panel in
      requestAnimationFrame(() => {
        if (panelRef.current) {
          panelRef.current.classList.remove('hidden', 'collapsed');
          panelRef.current.classList.add('visible');
        }
        document.querySelector('.recent-notes-toggle')?.classList.add('active');
      });
      
    } else {
      // Collapsing
      isExpandedRef.current = false;
      
      // First animate panel out
      if (panelRef.current) {
        panelRef.current.classList.remove('visible');
        panelRef.current.classList.add('collapsed');
      }
      document.querySelector('.recent-notes-toggle')?.classList.remove('active');
      
      // Then resize window after animation completes
      setTimeout(async () => {
        await appWindow.setSize(new LogicalSize(
          baseWindowSize.current!.width,
          baseWindowSize.current!.height
        ));
        
        if (panelRef.current) {
          panelRef.current.classList.add('hidden');
          panelRef.current.classList.remove('collapsed');
        }
      }, 300); // After animation completes
    }
  }, []);

  return (
    <div className="app-container">
      <div 
        className="app-header" 
        onMouseDown={handleHeaderMouseDown}
        style={{ cursor: 'move' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img 
            src={lovpenLogo} 
            alt="LovPen" 
            className="app-logo"
            style={{ height: '20px', width: 'auto' }}
          />
          <h1>LovPen Notes</h1>
        </div>
        <div className="header-stats">
          <span className="header-stat-badge">
            {noteStats.total} {noteStats.total === 1 ? 'note' : 'notes'}
          </span>
          {noteStats.streak > 2 && (
            <span className="header-stat-badge streak-badge" title={`${noteStats.streak} day streak!`}>
              🔥 {noteStats.streak}d
            </span>
          )}
        </div>
      </div>


      <div className="editor-section">
        <div className="editor-area">
          <RenderingWysiwygEditor
            initialContent={content}
            onChange={setContent}
            placeholder="Start writing your note..."
          />
          
          <EditorToolbar
            onToggleNotes={handleToggleRecentNotes}
            onSubmit={handleSubmit}
            submitDisabled={!content.trim()}
          />
        </div>

        {/* Panel always rendered but hidden by default */}
        <div ref={panelRef} className="recent-notes-panel hidden">
            <div className="recent-notes-header">
              <h3>Recent Notes ({notes.length})</h3>
            </div>
            <div className="notes-list" ref={notesListRef}>
              {notes.length === 0 ? (
                <p className="empty-state">No notes yet. Start writing above!</p>
              ) : (
                [...notes]
                  .sort((a, b) => {
                    // Pinned notes come first
                    if (a.pinned && !b.pinned) return -1;
                    if (!a.pinned && b.pinned) return 1;
                    return 0; // Keep original order for same pin status
                  })
                  .map((note) => (
                    <div
                      key={note.id}
                      className={`note-item ${
                        resumingNoteId === note.id ? "resuming" : ""
                      } ${note.favorite ? "favorite" : ""} ${
                        note.pinned ? "pinned" : ""
                      }`}
                      onClick={() => handleOpenInNewWindow(note)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="note-header">
                        <div className="note-title">
                          {note.pinned && (
                            <Pin className="icon-inline pinned" size={14} />
                          )}
                          {note.favorite && (
                            <Star className="icon-inline favorited" size={14} />
                          )}
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
                            <span key={i} className="tag">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <div
                          className="note-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className={`action-btn pin-btn ${
                              note.pinned ? "active" : ""
                            }`}
                            onClick={() => handlePin(note.id)}
                            title={note.pinned ? "Unpin note" : "Pin note"}
                          >
                            <Pin size={14} />
                          </button>
                          <button
                            className={`action-btn favorite-btn ${
                              note.favorite ? "active" : ""
                            }`}
                            onClick={() => handleFavorite(note.id)}
                            title={
                              note.favorite ? "Unfavorite note" : "Favorite note"
                            }
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
                            className={`action-btn resume-btn ${
                              resumingNoteId === note.id ? "cancel" : ""
                            }`}
                            onClick={() => handleResume(note)}
                            title={
                              resumingNoteId === note.id
                                ? "Cancel resume"
                                : "Resume this note"
                            }
                          >
                            {resumingNoteId === note.id ? (
                              <X size={14} />
                            ) : (
                              <Play size={14} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
      </div>
    </div>
  );
}

export default App;
