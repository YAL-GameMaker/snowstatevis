// for HTGM:
globalvar LOGGER; LOGGER = new Logger("T");

is_browser = os_browser != browser_not_a_browser;
want_server = !is_browser;
want_client = true;

#macro ssv_web_http_port 2080
#macro ssv_web_ws_port 2443
#macro ssv_client_tcp_port 2400
#macro ssv_client_ws_port 2444
#macro ssv_server global.g_ssv_server
#macro ssv_client global.g_ssv_client

if (want_server) {
	ssv_server = new SnowStateVisServer(ssv_web_http_port, ssv_web_ws_port, ssv_client_ws_port, ssv_client_tcp_port);
	ssv_server.start();
} else ssv_server = /*#cast*/ undefined;

ssv_client = new SnowStateVisClient("game");
if (want_client) {
	ssv_client.connect("127.0.0.1", ssv_client_ws_port, ssv_client_tcp_port);
}