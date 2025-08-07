import React, { useState } from 'react';
import Card from './Card';

const Accordion = ({ title, children, defaultOpen = false, className = '' }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card
      className={className}
      title={title}
      headerActions={
        <button
          className="accordion-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          {open ? '▾' : '▸'}
        </button>
      }
    >
      {open && children}
    </Card>
  );
};

export default Accordion;
