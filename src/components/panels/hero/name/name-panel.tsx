import { Button, Popover, Space } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';
import { ButtonGroup } from '@/components/controls/button-group/button-group';
import { HeroModalType } from '@/enums/hero-modal-type';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useState } from 'react';

interface Props {
	onShowState: (type: HeroModalType) => void;
}

// The hero's tools - inventory, projects, titles, respite, and the customize
// screen that holds the stat bonuses. A Stamina bonus is how a hero's max stamina
// gets raised (an item such as the Bloodbound Band carries one), which carries
// through to their recovery value, winded and death thresholds. These used to sit
// in a name plate below the app header; they're a header control now so the
// sheet only pays for one bar. The collapsed button carries a grid rather than
// a wrench: it opens a set of the sheet's other screens. It also has to read
// apart from the section menu's list glyph sitting next to it.
export const HeroToolsPanel = (props: Props) => {
	// Five labelled buttons are wider than the sheet's header can hold beside the
	// section menu and the edit group - they push the trailing Close button off
	// the right edge - so the tools stay collapsed until there is room for them.
	const collapse = useMediaQuery('(max-width: 1100px)');
	const [ open, setOpen ] = useState(false);

	// Picking a tool opens a modal over the sheet, so the menu that launched it
	// has done its job and should get out of the way.
	const choose = (type: HeroModalType) => {
		setOpen(false);
		props.onShowState(type);
	};

	if (collapse) {
		return (
			<Popover
				trigger='click'
				content={
					<Space orientation='vertical' style={{ minWidth: '190px' }}>
						<Button block={true} type='text' onClick={() => choose(HeroModalType.Inventory)}>Inventory</Button>
						<Button block={true} type='text' onClick={() => choose(HeroModalType.Projects)}>Projects</Button>
						<Button block={true} type='text' onClick={() => choose(HeroModalType.Titles)}>Titles</Button>
						<Button block={true} type='text' onClick={() => choose(HeroModalType.Respite)}>Respite</Button>
						<Button block={true} type='text' onClick={() => choose(HeroModalType.Customize)}>Customize</Button>
					</Space>
				}
				open={open}
				onOpenChange={setOpen}
			>
				<Button icon={<AppstoreOutlined />} title='Tools' />
			</Popover>
		);
	}

	return (
		<ButtonGroup
			buttons={[
				{ type: 'button', label: 'Inventory', onClick: () => props.onShowState(HeroModalType.Inventory) },
				{ type: 'button', label: 'Projects', onClick: () => props.onShowState(HeroModalType.Projects) },
				{ type: 'button', label: 'Titles', onClick: () => props.onShowState(HeroModalType.Titles) },
				{ type: 'button', label: 'Respite', onClick: () => props.onShowState(HeroModalType.Respite) },
				{ type: 'button', label: 'Customize', onClick: () => props.onShowState(HeroModalType.Customize) }
			]}
		/>
	);
};
