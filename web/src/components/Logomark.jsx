// Logomark — extracted from the P01 / P02 prototypes.
// Pure CSS clock face built from primitives (Ink Charcoal square + tiny red
// "moment" pip + white circular face + single hand). No raster, no SVG icon
// dep — keeps the bundle tiny.

import './Logomark.css';

export default function Logomark() {
  return (
    <div className="ac-logomark" aria-hidden="true">
      <div className="face">
        <div className="hand" />
        <div className="pivot" />
      </div>
    </div>
  );
}
