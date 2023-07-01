var express = require('express');
var router = express.Router();
const productHelper = require('../helpers/product-helpers');

/* GET home page. */
router.get('/', function (req, res, next) {
  productHelper.getAllProducts().then((products)=>{
    res.render('user/view-products', { admin: false, products });
  })
});



router.post('/submit', function (req, res) {
  console.log(req.body);
  performDatabaseOperation(req.body);
  res.send('Got it');
});

module.exports = router;
