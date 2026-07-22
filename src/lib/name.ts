export function normalizeDisplayName(value: string): string {
  return value.trim();
}

export function validateDisplayName(value: string): string | null {
  const name = normalizeDisplayName(value);

  if (!name) {
    return "请输入你的名字";
  }

  if (name.length > 30) {
    return "名字不能超过30个字符";
  }

  return null;
}
