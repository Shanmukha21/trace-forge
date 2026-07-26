import React, { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { FileCode } from 'lucide-react';

export const EditorWrapper: React.FC = () => {
  const { code, setCode, activeFilePath, events, currentEventIndex } = useWorkspaceStore();

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  const handleEditorChange = (value: string | undefined) => {
    setCode(value || '');
  };

  const getFileName = (path: string) => {
    const parts = path.split('/');
    return parts[parts.length - 1];
  };

  // Highlight active execution line when scrubbing trace
  useEffect(() => {
    if (editorRef.current && monacoRef.current) {
      if (currentEventIndex >= 0 && events[currentEventIndex]) {
        const line = events[currentEventIndex].line;
        if (line > 0) {
          decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, [
            {
              range: new monacoRef.current.Range(line, 1, line, 1),
              options: {
                isWholeLine: true,
                className: 'active-execution-line',
                glyphMarginClassName: 'active-execution-glyph',
              },
            },
          ]);
          editorRef.current.revealLineInCenterIfOutsideViewport(line);
        }
      } else {
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
      }
    }
  }, [currentEventIndex, events]);

  return (
    <div style={styles.container}>
      <div style={styles.tabHeader}>
        <div style={styles.activeTab}>
          <FileCode size={14} color="#38bdf8" />
          <span style={styles.tabText}>{getFileName(activeFilePath)}</span>
        </div>
      </div>
      <div style={styles.editorArea}>
        <Editor
          height="100%"
          language="python"
          theme="vs-dark"
          value={code}
          onMount={handleEditorMount}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', Consolas, monospace",
            lineNumbersMinChars: 3,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'all',
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              verticalScrollbarSize: 8,
              horizontalScrollbarSize: 8,
            },
          }}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: '#1e1e1e', // Monaco dark editor background default
  },
  tabHeader: {
    height: '35px',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    paddingLeft: '10px',
  },
  activeTab: {
    height: '35px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0 16px',
    backgroundColor: '#1e1e1e', // Match Monaco bg
    borderTop: '2px solid var(--accent-color)',
    borderRight: '1px solid var(--border-color)',
    cursor: 'default',
  },
  tabText: {
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--text-primary)',
  },
  editorArea: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
  },
};

export default EditorWrapper;
