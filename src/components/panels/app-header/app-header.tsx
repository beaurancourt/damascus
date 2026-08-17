import { SettingOutlined, WarningFilled } from '@ant-design/icons';
import { AppMode } from '@/utils/app-mode';
import { Button } from 'antd';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { FooterParams } from '@/components/panels/app-footer/app-footer';
import { LogoPanel } from '@/components/panels/logo/logo-panel';
import { ReactNode } from 'react';
import { SyncStatus } from '@/components/panels/sync-status/sync-status';
import { useIsSmall } from '@/hooks/use-is-small';

import './app-header.scss';

interface Props {
	subheader?: string;
	// Names the thing on screen rather than the section - the hero sheet puts
	// its hero here so the name doesn't need a second bar of its own. Takes the
	// place of the logo, and unlike the logo it shows on small screens too,
	// where the left of the bar was otherwise empty.
	title?: ReactNode;
	// The player site has no bottom bar, so the app-level controls that lived
	// there - settings, the sync indicator, the error warning - ride up here
	// with the page's own actions. The GM site still has a footer and doesn't
	// render these.
	params?: FooterParams;
	// A page can replace the plain settings cog with its own menu, so a screen
	// that already has two menus of its own doesn't end up wearing three.
	settingsMenu?: ReactNode;
	// Rendered after the app-level controls, so a page can keep "get me out of
	// here" in the corner where the thumb expects it.
	trailing?: ReactNode;
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
						AppMode.isPlayer && props.params ?
							<>
								<SyncStatus />
								{
									props.params.errorsExist ?
										<Button type='text' icon={<WarningFilled className='danger' />} title='Errors' onClick={props.params.showErrors} />
										: null
								}
								{
									props.settingsMenu ??
									<Button type='text' icon={<SettingOutlined />} title='Settings' onClick={props.params.showSettings} />
								}
							</>
							: null
					}
					{props.trailing}
				</div>
			</div>
		</ErrorBoundary>
	);
};
