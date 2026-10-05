import { PHASE_PRODUCTION_BUILD } from "next/constants";

export async function register(): Promise<void> {
  if (
    process.env.NEXT_RUNTIME !== "nodejs" ||
    process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD
  )
    return;

  const { getCachedEntries } =
    await import("./features/hacker-news/get-entries/cache/runtime");
  // Launch startup without delaying requests; callers share the initial refresh.
  void getCachedEntries()
    .start()
    .catch((error: unknown) => {
      console.error("Initial Hacker News collection failed.", error);
    });
}
