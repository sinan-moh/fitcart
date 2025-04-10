// ✅ Get selected address
function getSelectedAddress() {
    const selectedAddress = document.querySelector('input[name="address"]:checked');
    return selectedAddress ? selectedAddress.getAttribute('id') : null;
}

// ✅ Collect order details
function getDetails() {
    const paymentMethod = document.getElementById('payment-method').value;
    const selectedAddress = getSelectedAddress();

    if (!selectedAddress) {
        Swal.fire({
            title: 'Error',
            text: 'Please select a valid address!',
            icon: 'error',
            timer: 3000,
            showConfirmButton: false
        });
        return false;
    }

    if (!paymentMethod || paymentMethod === "") {
        Swal.fire({
            title: 'Error',
            text: 'Please select a payment method!',
            icon: 'error',
            timer: 3000,
            showConfirmButton: false
        });
        return false;
    }

    return {
        paymentMethod,
        addressId: selectedAddress
    };
}

// ✅ Place Order Function
async function placeOrder() {
    const details = getDetails();
    if (!details) return;

    try {
        const response = await fetch('/place-order', {
            method: 'POST',
            body: JSON.stringify(details),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        console.log("Response Data:", data);

        if (!response.ok) {
            throw new Error(data.message || "Something went wrong!");
        }

        // ✅ COD or Wallet Order
        if (data.paymentMethord === 'cod' || data.paymentMethord === 'wallet') {
            window.location.href = '/order-confirmation';
            return;
        }

        // ✅ Online Payment (Razorpay with handler)
        if (data.paymentMethord === 'online-payment') {
            const options = {
                key: data.RAZORPAY_KEY_ID,
                amount: data.orderAmount,
                currency: 'INR',
                name: "FitCart",
                description: "Order Payment",
                order_id: data.orderId,
                handler: async function (response) {
                    try {
                        const verificationRes = await fetch("/verify-payment", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_signature: response.razorpay_signature
                            })
                        });

                        const result = await verificationRes.json();

                        if (verificationRes.ok) {
                            Swal.fire({
                                title: "Payment Success",
                                text: result.message,
                                icon: "success",
                                timer: 3000,
                                showConfirmButton: false
                            });

                            setTimeout(() => {
                                window.location.href = "/order-confirmation";
                            }, 1500);
                        } else {
                            Swal.fire({
                                title: "Payment Failed",
                                text: result.message,
                                icon: "error",
                                timer: 3000,
                                showConfirmButton: false
                            });
                        }
                    } catch (err) {
                        console.error("Payment verification error:", err);
                        Swal.fire({
                            title: "Error",
                            text: "Something went wrong during payment verification.",
                            icon: "error",
                            timer: 3000,
                            showConfirmButton: false
                        });
                    }
                },
                prefill: {
                    name: data.userName,
                    email: data.email,
                    contact: data.phoneNumber
                },
                theme: {
                    color: "#3399cc"
                }
            };

            console.log("Opening Razorpay with:", options);
            const paymentObject = new Razorpay(options);
            paymentObject.open();
        }

    } catch (error) {
        console.error("Error placing order:", error);
        Swal.fire({
            title: 'Error',
            text: error.message,
            icon: 'error',
            timer: 3000,
            showConfirmButton: false
        });
    }
}
