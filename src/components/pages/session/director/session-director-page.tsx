import { Alert, Button, Segmented, Space } from 'antd';
import { AppFooter, FooterParams } from '@/components/panels/app-footer/app-footer';
import { PlayCircleOutlined, ReadOutlined } from '@ant-design/icons';
import { AdventureLogic } from '@/logic/adventure-logic';
import { AppHeader } from '@/components/panels/app-header/app-header';
import { ButtonGroup } from '@/components/controls/button-group/button-group';
import { Counter } from '@/models/counter';
import { CounterRunPanel } from '@/components/panels/run/counter-run/counter-run-panel';
import { Empty } from '@/components/controls/empty/empty';
import { Encounter } from '@/models/encounter';
import { EncounterData } from '@/data/encounter-data';
import { EncounterRunPanel } from '@/components/panels/run/encounter-run/encounter-run-panel';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Format } from '@/utils/format';
import { Montage } from '@/models/montage';
import { MontageData } from '@/data/montage-data';
import { MontageRunPanel } from '@/components/panels/run/montage-run/montage-run-panel';
import { Negotiation } from '@/models/negotiation';
import { NegotiationData } from '@/data/negotiation-data';
import { NegotiationRunPanel } from '@/components/panels/run/negotiation-run/negotiation-run-panel';
import { NumberSpin } from '@/components/controls/number-spin/number-spin';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { TextInput } from '@/components/controls/text-input/text-input';
import { Utils } from '@/utils/utils';
import { useIsSmall } from '@/hooks/use-is-small';
import { useNavigation } from '@/hooks/use-navigation';
import { useSession } from '@/contexts/data-context';
import { useState } from 'react';
import { useTitle } from '@/hooks/use-title';

import './session-director-page.scss';

interface Props {
	sourcebooks: Sourcebook[];
	params: FooterParams;
	startEncounter: (encounter: Encounter) => Promise<string>;
	startMontage: (montage: Montage) => Promise<string>;
	startNegotiation: (negotiation: Negotiation) => Promise<string>;
	startCounter: (counter: Counter) => Promise<string>;
	updateEncounter: (encounter: Encounter) => void;
	updateMontage: (montage: Montage) => void;
	updateNegotiation: (negotiation: Negotiation) => void;
	updateCounter: (counter: Counter) => void;
	finishSessionElement: (id: string) => string | null;
}

export const SessionDirectorPage = (props: Props) => {
	const isSmall = useIsSmall();
	const navigation = useNavigation();
	const session = useSession();
	const [ selectedElementID, setSelectedElementID ] = useState<string | null>(() => {
		const options = AdventureLogic.getContentOptions(session);
		return options.length > 0 ? options[0].id : null;
	});
	const [ startElement, setStartElement ] = useState<string>('encounter');
	const [ newCounterName, setNewCounterName ] = useState<string>('');
	const [ newCounterValue, setNewCounterValue ] = useState<number>(0);
	useTitle('Session');

	const getSelector = () => {
		const options = AdventureLogic.getContentOptions(session).map(o => {
			return {
				value: o.id,
				label: o.name
			};
		});

		if (options.length <= 1) {
			return null;
		}

		return (
			<div className='session-page-content-selector'>
				<Segmented
					options={options}
					value={selectedElementID}
					onChange={setSelectedElementID}
				/>
			</div>
		);
	};

	const getSelectedContent = () => {
		if (selectedElementID) {
			const encounter = session.encounters.find(e => e.id === selectedElementID);
			if (encounter) {
				return (
					<div className='session-page-content-container'>
						<EncounterRunPanel
							key={encounter.id}
							encounter={encounter}
							sourcebooks={props.sourcebooks}
							onChange={props.updateEncounter}
						/>
					</div>
				);
			}

			const montage = session.montages.find(m => m.id === selectedElementID);
			if (montage) {
				return (
					<div className='session-page-content-container'>
						<MontageRunPanel
							key={montage.id}
							montage={montage}
							onChange={props.updateMontage}
						/>
					</div>
				);
			}

			const negotiation = session.negotiations.find(n => n.id === selectedElementID);
			if (negotiation) {
				return (
					<div className='session-page-content-container'>
						<NegotiationRunPanel
							key={negotiation.id}
							negotiation={negotiation}
							onChange={props.updateNegotiation}
						/>
					</div>
				);
			}

			const counter = session.counters.find(c => c.id === selectedElementID);
			if (counter) {
				return (
					<div className='session-page-content-container'>
						<CounterRunPanel
							key={counter.id}
							counter={counter}
							onChange={props.updateCounter}
						/>
					</div>
				);
			}
		}

		const options = AdventureLogic.getContentOptions(session);
		if (options.length === 0) {
			return (
				<Empty text='Nothing is currently in progress.' />
			);
		}

		return null;
	};

	const getStartContent = () => {
		const startEncounter = (encounter: Encounter) => {
			props.startEncounter(encounter).then(setSelectedElementID);
		};

		const startMontage = (montage: Montage) => {
			props.startMontage(montage).then(setSelectedElementID);
		};

		const startNegotiation = (negotiation: Negotiation) => {
			props.startNegotiation(negotiation).then(setSelectedElementID);
		};

		const startCounter = () => {
			const counter = {
				id: Utils.guid(),
				name: newCounterName || 'New Counter',
				description: '',
				value: newCounterValue
			};
			setNewCounterName('');
			setNewCounterValue(0);

			props.startCounter(counter).then(setSelectedElementID);
		};

		const exampleEncounters = [
			EncounterData.goblinAmbush,
			EncounterData.dragonAttack
		];

		const exampleMontages = [
			MontageData.fightFire,
			MontageData.infiltrateThePalace,
			MontageData.prepareForBattle,
			MontageData.trackTheFugitive,
			MontageData.wildernessRace
		];

		const exampleNegotiations = [
			NegotiationData.banditChief,
			NegotiationData.knight,
			NegotiationData.guildmaster,
			NegotiationData.warlord,
			NegotiationData.burgomaster,
			NegotiationData.virtuoso,
			NegotiationData.highPriest,
			NegotiationData.duke,
			NegotiationData.dragon,
			NegotiationData.monarch,
			NegotiationData.lich,
			NegotiationData.deity
		];

		switch (startElement) {
			case 'encounter':
				return (
					<Space orientation='vertical' style={{ width: '100%' }}>
						<div className='ds-text bold-text'>Your encounters:</div>
						{
							SourcebookLogic.getEncounters(props.sourcebooks).map(e => (
								<Button key={e.id} block={true} onClick={() => startEncounter(e)}>{e.name || 'Unnamed Encounter'}</Button>
							))
						}
						{
							SourcebookLogic.getEncounters(props.sourcebooks).length === 0 ?
								<Alert
									type='warning'
									showIcon={true}
									title='You have not created any encounters.'
									action={<Button type='text' title='Encounters' icon={<ReadOutlined />} onClick={() => navigation.goToLibrary('encounter')} />}
								/>
								: null
						}
						<div className='ds-text bold-text'>Example encounters:</div>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
							{
								exampleEncounters.map(e => (
									<Button key={e.id} block={true} onClick={() => startEncounter(e)}>{e.name}</Button>
								))
							}
						</div>
					</Space>
				);
			case 'montage':
				return (
					<Space orientation='vertical' style={{ width: '100%' }}>
						<div className='ds-text bold-text'>Your montages:</div>
						{
							SourcebookLogic.getMontages(props.sourcebooks).map(m => (
								<Button key={m.id} block={true} onClick={() => startMontage(m)}>{m.name || 'Unnamed Montage'}</Button>
							))
						}
						{
							SourcebookLogic.getMontages(props.sourcebooks).length === 0 ?
								<Alert
									type='warning'
									showIcon={true}
									title='You have not created any montages.'
									action={<Button type='text' title='Montages' icon={<ReadOutlined />} onClick={() => navigation.goToLibrary('montage')} />}
								/>
								: null
						}
						<div className='ds-text bold-text'>Example montages:</div>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
							{
								exampleMontages.map(m => (
									<Button key={m.id} block={true} onClick={() => startMontage(m)}>{m.name}</Button>
								))
							}
						</div>
					</Space>
				);
			case 'negotiation':
				return (
					<Space orientation='vertical' style={{ width: '100%' }}>
						<div className='ds-text bold-text'>Your negotiations:</div>
						{
							SourcebookLogic.getNegotiations(props.sourcebooks).map(n => (
								<Button key={n.id} block={true} onClick={() => startNegotiation(n)}>{n.name || 'Unnamed Negotiation'}</Button>
							))
						}
						{
							SourcebookLogic.getNegotiations(props.sourcebooks).length === 0 ?
								<Alert
									type='warning'
									showIcon={true}
									title='You have not created any negotiations.'
									action={<Button type='text' title='Negotiations' icon={<ReadOutlined />} onClick={() => navigation.goToLibrary('negotiation')} />}
								/>
								: null
						}
						<div className='ds-text bold-text'>Example negotiations:</div>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }}>
							{
								exampleNegotiations.map(n => (
									<Button key={n.id} block={true} onClick={() => startNegotiation(n)}>{n.name}</Button>
								))
							}
						</div>
					</Space>
				);
			case 'counter':
				return (
					<Space orientation='vertical' style={{ width: '100%' }}>
						<div className='ds-text bold-text'>Create a new counter:</div>
						<TextInput
							placeholder='Counter Name'
							allowClear={true}
							value={newCounterName}
							onChange={setNewCounterName}
						/>
						<NumberSpin label='Starting Value' value={newCounterValue} onChange={setNewCounterValue} />
						<Button block={true} onClick={() => startCounter()}>Create counter</Button>
					</Space>
				);
		}
	};

	const finish = () => {
		if (selectedElementID) {
			const id = props.finishSessionElement(selectedElementID);
			setSelectedElementID(id);
		}
	};

	return (
		<ErrorBoundary>
			<div className='session-director-page'>
				<AppHeader subheader='Session'>
					<ButtonGroup
						buttons={[
							{
								type: 'dropdown',
								label: isSmall ? undefined : 'Start',
								icon: <PlayCircleOutlined />,
								primary: true,
								popover: (
									<div style={{ width: '500px', display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
										<Segmented
											name='startelements'
											block={true}
											options={[ 'encounter', 'montage', 'negotiation', 'counter' ].map(o => ({ value: o, label: Format.capitalize(o) }))}
											value={startElement}
											onChange={setStartElement}
										/>
										{getStartContent()}
									</div>
								)
							},
							{ type: 'danger', label: isSmall ? undefined : 'Finish', disabled: !selectedElementID, onClick: finish }
						]}
					/>
				</AppHeader>
				<ErrorBoundary>
					<div className='session-director-page-content'>
						{getSelector()}
						{getSelectedContent()}
					</div>
				</ErrorBoundary>
				<AppFooter
					page='session'
					params={props.params}
				/>
			</div>
		</ErrorBoundary>
	);
};
