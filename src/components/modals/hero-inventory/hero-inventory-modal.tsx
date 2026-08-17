import { Alert, Button, Drawer, Space } from 'antd';
import { CaretDownOutlined, CaretUpOutlined, PlusOutlined } from '@ant-design/icons';
import { Collections } from '@/utils/collections';
import { DangerButton } from '@/components/controls/danger-button/danger-button';
import { Empty } from '@/components/controls/empty/empty';
import { FactoryLogic } from '@/logic/factory-logic';
import { FeatureType } from '@/enums/feature-type';
import { HeaderText } from '@/components/controls/header-text/header-text';
import { Hero } from '@/models/hero';
import { HeroLogic } from '@/logic/hero-logic';
import { Item } from '@/models/item';
import { ItemPanel } from '@/components/panels/elements/item-panel/item-panel';
import { ItemSelectModal } from '@/components/modals/select/item-select/item-select-modal';
import { ItemType } from '@/enums/item-type';
import { Modal } from '@/components/modals/modal/modal';
import { PanelMode } from '@/enums/panel-mode';
import { Sourcebook } from '@/models/sourcebook';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './hero-inventory-modal.scss';

interface Props {
	hero: Hero;
	sourcebooks: Sourcebook[];
	onClose: () => void;
	onChange: (hero: Hero) => void;
	onCustomize: () => void;
}

export const HeroInventoryModal = (props: Props) => {
	const [ hero, setHero ] = useState<Hero>(Utils.copy(props.hero));
	const [ shopVisible, setShopVisible ] = useState<boolean>(false);

	const addItem = (item: Item) => {
		const copy = Utils.copy(hero);
		copy.state.inventory.push(item);
		setHero(copy);
		setShopVisible(false);
		props.onChange(copy);
	};

	// The list only has what the books have; a hero can pick up anything. The
	// name is whatever was typed into the search that found nothing.
	const addCustomItem = (name: string) => {
		addItem(FactoryLogic.createItem({
			id: Utils.guid(),
			name: name,
			description: '',
			type: ItemType.Trinket1st
		}));
	};

	const changeItem = (item: Item) => {
		const copy = Utils.copy(hero);
		const index = copy.state.inventory.findIndex(i => i.id === item.id);
		copy.state.inventory[index] = item;
		setHero(copy);
		props.onChange(copy);
	};

	const moveItem = (item: Item, direction: 'up' | 'down') => {
		const copy = Utils.copy(hero);
		const index = copy.state.inventory.findIndex(i => i.id === item.id);
		copy.state.inventory = Collections.move(copy.state.inventory, index, direction);
		setHero(copy);
		props.onChange(copy);
	};

	const deleteItem = (item: Item) => {
		const copy = Utils.copy(hero);
		copy.state.inventory = copy.state.inventory.filter(i => i.id !== item.id);
		setHero(copy);
		props.onChange(copy);
	};

	const items = [
		...hero.state.inventory.map(i => ({ item: i, source: 'inventory' })),
		...HeroLogic.getFeatures(hero)
			.map(f => f.feature)
			.filter(f => f.type === FeatureType.ItemChoice)
			.flatMap(f => f.data.selected)
			.map(i => ({ item: i, source: 'feature' }))
	];

	let warning = null;
	if (items.filter(i => [ ItemType.Leveled, ItemType.LeveledArmor, ItemType.LeveledImplement, ItemType.LeveledWeapon ].includes(i.item.type)).length > 3) {
		warning = (
			<Alert
				type='warning'
				showIcon={true}
				title='You can only use 3 leveled items at a time.'
			/>
		);
	}

	return (
		<Modal
			content={
				<div className='hero-inventory-modal'>
					<Space orientation='vertical' style={{ width: '100%', paddingBottom: '20px' }}>
						<HeaderText
							extra={
								<Button type='text' icon={<PlusOutlined />} onClick={() => setShopVisible(true)} />
							}
						>
							Inventory
						</HeaderText>
						{warning}
						{
							items.map(i => {
								switch (i.source) {
									case 'inventory':
										// No expander: it repeated the name and type that
										// the panel below already leads with, and put the
										// item you were looking at one click away.
										return (
											<div key={i.item.id} className='inventory-item'>
												<div className='inventory-item-actions'>
													<Button type='text' title='Move Up' icon={<CaretUpOutlined />} onClick={() => moveItem(i.item, 'up')} />
													<Button type='text' title='Move Down' icon={<CaretDownOutlined />} onClick={() => moveItem(i.item, 'down')} />
													<DangerButton mode='clear' onConfirm={() => deleteItem(i.item)} />
												</div>
												<ItemPanel
													item={i.item}
													wielder={hero}
													sourcebooks={props.sourcebooks}
													mode={PanelMode.Full}
													onChange={changeItem}
												/>
											</div>
										);
									case 'feature':
										return (
											<div key={i.item.id} className='inventory-item'>
												<ItemPanel
													item={i.item}
													wielder={hero}
													sourcebooks={props.sourcebooks}
													mode={PanelMode.Full}
												/>
											</div>
										);
								}
							})
						}
						{
							items.length === 0 ?
								<Empty text='Your inventory is empty.' />
								: null
						}
					</Space>
					<Drawer open={shopVisible} onClose={() => setShopVisible(false)} closeIcon={null} size={500}>
						<ItemSelectModal
							types={[ ItemType.Artifact, ItemType.Consumable1st, ItemType.Consumable2nd, ItemType.Consumable3rd, ItemType.Consumable4th, ItemType.ImbuedArmor, ItemType.ImbuedImplement, ItemType.ImbuedWeapon, ItemType.Leveled, ItemType.LeveledArmor, ItemType.LeveledImplement, ItemType.LeveledWeapon, ItemType.Trinket1st, ItemType.Trinket2nd, ItemType.Trinket3rd, ItemType.Trinket4th ]}
							sourcebooks={props.sourcebooks}
							hero={hero}
							onSelect={addItem}
							onAddCustom={addCustomItem}
							onCustomize={props.onCustomize}
							onClose={() => setShopVisible(false)}
						/>
					</Drawer>
				</div>
			}
			onClose={props.onClose}
		/>
	);
};
