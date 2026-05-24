function Introduction({ onNext }) {
  return (
    <section className="page">
      <section className="content">
        <h1>📸 Share the Memories! 🤍</h1>
        <p>
          We’d love to see our special day through your eyes! Please upload any
          photos or videos you take during the wedding to our shared website so
          everyone can enjoy the memories together.
        </p>
        <p>
          All uploaded photos will be gathered in one place for everyone to
          view, relive, and cherish. We can’t wait to see all the beautiful
          moments you capture! ✨
        </p>
        <p>
          Thank you for celebrating with us and helping us keep these memories
          forever.
        </p>
        <p>Love,</p>
        <p>Lourien &amp; Kit 🤍</p>
      </section>

      <button type="button" className="next-button" onClick={onNext}>
        Next -&gt;
      </button>
    </section>
  )
}

export default Introduction
