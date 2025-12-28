import { beforeEach, vi } from "vitest";

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn((key: string) => null),
  setItem: vi.fn((key: string, value: string) => {}),
  removeItem: vi.fn((key: string) => {}),
  clear: vi.fn(() => {})
};

global.localStorage = localStorageMock as any;

beforeEach(() => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockReturnValue(null);
});

