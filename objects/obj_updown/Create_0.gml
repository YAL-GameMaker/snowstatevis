next = 0;
rate = room_speed;
fsm = new SnowState("idle");
fsm.add("idle", {
	step: function() /*=>*/ {
		if (mouse_check_button_pressed(mb_left) && position_meeting(mouse_x, mouse_y, id)) {
			if (mouse_y < y) {
				fsm.change("up");
			} else {
				fsm.change("down");
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
		if (mouse_check_button_pressed(mb_left) && position_meeting(mouse_x, mouse_y, id)) fsm.change("idle");
	}
});
fsm.add("down", {
	enter: function() /*=>*/ {;next = rate},
	step: function() /*=>*/ {
		if (--next <= 0) {
			next = rate;
			if (bbox_bottom <= room_height - 32) y += 32;
		}
		if (mouse_check_button_pressed(mb_left) && position_meeting(mouse_x, mouse_y, id)) fsm.change("idle");
	}
});
obj_test.client.add(fsm, "upDown " + string(int64(id)));