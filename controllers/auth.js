const User = require("../models/user");
const crypto = require("crypto"); // random token for reset pass
const bcrypt = require("bcryptjs");
const nodeMailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const { validationResult } = require("express-validator"); // thie import because express validataor  consist a sub packages
const user = require("../models/user");

const transporter = nodeMailer.createTransport(
  sendgridTransport({
    auth: {
      api_key:
        "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",
    },
  })
);
exports.getLogin = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    oldData: { email: "", password: "" },
    validationErrors: [],
  });
};

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    oldData: { email: "", password: "", confirmPassword: "" },
    validationErrors: [],
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "login",
      errorMessage: errors.array()[0].msg,
      oldData: { email: email, password: password },
      validationErrors: errors.array(),
    });
  }

  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "login",
          errorMessage: "invalid email or password",
          oldData: { email: email, password: password },
          validationErrors: errors.array(),
        });
      }
      return bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((err) => {
              console.log(err);
              return res.redirect("/");
            });
          }
          return res.status(422).render("auth/login", {
            path: "/login",
            pageTitle: "login",
            errorMessage: "invalid email or password",
            oldData: { email: email, password: password },
            validationErrors: errors.array(),
          });
        })
        .catch((err) => {
          console.log(err);
          res.redirect("/login");
        });
    })
    .catch((err) => {
      // throw new Error(err);
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPass = req.body.confirmPassword;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log(errors.array());
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldData: {
        email: email,
        password: password,
        confirmPassword: confirmPass,
      },
      validationErrors: errors.array(),
    });
  }

  bcrypt
    .hash(password, 12)
    .then((hashedPass) => {
      const user = new User({
        email: email,
        password: hashedPass,
        cart: { items: [] },
      });
      return user.save();
    })
    .then((result) => {
      res.redirect("/login");
      return transporter.sendMail({
        to: email,
        from: "amrro.salah@gmail.com",
        subject: "signUp succeeded",
        html: "<h1>you successfully signedUp </h1>",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex"); // hex to ascii
    // asign token to data base
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with this email");
          return res.redirect("/reset");
        }

        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 360000;
        return user.save();
      })
      .then((result) => {
        res.redirect("/");
        transporter.sendMail({
          to: req.body.email,
          from: "amrro.salah@gmail.com",
          subject: "password reset",
          html: `
          <p>you requested password reset</p>
          <p>click this <a href="http://localhost:3000/reset/${token}">Link</a> to reset a new password</p>
          
          `,
        });
      })
      .catch((err) => console.log(err));
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      let message = req.flash("error");
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      if (user) {
        res.render("auth/new-password", {
          path: "/new-password",
          pageTitle: "New Password",
          errorMessage: message,
          userId: user._id,
          resetToken: token,
        });
      }
    })
    .catch((err) => console.log(err));
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const resetToken = req.body.resetToken;
  let resetUser;
  User.findOne({
    resetToken: resetToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashedPass) => {
      resetUser.password = hashedPass;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      res.redirect("/");
      transporter.sendMail({
        to: resetUser.email,
        from: "amrro.salah@gmail.com",
        subject: "Confirm password reset",
        html: `
        <p>Your password requested succesfully </p>
        `,
      });
    })
    .catch((err) => console.log(err));
};
