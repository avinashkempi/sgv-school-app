import { useEffect } from "react";
import { useNavigationContext } from "../context/NavigationContext";

/**
 * Hook to automatically scroll a ScrollView / FlatList / FlashList to top
 * when the matching bottom navigation tab is pressed while already active.
 *
 * @param {React.RefObject} scrollRef - Ref to ScrollView, FlatList, or FlashList
 * @param {string} route - The route associated with this screen (e.g. ROUTES.HOME, '/vibes', '/menu')
 */
export default function useTabScrollToTop(scrollRef, route) {
  const { subscribeScrollToTop } = useNavigationContext() || {};

  useEffect(() => {
    if (!subscribeScrollToTop || !route || !scrollRef) return;

    const unsubscribe = subscribeScrollToTop(route, () => {
      const current = scrollRef.current;
      if (!current) return;

      // FlatList / SectionList
      if (typeof current.scrollToOffset === "function") {
        current.scrollToOffset({ offset: 0, animated: true });
      }
      // ScrollView
      else if (typeof current.scrollTo === "function") {
        current.scrollTo({ y: 0, animated: true });
      }
      // FlashList
      else if (typeof current.scrollToIndex === "function") {
        current.scrollToIndex({ index: 0, animated: true });
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [subscribeScrollToTop, route, scrollRef]);
}
