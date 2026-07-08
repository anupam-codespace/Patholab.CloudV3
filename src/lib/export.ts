// lib/export.ts
import { EditorState } from './types';

export const exportState = (state: EditorState): string => {
  return JSON.stringify(state, null, 2);
};

export const importState = (json: string): EditorState => {
  return JSON.parse(json);
};