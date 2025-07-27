import { readBlockConfig } from "../../scripts/aem.js";
import { performCatalogServiceQuery } from "../../scripts/commerce.js";
import { rootLink } from "../../scripts/scripts.js";

// Initialize cart functionality
import "../../scripts/initializers/cart.js";

// Query để lấy 3 products bất kỳ
const productsQuery = `query GetRandomProducts($pageSize: Int = 3) {
  productSearch(current_page: 1, page_size: $pageSize, phrase: "") {
    items {
      productView {
        sku
        name
        urlKey
        shortDescription
        images(roles: ["thumbnail"]) {
          url
        }
        ... on SimpleProductView {
          price {
            final {
              amount {
                currency
                value
              }
            }
          }
        }
        ... on ComplexProductView {
          priceRange {
            minimum {
              final {
                amount {
                  currency
                  value
                }
              }
            }
          }
        }
      }
    }
  }
}`;

export default async function decorate(block) {
  const config = readBlockConfig(block);

  // Get metadata from config
  const {
    template = "demo-template",
    title = "Demo Template with 3 Products",
    description = "Display 3 random products from catalog",
  } = config;

  // Hiển thị loading state
  block.innerHTML = `
    <section class="demo-template">
      <div class="demo-template__header">
        <h1 class="demo-template__title">${title}</h1>
        <p class="demo-template__description">${description}</p>
      </div>
      
      <div class="demo-template__content">
        <div class="demo-template__template-info">
          <strong>Template:</strong> ${template}
        </div>
        
        <div class="demo-template__products">
          <h3>Loading products...</h3>
          <div class="demo-template__loading">
            <div class="loading-spinner"></div>
          </div>
        </div>
      </div>
    </section>
  `;

  try {
    // Fetch 3 products từ catalog
    const response = await performCatalogServiceQuery(productsQuery, {
      pageSize: 3,
    });
    const products = response.productSearch.items.map(
      (item) => item.productView
    );

    // Render products
    const productsHTML = products
      .map((product) => {
        const imageUrl =
          product.images?.[0]?.url || "/assets/images/375x375.png";
        const price =
          product.price?.final?.amount ||
          product.priceRange?.minimum?.final?.amount;
        const priceFormatted = price
          ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: price.currency || "USD",
            }).format(price.value)
          : "Contact us";

        return `
        <div class="demo-template__product">
          <div class="demo-template__product-image">
            <img src="${imageUrl}" alt="${product.name}" loading="lazy">
          </div>
          <div class="demo-template__product-info">
            <h4 class="demo-template__product-title">${product.name}</h4>
            <p class="demo-template__product-description">${
              product.shortDescription || "Product description"
            }</p>
            <div class="demo-template__product-price">${priceFormatted}</div>
            <div class="demo-template__product-actions">
              <button class="demo-template__button primary view-details" data-urlkey="${
                product.urlKey
              }" data-sku="${product.sku}">View Details</button>
              <button class="demo-template__button secondary add-to-cart" data-sku="${
                product.sku
              }">Add to Cart</button>
            </div>
          </div>
        </div>
      `;
      })
      .join("");

    // Update HTML with products
    const productsContainer = block.querySelector(".demo-template__products");
    productsContainer.innerHTML = `
      <h3>3 Featured Products</h3>
      <div class="demo-template__products-grid">
        ${productsHTML}
      </div>
    `;

    // Add lazy loading for images
    const images = block.querySelectorAll("img");
    images.forEach((img) => {
      img.loading = "lazy";
    });

    // Handle button actions
    const addToCartButtons = block.querySelectorAll(".add-to-cart");
    addToCartButtons.forEach((button) => {
      button.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sku = e.target.dataset.sku;
        console.log("Add to cart:", sku);

        // Add visual feedback
        const originalText = e.target.textContent;
        e.target.textContent = "Adding...";
        e.target.disabled = true;
        e.target.style.background = "var(--color-neutral-400)";
        e.target.style.color = "white";

        try {
          // Import and use addProductsToCart function
          const { addProductsToCart } = await import(
            "../../scripts/__dropins__/storefront-cart/api.js"
          );

          // Add product to cart
          await addProductsToCart([
            {
              sku: sku,
              quantity: 1,
            },
          ]);

          // Success feedback
          e.target.textContent = "Added!";
          e.target.style.background = "var(--color-positive-500)";
          e.target.style.color = "white";

          // Reset button after 2 seconds
          setTimeout(() => {
            e.target.textContent = originalText;
            e.target.style.background = "";
            e.target.style.color = "";
            e.target.disabled = false;
          }, 2000);
        } catch (error) {
          console.error("Error adding to cart:", error);

          // Error feedback
          e.target.textContent = "Error!";
          e.target.style.background = "var(--color-alert-500)";
          e.target.style.color = "white";

          // Reset button after 2 seconds
          setTimeout(() => {
            e.target.textContent = originalText;
            e.target.style.background = "";
            e.target.style.color = "";
            e.target.disabled = false;
          }, 2000);
        }
      });
    });

    // Handle view details buttons
    const viewDetailsButtons = block.querySelectorAll(".view-details");
    viewDetailsButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const urlKey = e.target.dataset.urlkey;
        const sku = e.target.dataset.sku;
        const productUrl = `/products/${urlKey}/${sku}`;
        console.log("Navigating to:", productUrl);

        // Try to navigate to product page
        try {
          console.log("Navigating to:", productUrl);
          window.location.href = productUrl;
        } catch (error) {
          console.error("Navigation error:", error);
          // Fallback: open in new tab
          window.open(productUrl, "_blank");
        }
      });
    });
  } catch (error) {
    console.error("Error loading products:", error);
    const productsContainer = block.querySelector(".demo-template__products");
    productsContainer.innerHTML = `
      <h3>Unable to load products</h3>
      <p>Please try again later.</p>
    `;
  }

  // Add class for styling
  block.classList.add("demo-template--loaded");
}
