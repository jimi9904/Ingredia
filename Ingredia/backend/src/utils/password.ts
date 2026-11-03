import bcrypt from 'bcryptjs';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  if (!hash) return false;
  // Convert Laravel/PHP $2y$ prefix to standard $2a$ for bcryptjs compatibility
  const normalizedHash = hash.startsWith('$2y$')
    ? '$2a$' + hash.slice(4)
    : hash;

  return bcrypt.compare(password, normalizedHash);
};

