const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const helmet = require("helmet");
const xss = require("xss-clean");

exports.securityMiddleware = (app) => {
  app.use(helmet());
  app.use(mongoSanitize());
  app.use(xss());

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 200,
      message: "Too many requests"
    })
  );
};