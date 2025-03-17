(function($) {

  "use strict";

  var initPreloader = function() {
    $(document).ready(function($) {
    var Body = $('body');
        Body.addClass('preloader-site');
    });
    $(window).load(function() {
        $('.preloader-wrapper').fadeOut();
        $('body').removeClass('preloader-site');
    });
  }

  // init Chocolat light box
	var initChocolat = function() {
		Chocolat(document.querySelectorAll('.image-link'), {
		  imageSize: 'contain',
		  loop: true,
		})
	}

  var initSwiper = function() {

    var swiper = new Swiper(".main-swiper", {
      speed: 500,
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
    });

    var category_swiper = new Swiper(".category-carousel", {
      slidesPerView: 6,
      spaceBetween: 30,
      speed: 500,
      navigation: {
        nextEl: ".category-carousel-next",
        prevEl: ".category-carousel-prev",
      },
      breakpoints: {
        0: {
          slidesPerView: 2,
        },
        768: {
          slidesPerView: 3,
        },
        991: {
          slidesPerView: 4,
        },
        1500: {
          slidesPerView: 6,
        },
      }
    });

    var brand_swiper = new Swiper(".brand-carousel", {
      slidesPerView: 4,
      spaceBetween: 30,
      speed: 500,
      navigation: {
        nextEl: ".brand-carousel-next",
        prevEl: ".brand-carousel-prev",
      },
      breakpoints: {
        0: {
          slidesPerView: 2,
        },
        768: {
          slidesPerView: 2,
        },
        991: {
          slidesPerView: 3,
        },
        1500: {
          slidesPerView: 4,
        },
      }
    });

    var products_swiper = new Swiper(".products-carousel", {
      slidesPerView: 5,
      spaceBetween: 30,
      speed: 500,
      navigation: {
        nextEl: ".products-carousel-next",
        prevEl: ".products-carousel-prev",
      },
      breakpoints: {
        0: {
          slidesPerView: 1,
        },
        768: {
          slidesPerView: 3,
        },
        991: {
          slidesPerView: 4,
        },
        1500: {
          slidesPerView: 6,
        },
      }
    });
  }

  var initProductQty = function(){

    $('.product-qty').each(function(){

      var $el_product = $(this);
      var quantity = 0;

      $el_product.find('.quantity-right-plus').click(function(e){
          e.preventDefault();
          var quantity = parseInt($el_product.find('#quantity').val());
          $el_product.find('#quantity').val(quantity + 1);
      });

      $el_product.find('.quantity-left-minus').click(function(e){
          e.preventDefault();
          var quantity = parseInt($el_product.find('#quantity').val());
          if(quantity>0){
            $el_product.find('#quantity').val(quantity - 1);
          }
      });

    });

  }

  // init jarallax parallax
  var initJarallax = function() {
    jarallax(document.querySelectorAll(".jarallax"));

    jarallax(document.querySelectorAll(".jarallax-keep-img"), {
      keepImg: true,
    });
  }

  // document ready
  $(document).ready(function() {
    
    initPreloader();
    initSwiper();
    initProductQty();
    initJarallax();
    initChocolat();

  }); // End of a document

})(jQuery);

 // Assuming 'user' is set on the server-side



function addToWishlist(productId) {

  $.ajax({
    url: "/addToWishlist",
    method: 'POST',
    data: { productId: productId },
    success: (response) => {
      if (response.status) {
        Swal.fire({
          title: 'Added to wishlist',
          text: 'The product has been added to your wishlist',
          icon: 'success',
        });

        // Change button to reflect that it has been added to the wishlist
        const button = document.querySelector(`[data-product-id="${productId}"]`);
        button.querySelector('span').innerHTML = '❤️'; // Filled heart
        button.setAttribute('onclick', `removeproduct('${productId}')`); // Change to remove
      } else {
        Swal.fire({
          title: 'Already in wishlist',
          text: response.message,
          icon: 'error',
        });
      }
    },
    error: (error) => {
      Swal.fire({
        title: 'Error',
        text: "There was an error adding the product to your wishlist",
        icon: 'error',
      });
    }
  });
  console.log('Add to wishlist:', productId);
}

function removeproduct(productId) {
  $.ajax({
    url: `/wishlist/removewishlist/${productId}`,
    method: "DELETE",
    success: (response) => {
      if (response.status) {
        Swal.fire({
          title: '',
          text: 'The product has been removed from your wishlist',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });

        // Change button to reflect that it has been removed from the wishlist
        const button = document.querySelector(`[data-product-id="${productId}"]`);
        button.querySelector('span').innerHTML = '🤍'; // Empty heart
        button.setAttribute('onclick', `addToWishlist('${productId}')`); // Change to add
      } else {
        Swal.fire({
          title: 'Error',
          text: response.message || 'Failed to remove product from wishlist.',
          icon: 'error',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    },
    error: (error) => {
      Swal.fire({
        title: 'Error',
        text: 'There was an error removing the product from your wishlist.',
        icon: 'error',
        timer: 2000,
        showConfirmButton: false,
      });
    },
  });
}
document.addEventListener('DOMContentLoaded', function() {
  const carousel = document.querySelector('.swiper-wrapper');
  const slides = document.querySelectorAll('.swiper-slide');
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  
  let position = 0;
  const slideWidth = slides[0].offsetWidth + 20; // Including padding
  const visibleSlides = Math.floor(carousel.parentElement.offsetWidth / slideWidth);
  const maxScroll = -(slides.length - visibleSlides) * slideWidth;

  function updateCarouselPosition() {
    carousel.style.transform = `translateX(${position}px)`;
    
    // Update button states
    prevBtn.style.opacity = position >= 0 ? '0.5' : '1';
    nextBtn.style.opacity = position <= maxScroll ? '0.5' : '1';
  }

  prevBtn.addEventListener('click', () => {
    if (position >= 0) return;
    position += slideWidth;
    updateCarouselPosition();
  });

  nextBtn.addEventListener('click', () => {
    if (position <= maxScroll) return;
    position -= slideWidth;
    updateCarouselPosition();
  });

  // Touch events for mobile
  let touchStart = null;
  let touchPosition = null;

  carousel.addEventListener('touchstart', (e) => {
    touchStart = e.touches[0].clientX;
    touchPosition = position;
  });

  carousel.addEventListener('touchmove', (e) => {
    if (!touchStart) return;
    
    const diff = e.touches[0].clientX - touchStart;
    position = touchPosition + diff;
    
    // Add boundaries
    if (position > 0) position = 0;
    if (position < maxScroll) position = maxScroll;
    
    updateCarouselPosition();
  });

  carousel.addEventListener('touchend', () => {
    touchStart = null;
    // Snap to nearest slide
    position = Math.round(position / slideWidth) * slideWidth;
    updateCarouselPosition();
  });

  // Initial update
  updateCarouselPosition();

  // Handle window resize
  window.addEventListener('resize', () => {
    position = 0;
    updateCarouselPosition();
  });
});

  document.addEventListener("DOMContentLoaded", function () {
    var brandSwiper = new Swiper(".brand-carousel", {
      loop: true,
      slidesPerView: 4,
      spaceBetween: 15,
      navigation: {
        nextEl: ".brand-carousel-next",
        prevEl: ".brand-carousel-prev",
      },
      pagination: {
        el: ".swiper-pagination",
        clickable: true,
      },
      autoplay: {
        delay: 2500,
        disableOnInteraction: false,
      },
    });
  });
  document.addEventListener('DOMContentLoaded', function() {

    // Helper function to initialize Swiper
    function initSwiper(swiperClass, nextBtn, prevBtn) {
        return new Swiper(swiperClass, {
            slidesPerView: 6,       // Number of visible slides
            spaceBetween: 20,      // Space between slides
            loop: true,            // Enable infinite loop
            navigation: {
                nextEl: nextBtn,   // Next button element
                prevEl: prevBtn,   // Previous button element
            },
        });
    }

    // Initialize Swipers for each product category
    initSwiper('.trending-products-swiper', '.trending-products-next', '.trending-products-prev');
    initSwiper('.popular-products-swiper', '.popular-products-next', '.popular-products-prev');
    initSwiper('.new-products-swiper', '.new-products-next', '.new-products-prev');

});

