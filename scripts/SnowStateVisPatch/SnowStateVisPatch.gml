function SnowStateVisPatch() {
	var _tmp = new SnowState("temp");
	var _SnowState = static_get(SnowState);
	if (_SnowState[$ "__add_base"] != undefined) exit;
	_SnowState.__add_base = _SnowState.__add;
	_SnowState.__state_names = undefined;
	_SnowState.__add = method(undefined, function(_name, _struct, _hasParent) {
		__state_names ??= [];
		array_push(__state_names, _name);
		__add_base(_name, _struct, _hasParent);
	});
}
//SnowStateVisPatch(); // SnowState doesn't use statics..?