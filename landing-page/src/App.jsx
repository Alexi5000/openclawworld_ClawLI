import Navbar from "./components/Navbar"
import Hero from "./components/Hero"
import StatsBar from "./components/StatsBar"
import ForPlayers from "./components/ForPlayers"
import ForDevelopers from "./components/ForDevelopers"
import TechStack from "./components/TechStack"
import FAQ from "./components/FAQ"
import Footer from "./components/Footer"

function App() {
  return (
    <div className="page">
      <Navbar />
      <Hero />
      <StatsBar />
      <div className="section-divider" />
      <ForPlayers />
      <div className="section-divider" />
      <ForDevelopers />
      <div className="section-divider" />
      <TechStack />
      <div className="section-divider" />
      <FAQ />
      <Footer />
    </div>
  )
}

export default App
