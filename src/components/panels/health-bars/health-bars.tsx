import { ErrorBoundary } from '@/components/controls/error-boundary/error-boundary';

import './health-bars.scss';

interface Props {
	stamina?: {
		staminaMax: number;
		staminaDamage: number;
		state: string;
	};
	staminaTemp?: {
		staminaTemp: number;
	}
	recoveries?: {
		recoveriesMax: number;
		recoveriesUsed: number;
		recoveryValue: number;
	}
}

// The stamina readout: one bar for stamina, pips for the recoveries left, and the
// recovery value as a plain number. It replaced three concentric progress rings,
// which spent the fattest ring on temporary stamina and the thinnest on
// recoveries - the opposite of what a fight makes you look at - and which could
// not change width, so on a phone the ring took a row of its own above the
// controls. A bar keeps its proportions at any width, so the same readout works
// on the sheet, in the vitals modal, on a monster in the runner and in a minion
// group's slot.
export const HealthBars = (props: Props) => {
	if (!props.stamina) {
		return null;
	}

	const max = props.stamina.staminaMax;
	const current = max - props.stamina.staminaDamage;
	const temp = props.staminaTemp ? props.staminaTemp.staminaTemp : 0;
	const dangerous = [ 'winded', 'dying', 'dead' ].includes(props.stamina.state);

	// A hero can be damaged past 0 stamina, and the number is worth keeping - it is
	// how far into dying they are - but a bar cannot draw less than nothing.
	const percent = (value: number) => `${max > 0 ? Math.max(0, Math.min(100, 100 * value / max)) : 0}%`;

	const recoveries = props.recoveries;
	const recoveriesLeft = recoveries ? recoveries.recoveriesMax - recoveries.recoveriesUsed : 0;

	return (
		<ErrorBoundary>
			<div className='health-bars'>
				<div className='health-bar-row'>
					<div className='health-bar-head'>
						<div className='health-bar-label'>Stamina</div>
						<div className='health-bar-value'>
							{props.stamina.staminaDamage ? `${current} / ${max}` : max}
							{
								temp > 0 ?
									<span className='health-bar-chip'>+{temp} Temp</span>
									: null
							}
							{
								props.stamina.state === 'winded' ?
									<span className='health-bar-chip danger'>Winded</span>
									: null
							}
						</div>
					</div>
					<div className='health-bar-track'>
						<div className={dangerous ? 'health-bar-fill danger' : 'health-bar-fill'} style={{ width: percent(current) }} />
						{
							temp > 0 ?
								<div className='health-bar-temp' style={{ width: percent(temp) }} />
								: null
						}
					</div>
				</div>
				{
					recoveries && (recoveries.recoveriesMax > 0) ?
						<div className='health-bar-row'>
							<div className='health-bar-head'>
								<div className='health-bar-label'>Recoveries</div>
								<div className='health-bar-value'>{recoveries.recoveriesUsed ? `${recoveriesLeft} / ${recoveries.recoveriesMax}` : recoveries.recoveriesMax}</div>
							</div>
							<div className='health-pips'>
								{
									Array.from({ length: recoveries.recoveriesMax }, (_, n) => (
										<div key={n} className={n < recoveriesLeft ? 'health-pip' : 'health-pip spent'} />
									))
								}
							</div>
						</div>
						: null
				}
				{
					recoveries ?
						<div className='health-bar-row health-bar-stat'>
							<div className='health-bar-label'>Recovery Value</div>
							<div className='health-bar-value'>{recoveries.recoveryValue}</div>
						</div>
						: null
				}
			</div>
		</ErrorBoundary>
	);
};
