import type { ExecutionEvent } from '../store/workspaceStore';

export interface ComplexityAnalysisResult {
  inputSizeN: number;
  totalSteps: number;
  compareCount: number;
  assignCount: number;
  maxStackDepth: number;
  loopCount: number;

  timeComplexity: string;
  spaceComplexity: string;
  timeBadgeColor: string;
  spaceBadgeColor: string;

  bestCase: string;
  avgCase: string;
  worstCase: string;
  spaceCase: string;

  confidenceScore: number;
  dominantCost: string;
  timeReasoning: string;
  spaceReasoning: string;
  evidenceBreakdown: string[];
  explanation: string;
}

export const analyzeComplexity = (
  events: ExecutionEvent[],
  _code?: string
): ComplexityAnalysisResult => {
  if (!events || events.length === 0) {
    return {
      inputSizeN: 0,
      totalSteps: 0,
      compareCount: 0,
      assignCount: 0,
      maxStackDepth: 0,
      loopCount: 0,
      timeComplexity: 'O(1)',
      spaceComplexity: 'O(1)',
      timeBadgeColor: '#10b981',
      spaceBadgeColor: '#10b981',
      bestCase: 'O(1)',
      avgCase: 'O(1)',
      worstCase: 'O(1)',
      spaceCase: 'O(1)',
      confidenceScore: 100,
      dominantCost: 'InstructionExecution',
      timeReasoning: 'No execution trace recorded.',
      spaceReasoning: 'No execution trace recorded.',
      evidenceBreakdown: [],
      explanation: 'No execution trace recorded.',
    };
  }

  let totalSteps = events.length;
  let compareCount = 0;
  let assignCount = 0;
  let loopCount = 0;
  let maxStackDepth = 1;
  let detectedInputSize = 0;

  // Extract PCAE Engine result from END event payload
  const endEvent = events.find((evt) => evt.type === 'END');
  const pcae = endEvent?.payload?.pcae_result || null;

  events.forEach((evt) => {
    if (evt.type === 'COMPARE') compareCount++;
    if (evt.type === 'ASSIGN') assignCount++;
    if (evt.type === 'LOOP_ENTER') loopCount++;
    if (evt.stack && evt.stack.length > maxStackDepth) {
      maxStackDepth = evt.stack.length;
    }

    const scope = { ...evt.globals, ...evt.locals };
    Object.values(scope).forEach((val) => {
      if (Array.isArray(val) && val.length > detectedInputSize) {
        detectedInputSize = val.length;
      }
    });
  });

  const N = Math.max(1, detectedInputSize || 4);

  let timeComp = pcae?.time_complexity || 'O(N)';
  let spaceComp = pcae?.space_complexity || 'O(1)';
  const confidenceScore = pcae?.confidence_score ?? 95.0;
  const dominantCost = pcae?.dominant_cost || 'Comparisons';
  const timeReasoning = pcae?.time_reasoning || `Execution finished linear pass.`;
  const spaceReasoning = pcae?.space_reasoning || `O(1) Auxiliary space.`;
  const evidenceBreakdown = pcae?.evidence_breakdown || [];

  let best = 'O(1)';
  let avg = timeComp;
  let worst = timeComp;
  let spaceStr = spaceComp === 'O(N)' ? 'O(N) Auxiliary' : 'O(1) Auxiliary Space';

  if (timeComp === 'O(N²)') {
    best = 'O(N)';
  } else if (timeComp === 'O(N log N)') {
    best = 'O(N log N)';
  } else if (timeComp === 'O(log N)') {
    best = 'O(1)';
  }

  // Color badges
  const getColor = (comp: string) => {
    if (comp === 'O(1)') return '#10b981'; // green
    if (comp.includes('log N') && !comp.includes('N log')) return '#10b981'; // green
    if (comp === 'O(N)') return '#38bdf8'; // sky blue
    if (comp.includes('N log N')) return '#f59e0b'; // amber
    return '#818cf8'; // indigo / purple for O(N^2) / O(2^N)
  };

  return {
    inputSizeN: N,
    totalSteps,
    compareCount,
    assignCount,
    maxStackDepth,
    loopCount,
    timeComplexity: timeComp,
    spaceComplexity: spaceComp,
    timeBadgeColor: getColor(timeComp),
    spaceBadgeColor: getColor(spaceComp),
    bestCase: best,
    avgCase: avg,
    worstCase: worst,
    spaceCase: spaceStr,
    confidenceScore,
    dominantCost,
    timeReasoning,
    spaceReasoning,
    evidenceBreakdown,
    explanation: `${timeReasoning} ${spaceReasoning}`,
  };
};
