import { HighlightStyle } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

const syntax = (name: string) => `var(--syn-${name})`;

export const benchHighlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.controlKeyword, t.operatorKeyword, t.modifier], color: syntax('keyword'), fontWeight: '700' },
  { tag: [t.typeName, t.standard(t.typeName), t.className, t.namespace], color: syntax('type') },
  { tag: [t.string, t.special(t.string), t.character], color: syntax('string') },
  { tag: [t.number, t.integer, t.float], color: syntax('number') },
  { tag: [t.bool, t.null, t.atom], color: syntax('number'), fontWeight: '700' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: syntax('comment'), fontStyle: 'italic' },
  { tag: [t.processingInstruction, t.macroName, t.meta], color: syntax('preproc') },
  { tag: [t.function(t.variableName), t.function(t.definition(t.variableName))], color: syntax('function') },
  { tag: [t.operator, t.derefOperator, t.arithmeticOperator, t.logicOperator, t.compareOperator], color: syntax('operator') },
  { tag: [t.punctuation, t.bracket, t.separator], color: syntax('punctuation') },
  { tag: t.invalid, color: 'var(--led-bad)' },
]);
