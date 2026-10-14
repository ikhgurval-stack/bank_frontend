import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
export function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"
      >
        <ArrowDownLeft size={19} />
        <ArrowUpRight size={19} className="-ml-2" />
      </span>
      <div>
        <p className="text-lg font-bold tracking-tight">
          MNT Flow<span className="text-primary">.</span>
        </p>
      </div>
    </div>
  );
}
