let count = 0;
const listeners = new Set();

export const showLoading = () => {
  count += 1;
  listeners.forEach((fn) => fn(count));
};

export const hideLoading = () => {
  count = Math.max(0, count - 1);
  listeners.forEach((fn) => fn(count));
};

export const subscribeLoading = (fn) => {
  listeners.add(fn);
  // notify initial state
  fn(count);
  return () => listeners.delete(fn);
};

export const getLoadingCount = () => count;
