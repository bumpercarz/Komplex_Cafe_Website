import { useState } from "react";
import { FaCashRegister } from "react-icons/fa";
import { MdOutlineTableRestaurant } from "react-icons/md";
import "../css/CheckoutPage.css";
import { useLocation, useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";

const peso = (n) =>
    "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2 });

export default function CheckoutPage_2() {
    const location = useLocation();
    const navigate = useNavigate();

    const cart = location.state?.cart ?? [];
    const cartTotal = cart.reduce((s, e) => s + e.lineTotal, 0);

    /* ── Form state ── */
    const tableId = sessionStorage.getItem("table_id");

    const [orderType, setOrderType] = useState(!tableId ? "take_out" : null);
    const [receiveAt, setReceiveAt] = useState(!tableId ? "counter" : null);
    const [instructions, setInstructions] = useState("");

    const canContinue = orderType === "take_out" || (orderType === "dine_in" && receiveAt);

    const handleCheckout = () => {
        if (!canContinue) return;

        if (orderType === "take_out") {
            // Skip payment type selection, go straight to online payment
            navigate("/qrpage", {
                state: { cart, orderType, receiveAt, instructions },
            });
        } else {
            navigate("/paymenttype", {
                state: { cart, orderType, receiveAt, instructions },
            });
        }
    };

    return (
        <div className="wrapper">
            <div className="checkout-page">

                <NavBar />

                {/* ── Hero banner ── */}
                <div className="checkout-hero">
                    <h1 className="checkout-hero-title">Checkout</h1>
                </div>

                {/* ── Order Details form ── */}
                <div className="checkout-extra">

                    {/* Order Type */}
                    <section className="order-type">
                        <h2 className="order-type-label">Order Type</h2>
                        <div className="order-type-btns">
                            <button
                                type="button"
                                className={`btn-dine-in${orderType === "dine_in" ? " btn-dine-in--active" : ""}`}
                                onClick={() => { setOrderType("dine_in"); setReceiveAt(null); }}
                                disabled={!tableId}
                            >
                                {!tableId ? "No Table Assigned" : "Dine In"}
                            </button>
                            <button
                                type="button"
                                className={`btn-take-out${orderType === "take_out" ? " btn-take-out--active" : ""}`}
                                onClick={() => { setOrderType("take_out"); setReceiveAt("counter"); }}
                            >
                                Take Out
                            </button>
                        </div>
                    </section>

                    {/* Receive At */}
                    <section className="receive-at">
                        <h2 className="receive-at-label">Receive at</h2>
                        <div className="receive-at-btns">
                            <button
                                type="button"
                                className={`btn-counter${receiveAt === "counter" ? " btn-counter--active" : ""}`}
                                onClick={() => setReceiveAt("counter")}
                            >
                                <strong>Counter</strong>
                                <FaCashRegister size={30} />
                            </button>


                            <button
                                type="button"
                                className={`btn-table${receiveAt === "table" ? " btn-table--active" : ""}`}
                                onClick={() => setReceiveAt("table")}
                                disabled={orderType === "take_out" || !tableId}
                            >
                                <strong>Table</strong>
                                <MdOutlineTableRestaurant size={40} />
                            </button>
                        </div>
                    </section>

                    {/* Special Instructions */}
                    <section className="spec-instruct">
                        <label className="spec-instruct-label" htmlFor="spec-instruct-text">
                            <h2>Special Instructions</h2>
                        </label>
                        <div className="spec-instruct-textarea">
                            <textarea
                                className="spec-instruct-text"
                                id="spec-instruct-text"
                                name="spec-instruct-text"
                                rows="8"
                                placeholder="Example: no salt, no cutlery, etc. (255 characters only)"
                                maxLength={255}
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                            />
                        </div>
                    </section>

                </div>

                {/* ── Sticky footer ── */}
                <div className="checkout-footer">
                    <div className="checkout-footer-total">
                        Total: <strong>{peso(cartTotal)}</strong>
                    </div>
                    <div className="checkout-footer-buttons">
                        <button
                            type="button"
                            className="btn-back"
                            onClick={() => navigate("/checkout/cart", { state: { cart } })}
                        >
                            Back
                        </button>
                        <button
                            type="button"
                            className="btn-checkout"
                            disabled={!canContinue}
                            onClick={handleCheckout}
                        >
                            Checkout
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}