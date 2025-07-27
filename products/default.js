import { getSkuFromUrl } from "../scripts/commerce.js";
import { performCatalogServiceQuery } from "../scripts/commerce.js";

// Query to get product details
const productDetailQuery = `query GetProductDetail($sku: String!) {
  products(skus: [$sku]) {
    sku
    name
    urlKey
    shortDescription
    description
    inStock
    addToCartAllowed
    images(roles: ["image"]) {
      url
      label
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
}`;

export default async function decorate(block) {
  const sku = getSkuFromUrl();

  if (!sku) {
    block.innerHTML = "<h1>Product not found</h1>";
    return;
  }

  // Show loading state
  block.innerHTML = `
    <div class="product-detail-loading">
      <h1>Loading product...</h1>
      <div class="loading-spinner"></div>
    </div>
  `;

  try {
    // Fetch product details
    const response = await performCatalogServiceQuery(productDetailQuery, {
      sku,
    });
    const product = response.products?.[0];

    if (!product) {
      block.innerHTML = "<h1>Product not found</h1>";
      return;
    }

    // Format price
    const price =
      product.price?.final?.amount ||
      product.priceRange?.minimum?.final?.amount;
    const priceFormatted = price
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: price.currency || "USD",
        }).format(price.value)
      : "Contact us";

    // Render product details
    block.innerHTML = `
      <div class="product-detail">
        <div class="product-detail__header">
          <h1 class="product-detail__title">${product.name}</h1>
          <div class="product-detail__sku">SKU: ${product.sku}</div>
        </div>
        
        <div class="product-detail__content">
          <div class="product-detail__image">
            <img src="${
              product.images?.[0]?.url || "/assets/images/375x375.png"
            }" 
                 alt="${product.name}" 
                 loading="lazy">
          </div>
          
          <div class="product-detail__info">
            <div class="product-detail__price">${priceFormatted}</div>
            <div class="product-detail__status">
              <span class="status ${
                product.inStock ? "in-stock" : "out-of-stock"
              }">
                ${product.inStock ? "In Stock" : "Out of Stock"}
              </span>
            </div>
            
            <div class="product-detail__description">
              <h3>Description</h3>
              <p>${
                product.shortDescription ||
                product.description ||
                "No description available"
              }</p>
            </div>
            
            <div class="product-detail__actions">
              ${
                product.addToCartAllowed && product.inStock
                  ? `<button class="product-detail__add-to-cart" data-sku="${product.sku}">Add to Cart</button>`
                  : '<button class="product-detail__add-to-cart" disabled>Out of Stock</button>'
              }
              <a href="/" class="product-detail__back">Back to Home</a>
            </div>
          </div>
        </div>
      </div>
    `;

    // Handle add to cart
    const addToCartButton = block.querySelector(".product-detail__add-to-cart");
    if (addToCartButton && !addToCartButton.disabled) {
      addToCartButton.addEventListener("click", (e) => {
        const sku = e.target.dataset.sku;
        console.log("Add to cart:", sku);
        alert(`Product ${sku} has been added to cart!`);
      });
    }
  } catch (error) {
    console.error("Error loading product:", error);
    block.innerHTML = `
      <div class="product-detail-error">
        <h1>Error loading product</h1>
        <p>Please try again later.</p>
        <a href="/" class="product-detail__back">Back to Home</a>
      </div>
    `;
  }
}
