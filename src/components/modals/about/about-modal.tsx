import { Space, Tag } from 'antd';
import { LogoPanel } from '@/components/panels/logo/logo-panel';
import { Modal } from '@/components/modals/modal/modal';
import { SelectablePanel } from '@/components/controls/selectable-panel/selectable-panel';

import pbds from '@/assets/powered-by-draw-steel.png';
import pkg from '../../../../package.json';

import './about-modal.scss';

interface Props {
	onClose: () => void;
}

export const AboutModal = (props: Props) => {
	return (
		<Modal
			content={
				<div className='about-modal'>
					<SelectablePanel style={{ paddingTop: '20px' }}>
						<Space orientation='vertical'>
							<div className='logo-container'>
								<LogoPanel />
								<Tag variant='outlined'>{`Version ${pkg.version}`}</Tag>
							</div>
							<div>
								<b>DAMASCUS</b> is a mobile-first fork of <a href='https://github.com/andyaiken/forgesteel' target='_blank'>Forge Steel</a> by <a href='mailto:andy.aiken@live.co.uk'>Andy Aiken</a>.
							</div>
							<div>
								The fork's source lives at <a href='https://github.com/beaurancourt/damascus' target='_blank'>github.com/beaurancourt/damascus</a>.
							</div>
							<div>
								Suggest a feature or report a bug for the upstream Forge Steel project <a href='https://github.com/andyaiken/forgesteel/issues' target='_blank'>here</a>.
							</div>
						</Space>
					</SelectablePanel>
					<SelectablePanel style={{ paddingTop: '20px' }}>
						<Space orientation='vertical'>
							<div>
								<b>DAMASCUS</b> is free, like its upstream.
							</div>
							<div>
								If you'd like to support the original author of Forge Steel, you can <a href='https://patreon.com/andyaiken' target='_blank'>join Andy's Patreon</a> or <a href='https://coff.ee/andyaiken' target='_blank'>buy him a coffee</a>.
							</div>
						</Space>
					</SelectablePanel>
					<SelectablePanel style={{ paddingTop: '20px' }}>
						<Space orientation='vertical'>
							<div className='logo-container'>
								<img src={pbds} />
							</div>
							<div>
								<b>DAMASCUS</b> is an independent product published under the DRAW STEEL Creator License and is not affiliated with MCDM Productions, LLC.
							</div>
							<div>
								<b>DRAW STEEL</b> © 2024 <a href='https://mcdmproductions.com/' target='_blank'>MCDM Productions, LLC.</a>
							</div>
							<div>
								<a href='https://mcdm.gg/DrawSteel/DrawSteelGlyphs.zip' target='_blank'>Draw Steel Glyphs Font</a> by <a href='https://mcdmproductions.com/' target='_blank'>MCDM Productions</a> is licensed under <a href='https://creativecommons.org/licenses/by-sa/4.0/' target='_blank'>CC BY-SA 4.0</a>.
							</div>
						</Space>
					</SelectablePanel>
				</div>
			}
			onClose={props.onClose}
		/>
	);
};
