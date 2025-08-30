/**
 * Validates that required fields are present in the request body
 * 
 * @param {Object} body - The request body to validate
 * @param {Array<string>} requiredFields - List of required field names
 * @returns {Array<string>} Array of error messages for missing fields (empty if valid)
 */
const validateRequestBody = (body, requiredFields = []) => {
  const errors = [];

  // Check that each required field is present and not empty
  for (const field of requiredFields) {
    if (!body[field] && body[field] !== 0) {
      errors.push(`Field '${field}' is required`);
    }
  }

  return errors;
};

module.exports = {
  validateRequestBody,
}; 