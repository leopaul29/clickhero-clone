import {useEffect, useRef} from "react";

/**
 * Replay a CSS animation every time `trigger` changes.
 *
 * A CSS animation only runs when it is *applied*, so re-rendering an element that
 * already carries the class does nothing — which is exactly the case that matters
 * here: two identical hits in a row must both shake. Removing the class, forcing a
 * reflow and re-adding it is the standard way to restart one, and it keeps the
 * timing in CSS where `prefers-reduced-motion` can switch it off.
 */
export function useReplayAnimation<T extends HTMLElement>(
    trigger: number | null | undefined,
    className: string,
) {
    const ref = useRef<T>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element || trigger === null || trigger === undefined) return;

        element.classList.remove(className);
        void element.offsetWidth; // Forces a reflow so the animation can start again.
        element.classList.add(className);
    }, [trigger, className]);

    return ref;
}
