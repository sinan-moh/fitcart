function getDetails() {
    const paymentMethod = document.getElementById('payment-method').value; // Get the selected payment method
    const selectedAddress = getSelectedAddress(); // Get the selected address ID

    console.log("Selected Address:", selectedAddress);

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

    // Prepare order data
    return {
        paymentMethod,
        addressId: selectedAddress
    };
}

async function placeOrder() {
    const details = getDetails(); // Get order details

    if (!details) return; // Stop if no details are provided

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

        if (data.paymentMethord === 'cod' || data.paymentMethord === 'wallet') {
            
            window.location.href = '/order-confirmation'; // Redirect after success
        
            return;
        } else if (data.paymentMethord === 'online-payment') {
            const options = {
                key: data.RAZORPAY_KEY_ID,
                amount: data.orderAmount,
                currency: 'INR',
                name: "FitCart",
                description: "Test Transaction",
                order_id: data.orderId,
                "redirect": true,
                "callback_url": "http://localhost:5000/verify-payment" ,
                prefill: {
                    name: details.userName,
                    email: details.email,
                    contact: details.phone
                },
                theme: {
                    color: "#3399cc"
                }
            };

            const paymentObject = new window.Razorpay(options);
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

// Get selected address ID
function getSelectedAddress() {
    const selectedAddress = document.querySelector('input[name="address"]:checked');

    if (!selectedAddress) {
        console.error("No address selected!");
        return null;
    }

    console.log("Selected Address ID:", selectedAddress.getAttribute('id'));
    return selectedAddress.getAttribute('id');
}

