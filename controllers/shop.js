const Product = require("../models/product");
const Order = require("../models/order");
const fs = require("fs");
const stripe = require("stripe")(process.env.STRIPE_URI);
//will get us a documendt constractor
const PDFdocument = require("pdfkit");
const path = require("path");
const ITEMS_PER_PAGE = 1;
exports.getProducts = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalProducts;
  Product.find()
    .countDocuments()
    .then((productsNum) => {
      totalProducts = productsNum;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "products",
        path: "/products",
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
      console.log(err);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => console.log(err));
};

exports.getIndex = (req, res, next) => {
  const page = +req.query.page || 1;
  let totalProducts;
  Product.find()
    .countDocuments()
    .then((productsNum) => {
      totalProducts = productsNum;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
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
      console.log(err);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      console.log("cartt");
      const products = user.cart.items;

      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
      });
    })
    .catch((err) => console.log(err));
};

exports.postCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      console.log(result);
      res.redirect("/cart");
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then((result) => {
      res.redirect("/cart");
    })
    .catch((err) => console.log(err));
};

exports.getCheckOut = (req, res, next) => {
  let products;
  let total = 0;
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      products = user.cart.items;
      console.log(user);
      total = 0;
      products.forEach((p) => {
        total += p.quantity * p.productId.price;
      });
      return stripe.checkout.sessions
        .create({
          payment_method_types: ["card"],
          line_items: products.map((p) => {
            return {
              price_data: {
                currency: "usd",
                product_data: {
                  name: p.productId.title,
                  description: p.productId.description,
                },
                unit_amount: p.productId.price * 100,
              },
              quantity: p.quantity,
            };
          }),
          mode: "payment",
          success_url:
            req.protocol + "://" + req.get("host") + "/checkout/success",
          cancel_url:
            req.protocol + "://" + req.get("host") + "/checkout/cancel",
        })
        .then((session) => {
          console.log(session);
          res.render("shop/checkout", {
            path: "/checkout",
            pageTitle: "checkout",
            products: products,
            totalSum: total,
            sessionurl: session.url,
          });
        });
    })
    .catch((err) => console.log(err));
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate("cart.items.productId")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items.map((i) => {
        return { quantity: i.quantity, product: { ...i.productId._doc } };
      });
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user,
        },
        products: products,
      });
      return order.save();
    })
    .then((result) => {
      return req.user.clearCart();
    })
    .then(() => {
      res.redirect("/orders");
    })
    .catch((err) => console.log(err));
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
      });
    })
    .catch((err) => console.log(err));
};

exports.getInvoices = (req, res, next) => {
  const orderId = req.params.orderId;

  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error("no order found"));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("not authurized"));
      }

      const invoiceName = "invoice-" + orderId + ".pdf";
      const invoicePath = path.join("data", "invoices", invoiceName);

      const PDFdoc = new PDFdocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "inline; filename='" + invoiceName + "'"
      );
      PDFdoc.pipe(fs.createWriteStream(invoicePath));
      PDFdoc.pipe(res);

      PDFdoc.fontSize(26).text("Invoice", { underline: true });
      PDFdoc.text("-----------------------------");
      let totalPrice = 0;
      order.products.forEach((prod) => {
        PDFdoc.fontSize(14).text(
          `${prod.product.title} -- ${prod.quantity} x $${prod.product.price}`
        );
        totalPrice += prod.quantity * prod.product.price;
        PDFdoc.text("-----");
        PDFdoc.fontSize(20).text(`totalPrice= $${totalPrice}`);
      });
      PDFdoc.end();
    })
    .catch((err) => {
      console.log(err);
    });
};
