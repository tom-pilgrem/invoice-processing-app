type Option<T extends string> = {
  value: T;
  label: string;
};

export function Segmented<T extends string>({
  name,
  label,
  options,
  value,
  onChange,
}: {
  name: string;
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex border border-divider">
      {options.map((option, i) => (
        <label
          key={option.value}
          className={["flex-1", i > 0 ? "border-l border-divider" : ""].join(" ")}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="peer sr-only"
          />
          <span className="block cursor-pointer bg-surface px-3 py-2 text-center text-sm peer-checked:bg-accent peer-checked:text-background peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-accent-700">
            {option.label}
          </span>
        </label>
      ))}
    </div>
  );
}
