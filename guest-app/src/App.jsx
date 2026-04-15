import React from "react";
import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import MenuPage from "./pages/MenuPage";
import ContactUs from "./pages/ContactUsPage.jsx";
import CheckoutPage_1 from "./pages/CheckoutPage_1.jsx";
import CheckoutPage_2 from "./pages/CheckoutPage_2.jsx";
import PaymentType from "./pages/PaymentType.jsx";
import ConfirmationPage from "./pages/ConfirmationPage.jsx";
import QRPage from "./pages/QRPage.jsx";
import FirestoreTestPage from "./pages/FirestoreTestPage";

export default function App() {
  return (
    <>
    <Routes>
      {/* Guest routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/contact" element={<ContactUs />} />
      <Route path="/checkout/cart" element={<CheckoutPage_1 />} />
      <Route path="/checkout/extra" element={<CheckoutPage_2 />} />
      <Route path="/paymenttype" element={<PaymentType />} />
      <Route path="/qrpage" element={<QRPage />} />
      <Route path="/confirmation" element={<ConfirmationPage />} />
      <Route path="/firestore-test" element={<FirestoreTestPage />} />
    </Routes>
    </>
  );
}