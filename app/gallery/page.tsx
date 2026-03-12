import Footer from "@/src/components/Footer";
import "./GalleryPage.css";
import { galleryImages } from "./galleryData";

export const metadata = {
  title: "Gallery | Ulavapadu Mangoes",
  description: "Explore mango varieties and fresh farm moments from Ulavapadu Mangoes.",
};

export default function GalleryPage() {
  return (
    <>
      <section className="z-gallery-hero">
        <h1>Mango gallery</h1>
        <p>Browse farm picks, ripening batches, and signature mango products.</p>
      </section>

      <section className="z-gallery-container">
        <div className="z-gallery-grid">
          {galleryImages.map((item) => (
            <article key={item.id} className="z-gallery-card">
              <img src={item.image} alt={item.title} />
              <div className="z-gallery-overlay">
                <h3>{item.title}</h3>
                <span>{item.category}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </>
  );
}
