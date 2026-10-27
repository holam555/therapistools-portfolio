import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { EmojiTheme } from '@/lib/shapes';
import { AgeBand } from '@/lib/defaultConfig';
import {
  ChildProfile,
  Nickname,
  ANON_PROFILE_ID,
  loadProfiles,
  getActiveProfileId,
  setActiveProfileId,
  addProfile as addProfileStore,
  updateProfile as updateProfileStore,
  deleteProfile as deleteProfileStore,
} from '@/lib/persistence';

interface ProfileContextValue {
  profiles: ChildProfile[];
  activeId: string | null;
  activeProfile: ChildProfile | null;
  /** The id used to bucket per-template config (active profile, or 'anon'). */
  effectiveProfileId: string;
  setActive: (id: string | null) => void;
  addProfile: (input: { label?: Nickname; ageBand: AgeBand; interests?: EmojiTheme[] }) => ChildProfile;
  updateProfile: (id: string, patch: Partial<Omit<ChildProfile, 'id' | 'createdAt'>>) => void;
  deleteProfile: (id: string) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  // Lazy-init from storage (guarded, SSR-safe: returns [] / null server-side).
  const [profiles, setProfiles] = useState<ChildProfile[]>(() => loadProfiles());
  const [activeId, setActiveId] = useState<string | null>(() => getActiveProfileId());

  const setActive = useCallback((id: string | null) => {
    setActiveProfileId(id);
    setActiveId(id);
  }, []);

  const addProfile = useCallback((input: { label?: Nickname; ageBand: AgeBand; interests?: EmojiTheme[] }) => {
    const p = addProfileStore(input);
    setProfiles(loadProfiles());
    setActiveId(p.id);
    return p;
  }, []);

  const updateProfile = useCallback((id: string, patch: Partial<Omit<ChildProfile, 'id' | 'createdAt'>>) => {
    updateProfileStore(id, patch);
    setProfiles(loadProfiles());
  }, []);

  const deleteProfile = useCallback((id: string) => {
    deleteProfileStore(id);
    setProfiles(loadProfiles());
    setActiveId(getActiveProfileId());
  }, []);

  // Guard against a stale active id pointing at a deleted profile.
  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? null,
    [profiles, activeId]
  );

  const value = useMemo<ProfileContextValue>(
    () => ({
      profiles,
      activeId,
      activeProfile,
      effectiveProfileId: activeProfile?.id ?? ANON_PROFILE_ID,
      setActive,
      addProfile,
      updateProfile,
      deleteProfile,
    }),
    [profiles, activeId, activeProfile, setActive, addProfile, updateProfile, deleteProfile]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfiles(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    // Defensive fallback so a component rendered outside the provider (e.g. an
    // isolated test) doesn't crash. Real app + prerender both wrap in the provider.
    return {
      profiles: [],
      activeId: null,
      activeProfile: null,
      effectiveProfileId: ANON_PROFILE_ID,
      setActive: () => {},
      addProfile: () => {
        throw new Error('ProfileProvider missing');
      },
      updateProfile: () => {},
      deleteProfile: () => {},
    };
  }
  return ctx;
}
