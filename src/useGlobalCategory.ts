import { useState, useEffect, useCallback } from "react";

// Broadcast Channel for cross-tab/page communication
let broadcastChannel: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel {
  if (!broadcastChannel) {
    try {
      broadcastChannel = new BroadcastChannel("category-sync");
    } catch (e) {
      console.warn("BroadcastChannel not supported");
      // Fallback: create a dummy channel that doesn't actually broadcast
    }
  }
  return broadcastChannel;
}

// Hook for managing global category state across all pages and browsers
export function useGlobalCategory(eventSlug: string | undefined) {
  const [currentCategory, setCurrentCategory] = useState<string>(() => {
    // Try to load from sessionStorage first
    if (eventSlug) {
      const stored = sessionStorage.getItem(`category-${eventSlug}`);
      return stored || "";
    }
    return "";
  });

  // When category changes, notify other pages AND save to server
  const updateCategory = useCallback((newCategory: string) => {
    if (!eventSlug) return;

    // Save to sessionStorage
    sessionStorage.setItem(`category-${eventSlug}`, newCategory);

    // Save to server (for multi-browser sync)
    fetch(`/api/${eventSlug}/select-category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newCategory }),
    }).catch((e) => console.warn("Could not save category to server:", e));

    // Notify other pages via BroadcastChannel (same browser)
    try {
      const channel = getBroadcastChannel();
      channel.postMessage({
        type: "CATEGORY_CHANGED",
        eventSlug,
        category: newCategory,
      });
    } catch (e) {
      console.warn("Could not broadcast category change:", e);
    }

    setCurrentCategory(newCategory);
  }, [eventSlug]);

  // Listen for category changes from other pages (same browser)
  useEffect(() => {
    if (!eventSlug) return;

    const handleMessage = (event: MessageEvent) => {
      if (
        event.data?.type === "CATEGORY_CHANGED" &&
        event.data?.eventSlug === eventSlug
      ) {
        console.log("📢 Category changed on another page:", event.data.category);
        setCurrentCategory(event.data.category);
      }
    };

    try {
      const channel = getBroadcastChannel();
      channel.addEventListener("message", handleMessage);

      return () => {
        channel.removeEventListener("message", handleMessage);
      };
    } catch (e) {
      console.warn("Could not set up BroadcastChannel listener:", e);
      return;
    }
  }, [eventSlug]);

  // Poll server for category changes (multi-browser sync)
  useEffect(() => {
    if (!eventSlug || !currentCategory) return;

    const pollServerCategory = async () => {
      try {
        const res = await fetch(`/api/${eventSlug}/selected-category`);
        if (res.ok) {
          const data = await res.json();
          if (data.category && data.category !== currentCategory) {
            console.log("🔄 Category changed on another browser:", data.category);
            // Update sessionStorage
            sessionStorage.setItem(`category-${eventSlug}`, data.category);
            setCurrentCategory(data.category);
          }
        }
      } catch (e) {
        console.warn("Could not fetch category from server:", e);
      }
    };

    // Poll every 3 seconds for multi-browser sync
    const interval = setInterval(pollServerCategory, 3000);
    return () => clearInterval(interval);
  }, [eventSlug, currentCategory]);

  return { currentCategory, updateCategory };
}
