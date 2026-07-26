import React, { useState } from 'react';
import { Folder, FolderOpen, FileCode, Plus, ChevronRight, ChevronDown } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { FileItem } from '../store/workspaceStore';

export const FileExplorer: React.FC = () => {
  const { files, activeFilePath, selectFile, addFile } = useWorkspaceStore();
  const [isAdding, setIsAdding] = useState(false);
  const [newItemName, setNewItemName] = useState('');

  const handleCreateFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemName.trim()) {
      const name = newItemName.endsWith('.py') ? newItemName.trim() : `${newItemName.trim()}.py`;
      addFile(name, false);
      setNewItemName('');
      setIsAdding(false);
    }
  };

  return (
    <aside style={styles.sidebar}>
      <div style={styles.header}>
        <span style={styles.title}>WORKSPACE</span>
        <button
          onClick={() => setIsAdding(!isAdding)}
          style={styles.addBtn}
          title="Create Python File"
        >
          <Plus size={16} />
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleCreateFile} style={styles.addForm}>
          <input
            type="text"
            placeholder="filename.py"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            style={styles.addInput}
            autoFocus
          />
        </form>
      )}

      <div style={styles.fileTree}>
        {files.map((file) => (
          <FileNodeItem
            key={file.path}
            node={file}
            activePath={activeFilePath}
            onSelect={selectFile}
          />
        ))}
      </div>
    </aside>
  );
};

interface FileNodeProps {
  node: FileItem;
  activePath: string;
  onSelect: (path: string) => void;
  depth?: number;
}

const FileNodeItem: React.FC<FileNodeProps> = ({ node, activePath, onSelect, depth = 0 }) => {
  const [isOpen, setIsOpen] = useState(true);
  const isSelected = activePath === node.path;

  const handleClick = () => {
    if (node.isFolder) {
      setIsOpen(!isOpen);
    } else {
      onSelect(node.path);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        style={{
          ...styles.nodeItem,
          paddingLeft: `${depth * 12 + 12}px`,
          backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
          borderLeft: isSelected ? '2px solid var(--accent-color)' : '2px solid transparent',
          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
        }}
      >
        {node.isFolder ? (
          <>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            {isOpen ? (
              <FolderOpen size={16} color="#6366f1" />
            ) : (
              <Folder size={16} color="#6366f1" />
            )}
            <span style={styles.nodeName}>{node.name}</span>
          </>
        ) : (
          <>
            <span style={{ width: '14px' }} /> {/* indent matching folder chevron */}
            <FileCode size={16} color="#38bdf8" />
            <span style={styles.nodeName}>{node.name}</span>
          </>
        )}
      </div>

      {node.isFolder && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileNodeItem
              key={child.path}
              node={child}
              activePath={activePath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    backgroundColor: 'var(--bg-secondary)',
    borderRight: '1px solid var(--border-color)',
    height: '100%',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 14px 8px',
  },
  title: {
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    letterSpacing: '0.08em',
  },
  addBtn: {
    background: 'none',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px',
    borderRadius: '4px',
    transition: 'all var(--transition-fast)',
  },
  addForm: {
    padding: '0 12px 10px',
  },
  addInput: {
    width: '100%',
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    padding: '6px 8px',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'var(--font-sans)',
  },
  fileTree: {
    flex: 1,
    paddingTop: '4px',
  },
  nodeItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    height: '32px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
  },
  nodeName: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};
