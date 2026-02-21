const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const createStorage = (folder) =>
  new CloudinaryStorage({
    cloudinary,
    params: {
      folder,
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
    },
  });

const uploadProduct = multer({ storage: createStorage("products") });
const uploadSlip = multer({ storage: createStorage("payment-slips") });

module.exports = {
  uploadProduct,
  uploadSlip,
};