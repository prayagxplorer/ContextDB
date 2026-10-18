import { useId, useRef } from "react";
// Arrow keys, Home/End and roving focus follow the ARIA tabs interaction model.
export function Tabs({ labels, value, onChange, label, children }) {
  const id = useId(),
    refs = useRef([]);
  function keyDown(event, index) {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % labels.length
        : event.key === "ArrowLeft"
          ? (index + labels.length - 1) % labels.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? labels.length - 1
              : null;
    if (next !== null) {
      event.preventDefault();
      onChange(labels[next]);
      refs.current[next]?.focus();
    }
  }
  return (
    <>
      <div className="tabs" role="tablist" aria-label={label}>
        {labels.map((name, index) => (
          <button
            key={name}
            ref={(node) => {
              refs.current[index] = node;
            }}
            id={`${id}-${index}`}
            role="tab"
            aria-controls={`${id}-panel`}
            aria-selected={value === name}
            tabIndex={value === name ? 0 : -1}
            onKeyDown={(event) => keyDown(event, index)}
            onClick={() => onChange(name)}
          >
            {name}
          </button>
        ))}
      </div>
      <section
        className="panel"
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-${labels.indexOf(value)}`}
        tabIndex={0}
      >
        {children}
      </section>
    </>
  );
}
