import { Outlet } from "react-router-dom";
import Header from "./Header";

export default function Layout() {
  return (
    <div className="app">
      <Header />
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <p>GolfClub Finder - Find the perfect clubs for your game</p>
      </footer>
    </div>
  );
}
