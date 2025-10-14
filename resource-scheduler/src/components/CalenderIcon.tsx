const CalendarIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
    >
      <rect
        x="4"
        y="6"
        width="40"
        height="38"
        rx="4"
        ry="4"
        stroke="#333"
        strokeWidth="2"
        fill="white"
      />

      <rect x="4" y="6" width="40" height="6" fill="#333" rx="4" ry="4" />

      <line x1="4" y1="18" x2="44" y2="18" stroke="#ccc" strokeWidth="1" />
      <line x1="4" y1="26" x2="44" y2="26" stroke="#ccc" strokeWidth="1" />
      <line x1="4" y1="34" x2="44" y2="34" stroke="#ccc" strokeWidth="1" />

      <line x1="16" y1="12" x2="16" y2="44" stroke="#ccc" strokeWidth="1" />
      <line x1="28" y1="12" x2="28" y2="44" stroke="#ccc" strokeWidth="1" />

      <rect x="6" y="20" width="8" height="4" rx="1" fill="#2563EB" />
      <rect x="18" y="28" width="8" height="4" rx="1" fill="#16A34A" />
      <rect x="30" y="20" width="8" height="4" rx="1" fill="#FACC15" />
      <rect x="6" y="36" width="8" height="4" rx="1" fill="#EF4444" />
    </svg>
  );
};

export default CalendarIcon;
