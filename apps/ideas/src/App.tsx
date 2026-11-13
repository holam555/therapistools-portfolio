import { useCallback, useEffect, useMemo, useState } from "react";
import * as api from "./api";
import { Feed } from "./Feed";
import { Home } from "./Home";
import { EditReel, OwnerSignIn, Suggest } from "./Dialogs";
import { applyFilter, parseRoute, routeHash, type Reel, type Route } from "./reels";
import { readSaved, toggleSaved, writeSaved } from "./saved";
import { SEED_REELS } from "./seed";

export type Dialog = { kind: "suggest" } | { kind: "signin" } | { kind: "edit"; reel: Reel; isNew: boolean } | null;

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseRoute(location.hash));
  const [reels, setReels] = useState<Reel[]>(SEED_REELS);
  const [fromServer, setFromServer] = useState(false);
  const [owner, setOwner] = useState(false);
  /** True once the reel list has answered: only then are suggesting and owner sign-in offered. */
  const [online, setOnline] = useState(false);
  const [saved, setSaved] = useState<string[]>(() => readSaved());
  const [dialog, setDialog] = useState<Dialog>(null);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute(location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((r: Route) => {
    location.hash = routeHash(r);
  }, []);

  /** The starter list shows until the real list arrives, and stays if it cannot be reached. */
  const reload = useCallback(async () => {
    if (!api.backendEnabled) return;
    try {
      const isOwner = api.hasStoredSession() ? await api.isOwner() : false;
      const list = await api.fetchReels();
      setOwner(isOwner);
      setOnline(true);
      if (list.length > 0 || isOwner) {
        setReels(list);
        setFromServer(true);
      }
    } catch {
      // Offline, the project asleep, or the table not made yet: keep the starter list.
    }
  }, []);
  useEffect(() => void reload(), [reload]);

  const savedSet = useMemo(() => new Set(saved), [saved]);
  const onToggleSave = useCallback((code: string) => {
    setSaved((cur) => {
      const next = toggleSaved(cur, code);
      writeSaved(next);
      return next;
    });
  }, []);

  const published = useMemo(() => reels.filter((r) => r.status === "published"), [reels]);
  const pending = useMemo(() => reels.filter((r) => r.status === "pending"), [reels]);
  const feedReels = useMemo(() => (route.review && owner ? pending : applyFilter(published, route.filter, savedSet)), [route, owner, pending, published, savedSet]);

  return (
    <>
      {route.view === "feed" ? (
        <Feed
          reels={feedReels}
          route={route}
          saved={savedSet}
          owner={owner && fromServer}
          onToggleSave={onToggleSave}
          onEdit={(reel) => setDialog({ kind: "edit", reel, isNew: false })}
          onClose={() => go({ view: "home", filter: {} })}
        />
      ) : (
        <Home
          reels={published}
          saved={savedSet}
          owner={owner}
          ownerReady={fromServer}
          pendingCount={pending.length}
          canSuggest={online}
          go={go}
          openDialog={setDialog}
          onAddStarters={async () => {
            await api.addReels(SEED_REELS);
            await reload();
          }}
        />
      )}
      {dialog?.kind === "suggest" && <Suggest known={reels} onClose={() => setDialog(null)} />}
      {dialog?.kind === "signin" && (
        <OwnerSignIn
          onClose={() => setDialog(null)}
          onDone={async () => {
            await reload();
            setDialog(null);
          }}
        />
      )}
      {dialog?.kind === "edit" && (
        <EditReel
          reel={dialog.reel}
          isNew={dialog.isNew}
          known={reels}
          onClose={() => setDialog(null)}
          onSaved={async () => {
            await reload();
            setDialog(null);
          }}
        />
      )}
    </>
  );
}
