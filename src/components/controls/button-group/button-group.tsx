import { Button, Divider, Popover, Space } from 'antd';
import { ReactNode, useState } from 'react';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';

import './button-group.scss';

export interface ButtonConfig {
	type: 'button';
	label?: string;
	tooltip?: string;
	icon?: ReactNode;
	primary?: boolean;
	disabled?: boolean;
	onClick: () => void;
}

export interface DangerConfig {
	type: 'danger';
	label?: string;
	icon?: ReactNode;
	disabled?: boolean;
	disabledMessage?: string;
	onClick: () => void;
}

export interface DropdownConfig {
	type: 'dropdown';
	label?: string;
	tooltip?: string;
	icon?: ReactNode;
	primary?: boolean;
	disabled?: boolean;
	popover: ReactNode;
}

export interface ControlConfig {
	type: 'control';
	control: ReactNode;
}

interface ButtonGroupProps {
	buttons: (ButtonConfig | DangerConfig | DropdownConfig | ControlConfig | null)[];
}

const DropdownButtonItem = ({ config }: { config: DropdownConfig }) => {
	const [ open, setOpen ] = useState(false);
	return (
		<Popover
			className='dropdown'
			trigger='click'
			open={open}
			onOpenChange={setOpen}
			content={(
				<div onClick={() => setOpen(false)}>
					{config.popover}
				</div>
			)}
		>
			<Button type={config.primary ? 'primary' : 'text'} disabled={config.disabled} icon={config.icon} title={config.tooltip}>
				{config.label}
			</Button>
		</Popover>
	);
};

export const ButtonGroup = (props: ButtonGroupProps) => {
	return (
		<ErrorBoundary>
			<div className='button-group'>
				<Space size={2} separator={<Divider orientation='vertical' />}>
					{
						props.buttons.filter(item => !!item).map((item, n) => {
							switch (item.type) {
								case 'button':
									return (
										<Button key={n} type={item.primary ? 'primary' : 'text'} disabled={item.disabled} icon={item.icon} title={item.tooltip} onClick={item.onClick}>
											{item.label}
										</Button>
									);
								case 'danger':
									return (
										<DangerButton mode={item.label ? 'inline' : 'icon'} label={item.label} icon={item.icon} disabled={item.disabled} disabledMessage={item.disabledMessage} onConfirm={() => item.onClick()} />
									);
								case 'dropdown':
									return (
										<DropdownButtonItem key={n} config={item} />
									);
								case 'control':
									return item.control;
							}
						})
					}
				</Space>
			</div>
		</ErrorBoundary>
	);
};
