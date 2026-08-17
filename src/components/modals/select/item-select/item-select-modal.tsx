import { Button, Flex, Space } from 'antd';
import { Empty } from '@/components/controls/empty/empty';
import { Hero } from '@/models/hero';
import { ImbuedItemData } from '@/data/items/imbued-item-data';
import { Item } from '@/models/item';
import { ItemPanel } from '@/components/panels/elements/item-panel/item-panel';
import { ItemType } from '@/enums/item-type';
import { Modal } from '@/components/modals/modal/modal';
import { PanelMode } from '@/enums/panel-mode';
import { PlusOutlined } from '@ant-design/icons';
import { SearchBox } from '@/components/controls/text-input/text-input';
import { Sourcebook } from '@/models/sourcebook';
import { SourcebookLogic } from '@/logic/sourcebook-logic';
import { Utils } from '@/utils/utils';
import { useState } from 'react';

import './item-select-modal.scss';

interface Props {
	types: ItemType[];
	sourcebooks: Sourcebook[];
	hero: Hero;
	onClose: () => void;
	onSelect: (item: Item) => void;
	onCustomize?: () => void;
	// Offered only where an item off the list isn't the only sensible answer:
	// a hero's own inventory, not a feature's list of choices.
	onAddCustom?: (name: string) => void;
}

export const ItemSelectModal = (props: Props) => {
	const [ searchTerm, setSearchTerm ] = useState<string>('');

	// Searching by name covers what the filter panel did, without the panel -
	// and without "only show items you can use", which was on by default and
	// quietly kept items off the list. The caller still scopes the list by type.
	const items = [ ...SourcebookLogic.getItems(props.sourcebooks), ImbuedItemData.imbuedArmor, ImbuedItemData.imbuedImplement, ImbuedItemData.imbuedWeapon ]
		.filter(item => props.types.includes(item.type))
		.filter(item => Utils.textMatches([
			item.name,
			item.description,
			...item.keywords,
			...item.featuresByLevel.flatMap(lvl => lvl.features.map(f => f.name))
		], searchTerm));

	return (
		<Modal
			toolbar={
				<Flex align='center' gap={8} style={{ width: '100%' }}>
					<div style={{ flex: '1 1 0', minWidth: 0 }}>
						<SearchBox searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
					</div>
					{
						props.onAddCustom ?
							<Button
								type='primary'
								icon={<PlusOutlined />}
								title={searchTerm.trim() ? `Add "${searchTerm.trim()}" as a custom item` : 'Type a name to add a custom item'}
								disabled={!searchTerm.trim()}
								onClick={() => props.onAddCustom!(searchTerm.trim())}
							/>
							: null
					}
				</Flex>
			}
			content={
				<div className='item-select-modal'>
					<Space orientation='vertical' style={{ width: '100%' }}>
						{
							// Flat, not behind an expander: the expander's title only
							// repeated the name and type the panel leads with, and put
							// what the item actually does one click away. The add
							// button sits over the panel's own heading, as it does in
							// the inventory.
							items.map(item => (
								<div key={item.id} className='item-option'>
									<div className='item-option-actions'>
										<Button
											type='text'
											title='Select'
											icon={<PlusOutlined />}
											onClick={() => props.onSelect(item)}
										/>
									</div>
									<ItemPanel item={item} sourcebooks={props.sourcebooks} wielder={props.hero} mode={PanelMode.Full} />
								</div>
							))
						}
						{
							items.length === 0 ?
								props.onCustomize ?
									<div>
										<p>
											Can't find what you're looking for? It might be in a sourcebook that your hero doesn't have access to.
										</p>
										<Button block={true} onClick={props.onCustomize}>
											Click here to change your hero's sourcebooks
										</Button>
									</div>
									:
									<Empty text='Not found' />
								: null
						}
					</Space>
				</div>
			}
			onClose={props.onClose}
		/>
	);
};
