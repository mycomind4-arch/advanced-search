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
  resolvedEntities: ResolvedEntity[];
  confidenceSummary: ConfidenceSummary;
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
  resolvedEntities: [],
  confidenceSummary: { overall: 0, high: 0, medium: 0, low: 0 },
};

// -- Actions --
type Action =
  | { type: 'SET_SEARCH_QUERY'; query: string }
  | { type: 'SET_SEARCH_MODE'; mode: SearchMode }
  | { type: 'START_SEARCH'; stages: PipelineStage[] }
  | { type: 'UPDATE_PIPELINE_STAGE'; stageId: string; status: PipelineStage['status']; resultCount?: number; elapsedMs?: number; error?: string }
  | { type: 'ADD_SEARCH_RESULTS'; results: SearchObservation[] }
  | { type: 'SET_SEARCH_RESULTS'; results: SearchObservation[] }
  | { type: 'COMPLETE_SEARCH' }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'SET_RESOLVED_ENTITIES'; entities: ResolvedEntity[] }
  | { type: 'SET_CONFIDENCE'; confidence: ConfidenceSummary }
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
      return { ...state, isSearching: true, pipelineStages: action.stages, searchResults: [], resolvedEntities: [] };
    case 'UPDATE_PIPELINE_STAGE':
      return {
        ...state,
        pipelineStages: state.pipelineStages.map((s) =>
          s.id === action.stageId
            ? { ...s, status: action.status, resultCount: action.resultCount ?? s.resultCount, elapsedMs: action.elapsedMs ?? s.elapsedMs, error: action.error }
            : s
        ),
      };
    case 'ADD_SEARCH_RESULTS':
      return { ...state, searchResults: [...state.searchResults, ...action.results] };
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.results };
    case 'COMPLETE_SEARCH':
      return { ...state, isSearching: false };
    case 'CLEAR_SEARCH':
      return { ...state, searchResults: [], pipelineStages: [], searchQuery: '', isSearching: false, resolvedEntities: [] };
    case 'SET_RESOLVED_ENTITIES':
      return { ...state, resolvedEntities: action.entities };
    case 'SET_CONFIDENCE':
      return { ...state, confidenceSummary: action.confidence };
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

    try {
      const resp = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mode }),
      });

      if (!resp.ok || !resp.body) {
        // Fallback: mark all stages as failed
        for (const stage of stages) {
          if (stage.status !== 'not-configured') {
            dispatch({ type: 'UPDATE_PIPELINE_STAGE', stageId: stage.id, status: 'failed', error: 'API error' });
          }
        }
        dispatch({ type: 'COMPLETE_SEARCH' });
        return;
      }

      // Parse SSE stream
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let intermediateResults: SearchObservation[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string;
              stageId?: string;
              stageName?: string;
              status?: string;
              resultCount?: number;
              elapsedMs?: number;
              error?: string;
              observations?: SearchObservation[];
              entities?: any[];
              confidence?: ConfidenceSummary;
            };

            switch (event.type) {
              case 'stage-start':
                if (event.stageId && event.status) {
                  dispatch({ type: 'UPDATE_PIPELINE_STAGE', stageId: event.stageId, status: event.status as PipelineStage['status'] });
                }
                break;
              case 'stage-complete':
                if (event.stageId) {
                  dispatch({
                    type: 'UPDATE_PIPELINE_STAGE',
                    stageId: event.stageId,
                    status: 'completed',
                    resultCount: event.resultCount,
                    elapsedMs: event.elapsedMs,
                  });
                }
                break;
              case 'stage-error':
                if (event.stageId) {
                  dispatch({
                    type: 'UPDATE_PIPELINE_STAGE',
                    stageId: event.stageId,
                    status: (event.status as PipelineStage['status']) ?? 'failed',
                    error: event.error,
                    elapsedMs: event.elapsedMs,
                  });
                }
                break;
              case 'results':
                if (event.observations) {
                  // First 'results' event adds to list; second (final) replaces with ranked
                  if (intermediateResults.length === 0) {
                    intermediateResults = event.observations;
                    dispatch({ type: 'ADD_SEARCH_RESULTS', results: event.observations });
                  } else {
                    // Final ranked results — replace
                    dispatch({ type: 'SET_SEARCH_RESULTS', results: event.observations });
                  }
                }
                break;
              case 'entities':
                if (event.entities) {
                  const entities: ResolvedEntity[] = event.entities.map((e, i) => ({
                    id: `entity-${Date.now()}-${i}`,
                    type: e.type,
                    name: e.name,
                    aliases: e.aliases ?? [],
                    confidence: e.confidence,
                    sources: e.sources ?? [],
                    relationships: [],
                    appearances: e.appearances ?? [],
                    firstSeen: new Date().toISOString(),
                    lastSeen: new Date().toISOString(),
                  }));
                  dispatch({ type: 'SET_RESOLVED_ENTITIES', entities });
                }
                break;
              case 'confidence':
                if (event.confidence) {
                  dispatch({ type: 'SET_CONFIDENCE', confidence: event.confidence });
                }
                break;
              case 'done':
                dispatch({ type: 'COMPLETE_SEARCH' });
                break;
            }
          } catch { /* skip malformed event */ }
        }
      }

      dispatch({ type: 'COMPLETE_SEARCH' });
    } catch (err) {
      // Network or parse error — mark remaining stages as failed
      for (const stage of stages) {
        if (stage.status !== 'not-configured') {
          dispatch({ type: 'UPDATE_PIPELINE_STAGE', stageId: stage.id, status: 'failed', error: String(err) });
        }
      }
      dispatch({ type: 'COMPLETE_SEARCH' });
    }
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
