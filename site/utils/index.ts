export function createLocalStorage<T = any>(key: string) {
  return {
    get() {
      return localStorage.getItem(key);
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

export function random(min = 0, max = 1) {
  return Math.random() * (max - min + 1) + min;
}

export function randomInt(min = 0, max = 1) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
