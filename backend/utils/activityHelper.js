const Activity = require("../models/Activity");

/**
 * บันทึกกิจกรรม
 * @param {object} params
 * @param {string} params.type     - "ORDER" | "PAYMENT" | "USER" | "COUPON" | "ADS" | "REPORT"
 * @param {string} params.action   - เช่น "CREATE_ORDER", "CONFIRM_PAYMENT"
 * @param {string} params.description - ข้อความอธิบาย
 * @param {string} params.userId   - ObjectId ของ user (optional)
 * @param {string} params.relatedId    - ObjectId ของ document ที่เกี่ยวข้อง (optional)
 * @param {string} params.relatedModel - ชื่อ model เช่น "Order" (optional)
 * @param {object} params.meta     - ข้อมูลเพิ่มเติม (optional)
 */
const logActivity = async ({ type, action, description, userId = null, relatedId = null, relatedModel = null, meta = {} }) => {
  try {
    await Activity.create({ type, action, description, user: userId, relatedId, relatedModel, meta });
  } catch (err) {
    // ไม่ให้ error ของ activity log ไปทำให้ request หลักพัง
    console.error("Activity log error:", err.message);
  }
};

module.exports = { logActivity };