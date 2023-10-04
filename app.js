const path = require("path");
const fs = require("fs");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const errorController = require("./controllers/error");
const dotenv = require("dotenv");

const User = require("./models/user");
dotenv.config();

//initalize the csurf middleware
const csurfProtect = csrf();
const app = express();
const store = new MongoDBStore({
  uri: process.env.MONGODB_URI,
  collection: "sessions",
});
//this for store the images
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, new Date().getTime().toString() + "-" + file.originalname);
  },
});
const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/png"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
app.set("view engine", "ejs");
app.set("views", "views");

const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");
app.use(helmet());
app.use(compression());
const streemLoggin = fs.createWriteStream(path.join(__dirname, "access.log"), {
  flag: "a",
});

app.use(morgan("combined", { stream: streemLoggin }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);
// must be below the sission cause it use session
app.use(csurfProtect);
// flash need to be after session cause it will use it
app.use(flash());
// this middleware to assign local values to every views or every req
app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});
app.use((req, res, next) => {
  // throw new Error("buj");
  // here we will add an extra check
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    // here the user propably delete and return undefind
    .then((user) => {
      // throw new Error("dum");
      // extra check
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      // not make sense to clonsole the error becuase here the error will be a tecneclal not a logical error
      // here in aysnc if there are ane erorr inside the error handling middleware not reach  you have to throw an error inside next()
      next(new Error(err)); // to handle it and give user feedback
      // console.log(err);
    });
});

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get("/500", errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
  // res.redirect("/500");
  res.status(500).render("500", {
    pageTitle: "Error!",
    path: "/500",
    isAuthenticated: req.session.isLoggedIn,
  });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then((result) => {
    app.listen(process.env.PORT || 3000, () => {
      console.log(`app listening on port:${process.env.PORT || 3000}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
