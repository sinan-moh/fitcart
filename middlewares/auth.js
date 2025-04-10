const User = require("../models/userSchema");
const userAuth = (req, res, next) => {
    // Get user from session
    const user = req.session.user || req.session.passport?.user;
  
    if (user) {
      // Find user in the database
      User.findById(user)
        .then(data => {
          if (data && !data.isBlocked) {
            next(); // User is authenticated and not blocked, proceed  
          } else {
            // If user is blocked, destroy the session and redirect to login
            req.session.destroy(err => {
              if (err) {
                console.error("Error destroying session:", err);
                res.status(500).send("Internal server error");
                return;
              }
              res.redirect("/login?message=Account Blocked");
            });
          }
        })
        .catch(error => {
          console.error("Error in userAuth middleware:", error);
          res.status(500).send("Internal server error");
        });
    } else {
      // User not logged in, redirect to login
      res.redirect("/login");
    }
  };





const adminAuth = async (req, res, next) => {
    User.findOne({ isAdmin: true })
        .then(data => {
            if (data) {
                next()
            } else {
                res.redirect("/admin/login")
            }
        })
        .catch(error => {
            console.error("error in admin auth", error)
            res.status(500).send("internal server error")
        })
}
const loginAuth = async (req, res, next) => {
  try {
    const userId = req.session.user?._id;

    if (!userId) {
      return next(); // No session, allow access to login/signup
    }

    const user = await User.findById(userId);

    if (!user || user.isBlocked) {
      req.session.destroy(() => {
        res.clearCookie("connect.sid"); // Clears session cookie
        return res.redirect("/login");
      });
    } else {
      return res.redirect("/"); // User is logged in and not blocked
    }
  } catch (err) {
    console.error("Login Auth Middleware Error:", err);
    return res.status(500).send("Internal server error");
  }
};
module.exports = {
    userAuth,
    adminAuth,
    loginAuth,
}