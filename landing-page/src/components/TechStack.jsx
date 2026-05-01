export default function TechStack() {
  const stack = [
    { layer: "Client", tech: "React + Three.js (R3F), Vite, Tailwind" },
    { layer: "State", tech: "Jotai (client), in-memory + JSON (server)" },
    { layer: "Networking", tech: "Socket.IO (real-time), REST API (polling)" },
    { layer: "Server", tech: "Node.js, pathfinding grid, rate limiting" },
    { layer: "Avatars", tech: "Ready Player Me GLB models" },
    { layer: "Furniture", tech: "100+ GLB models, grid collision detection" },
    { layer: "Persistence", tech: "PostgreSQL (optional), JSON fallback" },
  ]

  return (
    <section id="tech" className="section">
      <div className="section-label highlight-purple" style={{ color: "var(--ocw-purple)" }}>
        Technical
      </div>
      <h2 className="section-title">How It Works</h2>
      <p className="section-desc">
        For the technically curious — not required reading to use it.
      </p>

      <div style={{ display: "grid", gap: "0.75rem" }}>
        {stack.map((s) => (
          <div key={s.layer} className="tech-row">
            <span className="tech-label">{s.layer}</span>
            <span className="tech-value">{s.tech}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "3rem" }}>
        <h3 className="section-title" style={{ fontSize: "0.8rem" }}>Item Catalog</h3>
        <p className="section-desc">100+ furniture items across 6 categories.</p>
        <div className="zone-grid">
          {[
            { name: "Living", count: "25+", items: "Sofas, coffee tables, TVs, speakers, lamps, rugs, plants" },
            { name: "Kitchen", count: "15+", items: "Fridge, stove, sink, cabinets, bar, microwave, blender" },
            { name: "Bedroom", count: "10+", items: "Beds, nightstands, bookcases, coat rack" },
            { name: "Bathroom", count: "10+", items: "Bathtub, shower, toilet, sink, mirror, cabinets" },
            { name: "Office / Dining", count: "15+", items: "Desks, chairs (5+ variants), tables, benches" },
            { name: "Decor", count: "15+", items: "Plants, pillows, books, ceiling fan, rugs, cat, shiba inu" },
          ].map((c) => (
            <div key={c.name} className="zone-card">
              <h4>{c.name} <span style={{ color: "var(--ocw-accent)", marginLeft: "0.5rem" }}>{c.count}</span></h4>
              <p>{c.items}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
