// utils/logActivity.js
const Activity = require("../models/Activity");

/**
 * บันทึก Activity ลง Database
 * @param {Object} params
 * @param {string} params.type        - "ORDER" | "PAYMENT" | "USER" | "COUPON" | "ADS" | "REPORT"
 * @param {string} params.action      - ชื่อ action สั้น ๆ เช่น "ADMIN_CONFIRM_PAYMENT"
 * @param {string} params.description - คำอธิบายภาษาไทย
 * @param {string} [params.userId]    - ObjectId ของ admin ที่กระทำ
 * @param {string} [params.relatedId] - ObjectId ของ document ที่เกี่ยวข้อง
 * @param {string} [params.relatedModel] - ชื่อ Model เช่น "Order", "Coupon"
 * @param {Object} [params.meta]      - ข้อมูลเพิ่มเติม
 */
const logActivity = async ({ type, action, description, userId = null, relatedId = null, relatedModel = null, meta = {} }) => {
  try {
    await Activity.create({ type, action, description, user: userId, relatedId, relatedModel, meta });
  } catch (err) {
    // ไม่ให้ log error กระทบ main flow
    console.error("[logActivity] Failed to log:", err.message);
  }
};

module.exports = logActivity;