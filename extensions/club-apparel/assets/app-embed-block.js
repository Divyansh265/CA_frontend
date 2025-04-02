
console.log("testing the function")
fetch('/apps/caapi/api/test')
    .then(response => response.json())
    .then(data => {
        console.log("data", data)
    })
    .catch(error => console.error('Error:', error));


document.getElementById('popupPhoneNumber').addEventListener('input', function (e) {
    // Allow only digits (numbers)
    this.value = this.value.replace(/[^0-9]/g, '');
});

document.getElementById('otp2').addEventListener('input', function (e) {
    // Allow only digits (numbers)
    this.value = this.value.replace(/[^0-9]/g, '');
});

document.addEventListener("DOMContentLoaded", () => {
    function appendContent() {
        let content = document.querySelector('.capopupmain')?.innerHTML;
        let cartDrawerItems = document.querySelector("cart-drawer-items");

        if (cartDrawerItems && content) {
            let popup = document.querySelector(".loyaltyPopup");
            if (!popup) {
                popup = document.createElement("div");
                popup.classList.add("loyaltyPopup");
                cartDrawerItems.insertAdjacentElement("afterend", popup);
            }
            popup.innerHTML = content;
        }
    }

    function updateDiscountMessage(balance) {
        const messageElement = document.querySelector("#discount-message");
        if (messageElement) {
            messageElement.textContent = `You have ${balance} AED available in your gift card balance.`;
        }
    }

    // Retrieve tierCode from localStorage or set a default
    let tierCode = localStorage.getItem("tierCode");

    appendContent();

    const giftCardBalance = localStorage.getItem("giftCardBalance");
    if (giftCardBalance !== null && giftCardBalance !== undefined) {
        const balanceInt = Math.floor(Number(giftCardBalance));
        updateDiscountMessage(balanceInt);
    }

    document.addEventListener("click", (event) => {
        if (event.target && event.target.id === "closePopupBtn") {
            document.querySelector(".loyaltyPopup")?.remove();
        }
    });

    async function cardPercentageCalculation() {
        if (!tierCode) return;

        let tierPercentages = {
            "SILVER": 0.02,
            "GOLD": 0.03,
            "BLACK": 0.05
        };

        try {
            let response = await fetch('/cart.js');
            let cart = await response.json();

            let totalCalculatedAmount = 0;

            cart.items.forEach(item => {
                if (item.title === "Cash on Delivery fee") return;

                let originalPriceKey = '_Orignal price';
                let percentage = (item.properties && item.properties[originalPriceKey])
                    ? 0.01
                    : tierPercentages[tierCode] || 0.02;

                let calculatedAmount = item.original_line_price * percentage;
                totalCalculatedAmount += calculatedAmount;
            });

            let roundedValue = Math.round(totalCalculatedAmount / 100);

            const caPointsElement = document.querySelector("#ca-points");
            if (caPointsElement) {
                caPointsElement.innerHTML = `<span style="font-weight: bold;">${roundedValue} AED</span> CA points`;
            }
        } catch (error) {
            console.error("Error fetching cart data:", error);
        }
    }

    (function () {
        var originalFetch = window.fetch;
        window.fetch = async function (...args) {
            let response = await originalFetch.apply(this, args);

            if (args[0].includes('/cart/change') || args[0].includes('/cart/update')) {
                await cardPercentageCalculation();
                setTimeout(appendContent, 1000);
            }

            return response;
        };
    })();

    document.body.addEventListener("submit", (event) => {
        if (event.target.matches('form[action="/cart/add"]')) {
            setTimeout(appendContent, 1000);
        }
    });
});

document.addEventListener("DOMContentLoaded", function () {
    // Wait for the button to appear
    const checkButton = setInterval(() => {
        let payButton = document.querySelector("#checkout-pay-button");
        if (payButton) {
            clearInterval(checkButton);
            console.log("Pay Now button found!");

            // Add event listener to capture clicks
            payButton.addEventListener("click", function () {
                console.log("Pay Now button clicked!");
            });
        }
    }, 500); // Check every 500ms


    //  var test = document.getElementById('modalPointBalance').textContent;
    //if(test == 0){
    // document.getElementById('applyDiscountBtn').disabled = true;
    //}
});

// Function to update the price display and store compare-at price
function updateVariantPrice() {
    // Find all forms that have an input[name="id"]
    const forms = document.querySelectorAll("form:has(input[name='id'])");

    if (forms.length === 0) {
        console.error("No forms found with input[name='id']");
        return;
    }

    // Get the product handle from the URL
    const url = new URL(window.location.href);
    const productHandle = url.pathname.split('/products/')[1]?.split('/')[0];

    if (!productHandle) {
        console.error("Product handle not found in URL");
        return;
    }

    // Fetch product JSON from Shopify's AJAX API
    fetch(`/products/${productHandle}.json`)
        .then(response => response.json())
        .then(productData => {
            if (!productData?.product?.variants) {
                console.error("Invalid product data format");
                return;
            }

            forms.forEach((form) => {
                const variantInput = form.querySelector("input[name='id']");
                if (!variantInput) return;

                const selectedVariantId = parseInt(variantInput.value, 10);

                // Find the selected variant in product data
                const selectedVariant = productData.product.variants.find(v => v.id === selectedVariantId);

                if (selectedVariant) {
                    const comparePrice = selectedVariant.compare_at_price; // Get compare-at price
                    const originalPrice = selectedVariant.price; // Get original price

                    if (comparePrice && comparePrice > originalPrice) {
                        console.log(`Compare Price Found: ${comparePrice}, Original Price: ${originalPrice}`);

                        // Find or create the hidden input inside this form
                        let comparePriceInput = form.querySelector('input[name="properties[_Orignal price]"]');
                        if (!comparePriceInput) {
                            comparePriceInput = document.createElement("input");
                            comparePriceInput.type = "hidden";
                            comparePriceInput.id = "orignal-price";
                            comparePriceInput.name = "properties[_Orignal price]";

                            // Append the hidden input inside this specific form
                            form.appendChild(comparePriceInput);
                        }

                        // Update the hidden input's value
                        comparePriceInput.value = comparePrice;
                    } else {
                        console.warn(`Compare-at price is missing or lower than the original price for variant ${selectedVariantId}`);

                        // Remove hidden input if it exists
                        const existingInput = form.querySelector('input[name="properties[_Orignal price]"]');
                        if (existingInput) {
                            existingInput.remove();
                            console.log(`Removed hidden input from form.`);
                        }
                    }
                }
            });
        })
        .catch(error => console.error("Error fetching product:", error));
}

// Observe changes in all hidden variant <input> fields
const variantInputs = document.querySelectorAll('input[name="id"]');

variantInputs.forEach((variantInput) => {
    const observer = new MutationObserver(() => {
        console.log("Variant input updated:", variantInput.value);
        updateVariantPrice(); // Call function when variant ID changes
    });

    observer.observe(variantInput, { attributes: true, attributeFilter: ['value'] });
});

// Initial call to update prices when the page loads
updateVariantPrice();



document.addEventListener("DOMContentLoaded", function () {
    var comparePrice = document.querySelectorAll('#price-preview del');

    /*if (comparePrice.length > 0) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.id = "orignal-price";
        input.name = "properties[_Orignal price]";
    
        // Extract text content and join values into a single string
        input.value = Array.from(comparePrice).map(price => price.textContent.trim()).join(', ');
    
        const form = document.querySelector('form[action="/cart/add"]');
    
        if (form) {
            form.appendChild(input);
        } else {
            console.error('Form with action "/cart/add" not found.');
        }
    }*/

    const checkoutbtn = document.getElementById('CartDrawer-Checkout'); // Checkout button on cart page
    if (checkoutbtn) {
        checkoutbtn.addEventListener("click", function (event) {
            const shopDomain = window.location.hostname; // Get the Shopify store domain
            const discountCode = localStorage.getItem('discountCode');

            if (discountCode) {
                event.preventDefault(); // Prevent default checkout
                const checkoutUrl = `https://${shopDomain}/checkout?discount=${discountCode}`;

                // Clear the stored discount code before redirecting
                localStorage.removeItem('checkoutUrl');
                // localStorage.removeItem('profileData');
                //localStorage.removeItem('discountCode');
                window.location.href = checkoutUrl; // Redirect to checkout with discount
                sendShopifyHeaders();
            } else {
                localStorage.removeItem('profileData');
            }
        });
    }

    /* function updateCartAttributes(attributes) {
           fetch("/cart/update.js", {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({ attributes })
           })
           .then(response => response.json())
           .then(data => console.log("Cart updated:", data))
           .catch(error => console.error("Error updating cart:", error));
       }*/

    // Retrieve profile data from local storage
    const profileData = localStorage.getItem("profileData");

    if (profileData) {
        let rankLogoUrl = "";
        let profilePercentage = ""
        try {
            // Parse JSON string into an object
            const profileObject = JSON.parse(profileData);

            // Extract PhoneNumber and PointAmount
            const phoneNumber = profileObject?.Phones?.[0]?.PhoneNumber || "N/A";
            const pointAmount = profileObject?.JsonExternalData?.PointBalance?.[0]?.PointAmount || 0;
            const tierCode = profileObject.TierCode
            profilePercentage = profileObject?.JsonExternalData?.Profile_Percentage;

            const applyDiscountBtn = document.getElementById('applyDiscountBtn');
            const profileModalBtn = document.querySelector(".profile-modal-dis-btn");
            if (profilePercentage < 100) {
                applyDiscountBtn.disabled = true;
                document.querySelector('.range-container').style.pointerEvents = 'none';
                profileModalBtn.classList.add("profile-disabled-button");
                //  document.querySelector(".incomplete-profile-messege").innerHTML += "Download the App and update your profile to redeem your points!";
                const messageContainer = document.querySelector(".incomplete-profile-messege");
                const newMessage = "Download the App and update your profile to redeem your points!";

                // Remove existing message if present
                if (messageContainer.innerHTML.includes(newMessage)) {
                    messageContainer.innerHTML = messageContainer.innerHTML.replace(newMessage, "").trim();
                }

                // Append new message
                messageContainer.innerHTML += ` ${newMessage}`;
            } else {
                applyDiscountBtn.disabled = false;
                document.querySelector('.range-container').style.pointerEvents = 'auto';
                profileModalBtn.classList.remove("profile-disabled-button");
            }


            if (tierCode === "BLACK") {
                rankLogoUrl = "https://cdn.shopify.com/s/files/1/0651/5815/2438/files/Group_985_1.png?v=1742890482";
            } else if (tierCode === "GOLD") {
                rankLogoUrl = "https://cdn.shopify.com/s/files/1/0651/5815/2438/files/Group_985_2.png?v=1742890482";
            } else if (tierCode === "SILVER") {
                rankLogoUrl = "https://cdn.shopify.com/s/files/1/0651/5815/2438/files/Group_985.png?v=1742890482";
            }

            // Update the rank logo image dynamically
            const rankLogoImg = document.querySelector(".rank-logo");
            if (rankLogoImg && rankLogoUrl) {
                rankLogoImg.src = rankLogoUrl;
            }





            console.log("tierCode", tierCode)
            console.log("Phone Number:", phoneNumber, "Points:", pointAmount);

            // Append values to the respective elements
            document.getElementById("modalPhoneNumber").textContent = phoneNumber;
            document.getElementById("modalPointBalance").textContent = pointAmount;
            console.log("profileData.TierCode", profileData.TierCode)
            const giftCardBalance = localStorage.getItem("giftCardBalance");
            if (giftCardBalance) {

                if (tierCode) {
                    let tierPercentages = {
                        "SILVER": 0.02,
                        "GOLD": 0.03,
                        "BLACK": 0.05
                    };

                    fetch('/cart.js')
                        .then(response => response.json())
                        .then(cart => {
                            let totalCalculatedAmount = 0;
                            let hasOriginalPriceProperty = false;
                            let allHaveOriginalPriceProperty = true; // Assume all items have it until proven otherwise

                            cart.items.forEach(item => {
                                if (item.title === "Cash on Delivery fee") {
                                    return; // Skip this item
                                }

                                let finalPrice = item.final_line_price || 0; // Ensure final_line_price exists
                                let originalPriceKey = '_Orignal price';
                                let hasOriginalProperty = item.properties && item.properties[originalPriceKey];

                                if (hasOriginalProperty) {
                                    hasOriginalPriceProperty = true;
                                } else {
                                    allHaveOriginalPriceProperty = false;
                                }



                                let percentage = hasOriginalProperty ? 0.01 : tierPercentages[tierCode] || 0;

                                // Step 1: Subtract percentage from final_price
                                let discountedPrice = finalPrice * (1 - percentage);

                                // Step 2: Get percentage from the new result
                                let calculatedAmount = discountedPrice * percentage;

                                totalCalculatedAmount += calculatedAmount;

                                console.log(`Item: ${item.product_title}`);
                                console.log(`Final Line Price: ${(finalPrice / 100).toFixed(2)} AED`);
                                console.log(`Discounted Price After First Deduction: ${(discountedPrice / 100).toFixed(2)} AED`);
                                console.log(`Final Calculated Amount (1% or tier % of new price): ${(calculatedAmount / 100).toFixed(2)} AED`);
                                console.log('--------------------------------');
                            });


                            if (!hasOriginalPriceProperty) {
                                console.log("No items in the cart have the '_Orignal price' property. Using tier percentages for all.");
                            } else if (allHaveOriginalPriceProperty) {
                                console.log("All items have '_Orignal price'. Applying 1% for all.");
                            } else {
                                console.log("Some items have '_Orignal price', some don't. Applying mixed calculation.");
                            }

                            let roundedValue = Math.round(totalCalculatedAmount / 100);


                            const sliderValueBalance = Math.floor(giftCardBalance)
                            const cartTotal = (cart.total_price / 100).toFixed(2)
                            const totalPEPts = cartTotal - sliderValueBalance
                            const finalPoints = totalPEPts / cartTotal;
                            console.log(finalPoints)
                            const resultPoints = Math.floor(finalPoints * roundedValue)
                            console.log("Total Additional Calculated Amount:", resultPoints, "AED");

                            const caPointsElement = document.querySelector("#ca-points");
                            if (caPointsElement) {
                                caPointsElement.innerHTML = `<span style="font-weight: bold;">${resultPoints} AED</span> CA points`;
                            }
                        })
                        .catch(error => console.error("Error fetching cart data:", error));
                }

            }



            // Update range slider max value
            /*  const rangeSlider = document.getElementById("rangeSlider");
              if (rangeSlider) {
                  rangeSlider.max = pointAmount;
              }*/
            fetch('/cart.js')
                .then(response => response.json())
                .then(cart => {
                    const subtotal = Math.round(cart.items_subtotal_price / 100); // Round subtotal
                    const pointAmount = parseFloat(document.getElementById("modalPointBalance").textContent) || 0;

                    // Determine the smaller value
                    const maxValue = Math.min(subtotal, pointAmount);

                    // Update range slider max value, reset value, and update tooltip
                    const rangeSlider = document.getElementById("rangeSlider");
                    const tooltip = document.getElementById("tooltip");

                    if (rangeSlider) {
                        rangeSlider.max = maxValue;
                        rangeSlider.value = 0; // Reset to 0
                        if (tooltip) {
                            tooltip.textContent = rangeSlider.value;
                        }
                    }

                    console.log(`Updated range slider max: ${maxValue}`);
                })
                .catch(error => console.error('Error fetching cart:', error));


            // Store the phone number in the hidden input field
            const hiddenPhoneInput = document.getElementById("hiddenPhoneNumber");
            if (hiddenPhoneInput) {
                hiddenPhoneInput.value = phoneNumber;
            }


        } catch (error) {
            console.error("Error parsing JSON from local storage:", error);
        }
    } else {
        console.log("No data found in local storage.");
        updateCartAttributes({ Phone: "" });

    }
});

//remove discount code after 10 min on page load
document.addEventListener("DOMContentLoaded", async function () {
    const discountCode = localStorage.getItem("discountCode");

    if (!discountCode) {
        console.log("No discount code found in localStorage.");
        return;
    }

    const shopDomain = window.location.hostname; // Get shop name
    console.log("Shop Domain:", shopDomain);

    const headers = {
        "X-Shopify-Access-Token": "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",
        "Content-Type": "application/json"
    };

    try {
        // Step 1: Lookup price rule ID using the discount code
        const lookupResponse = await fetch(
            `https://stevemadden-me-dev.myshopify.com/admin/api/2025-01/discount_codes/lookup.json?code=${discountCode}`,
            { method: "GET", headers }
        );

        if (!lookupResponse.ok) {
            console.error("Failed to fetch price rule:", await lookupResponse.text());
            return;
        }

        const lookupData = await lookupResponse.json();
        const priceRuleId = lookupData?.discount_code?.price_rule_id;
        const createdAt = lookupData?.discount_code?.created_at;

        if (!priceRuleId || !createdAt) {
            console.error("Price rule or creation time not found.");
            return;
        }

        console.log("Price Rule ID:", priceRuleId);
        console.log("Discount Created At:", createdAt);

        // Step 2: Calculate remaining time for deletion (TEST: 10 seconds after creation)
        const createdTime = new Date(createdAt).getTime(); // Convert to timestamp
        const currentTime = new Date().getTime(); // Current timestamp
        const elapsedTime = currentTime - createdTime; // Time passed in milliseconds
        const tenSeconds = 10 * 60 * 1000; // 10 seconds in milliseconds
        const remainingTime = Math.max(tenSeconds - elapsedTime, 0); // Ensure non-negative value

        console.log(`Deleting discount in ${remainingTime / 1000} seconds`);

        // Step 3: Schedule deletion
        setTimeout(async () => {
            try {
                const deleteResponse = await fetch(
                    `https://stevemadden-me-dev.myshopify.com/admin/api/2025-01/price_rules/${priceRuleId}.json`,
                    { method: "DELETE", headers }
                );

                if (!deleteResponse.ok) {
                    console.error("Failed to delete discount:", await deleteResponse.text());
                    return;
                }
                console.log("Discount deleted successfully.");


                // Remove discount code from localStorage
                localStorage.removeItem("discountCode");


            } catch (error) {
                console.error("Error deleting discount:", error);
            }
        }, remainingTime);

    } catch (error) {
        console.error("Error fetching price rule:", error);
    }
});

document.addEventListener("DOMContentLoaded", async function () {
    const giftCardId = localStorage.getItem("giftCardId");

    if (!giftCardId) {
        console.log("No gift card found in localStorage.");
        return;
    }

    const headers = {
        "X-Shopify-Access-Token": "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",
        "Content-Type": "application/json"
    };

    try {
        // Step 1: Fetch Gift Card details
        const giftCardResponse = await fetch(
            `https://stevemadden-me-dev.myshopify.com/admin/api/2025-04/gift_cards/${giftCardId}.json`,
            { method: "GET", headers }
        );

        if (!giftCardResponse.ok) {
            console.error("Failed to fetch gift card:", await giftCardResponse.text());
            return;
        }

        const giftCardData = await giftCardResponse.json();
        const createdAt = giftCardData?.gift_card?.created_at;

        if (!createdAt) {
            console.error("Gift card creation time not found.");
            return;
        }

        console.log("Gift Card Created At:", createdAt);

        // Step 2: Calculate remaining time for disabling (5 minutes after creation)
        const createdTime = new Date(createdAt).getTime(); // Convert to timestamp
        const currentTime = new Date().getTime(); // Current timestamp
        const elapsedTime = currentTime - createdTime; // Time passed in milliseconds
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
        const remainingTime = Math.max(fiveMinutes - elapsedTime, 0); // Ensure non-negative value

        console.log(`Disabling gift card in ${remainingTime / 1000} seconds`);

        // Step 3: Schedule disable action
        setTimeout(async () => {
            try {
                const disableResponse = await fetch(
                    `https://stevemadden-me-dev.myshopify.com/admin/api/2025-04/gift_cards/${giftCardId}/disable.json`,
                    { method: "POST", headers }
                );

                if (!disableResponse.ok) {
                    console.error("Failed to disable gift card:", await disableResponse.text());
                    return;
                }
                console.log("Gift card disabled successfully.");

                localStorage.removeItem('profileData');
                localStorage.removeItem('profileFetchTime');
                localStorage.removeItem("giftCardBalance")
                // Remove gift card ID from localStorage
                localStorage.removeItem("giftCardId");

            } catch (error) {
                console.error("Error disabling gift card:", error);
            }
        }, remainingTime);

    } catch (error) {
        console.error("Error fetching gift card details:", error);
    }
});


function showError(message) {
    const errorContainer = document.getElementById('errorContainer');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = message;
    errorContainer.style.display = 'block';


}

// Close error on button click
document.getElementById('closeErrorButton').addEventListener('click', () => {
    document.getElementById('errorContainer').style.display = 'none';
});



document.getElementById("resendOtp").addEventListener("click", async (event) => {
    event.preventDefault();

    const phoneNumber = document.getElementById("popupPhoneNumber")?.value.trim();

    if (!phoneNumber) {
        showError("Please enter a valid phone number.");
        // alert("Please enter a valid phone number.");
        return;
    }

    // Show loader
    const loader = document.getElementById("loader"); // Make sure you have an element with id="loader"
    loader.style.display = "flex";

    try {
        await resgistrationygenerateOtp(phoneNumber);
    } catch (error) {
        console.error("Error generating OTP:", error);
        showError("Failed to generate OTP. Please try again.");
        // alert("Failed to generate OTP. Please try again.");
    } finally {
        // Hide loader after request is complete
        loader.style.display = "none";
    }
});



document.getElementById("resendOtp_2").addEventListener("click", async (event) => {
    event.preventDefault();

    const phoneNumber = document.getElementById("popupPhoneNumber")?.value.trim();

    if (!phoneNumber) {
        showError("Please enter a valid phone number.");
        //alert("Please enter a valid phone number.");
        return;
    }

    // Show loader
    const loader = document.getElementById("loader"); // Make sure you have an element with id="loader"
    loader.style.display = "flex";

    try {
        await resgistrationygenerateOtp(phoneNumber);
    } catch (error) {
        console.error("Error generating OTP:", error);
        showError("Failed to generate OTP. Please try again.");
        // alert("Failed to generate OTP. Please try again.");
    } finally {
        // Hide loader after request is complete
        loader.style.display = "none";
    }
});


document.querySelector('.icon-2').addEventListener('click', async (event) => {
    event.preventDefault();
    const otp = document.getElementById('otp2')?.value.trim();
    const isValid = await validateOtp(otp);
    if (isValid) {
        document.getElementById('submit-button').disabled = false;
    }
});


async function sendShopifyHeaders() {
    const shopifyHeaders = {
        'X-Shopify-Access-Token': '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',
        'Content-Type': 'application/json'
    };

    try {
        const response = await fetch('https://ca.stevemadden.sa/shopify/store-headers', {
            method: 'POST',
            headers: shopifyHeaders,
            body: JSON.stringify({ message: "Sending Shopify headers" })
        });

        const data = await response.json();
        console.log("Headers sent successfully:", data);
    } catch (error) {
        console.error("Error sending headers:", error);
    }
}

async function applyDiscount() {
    const sliderValue = rangeSlider.value;
    console.log('sliderValue', sliderValue);

    const customerId = await fetchShopifyCustomerId();
    console.log('customerId', customerId);

    try {
        //await createPriceRuleAndDiscountCode(sliderValue, customerId);
        await createGiftCard(sliderValue, customerId)
        // Update the text dynamically
        updateDiscountMessage(sliderValue);
        const profileData = localStorage.getItem("profileData");
        // Parse JSON string into an object
        const profileObject = JSON.parse(profileData);
        const tierCode = profileObject.TierCode
        console.log("tierCode", tierCode)


        const onapplypointAmount = profileObject?.JsonExternalData?.PointBalance?.[0]?.PointAmount || 0;


        if (tierCode) {
            let tierPercentages = {
                "SILVER": 0.02,
                "GOLD": 0.03,
                "BLACK": 0.05
            };

            fetch('/cart.js')
                .then(response => response.json())
                .then(cart => {
                    let totalCalculatedAmount = 0;
                    let hasOriginalPriceProperty = false;
                    let allHaveOriginalPriceProperty = true; // Assume all items have it until proven otherwise

                    cart.items.forEach(item => {
                        if (item.title === "Cash on Delivery fee") {
                            return; // Skip this item
                        }

                        let finalPrice = item.final_line_price || 0; // Ensure final_line_price exists
                        let originalPriceKey = '_Orignal price';
                        let hasOriginalProperty = item.properties && item.properties[originalPriceKey];

                        if (hasOriginalProperty) {
                            hasOriginalPriceProperty = true;
                        } else {
                            allHaveOriginalPriceProperty = false;
                        }



                        let percentage = hasOriginalProperty ? 0.01 : tierPercentages[tierCode] || 0;

                        // Step 1: Subtract percentage from final_price
                        let discountedPrice = finalPrice * (1 - percentage);

                        // Step 2: Get percentage from the new result
                        let calculatedAmount = discountedPrice * percentage;

                        totalCalculatedAmount += calculatedAmount;

                        console.log(`Item: ${item.product_title}`);
                        console.log(`Final Line Price: ${(finalPrice / 100).toFixed(2)} AED`);
                        console.log(`Discounted Price After First Deduction: ${(discountedPrice / 100).toFixed(2)} AED`);
                        console.log(`Final Calculated Amount (1% or tier % of new price): ${(calculatedAmount / 100).toFixed(2)} AED`);
                        console.log('--------------------------------');
                    });


                    if (!hasOriginalPriceProperty) {
                        console.log("No items in the cart have the '_Orignal price' property. Using tier percentages for all.");
                    } else if (allHaveOriginalPriceProperty) {
                        console.log("All items have '_Orignal price'. Applying 1% for all.");
                    } else {
                        console.log("Some items have '_Orignal price', some don't. Applying mixed calculation.");
                    }

                    let roundedValue = Math.round(totalCalculatedAmount / 100);



                    const cartTotal = (cart.total_price / 100).toFixed(2)
                    const totalPEPts = cartTotal - sliderValue
                    const finalPoints = totalPEPts / cartTotal;
                    console.log(finalPoints)
                    const resultPoints = Math.floor(finalPoints * roundedValue)
                    console.log("Total Additional Calculated Amount:", resultPoints, "AED");

                    const caPointsElement = document.querySelector("#ca-points");
                    if (caPointsElement) {
                        caPointsElement.innerHTML = `<span style="font-weight: bold;">${resultPoints} AED</span> CA points`;
                    }
                })
                .catch(error => console.error("Error fetching cart data:", error));
        }






        closeProfileModal();
    } catch (error) {
        console.error("Error applying discount:", error);
    }
}

// Function to update the message dynamically
function updateDiscountMessage(points) {
    const discountMessage = document.querySelector(".myclickbuttonn").parentElement;

    if (discountMessage) {
        discountMessage.innerHTML = `<span style="font-size: 14px;">
            CA Reward Points Successfully Applied of <b>${points}.00 AED </b>
        </span>`;
    }
}



async function createGiftCard(initialValue, customerId) {
    const backendUrl = '/apps/caapi/api/shopify/customers/gift_card'; // Your backend endpoint



    let phoneNumber = document.getElementById("popupPhoneNumber")?.value.trim();

    if (!phoneNumber) {
        phoneNumber = document.getElementById('hiddenPhoneNumber')?.value.trim();
    }


    let phone = phoneNumber.startsWith('971') ? phoneNumber : `971${phoneNumber}`;
    // Request payload
    const payload = {
        initialValue,
        customerId,
        phoneNumber: phone
    };
    console.log("initialValue: ", initialValue, " phoneNumber :", phone, "customerId :", customerId)

    try {
        const response = await fetch(backendUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseData = await response.json();
        console.log('API Response:', responseData);

        if (!response.ok || responseData.errors) {
            console.error('API Errors:', responseData.errors);
            return;
        }

        console.log('Gift Card Created:', responseData);
        const giftCode = responseData.code;
        const giftCardId = responseData.id;
        const giftCardBalance = responseData.balance
        localStorage.setItem('giftCardId', giftCardId);
        localStorage.setItem('giftCardBalance', giftCardBalance)


        // Schedule deletion after 2 minutes (120000ms)
        // setTimeout(() => {
        //     deleteGiftCard(giftCardId);
        // }, 120000);

        // Apply the gift card to the checkout
        applyDiscountToCheckout(giftCode, 'stevemadden-me-dev.myshopify.com', giftCardId, giftCardBalance);
        return responseData.gift_card;
    } catch (error) {
        console.error('Error:', error);
    }
}


async function deleteGiftCard(giftCardId) {
    const deleteUrl = `https://stevemadden-me-dev.myshopify.com/admin/api/2025-04/gift_cards/${giftCardId}/disable.json`;

    try {
        const response = await fetch(deleteUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': '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' // Replace with your access token
            }
        });

        if (response.ok) {
            console.log(`Gift Card ${giftCardId} deleted successfully.`);
        } else {
            const responseData = await response.json();
            console.error('Error deleting gift card:', responseData.errors);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}


const applyDiscountBtn = document.getElementById("applyDiscountBtn");

function updateButtonState() {
    const giftCardId = localStorage.getItem("giftCardId");

    if (giftCardId) {
        applyDiscountBtn.disabled = true;
        applyDiscountBtn.textContent = "Already Applied";
        applyDiscountBtn.classList.add("disabled-discount-button")
    } else {
        applyDiscountBtn.disabled = false;
        applyDiscountBtn.textContent = "Apply Discount";
        applyDiscountBtn.classList.remove("disabled-discount-button");
    }
}

// Run initially
updateButtonState();

// Listen for localStorage changes (in case it updates dynamically)
window.addEventListener("storage", updateButtonState);


async function createPriceRuleAndDiscountCode(sliderValue, customerId) {
    const shopDomain = 'stevemadden-me-dev.myshopify.com';
    const accessToken = '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';

    // Generate a random discount code and title
    const randomNumber = Math.floor(Math.random() * 10000000000);
    const title = `CA_${randomNumber}`;
    const code = title; // Using title as the discount code
    const customerIds = [`gid://shopify/Customer/${customerId}`];
    const discountAmount = parseFloat(sliderValue).toString();

    const graphqlQuery = JSON.stringify({
        query: `mutation DiscountCodeBasicCreate($title: String!, $code: String!, $customerIds: [ID!]!, $discountAmount: Decimal!) {
        discountCodeBasicCreate(
          basicCodeDiscount: {
            title: $title
            code: $code
            startsAt: "2025-01-22T00:00:00Z"
            endsAt: "2026-01-22T23:59:59Z"
            usageLimit: 1
            appliesOncePerCustomer: true
            customerSelection: {
              customers: {
                add: $customerIds
              }
            }
            customerGets: {
              value: {
                discountAmount: {
                  amount: $discountAmount
                  appliesOnEachItem: false
                }
              }
              items: {
                all: true
              }
            }
            combinesWith: {
              orderDiscounts: true
              productDiscounts: true
              shippingDiscounts: true
            }
          }
        ) {
          userErrors {
            field
            message
          }
          codeDiscountNode {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                startsAt
                endsAt
                combinesWith {
                  orderDiscounts
                  productDiscounts
                  shippingDiscounts
                }
              }
            }
          }
        }
      }`,
        variables: {
            title,
            code,
            customerIds,
            discountAmount
        }
    });

    try {
        const response = await fetch(`https://${shopDomain}/admin/api/2025-01/graphql.json`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Shopify-Access-Token': accessToken
            },
            body: graphqlQuery
        });

        const responseData = await response.json();
        console.log('GraphQL Response:', responseData);

        if (responseData.data.discountCodeBasicCreate.userErrors.length > 0) {
            console.error('GraphQL Errors:', responseData.data.discountCodeBasicCreate.userErrors);
            return;
        }

        console.log('Discount Code Created:', responseData.data.discountCodeBasicCreate.codeDiscountNode.codeDiscount);
        // applyDiscountToCheckout(code, shopDomain);
    } catch (error) {
        console.error('Error:', error);
    }
}



/*async function createPriceRuleAndDiscountCode(sliderValue,customerId) {
   const shopDomain = 'stevemadden-me-dev.myshopify.com';
   const accessToken = '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';

   // Generate a random number for the price rule title
   const randomNumber = Math.floor(Math.random() * 10000000000);

   const priceRuleData = {
      price_rule: {
         title: `CA_${randomNumber}`,
         target_type: 'line_item',
         target_selection: 'all',
         allocation_method: 'across',
         value_type: 'fixed_amount',
         value: -parseFloat(sliderValue), // Use slider value dynamically
         once_per_customer: true,
         usage_limit: null,
         customer_selection: 'prerequisite',
         prerequisite_customer_ids: [customerId],
         starts_at: '2025-01-22T00:00:00Z',
      },
   };

   try {
      // Create the price rule
      const priceRuleResponse = await fetch(`https://${shopDomain}/admin/api/2024-10/price_rules.json`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
         },
         body: JSON.stringify(priceRuleData),
      });

      if (!priceRuleResponse.ok) {
         throw new Error('Error creating price rule');
      }

      const priceRuleResponseData = await priceRuleResponse.json();
      console.log('priceRuleResponse', priceRuleResponseData)
      const priceRuleId = priceRuleResponseData.price_rule.id;

      // Create the discount code using the price rule ID
      const discountCodeData = {
         discount_code: {
            code: priceRuleResponseData.price_rule.title, // Use the title of the price rule as the code
         },
      };

      const discountCodeResponse = await fetch(`https://${shopDomain}/admin/api/2024-10/price_rules/${priceRuleId}/discount_codes.json`, {
         method: 'POST',
         headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
         },
         body: JSON.stringify(discountCodeData),
      });

      if (discountCodeResponse.ok) {
         const discountCodeResponseData = await discountCodeResponse.json();
         console.log('Discount code created successfully:', discountCodeResponseData);
         // Redirect the user to checkout with the discount code applied
         applyDiscountToCheckout(discountCodeResponseData.discount_code.code, shopDomain);
      } else {
         throw new Error('Error creating discount code');
      }
   } catch (error) {
      console.error(error.message);
   }
}
*/

async function fetchShopifyCustomerId() {
    // First, try getting the phone number from the visible input field
    let phoneNumber = document.getElementById('popupPhoneNumber')?.value.trim();


    // If the phone number is empty or undefined, fallback to the hidden input field
    if (!phoneNumber) {
        phoneNumber = document.getElementById('hiddenPhoneNumber')?.value.trim();
    }

    // If still no phone number, return null
    if (!phoneNumber) return null;
    let phone = phoneNumber.startsWith('971') ? phoneNumber : `971${phoneNumber}`;

    console.log("Using phone number:", phone);


    const checkShopifyUrl = `/apps/caapi/api/shopify/customers/${phone}`;

    try {
        const shopifyResponse = await fetch(checkShopifyUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                //  'X-Shopify-Access-Token': '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'
            }
        });

        if (shopifyResponse.ok) {
            const shopifyData = await shopifyResponse.json();
            console.log("Shopify Response:", shopifyData);

            if (shopifyData.customers && shopifyData.customers.length > 0) {
                return shopifyData.customers[0].id; // Get customer ID dynamically
            }
        }
    } catch (error) {
        console.error("Error fetching Shopify customer ID:", error);
    }
    return null;
}



// Redirect to Shopify checkout with discount code
function applyDiscountToCheckout(discountCode, shopDomain, giftCardId, giftCardBalance) {
    const checkoutUrl = `https://${shopDomain}/checkout?discount=${discountCode}`;
    console.log('Generated Checkout URL:', checkoutUrl);

    // Save the URL in localStorage
    localStorage.setItem('checkoutUrl', checkoutUrl);
    localStorage.setItem('discountCode', discountCode);
    // localStorage.setItem('giftCardId', giftCardId);
    // localStorage.setItem('giftCardBalance', giftCardBalance)


}


const rangeSlider = document.querySelector('input[type="range"]');
const tooltip = document.querySelector('.tooltip');

rangeSlider.addEventListener('input', () => {
    const value = rangeSlider.value;
    const max = rangeSlider.max;

    // Calculate the percentage of the range slider
    const percentage = (value / max) * 100;

    // Set the background color fill based on the value
    rangeSlider.style.background = `linear-gradient(to right, #D0A661 ${percentage}%, #ddd ${percentage}%)`;

    // Update tooltip text and position
    tooltip.innerText = value;
    tooltip.style.left = `calc(${percentage}% - 20px)`; // Adjust to center the tooltip on the thumb
});


// Get elements

const modalPointBalance = document.querySelector('.my-points');


// Add event listener to the range slider
rangeSlider.addEventListener('input', function () {
    // Get the current value of the slider
    const sliderValue = rangeSlider.value;

    // Update the points balance dynamically
    modalPointBalance.textContent = (0 + parseInt(sliderValue)).toString(); // Adding slider value to the base 5600 points
});


document.getElementById("popupPhoneNumber").addEventListener("focus", function () {
    document.querySelector(".country-code-placeholder").style.cssText = "left: 0.2px; height: 41px; width: 40px;";
});

function openProfileModal() {

    const popupOverlay = document.getElementById('popup-overlay');

    if (popupOverlay) {
        popupOverlay.style.display = 'none';
    }

    // Open the profile modal
    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
        profileModal.style.display = 'block';
    } else {
        console.error("Profile modal element not found in the DOM.");
    }
}

function closeProfileModal() {
    const profileModal = document.getElementById('profileModal');
    if (profileModal) {
        profileModal.style.display = 'none';
    } else {
        console.error("Profile modal element not found in the DOM.");
    }
}

const otpButton = document.getElementById('otpButton');
const loader = document.getElementById('loader');
// Initialize the button
otpButton.dataset.action = "sendAndCheck";
otpButton.textContent = "Get OTP";

// Event listener for the button
//new function

otpButton.addEventListener('click', async (event) => {
    event.preventDefault();

    const phoneNumber = document.getElementById('popupPhoneNumber')?.value.trim();
    const uaePhoneRegex = /^5\d{8}$/;

    if (!phoneNumber || !uaePhoneRegex.test(phoneNumber)) {
        showError("Please enter a valid phone number.");
        return;
    }


    if (otpButton.dataset.action === "sendAndCheck") {
        // const checkShopifyUrl = `https://stevemadden-me-dev.myshopify.com/admin/api/2024-01/customers/search.json?query=phone:${phoneNumber}`;
        const checkShopifyUrl = `/apps/caapi/api/shopify/customers/971${phoneNumber}`
        //const checkShopifyUrl = `/apps/caapi/search-customer?phoneNumber=${phoneNumber}`
        //const checkCAUrl = "https://ca.stevemadden.sa/getProfileByPhone";
        const checkCAUrl = "https://ca.stevemadden.sa/api/epsilon/profiles/getProfileByPhone";
        const createCAProfileUrl = "https://ca.stevemadden.sa/api/profiles";
        //const otpApiUrl = "https://ca.stevemadden.sa/generate-otp";
        const otpApiUrl = "https://ca.stevemadden.sa/api/club_apparel/otp/generate";

        try {
            loader.style.display = 'flex';
            // Check if customer exists in Shopify
            console.log("Checking Shopify for customer...");
            const shopifyResponse = await fetch(checkShopifyUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // 'X-Shopify-Access-Token': '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'
                }
            });

            let shopifyCustomerExists = false;
            let shopifyCustomerEmail = "";
            if (shopifyResponse.ok) {
                const shopifyData = await shopifyResponse.json();
                console.log("Shopify Response:", shopifyData);
                if (shopifyData.customers && shopifyData.customers.length > 0) {
                    shopifyCustomerExists = true;
                    shopifyCustomerEmail = shopifyData.customers[0]?.email || "";

                }
            }

            // Check if customer exists in CA API
            console.log("Checking Club Apparel API for customer...");
            const caResponse = await fetch(checkCAUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    PhoneNumber: `971${phoneNumber}`
                })
            });

            let caCustomerExists = false;
            let caCustomerEmail = "";
            if (caResponse.ok) {
                const caData = await caResponse.json();
                console.log("Club Apparel API Response:", caData);
                if (caData.JsonExternalData) {
                    caCustomerExists = true;
                    caCustomerEmail = caData.Emails?.[0]?.EmailAddress || "";
                }
            }
            if (caResponse) {
                caResponse.json()
                    .then(async message => {  // Marking function as async to use await inside
                        console.log("CA response:", message);
                        console.log("Error:", message.error); // Extract error message

                        if (message.error === "Please contact CASupport@clubapparel.com") {
                            showError(message.error);
                        }

                        // If profile doesn't exist, prompt for new customer creation
                        if (message.error === "Profile doesn't exist.") {

                            loader.style.display = 'none';
                            document.getElementById('popupCreateCustomer').style.display = 'flex';
                            document.getElementById('popupEmail').value = '';
                            document.getElementById('otpButton').style.display = 'none';
                            document.querySelector('.popup-footer').style.display = 'none';
                            document.querySelector('.middle-sec').classList.add("add-customer-new");
                            document.getElementById('popup-overlay').classList.add("pop-overlay-new");

                            // Await OTP generation for the new customer registration
                            await resgistrationygenerateOtp(phoneNumber);

                            return;

                        }
                    })
                    .catch(err => console.error("Failed to parse JSON:", err));
            }




            // If CA has the customer but Shopify does not, create the customer in Shopify
            if (caCustomerExists && !shopifyCustomerExists) {
                console.log("Creating customer in Shopify...");
                if (!caCustomerEmail) {
                    loader.style.display = 'none';
                    // alert("Customer email is missing in Club Apparel. Cannot create customer in Shopify.");
                    return;
                }

                const createShopifyRequestBody = {

                    email: caCustomerEmail,
                    phone: `971${phoneNumber}`

                };

                try {
                    // const checkShopifyCustomer=`https://stevemadden-me-dev.myshopify.com/admin/api/2024-01/customers.json`
                    const checkShopifyCustomer = `/apps/caapi/api/shopify/customers`
                    const createShopifyResponse = await fetch(checkShopifyCustomer, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            //  "X-Shopify-Access-Token": "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"
                        },
                        body: JSON.stringify(createShopifyRequestBody)
                    });
                    console.log("createShopifyResponse", createShopifyResponse)

                    if (createShopifyResponse.ok) {
                        console.log("Customer created in Shopify.");
                        // alert("Customer successfully created in Shopify!");
                    } else {
                        console.error("Failed to create customer in Shopify.");
                        //  alert("Failed to create customer in Shopify. Please try again.");
                    }
                } catch (error) {
                    console.error("Error while creating customer in Shopify:", error);
                    // alert("An error occurred while creating the customer in Shopify. Check console for details.");
                }
            }

            // If Shopify has the customer but CA does not, create the customer in CA
            if (shopifyCustomerExists && !caCustomerExists) {
                console.log("Creating customer in Club Apparel...");
                if (!shopifyCustomerEmail) {
                    loader.style.display = 'none';
                    // alert("Customer email is missing in Shopify. Cannot create customer in CA.");
                    return;
                }

                const createCARequestBody = {
                    Emails: [{
                        EmailAddress: shopifyCustomerEmail
                    }],
                    Phones: [{
                        PhoneNumber: `971${phoneNumber}`
                    }],
                    SourceCode: "APP",
                    EnrollChannelCode: "APP",
                    JsonExternalData: {
                        IsPhoneVerified: "true",
                        IsEmailVerified: "true"
                    }
                };

                const createCAResponse = await fetch(createCAProfileUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(createCARequestBody)
                });

                if (createCAResponse.ok) {
                    console.log("Customer created in Club Apparel.");
                    // alert("Customer successfully created in Club Apparel!");
                } else {
                    console.error("Failed to create customer in Club Apparel.");

                    //showError("Please contact CASupport@clubapparel.com");
                    loader.style.display = 'none';

                    //  alert("Failed to create customer in Club Apparel. Please try again.");
                    return;
                }
            }

            // Alert if customer is missing in both systems
            if (!shopifyCustomerExists && !caCustomerExists) {
                loader.style.display = 'none'
                // alert("Customer not found in both Shopify and Club Apparel systems. Please create a new customer.");
                //document.querySelector('.download-app-section').style.display = 'none';
                document.getElementById('popupCreateCustomer').style.display = 'flex';
                document.getElementById('popupEmail').value = '';
                document.getElementById('otpButton').style.display = 'none';
                document.querySelector('.popup-footer').style.display = 'none';
                document.querySelector('.middle-sec').classList.add("add-customer-new");
                document.getElementById('popup-overlay').classList.add("pop-overlay-new");
                await resgistrationygenerateOtp(phoneNumber)

                return;
            }



            // Send OTP if customer exists in both systems
            console.log("Sending OTP...");
            const otpRequestBody = {
                mobileNo: `971${phoneNumber}`
            };
            const otpResponse = await fetch(otpApiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(otpRequestBody)
            });
            loader.style.display = 'none';

            if (otpResponse.ok) {
                const otpResult = await otpResponse.json();
                console.log("OTP Response:", otpResult);
                // alert(`OTP sent successfully! Transaction ID: ${otpResult.transId}`);
                localStorage.setItem('transId', otpResult.transId);
                startCountdown();
                //document.querySelector('.download-app-section').style.display = 'none';
                // Show OTP input field
                document.querySelector('.inp-otp').style.display = 'block';
                document.querySelector('.cart-popup').classList.add('new-class');
                // Update button to "Validate OTP"
                otpButton.textContent = "Submit";
                otpButton.dataset.action = "validate";
            } else {
                showError("Failed to send OTP. Please try again.");
                // alert("Failed to send OTP. Please try again.");
            }
        } catch (error) {
            loader.style.display = 'none';
            console.error("Error while processing request:", error);
            // alert("An error occurred. Check console for details.");
        }
    } else if (otpButton.dataset.action === "validate") {
        const otp = document.getElementById('popup-otp')?.value.trim();

        if (!otp) {
            //alert("Please enter the OTP.");
            showError("Please enter the OTP.");
            return;
        }

        const transId = localStorage.getItem('transId');
        if (!transId) {
            // alert("Transaction ID not found. Please generate the OTP again.");
            showError("Transaction ID not found. Please generate the OTP again.");
            return;
        }

        const validateOtpUrl = "https://ca.stevemadden.sa/api/club_apparel/otp/validate";
        const requestBody = {
            otp,
            transId: "123"
        };

        try {
            loader.style.display = 'flex';
            console.log("Validating OTP...");
            const response = await fetch(validateOtpUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });

            if (response.ok) {
                const result = await response.json();
                console.log("Validate OTP Response:", result);
                if (result.message === "Hi") {
                    //  alert("OTP validated successfully!");

                    // Fetch CA data after OTP validation
                    console.log("Fetching Club Apparel data...");
                    //  loader.style.display = 'flex';
                    const getProfileApiUrl = "https://ca.stevemadden.sa/api/epsilon/profiles/getProfileByPhone";
                    const profileRequestBody = {
                        PhoneNumber: `971${phoneNumber}`
                    };

                    const profileResponse = await fetch(getProfileApiUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(profileRequestBody)
                    });
                    loader.style.display = 'none';

                    if (profileResponse.ok) {
                        const profileData = await profileResponse.json();
                        console.log("Club Apparel Profile Data:", profileData);

                        localStorage.setItem('profileData', JSON.stringify(profileData));
                        localStorage.setItem('profileFetchTime', new Date().getTime());

                        let storedData = localStorage.getItem("profileData");
                        console.log("storedData ", storedData)


                        let contactPhoneNumber = "";
                        let loggedInProfileId = "";
                        let rankLogoUrl = "";
                        let profilePercentage = "";
                        try {
                            let profileData = storedData ? JSON.parse(storedData) : null;
                            contactPhoneNumber = profileData?.Phones?.[0]?.PhoneNumber || "";
                            profilePercentage = profileData?.JsonExternalData?.Profile_Percentage;
                            loggedInProfileId = profileData?.ProfileId;
                            console.log(contactPhoneNumber)



                            const tierCode = profileData?.TierCode;
                            if (tierCode === "BLACK") {
                                rankLogoUrl = "https://cdn.shopify.com/s/files/1/0651/5815/2438/files/Group_985_1.png?v=1742890482";
                            } else if (tierCode === "GOLD") {
                                rankLogoUrl = "https://cdn.shopify.com/s/files/1/0651/5815/2438/files/Group_985_2.png?v=1742890482";
                            } else if (tierCode === "SILVER") {
                                rankLogoUrl = "https://cdn.shopify.com/s/files/1/0651/5815/2438/files/Group_985.png?v=1742890482";
                            }

                            // Update the rank logo image dynamically
                            const rankLogoImg = document.querySelector(".rank-logo");
                            if (rankLogoImg && rankLogoUrl) {
                                rankLogoImg.src = rankLogoUrl;
                            }
                        } catch (error) {
                            console.error("Invalid JSON in localStorage:", error);
                        }

                        // First, get existing cart attributes
                        fetch('/cart.js')
                            .then(response => response.json())
                            .then(cart => {
                                let attributes = cart.attributes || {}; // Get existing attributes

                                // Remove the existing phone number if it exists
                                if (attributes["Phone"]) {
                                    delete attributes["Phone"];
                                }
                                if (attributes["ProfileId"]) {
                                    delete attributes["ProfileId"];
                                }

                                // Add the new phone number if available
                                if (contactPhoneNumber) {
                                    attributes["Phone"] = contactPhoneNumber;
                                }

                                if (loggedInProfileId) {
                                    attributes["ProfileId"] = loggedInProfileId;
                                }
                                // Update the cart with the new attributes
                                return fetch('/cart/update.js', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ attributes })
                                });
                            })
                            .then(response => response.json())
                            .then(data => console.log("Cart updated:", data))
                            .catch(error => console.error("Error updating cart:", error));




                        // Extract PointBalance data
                        const pointBalance = profileData.JsonExternalData?.PointBalance || [];
                        const pointAmount = pointBalance.length > 0 ? pointBalance[0].PointAmount : "N/A";


                        const applyDiscountBtn = document.getElementById('applyDiscountBtn');
                        const profileModalBtn = document.querySelector(".profile-modal-dis-btn");
                        if (pointAmount === "N/A" || pointAmount === 0 || profilePercentage < 100) {
                            applyDiscountBtn.disabled = true;
                            profileModalBtn.classList.add("profile-disabled-button");
                            document.querySelector('.range-container').style.pointerEvents = 'none';

                            if (profilePercentage < 100) {
                                //    document.querySelector(".incomplete-profile-messege").innerHTML += "Download the App and update your profile to redeem your points!";
                                const messageContainer = document.querySelector(".incomplete-profile-messege");
                                const newMessage = "Download the App and update your profile to redeem your points!";

                                // Remove existing message if present
                                if (messageContainer.innerHTML.includes(newMessage)) {
                                    messageContainer.innerHTML = messageContainer.innerHTML.replace(newMessage, "").trim();
                                }

                                // Append new message
                                messageContainer.innerHTML += ` ${newMessage}`;
                            }
                        } else {
                            applyDiscountBtn.disabled = false;
                            profileModalBtn.classList.remove("profile-disabled-button");
                            document.querySelector('.range-container').style.pointerEvents = 'auto';

                        }


                        // Populate modal with CA data
                        console.log("Populating modal with CA data...");
                        document.getElementById('modalPhoneNumber').textContent = phoneNumber;
                        document.getElementById('modalPointBalance').textContent = pointAmount;


                        // Set max value for the range slider
                        /* const rangeSlider = document.getElementById('rangeSlider');
       
                         rangeSlider.max = pointAmount;
                         rangeSlider.value = 0; // Reset the slider value to 0
       
                         document.getElementById('tooltip').textContent = rangeSlider.value;*/

                        fetch('/cart.js')
                            .then(response => response.json())
                            .then(cart => {
                                const subtotal = Math.round(cart.items_subtotal_price / 100); // Round subtotal
                                const pointAmount = parseFloat(document.getElementById("modalPointBalance").textContent) || 0;

                                // Determine the smaller value
                                const maxValue = Math.min(subtotal, pointAmount);

                                // Update range slider max value, reset value, and update tooltip
                                const rangeSlider = document.getElementById("rangeSlider");
                                const tooltip = document.getElementById("tooltip");

                                if (rangeSlider) {
                                    rangeSlider.max = maxValue;
                                    rangeSlider.value = 0; // Reset to 0
                                    if (tooltip) {
                                        tooltip.textContent = rangeSlider.value;
                                    }
                                }

                                console.log(`Updated range slider max: ${maxValue}`);
                            })
                            .catch(error => console.error('Error fetching cart:', error));


                        // Open modal
                        closePopup()
                        document.getElementById('profileModal').style.display = 'block';


                        rangeSlider.addEventListener('input', () => {
                            document.getElementById('tooltip').textContent = rangeSlider.value;
                        });
                    } else {
                        showError("Failed to fetch Club Apparel API data.");
                        //  alert("Failed to fetch Club Apparel API data.");
                    }
                } else {
                    showError("OTP validation failed. Please try again.");
                    // alert("OTP validation failed. Please try again.");
                }
            } else {
                loader.style.display = 'none';
                showError("Failed to validate OTP. Please try again.");
                //  alert("Failed to validate OTP. Please try again.");
            }
        } catch (error) {

            console.error("Error while validating OTP:", error);
            showError("An error occurred while validating OTP. Check console for details.");
            // alert("An error occurred while validating OTP. Check console for details.");
        }
    }
});

async function resgistrationygenerateOtp(phoneNumber) {
    const otpRequestBody = {
        mobileNo: `971${phoneNumber}`
    };
    const otpResponse = await fetch('https://ca.stevemadden.sa/api/club_apparel/otp/generate', {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(otpRequestBody)
    });

    if (otpResponse.ok) {
        const otpResult = await otpResponse.json();
        console.log("OTP Response:", otpResult);
        //alert(`OTP sent successfully! Transaction ID: ${otpResult.transId}`);
        localStorage.setItem('transId', otpResult.transId);
        startCountdown();
    } else {
        showError("Failed to send OTP. Please try again.");
        //alert("Failed to send OTP. Please try again.");
    }
}

// Generic OTP validation function that accepts an OTP as a parameter.

async function validateOtp(otp) {
    if (!otp) {
        showError("Please enter the OTP.");

        //alert("Please enter the OTP.");
        return false;
    }

    const transId = localStorage.getItem('transId');
    if (!transId) {
        showError("Transaction ID not found. Please generate the OTP again.");
        //alert("Transaction ID not found. Please generate the OTP again.");
        return false;
    }

    const validateOtpUrl = "https://ca.stevemadden.sa/api/club_apparel/otp/validate";
    const requestBody = { otp, transId: "123" };

    try {
        loader.style.display = 'flex';
        console.log("Validating OTP...");
        const response = await fetch(validateOtpUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            loader.style.display = 'none'
            const result = await response.json();
            console.log("Validate OTP Response:", result);
            if (result.message === "Hi") {
                //   showError("OTP validated successfully!");
                // alert("OTP validated successfully!");
                return true;
            } else {
                showError("OTP validation failed. Please try again.");
                //alert("OTP validation failed. Please try again.");
                return false;
            }
        } else {
            loader.style.display = 'none';
            showError("Failed to validate OTP. Please try again.");
            //alert("Failed to validate OTP. Please try again.");
            return false;
        }
    } catch (error) {
        showError("An error occurred while validating OTP. Check console for details.");
        console.error("Error while validating OTP:", error);
        //alert("An error occurred while validating OTP. Check console for details.");
        return false;
    }
}

function openPopup(event) {
    event.preventDefault();

    // Retrieve stored profile data and fetch time
    const profileData = localStorage.getItem('profileData');
    const profileFetchTime = localStorage.getItem('profileFetchTime');

    // Define expiry time (5 minutes)
    const expiryTime = 5 * 60 * 1000; // 5 minutes in milliseconds

    // Get current time
    const currentTime = new Date().getTime();

    if (profileData && profileFetchTime) {
        const elapsedTime = currentTime - parseInt(profileFetchTime, 10);

        if (elapsedTime < expiryTime) {
            // Profile data is still valid, show profile modal
            document.getElementById('popup-overlay').style.display = 'none'; // Hide popup-overlay
            document.getElementById('profileModal').style.display = 'block'; // Show profileModal
            return;
        } else {
            // Remove expired profile data from localStorage
            localStorage.removeItem('profileData');
            localStorage.removeItem('profileFetchTime');
        }
    }

    // If profile data is expired or not available, show the popup-overlay
    document.getElementById('profileModal').style.display = 'none'; // Hide profile modal
    document.getElementById('popup-overlay').style.display = 'flex'; // Show popup-overlay
}

// Attach openPopup to the "Click" button dynamically (in case the button is loaded later)
document.addEventListener("DOMContentLoaded", function () {
    const clickButton = document.querySelector('.myclickbuttonn');
    if (clickButton) {
        clickButton.addEventListener("click", openPopup);
    }
});

function closePopup() {
    document.getElementById('popup-overlay').style.display = 'none';
    document.querySelector('.cart-popup').classList.remove('new-class');

    // Show download section when popup is closed
    // document.querySelector('.download-app-section').style.display = 'block';
}


const inpOtp = document.querySelector('.inp-otp');


function startCountdown() {
    let timeLeft = 30;
    const timerElement = document.querySelector('.otp-timer');
    const countdownInterval = setInterval(() => {
        timerElement.innerHTML = `00:${timeLeft}`;
        timeLeft--;
        if (timeLeft < 0) {
            clearInterval(countdownInterval);
            timerElement.innerHTML = '';
        }
    }, 1000);
}

async function handlePopupCAclick(event) {
    event.preventDefault();
    startCountdown();
    inpOtp.style.display = 'block';
    const phoneNumber = document.getElementById('popupPhoneNumber')?.value;

    if (!phoneNumber) {
        alert('Please enter a phone number.');
        return;
    }

    const apiUrl = `/apps/caapi/search-customer?phoneNumber=${phoneNumber}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                //  'X-Shopify-Access-Token': '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'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.customers && data.customers.length > 0) {
                console.log(data.customers);
                alert('Customer found!');
            } else {
                alert('Customer not found. Please create a new customer.');
                document.getElementById('popupCreateCustomer').style.display = 'flex';
                document.getElementById('popupEmail').value = '';
            }
        } else {
            console.error('Failed to fetch customer data:', response.status, response.statusText);
            alert('Failed to fetch customer data. Check console for details.');
        }
    } catch (error) {
        console.error('Error occurred while fetching customer data:', error);
        alert('An error occurred. Check console for details.');
    }
}



async function createPopupCustomer(event) {
    event.preventDefault();

    let email = document.getElementById('popupEmail').value.trim();
    let phoneNo = document.getElementById('popupPhoneNumber').value.trim();

    if (!email || !phoneNo) {
        showError('Please fill in all required fields.');
        return;
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        showError('Please enter a valid email address.');
        return;
    }

    let phone = phoneNo.startsWith('971') ? phoneNo : `971${phoneNo}`;
    const checkShopifyUrl = `/apps/caapi/api/shopify/customers/${phone}`;

    try {
        console.log("Checking Shopify for customer...");
        const shopifyCheckResponse = await fetch(checkShopifyUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        let shopifyCustomerExists = false;
        if (shopifyCheckResponse.ok) {
            const shopifyData = await shopifyCheckResponse.json();
            shopifyCustomerExists = shopifyData && shopifyData.customers && shopifyData.customers.length > 0;
        }

        if (!shopifyCustomerExists) {
            const shopifyApiUrl = `/apps/caapi/api/shopify/customers`;
            const shopifyPayload = { email, phone };
            console.log("Creating customer in Shopify", shopifyPayload);

            const shopifyResponse = await fetch(shopifyApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(shopifyPayload)
            });

            if (!shopifyResponse.ok) {
                const shopifyErrorData = await shopifyResponse.json();
                console.error('Failed to create customer in Shopify:', shopifyErrorData);
                showError(`Failed to create customer in Shopify. Error: ${JSON.stringify(shopifyErrorData.errors)}`);
                return;
            }
            console.log('Customer created successfully in Shopify.');
        }

        const caApiUrl = 'https://ca.stevemadden.sa/api/epsilon/profiles';
        const caPayload = {
            Emails: [{ EmailAddress: email }],
            Phones: [{ PhoneNumber: phone, PhoneCountryCode: "AE" }],
            SourceCode: "APP",
            EnrollChannelCode: "APP",
            JsonExternalData: { IsPhoneVerified: "true", IsEmailVerified: "true" }
        };

        console.log("Creating customer in CA API", caPayload);
        const caResponse = await fetch(caApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(caPayload)
        });

        if (!caResponse.ok) {
            const caErrorData = await caResponse.json();
            console.error('Failed to create customer in CA API:', caErrorData);
            showError(`Failed to create customer in CA API. Error: ${JSON.stringify(caErrorData.errors)}`);
            return;
        }
        console.log('Customer created successfully in CA API.');

        await fetchAndShowProfile(phoneNo);
        await closePopup();

    } catch (error) {
        console.error('Error occurred:', error);
        showError('An error occurred. Check console for details.');
    }
}



// Function to fetch profile data from CA API and update modal
async function fetchAndShowProfile(phoneNumber) {
    try {
        const getProfileApiUrl = "https://ca.stevemadden.sa/api/epsilon/profiles/getProfileByPhone";
        const profileRequestBody = { PhoneNumber: `971${phoneNumber}` };

        const profileResponse = await fetch(getProfileApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profileRequestBody)
        });

        if (!profileResponse.ok) {
            console.error("Failed to fetch profile data from CA API");
            return;
        }

        const profileData = await profileResponse.json();
        console.log("Club Apparel Profile Data:", profileData);

        localStorage.setItem('profileData', JSON.stringify(profileData));
        localStorage.setItem('profileFetchTime', new Date().getTime());


        let storedData = localStorage.getItem("profileData");
        console.log("storedData ", storedData)

        let contactPhoneNumber = "";
        let loggedInProfileId = "";
        let rankLogoUrl = "";
        let profilePercentage = "";
        try {
            let profileData = storedData ? JSON.parse(storedData) : null;
            contactPhoneNumber = profileData?.Phones?.[0]?.PhoneNumber || "";
            profilePercentage = profileData?.JsonExternalData?.Profile_Percentage;
            loggedInProfileId = profileData?.ProfileId;
            console.log(contactPhoneNumber)
            const tierCode = profileData?.TierCode;
            if (tierCode === "BLACK") {
                rankLogoUrl = "https://cdn.shopify.com/s/files/1/0651/5815/2438/files/Group_985_1.png?v=1742890482";
            } else if (tierCode === "GOLD") {
                rankLogoUrl = "https://cdn.shopify.com/s/files/1/0651/5815/2438/files/Group_985_2.png?v=1742890482";
            } else if (tierCode === "SILVER") {
                rankLogoUrl = "https://cdn.shopify.com/s/files/1/0651/5815/2438/files/Group_985.png?v=1742890482";
            }

            // Update the rank logo image dynamically
            const rankLogoImg = document.querySelector(".rank-logo");
            if (rankLogoImg && rankLogoUrl) {
                rankLogoImg.src = rankLogoUrl;
            }
        } catch (error) {
            console.error("Invalid JSON in localStorage:", error);
        }

        // First, get existing cart attributes
        fetch('/cart.js')
            .then(response => response.json())
            .then(cart => {
                let attributes = cart.attributes || {}; // Get existing attributes

                // Remove the existing phone number if it exists
                if (attributes["Phone"]) {
                    delete attributes["Phone"];
                }
                if (attributes["ProfileId"]) {
                    delete attributes["ProfileId"];
                }

                // Add the new phone number if available
                if (contactPhoneNumber) {
                    attributes["Phone"] = contactPhoneNumber;
                }

                if (loggedInProfileId) {
                    attributes["ProfileId"] = loggedInProfileId;
                }
                // Update the cart with the new attributes
                return fetch('/cart/update.js', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ attributes })
                });
            })
            .then(response => response.json())
            .then(data => console.log("Cart updated:", data))
            .catch(error => console.error("Error updating cart:", error));




        const pointBalance = profileData.JsonExternalData?.PointBalance || [];
        const pointAmount = pointBalance.length > 0 ? pointBalance[0].PointAmount : "N/A";

        document.getElementById('modalPhoneNumber').textContent = phoneNumber;
        document.getElementById('modalPointBalance').textContent = pointAmount;

        /*const rangeSlider = document.getElementById('rangeSlider');
        rangeSlider.max = pointAmount !== "N/A" ? pointAmount : 0;
        rangeSlider.value = 0;
        document.getElementById('tooltip').textContent = rangeSlider.value;
  */
        fetch('/cart.js')
            .then(response => response.json())
            .then(cart => {
                const subtotal = Math.round(cart.items_subtotal_price / 100); // Round subtotal
                const pointAmount = parseFloat(document.getElementById("modalPointBalance").textContent) || 0;

                // Determine the smaller value
                const maxValue = Math.min(subtotal, pointAmount);

                // Update range slider max value, reset value, and update tooltip
                const rangeSlider = document.getElementById("rangeSlider");
                const tooltip = document.getElementById("tooltip");

                if (rangeSlider) {
                    rangeSlider.max = maxValue;
                    rangeSlider.value = 0; // Reset to 0
                    if (tooltip) {
                        tooltip.textContent = rangeSlider.value;
                    }
                }

                console.log(`Updated range slider max: ${maxValue}`);
            })
            .catch(error => console.error('Error fetching cart:', error));


        const profileModalBtn = document.querySelector(".profile-modal-dis-btn");
        // Disable apply discount button if point amount is 0 or N/A
        if (pointAmount === "N/A" || pointAmount === 0 || profilePercentage < 100) {
            document.getElementById('applyDiscountBtn').disabled = true;
            profileModalBtn.classList.add("profile-disabled-button");
            document.querySelector('.range-container').style.pointerEvents = 'none';
            if (profilePercentage < 100) {
                // document.querySelector(".incomplete-profile-messege").innerHTML += "Download the App and update your profile to redeem your points!";
                const messageContainer = document.querySelector(".incomplete-profile-messege");
                const newMessage = "Download the App and update your profile to redeem your points!";

                // Remove existing message if present
                if (messageContainer.innerHTML.includes(newMessage)) {
                    messageContainer.innerHTML = messageContainer.innerHTML.replace(newMessage, "").trim();
                }

                // Append new message
                messageContainer.innerHTML += ` ${newMessage}`;
            }
        } else {
            document.getElementById('applyDiscountBtn').disabled = false;
            profileModalBtn.classList.remove("profile-disabled-button");
            document.querySelector('.range-container').style.pointerEvents = 'auto';
        }

        document.getElementById('profileModal').style.display = 'block';

    } catch (error) {
        console.error('Error fetching profile data:', error);
    }
}


async function handleCAclick(event) {
    event.preventDefault();

    const phoneNumber = document.getElementById('phoneNumber')?.value;

    if (!phoneNumber) {
        alert('Please enter a phone number.');
        return;
    }

    const apiUrl = `/apps/caapi/search-customer?phoneNumber=${phoneNumber}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                //  'X-Shopify-Access-Token': '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'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.customers && data.customers.length > 0) {
                console.log(data.customers);
                alert('Customer found!');
            } else {
                alert('Customer not found. Please create a new customer.');
                document.getElementById('createCustomerPopup').style.display = 'flex';
                document.getElementById('email').value = '';
            }
        } else {
            console.error('Failed to fetch customer data:', response.status, response.statusText);
            alert('Failed to fetch customer data. Check console for details.');
        }
    } catch (error) {
        console.error('Error occurred while fetching customer data:', error);
        alert('An error occurred. Check console for details.');
    }
}

async function createCustomer(event) {
    event.preventDefault();

    const email = document.getElementById('email').value;
    let phone = document.getElementById('phoneNumber').value;

    if (!email || !phone) {
        alert('Please fill in all required fields.');
        return;
    }

    // Add '+971' prefix if not already present
    if (!phone.startsWith('+971')) {
        phone = `+971${phone}`;
    }

    const apiUrl = '/apps/caapi/create-customer';
    const payload = {
        customer: {
            email: email,
            phone: phone
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                //   'X-Shopify-Access-Token': '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'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();
            alert('Customer created successfully!');
            console.log('New customer:', data);
            document.getElementById('createCustomerPopup').style.display = 'none';
        } else {
            console.error('Failed to create customer:', response.status, response.statusText);
            alert('Failed to create customer. Check console for details.');
        }
    } catch (error) {
        console.error('Error occurred while creating customer:', error);
        alert('An error occurred. Check console for details.');
    }
}

