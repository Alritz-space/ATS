export default function StepPill({ active, title, subtitle, dim }) {
  return (
    <li className={`rounded-2xl border p-3 flex items-center justify-between gap-2 ${
      active ? "border-sky-300 bg-white shadow-sm" : "border-slate-200 bg-white"
    } ${dim ? "opacity-60" : ""}`}>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-slate-500">{subtitle}</div>
      </div>
      {active ? <span className="h-2 w-2 rounded-full bg-sky-500"/> : <span className="h-2 w-2 rounded-full bg-slate-300"/>}
    </li>
  );
}
