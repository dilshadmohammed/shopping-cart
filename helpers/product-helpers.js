var db = require('../config/connection');
var collection = require('../config/collections');
const { resolve } = require('promise');

module.exports = {

    addProduct: (product, fileExtension, callback) => {
        product.fileExtension=fileExtension;
        db.get().collection(collection.PRODUCT_COLLECTION).insertOne(product).then((data) => {
            const imageName = data.insertedId+"."+product.fileExtension;
            callback(imageName);
        })
    },
    getAllProducts: ()=>{
        return new Promise(async(resolve,reject)=>{
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray();
            resolve(products);
        })
    }


}