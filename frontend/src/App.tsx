import React from 'react';
import { Navbar } from './components/Navbar';
import { FileExplorer } from './components/FileExplorer';
import { EditorWrapper } from './components/EditorWrapper';
import { VisualizerPanel } from './components/VisualizerPanel';
import { ConsolePanel } from './components/ConsolePanel';

function App() {
  return (
    <div className="workspace-container">
      <Navbar />
      <div className="workspace-main">
        <FileExplorer />
        <main style={styles.editorContainer}>
          <div style={styles.splitSection}>
            <div style={styles.editorSection}>
              <EditorWrapper />
            </div>
            <div style={styles.visualizerSection}>
              <VisualizerPanel />
            </div>
          </div>
          <div style={styles.consoleSection}>
            <ConsolePanel />
          </div>
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  editorContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  splitSection: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    overflow: 'hidden',
  },
  editorSection: {
    height: '100%',
    overflow: 'hidden',
  },
  visualizerSection: {
    height: '100%',
    overflow: 'hidden',
  },
  consoleSection: {
    height: '240px',
    minHeight: '150px',
  },
};

export default App;
