export interface Note {
  id: string;
  content: string;
  title?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  version: number;
  parent_id?: string;
}

export interface NoteVersion {
  id: string;
  note_id: string;
  content: string;
  version: number;
  created_at: string;
}