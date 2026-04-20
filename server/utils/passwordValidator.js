export const validatePassword = (password) => {
  const regex =
    /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%&*()\-+=^])[A-Za-z0-9!@#$%&*()\-+=^]{8,15}$/;

  return regex.test(password);
};