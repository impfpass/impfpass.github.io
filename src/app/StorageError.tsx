import { T } from "@/texts";

export function StorageError() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 p-6">
      <p className="text-muted-foreground">{T.app.name}</p>
      <h1 className="text-2xl font-semibold">{T.storageError.title}</h1>
      <p role="alert">{T.storageError.text}</p>
    </main>
  );
}
