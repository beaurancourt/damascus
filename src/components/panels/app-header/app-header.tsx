import { AppMode } from '@/utils/app-mode';
import { Button } from 'antd';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { LogoPanel } from '@/components/panels/logo/logo-panel';
import { ReactNode } from 'react';
import { SettingOutlined } from '@ant-design/icons';
import { useIsSmall } from '@/hooks/use-is-small';

import './app-header.scss';

interface Props {
	subheader?: string;
	// Names the thing on screen rather than the section - the hero sheet puts
	// its hero here so the name doesn't need a second bar of its own. Takes the
	// place of the logo, and unlike the logo it shows on small screens too,
	// where the left of the bar was otherwise empty.
	title?: ReactNode;
	// Opens settings. On the player site the bar at the bottom is on its way
	// out, so settings rides up here with the rest of the page's actions; the
	// GM site still keeps it in the footer.
	showSettings?: () => void;
	children?: ReactNode;
}

export const AppHeader = (props: Props) => {
	const isSmall = useIsSmall();

	return (
		<ErrorBoundary>
			<div className='app-header'>
				<div className='left-section'>
					{props.title ? <div className='app-header-title'>{props.title}</div> : null}
					{!isSmall && !props.title ? <LogoPanel text={props.subheader} /> : null}
				</div>
				<div className='right-section'>
					{props.children}
					{
						AppMode.isPlayer && props.showSettings ?
							<Button type='text' icon={<SettingOutlined />} title='Settings' onClick={props.showSettings} />
							: null
					}
				</div>
			</div>
		</ErrorBoundary>
	);
};
