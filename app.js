const express = require('express');
const app = express();
const session = require('express-session');
const passport = require('./config/passport');
const path = require('path');
const env = require('dotenv').config(); // ensure dotenv is configured
const db = require('./config/db');
const userRouter = require('./routes/userRouter');
const adminRouter = require('./routes/adminRouter');

// Initialize DB connection
db();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000, // 3 days
    },
  })
);

// Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());

// Middleware to set `user` in locals for views
app.use((req, res, next) => {
  res.locals.user = req.user || null; // Ensures user is accessible in all views
  next();
});


// View engine setup
app.set('view engine', 'ejs');
app.set('views', [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);

// Static file setup
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', userRouter);
app.use('/admin', adminRouter);

app.use((req, res, next) => {
  res.status(404).render('page-404');
});


// Start server
const port = process.env.PORT || 3000; // Fallback to 3000 if not set in .env
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;
