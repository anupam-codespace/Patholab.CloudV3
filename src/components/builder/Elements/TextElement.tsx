import React, { useState, useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { FontFamily } from "@tiptap/extension-font-family";
import { TextElement as TextType } from "@/lib/types";
import { useEditorStore } from "@/store/useEditorStore";

// Extensions needed for full formatting
const extensions = [
  StarterKit.configure({
    heading: false, // we don't need headings for a single text block
  }),
  TextAlign.configure({
    types: ["paragraph", "heading"],
  }),
  Underline,
  TextStyle,
  Color,
  FontFamily,
];

export default function TextElement(props: TextType) {
  const [editing, setEditing] = useState(false);
  const { selection, updateElement } = useEditorStore();
  const isSelected = selection.ids.includes(props.id);

  // ─── Build inline styles from props ──────────────────
  const containerStyle: React.CSSProperties = {
    fontSize: props.fontSize || 16,
    fontFamily: props.fontFamily || "Arial",
    color: props.color || "#1e293b",
    backgroundColor: props.bgColor || "transparent",
    textAlign: props.textAlign || "left",
    lineHeight: props.lineHeight || 1.5,
    letterSpacing: props.letterSpacing || 0,
    fontWeight: props.bold ? "bold" : "normal",
    fontStyle: props.italic ? "italic" : "normal",
    textDecoration: props.underline ? "underline" : "none",
    textTransform: props.textTransform || "none",
    verticalAlign: props.verticalAlign || "top",
    padding: props.padding || 4,
    // Border
    border: props.border
      ? `${props.border.width || 1}px solid ${props.border.color || "#e2e8f0"}`
      : "none",
    borderRadius: props.border?.radius || 0,
    // Shadow
    boxShadow: props.shadow
      ? `${props.shadow.x || 0}px ${props.shadow.y || 0}px ${props.shadow.blur || 0}px ${props.shadow.color || "rgba(0,0,0,0.1)"}`
      : "none",
    // Ensure the element fills the container
    width: "100%",
    height: "100%",
    overflow: "hidden",
    boxSizing: "border-box",
  };

  // ─── TipTap editor ──────────────────────────────────
  const editor = useEditor({
    extensions,
    content: props.content || "<p>Edit me</p>",
    editable: editing,
    onUpdate: ({ editor }) => {
      updateElement(props.id, { content: editor.getHTML() });
    },
    editorProps: {
      attributes: {
        style: "height: 100%; overflow: auto; outline: none;",
      },
    },
  });

  // ─── When editing is enabled, focus the editor ──────
  useEffect(() => {
    if (editing && editor) {
      setTimeout(() => {
        editor.commands.focus();
      }, 10);
    }
  }, [editing, editor]);

  // ─── Handle double‑click to edit ────────────────────
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (props.locked) return;
    setEditing(true);
  };

  // ─── Disable editing when clicking outside ──────────
  const handleBlur = () => {
    setEditing(false);
  };

  return (
    <div
      style={containerStyle}
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
      className="text-element">
      <EditorContent
        editor={editor}
        style={{
          height: "100%",
          outline: editing ? "2px solid #3b82f6" : "none",
          outlineOffset: "-2px",
          cursor: isSelected && !editing ? "move" : "text",
        }}
      />
    </div>
  );
}
