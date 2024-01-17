function SnowStateVisServer(_http_port, _game_ws_port, _web_ws_port) constructor {
	// HTTP server for frontend:
	__http_server = new HttpServer(_http_port);
	__http_server.add_file("", "SnowStateVis/index.html");
	__http_server.add_file_server("*", "SnowStateVis");
	
	// game instances:
	__game_port = _game_ws_port;
	__game_server = -1 /*#as network_server*/;
	__game_from_socket = {}; /// @is {CustomKeyStruct<network_socket, SnowStateVisServerGame>}
	__game_from_name = {}; /// @is {CustomKeyStruct<string, SnowStateVisServerGame>}
	__game_array = []; /// @is {SnowStateVisServerGame[]}
	
	// watcher websockets:
	__web_port = _web_ws_port;
	__web_server = -1 /*#as network_server*/;
	__web_from_socket = {}; /// @is {CustomKeyStruct<network_socket, SnowStateVisServerWeb>}
	__web_array = []; /// @is {SnowStateVisServerWeb[]}
	//
	
	//
	static start = function() {
		__http_server.start();
		__game_server = network_create_server_raw(network_socket_ws, __game_port, 16);
		__web_server = network_create_server_raw(network_socket_ws, __web_port, 16);
	}
	static stop = function() {
		__http_server.stop();
		network_destroy(__game_server);
		__game_server = -1;
		network_destroy(__web_server);
		__web_server = -1;
	}
	static async_network = function() {
		var _map/*:async_load_network*/ = /*#cast*/ async_load;
		switch (_map[?"type"]) {
			case network_type_connect: __handle_connect(_map); break;
			case network_type_data: __handle_data(_map); break;
		}
	}
	static __handle_connect = function(_map/*:async_load_network*/) {
		if (_map[?"id"] == __game_server) {
			var _skt = _map[?"socket"];
			var _game = new SnowStateVisServerGame(self, _skt);
			__game_from_socket[$ _skt] = _game;
			array_push(__game_array, _game);
			show_debug_message("Game connected!");
		} else if (_map[?"id"] == __web_server) {
			var _skt = _map[?"socket"];
			var _web = new SnowStateVisServerWeb(self, _skt);
			__web_from_socket[$ _skt] = _web;
			array_push(__web_array, _web);
			show_debug_message("Frontend connected!");
		}
	}
	static __handle_data = function(_map/*:async_load_network*/) {
		var _skt = _map[?"id"];
		if (_map[?"size"] == 0) exit;
		try {
			var _game_client = __game_from_socket[$ _skt];
			if (_game_client != undefined) {
				_game_client.__handle_message(__SnowStateVis_read_json(_map[?"buffer"]));
				exit;
			}
			var _web_client = __web_from_socket[$ _skt];
			if (_web_client != undefined) {
				_web_client.__handle_message(__SnowStateVis_read_json(_map[?"buffer"]));
				exit;
			}
		} catch (_ex) {
			show_debug_message(_ex);
		}
	}
}

