import { Button, Popover, Space } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';
import { useState } from 'react';

// The hero sheet runs to about nine phone screens, so it needs a way to reach a
// section without scrolling for it. The list is read from the sheet itself
// (elements marked data-hero-section) rather than declared here, so a hero with
// no maneuvers or no conditions simply doesn't offer them - there's no second
// place that has to know which sections a given hero renders.
export const SectionMenuPanel = () => {
	const [ open, setOpen ] = useState(false);
	const [ sections, setSections ] = useState<string[]>([]);

	const readSections = () => {
		const found = Array.from(document.querySelectorAll('[data-hero-section]'))
			.map(el => el.getAttribute('data-hero-section'))
			.filter((name): name is string => !!name);
		setSections(found);
	};

	const goTo = (name: string) => {
		setOpen(false);
		const el = document.querySelector(`[data-hero-section="${name}"]`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	};

	return (
		<Popover
			trigger='click'
			open={open}
			onOpenChange={next => {
				if (next) {
					readSections();
				}
				setOpen(next);
			}}
			content={
				<Space orientation='vertical' style={{ width: '180px' }}>
					{sections.map(name => (
						<Button key={name} block={true} type='text' onClick={() => goTo(name)}>{name}</Button>
					))}
				</Space>
			}
		>
			<Button icon={<UnorderedListOutlined />} title='Jump to a section' />
		</Popover>
	);
};
