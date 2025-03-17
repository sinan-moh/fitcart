const mongoose = require("mongoose");
const { Schema } = mongoose;

const walletSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    avaliableBalance: {
        type: Number,
        required: true,
        min: 0,
        default: 0

    },
    transaction: [
        {
            orderId: {
                type:String,
            },
            amount: {
                type: Number,
                required: true

            },
            transactionType: {
                type: String,
                enum: ["debit", 'credit']
            },
            discription: {
                type: String,
                enum: ["cashBack", "Purchase", "Return", 'others']
            },
            date: {
                type: Date,
                default: Date.now()

            }
        }
    ]
},
    {
        timestamps: true
    }
);



const Wallet = mongoose.model("wallet", walletSchema)

module.exports = Wallet

