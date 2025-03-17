// Apply Coupon
async function applyCoupon() {
    const couponCode = document.getElementById('couponCode').value;

    // References to the message elements
    const successMessage = document.getElementById('coupon-message');
    const errorMessage = document.getElementById('coupon-error');
    const appliedCouponSection = document.getElementById('applied-coupon');
    const appliedCouponCode = document.getElementById('appliedCouponCode');

    // Hide messages initially
    successMessage.style.display = 'none';
    errorMessage.style.display = 'none';

    if (!couponCode) {
        Swal.fire({
            title: 'Error',
            text: 'Please enter a coupon code!',
            icon: 'error',
            timer: 3000,
            showConfirmButton: false
        });
        return;
    }

    try {
        // Show loading indicator
        Swal.fire({
            title: 'Applying Coupon...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
        });

        // Send coupon code to the backend
        const response = await fetch(`/apply-coupon?couponCode=${couponCode}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const result = await response.json();
        Swal.close(); // Close loading indicator

        if (response.ok) {
            // Update the total payable price
            document.getElementById('totalPayable').innerHTML = `₹${result.finalPrice}`;

            // Show success message
            successMessage.style.display = 'block';
            successMessage.innerText = 'Coupon applied successfully!';

            // Display the applied coupon
            appliedCouponSection.style.display = 'block';
            appliedCouponCode.innerText = couponCode;

            // Clear the coupon input
            document.getElementById('couponCode').value = '';
        } else {
            // Show error message
            errorMessage.style.display = 'block';
            errorMessage.innerText = result.message || 'Invalid coupon code.';
        }
    } catch (error) {
        Swal.close(); // Close loading indicator
        console.error('Error applying coupon:', error);
        errorMessage.style.display = 'block';
        errorMessage.innerText = 'An error occurred. Please try again.';
    }
}

// Remove Coupon
async function removeCoupon() {
    const appliedCouponSection = document.getElementById('applied-coupon');
    const successMessage = document.getElementById('coupon-message');

    try {
        // Show loading indicator
        Swal.fire({
            title: 'Removing Coupon...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
        });

        // Call backend to remove coupon
        const response = await fetch('/remove-coupon', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const result = await response.json();
        Swal.close(); // Close loading indicator

        if (response.ok) {
            // Update the total payable price
            document.getElementById('totalPayable').innerHTML = `₹${result.finalPrice}`;

            // Hide the applied coupon section
            appliedCouponSection.style.display = 'none';

            Swal.fire({
                title: 'Coupon Removed',
                text: 'Coupon removed successfully.',
                icon: 'success',
                timer: 3000,
                showConfirmButton: false,
            });
        } else {
            Swal.fire({
                title: 'Error',
                text: result.message || 'Failed to remove coupon.',
                icon: 'error',
                timer: 3000,
                showConfirmButton: false,
            });
        }
    } catch (error) {
        Swal.close();
        console.error('Error removing coupon:', error);
        Swal.fire({
            title: 'Error',
            text: 'An error occurred while removing the coupon. Please try again.',
            icon: 'error',
            timer: 3000,
            showConfirmButton: false,
        });
    }
}


