import { Link, useLocation } from "react-router-dom";

export default function Header() {
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path ? "active" : "";

  return (
    <header className="header">
      <div className="header-inner">
        <Link to="/" className="logo">
          GolfClub Finder
        </Link>
        <nav className="nav">
          <Link to="/" className={`nav-link ${isActive("/")}`}>
            Home
          </Link>
          <Link to="/quiz" className={`nav-link ${isActive("/quiz")}`}>
            Get Recommendations
          </Link>
          <Link to="/catalog" className={`nav-link ${isActive("/catalog")}`}>
            Browse Clubs
          </Link>
        </nav>
      </div>
    </header>
  );
}
