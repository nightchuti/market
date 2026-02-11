const express = require("express");
const router = express.Router();

const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Address = require("../models/Address");
const Shop = require("../models/shop");
const Coupon = require("../models/Coupon");

const protect = require("../middleware/authMiddleware");
const calculateDistance = require("../utils/distance");
const calculateDeliveryFee = require("../utils/deliveryFee");

router.post("/checkout", protect, async (req, res) => {
  try {

    const {
      addressId,
      paymentMethod,
      deliveryService,
      couponCode
    } = req.body;

    const address = await Address.findById(addressId);
    if (!address)
      return res.status(400).json({ message: "Address not found" });

    const shop = await Shop.findOne();
    if (!shop)
      return res.status(400).json({ message: "Shop not configured" });

    const cart = await Cart.findOne({ user: req.user.id })
      .populate("items.product");

    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: "Cart empty" });

    const distance = calculateDistance(
      shop.lat,
      shop.lng,
      address.lat,
      address.lng
    );

    let deliveryFee = calculateDeliveryFee(
      deliveryService,
      distance
    );

    let subTotal = 0;
    const orderItems = [];

    for (const item of cart.items) {
      if (!item.selected) continue;
      if (!item.product) continue;

      subTotal += item.product.price * item.quantity;

      orderItems.push({
        product: item.product._id,
        quantity: item.quantity,
        price: item.product.price
      });
    }

    if (orderItems.length === 0)
      return res.status(400).json({ message: "No selected items" });

    // ================= COUPON =================
    let discount = 0;
    let coupon = null;

    if (couponCode) {

      coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        isActive: true
      });

      if (!coupon)
        return res.status(400).json({ message: "Invalid coupon" });

      const now = new Date();
      if (now < coupon.startDate || now > coupon.endDate)
        return res.status(400).json({ message: "Coupon expired or not started" });

      if (coupon.usedBy.includes(req.user.id))
        return res.status(400).json({ message: "Coupon already used" });

      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
        return res.status(400).json({ message: "Coupon usage limit reached" });

      if (subTotal < coupon.minPurchase)
        return res.status(400).json({
          message: `Minimum purchase is ${coupon.minPurchase} baht`
        });

      if (coupon.discountType === "percent") {
        discount = (subTotal * coupon.discountValue) / 100;

        if (coupon.maxDiscount && discount > coupon.maxDiscount)
          discount = coupon.maxDiscount;

      } else if (coupon.discountType === "fixed") {
        discount = coupon.discountValue;
      }
    }

    const totalPrice = subTotal - discount + deliveryFee;

    const order = await Order.create({
      user: req.user.id,
      items: orderItems,

      shippingAddress: {
        dormName: address.dormName,
        room: address.room,
        note: address.note,
        lat: address.lat,
        lng: address.lng
      },

      paymentMethod,
      deliveryService,
      distance,
      deliveryFee,

      subTotal,
      discount,
      totalPrice,

      couponCode: coupon ? coupon.code : null
    });

    if (coupon) {
      coupon.usedBy.push(req.user.id);
      coupon.usedCount += 1;
      await coupon.save();
    }

    cart.items = cart.items.filter(i => !i.selected);
    await cart.save();

    res.status(201).json({
      message: "Order placed successfully",
      order
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;