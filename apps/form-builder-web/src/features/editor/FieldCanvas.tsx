import type { Field, FormSchema } from '@thuraaung2493/dynamic-form-core';
import { ArrowDown, ArrowUp, Copy, CornerDownRight, FormInput, GripVertical, Trash2 } from 'lucide-react';

import { Button } from '../../shared/ui/Button.js';
import { sameLocation, type ContainerLocation, type FieldLocation } from './schemaEditor.js';

interface CanvasProps {
  activeContainer: ContainerLocation;
  onChooseContainer: (container: ContainerLocation) => void;
  onDelete: (location: FieldLocation) => void;
  onDuplicate: (location: FieldLocation) => void;
  onMove: (location: FieldLocation, direction: -1 | 1) => void;
  onSelect: (location: FieldLocation) => void;
  schema: FormSchema;
  selected?: FieldLocation | undefined;
}

export function FieldCanvas(props: CanvasProps) {
  const renderFields = (fields: Field[], container: ContainerLocation, depth: number) => fields.map((field, fieldIndex) => {
    const location = [...container, fieldIndex];
    const selected = props.selected !== undefined && sameLocation(props.selected, location);
    return (
      <div className="canvas-node" key={`${field.name}-${fieldIndex}`}>
        <div className={`canvas-field ${selected ? 'selected' : ''}`} onClick={() => props.onSelect(location)} role="button" tabIndex={0}>
          <GripVertical aria-hidden="true" className="drag-mark" size={17} />
          <div className="field-summary"><strong>{field.label || 'Untitled field'}</strong><span>{field.name || 'missing_name'} · {field.type}</span></div>
          <div className="field-flags">{field.required ? <span>Required</span> : null}{field.disabled ? <span>Disabled</span> : null}</div>
          <div className="field-actions" onClick={(event) => event.stopPropagation()}>
            <Button aria-label="Move up" disabled={fieldIndex === 0} onClick={() => props.onMove(location, -1)} size="icon" variant="ghost"><ArrowUp size={15} /></Button>
            <Button aria-label="Move down" disabled={fieldIndex === fields.length - 1} onClick={() => props.onMove(location, 1)} size="icon" variant="ghost"><ArrowDown size={15} /></Button>
            <Button aria-label="Duplicate field" onClick={() => props.onDuplicate(location)} size="icon" variant="ghost"><Copy size={15} /></Button>
            <Button aria-label="Delete field" onClick={() => props.onDelete(location)} size="icon" variant="ghost"><Trash2 size={15} /></Button>
          </div>
        </div>
        {field.type === 'select' || field.type === 'radio' ? (
          <div className="branch-list">
            {field.options.map((option, optionIndex) => {
              const branch = [...location, optionIndex];
              const active = sameLocation(props.activeContainer, branch);
              return (
                <div className={`branch ${active ? 'active' : ''}`} key={`${String(option.value)}-${optionIndex}`}>
                  <button aria-label={`${field.label} → ${option.label}`} aria-pressed={active} className="branch-label" onClick={() => props.onChooseContainer(active ? [] : branch)} type="button"><CornerDownRight aria-hidden="true" size={14} /> When “{option.label}”{active ? <span className="branch-selection-label">Selected</span> : null}</button>
                  {option.fields === undefined || option.fields.length === 0 ? <p className="branch-empty">No conditional fields</p> : renderFields(option.fields, branch, depth + 1)}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  });

  return (
    <section className="editor-panel canvas-panel">
      <div className="panel-heading"><p className="eyebrow">Structure</p><h2>Form canvas</h2><p>Click a condition, then choose a field from the sidebar. Click the selected condition again to return to the main form.</p></div>
      {props.schema.fields.length === 0 ? <div className="canvas-empty"><FormInput size={28} /><p>Choose a field from the palette to begin.</p></div> : <div className="canvas-list">{renderFields(props.schema.fields, [], 0)}</div>}
    </section>
  );
}
