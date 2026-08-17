import { Button, Divider, Popover, Space } from 'antd';
import { ControlOutlined, CopyOutlined, DeleteOutlined, EllipsisOutlined, SettingOutlined, ToolOutlined, UploadOutlined } from '@ant-design/icons';
import { ButtonGroup } from '@/components/controls/button-group/button-group';
import { HeroModalType } from '@/enums/hero-modal-type';
import { useIsSmall } from '@/hooks/use-is-small';
import { useState } from 'react';

interface Props {
	onShowState: (type: HeroModalType) => void;
	// On a phone this panel is the sheet's only menu, so it also carries what
	// used to sit behind the overflow and settings icons beside it. Three
	// icons that all read as "more" is worse than one that means it.
	onCopy?: () => void;
	onExport?: () => void;
	onDelete?: () => void;
	onShowSettings?: () => void;
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

	const run = (action?: () => void) => {
		setOpen(false);
		if (action) {
			action();
		}
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
						<Button block={true} type='text' icon={<ToolOutlined />} onClick={() => choose(HeroModalType.Customize)}>Customize</Button>
						<Button block={true} type='text' icon={<ControlOutlined />} onClick={() => choose(HeroModalType.Conditional)}>Conditional Features</Button>
						{
							props.onCopy || props.onExport || props.onDelete ?
								<>
									<Divider />
									{props.onCopy ? <Button block={true} type='text' icon={<CopyOutlined />} onClick={() => run(props.onCopy)}>Copy hero</Button> : null}
									{props.onExport ? <Button block={true} type='text' icon={<UploadOutlined />} onClick={() => run(props.onExport)}>Export as Data</Button> : null}
									{props.onDelete ? <Button block={true} type='text' danger={true} icon={<DeleteOutlined />} onClick={() => run(props.onDelete)}>Delete hero</Button> : null}
								</>
								: null
						}
						{
							props.onShowSettings ?
								<>
									<Divider />
									<Button block={true} type='text' icon={<SettingOutlined />} onClick={() => run(props.onShowSettings)}>Settings</Button>
								</>
								: null
						}
					</Space>
				}
				open={open}
				onOpenChange={setOpen}
			>
				<Button type='text' icon={<SettingOutlined />} title='Hero menu' />
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
									<Button type='text' block={true} icon={<ToolOutlined />} onClick={() => choose(HeroModalType.Customize)}>Customize</Button>
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
