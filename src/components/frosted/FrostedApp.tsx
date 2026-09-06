const NEW_FROSTED_GAMES_URL = "https://frosted-poop2nd.vercel.app";

export function FrostedApp() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-neutral-200">
      <section className="w-full max-w-2xl rounded-2xl border border-white/10 bg-white/[0.04] p-8 text-center shadow-2xl shadow-black/40 sm:p-12">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
          Frosted Games
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
          Sorry, we are discontinuing this version of Frosted Games.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-neutral-400 sm:text-lg">
          Please visit the new Frosted Games at{" "}
          <a
            className="font-medium text-white underline decoration-white/40 underline-offset-4 transition-colors hover:text-neutral-300 hover:decoration-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[#141414]"
            href={NEW_FROSTED_GAMES_URL}
            target="_blank"
            rel="noreferrer"
          >
            frosted-poop2nd.vercel.app
          </a>
          .
        </p>
      </section>
    </main>
  );
}
