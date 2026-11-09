import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Library, Recipe } from "../model/types";
import type { DisciplineId } from "../model/disciplines";
import { loadLibrary, loadRecipes, saveLibrary, saveRecipes } from "../model/storage";

/**
 * What the whole app shares: which discipline is open, and that discipline's
 * sentence library and recipes. The tabs that edited the library retired on
 * 2026-11-09; it is still kept because the privacy check's allow-list is built
 * from its wording, it carries the never-allow list, and backup files hold it.
 */
interface AppContext {
  lib: Library;
  update: (fn: (lib: Library) => Library) => void;
  replace: (lib: Library) => void;
  recipes: Recipe[];
  setRecipes: (r: Recipe[]) => void;
  /** Whose template is open. Switching remounts the provider with that discipline's data. */
  discipline: DisciplineId;
  changeDiscipline: (d: DisciplineId) => void;
}

const Ctx = createContext<AppContext | null>(null);

export function AppProvider({ children, discipline, changeDiscipline }: { children: ReactNode; discipline: DisciplineId; changeDiscipline: (d: DisciplineId) => void }) {
  const [lib, setLib] = useState<Library>(() => loadLibrary(discipline).library);
  const [recipes, setRecipesState] = useState<Recipe[]>(() => loadRecipes(discipline));

  useEffect(() => saveLibrary(lib, discipline), [lib, discipline]);

  const setRecipes = useCallback(
    (r: Recipe[]) => {
      setRecipesState(r);
      saveRecipes(r, discipline);
    },
    [discipline],
  );
  const update = useCallback((fn: (lib: Library) => Library) => setLib((cur) => fn(cur)), []);
  const replace = useCallback((next: Library) => setLib(next), []);

  return <Ctx.Provider value={{ lib, update, replace, recipes, setRecipes, discipline, changeDiscipline }}>{children}</Ctx.Provider>;
}

export function useApp(): AppContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
