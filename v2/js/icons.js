const svg = (body) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;

export const icons = {
  logo: svg('<path fill="currentColor" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z"/><path fill="#fff" d="M8 7h8v1.6H8V7Zm0 3.2h8v1.6H8v-1.6Z"/>'),
  dashboard: svg('<path fill="currentColor" d="M4 4h7v7H4V4Zm9 0h7v4h-7V4ZM13 10h7v10h-7V10ZM4 13h7v7H4v-7Z"/>'),
  calendar: svg('<path fill="currentColor" d="M7 2h2v2h6V2h2v2h3v18H4V4h3V2Zm11 8H6v10h12V10Z"/>'),
  revision: svg('<path fill="currentColor" d="M12 3 3 7l9 4 9-4-9-4Zm-7 7.2V17l7 3 7-3v-6.8l-7 3.1-7-3.1Z"/>'),
  settings: svg('<path fill="currentColor" d="M19.4 13a7.7 7.7 0 0 0 .1-2l2-1.2-2-3.4-2.3.6a7.6 7.6 0 0 0-1.7-1L15 3h-4l-.5 2.9a7.6 7.6 0 0 0-1.7 1L6.5 6.4l-2 3.4L6.6 11a7.7 7.7 0 0 0 0 2l-2.1 1.2 2 3.4 2.3-.6a7.6 7.6 0 0 0 1.7 1L11 21h4l.5-2.9a7.6 7.6 0 0 0 1.7-1l2.3.6 2-3.4-2.1-1.3ZM12 15.2A3.2 3.2 0 1 1 12 8.8a3.2 3.2 0 0 1 0 6.4Z"/>'),
  search: svg('<path fill="currentColor" d="M10 4a6 6 0 1 1 0 12 6 6 0 0 1 0-12Zm6.3 10.9 3.4 3.4-1.4 1.4-3.4-3.4 1.4-1.4Z"/>'),
  menu: svg('<path fill="currentColor" d="M4 6h16v2H4V6Zm0 5h16v2H4v-2Zm0 5h16v2H4v-2Z"/>'),
  moon: svg('<path fill="currentColor" d="M14 3a8 8 0 1 0 7 12 7 7 0 0 1-9-9 8 8 0 0 0 2-3Z"/>'),
  sun: svg('<path fill="currentColor" d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0-5h1.5v3H12V2Zm0 17h1.5v3H12v-3ZM2 11h3v1.5H2V11Zm17 0h3v1.5h-3V11ZM4.2 4.2l2.1 2.1-1 1-2.2-2.1 1.1-1Zm14.6 14.6-2.1-2.1 1-1 2.1 2.1-1 1ZM4.2 19.8l1 1 2.2-2.1-1-1-2.2 2.1Zm12.6-12.6 1-1 2.1 2.1-1 1-2.1-2.1Z"/>'),
  plus: svg('<path fill="currentColor" d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/>'),
  check: svg('<path fill="currentColor" d="M9.2 16.2 4.8 11.8l1.4-1.4 3 3 7.6-7.6 1.4 1.4-9 9Z"/>'),
  external: svg('<path fill="currentColor" d="M14 5h5v5h-2V8.4l-7.3 7.3-1.4-1.4L15.6 7H14V5ZM5 7h6v2H7v8h8v-4h2v6H5V7Z"/>'),
  up: svg('<path fill="currentColor" d="M12 6 6 14h12L12 6Z"/>'),
  down: svg('<path fill="currentColor" d="M12 18 18 10H6l6 8Z"/>'),
  trash: svg('<path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v8h-2V9Zm4 0h2v8h-2V9ZM7 9h2v8H7V9Z"/>'),
  page: svg('<path fill="currentColor" d="M6 3h8l4 4v14H6V3Zm7 1.5V8h3.5L13 4.5ZM8 11h8v1.6H8V11Zm0 3h8v1.6H8V14.6Z"/>'),
  reading: svg('<path fill="currentColor" d="M3 5.5 12 8l9-2.5V18L12 20.5 3 18V5.5Zm8 3.2v9.3l1 .3V8.7l-1-.3Z"/>'),
  activity: svg('<path fill="currentColor" d="M4 4h7v7H4V4Zm9 2h7v3h-7V6ZM4 13h7v7H4v-7Zm9 2h7v5h-7v-5Z"/>'),
  vc: svg('<path fill="currentColor" d="M3 6h12v12H3V6Zm14 3 4-2v10l-4-2V9Z"/>'),
  journal: svg('<path fill="currentColor" d="M6 3h11a2 2 0 0 1 2 2v14H8a2 2 0 0 0-2 2V3Zm0 16h11V5H8v12.2A4 4 0 0 1 6 19Z"/>'),
  discussion: svg('<path fill="currentColor" d="M4 4h16v11H7l-3 3V4Zm3 3v1.6h10V7H7Zm0 3v1.6h7V10H7Z"/>'),
  quiz: svg('<path fill="currentColor" d="M12 3a7 7 0 0 1 4 12.7V18H8v-2.3A7 7 0 0 1 12 3Zm-1 17h2v2h-2v-2Zm1-14a4.5 4.5 0 0 0-2.5 8.2l.5.3V15h4v-.5l.5-.3A4.5 4.5 0 0 0 12 6Z"/>')
};

export function typeIcon(type) {
  return icons[type] || icons.page;
}
