import { useEffect, useState } from 'react';
import { Store } from '@tauri-apps/plugin-store';
import { Note, NoteVersion } from '../types';

const store = new Store('notes.dat');

export function useDatabase() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    store.load().then(() => setIsReady(true));
  }, []);

  const createNote = async (content: string, title?: string, tags: string[] = []): Promise<Note> => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    
    const note: Note = {
      id,
      content,
      title,
      tags,
      created_at: now,
      updated_at: now,
      version: 1,
      parent_id: undefined
    };
    
    // Get existing notes
    const notes = (await store.get('notes')) as Note[] || [];
    notes.unshift(note);
    
    // Save notes
    await store.set('notes', notes);
    await store.save();
    
    // Save version history
    const version: NoteVersion = {
      id: crypto.randomUUID(),
      note_id: id,
      content,
      version: 1,
      created_at: now
    };
    
    const versions = (await store.get('versions')) as NoteVersion[] || [];
    versions.push(version);
    await store.set('versions', versions);
    await store.save();
    
    return note;
  };

  const getRecentNotes = async (days: number = 3): Promise<Note[]> => {
    const notes = (await store.get('notes')) as Note[] || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return notes.filter(note => 
      new Date(note.updated_at) >= cutoffDate
    ).sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  };

  const resumeNote = async (noteId: string): Promise<void> => {
    const notes = (await store.get('notes')) as Note[] || [];
    const noteIndex = notes.findIndex(n => n.id === noteId);
    
    if (noteIndex !== -1) {
      notes[noteIndex].updated_at = new Date().toISOString();
      await store.set('notes', notes);
      await store.save();
    }
  };

  const branchNote = async (noteId: string): Promise<Note> => {
    const notes = (await store.get('notes')) as Note[] || [];
    const originalNote = notes.find(n => n.id === noteId);
    
    if (!originalNote) {
      throw new Error('Note not found');
    }
    
    const now = new Date().toISOString();
    const newId = crypto.randomUUID();
    const newVersion = originalNote.version + 1;
    
    const branchedNote: Note = {
      id: newId,
      content: originalNote.content,
      title: originalNote.title,
      tags: originalNote.tags,
      created_at: now,
      updated_at: now,
      version: newVersion,
      parent_id: noteId
    };
    
    notes.unshift(branchedNote);
    await store.set('notes', notes);
    await store.save();
    
    // Save version history
    const version: NoteVersion = {
      id: crypto.randomUUID(),
      note_id: newId,
      content: originalNote.content,
      version: newVersion,
      created_at: now
    };
    
    const versions = (await store.get('versions')) as NoteVersion[] || [];
    versions.push(version);
    await store.set('versions', versions);
    await store.save();
    
    return branchedNote;
  };

  const getNoteHistory = async (noteId: string): Promise<NoteVersion[]> => {
    const versions = (await store.get('versions')) as NoteVersion[] || [];
    return versions
      .filter(v => v.note_id === noteId)
      .sort((a, b) => b.version - a.version);
  };

  return {
    isReady,
    createNote,
    getRecentNotes,
    resumeNote,
    branchNote,
    getNoteHistory
  };
}