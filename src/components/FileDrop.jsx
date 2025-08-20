import { Upload } from "lucide-react";

export default function FileDrop({ onFile, accept, label }) {
  const onChange = (e) => {
    const f = e.target.files?.[0];
    if (f) onFile(f);
  };
  return (
    <label className="flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 p-6 text-sm text-slate-600 hover:border-sky-400 cursor-pointer">
      <Upload className="h-4 w-4" />
      <span>{label}</span>
      <input type="file" className="hidden" accept={accept} onChange={onChange}/>
    </label>
  );
}
