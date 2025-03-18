const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt")
const loadLogin = (req, res) => {
    if (req.session.admin) {
        console.log(req.session.admin)
        return res.redirect("/admin/dashboard");
    }
    res.render("admin-login", { message: null });
};
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ email, isAdmin: true });

        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            if (passwordMatch) {
                req.session.admin = true;
                req.session.userId = admin._id;
                console.log("hello i am here")
                return res.redirect("/admin/dashboard");

            } else {

                return res.render("admin-login", { message: "Incorrect password." });
            }
        } else {
            return res.render("admin-login", { message: "Admin user not found." });
        }
    } catch (error) {
        console.error("Login error:", error);
        return res.redirect("/pageerror");
    }
};


const loadDashbord = async (req, res) => {
    if (req.session.admin) {
        try {
            res.render("dashboard")
        } catch (error) {
            res.redirect("/pageerror")

        }

    }
}
const pageerror = async (req, res) => {
    res.render("admin-error")
}
const logout = async (req, res) => {
    try {
        req.session.destroy(err => {
            if (err) {
                console.log("Error destroing session", err)
                return res.redirect("/pageerror")
            }
            res.redirect("/admin/login")
        })
    } catch (error) {
        console.log("unexpected error during logout", error);
        res.redirect("/pageerror")

    }
}

module.exports = {
    loadLogin,
    login,
    loadDashbord,
    pageerror,
    logout
}