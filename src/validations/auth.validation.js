const validateAuthPayload = ({ name, email, password }, isRegister = false) => {
  const errors = [];

  if (isRegister && !name) errors.push('Name is required');
  if (!email) errors.push('Email is required');
  if (!password) errors.push('Password is required');

  return errors;
};

module.exports = {
  validateAuthPayload,
};
