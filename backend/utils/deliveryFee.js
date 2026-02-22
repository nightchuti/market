// utils/deliveryFee.js
module.exports = function calculateDeliveryFee(distanceKm) {
  const baseFee = 25;       // ค่าขั้นต่ำ
  const perKm = 7;          // ต่อกิโลเมตร
  const freeKm = 2;         // ฟรี 2 กม.

  if (distanceKm <= freeKm) return baseFee;

  return Math.round(baseFee + (distanceKm - freeKm) * perKm);
};