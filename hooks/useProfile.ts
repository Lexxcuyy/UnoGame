import React from 'react';

const PROFILE_KEY = 'uno_profile_v1';

interface ProfileState {
  id: string;
  name: string;
}

const makeId = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}`);

const readProfile = (): ProfileState => {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return { id: makeId(), name: 'Player' };
    }
    const parsed = JSON.parse(raw);
    return {
      id: parsed?.id || makeId(),
      name: String(parsed?.name || 'Player').trim().slice(0, 24) || 'Player',
    };
  } catch {
    return { id: makeId(), name: 'Player' };
  }
};

export const useProfile = () => {
  const [profile, setProfile] = React.useState<ProfileState>(() => readProfile());

  React.useEffect(() => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }, [profile]);

  const setName = React.useCallback((name: string) => {
    setProfile(prev => ({
      ...prev,
      // Keep raw input editable (including empty) so backspace behaves naturally.
      name: name.slice(0, 24),
    }));
  }, []);

  return { profile, setName };
};
