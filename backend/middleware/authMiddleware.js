// const jwt = require("jsonwebtoken");

// const protect = (req, res, next) => {
//   let token;

//   if (
//     req.headers.authorization &&
//     req.headers.authorization.startsWith("Bearer")
//   ) {
//     try {
//       token = req.headers.authorization.split(" ")[1];

//       const decoded = jwt.verify(token, process.env.JWT_SECRET);

//       req.user = decoded; // เก็บ id user ไว้ใน req
//       next();
//     } catch (error) {
//       return res.status(401).json({ message: "Token invalid" });
//     }
//   }

//   if (!token) {
//     return res.status(401).json({ message: "No token, authorization denied" });
//   }
// };

// module.exports = protect;

const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {

  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    next();

  } catch (err) {
    res.status(401).json({ message: "Token invalid" });
  }
};
