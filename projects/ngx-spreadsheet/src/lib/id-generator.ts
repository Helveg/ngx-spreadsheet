const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const LENGTH = CHARS.length;

export const generateId = (): string =>
  new Array(8)
    .fill(null)
    .map(() => CHARS.charAt(Math.floor(Math.random() * LENGTH)))
    .join('');
