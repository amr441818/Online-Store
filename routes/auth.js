const express = require("express");
const { check, body } = require("express-validator");
const authController = require("../controllers/auth");
const User = require("../models/user");

const router = express.Router();

router.get("/login", authController.getLogin);

router.get("/signup", authController.getSignup);

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .normalizeEmail()
      .withMessage("plese enter a correct email "),
    body(
      "password",
      "please enter a password with only numbers and text and 5 characters"
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
  ],
  authController.postLogin
);

router.post(
  "/signup",
  [
    check("email")
      .isEmail()
      .withMessage("please enter a valid email")
      .normalizeEmail()
      .custom((value, { req }) => {
        // if (value === "amr441818@gmail.com") {
        //   throw new Error("this email is forbidden");
        // }

        return User.findOne({ email: value }).then((userDoc) => {
          if (userDoc) {
            return Promise.reject("This email is already exist");
            // req.flash("error", "This email is already exist");
            // return res.redirect("/signup");
          }

          // return true; // if the value successededs
        });
      }),
    body(
      "password",
      "please enter a password with only numbers and text and 5 characters"
    )
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
    body("confirmPassword")
      .trim()
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("The password have to be matched");
        }
        return true;
      }),
  ],
  authController.postSignup
);

router.post("/logout", authController.postLogout);
router.get("/reset", authController.getReset);
router.post("/reset", authController.postReset);
router.get("/reset/:token", authController.getNewPassword);
router.post("/new-password", authController.postNewPassword);

module.exports = router;
