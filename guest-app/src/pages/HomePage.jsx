import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "../css/Fonts.css";
import "../css/HomePage.css";
import NavBar from "../components/NavBar";

// ✅ Import images at the top
import homepageAbout from "../assets/homepageAbout.png";
import homepageOpenbg from "../assets/homePageOpenbg.png";
import homePageContact from "../assets/homePageContact.png";

const HOURS = [
  ["Weekdays:", "10:00 AM - 2:00 AM"],
  ["Saturdays:", "10:00 AM - 12:00 AM"],
  ["Sundays:", "12:00 PM - 10:00 PM"],
];

const HomePage = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tableId = searchParams.get("table_id");
    if (tableId) {
      sessionStorage.setItem("table_id", tableId);
    }
  }, []);

  const navigate = useNavigate();

  return (
    <div className="wrapper">
      <NavBar />

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero_text">
          <p className="hero_title">Komplex Cafe</p>
          <p className="hero_tagline">"...Where every cup tells a story."</p>
        </div>
      </section>

      {/* ── Intro ── */}
      <section className="intro">
        <p className="intro_body">
          Located in the heart of Sampaloc, Manila near UST, we blend studying
          and coffee to inspire your creativity. Join us for a unique experience
          that goes beyond the ordinary.
        </p>
        <div className="intro_cta-wrap">
          <button className="btn--orange" onClick={() => navigate("/menu")}>Browse Menu</button>
        </div>
      </section>

      {/* ── About ── */}
      <section className="about">
        <div className="about_img-wrap">
          <img src={homepageAbout} alt="Coffee drinks" /> 
        </div>
        <p className="about_text">
          Here at Komplex Cafe, you can focus on your work while enjoying
          freshly brewed coffee. We also offer fruit tea, pasta, and pastries.
        </p>
      </section>

      {/* ── Hours ── */}
      <section className="hours">
        <img
          className="hours_bg"
          src={homepageOpenbg}
          alt="Cafe background"
        />
        <div className="hours_content">
          <h2 className="hours_title">We're open on:</h2>
          {HOURS.map(([day, time]) => (
            <div key={day} className="hours_row">
              <span className="hours_day">{day}</span>
              <span className="hours_time">{time}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Booking CTA ── */}
      <section className="booking">
        <div className="booking_copy">
          <p className="booking_text">
            Interested in booking Komplex Cafe for an event? Come send us a
            message!
          </p>
          <button className="btn--white" onClick={() => navigate("/contact")}>Contact Us</button>
        </div>
        <div className="booking_img-wrap">
          <img src={homePageContact} alt="Coffee" />
        </div>
      </section>

      {/* ── Address ── */}
      <footer className="address">
        <p className="address_label">Visit us at:</p>
        <div className="address_row">
          <span className="address_pin">📍</span>
          <p className="address_text">
            1045 Padre Noval St, Sampaloc,
            <br />
            Manila, 1008 Metro Manila
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;