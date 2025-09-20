import { useEffect, useState } from "react";

export function useHeadsObserver() {
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const handleHashChange = () => {
      setActiveId(window.location.hash.substring(1));
    };

    handleHashChange();

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  return { activeId };
}

export function useHeadingsInView() {
  const [headingsInView, setHeadingsInView] = useState<string[]>([]);

  useEffect(() => {
    const headingElements = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    const observer = new IntersectionObserver(
      (entries) => {
        setHeadingsInView((prev) => {
          const updatedHeadings = new Set(prev);

          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              updatedHeadings.add(entry.target.id); // Add ID to the set
            } else {
              if (updatedHeadings.size > 1) {
                updatedHeadings.delete(entry.target.id); // Remove ID from the set
              }
            }
          });

          // Recheck all headings to ensure they are still in view
          headingElements.forEach((element) => {
            if (
              element.id &&
              element.getBoundingClientRect().top >= 0 &&
              element.getBoundingClientRect().bottom <= window.innerHeight
            ) {
              updatedHeadings.add(element.id);
            } else {
              if (updatedHeadings.size > 1) {
                updatedHeadings.delete(element.id); // Remove ID from the set
              }
            }
          });

          return Array.from(updatedHeadings); // Convert back to array
        });
      },
      {
        rootMargin: "0% 0% 0% 0%",
      }
    );

    headingElements.forEach((element) => {
      if (element.id) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return { headingsInView };
}
