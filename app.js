const express = require("express");
const app = express();
const logger = require("morgan");
const dotenv = require("dotenv");
dotenv.config();

app.use(logger("dev"));
app.use(express.urlencoded({ extended: false }));

// ===================================================
// EJS / CSS
// ===================================================
app.use(express.static("public")); // CSS

const expressLayouts = require("express-ejs-layouts");
const path = require("path");
app.set("view engine", "ejs");
app.use(expressLayouts);
app.set("views", path.join(__dirname, "views"));

// ===================================================
// PASSPORT
// ===================================================
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const bcrypt = require("bcryptjs");

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));

passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ where: { email: email } });
        if (!user) {
          return done(null, false, { message: "Incorrect email" });
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          // passwords do not match!
          return done(null, false, { message: "Incorrect password" });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

//Lets me have access to currentUser in ALL my views!
app.use((req, res, next) => {
  console.log("Session User:", req.user);

  res.locals.currentUser = req.user;
  next();
});

// ===================================================
// ROUTES
// ===================================================
const models = require("./models");
const User = models.User;
const Message = models.Message;

app.get("/", async (req, res) => {
  try {
    const messages = await Message.findAll();
    res.render("messages/index", { messages });
  } catch (error) {
    res.status(500).send("error getting messages");
  }
});

app.get("/signup", async (req, res) => {
  res.render("auth/signup");
});

app.post("/signup", async (req, res, next) => {
  try {
    const { email, firstName, lastName, password1, password2 } = req.body;
    const existingUser = await User.findOne({ where: { email } });

    if (existingUser)
      return res.status(400).send("User already exists with this email.");
    if (password1 !== password2)
      return res.status(400).send("Passwords don't match");

    const hashedPassword = await bcrypt.hash(password1, 10);
    const newUser = await User.create({
      email,
      firstName,
      lastName,
      password: hashedPassword,
    });

    // Log the user in after successful signup
    req.login(newUser, (err) => {
      if (err) {
        return next(err);
      }
      // Redirect to desired page after successful login
      return res.redirect("/");
    });
  } catch (err) {
    return next(err);
  }
});

app.get("/login", async (req, res) => {
  res.render("auth/login");
});

app.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/",
    failureRedirect: "/login",
  })
);

app.get("/signout", (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.locals.currentUser = null;

    res.redirect("/");
  });
});

app.listen(3000, (req, res) => {
  console.log("Listening on port 3000");
});
