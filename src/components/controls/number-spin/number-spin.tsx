import { Button, Statistic } from 'antd';
import { CSSProperties, ReactNode } from 'react';
import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';

import './number-spin.scss';

interface Props {
	disabled?: boolean;
	label?: string;
	value: number;
	suffix?: ReactNode;
	steps?: number[];
	min?: number;
	max?: number;
	children?: ReactNode;
	style?: CSSProperties;
	format?: (value: number) => string;
	onChange: (value: number) => void;
}

export const NumberSpin = (props: Props) => {
	const onChange = (step: number, delta: number) => {
		const change = step * delta;
		let value = props.value + change;
		if (props.min !== undefined) {
			value = Math.max(value, props.min);
		}
		if (props.max !== undefined) {
			value = Math.min(value, props.max);
		}
		props.onChange(value);
	};

	let canDown = true;
	if (props.min !== undefined) {
		canDown = props.value > props.min;
	}
	let canUp = true;
	if (props.max !== undefined) {
		canUp = props.value < props.max;
	}

	const steps = props.steps || [ 1 ];
	const ascending = [ ...steps ].sort((a, b) => a - b);
	const descending = [ ...steps ].sort((a, b) => b - a);

	return (
		<ErrorBoundary>
			<div className={props.disabled ? 'number-spin disabled' : 'number-spin'} style={props.style}>
				<div className='spin-buttons'>
					{
						descending.map((step, n) => (
							<Button
								key={n}
								type='text'
								className={canDown ? 'spin-button' : 'spin-button disabled'}
								onClick={() => onChange(step, -1)}
							>
								-{step}
							</Button>
						))
					}
				</div>
				{
					props.children ?
						props.children
						:
						<Statistic
							className='spin-middle'
							title={props.label}
							value={props.format ? props.format(props.value) : props.value}
							suffix={props.suffix}
						/>
				}
				<div className='spin-buttons'>
					{
						ascending.map((step, n) => (
							<Button
								key={n}
								type='text'
								className={canUp ? 'spin-button' : 'spin-button disabled'}
								onClick={() => onChange(step, +1)}
							>
								+{step}
							</Button>
						))
					}
				</div>
			</div>
		</ErrorBoundary>
	);
};
