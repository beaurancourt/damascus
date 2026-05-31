import { CheckCircleFilled } from '@ant-design/icons';

// Bronze-tinted chip with a green checkmark — the universal hero-builder
// "you finished this choice category" signal. Used in FeatureConfigPanel
// headers, the class section's subclass + characteristics blocks, the
// career inciting-incident picker, etc. Styling lives in index.scss under
// `.feature-done-badge`.
export const DoneBadge = () => (
	<span className='feature-done-badge' title='Selection complete'>
		<CheckCircleFilled />
		<span className='feature-done-badge-text'>Done</span>
	</span>
);
