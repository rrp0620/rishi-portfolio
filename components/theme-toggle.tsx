"use client";

/**
 * Theme toggle button. No React state, no useEffect: the source of
 * truth is the `dark` class on <html> (set by the bootstrap script in
 * layout.tsx, mutated here on click). The icon swap is purely CSS, via
 * Tailwind's `dark:` variant, so the toggle stays in sync with the DOM
 * even if something else flips the theme class.
 */
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    if (root.classList.contains("dark")) {
      root.classList.remove("dark");
      try {
        localStorage.setItem("theme", "light");
      } catch {}
    } else {
      root.classList.add("dark");
      try {
        localStorage.setItem("theme", "dark");
      } catch {}
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
      className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-border bg-card text-foreground transition-colors hover:bg-secondary"
    >
      <span className="dark:hidden">
        <MoonIcon />
      </span>
      <span className="hidden dark:inline-flex">
        <SunIcon />
      </span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
