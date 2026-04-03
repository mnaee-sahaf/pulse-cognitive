import { useEffect, useRef } from 'react';
import { useAudioPlayer } from 'expo-audio';

// Place a sound file at assets/sounds/level-up.mp3
// Any short upbeat chime works — recommended: ~0.5–1s, 44.1kHz MP3
const LEVEL_UP_SOUND = require('../assets/sounds/level-up.mp3');
const EVOLVE_SOUND = require('../assets/sounds/evolve.mp3');

export function useLevelUpSound() {
  const levelUpPlayer = useAudioPlayer(LEVEL_UP_SOUND);
  const evolvePlayer = useAudioPlayer(EVOLVE_SOUND);

  const playLevelUp = () => {
    try {
      levelUpPlayer.seekTo(0);
      levelUpPlayer.play();
    } catch (e) {
      // Sound file missing or audio unavailable — fail silently
    }
  };

  const playEvolve = () => {
    try {
      evolvePlayer.seekTo(0);
      evolvePlayer.play();
    } catch (e) {
      // Sound file missing or audio unavailable — fail silently
    }
  };

  return { playLevelUp, playEvolve };
}
