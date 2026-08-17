import { Button, Divider, Popover, Space } from 'antd';
import { ControlOutlined, EllipsisOutlined, ToolOutlined } from '@ant-design/icons';
import { ButtonGroup } from '@/components/controls/button-group/button-group';
import { HeroModalType } from '@/enums/hero-modal-type';
import { useIsSmall } from '@/hooks/use-is-small';
import { useState } from 'react';

interface Props {
	onShowState: (type: HeroModalType) => void;
}

// The hero's tools - inventory, projects, titles, respite and the customization
// menus. These used to sit in a name plate below the app header; they're a
// header control now so the sheet only pays for one bar.
export const HeroToolsPanel = (props: Props) => {
	const isSmall = useIsSmall();
	const [ open, setOpen ] = useState(false);

	// Picking a tool opens a modal over the sheet, so the menu that launched it
	// has done its job and should get out of the way.
	const choose = (type: HeroModalType) => {
		setOpen(false);
		props.onShowState(type);
	};

	if (isSmall) {
		return (
			<Popover
				trigger='click'
				content={
					<Space orientation='vertical' style={{ minWidth: '190px' }}>
						<Button block={true} type='text' onClick={() => choose(HeroModalType.Inventory)}>Inventory</Button>
						<Button block={true} type='text' onClick={() => choose(HeroModalType.Projects)}>Projects</Button>
						<Button block={true} type='text' onClick={() => choose(HeroModalType.Titles)}>Titles</Button>
						<Button block={true} type='text' onClick={() => choose(HeroModalType.Respite)}>Respite</Button>
						<Divider />
						<Button block={true} type='text' icon={<ControlOutlined />} onClick={() => choose(HeroModalType.Conditional)}>Conditional Features</Button>
					</Space>
				}
				open={open}
				onOpenChange={setOpen}
			>
				<Button icon={<ToolOutlined />} title='Tools' />
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
				{
					type: 'control',
					control: (
						<Popover
							trigger='click'
							content={
								<Space orientation='vertical' style={{ width: '190px' }}>
									<Button type='text' block={true} icon={<ControlOutlined />} onClick={() => choose(HeroModalType.Conditional)}>Conditional Features</Button>
								</Space>
							}
							open={open}
							onOpenChange={setOpen}
						>
							<Button type='text' icon={<EllipsisOutlined />} />
						</Popover>
					)
				}
			]}
		/>
	);
};
