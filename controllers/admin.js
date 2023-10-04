const mongoose = require("mongoose");
const Product = require("../models/product");
const { validationResult } = require("express-validator");
const utilFunctions = require("../util/file");
const ITEMS_PER_PAGE = 1;
exports.getAddProduct = (req, res, next) => {
  res.render("admin/edit-product", {
    pageTitle: "Add Product",
    path: "/admin/add-product",
    editing: false,

    errorMessage: "",
    hasError: false,
    validationErrors: [],
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;
  // check if image doesn't exist
  if (!image) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title,
        price,
        description,
      },

      errorMessage: "this not image file",
      validationErrors: [],
    });
  }
  imageUrl = image.path;
  console.log(imageUrl);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("admin/edit-product", {
      pageTitle: "Add Product",
      path: "/admin/add-product",
      editing: false,
      hasError: true,
      product: {
        title,
        price,
        description,
      },

      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user,
  });
  product
    .save()
    .then((result) => {
      // console.log(result);
      console.log("Created Product");
      res.redirect("/admin/products");
    })
    .catch((err) => {
      
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect("/");
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        return res.redirect("/");
      }
      res.render("admin/edit-product", {
        pageTitle: "Edit Product",
        path: "/admin/edit-product",
        editing: editMode,
        product: product,

        hasError: false,
        validationErrors: [],
        errorMessage: "",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("admin/edit-product", {
      pageTitle: "edit Product",
      path: "/admin/edit-product",
      editing: true,
      hasError: false,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
      },

      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
    });
  }

  Product.findById(prodId)
    .then((product) => {
      // throw new Error("dummy");
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect("/");
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        utilFunctions.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      return product.save().then((result) => {
        console.log("UPDATED PRODUCT!");
        res.redirect("/admin/products");
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {

  const page = +req.query.page || 1;
  let totalProducts;
  Product.find({ userId: req.user._id })
    .countDocuments()
    .then((productsNum) => {
      totalProducts = productsNum;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render("admin/products", {
        prods: products,
        pageTitle: "Admin Products",
        path: "/admin/products",
        currentPage: page,
        hasNextPage: ITEMS_PER_PAGE * page < totalProducts,
        hasPreviousPages: page > 1,
        nextPage: page + 1,
        previouesPage: page - 1,
        lastPage: Math.ceil(totalProducts / ITEMS_PER_PAGE),
        csurfToken: req.csrfToken(),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.deleteProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      if (!product) {
        next(new Error("no product!"));
      }
      utilFunctions.deleteFile(product.imageUrl);

      return Product.findByIdAndRemove(prodId);
    })

    .then(() => {
      console.log("DESTROYED PRODUCT");
      // res.redirect("/admin/products");
      res.status(200).json({ message: "succsess!" });
    })
    .catch((err) => {
      res.status(500).json({ message: "deleted failed!" });
    
    });
};
