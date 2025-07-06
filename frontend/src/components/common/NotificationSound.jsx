import { useEffect, useRef } from 'react';

const NotificationSound = () => {
  const audioRef = useRef(null);

  useEffect(() => {
    // Create a simple notification sound using Web Audio API
    const createNotificationSound = () => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    };

    // Store the function for later use
    audioRef.current = createNotificationSound;
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      try {
        audioRef.current();
      } catch (error) {
        console.log('Could not play notification sound:', error);
        // Fallback to a simple beep using console
        console.log('\u0007'); // This is the bell character
      }
    }
  };

  return { playNotificationSound };
};

export default NotificationSound; 