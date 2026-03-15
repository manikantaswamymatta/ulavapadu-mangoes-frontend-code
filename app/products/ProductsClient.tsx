.z-products-page {
  background: #fff;
  min-height: 100vh;
}

.z-products-hero {
  position: relative;
  overflow: hidden;
  background: #121212;
  color: #fff;
  text-align: center;
  padding: 52px 18px 36px;
}

.z-products-hero-collage {
  position: absolute;
  inset: 0;
  display: grid;
  grid-template-columns: repeat(9, minmax(0, 1fr));
  grid-auto-rows: 120px;
  gap: 4px;
  opacity: 0.34;
  z-index: 0;
}

.z-products-hero-collage img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  filter: saturate(1.05) contrast(1.02);
}

.z-products-hero::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.44) 0%, rgba(0, 0, 0, 0.34) 100%);
  z-index: 1;
}

.z-products-hero h1,
.z-products-hero p,
.z-products-search-wrap {
  position: relative;
  z-index: 2;
}

.z-products-hero h1 {
  margin: 0;
  font-size: clamp(2rem, 4vw, 2.9rem);
}

.z-products-hero p {
  margin: 8px 0 22px;
  opacity: 0.95;
}

.z-products-search-wrap {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 220px;
  gap: 10px;
}

.z-products-search-box {
  position: relative;
}

.z-products-search-wrap input,
.z-products-search-wrap select {
  border: none;
  border-radius: 10px;
  padding: 12px 14px;
  font-size: 14px;
  width: 100%;
}

.z-products-suggestions {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 6px);
  background: #fff;
  border: 1px solid #e9dece;
  border-radius: 12px;
  max-height: 240px;
  overflow-y: auto;
  box-shadow: 0 12px 24px rgba(41, 24, 11, 0.14);
  z-index: 12;
}

.z-products-suggestion-item {
  width: 100%;
  border: none;
  border-bottom: 1px solid #f1e6d7;
  background: #fff;
  color: #2a1e12;
  text-align: left;
  padding: 12px;
  font-size: 14px;
}

.z-products-suggestion-item:last-child {
  border-bottom: none;
}

.z-products-search-empty {
  margin: 0;
  padding: 12px;
  color: #6d5b49;
  font-size: 13px;
  text-align: left;
}

.z-sort-select {
  appearance: none;
  -webkit-appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, var(--brand-primary) 50%),
    linear-gradient(135deg, var(--brand-primary) 50%, transparent 50%);
  background-position: calc(100% - 16px) calc(50% - 2px), calc(100% - 11px) calc(50% - 2px);
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
  padding-right: 34px;
}

.z-sort-mobile {
  display: none;
}

.z-sort-chip {
  border: 1px solid #cf9a0f;
  background: linear-gradient(180deg, #ffd35d 0%, #e2ae17 100%);
  color: #121212;
  border-radius: 999px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 700;
}

.z-sort-chip.active {
  background: linear-gradient(180deg, #ffc62f 0%, #dc9f00 100%);
  color: #121212;
  border-color: #bf8900;
}

.z-products-shell {
  width: min(1240px, 100%);
  margin: 0 auto;
  padding: 26px 16px 42px;
}

.z-category-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.z-chip {
  border: 1px solid var(--mango-yellow-200);
  background: linear-gradient(180deg, var(--mango-yellow-50) 0%, #fff4cf 100%);
  color: #121212;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 700;
}

.z-chip:hover {
  border-color: var(--mango-yellow-500);
  background: linear-gradient(180deg, #fff6d9 0%, var(--mango-yellow-100) 100%);
}

.z-chip.active {
  border-color: #e7a900;
  color: #121212;
  background: linear-gradient(180deg, #ffce52 0%, var(--mango-yellow-500) 100%);
}

.z-products-meta {
  display: flex;
  justify-content: space-between;
  color: #707070;
  font-size: 14px;
  margin-bottom: 16px;
}

.z-products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
}

.z-product-card {
  border: 1px solid #eeeeee;
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.z-product-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.06);
}

.z-product-image-wrap {
  position: relative;
  height: auto;
  background: #fff;
  padding: 8px 8px 0;
}

.z-product-image {
  width: 100%;
  height: auto;
  object-fit: cover;
  object-position: center;
  display: block;
  background: #fff;
  border-radius: 18px 18px 10px 10px;
}

.z-rating {
  position: absolute;
  right: 10px;
  bottom: 10px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  background: #267e3e;
  border-radius: 8px;
  padding: 4px 7px;
}

.z-product-content {
  padding: 12px;
}

.z-product-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.z-product-head h3 {
  margin: 0;
  font-size: 16px;
}

.z-product-head strong {
  color: var(--brand-primary);
}

.z-product-content p {
  margin: 6px 0 12px;
  color: #666;
  font-size: 13px;
}

.size-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 12px;
}

.size-option {
  border: 1px solid var(--mango-yellow-200);
  background: linear-gradient(180deg, var(--mango-yellow-50) 0%, #fff4cf 100%);
  color: #5a4305;
  border-radius: 10px;
  min-width: 56px;
  padding: 7px 12px;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
}

.size-option:hover {
  border-color: var(--mango-yellow-500);
  background: linear-gradient(180deg, #fff6d9 0%, var(--mango-yellow-100) 100%);
}

.size-option.active {
  border-color: #e7a900;
  background: linear-gradient(180deg, #ffce52 0%, var(--mango-yellow-500) 100%);
  color: #2e2400;
  box-shadow: 0 4px 10px rgba(244, 180, 0, 0.28);
}

.size-option:focus-visible {
  outline: 2px solid var(--mango-yellow-500);
  outline-offset: 2px;
}

.z-product-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.z-product-actions span {
  font-size: 12px;
  color: #7c7c7c;
}

.z-product-actions button {
  border: 1px solid #2f6622;
  background: linear-gradient(180deg, #fffef8 0%, #f4fae6 100%);
  color: #121212;
  border-radius: 10px;
  padding: 7px 12px;
  font-weight: 700;
  transition: all 0.2s ease;
}

.z-product-actions button:hover {
  transform: translateY(-1px);
  border-color: #d09b13;
  background: linear-gradient(180deg, #fff2c9 0%, #ffe08a 100%);
  color: #3b2b00;
}

.z-product-actions button.added {
  background: #18a558;
  border-color: #121212;
  color: #fff;
}

.z-empty-state {
  text-align: center;
  border: 1px dashed #e5e5e5;
  border-radius: 12px;
  padding: 40px 12px;
  color: #666;
}

@media (max-width: 768px) {
  .z-products-hero-collage {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    grid-auto-rows: 88px;
    opacity: 0.28;
  }

  .z-products-search-wrap {
    grid-template-columns: 1fr;
  }

  .z-sort-select {
    display: none;
  }

  .z-sort-mobile {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }

  .z-products-meta {
    flex-direction: column;
    gap: 4px;
  }

  .z-product-image-wrap {
    padding: 6px 6px 0;
  }

  .z-product-image {
    border-radius: 16px 16px 10px 10px;
  }

  .size-option {
    min-width: 52px;
    padding: 8px 10px;
    font-size: 12px;
  }
}
