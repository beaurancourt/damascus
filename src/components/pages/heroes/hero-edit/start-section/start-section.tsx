import { HeaderText } from '@/components/controls/header-text/header-text';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';

import './start-section.scss';

export const StartSection = () => {
	return (
		<div className='hero-edit-content start-section'>
			<div className='hero-edit-content-column selected'>
				<SelectablePanel>
					<HeaderText>Creating a Hero</HeaderText>
					<div className='ds-text'>
						Creating a hero in <b>DAMASCUS</b> is simple.
					</div>
					<ul>
						<li>
							Use the tabs above to select your hero's <code>Ancestry</code>, <code>Culture</code>, <code>Career</code>, and <code>Class</code>.
							If there are any choices to be made, you'll be prompted to make your selections.
						</li>
						<li>
							Optionally, you can choose a <code>Complication</code> - but you can skip this if you'd prefer.
						</li>
						<li>
							Finally, go to the <code>Details</code> tab and give your hero a name.
						</li>
					</ul>
					<div className='ds-text'>
						When you're done, click <code>Save Changes</code> in the toolbar at the top, and you'll see your hero sheet.
					</div>
				</SelectablePanel>
			</div>
		</div>
	);
};
