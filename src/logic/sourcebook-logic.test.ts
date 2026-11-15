import { describe, expect, test } from 'vitest';
import { FactoryLogic } from '@/logic/factory-logic';
import { SourcebookData } from '@/data/sourcebook-data';
import { SourcebookLogic } from '@/logic/sourcebook-logic';

describe('getDefaultSourcebookIDs', () => {
	test('returns every official sourcebook and leaves homebrew opt-in', () => {
		const homebrew = FactoryLogic.createSourcebook();
		homebrew.name = 'The Ashen Coast';

		const sourcebooks = SourcebookLogic.getSourcebooks([ homebrew ]);
		const ids = SourcebookLogic.getDefaultSourcebookIDs(sourcebooks);

		expect(ids).toEqual([
			SourcebookData.core.id,
			SourcebookData.orden.id,
			SourcebookData.beastheart.id,
			SourcebookData.summoner.id,
			SourcebookData.patreon.id
		]);
		expect(ids).not.toContain(homebrew.id);
	});
});
