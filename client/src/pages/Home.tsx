import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="home-page">
      <section className="hero">
        <h1>Find Your Perfect Golf Clubs</h1>
        <p>
          Whether you're just starting out or competing at a professional level,
          we'll help you find the right clubs for your game.
        </p>
        <div className="hero-actions">
          <Link to="/quiz" className="btn btn-primary btn-lg">
            Take the Quiz
          </Link>
          <Link to="/catalog" className="btn btn-secondary btn-lg">
            Browse Catalog
          </Link>
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <h3>Personalized Recommendations</h3>
          <p>
            Answer a few questions about your game and we'll recommend a complete
            set tailored to your skill level, swing speed, and goals.
          </p>
        </div>
        <div className="feature-card">
          <h3>Beginner to Pro</h3>
          <p>
            Our database covers clubs for every skill level - from
            ultra-forgiving game improvement clubs to tour-level precision
            instruments.
          </p>
        </div>
        <div className="feature-card">
          <h3>Top Brands</h3>
          <p>
            Clubs from TaylorMade, Callaway, Titleist, Ping, Cobra, Cleveland,
            and Mizuno - all the brands trusted by golfers worldwide.
          </p>
        </div>
      </section>

      <section className="how-it-works">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <h4>Tell Us About Your Game</h4>
            <p>Skill level, swing speed, budget, and what you want to improve.</p>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <h4>Get Matched</h4>
            <p>
              Our algorithm scores and ranks clubs based on your profile.
            </p>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <h4>Review Your Set</h4>
            <p>
              See a complete recommended set with scores and reasoning for each
              pick.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
