declare module 'qrcode' {
  export type QRCodeToDataURLOptions = {
    margin?: number;
    width?: number;
  };

  export function toDataURL(text: string, options?: QRCodeToDataURLOptions): Promise<string>;
}
