const path = require("path");
const { body } = require("express-validator");

const express = require("express");

const adminController = require("../controllers/admin");

const router = express.Router();
const isAuthed = require("../middleware/is-auth");

// /admin/add-product => GET
router.get("/add-product", isAuthed, adminController.getAddProduct);

// /admin/products => GET
router.get("/products", isAuthed, adminController.getProducts);

// /admin/add-product => POST
router.post(
  "/add-product",
  [
    body(
      "title",
      "please enter a text with only grater than 3 characters and not special character"
    )
      .isString()
      .trim()
      .isLength({ min: 3 }),

    body("price").isFloat().withMessage("please enter a float numbers"),
    body(
      "description",
      "please enter a decription with at least 5 character and not special character"
    )
      .isLength({ min: 5, max: 400 })
      .trim(),
  ],
  adminController.postAddProduct
);

router.get(
  "/edit-product/:productId",
  isAuthed,
  adminController.getEditProduct
);

router.post(
  "/edit-product",
  [
    body(
      "title",
      "please enter a text with only grater than 3 characters and not special character"
    )
      .isString()
      .trim()
      .isLength({ min: 3 }),
    body("price").isFloat().withMessage("please enter a float numbers"),
    body(
      "description",
      "please enter a decription with at least 5 character and not special character"
    )
      .isLength({ min: 5, max: 400 })
      .trim(),
  ],

  adminController.postEditProduct
);

router.delete(
  "/product/:productId",
  isAuthed,
  adminController.deleteProduct
);

module.exports = router;
