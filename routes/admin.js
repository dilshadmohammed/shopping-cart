var express = require('express');
var router = express.Router();
const productHelper = require('../helpers/product-helpers');


/* GET users listing. */
router.get('/', function (req, res, next) {
  productHelper.getAllProducts().then((products)=>{
    res.render('admin/view-products', { admin: true, products });
  })
  
});

router.get('/add-product', (req, res) => {
  res.render('admin/add-product', { admin: true});
});

router.post('/add-product', (req, res) => {
  let image = req.files.Image;
  const parts = image.mimetype.split('/');
  const fileExtension = parts[1];


  productHelper.addProduct(req.body, fileExtension, (imageName) => {
    
    image.mv('./public/product-images/' + imageName, (err) => {
      if (!err) {
        res.render('admin/add-product', { admin: true});
      }
      else {
        console.log(err);
      }
    })

  });
});

module.exports = router;
