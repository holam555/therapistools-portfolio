import { createContext, useCallback, useContext, useEffect, useReducer, useState, type ReactNode } from "react";
import type { Library, Recipe } from "../model/types";
import type { BuilderState } from "../model/assemble";
import type { DisciplineId } from "../model/disciplines";
import { loadDraft, loadLibrary, loadRecipes, saveDraft, saveLibrary, saveRecipes } from "../model/storage";

type Updater = (lib: Library) => Library;

interface State {
  lib: Library;
  history: Library[];
  fresh: boolean;
}

type Action = { type: "update"; fn: Updater } | { type: "replace"; lib: Library } | { type: "undo" };

const MAX_HISTORY = 50;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "update": {
      const next = action.fn(state.lib);
      if (next === state.lib) return state;
      return { lib: next, history: [...state.history.slice(-MAX_HISTORY + 1), state.lib], fresh: false };
    }
    case "replace":
      return { lib: action.lib, history: [...state.history.slice(-MAX_HISTORY + 1), state.lib], fresh: false };
    case "undo": {
      if (state.history.length === 0) return state;
      const history = state.history.slice(0, -1);
      return { lib: state.history[state.history.length - 1], history, fresh: false };
    }
  }
}

interface AppContext {
  lib: Library;
  /** Loaded the starter library because nothing was saved yet. */
  fresh: boolean;
  update: (fn: Updater) => void;
  replace: (lib: Library) => void;
  undo: () => void;
  canUndo: boolean;
  recipes: Recipe[];
  setRecipes: (r: Recipe[]) => void;
  /** The IEP currently being built (Builder and Output tabs share it). Autosaved. */
  draft: BuilderState;
  setDraft: (next: BuilderState | ((prev: BuilderState) => BuilderState)) => void;
  savedAt: Date | null;
  /** Whose sentence bank is open. Switching remounts the provider with that discipline's data. */
  discipline: DisciplineId;
  changeDiscipline: (d: DisciplineId) => void;
}

const Ctx = createContext<AppContext | null>(null);

function init(discipline: DisciplineId): State {
  const { library, fresh } = loadLibrary(discipline);
  return { lib: library, history: [], fresh };
}

function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export function AppProvider({
  children,
  discipline,
  changeDiscipline,
}: {
  children: ReactNode;
  discipline: DisciplineId;
  changeDiscipline: (d: DisciplineId) => void;
}) {
  const [state, dispatch] = useReducer(reducer, discipline, init);
  const [recipes, setRecipesState] = useState<Recipe[]>(() => loadRecipes(discipline));
  const [draft, setDraft] = useState<BuilderState>(() => loadDraft(discipline));
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => saveDraft(draft, discipline), [draft, discipline]);

  useEffect(() => {
    saveLibrary(state.lib, discipline);
    setSavedAt(new Date());
  }, [state.lib, discipline]);

  const setRecipes = useCallback(
    (r: Recipe[]) => {
      setRecipesState(r);
      saveRecipes(r, discipline);
    },
    [discipline],
  );

  const update = useCallback((fn: Updater) => dispatch({ type: "update", fn }), []);
  const replace = useCallback((lib: Library) => dispatch({ type: "replace", lib }), []);
  const undo = useCallback(() => dispatch({ type: "undo" }), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey && !isEditable(e.target)) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  return (
    <Ctx.Provider
      value={{
        lib: state.lib,
        fresh: state.fresh,
        update,
        replace,
        undo,
        canUndo: state.history.length > 0,
        recipes,
        setRecipes,
        draft,
        setDraft,
        savedAt,
        discipline,
        changeDiscipline,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): AppContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
