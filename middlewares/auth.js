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
        const userId = req.session.user || req.session.passport?.user;

        if (!userId) {
            return next(); // No user session, proceed to the next middleware
        }

        const user = await User.findById(userId);

        if (user) {
            if (user.isBlocked) {
                // Redirect to login if the user is blocked
                return res.redirect("/login");
            }
            // Redirect to the home page if the user is authenticated and not blocked
            return res.redirect("/");
        } else {
            // If the user is not found, clear the session and redirect to login
            req.session.destroy(() => {
                return res.redirect("/login");
            });
        }
    } catch (error) {
        console.error("Error in user authentication middleware:", error);
        res.status(500).send("Internal server error");
    }
};



module.exports = {
    userAuth,
    adminAuth,
    loginAuth,
}