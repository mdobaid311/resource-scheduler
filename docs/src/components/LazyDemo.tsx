import { Suspense, lazy, useEffect, useRef, useState, type ComponentType } from "react";

const loaders = import.meta.glob<{ default: ComponentType }>("./demos/*Demo.tsx");

/** Loads and mounts one demo by file name once it scrolls near the viewport. */
export default function LazyDemo({ name }: { name: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [Demo, setDemo] = useState<ComponentType | null>(null);

  useEffect(() => {
    const el = host.current;
    const load = loaders[`./demos/${name}.tsx`];
    if (!el || !load) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        setDemo(() => lazy(load));
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [name]);

  return (
    <div ref={host}>
      {Demo && (
        <Suspense fallback={null}>
          <Demo />
        </Suspense>
      )}
    </div>
  );
}
