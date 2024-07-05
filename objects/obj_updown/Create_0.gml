next = 0;
rate = room_speed;
clicked = function() {
	return mouse_check_button_pressed(mb_left) && position_meeting(mouse_x, mouse_y, id);
}
fsm = new SnowState("idle");
fsm.add("idle", {
	step: function() /*=>*/ {
		if (clicked()) {
			if (mouse_y < y) {
				fsm.trigger("up");
			} else {
				fsm.trigger("down");
			}
		}
	}
})
fsm.add("up", {
	enter: function() /*=>*/ {;next = rate},
	step: function() /*=>*/ {
		if (--next <= 0) {
			next = rate;
			if (bbox_top >= 32) y -= 32;
		}
		if (clicked()) fsm.change("idle");
	}
});
fsm.add("down", {
	enter: function() /*=>*/ {;next = rate},
	step: function() /*=>*/ {
		if (--next <= 0) {
			next = rate;
			if (bbox_bottom <= room_height - 32) y += 32;
		}
		if (clicked()) fsm.change("idle");
	}
});
fsm.add("warp", {
	step: function() /*=>*/ {}
});
fsm.add("stuck1", {
	step: function() /*=>*/ {;fsm.change("stuck2")}
});
fsm.add("stuck2", {
	step: function() /*=>*/ {;fsm.change("stuck3")}
});
fsm.add("stuck3", {
	step: function() /*=>*/ {;fsm.change("stuck4")}
});
fsm.add("stuck4", {
	step: function() /*=>*/ {;fsm.change("stuck1")}
});
//
fsm.add_transition("up", "idle", "up");
fsm.add_transition("down", "idle", "down");
//
ssv_name = object_get_name(object_index) + " " + string(int64(id));
ssv_client.add(fsm, ssv_name, {
	//idle: ["up", "down", "warp"],
	up: "idle",
	down: "idle",
	stuck1: "stuck2",
	stuck2: "stuck3",
	stuck3: "stuck4",
	stuck4: "stuck1",
});