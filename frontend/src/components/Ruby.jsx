import React from 'react';

const Ruby = ({ text, ruby }) => (
  <ruby>
    {text}
    <rp>(</rp>
    <rt>{ruby}</rt>
    <rp>)</rp>
  </ruby>
);

export default Ruby;
