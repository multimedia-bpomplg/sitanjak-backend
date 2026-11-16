import { randomInt } from "crypto";

export const isStrongPassword = (password: string) => {
  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
};

export const generateStrongPassword = (length = 10): string => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const all = upper + lower + digits;

  const chars = [
    upper[randomInt(upper.length)],
    lower[randomInt(lower.length)],
    digits[randomInt(digits.length)],
  ];

  const targetLen = Math.max(8, length);
  while (chars.length < targetLen) {
    chars.push(all[randomInt(all.length)]);
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join("");
};

