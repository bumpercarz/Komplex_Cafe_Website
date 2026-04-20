import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
// ✅ Ensure this path points to your actual Firebase configuration file
import { db } from "../firebase"; 
import "../css/Fonts.css";
import "../css/HomePage.css";
import NavBar from "../components/NavBar";

// ✅ Image imports
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
  const navigate = useNavigate();
  
  // New States for Verification
  const [isVerifying, setIsVerifying] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    const tableId = searchParams.get("table_id");

    const verifyTableStatus = async (id) => {
      try {
        const tableRef = doc(db, "tbl_table", id);
        const tableSnap = await getDoc(tableRef);

        console.log("Table data:", JSON.stringify(tableSnap.data()));
        console.log("Snap exists:", tableSnap.exists());
        console.log("Data:", tableSnap.data());   // ← check exact field names here

        if (tableSnap.exists()) {
          const data = tableSnap.data();
          console.log("isActive value:", data.isActive, typeof data.isActive);

          if (data.table_status === "Active") {
            sessionStorage.setItem("table_id", id);
            setIsVerifying(false);
          } else {
            setErrorMsg("This QR code is currently inactive. Please ask staff for assistance.");
          }
        } else {
          setErrorMsg("Invalid Table ID. Please scan a valid QR code.");
        }
      } catch (error) {
        console.error("Firebase Verification Error:", error);
        setErrorMsg("Connection error. Please check your internet and try again.");
      }
    };

    if (tableId) {
      verifyTableStatus(tableId);
    } else {
      // If there is no table_id in the URL, we allow the page to load normally 
      // (or you can set an error if table_id is strictly required for entry)
      setIsVerifying(false);
    }
  }, [searchParams]);

  // ── "Shutdown" View ──
  // This replaces the entire page UI if the QR check fails
  if (errorMsg) {
    return (
      <div style={{
        display: "flex", 
        flexDirection: "column", 
        alignItems: "center", 
        justifyContent: "center", 
        height: "100vh", 
        textAlign: "center",
        backgroundColor: "#1a1a1a",
        color: "#fff",
        fontFamily: "sans-serif",
        padding: "20px"
      }}>
        <h1 style={{ color: "#ff4d4d" }}>Access Denied</h1>
        <p style={{ fontSize: "1.2rem", maxWidth: "400px" }}>{errorMsg}</p>
        <button 
          className="btn--orange" 
          style={{ marginTop: "20px" }}
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Loading View ──
  // Prevents the website content from flickering before the check is done
  if (isVerifying) {
    return (
      <div style={{
        display: "flex", 
        height: "100vh", 
        alignItems: "center", 
        justifyContent: "center",
        backgroundColor: "#1a1a1a",
        color: "#fff"
      }}>
        <p>Verifying Table Status...</p>
      </div>
    );
  }

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
          <button className="btn--orange" onClick={() => navigate("/menu")}>
            Browse Menu
          </button>
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
          <button className="btn--white" onClick={() => navigate("/contact")}>
            Contact Us
          </button>
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