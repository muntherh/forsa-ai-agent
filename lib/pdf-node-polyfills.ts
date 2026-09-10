/**
 * pdfjs-dist (used internally by pdf-parse, app/api/cv-extract/route.ts)
 * references `DOMMatrix` at module load time — `const SCALE_MATRIX = new
 * DOMMatrix()` in its bundled canvas.js — even though this route only ever
 * calls getText() and never touches rendering. It normally gets DOMMatrix
 * from the optional native `@napi-rs/canvas` package, but that's a
 * platform-specific native binary that doesn't reliably survive Vercel's
 * serverless function file-tracing: locally the full node_modules tree
 * (native binary included) is always on disk, so this only ever breaks in
 * production, as `ReferenceError: DOMMatrix is not defined`.
 *
 * A minimal, dependency-free 2D affine-transform implementation is enough —
 * text extraction never renders anything, so real matrix math is never
 * exercised for our use; this only has to exist, not be complete.
 *
 * Must be imported before "pdf-parse" so this runs first.
 */
if (typeof globalThis.DOMMatrix === "undefined") {
  class DOMMatrixPolyfill {
    a: number;
    b: number;
    c: number;
    d: number;
    e: number;
    f: number;

    constructor(init?: number[]) {
      if (Array.isArray(init) && init.length === 6) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
      } else {
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.e = 0;
        this.f = 0;
      }
    }

    multiply(other: DOMMatrixPolyfill): DOMMatrixPolyfill {
      return new DOMMatrixPolyfill([
        this.a * other.a + this.c * other.b,
        this.b * other.a + this.d * other.b,
        this.a * other.c + this.c * other.d,
        this.b * other.c + this.d * other.d,
        this.a * other.e + this.c * other.f + this.e,
        this.b * other.e + this.d * other.f + this.f,
      ]);
    }

    multiplySelf(other: DOMMatrixPolyfill): this {
      return Object.assign(this, this.multiply(other));
    }

    preMultiplySelf(other: DOMMatrixPolyfill): this {
      return Object.assign(this, other.multiply(this));
    }

    translate(tx: number, ty = 0): DOMMatrixPolyfill {
      return this.multiply(new DOMMatrixPolyfill([1, 0, 0, 1, tx, ty]));
    }

    scale(sx: number, sy = sx): DOMMatrixPolyfill {
      return this.multiply(new DOMMatrixPolyfill([sx, 0, 0, sy, 0, 0]));
    }

    invertSelf(): this {
      const det = this.a * this.d - this.b * this.c;
      const a = this.d / det;
      const b = -this.b / det;
      const c = -this.c / det;
      const d = this.a / det;
      const e = -(a * this.e + c * this.f);
      const f = -(b * this.e + d * this.f);
      return Object.assign(this, { a, b, c, d, e, f });
    }
  }

  // @ts-expect-error - minimal Node-side stand-in for the browser global
  globalThis.DOMMatrix = DOMMatrixPolyfill;
}
