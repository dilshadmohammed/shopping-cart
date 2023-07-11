var db = require('../config/connection');
var collection = require('../config/collections');
const bcrypt = require('bcrypt');
const { ObjectId } = require('mongodb');
const { response, routes } = require('../app');
const { resolve, reject } = require('promise');

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
                        resolve(true)
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
    }

}

