export function createLocalStorage<T = any>(key: string) {
  return {
    get() {
      return localStorage.getItem(key)
    },
    set(data: string) {
      return localStorage.setItem(key, data);
    },
    getJSON() {
      return JSON.parse(localStorage.getItem(key) || "null");
    },
    setJSON(data: T) {
      localStorage.setItem(key, JSON.stringify(data));
    },
  };
}
