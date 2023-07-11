
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
        }
    })
}

function changeQuantity(cartId,proId,count){
    let quantity=parseInt(document.getElementById(proId).innerHTML);
    count=parseInt(count);
    $.ajax({
        url:'/change-product-quantity',
        data:{
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