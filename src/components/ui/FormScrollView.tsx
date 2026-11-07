import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

const RevealEndContext = createContext<() => void>(() => {});

/**
 * For inputs near the bottom of a form. Call it in the input's onFocus:
 * the form scrolls to the end once the keyboard is open, so the input is not
 * hidden behind the keyboard.
 */
export function useRevealFormEnd() {
  return useContext(RevealEndContext);
}

// If the keyboard does not resize the view within this time, stop waiting.
const PENDING_TIMEOUT_MS = 1000;

/**
 * A keyboard-aware form body. The KeyboardAvoidingView makes the screen
 * shorter when the keyboard opens, but nothing scrolls the focused input
 * back into view. On Android the input gets focus before the keyboard
 * resizes the view, so an input near the bottom ends up behind the keyboard.
 */
export function FormScrollView({ children }: { children: ReactNode }) {
  const scrollRef = useRef<ScrollView>(null);
  const pendingReveal = useRef(false);
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToEnd = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  const clearPending = useCallback(() => {
    pendingReveal.current = false;
    if (pendingTimer.current) clearTimeout(pendingTimer.current);
    pendingTimer.current = null;
  }, []);

  const revealEnd = useCallback(() => {
    // Keyboard already open (focus moved from another input): the view will
    // not resize again, so scroll now.
    if (Keyboard.isVisible()) {
      scrollToEnd();
      return;
    }
    // Otherwise wait for the resize. onLayout below does the scroll.
    clearPending();
    pendingReveal.current = true;
    pendingTimer.current = setTimeout(clearPending, PENDING_TIMEOUT_MS);
  }, [scrollToEnd, clearPending]);

  useEffect(() => clearPending, [clearPending]);

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        onLayout={() => {
          // Fires when the KeyboardAvoidingView has made the view shorter.
          if (!pendingReveal.current) return;
          clearPending();
          scrollToEnd();
        }}
      >
        <RevealEndContext.Provider value={revealEnd}>{children}</RevealEndContext.Provider>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
