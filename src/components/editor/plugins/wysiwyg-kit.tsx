import {
  BaseHeadingPlugin,
  BaseBoldPlugin,
  BaseItalicPlugin,
  BaseUnderlinePlugin,
  BaseStrikethroughPlugin,
  BaseCodePlugin,
  BaseBlockquotePlugin,
  BaseHighlightPlugin,
  BaseH1Plugin,
  BaseH2Plugin,
  BaseH3Plugin,
  BaseH4Plugin,
  BaseH5Plugin,
  BaseH6Plugin,
} from '@platejs/basic-nodes';
import { BaseParagraphPlugin } from '@platejs/core';
import { BaseCodeBlockPlugin } from '@platejs/code-block';
import { BaseListPlugin } from '@platejs/list';
import { BaseLinkPlugin } from '@platejs/link';
import { AutoformatPlugin } from '@platejs/autoformat';
import { MarkdownPlugin } from '@platejs/markdown';

// Autoformat rules for Markdown shortcuts
const autoformatRules = [
  // Headings
  {
    mode: 'block' as const,
    type: 'h1',
    match: '# ',
  },
  {
    mode: 'block' as const,
    type: 'h2',
    match: '## ',
  },
  {
    mode: 'block' as const,
    type: 'h3',
    match: '### ',
  },
  {
    mode: 'block' as const,
    type: 'h4',
    match: '#### ',
  },
  {
    mode: 'block' as const,
    type: 'h5',
    match: '##### ',
  },
  {
    mode: 'block' as const,
    type: 'h6',
    match: '###### ',
  },
  // Lists
  {
    mode: 'block' as const,
    type: 'ul',
    match: ['* ', '- '],
  },
  {
    mode: 'block' as const,
    type: 'ol',
    match: ['1. ', '1) '],
  },
  // Blockquote
  {
    mode: 'block' as const,
    type: 'blockquote',
    match: '> ',
  },
  // Code block
  {
    mode: 'block' as const,
    type: 'code_block',
    match: '```',
    triggerAtBlockStart: false,
  },
  // Bold
  {
    mode: 'mark' as const,
    type: 'bold',
    match: ['**', '__'],
  },
  // Italic
  {
    mode: 'mark' as const,
    type: 'italic',
    match: ['*', '_'],
  },
  // Code
  {
    mode: 'mark' as const,
    type: 'code',
    match: '`',
  },
  // Strikethrough
  {
    mode: 'mark' as const,
    type: 'strikethrough',
    match: '~~',
  },
  // Highlight
  {
    mode: 'mark' as const,
    type: 'highlight',
    match: '==',
  },
];

// Export the configured plugins as a kit
export const WysiwygKit = [
  // Block elements
  BaseParagraphPlugin,
  BaseH1Plugin,
  BaseH2Plugin,
  BaseH3Plugin,
  BaseH4Plugin,
  BaseH5Plugin,
  BaseH6Plugin,
  BaseHeadingPlugin,
  BaseBlockquotePlugin,
  BaseCodeBlockPlugin,
  
  // List plugins
  BaseListPlugin,
  
  // Inline marks
  BaseBoldPlugin,
  BaseItalicPlugin,
  BaseUnderlinePlugin,
  BaseStrikethroughPlugin,
  BaseCodePlugin,
  BaseHighlightPlugin,
  
  // Link
  BaseLinkPlugin,
  
  // Markdown support
  MarkdownPlugin,
  
  // Autoformat for Markdown shortcuts
  AutoformatPlugin.configure({
    options: {
      rules: autoformatRules,
    },
  }),
];