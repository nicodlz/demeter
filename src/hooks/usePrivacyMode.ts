import { useStore } from '../store';

/**
 * Global privacy mode hook.
 * When active, all monetary values are masked with '•••••'.
 */
export const usePrivacyMode = () => {
  const settings = useStore((state) => state.settings);
  const updateSettings = useStore((state) => state.updateSettings);

  const privacyMode = settings.privacyMode ?? false;

  const togglePrivacy = () => updateSettings({ privacyMode: !privacyMode });

  /** Mask a formatted string when privacy mode is on */
  const mask = (value: string) => (privacyMode ? '•••••' : value);

  /** Mask with shorter placeholder (for axis ticks, compact displays) */
  const maskShort = (value: string) => (privacyMode ? '•••' : value);

  return { privacyMode, togglePrivacy, mask, maskShort };
};
