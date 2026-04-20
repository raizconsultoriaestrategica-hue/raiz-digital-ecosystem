import { useCallback, useMemo, useReducer } from "react";
import { initScores, getActivePilares } from "../logic";
import type { ClientData, ScoresMap, SelOpts } from "../types";

export type Step = "intro" | "dados" | "diag" | "loading" | "result" | "admin";

interface State {
  step: Step;
  selOpts: SelOpts;
  client: ClientData;
  scores: ScoresMap;
  currentPilar: number;
  notas: string;
  clienteId: string | null;
}

const emptyClient: ClientData = {
  name: "", cidade: "", proc: "", objetivo: "", dor: "", meta: "", data: "",
  fat: "—", tipo: "—", func: "—", ticket: "—", cadeiras: "—", tempo: "—", pacientes: "—",
};

const initialState: State = {
  step: "intro",
  selOpts: {},
  client: emptyClient,
  scores: {},
  currentPilar: 0,
  notas: "",
  clienteId: null,
};

type Action =
  | { type: "GO"; step: Step }
  | { type: "SET_SEL"; group: string; value: string }
  | { type: "SET_CLIENT_FIELD"; key: keyof ClientData; value: string }
  | { type: "SET_CLIENTE_ID"; id: string | null }
  | { type: "SET_NOTAS"; value: string }
  | { type: "START_DIAG" }
  | { type: "SET_SCORE"; pid: string; qi: number; score: number }
  | { type: "FILL_NULL_WITH_ZERO"; pid: string }
  | { type: "SET_CURRENT_PILAR"; index: number }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "GO":
      return { ...state, step: action.step };
    case "SET_SEL":
      return { ...state, selOpts: { ...state.selOpts, [action.group]: action.value } };
    case "SET_CLIENT_FIELD":
      return { ...state, client: { ...state.client, [action.key]: action.value } };
    case "SET_CLIENTE_ID":
      return { ...state, clienteId: action.id };
    case "SET_NOTAS":
      return { ...state, notas: action.value };
    case "START_DIAG": {
      const sel = state.selOpts;
      const client: ClientData = {
        ...state.client,
        fat: sel.fat || "—",
        tipo: sel.tipo || "—",
        func: sel.func || "—",
        ticket: sel.ticket || "—",
        cadeiras: sel.cadeiras || "—",
        tempo: sel.tempo || "—",
        pacientes: sel.pacientes || "—",
      };
      return { ...state, client, scores: initScores(sel), currentPilar: 0, step: "diag" };
    }
    case "SET_SCORE": {
      const arr = [...(state.scores[action.pid] || [])];
      arr[action.qi] = action.score;
      return { ...state, scores: { ...state.scores, [action.pid]: arr } };
    }
    case "FILL_NULL_WITH_ZERO": {
      const arr = (state.scores[action.pid] || []).map((s) => (s === null ? 0 : s));
      return { ...state, scores: { ...state.scores, [action.pid]: arr } };
    }
    case "SET_CURRENT_PILAR":
      return { ...state, currentPilar: action.index };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useDiagnostico() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const activePilares = useMemo(() => getActivePilares(state.selOpts), [state.selOpts]);

  const goTo = useCallback((step: Step) => dispatch({ type: "GO", step }), []);
  const setSel = useCallback((group: string, value: string) => dispatch({ type: "SET_SEL", group, value }), []);
  const setClientField = useCallback(
    (key: keyof ClientData, value: string) => dispatch({ type: "SET_CLIENT_FIELD", key, value }),
    [],
  );
  const setClienteId = useCallback((id: string | null) => dispatch({ type: "SET_CLIENTE_ID", id }), []);
  const setNotas = useCallback((value: string) => dispatch({ type: "SET_NOTAS", value }), []);
  const startDiag = useCallback(() => dispatch({ type: "START_DIAG" }), []);
  const setScore = useCallback(
    (pid: string, qi: number, score: number) => dispatch({ type: "SET_SCORE", pid, qi, score }),
    [],
  );
  const fillNullWithZero = useCallback((pid: string) => dispatch({ type: "FILL_NULL_WITH_ZERO", pid }), []);
  const setCurrentPilar = useCallback((index: number) => dispatch({ type: "SET_CURRENT_PILAR", index }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    state,
    activePilares,
    goTo,
    setSel,
    setClientField,
    setClienteId,
    setNotas,
    startDiag,
    setScore,
    fillNullWithZero,
    setCurrentPilar,
    reset,
  };
}
