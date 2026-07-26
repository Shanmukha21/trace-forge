import React from 'react';
import { Flame, Play, Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';

export const Navbar: React.FC = () => {
  const { isRunning, isConnected, runCode } = useWorkspaceStore();

  const handleRun = () => {
    runCode();
  };

  return (
    <header style={styles.header}>
      <div style={styles.logoSection}>
        <div style={styles.logoIconBg}>
          <Flame size={20} color="#ff6b00" style={styles.logoFlame} />
        </div>
        <h1 style={styles.logoText}>TraceForge</h1>
        <span style={styles.badge}>v0.1.0-alpha</span>
      </div>

      <div style={styles.actions}>
        <div style={styles.statusContainer}>
          <div
            style={{
              ...styles.statusDot,
              backgroundColor: isConnected ? '#10b981' : '#f59e0b',
              boxShadow: isConnected ? '0 0 8px #10b981' : '0 0 8px #f59e0b',
            }}
          />
          <span style={styles.statusText}>{isConnected ? 'Connected' : 'Offline Mode'}</span>
        </div>

        <button
          onClick={handleRun}
          disabled={isRunning}
          style={{
            ...styles.runBtn,
            opacity: isRunning ? 0.7 : 1,
            boxShadow: isRunning ? 'none' : '0 0 12px var(--accent-glow)',
          }}
        >
          {isRunning ? (
            <>
              <Loader2 size={16} style={styles.spinning} />
              <span>Running...</span>
            </>
          ) : (
            <>
              <Play size={16} fill="currentColor" />
              <span>Run Code</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    backgroundColor: 'var(--bg-secondary)',
    borderBottom: '1px solid var(--border-color)',
    height: '56px',
    userSelect: 'none',
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoIconBg: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: 'rgba(255, 107, 0, 0.1)',
    border: '1px solid rgba(255, 107, 0, 0.25)',
  },
  logoFlame: {
    filter: 'drop-shadow(0 0 4px rgba(255, 107, 0, 0.4))',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '-0.02em',
    background: 'linear-gradient(to right, #ff8c00, #ff4500)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  badge: {
    fontSize: '10px',
    fontWeight: 500,
    color: 'var(--text-muted)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: '4px 10px',
    borderRadius: '20px',
    border: '1px solid var(--border-color)',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'all 0.3s ease',
  },
  statusText: {
    fontWeight: 500,
  },
  runBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--accent-color)',
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid var(--accent-border)',
    transition: 'all var(--transition-fast)',
  },
  spinning: {
    animation: 'spin 1s linear infinite',
  },
};

// Insert keyframe animation styles for spinning into document
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(styleSheet);
}
