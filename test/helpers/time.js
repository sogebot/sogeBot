export const waitMs = async (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
