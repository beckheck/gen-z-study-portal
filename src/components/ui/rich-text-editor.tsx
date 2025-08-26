import { fileAttachmentStorage } from '@/lib/file-attachment-storage';
import { cn } from '@/lib/utils';
import { Node, mergeAttributes } from '@tiptap/core';
import Blockquote from '@tiptap/extension-blockquote';
import { Color } from '@tiptap/extension-color';
import { FontFamily } from '@tiptap/extension-font-family';
import { FontSize } from '@tiptap/extension-font-size';
import { Highlight } from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { TextStyle } from '@tiptap/extension-text-style';
import { Underline } from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  CheckSquare,
  Highlighter,
  ImageIcon,
  Italic,
  List,
  ListOrdered,
  Palette,
  Paperclip,
  Quote,
  Redo,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

// File Attachment Extension
interface FileAttachmentOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fileAttachment: {
      setFileAttachment: (options: {
        fileId: string;
        fileName: string;
        fileSize: string;
        fileIcon: string;
      }) => ReturnType;
    };
  }
}

const FileAttachment = Node.create<FileAttachmentOptions>({
  name: 'fileAttachment',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      fileId: {
        default: null,
      },
      fileName: {
        default: null,
      },
      fileSize: {
        default: null,
      },
      fileIcon: {
        default: '📎',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="file-attachment"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Determine if file can be viewed in browser
    const fileName = HTMLAttributes.fileName || '';
    const canView = canViewInBrowser(fileName);

    return [
      'div',
      mergeAttributes(
        {
          'data-type': 'file-attachment',
          class: 'file-attachment',
          'data-file-id': HTMLAttributes.fileId,
          'data-file-name': HTMLAttributes.fileName,
          'data-file-size': HTMLAttributes.fileSize,
          'data-tooltip': canView ? 'Click to open' : 'Click to download',
          contenteditable: 'false',
        },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      ['span', { class: 'file-icon' }, HTMLAttributes.fileIcon],
      [
        'div',
        { class: 'file-info' },
        ['div', { class: 'file-name' }, HTMLAttributes.fileName],
        ['div', { class: 'file-size' }, HTMLAttributes.fileSize],
      ],
    ];
  },

  addCommands() {
    return {
      setFileAttachment:
        options =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});

// Shared hierarchical checkbox handling logic
const handleHierarchicalCheckboxClick = (
  editor: any,
  target: HTMLElement,
  event: Event,
  onContentChange?: (content: string) => void,
  calculateProgress?: (editor: any) => void
) => {
  // Only prevent propagation for checkbox clicks
  event.stopPropagation();
  event.stopImmediatePropagation();

  const checkbox = target as HTMLInputElement;
  // Use the DOM checkbox's current state, not its inverse
  const newCheckedState = checkbox.checked;

  try {
    // For read-only editors, temporarily make editable
    const wasEditable = editor.isEditable;
    if (!wasEditable) {
      editor.setEditable(true);
    }

    // Find the position of the checkbox in the editor
    const pos = editor.view.posAtDOM(target, 0);
    const { state } = editor.view;
    const $pos = state.doc.resolve(pos);

    // Find the task item node that contains this checkbox
    let taskItemPos = null;
    for (let depth = $pos.depth; depth > 0; depth--) {
      const node = $pos.node(depth);
      if (node.type.name === 'taskItem') {
        taskItemPos = $pos.before(depth);
        break;
      }
    }

    if (taskItemPos !== null) {
      // Start building the transaction
      let tr = state.tr;

      // First, update the parent task item to match the DOM checkbox state
      tr = tr.setNodeMarkup(taskItemPos, null, { checked: newCheckedState });

      // Find the parent task list to determine the scope for child updates
      const taskItemNode = state.doc.nodeAt(taskItemPos);
      if (taskItemNode) {
        // Look for nested task lists within this task item
        taskItemNode.descendants((node: any, pos: number) => {
          if (node.type.name === 'taskItem') {
            // This is a child task item - update it to match parent
            const childPos = taskItemPos + pos + 1;
            tr = tr.setNodeMarkup(childPos, null, { checked: newCheckedState });
          }
        });
      }

      // Dispatch the transaction
      editor.view.dispatch(tr);
    }

    // Handle post-update actions for read-only editors
    if (!wasEditable) {
      setTimeout(() => {
        const updatedContent = editor.getHTML();
        editor.setEditable(false);
        if (onContentChange) {
          onContentChange(updatedContent);
        }
        if (calculateProgress) {
          calculateProgress(editor);
        }
      }, 0);
    }
  } catch (error) {
    console.error('Error updating checkbox:', error);
    // Fallback: make sure editor stays in correct editable state
    if (!editor.isEditable) {
      editor.setEditable(false);
    }
  }
};

// File attachment click handler
const handleFileAttachmentClick = async (fileAttachment: HTMLElement, event?: Event) => {
  // Stop event propagation to prevent parent click handlers from firing
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const fileId = fileAttachment.getAttribute('data-file-id');
  const fileName = fileAttachment.getAttribute('data-file-name');

  if (fileId && fileName) {
    try {
      // Show loading state
      const originalIcon = fileAttachment.querySelector('.file-icon');
      const originalText = originalIcon?.textContent;
      if (originalIcon) {
        originalIcon.textContent = '⏳';
        originalIcon.classList.add('loading');
      }

      // Load file data on demand
      const storedFile = await fileAttachmentStorage.getFile(fileId);

      // Restore original icon
      if (originalIcon && originalText) {
        originalIcon.textContent = originalText;
        originalIcon.classList.remove('loading');
      }

      if (!storedFile) {
        console.error('File not found:', fileId);
        return;
      }

      const fileData = storedFile.fileData;

      // Handle file opening/downloading
      if (canViewInBrowser(fileName)) {
        try {
          // Convert base64 to blob for better browser compatibility
          const response = fetch(fileData);
          response
            .then(res => res.blob())
            .then(blob => {
              const blobUrl = URL.createObjectURL(blob);
              const newWindow = window.open(blobUrl, '_blank');

              // Clean up the blob URL after the window is closed or after a delay
              if (newWindow) {
                newWindow.addEventListener('beforeunload', () => {
                  URL.revokeObjectURL(blobUrl);
                });
                // Fallback cleanup after 30 seconds
                setTimeout(() => {
                  URL.revokeObjectURL(blobUrl);
                }, 30000);
              } else {
                // If popup was blocked, fallback to direct data URL
                window.open(fileData, '_blank');
              }
            })
            .catch(() => {
              // Fallback to direct data URL if blob conversion fails
              window.open(fileData, '_blank');
            });
        } catch (error) {
          // Final fallback to direct data URL
          window.open(fileData, '_blank');
        }
      } else {
        // Download for non-viewable files
        const link = document.createElement('a');
        link.href = fileData;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error handling file attachment click:', error);
    }
  }
};

// Shared editor extensions configuration
const getEditorExtensions = (placeholder?: string) => [
  StarterKit.configure({
    blockquote: false, // We'll add our own blockquote extension
  }),
  Blockquote.configure({
    HTMLAttributes: {
      class: 'tiptap-blockquote',
    },
  }),
  TextStyle,
  Color,
  Highlight.configure({
    multicolor: true,
  }),
  FontFamily.configure({
    types: ['textStyle'],
  }),
  FontSize.configure({
    types: ['textStyle'],
  }),
  Underline,
  TaskList.configure({
    HTMLAttributes: {
      class: 'tiptap-task-list',
    },
  }),
  TaskItem.configure({
    nested: true,
    HTMLAttributes: {
      class: 'tiptap-task-item',
    },
  }),
  Image.configure({
    inline: false,
    allowBase64: true,
    HTMLAttributes: {
      class: 'tiptap-image',
    },
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: {
      class: 'tiptap-link',
    },
  }),
  FileAttachment,
  ...(placeholder ? [Placeholder.configure({ placeholder })] : []),
];

// Shared editor attributes configuration
const getEditorAttributes = (className?: string) => ({
  class: cn(
    'prose prose-sm dark:prose-invert max-w-none',
    'text-gray-900 dark:text-gray-100',
    // Override prose list styles
    'prose-ul:list-disc prose-ol:list-decimal',
    'prose-li:marker:text-gray-500 dark:prose-li:marker:text-gray-400',
    // Ensure blockquote styling
    'prose-blockquote:border-l-4 prose-blockquote:border-gray-300 dark:prose-blockquote:border-gray-600',
    'prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400',
    className
  ),
});

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  toolsWhenEmpty?: string[]; // Array of tool names to show when content is empty
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  className,
  disabled = false,
  toolsWhenEmpty = ['checkbox', 'attachment'], // Default to checkbox and attachment
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  // Check if content is empty (no text content)
  const isContentEmpty = !content || content.trim() === '' || content === '<p></p>';
  const useSimplifiedToolbar = isContentEmpty && toolsWhenEmpty && toolsWhenEmpty.length > 0;

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle image upload
  const handleImageUpload = async (file: File) => {
    try {
      // Convert to base64 for storage
      const base64 = await fileToBase64(file);

      // Insert image into editor
      if (editor) {
        editor.chain().focus().setImage({ src: base64 }).run();
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  // Handle file attachment upload
  const handleFileAttachment = async (file: File) => {
    try {
      // Store file and get metadata
      const metadata = await fileAttachmentStorage.storeFile(file);

      // Insert file attachment using the custom extension
      if (editor) {
        editor
          .chain()
          .focus()
          .setFileAttachment({
            fileId: metadata.id,
            fileName: metadata.fileName,
            fileSize: metadata.fileSize,
            fileIcon: getFileIcon(metadata.fileType),
          })
          .run();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      // You could show a user-friendly error message here
    }
  };

  const editor = useEditor({
    extensions: getEditorExtensions(placeholder),
    content,
    editable: !disabled,
    onCreate: ({ editor }) => {
      // Add click handlers for file attachments and checkboxes
      editor.view.dom.addEventListener('click', event => {
        const target = event.target as HTMLElement;

        // Handle file attachment clicks
        const fileAttachment = target.closest('[data-type="file-attachment"]') as HTMLElement;
        if (fileAttachment) {
          handleFileAttachmentClick(fileAttachment, event);
          return;
        }

        // Handle checkbox clicks with hierarchical behavior
        if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
          handleHierarchicalCheckboxClick(editor, target, event);
        }
      });
    },
    onUpdate: ({ editor }) => {
      onChange(
        editor
          .getHTML()
          .trim()
          .replace(/^(<p><\/p>)+$/, '')
      );
    },
    editorProps: {
      attributes: {
        class: cn(getEditorAttributes().class, 'focus:outline-none min-h-[100px] px-3 py-2'),
      },
      handlePaste: (view, event, slice) => {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find(item => item.type.startsWith('image/'));

        if (imageItem) {
          event.preventDefault();
          const file = imageItem.getAsFile();
          if (file) {
            handleImageUpload(file);
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files.length) {
          const files = Array.from(event.dataTransfer.files);

          // Handle images first
          const imageFile = files.find(file => file.type.startsWith('image/'));
          if (imageFile) {
            event.preventDefault();
            handleImageUpload(imageFile);
            return true;
          }

          // Handle other file attachments
          const file = files[0];
          if (file) {
            event.preventDefault();
            handleFileAttachment(file);
            return true;
          }
        }
        return false;
      },
    },
  });

  // Update editor content when content prop changes (for editing existing events)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [editor, content]);

  // Close color pickers when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Check if the click is outside both color picker containers
      if (!target.closest('[data-color-picker]')) {
        setShowColorPicker(false);
        setShowHighlightPicker(false);
      }
    };

    if (showColorPicker || showHighlightPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showColorPicker, showHighlightPicker]);

  if (!editor) {
    return null;
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <Button
      type="button"
      variant={isActive ? 'default' : 'ghost'}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );

  // Reusable common toolbar buttons to avoid duplication
  const CheckboxButton = () => (
    <ToolbarButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')}>
      <CheckSquare className="h-4 w-4" />
    </ToolbarButton>
  );

  const AttachmentButton = () => (
    <ToolbarButton onClick={() => attachmentInputRef.current?.click()} disabled={disabled}>
      <Paperclip className="h-4 w-4" />
    </ToolbarButton>
  );

  // Reusable color button component to avoid duplication
  const ColorButton = ({
    color,
    isActive,
    onClick,
    indicatorColor = 'bg-gray-800 dark:bg-white',
  }: {
    color: string;
    isActive: boolean;
    onClick: () => void;
    indicatorColor?: string;
  }) => (
    <button
      key={color}
      type="button"
      className={`w-8 h-8 rounded-lg border-2 hover:scale-105 transition-all duration-200 shadow-sm relative overflow-hidden ${
        isActive
          ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-500/30'
          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
      }`}
      style={{
        backgroundColor: color + ' !important',
        background: color + ' !important',
      }}
      onClick={onClick}
      title={color}
    >
      <div className="absolute inset-0 w-full h-full" style={{ backgroundColor: color }}></div>
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className={`w-2 h-2 rounded-full shadow-sm ${indicatorColor}`}></div>
        </div>
      )}
    </button>
  );

  // Reusable current color display component to avoid duplication
  const CurrentColorDisplay = ({ color, label, isActive }: { color?: string; label: string; isActive: boolean }) =>
    isActive && color ? (
      <div className="flex items-center gap-2 mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div
          className="w-4 h-4 rounded border border-gray-200 dark:border-gray-600"
          style={{ backgroundColor: color }}
        ></div>
        <span className="text-xs font-mono text-gray-600 dark:text-gray-400">{color}</span>
      </div>
    ) : null;

  // Reusable reset button component for color pickers
  const ResetButton = ({ onClick, children }: { onClick: () => void; children: React.ReactNode }) => (
    <button
      type="button"
      className="w-full text-sm px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 font-medium"
      onClick={onClick}
    >
      {children}
    </button>
  );

  // Helper function to get current heading level
  const getCurrentHeadingValue = (): string => {
    for (let level = 1; level <= 6; level++) {
      if (editor.isActive('heading', { level })) {
        return `h${level}`;
      }
    }
    return 'paragraph';
  };

  // Color palettes to avoid duplication
  const textColors = [
    '#000000',
    '#374151',
    '#6B7280',
    '#9CA3AF',
    '#D1D5DB',
    '#F3F4F6',
    '#EF4444',
    '#F97316',
    '#F59E0B',
    '#EAB308',
    '#84CC16',
    '#22C55E',
    '#10B981',
    '#14B8A6',
    '#06B6D4',
    '#0EA5E9',
    '#3B82F6',
    '#6366F1',
    '#8B5CF6',
    '#A855F7',
    '#D946EF',
    '#EC4899',
    '#F43F5E',
    '#FB7185',
  ];

  const highlightColors = [
    '#FEF3C7',
    '#FDE68A',
    '#FCD34D',
    '#FBBF24',
    '#F59E0B',
    '#D97706',
    '#FEE2E2',
    '#FECACA',
    '#FCA5A5',
    '#F87171',
    '#EF4444',
    '#DC2626',
    '#DBEAFE',
    '#BFDBFE',
    '#93C5FD',
    '#60A5FA',
    '#3B82F6',
    '#2563EB',
    '#D1FAE5',
    '#A7F3D0',
    '#6EE7B7',
    '#34D399',
    '#10B981',
    '#059669',
    '#E0E7FF',
    '#C7D2FE',
    '#A5B4FC',
    '#818CF8',
    '#6366F1',
    '#4F46E5',
    '#F3E8FF',
    '#DDD6FE',
    '#C4B5FD',
    '#A78BFA',
    '#8B5CF6',
    '#7C3AED',
  ];

  return (
    <div
      className={cn(
        'border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden',
        'bg-white dark:bg-gray-800',
        className
      )}
    >
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-1 p-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
        {useSimplifiedToolbar ? (
          // Simplified toolbar when content is empty
          <>
            {toolsWhenEmpty.includes('checkbox') && <CheckboxButton />}
            {toolsWhenEmpty.includes('attachment') && <AttachmentButton />}
          </>
        ) : (
          // Full toolbar when content is not empty
          <>
            {/* Undo/Redo */}
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().chain().focus().undo().run()}
            >
              <Undo className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().chain().focus().redo().run()}
            >
              <Redo className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Basic formatting buttons */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              disabled={!editor.can().chain().focus().toggleBold().run()}
            >
              <Bold className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
            >
              <Italic className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              disabled={!editor.can().chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Color picker */}
            <div className="relative" data-color-picker>
              <ToolbarButton
                onClick={() => {
                  setShowColorPicker(!showColorPicker);
                  setShowHighlightPicker(false); // Close highlight picker when opening color picker
                }}
                isActive={showColorPicker}
              >
                <Palette className="h-4 w-4" />
              </ToolbarButton>
              {showColorPicker && (
                <div className="absolute top-10 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-4 shadow-2xl z-10 w-64">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Text Color</p>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        onClick={() => setShowColorPicker(false)}
                      >
                        ×
                      </button>
                    </div>

                    {/* Color Grid */}
                    <div className="grid grid-cols-6 gap-2 mb-4">
                      {textColors.map(color => {
                        const isActive = editor.getAttributes('textStyle').color === color;
                        return (
                          <ColorButton
                            color={color}
                            isActive={isActive}
                            onClick={() => {
                              editor.chain().focus().setColor(color).run();
                              setShowColorPicker(false);
                            }}
                            indicatorColor="bg-white dark:bg-gray-900"
                          />
                        );
                      })}
                    </div>

                    {/* Current Color Display */}
                    <CurrentColorDisplay
                      color={editor.getAttributes('textStyle').color}
                      label="Current Color"
                      isActive={!!editor.getAttributes('textStyle').color}
                    />
                  </div>

                  <ResetButton
                    onClick={() => {
                      editor.chain().focus().unsetColor().run();
                      setShowColorPicker(false);
                    }}
                  >
                    Reset to Default
                  </ResetButton>
                </div>
              )}
            </div>

            {/* Highlight picker */}
            <div className="relative" data-color-picker>
              <ToolbarButton
                onClick={() => {
                  setShowHighlightPicker(!showHighlightPicker);
                  setShowColorPicker(false); // Close color picker when opening highlight picker
                }}
                isActive={showHighlightPicker || editor.isActive('highlight')}
              >
                <Highlighter className="h-4 w-4" />
              </ToolbarButton>
              {showHighlightPicker && (
                <div className="absolute top-10 left-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-4 shadow-2xl z-10 w-64">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Highlight</p>
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        onClick={() => setShowHighlightPicker(false)}
                      >
                        ×
                      </button>
                    </div>

                    {/* Highlight Colors Grid */}
                    <div className="grid grid-cols-6 gap-2 mb-4">
                      {highlightColors.map(color => {
                        const isActive = editor.isActive('highlight', { color });
                        return (
                          <ColorButton
                            color={color}
                            isActive={isActive}
                            onClick={() => {
                              editor.chain().focus().toggleHighlight({ color }).run();
                              setShowHighlightPicker(false);
                            }}
                            indicatorColor="bg-gray-800 dark:bg-white"
                          />
                        );
                      })}
                    </div>

                    {/* Current Highlight Display */}
                    <CurrentColorDisplay
                      color={editor.getAttributes('highlight').color || '#FEF3C7'}
                      label="Current Highlight"
                      isActive={editor.isActive('highlight')}
                    />
                  </div>

                  <ResetButton
                    onClick={() => {
                      editor.chain().focus().unsetHighlight().run();
                      setShowHighlightPicker(false);
                    }}
                  >
                    Remove Highlight
                  </ResetButton>
                </div>
              )}
            </div>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Lists and quote */}
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
            >
              <List className="h-4 w-4" />
            </ToolbarButton>

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
            >
              <ListOrdered className="h-4 w-4" />
            </ToolbarButton>

            <CheckboxButton />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              isActive={editor.isActive('blockquote')}
              disabled={!editor.can().chain().focus().toggleBlockquote().run()}
            >
              <Quote className="h-4 w-4" />
            </ToolbarButton>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />

            {/* Media buttons */}
            <ToolbarButton onClick={() => fileInputRef.current?.click()} disabled={disabled}>
              <ImageIcon className="h-4 w-4" />
            </ToolbarButton>

            <AttachmentButton />

            {/* Headings dropdown */}
            <Select
              value={getCurrentHeadingValue()}
              onValueChange={value => {
                if (value === 'paragraph') {
                  editor.chain().focus().setParagraph().run();
                } else {
                  const level = parseInt(value.replace('h', ''));
                  editor
                    .chain()
                    .focus()
                    .toggleHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 })
                    .run();
                }
              }}
            >
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paragraph">Paragraph</SelectItem>
                <SelectItem value="h1">Heading 1</SelectItem>
                <SelectItem value="h2">Heading 2</SelectItem>
                <SelectItem value="h3">Heading 3</SelectItem>
                <SelectItem value="h4">Heading 4</SelectItem>
                <SelectItem value="h5">Heading 5</SelectItem>
                <SelectItem value="h6">Heading 6</SelectItem>
              </SelectContent>
            </Select>

            {/* Font Family dropdown */}
            <Select
              value={editor.getAttributes('textStyle').fontFamily || 'default'}
              onValueChange={value => {
                if (value === 'default') {
                  editor.chain().focus().unsetFontFamily().run();
                } else {
                  editor.chain().focus().setFontFamily(value).run();
                }
              }}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Times New Roman">Times</SelectItem>
                <SelectItem value="Courier New">Courier</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Verdana">Verdana</SelectItem>
              </SelectContent>
            </Select>

            {/* Font Size dropdown */}
            <Select
              value={editor.getAttributes('textStyle').fontSize || 'default'}
              onValueChange={value => {
                if (value === 'default') {
                  editor.chain().focus().unsetFontSize().run();
                } else {
                  editor.chain().focus().setFontSize(value).run();
                }
              }}
            >
              <SelectTrigger className="w-[80px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                <SelectItem value="12px">12px</SelectItem>
                <SelectItem value="14px">14px</SelectItem>
                <SelectItem value="16px">16px</SelectItem>
                <SelectItem value="18px">18px</SelectItem>
                <SelectItem value="20px">20px</SelectItem>
                <SelectItem value="24px">24px</SelectItem>
                <SelectItem value="28px">28px</SelectItem>
                <SelectItem value="32px">32px</SelectItem>
                <SelectItem value="36px">36px</SelectItem>
                <SelectItem value="48px">48px</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
          </>
        )}
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />

      {/* Hidden file input for image uploads */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            handleImageUpload(file);
          }
          // Reset the input value so the same file can be selected again
          e.target.value = '';
        }}
      />

      {/* Hidden file input for file attachments */}
      <input
        type="file"
        ref={attachmentInputRef}
        style={{ display: 'none' }}
        accept="*/*"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileAttachment(file);
          }
          // Reset the input value so the same file can be selected again
          e.target.value = '';
        }}
      />
    </div>
  );
}

// Component for displaying rich text content (read-only)
interface RichTextDisplayProps {
  content: string;
  className?: string;
  onContentChange?: (newContent: string) => void;
  onProgressChange?: (progress: { completed: number; total: number; percentage: number }) => void;
}

export function RichTextDisplay({ content, className, onContentChange, onProgressChange }: RichTextDisplayProps) {
  // Helper function to calculate checkbox progress from editor content
  const calculateProgress = React.useCallback(
    (editor: any) => {
      if (!editor || !onProgressChange) return;

      // Use requestAnimationFrame to ensure DOM has been updated
      requestAnimationFrame(() => {
        const editorElement = editor.view.dom;
        const checkboxes = editorElement.querySelectorAll('input[type="checkbox"]') as NodeListOf<HTMLInputElement>;

        const total = checkboxes.length;
        const completed = Array.from(checkboxes).filter(checkbox => checkbox.checked).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

        onProgressChange({ completed, total, percentage });
      });
    },
    [onProgressChange]
  );

  // Handle both plain text and HTML content
  const processedContent = React.useMemo(() => {
    if (!content) return '';

    // If content looks like HTML (contains tags), use it as-is
    if (content.includes('<') && content.includes('>')) {
      return content;
    }

    // Otherwise, convert plain text to HTML with line breaks
    return content
      .split('\n')
      .map(line => `<p>${line || '<br>'}</p>`)
      .join('');
  }, [content]);

  const editor = useEditor({
    extensions: getEditorExtensions(),
    content: processedContent,
    editable: false, // Always read-only for display
    onCreate: ({ editor }) => {
      // Calculate initial progress after DOM is ready
      setTimeout(() => calculateProgress(editor), 50);

      if (onContentChange) {
        // Add click handlers for task items
        editor.view.dom.addEventListener('click', event => {
          const target = event.target as HTMLElement;

          // Handle checkbox clicks with hierarchical behavior
          if (target.tagName === 'INPUT' && target.getAttribute('type') === 'checkbox') {
            handleHierarchicalCheckboxClick(editor, target, event, onContentChange, calculateProgress);
            return;
          }
          // For non-checkbox clicks, do nothing - let them bubble up naturally
        });
      }

      // Add click handlers for file attachments
      editor.view.dom.addEventListener('click', event => {
        const target = event.target as HTMLElement;
        const fileAttachment = target.closest('[data-type="file-attachment"]') as HTMLElement;

        if (fileAttachment) {
          handleFileAttachmentClick(fileAttachment, event);
        }
      });
    },
    editorProps: {
      attributes: {
        class: cn(getEditorAttributes(className).class, onContentChange ? 'checkbox-only-mode' : ''),
        // Disable spellcheck in checkbox-only mode
        ...(onContentChange ? { spellcheck: 'false' } : {}),
      },
    },
  });

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && processedContent !== editor.getHTML()) {
      editor.commands.setContent(processedContent);
      // Recalculate progress after content update
      setTimeout(() => calculateProgress(editor), 50);
    }
  }, [editor, processedContent]); // Removed calculateProgress dependency to prevent re-renders

  // Calculate progress on initial render and when editor becomes available
  useEffect(() => {
    if (editor) {
      calculateProgress(editor);
    }
  }, [editor]); // Removed calculateProgress dependency to prevent re-renders

  if (!editor) {
    return null;
  }

  return <EditorContent editor={editor} />;
}

// Helper function to get file icon based on MIME type
function getFileIcon(fileType: string): string {
  if (fileType.includes('pdf')) return '📄';
  if (fileType.includes('word') || fileType.includes('document')) return '📝';
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
  if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📈';
  if (fileType.includes('text')) return '📋';
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return '🗜️';
  if (fileType.includes('image')) return '🖼️';
  if (fileType.includes('video')) return '🎥';
  if (fileType.includes('audio')) return '🎵';
  if (fileType.includes('code') || fileType.includes('script')) return '💻';
  if (fileType.includes('json') || fileType.includes('xml')) return '📦';
  if (fileType.includes('markdown')) return '📖';
  if (fileType.includes('font')) return '🔤';
  if (fileType.includes('database')) return '🗄️';
  if (fileType.includes('binary') || fileType.includes('application')) return '🔢';
  return '📎';
}

function canViewInBrowser(fileName: string): boolean {
  const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
  const viewableTypes = ['pdf', 'txt', 'html', 'htm', 'json', 'xml', 'csv'];
  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
  const videoTypes = ['mp4', 'mov'];
  return [...viewableTypes, ...imageTypes, ...videoTypes].includes(fileExtension);
}
