var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
const { use, response } = require('../app');

const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn)
    next();
  else
    res.redirect('/login');
}


/* GET home page. */
router.get('/', async function (req, res, next) {
  let user=req.session.user;
  let cartCount=null;
  if(req.session.user){
  cartCount=await userHelpers.getCartCount(req.session.user._id);
  }
  productHelpers.getAllProducts().then((products)=>{
    res.render('user/view-products', { admin: false, products, user, cartCount});
  })
});

router.get('/login', (req,res)=>{
  if(req.session.loggedIn){
    res.redirect('/');
  }
  else{
    res.render('user/login',{'loginErr':req.session.loginErr});
    req.session.loginErr=false;
  }
});
router.get('/signup', (req,res)=>{
  res.render('user/signup');
});
router.post('/signup',(req,res)=>{
  userHelpers.doSignup(req.body).then((response)=>{
    console.log(response);
    req.session.loggedIn=true;
    req.session.user=req.body;
    res.redirect('/');
  })
});
router.post('/login',(req,res)=>{
  userHelpers.doLogin(req.body).then((response)=>{
    if(response.status){
      req.session.loggedIn=true;
      req.session.user=response.user;
      res.redirect('/');
    }
    else{
      req.session.loginErr=" Invalid username or password.";
      res.redirect('/login');
    }
  });
});

router.get('/logout',(req,res)=>{
  req.session.destroy();
  res.redirect('/');
});

router.get('/cart',verifyLogin,async(req,res)=>{
  let products =await userHelpers.getCartProducts(req.session.user._id);

   res.render('user/cart',{products,user:req.session.user});
})

router.get('/add-to-cart',(req,res)=>{
  userHelpers.addToCart(req.query.id,req.session.user._id).then((response)=>{
    response.status=true;
    res.json(response)
  })
})

router.post('/change-product-quantity',(req,res,next)=>{
  userHelpers.changeProductQuantity(req.body).then((response)=>{
    res.json(response);
  })
})
router.post('/remove-product',(req,res)=>{
  userHelpers.removeProduct(req.body).then((response)=>{
    res.json({status:true})
  })
})
module.exports = router;
