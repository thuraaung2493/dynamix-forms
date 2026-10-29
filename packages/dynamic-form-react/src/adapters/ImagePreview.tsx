import type { RemoteAssetValue } from '@thuraaung2493/dynamic-form-core';
import { useEffect, useState } from 'react';

const isRemoteAsset = (value: unknown): value is RemoteAssetValue =>
  typeof value === 'object' &&
  value !== null &&
  'kind' in value &&
  value.kind === 'remote' &&
  'url' in value &&
  typeof value.url === 'string';

export function ImagePreview({
  value,
  className,
}: {
  value: unknown;
  className: string;
}) {
  const [localUrl, setLocalUrl] = useState<string>();

  useEffect(() => {
    let active = true;
    if (!(value instanceof Blob)) {
      queueMicrotask(() => {
        if (active) {
          setLocalUrl(undefined);
        }
      });
      return () => {
        active = false;
      };
    }
    const url = URL.createObjectURL(value);
    queueMicrotask(() => {
      if (active) {
        setLocalUrl(url);
      }
    });
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [value]);

  const source = isRemoteAsset(value) ? value.url : localUrl;
  return source ? <img alt="Selected file preview" className={className} src={source} /> : null;
}
