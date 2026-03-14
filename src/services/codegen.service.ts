const PREFIXES: Record<string, string> = {
  student: 'ST',
  teacher: 'TC',
  parent:  'PR',
  admin:   'AD'
};

export const generateCode = (role: string): string => {
  const prefix = PREFIXES[role] || 'XX';
  const number = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${number}`;
};

export const generateBatch = (role: string, count: number): string[] => {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(generateCode(role));
  }
  return Array.from(codes);
};