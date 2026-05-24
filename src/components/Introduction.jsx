function Introduction({ onNext }) {
  return (
    <section className="relative flex min-h-screen items-center justify-center px-8 py-12 sm:px-6">
      <section className="max-w-2xl text-center">
        <h1 className="mb-4 text-5xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
          📸 Share the Memories! 🤍
        </h1>
        <p className="mb-4 text-lg leading-8 text-zinc-700 sm:text-base">
          We’d love to see our special day through your eyes! Please upload any
          photos or videos you take during the wedding to our shared website so
          everyone can enjoy the memories together.
        </p>
        <p className="mb-4 text-lg leading-8 text-zinc-700 sm:text-base">
          All uploaded photos will be gathered in one place for everyone to
          view, relive, and cherish. We can’t wait to see all the beautiful
          moments you capture! ✨
        </p>
        <p className="mb-4 text-lg leading-8 text-zinc-700 sm:text-base">
          Thank you for celebrating with us and helping us keep these memories
          forever.
        </p>
        <p className="mb-4 text-lg leading-8 text-zinc-700 sm:text-base">Love,</p>
        <p className="text-lg leading-8 text-zinc-700 sm:text-base">
          Lourien &amp; Kit 🤍
        </p>
      </section>

      <button
        type="button"
        className="absolute right-8 bottom-8 rounded-full border border-zinc-950 bg-white px-5 py-3 text-sm font-medium text-zinc-950 transition hover:bg-zinc-950 hover:text-white sm:right-6 sm:bottom-6"
        onClick={onNext}
      >
        Next -&gt;
      </button>
    </section>
  )
}

export default Introduction
