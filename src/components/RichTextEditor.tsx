import React, { useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './quill-custom.css';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder = "Write your email content here...",
  height = "300px"
}) => {
  const quillRef = useRef<ReactQuill>(null);

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'script': 'sub'}, { 'script': 'super' }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'direction': 'rtl' }],
      [{ 'align': [] }],
      ['link', 'image', 'video'],
      ['blockquote', 'code-block'],
      ['clean']
    ],
    clipboard: {
      matchVisual: false,
      matchers: []
    }
  };

  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'script',
    'list', 'bullet',
    'indent',
    'direction', 'align',
    'link', 'image', 'video',
    'blockquote', 'code-block'
  ];

  const insertVariable = (variable: string) => {
    const quill = quillRef.current?.getEditor();
    if (quill) {
      const cursorPosition = quill.getSelection()?.index || 0;
      quill.insertText(cursorPosition, `{${variable}}`, 'user');
      quill.setSelection(cursorPosition + variable.length + 2);
    }
  };

  // Expose the insertVariable function to parent components
  useEffect(() => {
    if (quillRef.current) {
      (quillRef.current as any).insertVariable = insertVariable;
    }
  }, []);

  return (
    <div className="bg-white border border-gray-300 rounded-lg">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        modules={modules}
        formats={formats}
        style={{
          height: height,
          marginBottom: '42px' // Account for toolbar height
        }}
      />
      
      {/* Variable buttons */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-300 rounded-b-lg">
        <div className="text-xs text-gray-600 mb-2">Quick Variables:</div>
        <div className="flex flex-wrap gap-2">
          {['Name', 'Company', 'Email', 'JobTitle', 'Industry', 'Date'].map((variable) => (
            <button
              key={variable}
              type="button"
              onClick={() => insertVariable(variable)}
              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200 transition-colors"
            >
              {`{${variable}}`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RichTextEditor;
