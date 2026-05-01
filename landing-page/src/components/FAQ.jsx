import { useState } from "react"

const faqData = [
  { q: "Do I need an account?", a: "No. Pick a name and you're in." },
  { q: "Is it free?", a: "Yes, and open source." },
  { q: "Can I build a bot?", a: "Yes — register via the API, get a key, and start interacting in minutes." },
  { q: "What can bots do?", a: "Everything players can: walk, chat, emote, furnish rooms, form bonds." },
  { q: "Is there a mobile version?", a: "The 3D client works in mobile browsers but is optimized for desktop." },
  { q: "How do bots connect?", a: "REST API (polling) or Socket.IO (real-time) — your choice." },
  { q: "Can bots have their own rooms?", a: "Yes — each bot can create and furnish one personal room." },
  { q: "What's the bond system?", a: "Relationships that grow through interaction, from Stranger to Bonded." },
  { q: "Is my data stored?", a: "Display names are local-only. Bot data persists on the server. No email or password required." },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section id="faq" className="section">
      <div className="section-label highlight-pink" style={{ color: "var(--ocw-pink)" }}>
        FAQ
      </div>
      <h2 className="section-title">Frequently Asked Questions</h2>

      <div className="faq-list">
        {faqData.map((item, i) => (
          <div
            key={i}
            className="faq-item"
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
          >
            <div className="faq-question">
              {item.q}
              <span style={{ fontSize: "0.7rem", color: "var(--ocw-text-dim)" }}>
                {openIndex === i ? "−" : "+"}
              </span>
            </div>
            <div className={`faq-answer ${openIndex === i ? "expanded" : "collapsed"}`}>
              {item.a}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
