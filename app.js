const express = require("express");
const app = express();
const logger = require("morgan");
const dotenv = require("dotenv");
dotenv.config();
const methodOverride = require("method-override");
app.use(methodOverride("_method"));

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
    const messages = await Message.findAll({
      include: [{ model: models.User }],
    });
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

app.get("/login", checkNotAuthenticated, async (req, res) => {
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
    // res.locals.currentUser = null;

    res.redirect("/");
  });
});

app.get("/membership", checkAuthenticated, (req, res) => {
  res.render("membership/new");
});

app.post("/membership", checkAuthenticated, async (req, res) => {
  try {
    const { secret } = req.body;
    const user = await User.findByPk(req.user.id);

    if (secret === "admin") {
      await user.update({ isAdmin: true, isMember: true });
    } else if (secret === "member") {
      await user.update({ isMember: true });
    }
  } catch (error) {
    res.status(500).send("error");
  }

  res.redirect("/");
});

app.get("/messages/new", checkMember, (req, res) => {
  res.render("messages/new");
});

app.post("/messages/new", checkMember, async (req, res) => {
  try {
    const message = await Message.create({
      userId: req.user.id,
      title: req.body.title,
      text: req.body.message,
    });

    res.redirect("/");
  } catch (error) {
    res.status(500).send("couldn't create message");
  }
});

app.delete("/messages/:id", checkAdmin, async (req, res) => {
  try {
    const result = await Message.destroy({ where: { id: req.params.id } });
    console.log("!!!!!!!!!!!!!!!!");
    console.log(result);
    console.log("!!!!!!!!!!!!!!!!");
    res.redirect("/");
  } catch (error) {
    console.log("error: ", error);
    res.status(500).send("Couldnt delete");
  }
});

// ===================================================
// HELPERS
// ===================================================
function checkMember(req, res, next) {
  if (req.user && req.user.isMember) {
    return next();
  }

  res.redirect("/");
}

function checkAdmin(req, res, next) {
  if (req.user.isAdmin) {
    return next();
  }

  res.redirect("/");
}

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }

  res.redirect("/login");
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  }
  next();
}

app.listen(3000, (req, res) => {
  console.log("Listening on port 3000");
});
