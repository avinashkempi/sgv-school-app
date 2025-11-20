import { showLoading, hideLoading } from './loadingService';

// Simple wrapper around fetch that toggles the global loading indicator.
// Usage: import apiFetch from '../_utils/apiFetch';
export default function apiFetch(input, init) {
  showLoading();
  // Return the promise from fetch (no async keyword on the exported function)
  return fetch(input, init)
    .then((res) => res)
    .finally(() => {
      hideLoading();
    });
}
