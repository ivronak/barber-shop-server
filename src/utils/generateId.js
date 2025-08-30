// Utility functions to generate short, meaningful IDs for invoices and appointments
// Format examples:
//   INV-AB12CD34
//   APT-EF56GH78
// The IDs are composed of an 8-character random alphanumeric string prefixed with
// an identifier so they remain easy to recognise while still unique enough for
// everyday usage within the system.

function randomAlphaNumeric(length = 8) {
  // Generate a random base-36 string, strip the leading "0.", take the desired
  // number of characters and convert to upper-case for readability.
  return Math.random().toString(36).substr(2, length).toUpperCase();
}

function generateInvoiceId() {
  return `INV-${randomAlphaNumeric(8)}`;
}

function generateAppointmentId() {
  return `APT-${randomAlphaNumeric(8)}`;
}

module.exports = {
  generateInvoiceId,
  generateAppointmentId,
};
