'use client';

import { useMemo, useReducer } from 'react';

interface State {
  selectedStatementId: string | null;
  selectedEntryId: string | null;
}

type Action =
  | { type: 'SELECT_STATEMENT'; id: string }
  | { type: 'SELECT_ENTRY'; id: string }
  | { type: 'RESET' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SELECT_STATEMENT':
      return { ...state, selectedStatementId: action.id };
    case 'SELECT_ENTRY':
      return { ...state, selectedEntryId: action.id };
    case 'RESET':
      return { selectedStatementId: null, selectedEntryId: null };
    default:
      return state;
  }
}

export function useReconciliation() {
  const [state, dispatch] = useReducer(reducer, {
    selectedStatementId: null,
    selectedEntryId: null,
  });

  const actions = useMemo(
    () => ({
      selectStatement: (id: string) => dispatch({ type: 'SELECT_STATEMENT', id }),
      selectEntry: (id: string) => dispatch({ type: 'SELECT_ENTRY', id }),
      reset: () => dispatch({ type: 'RESET' }),
    }),
    [],
  );

  return { state, ...actions };
}
