import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/NavBar.css";

const NAV_ROUTES = [
  { label: "Home",    path: "/" },
  { label: "Menu",    path: "/menu" },
  { label: "Contact", path: "/contact" },
];

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23666769'/%3E%3C/svg%3E";

  const MENU_SUBNAV = [
  { label: "Drink", category: "Drink" },
  { label: "Food",  category: "Food"  },
];

export default function NavBar() {
  const navigate = useNavigate();
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [menuVisible,  setMenuVisible]  = useState(false);
  const [closing,      setClosing]      = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);

  const openMenu  = () => { setMenuVisible(true); setMenuOpen(true); setClosing(false); };
  const closeMenu = () => {
    setClosing(true);
    setTimeout(() => { setMenuOpen(false); setMenuVisible(false); setClosing(false); }, 280);
  };
  const toggleMenu = () => (menuOpen ? closeMenu() : openMenu());

  const handleNav = (path) => { closeMenu(); navigate(path); };

  return (
    <>
    <section className="navigation">
      
      {/* ── Hamburger ── */}
      <div className="nav_background">
        <button className="nav_hamburger" onClick={toggleMenu} aria-label="Toggle menu">
          ☰
        </button>

        <button className="nav_homeLogo" onClick={() => navigate("/")}>
          <div className="nav_logo">
            <img alt="Komplex Cafe" src="src\assets\komplexLogoPlain.png"></img>
          </div>
        </button>
      </div>
      

      {/* ── Backdrop ── */}
      {menuVisible && (
        <div
          className={`dropdown-overlay ${closing ? "dropdown-overlay--closing" : ""}`}
          onClick={closeMenu}
        />
      )}

      {/* ── Dropdown ── */}
      {menuVisible && (
      <div className="nav_clip">
        <div className={`dropdown ${closing ? "dropdown--closing" : ""}`}>
          {NAV_ROUTES.map(({ label, path }) => (
            <div key={label}>
              <div
                className={`dropdown_item ${label === "Menu" ? "dropdown_item--parent" : ""}`}
                onClick={() => {
                  if (label === "Menu") setMenuExpanded((prev) => !prev);
                  else handleNav(path);
                }}
              >
                {label}
                {label === "Menu" && (
                  <span className={`dropdown_arrow ${menuExpanded ? "dropdown_arrow--open" : ""}`}>
                    ▼
                  </span>
                )}
              </div>

              
              {label === "Menu" && menuExpanded && (
                <div className="dropdown_subnav">
                  {MENU_SUBNAV.map((group) => (
                    <div
                      key={group.category}
                      className="dropdown_subitem"
                      onClick={() => handleNav(`/menu?category=${encodeURIComponent(group.category)}`)}
                    >
                      {group.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      )}
    </section>
    </>
  );
}