import { AppFooter, FooterParams } from '@/components/panels/app-footer/app-footer';
import { Button, Divider } from 'antd';
import { CloseOutlined, CopyOutlined, DeleteOutlined, EditOutlined, MoreOutlined, UploadOutlined } from '@ant-design/icons';
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
import { Kit } from '@/models/kit';
import { Monster } from '@/models/monster';
import { RulesPage } from '@/enums/rules-page';
import { Sourcebook } from '@/models/sourcebook';
import { SummoningInfo } from '@/models/summon';
import { Title } from '@/models/title';
import { useHeroes } from '@/contexts/data-context';
import { useIsSmall } from '@/hooks/use-is-small';
import { useMemo } from 'react';
import { useNavigation } from '@/hooks/use-navigation';
import { useParams } from 'react-router';
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
	showHeroReference: (hero: Hero, page: RulesPage) => void;
	onAddSquad: (hero: Hero, monster: Monster, count: number) => void;
	onRemoveSquad: (hero: Hero, slotID: string) => void;
	onAddMonsterToSquad: (hero: Hero, slotID: string) => void;
	onSelectControlledMonster: (hero: Hero, monster: Monster) => void;
	onSelectControlledSquad: (hero: Hero, slot: EncounterSlot) => void;
	updateHero: (hero: Hero) => void;
}

export const HeroViewPage = (props: Props) => {
	const isSmall = useIsSmall();
	const navigation = useNavigation();
	const { heroID } = useParams<{ heroID: string }>();
	const heroes = useHeroes();
	const hero = useMemo(
		() => heroes.find(h => h.id === heroID)!,
		[ heroID, heroes ]
	);
	useTitle(hero.name || 'Unnamed Hero');

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
			onShowReference={page => props.showHeroReference(hero, page)}
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
				<AppHeader subheader='Hero'>
					<ButtonGroup
						buttons={
							isSmall
								? [
									{ type: 'button', icon: <EditOutlined />, onClick: () => navigation.goToHeroEdit(heroID!, 'details') },
									{
										type: 'dropdown',
										icon: <MoreOutlined />,
										popover: (
											<div style={{ width: '260px', display: 'flex', flexDirection: 'column', gap: 8 }}>
												<Button icon={<CopyOutlined />} onClick={() => props.copyHero(hero)}>Copy hero</Button>
												<Button icon={<UploadOutlined />} onClick={() => props.exportHeroData(hero)}>Export as Data</Button>
												<Divider style={{ margin: '4px 0' }} />
												<Button danger={true} icon={<DeleteOutlined />} onClick={() => props.deleteHero(hero)}>Delete hero</Button>
											</div>
										)
									},
									{ type: 'button', icon: <CloseOutlined />, onClick: () => navigation.goToHeroList(hero.folder) }
								]
								: [
									{ type: 'button', label: 'Edit', icon: <EditOutlined />, onClick: () => navigation.goToHeroEdit(heroID!, 'details') },
									{ type: 'button', label: 'Copy', icon: <CopyOutlined />, onClick: () => props.copyHero(hero) },
									{ type: 'button', label: 'Export', icon: <UploadOutlined />, onClick: () => props.exportHeroData(hero) },
									{ type: 'danger', label: 'Delete', icon: <DeleteOutlined />, onClick: () => props.deleteHero(hero) },
									{ type: 'button', label: 'Close', icon: <CloseOutlined />, onClick: () => navigation.goToHeroList(hero.folder) }
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
