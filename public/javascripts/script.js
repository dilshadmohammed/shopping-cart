const { response } = require("../../app");

function addToCart(proId){
    $.ajax({
        url:'/add-to-cart?id='+proId,
        method:'get',
        success:(response)=>{
            if(response.status && response.isNewProduct){
                let count=$('#cart-count').html();
                count=parseInt(count)+1;
                $('#cart-count').html(count);

            }
            else if(response.redirectTo){
                window.location.href = response.redirectTo;
            }
        }
    })
}

function changeQuantity(cartId,proId,userId,count){
    let quantity=parseInt(document.getElementById(proId).innerHTML);
    count=parseInt(count);
    $.ajax({
        url:'/change-product-quantity',
        data:{
            user:userId,
            cart:cartId,
            product:proId,
            count:count,
            quantity:quantity
        },
        method:'post',
        success:(response)=>{
            if(response.removeProduct){
                alert("Product removed from cart");
                location.reload();
            }
            else{
                document.getElementById(proId).innerHTML=quantity+count;
                document.getElementById('total').innerHTML=response.total;
            }
        }
    })
}

function removeProduct(cartId, proId) {
    $.ajax({
        url: '/remove-product',
        data: {
            cart: cartId,
            product: proId,
        },
        method: 'post',
        success: (response) => {
            if (response.status) {
                alert("Product removed from cart");
                location.reload();
            }
        }
    })
}

function sendOrder() {
    $.ajax({
        url: '/place-order',
        method: 'post',
        data: $('#checkout-form').serialize(),
        success: function(response) {
            if(response.codSuccess)
                window.location.href='/order-placed'
            else if(response.status)
                razorpayPayment(response);
            else
            alert('Cart is empty')
        }
    });
}
function placeOrder(isEmpty) {
    
  if(isEmpty){
    alert('Cart is empty')
  }
  else{
    window.location.href='/place-order'
  }
}

function razorpayPayment(order){
    var options = {
        "key": "rzp_test_K5vq8VRFryU3Xl", // Enter the Key ID generated from the Dashboard
        "amount": order.amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
        "currency": "INR",
        "name": "Acme Corp",
        "description": "Test Transaction",
        "image": "https://example.com/your_logo",
        "order_id": order.id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
        "handler": function (response){

            verifyPayment(response,order);
        },
        "prefill": {
            "name": "Gaurav Kumar",
            "email": "gaurav.kumar@example.com",
            "contact": "9000090000"
        },
        "notes": {
            "address": "Razorpay Corporate Office"
        },
        "theme": {
            "color": "#3399cc"
        }
    };
    var rzp1 = new Razorpay(options);
    rzp1.open();
}

function verifyPayment(payment,order){
    $.ajax({
        url:'/verify-payment',
        method:'post',
        data:{
            payment,order
        },
        success:(response)=>{
            console.log("reached back")
            if(response.status)
                window.location.href = '/order-placed'
            else
                alert('payment failed')
        }
    })
}
