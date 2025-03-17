const User = require("../../models/userSchema")
const Wallet = require("../../models/walletSchema")

const getWallet = async (req, res) => {
    try {
        const userId = req.session.user

        const user = await User.findById(userId)
        const wallet = await Wallet.findOne({ userId: user });


        let cashback = 0
        let totalReturn = 0
        let totalPurchase = 0

        if (wallet) {

            for (let ele of wallet.transaction) {

                if (ele.discription === "cashBack") {
                    cashback += ele.amount
                }
                if (ele.discription === "Return") {
                    totalReturn += ele.amount
                }
                if (ele.discription === "Purchase") {
                    totalPurchase += ele.amount
                }
            }


        }

        res.render('wallet', { wallet, user, totalPurchase, totalReturn, cashback })

    } catch (error) {
        console.log(error);
    }

}


const updateWallet = async (amount, transactionType, userId, discription, orderId = null) => {
    try {

        let wallet = await Wallet.findOne({ userId });


        if (!wallet) {

            const newWallet = new Wallet({
                userId,
                avaliableBalance: amount,
                transaction: [{
                    orderId: orderId,
                    amount: amount,
                    transactionType,
                    discription,
                }]
            })

            console.log(await newWallet.save());
            
            
        } else {
            if (transactionType === "credit") {
              await  Wallet.updateOne({ userId }, {
                    $inc: {
                        avaliableBalance: amount
                    },
                    $push:{
                        transaction:{
                            orderId,
                            amount,
                            transactionType,
                            discription,
                        }
                    }

                })

            }else{
               await Wallet.updateOne({ userId }, {
                    $inc: {
                        avaliableBalance: -amount
                    },
                    $push:{
                        transaction:{
                            orderId,
                            amount,
                            transactionType,
                            discription,
                        }
                    }

                })
            }
        }





    } catch (error) {
        console.error(error);


    }

}
module.exports = {
    getWallet,
    updateWallet
}