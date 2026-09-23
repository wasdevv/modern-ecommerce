// Floating-label input in the hosted-checkout style.
export default function CoField({ id, label, ...props }: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <input id={id} placeholder={label} className="co-input peer" {...props} />
      <label htmlFor={id} className="co-label">
        {label}
      </label>
    </div>
  );
}
