function SnowStateVisClient(_name) constructor {
	__socket = -1 /*#as network_socket*/;
	__is_raw = false;
	__ready = false;
	__queue = [];
	__fsm_raw_array = [] /*#as SnowState[]*/;
	__fsm_array = [] /*#as SnowStateVisClientFSM[]*/;
	__fsm_lookup = {}; /// @is {CustomKeyStruct<string, SnowStateVisClientFSM>}
	
	static connect = function(_url, _ws_port, _tcp_port, _use_ws = undefined) {
		_use_ws ??= os_browser != browser_not_a_browser;
		__is_raw = _use_ws;
		var _result;
		if (_use_ws) {
			__socket = network_create_socket(network_socket_ws);
			_result = network_connect_raw_async(__socket, _url, _ws_port);
		} else {
			__socket = network_create_socket(network_socket_tcp);
			//network_set_config(network_config_use_non_blocking_socket, true);
			_result = network_connect_async(__socket, _url, _tcp_port);
		}
		trace("Connect", {result: _result});
		return _result;
	}
	
	/// @param {SnowState} fsm
	/// @param {string} label
	static add = function(_fsm, _name, _trans) {
		if (variable_struct_exists(__fsm_lookup, _name)) return false;
		if (array_contains(__fsm_raw_array, _fsm)) return false;
		array_push(__fsm_raw_array, _fsm);
		var _wrap = new SnowStateVisClientFSM(self, _fsm, _name);
		array_push(__fsm_array, _wrap);
		__fsm_lookup[$ _name] = _wrap;
		__send({
			type: "fsm.register",
			name: _name,
			states: variable_struct_get_names(_fsm.__states),
			current: _wrap.__current,
			transit: _trans,
		});
		return true;
	}
	
	/// @param {SnowState|string} fsm_or_name
	static remove = function(_fsm_or_name) {
		var _fsm/*:SnowStateVisClientFSM*/, _name, _ind;
		if (is_string(_fsm_or_name)) {
			_name = _fsm_or_name;
			_fsm = __fsm_lookup[$ _name];
			if (_fsm == undefined) return false;
			_ind = array_get_index(__fsm_array, _fsm);
		} else {
			_ind = array_get_index(__fsm_raw_array, _fsm_or_name /*#as SnowState*/);
			if (_ind < 0) return false;
			_fsm = __fsm_array[_ind];
			_name = _fsm.__name;
		}
		array_delete(__fsm_raw_array, _ind, 1);
		array_delete(__fsm_array, _ind, 1);
		variable_struct_remove(__fsm_lookup, _name);
		__send({
			type: "fsm.unregister",
			name: _name,
		});
		return true;
	}
	
	static update = function() {
		var n = array_length(__fsm_array);
		for (var i = 0; i < n; i++) {
			var _wrap = __fsm_array[i];
			var _current = _wrap.__raw.get_current_state();
			if (_current != _wrap.__current) {
				_wrap.__current = _current;
				__send({
					type: "fsm.update",
					name: _wrap.__name,
					current: _current,
				})
			}
		}
	}
	
	static __send = function(_msg) {
		show_debug_message("send from game: " + json_stringify(_msg));
		if (__ready) {
			__SnowStateVis_send(__socket, _msg, __is_raw);
		} else {
			array_push(__queue, _msg);
		}
	}
	static async_network = function() {
		var _map/*:async_load_network*/ = /*#cast*/ async_load;
		switch (_map[?"type"]) {
			case network_type_non_blocking_connect:
				if (_map[?"id"] != __socket) break;
				__ready = _map[?"succeeded"];
				show_debug_message("ready: " + string(__ready) + " skt: " + string(__socket));
				if (__ready) {
					var n = array_length(__queue);
					for (var i = 0; i < n; i++) {
						__SnowStateVis_send(__socket, __queue[i], __is_raw);
					}
					array_resize(__queue, 0);
				}
				break;
			case network_type_data:
				if (_map[?"id"] != __socket) break;
				if (_map[?"size"] == 0) break;
				try {
					__handle_message(__SnowStateVis_read_json(_map[?"buffer"]));
				} catch (_ex) {
					show_debug_message(_ex);
				}
				break;
		}
	}
	static __handle_message = function(_msg) {
		switch (_msg.type) {
			case "fsm.change":
				var _wrap = __fsm_lookup[$ _msg.name];
				if (_wrap == undefined) break;
				_wrap.__raw.change(_msg.current);
				break;
		}
	}
	__send({
		type: "game.rename",
		name: _name,
	});
}
function SnowStateVisClientFSM(_client, _fsm, _name) constructor {
	__client = _client; /// @is {SnowStateVisClient}
	__raw = _fsm; /// @is {SnowState}
	__name = _name;
	__current = __raw.get_current_state();
}