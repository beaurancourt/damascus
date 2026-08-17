import { AppFooter, FooterParams } from '@/components/panels/app-footer/app-footer';
import { Button, Divider, Popover, Space } from 'antd';
import { CloseOutlined, CopyOutlined, DeleteOutlined, EditOutlined, SettingOutlined, UploadOutlined } from '@ant-design/icons';
import { Navigate, useParams } from 'react-router';
import { useMemo, useState } from 'react';
import { Ability } from '@/models/ability';
import { Ancestry } from '@/models/ancestry';
import { AppHeader } from '@/components/panels/app-header/app-header';
import { ButtonGroup } from '@/components/controls/button-group/button-group';
import { Career } from '@/models/career';
import { Characteristic } from '@/enums/characteristic';
import { Complication } from '@/models/complication';
import { Culture } from '@/models/culture';
import { Domain } from '@/models/domain';
import { EncounterSlot } from '@/models/encounter-slot';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';
import { Feature } from '@/models/feature';
import { Fixture } from '@/models/fixture';
import { Follower } from '@/models/follower';
import { Hero } from '@/models/hero';
import { HeroClass } from '@/models/class';
import { HeroModalType } from '@/enums/hero-modal-type';
import { HeroPanel } from '@/components/panels/hero/hero-panel';
import { HeroToken } from '@/components/panels/token/token';
import { HeroToolsPanel } from '@/components/panels/hero/name/name-panel';
import { Kit } from '@/models/kit';
import { Monster } from '@/models/monster';
import { SectionMenuPanel } from '@/components/panels/hero/section-menu/section-menu-panel';
import { Sourcebook } from '@/models/sourcebook';
import { SummoningInfo } from '@/models/summon';
import { Title } from '@/models/title';
import { useHeroes } from '@/contexts/data-context';
import { useIsSmall } from '@/hooks/use-is-small';
import { useNavigation } from '@/hooks/use-navigation';
import { useTitle } from '@/hooks/use-title';

import './hero-view-page.scss';

interface Props {
	sourcebooks: Sourcebook[];
	params: FooterParams;
	exportHeroData: (hero: Hero) => void;
	copyHero: (hero: Hero) => void;
	deleteHero: (hero: Hero) => void;
	showAncestry: (ancestry: Ancestry) => void;
	showCulture: (culture: Culture) => void;
	showCareer: (career: Career) => void;
	showClass: (heroClass: HeroClass) => void;
	showComplication: (complication: Complication) => void;
	showDomain: (domain: Domain) => void;
	showKit: (kit: Kit) => void;
	showTitle: (title: Title) => void;
	showMonster: (hero: Hero, monster: Monster, summon?: SummoningInfo) => void;
	showFollower: (hero: Hero, follower: Follower) => void;
	showFixture: (fixture: Fixture) => void;
	showCharacteristic: (characteristic: Characteristic, hero: Hero) => void;
	showFeature: (feature: Feature, hero: Hero) => void;
	showAbility: (ability: Ability, hero: Hero) => void;
	showHeroState: (hero: Hero, type: HeroModalType) => void;
	onAddSquad: (hero: Hero, monster: Monster, count: number) => void;
	onRemoveSquad: (hero: Hero, slotID: string) => void;
	onAddMonsterToSquad: (hero: Hero, slotID: string) => void;
	onSelectControlledMonster: (hero: Hero, monster: Monster) => void;
	onSelectControlledSquad: (hero: Hero, slot: EncounterSlot) => void;
	updateHero: (hero: Hero) => void;
}

export const HeroViewPage = (props: Props) => {
	const isSmall = useIsSmall();
	const [ sheetMenuOpen, setSheetMenuOpen ] = useState<boolean>(false);
	const navigation = useNavigation();
	const { heroID } = useParams<{ heroID: string }>();
	const heroes = useHeroes();
	const hero = useMemo(
		() => heroes.find(h => h.id === heroID),
		[ heroID, heroes ]
	);
	useTitle(hero?.name || 'Unnamed Hero');

	// The hero may be gone - deleting one and then pressing back returns to its
	// URL. This used to assert the hero existed and throw mid-render, which
	// React recovered from by re-rendering the root synchronously and reported
	// as error #520, so the only thing the user saw was an error notification.
	if (!hero) {
		return <Navigate to='/hero' replace={true} />;
	}

	const getContent = () => (
		<HeroPanel
			hero={hero}
			sourcebooks={props.sourcebooks}
			onSelectAncestry={props.showAncestry}
			onSelectCulture={props.showCulture}
			onSelectCareer={props.showCareer}
			onSelectClass={props.showClass}
			onSelectComplication={props.showComplication}
			onSelectDomain={props.showDomain}
			onSelectKit={props.showKit}
			onSelectTitle={props.showTitle}
			onSelectMonster={props.showMonster}
			onSelectFollower={props.showFollower}
			onSelectFixture={props.showFixture}
			onSelectCharacteristic={characteristic => props.showCharacteristic(characteristic, hero)}
			onSelectFeature={feature => props.showFeature(feature, hero)}
			onSelectAbility={ability => props.showAbility(ability, hero)}
			onShowState={page => props.showHeroState(hero, page)}
			onAddSquad={props.onAddSquad}
			onRemoveSquad={props.onRemoveSquad}
			onAddMonsterToSquad={props.onAddMonsterToSquad}
			onSelectControlledMonster={props.onSelectControlledMonster}
			onSelectControlledSquad={props.onSelectControlledSquad}
			updateHero={props.updateHero}
		/>
	);

	return (
		<ErrorBoundary>
			<div className='hero-view-page'>
				<AppHeader
					title={
						<>
							{hero.picture ? <HeroToken hero={hero} size={28} /> : null}
							<span className='app-header-title-text'>{hero.name || 'Unnamed Hero'}</span>
						</>
					}
					params={props.params}
					settingsMenu={
						isSmall ?
							// The wrench keeps the hero's tools; the cog holds
							// what was behind the overflow, plus app settings.
							<Popover
								trigger='click'
								open={sheetMenuOpen}
								onOpenChange={setSheetMenuOpen}
								content={
									<Space orientation='vertical' style={{ minWidth: '190px' }}>
										<Button block={true} type='text' icon={<CopyOutlined />} onClick={() => { setSheetMenuOpen(false); props.copyHero(hero); }}>Copy hero</Button>
										<Button block={true} type='text' icon={<UploadOutlined />} onClick={() => { setSheetMenuOpen(false); props.exportHeroData(hero); }}>Export as Data</Button>
										<Button block={true} type='text' danger={true} icon={<DeleteOutlined />} onClick={() => { setSheetMenuOpen(false); props.deleteHero(hero); }}>Delete hero</Button>
										<Divider />
										<Button block={true} type='text' icon={<SettingOutlined />} onClick={() => { setSheetMenuOpen(false); props.params.showSettings(); }}>Settings</Button>
									</Space>
								}
							>
								<Button type='text' icon={<SettingOutlined />} title='More' />
							</Popover>
							: undefined
					}
					trailing={
						<Button
							type='text'
							icon={<CloseOutlined />}
							title='Close'
							onClick={() => navigation.goToHeroList(hero.folder)}
						>
							{isSmall ? null : 'Close'}
						</Button>
					}
				>
					<SectionMenuPanel />
					<HeroToolsPanel onShowState={page => props.showHeroState(hero, page)} />
					<ButtonGroup
						buttons={
							isSmall
								? [
									{ type: 'button', icon: <EditOutlined />, onClick: () => navigation.goToHeroEdit(heroID!, 'details') }
								]
								: [
									{ type: 'button', label: 'Edit', icon: <EditOutlined />, onClick: () => navigation.goToHeroEdit(heroID!, 'details') },
									{ type: 'button', label: 'Copy', icon: <CopyOutlined />, onClick: () => props.copyHero(hero) },
									{ type: 'button', label: 'Export', icon: <UploadOutlined />, onClick: () => props.exportHeroData(hero) },
									{ type: 'danger', label: 'Delete', icon: <DeleteOutlined />, onClick: () => props.deleteHero(hero) }
								]
						}
					/>
				</AppHeader>
				<ErrorBoundary>
					<div className={isSmall ? 'hero-view-page-content compact' : 'hero-view-page-content'}>
						{getContent()}
					</div>
				</ErrorBoundary>
				<AppFooter
					page='heroes'
					params={props.params}
				/>
			</div>
		</ErrorBoundary>
	);
};
