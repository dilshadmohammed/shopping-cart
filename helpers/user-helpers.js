var db = require('../config/connection');
var collection = require('../config/collections');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const { response, routes } = require('../app');
const { resolve, reject } = require('promise');
const Razorpay = require('razorpay');

var instance = new Razorpay({
  key_id: 'rzp_test_K5vq8VRFryU3Xl',
  key_secret: 'PAMzehTnhAfnFpw94S6c9oja',
});

module.exports = {

    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.Password = await bcrypt.hash(userData.Password, 10);
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data) => {
                resolve(data);
            })
        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false;
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ Email: userData.Email });
            if (user) {
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if (status) {
                        response.user = user;
                        response.status = true;
                        resolve(response);
                    }
                    else {
                        resolve({ status: false });
                    }
                })
            }
            else {
                resolve({ status: false });
            }
        })
    },
    addToCart: (proId, userId) => {
        let proObj={
             item: new ObjectId(proId),
             quantity: 1
        }
        let isNewProduct=false;
        return new Promise(async (resolve, reject) => {
            
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) });
            if (userCart) {
                let proExist=userCart.products.findIndex(product=> product.item==proId)
                if(proExist!=-1){
                    db.get().collection(collection.CART_COLLECTION).updateOne({user: new ObjectId(userId),'products.item': new ObjectId(proId)},
                    {
                        $inc:{'products.$.quantity':1}
                    }
                    ).then(()=>{
                        resolve({isNewProduct});
                    })
                }
                else
                {db.get().collection(collection.CART_COLLECTION).updateOne({ user: new ObjectId(userId) },
                    {
                        $push: { products: proObj}
                    }
                ).then(() => {
                    resolve({isNewProduct:true});
                })}
            }
            else {
                let cartObj = {
                    user: new ObjectId(userId),
                    products: [proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then(() => {
                    resolve({isNewProduct:true});
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async (resolve, reject) => {
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: new ObjectId(userId) }
                },{
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
            ]).toArray()
            resolve(cartItems)
        })
    },
    getCartCount: (userId) => {
        return new Promise(async (resolve, reject) => {
            let count = 0
            let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: new ObjectId(userId) })
            if (cart) {
                count = cart.products.length;
            }
            resolve(count)
        })
    },
    changeProductQuantity: (details)=>{
        details.quantity=parseInt(details.quantity);
        details.count=parseInt(details.count);
        return new Promise((resolve,reject)=>{
            if(details.count==-1 && details.quantity==1){
                db.get().collection(collection.CART_COLLECTION).updateOne({_id:new ObjectId(details.cart)},
                {
                    $pull:{products:{item:new ObjectId(details.product)}}
                }).then(()=>{
                    resolve({removeProduct:true})
                })
            }
            else{
                db.get().collection(collection.CART_COLLECTION).updateOne({_id: new ObjectId(details.cart),'products.item': new ObjectId(details.product)},
                    {
                        $inc:{'products.$.quantity':details.count}
                    }
                    ).then(()=>{
                        resolve({status:true})
                    })}
        })
    },
    removeProduct:(details)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.CART_COLLECTION).updateOne({_id:new ObjectId(details.cart)},
            {
                $pull:{products:{item:new ObjectId(details.product)}}
            }).then(()=>{
                resolve()
            })
        })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async (resolve, reject) => {
            let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: new ObjectId(userId) }
                },{
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                },
                {
                    $group:{
                        _id:null,
                        total:{$sum:{$multiply:['$quantity','$product.Price']}}
                    }
                }
            ]).toArray()
            if(total[0] == undefined)
                total=0;
            else
                total=total[0].total;
            resolve(total)
        })
    },
    placeOrder:(order,products,total)=>{
        return new Promise((resolve,reject)=>{
            let status=order['payment-method']==='COD'?'placed':'pending';
            let orderObj={
                deliveryDetails:{
                    mobile:order.mobile,
                    address:order.address,
                    pincode:order.pincode
                },
                userId:new ObjectId(order.userId),
                paymentMethod:order['payment-method'],
                products:products,
                totalAmount:total,
                date:new Date(),
                status:status
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collection.CART_COLLECTION).deleteOne({user: new ObjectId(order.userId)})
                resolve(response.insertedId)
            })
        })
    },
    getCartProductList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:new ObjectId(userId)})
            if(cart)
            resolve(cart.products)
            else
            resolve(false)
        })
    },
    getOrderList:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderList= await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{userId:new ObjectId(userId)}
                },
                {
                    $project:{_id:1,totalAmount:1,date:1,status:1}
                }
            ]).toArray()
            resolve(orderList)
        })
    },
    getOrderDetails:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderDetails= await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                  $match: {
                    "_id":new ObjectId(orderId) // Replace with the desired order ID
                  }
                },
                {
                  $lookup: {
                    from: collection.PRODUCT_COLLECTION, // Name of the "products" collection
                    localField: "products.item",
                    foreignField: "_id",
                    as: "productDetails"
                  }
                },
                {
                    $addFields: {
                      "productDetails": {
                        $map: {
                          input: "$productDetails",
                          as: "prodDetail",
                          in: {
                            _id: "$$prodDetail._id",
                            Name: "$$prodDetail.Name",
                            Price: "$$prodDetail.Price",
                            fileExtension: "$$prodDetail.fileExtension",
                            quantity: {
                              $let: {
                                vars: {
                                  matchingProduct: {
                                    $filter: {
                                      input: "$products",
                                      as: "product",
                                      cond: { $eq: ["$$product.item", "$$prodDetail._id"] }
                                    }
                                  }
                                },
                                in: { $arrayElemAt: ["$$matchingProduct.quantity", 0] }
                              }
                            }
                          }
                        }
                      }
                    }
                  },
                {
                  $project: {
                    _id: 1,
                    date: 1,
                    totalAmount: 1,
                    paymentMethod: 1,
                    deliveryDetails: 1,
                    status:1,
                    productDetails: {
                      _id: 1,
                      Name: 1,
                      Price: 1,
                      fileExtension: 1,
                      quantity:1
                    }
                  }
                }
              ]).next()
            resolve(orderDetails)
        })
    },
    generateRazorpay:(orderId,totalAmount)=>{
        return new Promise((resolve,reject)=>{
            var options = {
                amount: totalAmount*100,  // amount in the smallest currency unit
                currency: "INR",
                receipt: ""+orderId
              };
              instance.orders.create(options, function(err, order) {
                resolve(order)
              });
        })
    },
    verifyPayment:(details)=>{
        return new Promise((resolve, reject) => {
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'PAMzehTnhAfnFpw94S6c9oja');
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']);
            hmac = hmac.digest('hex');
            if (hmac == details['payment[razorpay_signature]']) {
                resolve();
            } else {
                reject();
            }
        });
        
    },
    changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:new ObjectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }).then(()=>{
                resolve()
            })
        })
    }
}


