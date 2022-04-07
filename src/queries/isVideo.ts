export default function isVideo(src) {
  return src.match(/\.(m4v|avi|mpg|mp4|webm|mov)$/) !== null;
}

export function videoBlobFormat(src) {
  const hasBlob = src.indexOf("blob:") >= 0;

  if (!hasBlob) return src;

  const videoFormat = src.match(/\.(m4v|avi|mpg|mp4|webm|mov)$/);
  const splittedValue = !!videoFormat?.length
    ? src.split(videoFormat[0])
    : [src];

  return splittedValue[0];
}
