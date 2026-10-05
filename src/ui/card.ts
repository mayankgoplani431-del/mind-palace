/** Renderer-agnostic card content: drawn as DOM on flat screens and as a canvas panel inside VR. */
export interface CardButton {
  label: string;
  kind?: 'primary' | 'good' | 'bad' | 'plain';
  onClick(): void;
  /** Quiz feedback colouring. */
  state?: 'right' | 'wrong';
  disabled?: boolean;
}

export interface CardContent {
  id: string;
  title: string;
  eyebrow?: string;
  body?: string[];
  quote?: string;
  chips?: string[];
  /** Multiple-choice options (stacked, full width). */
  options?: CardButton[];
  buttons?: CardButton[];
  footer?: string;
  onClose?(): void;
  /** Language for canvas text shaping hints. */
  dismissible?: boolean;
}
