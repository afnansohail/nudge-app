import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Dimensions, Keyboard, Platform, ScrollView, View, type KeyboardEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const RevealEndContext = createContext<() => void>(() => {});

/**
 * For inputs near the bottom of a form. Call it in the input's onFocus:
 * the form scrolls to the end once the keyboard is open, so the input is not
 * hidden behind the keyboard.
 */
export function useRevealFormEnd() {
  return useContext(RevealEndContext);
}

// If the keyboard does not open within this time, stop waiting.
const PENDING_TIMEOUT_MS = 1000;

/**
 * A form body that stays above the keyboard: the bottom of the form sits on
 * the top of the keyboard.
 *
 * Why not KeyboardAvoidingView: on Android with edge-to-edge (always on in
 * SDK 54), the window does not resize for the keyboard, and React Native's
 * keyboardDidShow reports `screenY` as the bottom of the screen, not the top
 * of the keyboard. KeyboardAvoidingView uses screenY, so it computes an
 * overlap of 0 and does nothing. The reported `height` is correct but leaves
 * out the navigation bar (it is ime inset − system bar inset; see
 * ReactRootView.checkForKeyboardEvents). So we compute the overlap ourselves
 * and add a spacer of that height under the ScrollView.
 */
export function FormScrollView({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const containerRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [keyboardOverlap, setKeyboardOverlap] = useState(0);
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

  useEffect(() => {
    const bottomInset = insets.bottom;
    const applyKeyboard = ({ height, screenY }: KeyboardEvent['endCoordinates']) => {
      // Top of the keyboard, in window coordinates (the window is the whole
      // screen with edge-to-edge). iOS reports screenY correctly.
      const keyboardTop =
        Platform.OS === 'android'
          ? Dimensions.get('screen').height - height - bottomInset
          : screenY;
      containerRef.current?.measureInWindow((_x, y, _width, containerHeight) => {
        setKeyboardOverlap(Math.max(0, y + containerHeight - keyboardTop));
      });
    };
    const onShow = (event: KeyboardEvent) => applyKeyboard(event.endCoordinates);
    const onHide = () => setKeyboardOverlap(0);

    // The keyboard may already be open when the form mounts.
    const metrics = Keyboard.metrics();
    if (Keyboard.isVisible() && metrics) applyKeyboard(metrics);

    const subscriptions = [
      Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', onShow),
      Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', onHide),
    ];
    return () => subscriptions.forEach((s) => s.remove());
  }, [insets.bottom]);

  const revealEnd = useCallback(() => {
    // Keyboard already open, so the form is already above it (focus moved
    // from another input): scroll now.
    if (Keyboard.isVisible()) {
      scrollToEnd();
      return;
    }
    // Otherwise wait for the spacer to shrink the ScrollView. onLayout below
    // does the scroll.
    clearPending();
    pendingReveal.current = true;
    pendingTimer.current = setTimeout(clearPending, PENDING_TIMEOUT_MS);
  }, [scrollToEnd, clearPending]);

  useEffect(() => clearPending, [clearPending]);

  return (
    <View ref={containerRef} className="flex-1">
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        onLayout={() => {
          // Fires when the spacer has made the ScrollView shorter.
          if (!pendingReveal.current) return;
          clearPending();
          scrollToEnd();
        }}
      >
        <RevealEndContext.Provider value={revealEnd}>{children}</RevealEndContext.Provider>
      </ScrollView>
      <View style={{ height: keyboardOverlap }} />
    </View>
  );
}
