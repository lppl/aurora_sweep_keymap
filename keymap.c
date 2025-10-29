bool process_record_user(uint16_t keycode, keyrecord_t *record) {

    // Enforce NumLock to always be on
    if (record->event.pressed) {
        led_t led_state = host_keyboard_led_state();
        if (!led_state.num_lock) {
            tap_code(KC_NUM_LOCK);
        }
    }

    return true;
}
