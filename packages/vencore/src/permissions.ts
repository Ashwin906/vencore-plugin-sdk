import type { HttpFetchOptions, HttpResponse } from './types';

export interface StorageReadNamespace {
  get<T = unknown>(key: string): Promise<T | null>;
}

export interface StorageNamespace extends StorageReadNamespace {
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface HttpNamespace {
  fetch(url: string, options?: HttpFetchOptions): Promise<HttpResponse>;
}

export interface ModalNamespace {
  open(opts: { title: string; content?: string }): Promise<void>;
  close(): Promise<void>;
}
