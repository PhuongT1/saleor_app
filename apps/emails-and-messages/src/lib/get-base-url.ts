export const getBaseUrl = (headers: { [name: string]: string | string[] | undefined }): string => {
  const { host, "x-forwarded-proto": protocol = "http" } = headers;
  console.log(`base url ${protocol}://${host}`);
  return `${protocol}://${host}`;
};
