import { describe, expect, it } from 'vitest';
import { FactoryLogic } from '@/logic/factory-logic';
import { ProjectLogic } from '@/logic/project-logic';

// Nothing about how far along a project is gets stored as a status: the points
// are what is saved, and "finished" is read back out of them. These pin that
// relationship, because the sheet, the projects modal and the export all show a
// project's state by asking this.
const project = (goal: number, points: number, itemPrerequisites: string = '', source: string = '') => {
	const result = FactoryLogic.createProject({ goal: goal, prerequisites: itemPrerequisites, source: source });
	const progress = FactoryLogic.createProjectProgress();
	progress.points = points;
	progress.prerequisites = true;
	progress.source = true;
	result.progress = progress;
	return result;
};

describe('ProjectLogic', () => {
	it('is finished once the saved points reach the goal', () => {
		expect(ProjectLogic.getStatus(project(45, 44))).toBe('98%');
		expect(ProjectLogic.getStatus(project(45, 45))).toBe('Finished');
		// Over the goal is finished too: the panel caps the spin at the goal, but an
		// imported or hand-edited hero can arrive over it.
		expect(ProjectLogic.getStatus(project(45, 50))).toBe('Finished');
	});

	it('has no percentage to give without a goal', () => {
		expect(ProjectLogic.getStatus(project(0, 12))).toBe('In progress');
	});

	it('is preparing until the prerequisites and the source are in hand', () => {
		const needsItems = project(45, 45, 'A dragon’s tooth');
		needsItems.progress!.prerequisites = false;
		expect(ProjectLogic.getStatus(needsItems)).toBe('Preparing');

		const needsSource = project(45, 45, '', 'A library');
		needsSource.progress!.source = false;
		expect(ProjectLogic.getStatus(needsSource)).toBe('Preparing');

		// A project with neither requirement ignores the flags entirely.
		const free = project(45, 45);
		free.progress!.prerequisites = false;
		free.progress!.source = false;
		expect(ProjectLogic.getStatus(free)).toBe('Finished');
	});
});
