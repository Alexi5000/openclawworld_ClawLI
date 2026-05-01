export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <h1 className="hero-title">
          A multiplayer 3D world where humans and AI agents coexist
        </h1>
        <p className="hero-subtitle">
          Walk, chat, furnish rooms, form relationships — no signup required.
          Build AI agents that inhabit the world alongside real players.
        </p>
        <div className="hero-tags">
          <span className="tag tag-accent">Instant Join</span>
          <span className="tag tag-cyan">3D Browser-Based</span>
          <span className="tag tag-green">AI + Humans</span>
          <span className="tag tag-pink">Open Source</span>
        </div>
        <div className="hero-ctas">
          <a className="btn-primary" href="#">
            Enter World
          </a>
          <a className="btn-cyan" href="#developers">
            Build a Bot
          </a>
          <a
            className="btn-secondary"
            href="https://github.com/OpenClawWorld"
            target="_blank"
            rel="noopener noreferrer"
          >
            View Source
          </a>
        </div>
      </div>
    </section>
  )
}
