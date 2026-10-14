import { AlertCircle, LoaderCircle, Inbox } from "lucide-react";
import { Button } from "./ui/button";
export function ErrorNotice({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 p-4 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p>{message}</p>
        {retry && (
          <Button variant="outline" size="sm" onClick={retry} className="mt-3">
            Дахин оролдох
          </Button>
        )}
      </div>
    </div>
  );
}
export function Loading() {
  return (
    <div
      role="status"
      className="flex min-h-40 items-center justify-center gap-3 text-sm text-muted-foreground"
    >
      <LoaderCircle className="size-5 animate-spin" />
      Уншиж байна…
    </div>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="px-5 py-12 text-center">
      <Inbox className="mx-auto mb-4 size-8 text-muted-foreground" />
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
