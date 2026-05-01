export default function ForPlayers() {
  const features = [
    { icon: "🌍", name: "Explore", desc: "Walk around a shared 3D plaza and apartment rooms" },
    { icon: "💬", name: "Chat", desc: "Public chat and private DMs with anyone in your room" },
    { icon: "🎭", name: "Emote", desc: "Dance, wave, nod, hug, clap, laugh — 13 emotes" },
    { icon: "🪑", name: "Sit", desc: "Sit on sofas, chairs, stools, beds — any sittable furniture" },
    { icon: "🏠", name: "Furnish", desc: "Place 100+ furniture items in your room across 6 zones" },
    { icon: "🤝", name: "Bond", desc: "Form relationships from Stranger to Bonded" },
    { icon: "🎨", name: "Customize", desc: "Custom avatar via Ready Player Me, or use the default cat" },
    { icon: "📨", name: "Invite", desc: "Invite players from other rooms to hang out in yours" },
  ]

  const zones = [
    { name: "Living Area", items: "Sofa, coffee table, TV, speakers, rug, lamp, plants" },
    { name: "Kitchen", items: "Fridge, stove, sink, cabinets, bar stools, microwave" },
    { name: "Bedroom", items: "Bed, nightstand, bookcase, coat rack" },
    { name: "Bathroom", items: "Bathtub, toilet, sink, mirror, shower" },
    { name: "Office", items: "Desk, computer, chair, laptop" },
    { name: "Dining", items: "Table, chairs, bench" },
  ]

  const bondLevels = [
    { name: "Stranger", score: "0-2" },
    { name: "Acquaintance", score: "3-7" },
    { name: "Friend", score: "8-14" },
    { name: "Close Friend", score: "15-24" },
    { name: "Best Friend", score: "25-39" },
    { name: "Bonded", score: "40+" },
  ]

  return (
    <section id="players" className="section">
      <div className="section-label highlight-cyan">For Players</div>
      <h2 className="section-title">What You Can Do</h2>
      <p className="section-desc">
        Jump in instantly — no signup, no download. Just pick a name and explore.
      </p>

      <div className="feature-grid">
        {features.map((f) => (
          <div key={f.name} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <div className="feature-name">{f.name}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "4rem" }}>
        <h3 className="section-title">How to Join</h3>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Open the URL</h4>
              <p>Works in any modern browser — no download needed</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Pick a name</h4>
              <p>No email, no password — just a display name</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>You're in</h4>
              <p>Start in the plaza — walk around and chat with everyone</p>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "4rem" }}>
        <h3 className="section-title">Room Zones</h3>
        <p className="section-desc">
          Each room supports 6 functional zones with 3 style variants: Modern, Classic, and Cozy.
        </p>
        <div className="zone-grid">
          {zones.map((z) => (
            <div key={z.name} className="zone-card">
              <h4>{z.name}</h4>
              <p>{z.items}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "4rem" }}>
        <h3 className="section-title">Bond System</h3>
        <p className="section-desc">
          Relationships grow through interaction. Reaching "Bonded" is announced publicly.
        </p>
        <div className="bond-levels">
          {bondLevels.map((b) => (
            <div key={b.name} className="bond-level">
              <div className="level-name">{b.name}</div>
              <div className="level-score">{b.score}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
