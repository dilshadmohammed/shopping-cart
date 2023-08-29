var express = require('express');
var router = express.Router();
const productHelpers = require('../helpers/product-helpers');
const userHelpers = require('../helpers/user-helpers');
const { use, response } = require('../app');
const { ObjectId } = require('mongodb');
const session = require('express-session');
const { route } = require('./admin');

const verifyLogin = (req, res, next) => {
  if (req.session.loggedIn)
    next();
  else{
      if(req.xhr){
        res.json({redirectTo:'/login'});
      }
      else
      {
        res.redirect('/login');
      }
  }
    
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
  let total=await userHelpers.getTotalAmount(req.session.user._id);
  let isEmpty=1;
  if(products.length > 0)
    isEmpty=0;
  console.log(isEmpty)
   res.render('user/cart',{products,user:req.session.user,id:req.session.user._id,total,isEmpty});
})

router.get('/add-to-cart',verifyLogin,(req,res)=>{
  userHelpers.addToCart(req.query.id,req.session.user._id).then((response)=>{
    response.status=true;
    res.json(response)
  })
})

router.post('/change-product-quantity',(req,res,next)=>{
  userHelpers.changeProductQuantity(req.body).then(async(response)=>{
    response.total=await userHelpers.getTotalAmount(req.body.user);
    res.json(response);
  })
})
router.post('/remove-product',(req,res)=>{
  userHelpers.removeProduct(req.body).then((response)=>{
    res.json({status:true})
  })
})

router.get('/place-order',verifyLogin,async(req,res)=>{
  let total=await userHelpers.getTotalAmount(req.session.user._id);
  res.render('user/place-order',{total,user:req.session.user})
})

router.post('/place-order',async(req,res)=>{
  let products=await userHelpers.getCartProductList(req.body.userId)
  let totalPrice=await userHelpers.getTotalAmount(req.body.userId)
  if(products){
    userHelpers.placeOrder(req.body,products,totalPrice).then((orderId)=>{
      if(req.body['payment-method']==='COD')
      res.json({codSuccess:true})
      else if(req.body['payment-method']==='ONLINE'){
        userHelpers.generateRazorpay(orderId,totalPrice).then((response)=>{
          res.json(response);
        })
      }
      else{
        res.json({status:false})
      }
  })
  }
  else{
    res.json({status:false})
  }
})

router.get('/order-placed',verifyLogin,async(req,res)=>{
  res.render('user/order-placed')
})

router.get('/orders',verifyLogin,async(req,res)=>{
  let orderList=await userHelpers.getOrderList(req.session.user._id)
  res.render('user/orders',{orderList});
})

router.get('/view-order-details/:orderId',verifyLogin,async(req,res)=>{
  let orderDetails = await userHelpers.getOrderDetails(req.params.orderId)
  console.log(orderDetails)
  res.render('user/view-order',orderDetails)
})

router.post('/verify-payment',verifyLogin,(req,res)=>{
  userHelpers.verifyPayment(req.body).then(()=>{
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
      console.log('updated')
      res.json({status:true})
    })
    }).catch(()=>{
      console.log('something error')
      res.json({status:false})
  })
})
module.exports = router;
