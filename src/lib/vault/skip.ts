/** 인덱싱·트리에서 제외할 vault 파일 */
export function shouldSkipVaultFile(fileName: string): boolean {
  return fileName.toLowerCase() === "readme.md";
}
