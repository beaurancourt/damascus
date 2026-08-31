import { Suspense, lazy, useEffect, useState } from 'react';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Utils } from '@/utils/utils';
import { useDebounce } from '@/hooks/use-debounce';

// The MDXEditor library is only needed when someone edits markdown, so it's
// code-split into its own chunk (markdown-editor.tsx) and loaded on demand,
// keeping it out of the app's main boot bundle.
const LazyEditor = lazy(() => import('./markdown-editor'));

interface MarkdownProps {
	text: string;
	className?: string;
	useSpan?: boolean;
}

export const Markdown = (props: MarkdownProps) => {
	if (!props.text) {
		return null;
	}

	return (
		<ErrorBoundary>
			{
				props.useSpan ?
					<span className={props.className} dangerouslySetInnerHTML={{ __html: Utils.markdownToHtml(props.text.trim()) }} />
					:
					<div className={props.className} dangerouslySetInnerHTML={{ __html: Utils.markdownToHtml(props.text.trim()) }} />
			}
		</ErrorBoundary>
	);
};

interface MarkdownEditorProps {
	placeholder?: string;
	value: string;
	onChange: (value: string) => void;
}

export const MarkdownEditor = (props: MarkdownEditorProps) => {
	const [ value, setValue ] = useState(props.value);
	const debouncedValue = useDebounce(value);

	useEffect(
		() => props.onChange(debouncedValue),
		[ debouncedValue ]
	);

	const onChange = (str: string) => {
		const sanitized = str.replaceAll('\\<', '<');
		setValue(sanitized);
	};

	return (
		<Suspense fallback={<div className='ds-text'>Loading editor…</div>}>
			<LazyEditor value={value} onChange={onChange} placeholder={props.placeholder} />
		</Suspense>
	);
};
