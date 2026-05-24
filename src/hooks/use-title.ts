import { useEffect } from 'react';

export const useTitle = (title: string) => {
	useEffect(() => {
		const originalTitle = document?.title || 'Damascus';

		if (document && (document.title !== title)) {
			document.title = `Damascus - ${title}`;
		}

		return () => {
			document.title = originalTitle || 'Damascus';
		};
	}, [ title ]);
};
