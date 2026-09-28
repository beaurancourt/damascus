// Keeps a smoke out of the real hero store.
//
// The dev server reads VITE_REMOTE_API_URL out of .env.local, so the app it
// serves syncs to the deployed Postgres every time a page loads. A smoke that
// clicks "use a premade example" therefore pushes a hero to that server, and
// every later run pulls it back down: 46 heroes named Ashley accumulated on the
// server in one afternoon of stamina work before anyone noticed.
//
// Fulfilling the API rather than aborting it matters: an aborted request makes
// the app log "Failed to load remote heroes", and smoke-console fails on any
// console warning. A stubbed GET answers an empty list, so the app behaves as if
// this device is the only one - which is what a smoke wants anyway, since it
// seeds its own state.
//
//   const ctx = await browser.newContext(...);
//   await stubRemoteApi(ctx);
export const stubRemoteApi = async (context) => {
	// Matched on the path, not a glob: in dev the app's own source lives under
	// /src/components/pages/heroes/, and a `**/heroes**` pattern swallows those
	// module requests too, which serves the app an empty list where its own
	// TypeScript should be. The API is the one thing whose path ends in /heroes
	// or /heroes/<id>.
	const isHeroApi = url => /(^|\/)heroes(\/[^/]+)?$/.test(url.pathname);

	await context.route(isHeroApi, route => {
		const method = route.request().method();

		// The list. Answering [] leaves the app local-only; a single-hero GET is
		// never issued, so there is nothing else to tell apart.
		if (method === 'GET') {
			return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
		}

		// PUT answers the shape remote-service reads: the stored version, which the
		// client remembers so it knows what it last pushed.
		if (method === 'PUT') {
			return route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({ ok: true, updatedAt: new Date().toISOString() })
			});
		}

		return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
	});
};
