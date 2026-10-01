// tests/vitest.setup.js - Global test setup
import { vi } from 'vitest';

// Mock IndexedDB for tests
global.indexedDB = {
  open: vi.fn(() => {
    const db = {
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      result: {
        createObjectStore: vi.fn(() => ({
          createIndex: vi.fn(),
          put: vi.fn(),
          get: vi.fn(),
          getAll: vi.fn(),
          delete: vi.fn(),
          clear: vi.fn(),
          count: vi.fn(),
          index: vi.fn(() => ({
            getAll: vi.fn(),
            get: vi.fn(),
          })),
        })),
        transaction: vi.fn(() => ({
          objectStore: vi.fn(() => ({
            put: vi.fn(),
            get: vi.fn(),
            getAll: vi.fn(),
            delete: vi.fn(),
            clear: vi.fn(),
            count: vi.fn(),
            index: vi.fn(() => ({
              getAll: vi.fn(),
              get: vi.fn(),
            })),
          })),
          oncomplete: null,
          onerror: null,
          onabort: null,
        })),
        close: vi.fn(),
      },
    };
    setTimeout(() => {
      if (db.onsuccess) db.onsuccess({ target: db.result });
    }, 0);
    return db;
  }),
  deleteDatabase: vi.fn(),
};

// Mock browserAPI
vi.mock('../browser-compat.js', () => ({
  browserAPI: {
    runtime: { getURL: (path) => `file:///mock/${path}` },
    storage: {
      local: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
      },
      sync: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
      },
    },
    tabs: {
      getCurrent: vi.fn().mockResolvedValue({ id: 1 }),
      setZoomSettings: vi.fn().mockResolvedValue(undefined),
      setZoom: vi.fn().mockResolvedValue(undefined),
      getZoom: vi.fn().mockResolvedValue(1),
      getZoomSettings: vi.fn().mockResolvedValue({ defaultZoomFactor: 1 }),
      query: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 1 }),
      reload: vi.fn().mockResolvedValue(undefined),
      onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
      onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    alarms: {
      create: vi.fn().mockResolvedValue(undefined),
      get: vi.fn().mockResolvedValue(null),
      onAlarm: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  },
}));

// Mock DOM elements that analysis.js expects
const mockElement = {
  hidden: true,
  textContent: '',
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  appendChild: vi.fn(),
  removeChild: vi.fn(),
  replaceChildren: vi.fn(),
  querySelector: vi.fn(),
  querySelectorAll: vi.fn(() => []),
  classList: { add: vi.fn(), remove: vi.fn(), toggle: vi.fn(), contains: vi.fn() },
  style: {},
  dataset: {},
  setAttribute: vi.fn(),
  getAttribute: vi.fn(),
  removeAttribute: vi.fn(),
  focus: vi.fn(),
  blur: vi.fn(),
  click: vi.fn(),
  tagName: 'DIV',
  nodeType: 1,
  ownerDocument: document,
  parentNode: null,
  childNodes: [],
  children: [],
  firstChild: null,
  lastChild: null,
  nextSibling: null,
  previousSibling: null,
};

const createMockElement = () => ({
  ...mockElement,
  hidden: true,
  textContent: '',
});

// Mock window.matchMedia
window.matchMedia = vi.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = vi.fn((id) => clearTimeout(id));

// Suppress console.error in tests unless explicitly needed
const originalError = console.error;
console.error = vi.fn((...args) => {
  if (args[0]?.includes?.('act(') || args[0]?.includes?.('Warning:')) {
    return;
  }
  originalError(...args);
});

// Mock DOM elements that analysis.js expects
document.getElementById = vi.fn((id) => createMockElement());
document.querySelector = vi.fn(() => createMockElement());
document.querySelectorAll = vi.fn(() => []);
document.createElement = vi.fn(() => createMockElement());
// Don't mock document.body, document.head, document.documentElement - jsdom provides them