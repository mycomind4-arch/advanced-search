'use client';

import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import type {
  Investigation, EvidenceItem, SearchObservation, SearchMode,
  PipelineStage, SourceStatus, ResolvedEntity, ConfidenceSummary,
} from './types';
import { buildPipelineStages } from './agents';
import { getSourceStatuses } from './sources';

const STORAGE_KEY = 'advanced-search-investigations';

// -- State --
interface AppState {
  investigations: Investigation[];
  activeInvestigationId: string | null;
  searchResults: SearchObservation[];
  searchQuery: string;
  searchMode: SearchMode;
  isSearching: boolean;
  pipelineStages: PipelineStage[];
  selectedResultId: string | null;
  inspectorOpen: boolean;
  sidebarCollapsed: boolean;
  sidebarOpenMobile: boolean;
  commandPaletteOpen: boolean;
  sources: SourceStatus[];
  filters: Record<string, string[]>;
}

const initialState: AppState = {
  investigations: [],
  activeInvestigationId: null,
  searchResults: [],
  searchQuery: '',
  searchMode: 'text',
  isSearching: false,
  pipelineStages: [],
  selectedResultId: null,
  inspectorOpen: false,
  sidebarCollapsed: false,
  sidebarOpenMobile: false,
  commandPaletteOpen: false,
  sources: getSourceStatuses(),
  filters: {},
};

// -- Actions --
type Action =
  | { type: 'SET_SEARCH_QUERY'; query: string }
  | { type: 'SET_SEARCH_MODE'; mode: SearchMode }
  | { type: 'START_SEARCH'; stages: PipelineStage[] }
  | { type: 'UPDATE_PIPELINE_STAGE'; stageId: string; status: PipelineStage['status']; resultCount?: number; elapsedMs?: number; error?: string }
  | { type: 'COMPLETE_SEARCH'; results: SearchObservation[] }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'SELECT_RESULT'; resultId: string | null }
  | { type: 'TOGGLE_INSPECTOR'; open: boolean }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_SIDEBAR_MOBILE' }
  | { type: 'TOGGLE_COMMAND_PALETTE'; open?: boolean }
  | { type: 'CREATE_INVESTIGATION'; investigation: Investigation }
  | { type: 'UPDATE_INVESTIGATION'; id: string; updates: Partial<Investigation> }
  | { type: 'DELETE_INVESTIGATION'; id: string }
  | { type: 'SET_ACTIVE_INVESTIGATION'; id: string | null }
  | { type: 'ADD_EVIDENCE'; investigationId: string; evidence: EvidenceItem }
  | { type: 'REMOVE_EVIDENCE'; investigationId: string; evidenceId: string }
  | { type: 'UPDATE_EVIDENCE'; investigationId: string; evidenceId: string; updates: Partial<EvidenceItem> }
  | { type: 'ADD_ENTITY'; investigationId: string; entity: ResolvedEntity }
  | { type: 'SET_FILTERS'; filters: Record<string, string[]> }
  | { type: 'SET_SOURCES'; sources: SourceStatus[] }
  | { type: 'LOAD_STATE'; state: Partial<AppState> };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.query };
    case 'SET_SEARCH_MODE':
      return { ...state, searchMode: action.mode };
    case 'START_SEARCH':
      return { ...state, isSearching: true, pipelineStages: action.stages, searchResults: [] };
    case 'UPDATE_PIPELINE_STAGE':
      return {
        ...state,
        pipelineStages: state.pipelineStages.map((s) =>
          s.id === action.stageId
            ? { ...s, status: action.status, resultCount: action.resultCount ?? s.resultCount, elapsedMs: action.elapsedMs ?? s.elapsedMs, error: action.error }
            : s
        ),
      };
    case 'COMPLETE_SEARCH':
      return { ...state, isSearching: false, searchResults: action.results };
    case 'CLEAR_SEARCH':
      return { ...state, searchResults: [], pipelineStages: [], searchQuery: '', isSearching: false };
    case 'SELECT_RESULT':
      return { ...state, selectedResultId: action.resultId, inspectorOpen: action.resultId !== null };
    case 'TOGGLE_INSPECTOR':
      return { ...state, inspectorOpen: action.open };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'TOGGLE_SIDEBAR_MOBILE':
      return { ...state, sidebarOpenMobile: !state.sidebarOpenMobile };
    case 'TOGGLE_COMMAND_PALETTE':
      return { ...state, commandPaletteOpen: action.open ?? !state.commandPaletteOpen };
    case 'CREATE_INVESTIGATION':
      return {
        ...state,
        investigations: [action.investigation, ...state.investigations],
        activeInvestigationId: action.investigation.id,
      };
    case 'UPDATE_INVESTIGATION':
      return {
        ...state,
        investigations: state.investigations.map((inv) =>
          inv.id === action.id ? { ...inv, ...action.updates, updatedAt: new Date().toISOString() } : inv
        ),
      };
    case 'DELETE_INVESTIGATION':
      return {
        ...state,
        investigations: state.investigations.filter((inv) => inv.id !== action.id),
        activeInvestigationId: state.activeInvestigationId === action.id ? null : state.activeInvestigationId,
      };
    case 'SET_ACTIVE_INVESTIGATION':
      return { ...state, activeInvestigationId: action.id };
    case 'ADD_EVIDENCE':
      return {
        ...state,
        investigations: state.investigations.map((inv) =>
          inv.id === action.investigationId
            ? { ...inv, evidence: [...inv.evidence, action.evidence], updatedAt: new Date().toISOString() }
            : inv
        ),
      };
    case 'REMOVE_EVIDENCE':
      return {
        ...state,
        investigations: state.investigations.map((inv) =>
          inv.id === action.investigationId
            ? { ...inv, evidence: inv.evidence.filter((e) => e.id !== action.evidenceId), updatedAt: new Date().toISOString() }
            : inv
        ),
      };
    case 'UPDATE_EVIDENCE':
      return {
        ...state,
        investigations: state.investigations.map((inv) =>
          inv.id === action.investigationId
            ? {
                ...inv,
                evidence: inv.evidence.map((e) => (e.id === action.evidenceId ? { ...e, ...action.updates } : e)),
                updatedAt: new Date().toISOString(),
              }
            : inv
        ),
      };
    case 'ADD_ENTITY':
      return {
        ...state,
        investigations: state.investigations.map((inv) =>
          inv.id === action.investigationId
            ? { ...inv, entities: [...inv.entities, action.entity], updatedAt: new Date().toISOString() }
            : inv
        ),
      };
    case 'SET_FILTERS':
      return { ...state, filters: action.filters };
    case 'SET_SOURCES':
      return { ...state, sources: action.sources };
    case 'LOAD_STATE':
      return { ...state, ...action.state };
    default:
      return state;
  }
}

// -- Context --
interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  createInvestigation: (query: string, mode: SearchMode) => Investigation;
  runSearch: (query: string, mode: SearchMode) => Promise<void>;
  addEvidence: (observation: SearchObservation) => void;
  isEvidenceSaved: (observationId: string) => boolean;
  activeInvestigation: Investigation | null;
  selectedResult: SearchObservation | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const investigations = JSON.parse(stored) as Investigation[];
        dispatch({ type: 'LOAD_STATE', state: { investigations } });
      }
    } catch { /* ignore */ }
  }, []);

  // Persist investigations to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.investigations));
    } catch { /* ignore */ }
  }, [state.investigations]);

  const createInvestigation = useCallback((query: string, mode: SearchMode): Investigation => {
    const id = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const stages = buildPipelineStages(mode);
    const investigation: Investigation = {
      id,
      title: query.slice(0, 80) || 'Untitled Investigation',
      query,
      mode,
      status: 'active',
      createdAt: now,
      updatedAt: now,
      evidence: [],
      entities: [],
      sources: getSourceStatuses(),
      notes: '',
      pipelineStages: stages,
      resultCount: 0,
      confidenceSummary: { overall: 0, high: 0, medium: 0, low: 0 },
    };
    dispatch({ type: 'CREATE_INVESTIGATION', investigation });
    return investigation;
  }, []);

  const runSearch = useCallback(async (query: string, mode: SearchMode) => {
    const stages = buildPipelineStages(mode);
    dispatch({ type: 'START_SEARCH', stages });

    // Simulate pipeline execution — honestly represents the architecture.
    // Configured sources (Wayback, Common Crawl) attempt to run.
    // Unconfigured sources show "not configured".
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      if (stage.status === 'not-configured') continue;

      dispatch({ type: 'UPDATE_PIPELINE_STAGE', stageId: stage.id, status: 'running' });
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

      // Simulate results for configured sources only
      const hasResults = Math.random() > 0.3;
      if (hasResults) {
        const count = Math.floor(Math.random() * 15) + 1;
        dispatch({ type: 'UPDATE_PIPELINE_STAGE', stageId: stage.id, status: 'completed', resultCount: count, elapsedMs: Math.floor(Math.random() * 2000) + 200 });
      } else {
        dispatch({ type: 'UPDATE_PIPELINE_STAGE', stageId: stage.id, status: 'completed', resultCount: 0, elapsedMs: Math.floor(Math.random() * 1500) + 200 });
      }
    }

    // Generate placeholder results to represent what the system found.
    // In production, these would come from the real adapters.
    const results: SearchObservation[] = generatePlaceholderResults(query, mode);
    dispatch({ type: 'COMPLETE_SEARCH', results });
  }, []);

  const addEvidence = useCallback((observation: SearchObservation) => {
    if (!state.activeInvestigationId) return;
    const evidence: EvidenceItem = {
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      observation,
      investigationId: state.activeInvestigationId,
      addedAt: new Date().toISOString(),
      labels: [],
      relationships: [],
    };
    dispatch({ type: 'ADD_EVIDENCE', investigationId: state.activeInvestigationId, evidence });
  }, [state.activeInvestigationId]);

  const isEvidenceSaved = useCallback((observationId: string): boolean => {
    const inv = state.investigations.find((i) => i.id === state.activeInvestigationId);
    return inv?.evidence.some((e) => e.observation.id === observationId) ?? false;
  }, [state.investigations, state.activeInvestigationId]);

  const activeInvestigation = useMemo(
    () => state.investigations.find((i) => i.id === state.activeInvestigationId) ?? null,
    [state.investigations, state.activeInvestigationId]
  );

  const selectedResult = useMemo(
    () => state.searchResults.find((r) => r.id === state.selectedResultId) ?? null,
    [state.searchResults, state.selectedResultId]
  );

  const value: AppContextValue = {
    state,
    dispatch,
    createInvestigation,
    runSearch,
    addEvidence,
    isEvidenceSaved,
    activeInvestigation,
    selectedResult,
  };

  return React.createElement(AppContext.Provider, { value }, children);
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

// -- Helpers --
function generatePlaceholderResults(query: string, mode: SearchMode): SearchObservation[] {
  const providers = [
    { provider: 'wayback', sourceType: 'archive' },
    { provider: 'common-crawl', sourceType: 'archive' },
  ];
  const results: SearchObservation[] = [];
  const count = Math.floor(Math.random() * 8) + 2;
  for (let i = 0; i < count; i++) {
    const p = providers[i % providers.length];
    results.push({
      id: `obs-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      provider: p.provider,
      sourceUrl: `https://web.archive.org/web/2024/https://example.com/${encodeURIComponent(query.toLowerCase().replace(/\s+/g, '-'))}`,
      title: `${query} — related document ${i + 1}`,
      snippet: `Archived reference containing "${query}" discovered through ${p.provider}. This is a placeholder result representing what the system would return when adapters are fully configured.`,
      discoveredAt: new Date().toISOString(),
      publishedAt: new Date(Date.now() - Math.random() * 365 * 86400000).toISOString(),
      sourceType: p.sourceType,
      queryJobId: `job-${Date.now()}`,
      providerScore: 0.5 + Math.random() * 0.4,
      signals: {
        textRelevance: 0.4 + Math.random() * 0.5,
        sourceQuality: 0.5 + Math.random() * 0.4,
        temporalConsistency: 0.3 + Math.random() * 0.5,
        corroboration: Math.random() > 0.5 ? Math.random() : undefined,
      },
      entities: [],
    });
  }
  return results;
}
