import { Alert, Flex, Progress } from 'antd';
import { SetStateAction, useEffect, useState } from 'react';
import { CheckIcon } from '@/components/controls/check-icon/check-icon';
import { CheckLabel } from '@/components/controls/check-label/check-label';
import { DataService } from '@/services/data-service';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroUpdateLogic } from '@/logic/update/hero-update-logic';
import { LocalService } from '@/services/storage/local-service';
import { Options } from '@/models/options';
import { OptionsUpdateLogic } from '@/logic/update/options-update-logic';
import { Session } from '@/models/session';
import { SessionUpdateLogic } from '@/logic/update/session-update-logic';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { SourcebookUpdateLogic } from '@/logic/update/sourcebook-update-logic';
import { useIsSmall } from '@/hooks/use-is-small';

import './data-loader.scss';

export interface LoadedData {
	service: DataService;
	heroes: Hero[];
	homebrewSourcebooks: Sourcebook[];
	session: Session;
	options: Options;
};

interface Props {
	onComplete: (data: LoadedData) => void;
}

type LoadingStatus = 'pending' | 'success' | 'failure' | undefined;

export const DataLoader = (props: Props) => {
	const [ heroesState, setHeroesState ] = useState<LoadingStatus>(undefined);
	const [ heroesProgress, setHeroesProgress ] = useState<number>(0);
	const [ sourcebookState, setSourcebookState ] = useState<LoadingStatus>(undefined);
	const [ optionsState, setOptionsState ] = useState<LoadingStatus>(undefined);
	const [ sessionState, setSessionState ] = useState<LoadingStatus>(undefined);
	const [ overallLoadState, setOverallLoadState ] = useState<LoadingStatus>('pending');
	const [ error, setError ] = useState<string | null>(null);
	const isSmall = useIsSmall();

	async function updateLoadingStatus<T>(getterPromise: Promise<T>, setStateFunc: (value: SetStateAction<LoadingStatus>) => void): Promise<T> {
		return getterPromise
			.then(result => {
				setStateFunc('success');
				return result;
			})
			.catch(reason => {
				setStateFunc('failure');
				throw reason;
			});
	};

	const loadData = () => {
		setError(null);
		setOverallLoadState('pending');

		setSourcebookState('pending');
		setHeroesState('pending');
		setSessionState('pending');
		setOptionsState('pending');

		const dataService = new DataService(new LocalService());

		dataService.initialize().then(() => {
			const promises = [
				updateLoadingStatus(dataService.getHomebrew(), setSourcebookState),
				updateLoadingStatus(dataService.getHeroes(), setHeroesState).finally(() => setHeroesProgress(100)),
				updateLoadingStatus(dataService.getSession(), setSessionState),
				updateLoadingStatus(dataService.getOptions(), setOptionsState)
			];

			Promise.all(promises).then(results => {
				const sourcebooks = results[0] as Sourcebook[];
				sourcebooks.forEach(sourcebook => {
					try {
						SourcebookUpdateLogic.updateSourcebook(sourcebook);
					} catch (error) {
						console.error(`Error while updating sourcebook [${sourcebook.name} - ${sourcebook.id}]`, error);
					}
				});

				const heroes = results[1] as Hero[];
				heroes.forEach(hero => {
					try {
						HeroUpdateLogic.updateHero(hero, SourcebookLogic.getSourcebooks(sourcebooks));
					} catch (error) {
						console.error(`Error while updating hero [${hero.name} - ${hero.id}]`, error);
					}
				});

				const session = results[2] as Session;
				SessionUpdateLogic.updateSession(session);

				const options = results[3] as Options;
				OptionsUpdateLogic.updateOptions(options);
				if (isSmall) {
					options.compactView = true;
				}

				setOverallLoadState('success');

				props.onComplete({
					service: dataService,
					heroes: heroes,
					homebrewSourcebooks: sourcebooks,
					session: session,
					options: options
				});
			}).catch(reason => {
				console.error(reason);
				setError(reason.message);
				setOverallLoadState('failure');
			});
		}).catch(reason => {
			console.error(reason);
			setError(reason.message);
			setOverallLoadState('failure');
		});
	};

	useEffect(
		loadData,
		// Empty deps: only run once on mount.
		[]
	);

	return (
		<div className='data-loader'>
			<div className='data-loader-container'>
				<div className='overall-state'>
					<CheckIcon state={overallLoadState} />
				</div>
				<HeaderText level={1}>Loading Data</HeaderText>
				<Flex vertical={true}>
					<Flex className='load-states' vertical={true}>
						<CheckLabel state={sourcebookState}>Sourcebooks</CheckLabel>
						<CheckLabel state={heroesState}>Heroes</CheckLabel>
						<Progress percent={heroesProgress} size='small' showInfo={false} />
						<CheckLabel state={sessionState}>Session</CheckLabel>
						<CheckLabel state={optionsState}>Options</CheckLabel>
					</Flex>
					{
						error ?
							<Alert
								type='error'
								showIcon={true}
								title='Data load error'
								description={error}
								style={{ width: '350px' }}
							/>
							: null
					}
				</Flex>
			</div>
		</div>
	);
};
