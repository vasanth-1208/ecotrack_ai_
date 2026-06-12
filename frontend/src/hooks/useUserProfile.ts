'use client';

import { useCallback, useEffect, useState } from 'react';
import { AUTH_PROFILE_UPDATED_EVENT, api } from '../lib/api';
import type { AuthProfile } from '../types/ecotrack';

type ProfileEvent = CustomEvent<AuthProfile>;

export const useUserProfile = () => {
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    try {
      const result = await api.auth.me();
      setProfile(result.user);
      return result.user;
    } catch (error) {
      console.error('Profile refresh failed:', error);
      setProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const handleProfileUpdate = (event: Event) => {
      const detail = (event as ProfileEvent).detail;
      if (detail) {
        setProfile(detail);
      }
    };

    const handleFocus = () => {
      void refreshProfile();
    };

    void refreshProfile().finally(() => setLoading(false));
    window.addEventListener(AUTH_PROFILE_UPDATED_EVENT, handleProfileUpdate);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener(AUTH_PROFILE_UPDATED_EVENT, handleProfileUpdate);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshProfile]);

  return {
    profile,
    loading,
    refreshProfile,
  };
};
