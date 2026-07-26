import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Activity,
  Sparkles,
  BarChart2,
  Box,
  Shuffle,
  Info,
  CheckCircle2,
  Cpu,
  Zap,
  HardDrive,
  HelpCircle,
  Database,
  Grid,
  Layers,
  GitFork,
  CornerDownRight,
} from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import { analyzeComplexity } from '../utils/complexityAnalyzer';

export const VisualizerPanel: React.FC = () => {
  const {
    events,
    currentEventIndex,
    setCurrentEventIndex,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    stepForward,
    stepBackward,
    resetScrubber,
    isRunning,
    code,
    setCode,
    runCode,
  } = useWorkspaceStore();

  const [viewMode, setViewMode] = useState<'bars' | 'boxes'>('bars');
  const [showComplexityDetails, setShowComplexityDetails] = useState<boolean>(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Playback timer effect
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        stepForward();
      }, playbackSpeed);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, stepForward]);

  const currentEvent = events[currentEventIndex] || null;
  const complexity = analyzeComplexity(events, code);

  const currentLocals = currentEvent?.locals || {};
  const currentGlobals = currentEvent?.globals || {};
  const mergedScope = { ...currentGlobals, ...currentLocals };

  const hashMaps: { name: string; entries: [string, any][] }[] = [];
  const sets: { name: string; items: any[] }[] = [];
  const matrices2D: { name: string; rows: any[][] }[] = [];
  const arrays1D: { name: string; items: any[] }[] = [];
  const scalarVars: { name: string; value: any }[] = [];

  const isValidScalarValue = (val: any): boolean => {
    if (val === null || val === undefined) return true;
    const type = typeof val;
    if (type === 'number' || type === 'string' || type === 'boolean') return true;
    return false;
  };

  Object.entries(mergedScope).forEach(([name, val]) => {
    if (name.startsWith('__') || typeof val === 'function') return;

    if (Array.isArray(val)) {
      if (val.length > 0 && Array.isArray(val[0])) {
        if (val.some((r) => r.length > 0)) matrices2D.push({ name, rows: val });
      } else {
        arrays1D.push({ name, items: val });
      }
    } else if (val && typeof val === 'object') {
      if (val['__type__'] === 'set' && Array.isArray(val['items'])) {
        if (val['items'].length > 0) sets.push({ name, items: val['items'] });
      } else {
        const entries = Object.entries(val).filter(([k]) => !k.startsWith('__'));
        // Hide empty hash maps (0 key-value pairs)
        if (entries.length > 0) {
          hashMaps.push({ name, entries });
        }
      }
    } else if (isValidScalarValue(val)) {
      scalarVars.push({ name, value: val });
    }
  });

  let compareInfo: { left?: any; op?: string; right?: any; result?: boolean } | null = null;
  if (currentEvent?.type === 'COMPARE' && currentEvent.payload) {
    compareInfo = currentEvent.payload;
  }

  let assignInfo: { name?: string; value?: any } | null = null;
  if (currentEvent?.type === 'ASSIGN' && currentEvent.payload) {
    assignInfo = currentEvent.payload;
  }

  const activeIndexJ = typeof currentLocals.j === 'number' ? currentLocals.j : null;
  const activeIndexI = typeof currentLocals.i === 'number' ? currentLocals.i : null;
  const activeIndexMid = typeof currentLocals.mid === 'number' ? currentLocals.mid : null;
  const activeIndexLow = typeof currentLocals.low === 'number' ? currentLocals.low : null;
  const activeIndexHigh = typeof currentLocals.high === 'number' ? currentLocals.high : null;

  const getStepExplanation = (): { text: string; highlightType: 'compare' | 'assign' | 'call' | 'info' | 'end' } => {
    if (!currentEvent) {
      return { text: 'Click "Run Code" to start tracing.', highlightType: 'info' };
    }

    const func = currentEvent.function || '<module>';
    const line = currentEvent.line;

    switch (currentEvent.type) {
      case 'COMPARE': {
        const left = compareInfo?.left;
        const right = compareInfo?.right;
        const op = compareInfo?.op === 'Gt' ? '>' : compareInfo?.op === 'Lt' ? '<' : compareInfo?.op === 'GtE' ? '>=' : compareInfo?.op === 'LtE' ? '<=' : compareInfo?.op || '==';
        const res = compareInfo?.result;
        return {
          text: `Line ${line}: Comparing values (${left}) ${op} (${right}) → Evaluated to ${res ? 'TRUE' : 'FALSE'}.`,
          highlightType: 'compare',
        };
      }
      case 'ASSIGN': {
        const name = assignInfo?.name || 'variable';
        const val = JSON.stringify(assignInfo?.value);
        return {
          text: `Line ${line}: Assigning value ${val} to variable '${name}'.`,
          highlightType: 'assign',
        };
      }
      case 'CALL':
        return {
          text: `Line ${line}: Entering scope '${func}()'.`,
          highlightType: 'call',
        };
      case 'RETURN': {
        const retVal = JSON.stringify(currentEvent.payload?.return_value);
        return {
          text: `Line ${line}: Function '${func}()' returning value ${retVal !== undefined ? retVal : ''}.`,
          highlightType: 'info',
        };
      }
      case 'PRINT':
        return {
          text: `Line ${line}: Printing "${currentEvent.payload?.text}" to console.`,
          highlightType: 'info',
        };
      case 'END':
        return {
          text: 'Execution completed successfully! Scrub backwards to review step-by-step.',
          highlightType: 'end',
        };
      default:
        return {
          text: `Executing line ${line} in '${func}()'.`,
          highlightType: 'info',
        };
    }
  };

  const stepExplanation = getStepExplanation();

  const injectPresetArray = (presetType: 'random' | 'reverse' | 'sorted') => {
    let newNumbers: number[] = [];
    if (presetType === 'random') {
      newNumbers = Array.from({ length: 7 }, () => Math.floor(Math.random() * 85) + 10);
    } else if (presetType === 'reverse') {
      newNumbers = [90, 64, 34, 25, 22, 12, 11];
    } else if (presetType === 'sorted') {
      newNumbers = [11, 12, 22, 25, 34, 64, 90];
    }

    const arrayStr = `[${newNumbers.join(', ')}]`;

    let updatedCode = code;
    if (/numbers\s*=\s*\[[^\]]*\]/.test(code)) {
      updatedCode = code.replace(/numbers\s*=\s*\[[^\]]*\]/, `numbers = ${arrayStr}`);
    } else if (/arr\s*=\s*\[[^\]]*\]/.test(code)) {
      updatedCode = code.replace(/arr\s*=\s*\[[^\]]*\]/, `arr = ${arrayStr}`);
    } else if (/items\s*=\s*\[[^\]]*\]/.test(code)) {
      updatedCode = code.replace(/items\s*=\s*\[[^\]]*\]/, `items = ${arrayStr}`);
    }

    setCode(updatedCode);

    setTimeout(() => {
      runCode();
    }, 100);
  };

  return (
    <div style={styles.container}>
      {/* Top Control Bar Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <Sparkles size={16} color="var(--accent-color)" />
          <span>Visualizer & Complexity</span>
        </div>

        {/* Time Travel Scrubber Controls */}
        <div style={styles.controlsGroup}>
          <button
            onClick={resetScrubber}
            disabled={events.length === 0 || isRunning}
            title="Reset to Start"
            style={styles.iconBtn}
          >
            <SkipBack size={15} />
          </button>

          <button
            onClick={stepBackward}
            disabled={events.length === 0 || currentEventIndex <= 0 || isRunning}
            title="Step Back"
            style={styles.iconBtn}
          >
            <ChevronLeft size={16} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={events.length === 0 || isRunning}
            title={isPlaying ? 'Pause' : 'Play'}
            style={{
              ...styles.iconBtn,
              ...styles.playBtn,
              backgroundColor: isPlaying ? 'var(--warning-color, #f59e0b)' : 'var(--accent-color)',
            }}
          >
            {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" style={{ marginLeft: '2px' }} />}
          </button>

          <button
            onClick={stepForward}
            disabled={events.length === 0 || currentEventIndex >= events.length - 1 || isRunning}
            title="Step Forward"
            style={styles.iconBtn}
          >
            <ChevronRight size={16} />
          </button>

          {/* Timeline Range Slider */}
          <div style={styles.sliderContainer}>
            <input
              type="range"
              min={0}
              max={Math.max(0, events.length - 1)}
              value={currentEventIndex < 0 ? 0 : currentEventIndex}
              disabled={events.length === 0 || isRunning}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentEventIndex(parseInt(e.target.value, 10));
              }}
              style={styles.slider}
            />
          </div>

          <span style={styles.stepBadge}>
            {events.length === 0 ? '0 / 0' : `${currentEventIndex + 1} / ${events.length}`}
          </span>

          <div style={styles.speedGroup}>
            <Gauge size={14} color="var(--text-muted)" />
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseInt(e.target.value, 10))}
              style={styles.speedSelect}
            >
              <option value={1500}>0.25x</option>
              <option value={800}>0.5x</option>
              <option value={400}>1x</option>
              <option value={200}>2x</option>
              <option value={80}>4x</option>
            </select>
          </div>
        </div>
      </div>

      {/* Array Presets & View Mode Sub-Bar */}
      <div style={styles.subHeader}>
        <div style={styles.presetGroup}>
          <span style={styles.subLabel}>Presets:</span>
          <button
            onClick={() => injectPresetArray('random')}
            disabled={isRunning}
            style={styles.presetBtn}
            title="Inject random numbers and re-run"
          >
            <Shuffle size={12} />
            <span>Random</span>
          </button>
          <button
            onClick={() => injectPresetArray('reverse')}
            disabled={isRunning}
            style={styles.presetBtn}
            title="Inject reversed array and re-run"
          >
            <span>Reverse</span>
          </button>
        </div>

        <div style={styles.viewToggleGroup}>
          <button
            onClick={() => setViewMode('bars')}
            style={{
              ...styles.toggleBtn,
              backgroundColor: viewMode === 'bars' ? 'var(--accent-color)' : 'transparent',
              color: viewMode === 'bars' ? '#fff' : 'var(--text-muted)',
            }}
            title="Bar Heights Chart View"
          >
            <BarChart2 size={13} />
            <span>Bars</span>
          </button>
          <button
            onClick={() => setViewMode('boxes')}
            style={{
              ...styles.toggleBtn,
              backgroundColor: viewMode === 'boxes' ? 'var(--accent-color)' : 'transparent',
              color: viewMode === 'boxes' ? '#fff' : 'var(--text-muted)',
            }}
            title="Box Grid View"
          >
            <Box size={13} />
            <span>Boxes</span>
          </button>
        </div>
      </div>

      {/* Main Visualizer Content Canvas */}
      <div style={styles.canvas}>
        {events.length === 0 ? (
          <div style={styles.emptyState}>
            <Activity size={40} color="var(--border-color)" style={{ marginBottom: '12px' }} />
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              No execution trace available yet
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Click <strong>"Run Code"</strong> in the navbar above to start interactive visualization.
            </p>
          </div>
        ) : (
          <div style={styles.contentScroll}>
            {/* TIME & SPACE COMPLEXITY CALCULATOR CARD (PCAE ENGINE) */}
            <div style={styles.complexityCard}>
              <div style={styles.complexityHeader}>
                <div style={styles.complexityTitleGroup}>
                  <Cpu size={16} color="var(--accent-color)" />
                  <span style={styles.complexityMainTitle}>Program Cost Analysis Engine (PCAE)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Algorithm Paradigm Badge */}
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                    }}
                  >
                    Strategy: {complexity.paradigm}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                    }}
                  >
                    Confidence: {complexity.confidenceScore}%
                  </span>
                  <button
                    onClick={() => setShowComplexityDetails(!showComplexityDetails)}
                    style={styles.detailsToggleBtn}
                  >
                    <HelpCircle size={13} />
                    <span>{showComplexityDetails ? 'Hide Details' : 'Show Details'}</span>
                  </button>
                </div>
              </div>

              {/* Big-O Badges Banner */}
              <div style={styles.bigOBadgesRow}>
                <div style={{ ...styles.bigOPill, borderColor: complexity.timeBadgeColor }}>
                  <Zap size={14} color={complexity.timeBadgeColor} />
                  <div style={styles.bigOPillText}>
                    <span style={styles.bigOLabel}>TIME COMPLEXITY</span>
                    <strong style={{ ...styles.bigOValue, color: complexity.timeBadgeColor }}>
                      {complexity.timeComplexity}
                    </strong>
                  </div>
                </div>

                <div style={{ ...styles.bigOPill, borderColor: complexity.spaceBadgeColor }}>
                  <HardDrive size={14} color={complexity.spaceBadgeColor} />
                  <div style={styles.bigOPillText}>
                    <span style={styles.bigOLabel}>SPACE COMPLEXITY</span>
                    <strong style={{ ...styles.bigOValue, color: complexity.spaceBadgeColor }}>
                      {complexity.spaceComplexity}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Empirical Execution Metrics Grid */}
              <div style={styles.metricsGrid}>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Input Size (N)</span>
                  <span style={styles.metricVal}>{complexity.inputSizeN}</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Total Ops</span>
                  <span style={styles.metricVal}>{complexity.totalSteps}</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Dominant Cost</span>
                  <span style={{ ...styles.metricVal, fontSize: '11px', color: 'var(--accent-color)' }}>
                    {complexity.dominantCost}
                  </span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Comparisons</span>
                  <span style={styles.metricVal}>{complexity.compareCount}</span>
                </div>
                <div style={styles.metricItem}>
                  <span style={styles.metricLabel}>Assignments</span>
                  <span style={styles.metricVal}>{complexity.assignCount}</span>
                </div>
              </div>

              {/* Theoretical Bounds Table & PCAE Evidence Breakdown */}
              {showComplexityDetails && (
                <div style={styles.detailsContainer}>
                  <div style={styles.boundsRow}>
                    <div style={styles.boundBox}>
                      <span style={styles.boundLabel}>BEST CASE</span>
                      <span style={styles.boundVal}>{complexity.bestCase}</span>
                    </div>
                    <div style={styles.boundBox}>
                      <span style={styles.boundLabel}>AVG CASE</span>
                      <span style={styles.boundVal}>{complexity.avgCase}</span>
                    </div>
                    <div style={styles.boundBox}>
                      <span style={styles.boundLabel}>WORST CASE</span>
                      <span style={styles.boundVal}>{complexity.worstCase}</span>
                    </div>
                    <div style={styles.boundBox}>
                      <span style={styles.boundLabel}>SPACE MEMORY</span>
                      <span style={styles.boundVal}>{complexity.spaceCase}</span>
                    </div>
                  </div>

                  <p style={styles.explanationText}>
                    <strong>PCAE Rationale: </strong>
                    {complexity.explanation}
                  </p>

                  <p style={{ ...styles.explanationText, color: '#38bdf8' }}>
                    <strong>Algorithmic Strategy: </strong>
                    {complexity.paradigmReasoning}
                  </p>

                  {complexity.evidenceBreakdown.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Pipeline Evidence Fusion (7 Stages)
                      </span>
                      {complexity.evidenceBreakdown.map((item, idx) => (
                        <div key={idx} style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                          • {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Educational Narrative Explanation Banner */}
            <div
              className="animate-banner"
              style={{
                ...styles.narrativeBanner,
                backgroundColor:
                  stepExplanation.highlightType === 'compare'
                    ? 'rgba(245, 158, 11, 0.12)'
                    : stepExplanation.highlightType === 'assign'
                      ? 'rgba(16, 185, 129, 0.12)'
                      : stepExplanation.highlightType === 'end'
                        ? 'rgba(99, 102, 241, 0.15)'
                        : 'var(--bg-primary)',
                borderColor:
                  stepExplanation.highlightType === 'compare'
                    ? 'rgba(245, 158, 11, 0.35)'
                    : stepExplanation.highlightType === 'assign'
                      ? 'rgba(16, 185, 129, 0.35)'
                      : stepExplanation.highlightType === 'end'
                        ? 'var(--accent-color)'
                        : 'var(--border-color)',
              }}
            >
              <div style={styles.narrativeIcon}>
                {stepExplanation.highlightType === 'compare' ? (
                  <Info size={16} color="#f59e0b" />
                ) : stepExplanation.highlightType === 'assign' ? (
                  <CheckCircle2 size={16} color="#10b981" />
                ) : (
                  <Sparkles size={16} color="var(--accent-color)" />
                )}
              </div>
              <div style={styles.narrativeText}>
                <span>{stepExplanation.text}</span>
              </div>
            </div>

            {/* STATE SPACE TREE / DECISION TREE VISUALIZER (For Backtracking / Recursion) */}
            {currentEvent?.stack && currentEvent.stack.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionHeaderRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <GitFork size={15} color="#38bdf8" />
                    <h4 style={styles.sectionTitle}>
                      {complexity.paradigm.includes('Backtracking') || complexity.hasRecursion
                        ? 'State Space Tree / Recursion Decision Tree Visualizer'
                        : 'Call Stack Hierarchy'}
                    </h4>
                  </div>
                  <span style={styles.arrayCountBadge}>Depth: {currentEvent.stack.length} level(s)</span>
                </div>

                {/* State Space Tree Hierarchy Nodes */}
                <div style={styles.stateSpaceTreeContainer}>
                  {currentEvent.stack.map((frameName, depthIdx) => {
                    const isActiveLeaf = depthIdx === currentEvent.stack.length - 1;

                    return (
                      <div
                        key={depthIdx}
                        style={{
                          ...styles.treeLevelRow,
                          paddingLeft: `${depthIdx * 18}px`,
                        }}
                      >
                        {depthIdx > 0 && <CornerDownRight size={13} color="#38bdf8" style={{ marginRight: '6px' }} />}
                        <div
                          style={{
                            ...styles.treeNodeCard,
                            borderColor: isActiveLeaf ? '#38bdf8' : 'var(--border-color)',
                            backgroundColor: isActiveLeaf ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-tertiary)',
                            boxShadow: isActiveLeaf ? '0 0 12px rgba(56, 189, 248, 0.3)' : 'none',
                          }}
                        >
                          <div style={styles.treeNodeHeader}>
                            <span style={styles.treeNodeDepthTag}>DEPTH {depthIdx}</span>
                            <strong style={styles.treeNodeFuncName}>{frameName}()</strong>
                          </div>

                          {/* Render local state snapshot for active backtracking choices */}
                          {isActiveLeaf && Object.keys(currentLocals).length > 0 && (
                            <div style={styles.treeNodeStateBox}>
                              {Object.entries(currentLocals)
                                .filter(([k]) => !k.startsWith('__'))
                                .map(([k, v]) => (
                                  <span key={k} style={styles.treeNodeStatePill}>
                                    {k}: {JSON.stringify(v)}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* HASH MAPS / DICTIONARIES VISUALIZER (Only if entries.length > 0) */}
            {hashMaps.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionHeaderRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Database size={15} color="#34d399" />
                    <h4 style={styles.sectionTitle}>Hash Map / Dictionary Visualizer</h4>
                  </div>
                  <span style={styles.arrayCountBadge}>{hashMaps.length} map(s)</span>
                </div>

                {hashMaps.map(({ name, entries }) => (
                  <div key={name} style={styles.arrayContainer}>
                    <div style={styles.arrayHeader}>
                      <span style={{ ...styles.arrayName, color: '#34d399' }}>{name}</span>
                      <span style={styles.arrayLength}>Size: {entries.length} key-value pair(s)</span>
                    </div>

                    <div style={styles.hashMapGrid}>
                      {entries.map(([k, v]) => {
                        let isKeyAccessed = false;
                        if (compareInfo && (String(compareInfo.left) === k || String(compareInfo.right) === k)) {
                          isKeyAccessed = true;
                        }

                        let isKeyUpdated = false;
                        if (assignInfo && (assignInfo.name?.includes(name) || JSON.stringify(assignInfo.value)?.includes(k))) {
                          isKeyUpdated = true;
                        }

                        return (
                          <div
                            key={k}
                            className={isKeyAccessed ? 'animate-pulse-compare' : ''}
                            style={{
                              ...styles.hashMapBucketCard,
                              borderColor: isKeyAccessed
                                ? '#f59e0b'
                                : isKeyUpdated
                                  ? '#10b981'
                                  : 'var(--border-color)',
                              backgroundColor: isKeyAccessed
                                ? 'rgba(245, 158, 11, 0.15)'
                                : isKeyUpdated
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : 'var(--bg-tertiary)',
                            }}
                          >
                            <div style={styles.keyTag}>
                              <span style={styles.keyTagLabel}>KEY</span>
                              <strong style={styles.keyTagVal}>{k}</strong>
                            </div>
                            <div style={styles.valBox}>
                              <span style={styles.valBoxLabel}>VAL</span>
                              <strong style={styles.valBoxVal}>{JSON.stringify(v)}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2D MATRICES / GRIDS VISUALIZER */}
            {matrices2D.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionHeaderRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Grid size={15} color="#818cf8" />
                    <h4 style={styles.sectionTitle}>2D Matrix Grid Visualizer</h4>
                  </div>
                  <span style={styles.arrayCountBadge}>{matrices2D.length} matrix(es)</span>
                </div>

                {matrices2D.map(({ name, rows }) => (
                  <div key={name} style={styles.arrayContainer}>
                    <div style={styles.arrayHeader}>
                      <span style={{ ...styles.arrayName, color: '#818cf8' }}>{name}</span>
                      <span style={styles.arrayLength}>Dimensions: {rows.length} × {rows[0]?.length || 0}</span>
                    </div>

                    <div style={styles.matrixTableWrapper}>
                      <table style={styles.matrixTable}>
                        <tbody>
                          {rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              <td style={styles.matrixRowHeader}>[{rIdx}]</td>
                              {row.map((cellVal, cIdx) => {
                                const isCellActive = activeIndexI === rIdx && activeIndexJ === cIdx;
                                return (
                                  <td
                                    key={cIdx}
                                    style={{
                                      ...styles.matrixCell,
                                      backgroundColor: isCellActive ? 'rgba(99, 102, 241, 0.3)' : 'var(--bg-tertiary)',
                                      borderColor: isCellActive ? 'var(--accent-color)' : 'var(--border-color)',
                                    }}
                                  >
                                    {String(cellVal)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* SETS DATA STRUCTURE VISUALIZER */}
            {sets.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionHeaderRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={15} color="#a855f7" />
                    <h4 style={styles.sectionTitle}>Set Data Structure</h4>
                  </div>
                  <span style={styles.arrayCountBadge}>{sets.length} set(s)</span>
                </div>

                {sets.map(({ name, items }) => (
                  <div key={name} style={styles.arrayContainer}>
                    <div style={styles.arrayHeader}>
                      <span style={{ ...styles.arrayName, color: '#a855f7' }}>{name}</span>
                      <span style={styles.arrayLength}>Size: {items.length} distinct item(s)</span>
                    </div>

                    <div style={styles.setPillsRow}>
                      {items.map((item, idx) => (
                        <div key={idx} style={styles.setPill}>
                          <span>{String(item)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 1D ARRAYS VISUALIZER */}
            {arrays1D.length > 0 && (
              <div style={styles.section}>
                <div style={styles.sectionHeaderRow}>
                  <h4 style={styles.sectionTitle}>Array Visualizer</h4>
                  <span style={styles.arrayCountBadge}>{arrays1D.length} array(s)</span>
                </div>

                {arrays1D.map(({ name, items }) => {
                  const numericValues = items.filter((x) => typeof x === 'number');
                  const maxVal = numericValues.length > 0 ? Math.max(...numericValues, 10) : 100;

                  return (
                    <div key={name} style={styles.arrayContainer}>
                      <div style={styles.arrayHeader}>
                        <span style={styles.arrayName}>{name}</span>
                        <span style={styles.arrayLength}>Length: {items.length}</span>
                      </div>

                      {/* BAR HEIGHT CHART VIEW */}
                      {viewMode === 'bars' && (
                        <div style={styles.barsContainer}>
                          {items.map((val, idx) => {
                            const isNum = typeof val === 'number';
                            const barHeight = isNum ? Math.max(26, Math.round((Math.abs(val) / maxVal) * 120)) : 40;

                            const isJ = idx === activeIndexJ;
                            const isJPlus1 = activeIndexJ !== null && idx === activeIndexJ + 1;
                            const isI = idx === activeIndexI;
                            const isMid = idx === activeIndexMid;
                            const isLow = idx === activeIndexLow;
                            const isHigh = idx === activeIndexHigh;

                            let isComparing = false;
                            if (
                              compareInfo &&
                              (val === compareInfo.left || val === compareInfo.right || isJ || isJPlus1)
                            ) {
                              isComparing = true;
                            }

                            let isAssigned = false;
                            if (assignInfo && (isJ || isJPlus1)) {
                              isAssigned = true;
                            }

                            return (
                              <div key={idx} style={styles.barWrapper}>
                                <div style={styles.pointerLabel}>
                                  {isJ && <span style={styles.pointerTagJ}>j</span>}
                                  {isJPlus1 && <span style={styles.pointerTagJ}>j+1</span>}
                                  {isI && <span style={styles.pointerTagI}>i</span>}
                                  {isMid && <span style={styles.pointerTagMid}>mid</span>}
                                  {isLow && <span style={styles.pointerTagLow}>low</span>}
                                  {isHigh && <span style={styles.pointerTagHigh}>high</span>}
                                </div>

                                <span style={styles.barValText}>{val !== undefined ? String(val) : ''}</span>

                                <div
                                  className={isComparing ? 'animate-pulse-compare' : ''}
                                  style={{
                                    ...styles.barColumn,
                                    height: `${barHeight}px`,
                                    background: isComparing
                                      ? 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
                                      : isAssigned
                                        ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
                                        : isMid
                                          ? 'linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)'
                                          : 'linear-gradient(180deg, #6366f1 0%, #4338ca 100%)',
                                    boxShadow: isComparing
                                      ? '0 0 16px rgba(245, 158, 11, 0.6)'
                                      : isAssigned
                                        ? '0 0 16px rgba(16, 185, 129, 0.6)'
                                        : '0 2px 6px rgba(0,0,0,0.3)',
                                  }}
                                />

                                <span style={styles.indexLabel}>[{idx}]</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* BOX GRID VIEW */}
                      {viewMode === 'boxes' && (
                        <div style={styles.boxesRow}>
                          {items.map((val, idx) => {
                            const isJ = idx === activeIndexJ;
                            const isJPlus1 = activeIndexJ !== null && idx === activeIndexJ + 1;
                            const isI = idx === activeIndexI;
                            const isMid = idx === activeIndexMid;
                            const isLow = idx === activeIndexLow;
                            const isHigh = idx === activeIndexHigh;

                            let isComparing = false;
                            if (
                              compareInfo &&
                              (val === compareInfo.left || val === compareInfo.right || isJ || isJPlus1)
                            ) {
                              isComparing = true;
                            }

                            let isAssigned = false;
                            if (assignInfo && (isJ || isJPlus1)) {
                              isAssigned = true;
                            }

                            return (
                              <div key={idx} style={styles.boxWrapper}>
                                <div style={styles.pointerLabel}>
                                  {isJ && <span style={styles.pointerTagJ}>j</span>}
                                  {isJPlus1 && <span style={styles.pointerTagJ}>j+1</span>}
                                  {isI && <span style={styles.pointerTagI}>i</span>}
                                  {isMid && <span style={styles.pointerTagMid}>mid</span>}
                                  {isLow && <span style={styles.pointerTagLow}>low</span>}
                                  {isHigh && <span style={styles.pointerTagHigh}>high</span>}
                                </div>

                                <div
                                  className={isComparing ? 'animate-pulse-compare' : ''}
                                  style={{
                                    ...styles.elementBox,
                                    ...(isComparing ? styles.boxComparing : {}),
                                    ...(isAssigned ? styles.boxAssigned : {}),
                                    ...(isMid ? styles.boxMid : {}),
                                  }}
                                >
                                  <span style={styles.boxValue}>{val !== undefined ? String(val) : ''}</span>
                                </div>

                                <span style={styles.indexLabel}>[{idx}]</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Scalar Variables Section */}
            {scalarVars.length > 0 && (
              <div style={styles.section}>
                <h4 style={styles.sectionTitle}>Variables & Execution State</h4>
                <div style={styles.varsGrid}>
                  {scalarVars.map(({ name, value }) => {
                    const isUpdated =
                      assignInfo?.name === name ||
                      assignInfo?.name?.includes(name);

                    return (
                      <div
                        key={name}
                        style={{
                          ...styles.varCard,
                          ...(isUpdated ? styles.varCardUpdated : {}),
                        }}
                      >
                        <span style={styles.varName}>{name}</span>
                        <span style={styles.varVal}>{JSON.stringify(value)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
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
    borderLeft: '1px solid var(--border-color)',
  },
  header: {
    height: '46px',
    padding: '0 14px',
    backgroundColor: 'var(--bg-tertiary)',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: 700,
    fontSize: '13px',
    color: 'var(--text-primary)',
    whiteSpace: 'nowrap',
  },
  subHeader: {
    height: '36px',
    padding: '0 14px',
    backgroundColor: '#0c0d14',
    borderBottom: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subLabel: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  presetGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  presetBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    borderRadius: '4px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    transition: 'all 0.15s ease',
  },
  viewToggleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'var(--bg-primary)',
    padding: '2px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    transition: 'all 0.15s ease',
  },
  controlsGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    justifyContent: 'flex-end',
  },
  iconBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  playBtn: {
    border: 'none',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    boxShadow: '0 2px 8px rgba(99, 102, 241, 0.4)',
  },
  sliderContainer: {
    width: '110px',
    display: 'flex',
    alignItems: 'center',
  },
  slider: {
    width: '100%',
    accentColor: 'var(--accent-color)',
    cursor: 'pointer',
  },
  stepBadge: {
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
    minWidth: '55px',
    textAlign: 'center',
  },
  speedGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: 'var(--bg-primary)',
    padding: '2px 6px',
    borderRadius: '6px',
    border: '1px solid var(--border-color)',
  },
  speedSelect: {
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    fontSize: '11px',
    fontWeight: 600,
    outline: 'none',
    cursor: 'pointer',
  },
  canvas: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0a0b10',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '24px',
    textAlign: 'center',
  },
  contentScroll: {
    height: '100%',
    overflowY: 'auto',
    padding: '14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  complexityCard: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  complexityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  complexityTitleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  complexityMainTitle: {
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-primary)',
  },
  detailsToggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'none',
    border: 'none',
    fontSize: '11px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  bigOBadgesRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  bigOPill: {
    padding: '8px 12px',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1.5px solid',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  bigOPillText: {
    display: 'flex',
    flexDirection: 'column',
  },
  bigOLabel: {
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
  },
  bigOValue: {
    fontSize: '17px',
    fontWeight: 800,
    fontFamily: 'var(--font-mono)',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '6px',
    backgroundColor: '#06070a',
    padding: '8px',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.03)',
  },
  metricItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  metricLabel: {
    fontSize: '9px',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  metricVal: {
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  detailsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    paddingTop: '6px',
    borderTop: '1px dashed var(--border-color)',
  },
  boundsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
  },
  boundBox: {
    padding: '6px',
    borderRadius: '4px',
    backgroundColor: 'var(--bg-tertiary)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
  },
  boundLabel: {
    fontSize: '9px',
    fontWeight: 700,
    color: 'var(--text-muted)',
  },
  boundVal: {
    fontSize: '11px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
  },
  explanationText: {
    fontSize: '12px',
    lineHeight: '1.4',
    color: 'var(--text-secondary)',
  },
  narrativeBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid',
    transition: 'all 0.2s ease',
  },
  narrativeIcon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  narrativeText: {
    fontSize: '13px',
    fontWeight: 600,
    lineHeight: '1.4',
    color: 'var(--text-primary)',
  },
  section: {
    backgroundColor: 'var(--bg-primary)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '14px',
  },
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
  },
  arrayCountBadge: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  stateSpaceTreeContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    padding: '8px 0',
  },
  treeLevelRow: {
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
  },
  treeNodeCard: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '180px',
    transition: 'all 0.2s ease',
  },
  treeNodeHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
  },
  treeNodeDepthTag: {
    fontSize: '9px',
    fontWeight: 800,
    color: '#38bdf8',
    letterSpacing: '0.05em',
  },
  treeNodeFuncName: {
    fontSize: '12px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  treeNodeStateBox: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '2px',
  },
  treeNodeStatePill: {
    fontSize: '10px',
    fontFamily: 'var(--font-mono)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: '1px 5px',
    borderRadius: '3px',
    color: 'var(--text-secondary)',
  },
  arrayContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  arrayHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  arrayName: {
    fontWeight: 700,
    color: 'var(--accent-color)',
    fontFamily: 'var(--font-mono)',
  },
  arrayLength: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  hashMapGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: '10px',
  },
  hashMapBucketCard: {
    borderRadius: '6px',
    border: '1.5px solid var(--border-color)',
    backgroundColor: 'var(--bg-tertiary)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  keyTag: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    padding: '4px 8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  keyTagLabel: {
    fontSize: '9px',
    fontWeight: 800,
    color: '#34d399',
    letterSpacing: '0.05em',
  },
  keyTagVal: {
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  valBox: {
    padding: '6px 8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valBoxLabel: {
    fontSize: '9px',
    fontWeight: 800,
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  valBoxVal: {
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  matrixTableWrapper: {
    overflowX: 'auto',
  },
  matrixTable: {
    borderCollapse: 'collapse',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
  },
  matrixRowHeader: {
    padding: '6px 10px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 700,
  },
  matrixCell: {
    width: '42px',
    height: '42px',
    textAlign: 'center',
    verticalAlign: 'middle',
    border: '1px solid var(--border-color)',
    borderRadius: '4px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    transition: 'all 0.2s ease',
  },
  setPillsRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  setPill: {
    padding: '6px 12px',
    borderRadius: '16px',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    border: '1px solid rgba(168, 85, 247, 0.3)',
    color: '#c084fc',
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
  },
  barsContainer: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end',
    minHeight: '170px',
    padding: '12px 6px 4px 6px',
    backgroundColor: '#06070a',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.03)',
    overflowX: 'auto',
  },
  barWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    flex: 1,
    minWidth: '32px',
    maxWidth: '54px',
  },
  barValText: {
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  barColumn: {
    width: '100%',
    borderRadius: '6px 6px 2px 2px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  boxesRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    padding: '8px 0',
  },
  boxWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  pointerLabel: {
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
  },
  pointerTagJ: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    padding: '1px 4px',
    borderRadius: '3px',
  },
  pointerTagI: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#a855f7',
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
    padding: '1px 4px',
    borderRadius: '3px',
  },
  pointerTagMid: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    padding: '1px 4px',
    borderRadius: '3px',
  },
  pointerTagLow: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    padding: '1px 4px',
    borderRadius: '3px',
  },
  pointerTagHigh: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    padding: '1px 4px',
    borderRadius: '3px',
  },
  elementBox: {
    width: '46px',
    height: '46px',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '2px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  boxComparing: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    transform: 'scale(1.08)',
    boxShadow: '0 0 12px rgba(245, 158, 11, 0.5)',
  },
  boxAssigned: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
    transform: 'scale(1.08)',
    boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)',
  },
  boxMid: {
    borderColor: '#3b82f6',
  },
  boxValue: {
    fontSize: '14px',
    fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-primary)',
  },
  indexLabel: {
    fontSize: '11px',
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-muted)',
  },
  varsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
    gap: '8px',
  },
  varCard: {
    padding: '8px 10px',
    borderRadius: '6px',
    backgroundColor: 'var(--bg-tertiary)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    transition: 'all 0.2s ease',
  },
  varCardUpdated: {
    borderColor: 'var(--accent-color)',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  varName: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
  },
  varVal: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
  },
};

export default VisualizerPanel;
