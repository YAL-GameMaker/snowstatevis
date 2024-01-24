globalvar LOGGER; LOGGER = new Logger("T");

is_browser = os_browser != browser_not_a_browser;
want_server = !is_browser;
want_client = !is_browser;

#macro test_web_http_port 2080
#macro test_web_ws_port 2443
#macro test_client_tcp_port 2400
#macro test_client_ws_port 2444

if (want_server) {
	server = new SnowStateVisServer(test_web_http_port, test_web_ws_port, test_client_ws_port, test_client_tcp_port);
	server.start();
} else server = /*#cast*/ undefined;

if (want_client) {
	client = new SnowStateVisClient("game");
	client.connect("127.0.0.1", test_client_ws_port, test_client_tcp_port);
} else client = /*#cast*/ undefined;

if 0 call_later(1, time_source_units_seconds, function() {
	draw_enable_drawevent(0);
})