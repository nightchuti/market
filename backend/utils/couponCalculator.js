// 📄 สร้างไฟล์ utils/couponCalculator.js
const calculateDiscount = (coupon, subTotal) => {
  let discount = 0;

  if (coupon.discountType === 'PERCENT') {
    discount = (subTotal * coupon.discountValue) / 100;
    // เช็คเพดานส่วนลดสูงสุด
    if (coupon.maxDiscountAmount > 0 && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
  } else {
    // ลดเป็นบาท
    discount = coupon.discountValue;
  }

  // ส่วนลดต้องไม่เกินราคาสินค้า
  if (discount > subTotal) discount = subTotal;

  return {
    discount: Math.floor(discount), // ปัดเศษทิ้งป้องกันเลขทศนิยมเน่า
    finalPrice: subTotal - Math.floor(discount)
  };
};

module.exports = { calculateDiscount };