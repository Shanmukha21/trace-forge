import { create } from 'zustand';

export interface FileItem {
  name: string;
  path: string;
  content?: string;
  isFolder: boolean;
  children?: FileItem[];
}

export interface ExecutionEvent {
  id: string;
  timestamp: number;
  type: string;
  line: number;
  function: string;
  locals: Record<string, any>;
  globals: Record<string, any>;
  memory: Record<string, any>;
  stack: string[];
  payload: Record<string, any>;
}

interface WorkspaceState {
  // Files
  files: FileItem[];
  activeFilePath: string;
  code: string;

  // Execution
  stdin: string;
  stdout: string;
  isRunning: boolean;
  isConnected: boolean;
  events: ExecutionEvent[];
  currentEventIndex: number;

  // Playback & Scrubbing
  isPlaying: boolean;
  playbackSpeed: number;

  // Actions
  setCode: (code: string) => void;
  setStdin: (stdin: string) => void;
  appendStdout: (text: string) => void;
  clearStdout: () => void;
  setRunning: (isRunning: boolean) => void;
  setConnected: (isConnected: boolean) => void;
  selectFile: (path: string) => void;
  addFile: (name: string, isFolder: boolean, parentPath?: string) => void;
  setEvents: (events: ExecutionEvent[]) => void;
  setCurrentEventIndex: (index: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  resetScrubber: () => void;
  runCode: () => void;
}

const defaultFiles: FileItem[] = [
  {
    name: 'main.py',
    path: '/main.py',
    content: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr

numbers = [64, 34, 25, 12, 22, 11, 90]
print("Original Array:", numbers)
sorted_numbers = bubble_sort(numbers)
print("Sorted Array:", sorted_numbers)
`,
    isFolder: false,
  },
  {
    name: 'binary_search.py',
    path: '/binary_search.py',
    content: `def binary_search(arr, target):
    low = 0
    high = len(arr) - 1
    
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
            
    return -1

items = [2, 3, 4, 10, 40]
target_val = 10
result = binary_search(items, target_val)
print(f"Target {target_val} found at index {result}")
`,
    isFolder: false,
  },
  {
    name: 'examples',
    path: '/examples',
    isFolder: true,
    children: [
      {
        name: 'fibonacci.py',
        path: '/examples/fibonacci.py',
        content: `def fibonacci(n):
    if n <= 0:
        return []
    elif n == 1:
        return [0]
    
    seq = [0, 1]
    while len(seq) < n:
        seq.append(seq[-1] + seq[-2])
    return seq

print("Fibonacci(8):", fibonacci(8))
`,
        isFolder: false,
      },
    ],
  },
];

// Helper to find a file in the tree
const findFileByPath = (files: FileItem[], path: string): FileItem | null => {
  for (const file of files) {
    if (file.path === path) return file;
    if (file.children) {
      const found = findFileByPath(file.children, path);
      if (found) return found;
    }
  }
  return null;
};

// Helper to insert a file in the tree
const insertFile = (files: FileItem[], newFile: FileItem, parentPath?: string): FileItem[] => {
  if (!parentPath) {
    return [...files, newFile];
  }
  return files.map((file) => {
    if (file.path === parentPath && file.isFolder) {
      return {
        ...file,
        children: [...(file.children || []), newFile],
      };
    } else if (file.children) {
      return {
        ...file,
        children: insertFile(file.children, newFile, parentPath),
      };
    }
    return file;
  });
};

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  files: defaultFiles,
  activeFilePath: '/main.py',
  code: defaultFiles[0].content || '',
  stdin: '',
  stdout: 'Welcome to TraceForge! Write your Python code above and click Run.\n',
  isRunning: false,
  isConnected: false,
  events: [],
  currentEventIndex: -1,

  isPlaying: false,
  playbackSpeed: 500, // ms per step

  setCode: (code) => {
    set((state) => {
      // Also update the content in the files tree
      const updateFileContent = (filesList: FileItem[]): FileItem[] => {
        return filesList.map((file) => {
          if (file.path === state.activeFilePath) {
            return { ...file, content: code };
          } else if (file.children) {
            return { ...file, children: updateFileContent(file.children) };
          }
          return file;
        });
      };
      return {
        code,
        files: updateFileContent(state.files),
      };
    });
  },

  setStdin: (stdin) => set({ stdin }),

  appendStdout: (text) => set((state) => ({ stdout: state.stdout + text })),

  clearStdout: () => set({ stdout: '' }),

  setRunning: (isRunning) => set({ isRunning }),

  setConnected: (isConnected) => set({ isConnected }),

  selectFile: (path) => {
    const file = findFileByPath(get().files, path);
    if (file && !file.isFolder) {
      set({
        activeFilePath: path,
        code: file.content || '',
      });
    }
  },

  addFile: (name, isFolder, parentPath) => {
    const path = parentPath ? `${parentPath}/${name}` : `/${name}`;
    const newFile: FileItem = {
      name,
      path,
      isFolder,
      content: isFolder ? undefined : '# New python file\n',
      children: isFolder ? [] : undefined,
    };
    set((state) => ({
      files: insertFile(state.files, newFile, parentPath),
    }));
  },

  setEvents: (events) => set({ events }),

  setCurrentEventIndex: (currentEventIndex) => set({ currentEventIndex }),

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),

  stepForward: () => {
    const { currentEventIndex, events } = get();
    if (currentEventIndex < events.length - 1) {
      set({ currentEventIndex: currentEventIndex + 1 });
    } else {
      set({ isPlaying: false });
    }
  },

  stepBackward: () => {
    const { currentEventIndex } = get();
    if (currentEventIndex > 0) {
      set({ currentEventIndex: currentEventIndex - 1 });
    }
  },

  resetScrubber: () => {
    const { events } = get();
    set({
      currentEventIndex: events.length > 0 ? 0 : -1,
      isPlaying: false,
    });
  },

  runCode: () => {
    const { code, stdin, isRunning } = get();
    if (isRunning) return;

    set({
      isRunning: true,
      isPlaying: false,
      stdout: '> Initializing trace execution engine...\n',
      events: [],
      currentEventIndex: -1,
    });

    // Connect to local FastAPI WebSocket execution endpoint
    const socket = new WebSocket('ws://localhost:8001/api/v1/execute');

    socket.onopen = () => {
      set({ isConnected: true });
      set((state) => ({ stdout: state.stdout + '> Connected. Executing code...\n\n' }));
      socket.send(
        JSON.stringify({
          action: 'RUN',
          code,
          stdin,
        })
      );
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.error) {
          set((state) => ({ stdout: state.stdout + `\nExecution Error: ${data.error}\n` }));
          return;
        }

        // Check for specific events that write to terminal output
        if (data.type === 'PRINT' && data.payload && data.payload.text !== undefined) {
          set((state) => ({ stdout: state.stdout + data.payload.text + '\n' }));
        } else if (data.type === 'EXCEPTION' && data.payload && data.payload.exception) {
          set((state) => ({ stdout: state.stdout + `\nTraceback Error: ${data.payload.exception}\n` }));
        }

        if (data.type === 'END') {
          set((state) => {
            const nextEvents = [...state.events, data];
            return {
              events: nextEvents,
              stdout: state.stdout + '\n[Process finished with exit code 0]\n',
              isRunning: false,
              currentEventIndex: nextEvents.length > 0 ? 0 : -1,
            };
          });
          socket.close();
        } else {
          set((state) => ({
            events: [...state.events, data],
          }));
        }
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    socket.onerror = (err) => {
      console.error('WS Connection error:', err);
      set((state) => ({
        stdout: state.stdout + '\nFailed to connect to execution server on port 8001.\n',
        isRunning: false,
      }));
    };

    socket.onclose = () => {
      set({ isConnected: false, isRunning: false });
    };
  },
}));
