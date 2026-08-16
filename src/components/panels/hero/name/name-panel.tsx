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

	if (isSmall) {
		return (
			<Popover
				content={
					<Space orientation='vertical'>
						<Button block={true} type='text' onClick={() => props.onShowState(HeroModalType.Inventory)}>Inventory</Button>
						<Button block={true} type='text' onClick={() => props.onShowState(HeroModalType.Projects)}>Projects</Button>
						<Button block={true} type='text' onClick={() => props.onShowState(HeroModalType.Titles)}>Titles</Button>
						<Button block={true} type='text' onClick={() => props.onShowState(HeroModalType.Respite)}>Respite</Button>
						<Divider />
						<Button block={true} type='text' icon={<ToolOutlined />} onClick={() => props.onShowState(HeroModalType.Customize)}>Customize</Button>
						<Button block={true} type='text' icon={<ControlOutlined />} onClick={() => props.onShowState(HeroModalType.Conditional)}>Conditional Features</Button>
					</Space>
				}
			>
				<Button icon={<ToolOutlined />} />
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
								<Space orientation='vertical' style={{ width: '150px' }}>
									<Button type='text' block={true} icon={<ToolOutlined />} onClick={() => { props.onShowState(HeroModalType.Customize); setOpen(false); }}>Customize</Button>
									<Button type='text' block={true} icon={<ControlOutlined />} onClick={() => { props.onShowState(HeroModalType.Conditional); setOpen(false); }}>Conditional Features</Button>
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
