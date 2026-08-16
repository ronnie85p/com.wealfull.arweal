import { useEffect, useRef } from 'react'

interface RichEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  rows?: number
}

function ToolbarBtn({
  label,
  title,
  onRun,
}: {
  label: string
  title: string
  onRun: () => void
}) {
  return (
    <button
      type="button"
      className="rich-btn"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onRun}
      dangerouslySetInnerHTML={{ __html: label }}
    />
  )
}

export default function RichEditor({ value, onChange, placeholder, rows = 3 }: RichEditorProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value
    }
  }, [value])

  function exec(cmd: string, arg?: string) {
    ref.current?.focus()
    document.execCommand(cmd, false, arg)
    onChange(ref.current?.innerHTML ?? '')
  }

  function addLink() {
    const url = window.prompt('Link URL')
    if (url) exec('createLink', url)
  }

  return (
    <div className="rich-editor">
      <div className="rich-toolbar">
        <ToolbarBtn label="<b>B</b>" title="Bold" onRun={() => exec('bold')} />
        <ToolbarBtn label="<i>I</i>" title="Italic" onRun={() => exec('italic')} />
        <ToolbarBtn label="<u>U</u>" title="Underline" onRun={() => exec('underline')} />
        <ToolbarBtn label="<s>S</s>" title="Strikethrough" onRun={() => exec('strikeThrough')} />
        <span className="rich-sep" />
        <ToolbarBtn label="• List" title="Bulleted list" onRun={() => exec('insertUnorderedList')} />
        <ToolbarBtn label="1. List" title="Numbered list" onRun={() => exec('insertOrderedList')} />
        <span className="rich-sep" />
        <ToolbarBtn label="🔗" title="Insert link" onRun={addLink} />
        <ToolbarBtn label="✕" title="Remove formatting" onRun={() => exec('removeFormat')} />
      </div>
      <div
        ref={ref}
        className="rich-content"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        style={{ minHeight: rows * 22 }}
        onInput={() => onChange(ref.current?.innerHTML ?? '')}
        onBlur={() => onChange(ref.current?.innerHTML ?? '')}
      />
    </div>
  )
}