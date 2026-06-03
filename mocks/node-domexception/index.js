// Use native globalThis.DOMException which is fully supported natively in Node.js 18+ and browsers.
const NativeDOMException = typeof globalThis !== 'undefined' && globalThis.DOMException 
  ? globalThis.DOMException 
  : typeof window !== 'undefined' && window.DOMException 
    ? window.DOMException 
    : class DOMException extends Error {
        constructor(message, name) {
          super(message);
          this.name = name || 'DOMException';
        }
      };

export default NativeDOMException;
// Also support CommonJS require if needed back-compatibly
if (typeof module !== 'undefined') {
  module.exports = NativeDOMException;
}
