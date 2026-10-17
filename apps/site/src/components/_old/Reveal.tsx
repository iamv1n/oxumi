"use client";

import { type ReactNode, useEffect, useRef } from "react";

// Fades and lifts its children in the first time they scroll into view.
export default function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current!;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry!.isIntersecting) return;
        el.classList.add("in");
        observer.disconnect();
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
