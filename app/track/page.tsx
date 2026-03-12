
"use client";

import { useState } from "react";
import Footer from "@/src/components/Footer";
import "./TrackPage.css";

const BACKEND_PROXY_API = "/api/backend-proxy";

export default function Track() {
	const [phone, setPhone] = useState("");
	const [orders, setOrders] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasSearched, setHasSearched] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setHasSearched(true);
		setError(null);
		setOrders([]);
		try {
			const path = `/orders/by-phone/${encodeURIComponent(phone)}`;
			const res = await fetch(`${BACKEND_PROXY_API}?path=${encodeURIComponent(path)}`);
			if (!res.ok) throw new Error("No orders found for this number.");
			const data = await res.json();
			setOrders(data);
		} catch (err: any) {
			setError(err.message || "Failed to fetch orders.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<>
			<div className="track-page">
				<h1>Track Your Order</h1>
				<form onSubmit={handleSubmit}>
					<label htmlFor="phone">Enter your mobile number:</label>
					<input
						id="phone"
						type="tel"
						value={phone}
						onChange={e => setPhone(e.target.value)}
						required
					/>
					<button type="submit">Track</button>
				</form>
				{loading && <div>Loading...</div>}
				{error && <div style={{ color: "#d32f2f", marginBottom: 16 }}>{error}</div>}
								{orders.length > 0 ? (
										<div>
												<h2 style={{ color: "#8b5a3c", marginBottom: 18 }}>Order Details</h2>
												{orders.map((order, idx) => {
													console.log('Order debug:', order);
													return (
														<div key={order.order_id} className="track-order-card">
															<div><b>Order ID:</b> {order.order_id}</div>
															<div><b>Customer:</b> {order.customer_name}</div>
															<div><b>Status:</b> {order.status}</div>
															<div><b>Booking Date:</b> {order.booking_date ? new Date(order.booking_date).toLocaleString() : '-'}</div>
															<div><b>Address:</b> {order.address}</div>
															<div><b>Items:</b>
																<ul>
																	{order.items.map((item: any, i: number) => (
																		<li key={i}>
																			{item.product_name} ({item.weight}) x {item.quantity} - ₹{item.price}
																		</li>
																	))}
																</ul>
															</div>
														</div>
													);
												})}
										</div>
								) : (
										hasSearched && !loading && !error && (
												<div style={{ color: "#d32f2f", marginTop: 18 }}>
														There is no order placed against this mobile number.
												</div>
										)
								)}
			</div>
			<Footer />
		</>
	);
}
