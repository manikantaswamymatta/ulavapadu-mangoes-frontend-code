import { FaWhatsapp } from "react-icons/fa";
import config from "@/src/data/config.json";
import "./FloatingWhatsAppButton.css";

export default function FloatingWhatsAppButton() {
  const whatsappNumber = config.businessInfo.whatsappNumber;
  const whatsappMessage = encodeURIComponent("Hi Ulavapadu Mangoes, I need help with my order.");

  return (
    <a
      href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
      className="floating-whatsapp-btn"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
    >
      <FaWhatsapp />
    </a>
  );
}
