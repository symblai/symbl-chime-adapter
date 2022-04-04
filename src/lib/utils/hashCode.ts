export const hashCode = function (s: string): number {
  let h = 0,
    i = 0;
  const l = s.length;
  // eslint-disable-next-line functional/no-loop-statement
  if (l > 0) while (i < l) h = ((h << 5) - h + s.charCodeAt(i++)) | 0;
  return h;
};
