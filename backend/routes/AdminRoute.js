const adminOnly = (req, res, next) => {
  if (
    req.user.email !== "admin@gmail.com" ||
    req.user.role !== "admin"
  ) {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
};