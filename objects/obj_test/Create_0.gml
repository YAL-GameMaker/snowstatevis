is_browser = os_browser != browser_not_a_browser;
want_server = !is_browser;
want_client = is_browser;

if (want_server) {
	server = new SnowStateVisServer(2000, 2001, 2002);
	server.start();
} else server = /*#cast*/ undefined;

if (want_client) {
	client = new SnowStateVisClient("game");
	client.connect("127.0.0.1", 2001);
} else client = /*#cast*/ undefined;

if 0 call_later(1, time_source_units_seconds, function() {
	draw_enable_drawevent(0);
})