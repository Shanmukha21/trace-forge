import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Keyboard, ListCollapse } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';

type Tab = 'output' | 'input' | 'events';

export const ConsolePanel: React.FC = () => {
  const { stdout, stdin, setStdin, events } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<Tab>('output');
  const outputRef = useRef<HTMLPreElement>(null);

  // Auto-scroll terminal to bottom when content changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [stdout]);

  return (
    <div style={styles.container}>
      <div style={styles.tabHeader}>
        <div style={styles.tabList}>
          <button
            onClick={() => setActiveTab('output')}
            style={{
              ...styles.tabBtn,
              borderBottomColor: activeTab === 'output' ? 'var(--accent-color)' : 'transparent',
              color: activeTab === 'output' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <Terminal size={14} />
            <span>Console Output</span>
          </button>
          <button
            onClick={() => setActiveTab('input')}
            style={{
              ...styles.tabBtn,
              borderBottomColor: activeTab === 'input' ? 'var(--accent-color)' : 'transparent',
              color: activeTab === 'input' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <Keyboard size={14} />
            <span>Standard Input (stdin)</span>
          </button>
          <button
            onClick={() => setActiveTab('events')}
            style={{
              ...styles.tabBtn,
              borderBottomColor: activeTab === 'events' ? 'var(--accent-color)' : 'transparent',
              color: activeTab === 'events' ? 'var(--text-primary)' : 'var(--text-muted)',
            }}
          >
            <ListCollapse size={14} />
            <span>Execution Events ({events.length})</span>
          </button>
        </div>
      </div>

      <div style={styles.contentArea}>
        {activeTab === 'output' && (
          <pre ref={outputRef} style={styles.terminal}>
            {stdout}
          </pre>
        )}

        {activeTab === 'input' && (
          <div style={styles.inputContainer}>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Enter mock stdin inputs here... (Each line feeds input() statements sequentially)"
              style={styles.textarea}
            />
          </div>
        )}

        {activeTab === 'events' && (
          <div style={styles.tableContainer}>
            {events.length === 0 ? (
              <div style={styles.emptyState}>
                <span>No execution events recorded yet. Run code to populate logs.</span>
              </div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Seq ID</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Line</th>
                    <th style={styles.th}>Function</th>
                    <th style={styles.th}>Payload Metadata</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((evt, idx) => (
                    <tr key={evt.id || idx} style={styles.tr}>
                      <td style={styles.td}>{idx + 1}</td>
                      <td style={styles.td}>
                        <span
                          style={{
                            ...styles.typeBadge,
                            backgroundColor:
                              evt.type === 'END'
                                ? 'var(--success-bg)'
                                : evt.type === 'EXCEPTION'
                                  ? 'var(--error-bg)'
                                  : 'var(--accent-bg)',
                            color:
                              evt.type === 'END'
                                ? 'var(--success-color)'
                                : evt.type === 'EXCEPTION'
                                  ? 'var(--error-color)'
                                  : 'var(--accent-color)',
                          }}
                        >
                          {evt.type}
                        </span>
                      </td>
                      <td style={styles.td}>{evt.line}</td>
                      <td style={styles.td}>{evt.function}</td>
                      <td style={styles.td}>{JSON.stringify(evt.payload || {})}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: 'var(--bg-secondary)',
    borderTop: '1px solid var(--border-color)',
  },
  tabHeader: {
    height: '40px',
    backgroundColor: 'var(--bg-tertiary)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 10px',
  },
  tabList: {
    display: 'flex',
    gap: '12px',
    height: '100%',
  },
  tabBtn: {
    background: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '0 8px',
    fontSize: '13px',
    fontWeight: 600,
    borderBottom: '2px solid transparent',
    height: '100%',
    transition: 'all var(--transition-fast)',
  },
  contentArea: {
    flex: 1,
    padding: '12px',
    overflow: 'hidden',
    backgroundColor: '#0a0a0d', // dark terminal bg
  },
  terminal: {
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    lineHeight: '1.6',
    color: '#34d399', // bright green terminal text
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  inputContainer: {
    width: '100%',
    height: '100%',
  },
  textarea: {
    width: '100%',
    height: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    padding: '10px',
    fontSize: '14px',
    fontFamily: 'var(--font-mono)',
    resize: 'none',
    outline: 'none',
  },
  tableContainer: {
    width: '100%',
    height: '100%',
    overflowY: 'auto',
  },
  emptyState: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: 'var(--text-muted)',
    fontSize: '13px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '13px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
  },
  tableHeaderRow: {
    borderBottom: '1px solid var(--border-color)',
    textAlign: 'left',
  },
  th: {
    padding: '8px 10px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  td: {
    padding: '8px 10px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  },
  tr: {
    transition: 'background-color var(--transition-fast)',
  },
  typeBadge: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 700,
  },
};
export default ConsolePanel;
