import assert from "node:assert";
import test from "node:test";
import { mapSerpResults, slugifyMerchant } from "../lib/providers/googleShopping.ts";

// Trimmed but realistic SerpAPI `google_shopping` response fixture.
const FIXTURE = {
  shopping_results: [
    {
      position: 1,
      title: "Off-White Diag Tab Cotton Shirt",
      product_link: "https://www.google.com/shopping/product/123",
      product_id: "123",
      source: "SSENSE",
      price: "$465.00",
      extracted_price: 465,
      thumbnail: "https://serpapi.example/thumb1.jpg",
      rating: 4.6,
      reviews: 87,
      delivery: "Free delivery",
    },
    {
      position: 2,
      title: "OFF-WHITE Arrow Print Tee",
      product_link: "https://www.google.com/shopping/product/456",
      product_id: "456",
      source: "Nordstrom",
      price: "$215.00",
      extracted_price: 215,
      thumbnail: "https://serpapi.example/thumb2.jpg",
    },
    {
      // Missing thumbnail -> should be skipped.
      position: 3,
      title: "No Image Product",
      source: "Saks Fifth Avenue",
      price: "$100.00",
      extracted_price: 100,
    },
  ],
};

test("mapSerpResults maps real fields and skips items without an image", () => {
  const products = mapSerpResults(FIXTURE);
  assert.equal(products.length, 2, "skips the item missing a thumbnail");

  const [first, second] = products;
  assert.equal(first.title, "Off-White Diag Tab Cotton Shirt");
  assert.equal(first.price, 465);
  assert.equal(first.retailer, "SSENSE");
  assert.equal(first.retailerKey, "ssense");
  assert.equal(first.image, "https://serpapi.example/thumb1.jpg");
  assert.equal(first.url, "https://www.google.com/shopping/product/123");
  assert.equal(first.rating, 4.6);
  assert.equal(first.reviews, 87);
  assert.equal(first.delivery, "Free delivery");
  assert.equal(first.source, "live");

  assert.equal(second.retailer, "Nordstrom");
  assert.equal(second.retailerKey, "nordstrom");
});

test("mapSerpResults falls back to parsing the price string", () => {
  const products = mapSerpResults({
    shopping_results: [
      {
        title: "Some Shirt",
        source: "Farfetch",
        price: "$1,299.00",
        thumbnail: "https://serpapi.example/t.jpg",
      },
    ],
  });
  assert.equal(products[0].price, 1299);
});

test("slugifyMerchant normalizes merchant names", () => {
  assert.equal(slugifyMerchant("Saks Fifth Avenue"), "saks-fifth-avenue");
  assert.equal(slugifyMerchant("Off-White"), "off-white");
  assert.equal(slugifyMerchant("Bergdorf & Goodman"), "bergdorf-and-goodman");
});
