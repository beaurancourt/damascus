import { BookOutlined, PlayCircleOutlined, SettingOutlined, TeamOutlined, WarningFilled } from '@ant-design/icons';
import { Button, Divider, Flex, Space } from 'antd';
import { ButtonConfig, ButtonGroup } from '@/components/controls/button-group/button-group';
import { AppMode } from '@/utils/app-mode';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { SyncStatus } from '@/components/panels/sync-status/sync-status';
import shield from '@/assets/shield.png';
import { useIsSmall } from '@/hooks/use-is-small';
import { useNavigation } from '@/hooks/use-navigation';

import './app-footer.scss';

export interface FooterParams {
	errorsExist: boolean;
	showSettings: () => void;
	showErrors: () => void;
}

interface Props {
	page: 'welcome' | 'heroes' | 'library' | 'session' | 'player-view';
	params: FooterParams;
}

export const AppFooter = (props: Props) => {
	const isSmall = useIsSmall();
	const navigation = useNavigation();

	// The player site is one section deep, so a bar whose job is switching
	// between sections had nothing to offer; settings, sync and errors moved to
	// the header. The GM site still needs it to reach Library and Session.
	if (AppMode.isPlayer) {
		return null;
	}

	// The player site shows settings in the header instead; see AppHeader.
	const actions: ButtonConfig[] = AppMode.isPlayer ?
		[]
		: [
			{ type: 'button', label: isSmall ? undefined : 'Settings', icon: <SettingOutlined />, tooltip: 'Settings', onClick: props.params.showSettings }
		];
	if (props.params.errorsExist) {
		actions.push({ type: 'button', icon: <WarningFilled className='danger' />, tooltip: 'Errors', onClick: props.params.showErrors });
	}

	return (
		<ErrorBoundary>
			<div className='app-footer'>
				{
					(props.page === 'player-view') ?
						<div />
						:
						<Flex className='navigation-buttons-panel' align='center' gap={2}>
							<Button type='text' className={props.page === 'welcome' ? 'selected' : ''} icon={<img className='logo-icon' src={shield} />} onClick={() => navigation.goToWelcome()} />
							{
								AppMode.hasHeroes ?
									<>
										<Divider orientation='vertical' />
										<Button type='text' className={props.page === 'heroes' ? 'selected' : ''} icon={<TeamOutlined />} onClick={() => navigation.goToHeroList()}>
											{isSmall ? null : 'Heroes'}
										</Button>
									</>
									: null
							}
							{
								AppMode.hasLibrary ?
									<>
										<Divider orientation='vertical' />
										<Button type='text' className={props.page === 'library' ? 'selected' : ''} icon={<BookOutlined />} onClick={() => navigation.goToLibrary('ancestry')}>
											{isSmall ? null : 'Library'}
										</Button>
									</>
									: null
							}
							{
								AppMode.hasSession ?
									<>
										<Divider orientation='vertical' />
										<Button type='text' className={props.page === 'session' ? 'selected' : ''} icon={<PlayCircleOutlined />} onClick={() => navigation.goToSession()}>
											{isSmall ? null : 'Session'}
										</Button>
									</>
									: null
							}
						</Flex>
				}
				<Space>
					<SyncStatus />
					<ButtonGroup buttons={actions} />
				</Space>
			</div>
		</ErrorBoundary>
	);
};
