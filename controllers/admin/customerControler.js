

const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema")
const customerInfo = async (req, res) => {
    try {
      let search = req.query.search || "";
      let page = parseInt(req.query.page) || 1;
      const limit = 6;
  
      const query = {
        isAdmin: false,
        $or: [
          { name: { $regex: ".*" + search + ".*", $options: "i" } },
          { email: { $regex: ".*" + search + ".*", $options: "i" } },
        ],
      };
  
      const userData = await User.find(query)
        .sort({ createdOn: -1 }) // ✅ Use your custom date field
        .limit(limit)
        .skip((page - 1) * limit);
  
      const count = await User.countDocuments(query);
      const totalPages = Math.ceil(count / limit);
  
      res.render("customers", {
        data: userData,
        totalPages,
        currentPage: page,
        search,
      });
    } catch (error) {
      console.error("Error fetching customer data:", error);
      res.status(500).send("Internal Server Error");
    }
  };
  
const customerBlocked=async(req,res)=>{
    try{
        let id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:true}});
        res.redirect("/admin/users")
}catch(error){
    res.redirect("/pageerror")

}
}
const customerunBlocked= async(req,res)=>{
    try {
        let id=req.query.id;
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect("/admin/users")
    } catch (error) {
        res.redirect("/pageerror")
    }
}

module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked,
}