const path = require("path");

const express = require("express");

const shopController = require("../controllers/shop");

const router = express.Router();
const isAuthed = require("../middleware/is-auth");

router.get("/", shopController.getIndex);

router.get("/products", shopController.getProducts);

router.get("/products/:productId", shopController.getProduct);

router.get("/cart", isAuthed, shopController.getCart);

router.post("/cart", shopController.postCart);

router.post(
  "/cart-delete-item",
  isAuthed,
  shopController.postCartDeleteProduct
);
router.get("/checkout", isAuthed, shopController.getCheckOut);
router.get("/checkout/success", isAuthed, shopController.postOrder);
router.get("/checkout/cancel", isAuthed, shopController.getCheckOut);

router.get("/orders", isAuthed, shopController.getOrders);

router.get("/orders/:orderId", isAuthed, shopController.getInvoices);

module.exports = router;
