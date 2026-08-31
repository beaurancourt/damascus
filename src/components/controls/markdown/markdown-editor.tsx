import { BlockTypeSelect, BoldItalicUnderlineToggles, CodeToggle, ListsToggle, MDXEditor, UndoRedo, headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin, toolbarPlugin } from '@mdxeditor/editor';

import '@mdxeditor/editor/style.css';
import './markdown.scss';

interface Props {
	value: string;
	placeholder?: string;
	onChange: (value: string) => void;
}

// The MDXEditor library (and its parser) is heavy and only needed when
// someone actually edits markdown, so it's code-split behind a lazy boundary:
// this module is loaded on demand, not at app boot.
export default function MarkdownEditorInner(props: Props) {
	return (
		<MDXEditor
			className='markdown-editor'
			placeholder={props.placeholder}
			plugins={[
				headingsPlugin(),
				listsPlugin(),
				quotePlugin(),
				thematicBreakPlugin(),
				toolbarPlugin({
					toolbarClassName: 'markdown-editor-toolbar',
					toolbarContents: () => (
						<>
							<UndoRedo />
							<BlockTypeSelect />
							<BoldItalicUnderlineToggles />
							<ListsToggle />
							<CodeToggle />
						</>
					)
				})
			]}
			markdown={props.value}
			onChange={props.onChange}
		/>
	);
}
