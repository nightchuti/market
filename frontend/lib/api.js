const API = process.env.NEXT_PUBLIC_API_URL;

export const fetcher = (path, options = {}) => {
  return fetch(`${API}${path}`, options);
};