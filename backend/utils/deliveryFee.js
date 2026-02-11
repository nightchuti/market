function calculateDeliveryFee(service, distance) {

  if (service === "GRAB") {
    return Math.round(25 + distance * 7);
  }

  if (service === "LINEMAN") {
    return Math.round(20 + distance * 6);
  }

  return 0;
}

module.exports = calculateDeliveryFee;
