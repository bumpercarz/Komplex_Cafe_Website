import { MdOutlineMail } from "react-icons/md";
import { FaFacebook } from "react-icons/fa";
import { FaInstagram } from "react-icons/fa";
import { FaTiktok } from "react-icons/fa6";
import "../css/ContactUs.css";
import NavBar from "../components/NavBar";




const ContactUs = () => {
    
    return (
        <div className="wrapperContact">

            <NavBar/>

            {/* ── Hero ── */}
            <section className="hero">
                <div className="hero_text">
                <h1 className="hero_title">Komplex Cafe</h1>
                <p className="hero_tagline">"...Where every cup tells a story."</p>
                </div>
            </section>

            {/* Contact Us Header */}
            <section className="contacts">
                <h1 className="contacts_Title">Contact Us</h1>
                <p className="contacts_text">
                    Reach out to us through our contacts below. 
                    We will try and send a reply as soon as we are 
                    available.
                </p>

                {/* List of Contacts */}
                <div className="contacts_email">
                    <h3 className="contacts_email_text">Email</h3>
                    <p className="email_text contacts_links"><MdOutlineMail /> komplexcafe@gmail.com</p>
                </div>
                
                <div className="contacts_socmed">
                    <h3 className="contacts_socmed_text">Social Media</h3>
                    <p className="socmed_fb_text contacts_links"><a href="https://web.facebook.com/profile.php?id=61563281091251" target="_blank" rel="noreferrer noopener"><FaFacebook /> Komplex Cafe</a></p>
                    <p className="socmed_ig_text contacts_links"><a href="https://www.instagram.com/komplex.cafe/" target="_blank" rel="noreferrer noopener"><FaInstagram /> @komplex.cafe</a></p>
                    <p className="socmed_ig_text contacts_links"><a href="https://www.tiktok.com/@komplex.cafe" target="_blank" rel="noreferrer noopener"><FaTiktok /> Komplex Cafe</a></p>
                </div>

                <div className="contacts_other">
                    <h3 className="other_text">Komplex Studios</h3>
                    <p className="other_socmed_fb_text contacts_links"><a href="https://web.facebook.com/profile.php?id=61579206300756" target="_blank" rel="noreferrer noopener"><FaFacebook /> Komplex Studios</a></p>
                    <p className="other_socmed_ig_text contacts_links"><a href="https://www.instagram.com/komplex.studios/" target="_blank" rel="noreferrer noopener"><FaInstagram /> @komplex.studios</a></p>
                </div>

            </section>

        </div>
    )

}

export default ContactUs;