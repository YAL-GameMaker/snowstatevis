function SnowStateVisClient(_name) constructor {
	__name = _name;
	__socket = -1 /*#as network_socket*/;
	__is_raw = false;
	__active = false;
	__ready = false;
	__queue = [];
	__fsm_raw_array = [] /*#as SnowState[]*/;
	__fsm_array = [] /*#as SnowStateVisClientFSM[]*/;
	__fsm_lookup = {}; /// @is {CustomKeyStruct<string, SnowStateVisClientFSM>}
	
	static connect = function(_url, _ws_port, _tcp_port, _use_ws = undefined) {
		__active = true;
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
		//trace("Connect", {result: _result});
		__send({
			type: "game.rename",
			name: __name,
		});
		return _result;
	}
	
	/// @param {SnowState} fsm
	/// @param {string} label
	/// @param {any} ?transitions
	static add = function(_fsm, _name, _trans = {}) {
		if (!__active) return false;
		if (variable_struct_exists(__fsm_lookup, _name)) return false;
		if (array_contains(__fsm_raw_array, _fsm)) return false;
		array_push(__fsm_raw_array, _fsm);
		var _wrap = new SnowStateVisClientFSM(self, _fsm, _name);
		array_push(__fsm_array, _wrap);
		__fsm_lookup[$ _name] = _wrap;
		
		// copy user-defined transitions to transitions struct:
		// __transitions is from -> label > array of transitions
		var _ft = _fsm.__transitions;
		var _ft_keys = struct_get_names(_ft);
		var _ft_count = array_length(_ft_keys);
		for (var _ft_ind = 0; _ft_ind < _ft_count; _ft_ind++) {
			var _ft_from = _ft_keys[_ft_ind];
			
			// labels is { "idle->up": [{ to: "up", ... }] }
			var _ft_labels = _ft[$ _ft_from];
			var _ft_labels_keys = struct_get_names(_ft_labels);
			var _ft_labels_count = array_length(_ft_labels_keys);
			for (var _ft_labels_ind = 0; _ft_labels_ind < _ft_labels_count; _ft_labels_ind++) {
				var _ft_labels_key = _ft_labels_keys[_ft_labels_ind];
				var _ft_transitions = _ft_labels[$ _ft_labels_key];
				// transitions is [{ to: "up", ... }]
				var _ft_trans_count = array_length(_ft_transitions);
				for (var _ft_trans_ind = 0; _ft_trans_ind < _ft_trans_count; _ft_trans_ind++) {
					var _ft_trans = _ft_transitions[_ft_trans_ind];
					var _ft_to = _ft_trans.to;
					
					var _trans_cur = _trans[$ _ft_from];
					if (_trans_cur == undefined) {
						_trans[$ _ft_from] = _ft_to;
					} else if (is_array(_trans_cur)) {
						if (array_get_index(_trans_cur, _ft_to) < 0) {
							array_push(_trans_cur, _ft_to);
						}
					} else if (_trans_cur != _ft_to) {
						_trans[$ _ft_from] = [_trans_cur, _ft_to];
					}
				}
			}
		}
		//
		__send({
			type: "fsm.register",
			name: _name,
			states: variable_struct_get_names(_fsm.__states),
			current: _wrap.__current,
			transit: _trans,
		});
		_fsm.on("state changed", method(_wrap, function(_to, _from, _trigger) {
			__current = _to;
			__client.__send({
				type: "fsm.update",
				name: __name,
				current: _to,
			})
			//trace("change: " + _from + " -> " + _to);
		}))
		return true;
	}
	
	/// @param {SnowState|string} fsm_or_name
	static remove = function(_fsm_or_name) {
		if (!__active) return false;
		var _wrap/*:SnowStateVisClientFSM*/, _name, _ind;
		if (is_string(_fsm_or_name)) {
			_name = _fsm_or_name;
			_wrap = __fsm_lookup[$ _name];
			if (_wrap == undefined) return false;
			_ind = array_get_index(__fsm_array, _wrap);
		} else {
			_ind = array_get_index(__fsm_raw_array, _fsm_or_name /*#as SnowState*/);
			if (_ind < 0) return false;
			_wrap = __fsm_array[_ind];
			_name = _wrap.__name;
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
		if (!__active) return false;
		// nothing here right now!
	}
	
	static __send = function(_msg) {
		if (!__active) return false;
		//show_debug_message("send from game: " + json_stringify(_msg));
		if (__ready) {
			__SnowStateVis_send(__socket, _msg, __is_raw);
		} else {
			array_push(__queue, _msg);
		}
	}
	
	static async_network = function() {
		if (!__active) return false;
		var _map/*:async_load_network*/ = /*#cast*/ async_load;
		switch (_map[?"type"]) {
			case network_type_non_blocking_connect:
				if (_map[?"id"] != __socket) break;
				__ready = _map[?"succeeded"];
				//show_debug_message("ready: " + string(__ready) + " skt: " + string(__socket));
				if (__ready) {
					var _ft_count = array_length(__queue);
					for (var i = 0; i < _ft_count; i++) {
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
}
function SnowStateVisClientFSM(_client, _fsm, _name) constructor {
	__client = _client; /// @is {SnowStateVisClient}
	__raw = _fsm; /// @is {SnowState}
	__name = _name;
	__current = __raw.get_current_state();
}