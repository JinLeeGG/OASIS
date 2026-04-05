import RPi.GPIO as GPIO
import time


class WhisplayBoard:
    # RGB LED pins
    RED_PIN = 22
    GREEN_PIN = 18
    BLUE_PIN = 16

    # Button pin
    BUTTON_PIN = 11

    def __init__(self):
        GPIO.setmode(GPIO.BOARD)
        GPIO.setwarnings(False)

        # Initialize RGB LED pins
        GPIO.setup([self.RED_PIN, self.GREEN_PIN, self.BLUE_PIN], GPIO.OUT)
        self.red_pwm = GPIO.PWM(self.RED_PIN, 100)
        self.green_pwm = GPIO.PWM(self.GREEN_PIN, 100)
        self.blue_pwm = GPIO.PWM(self.BLUE_PIN, 100)
        self._current_r = 0
        self._current_g = 0
        self._current_b = 0
        self.red_pwm.start(0)
        self.green_pwm.start(0)
        self.blue_pwm.start(0)

        # Initialize button
        GPIO.setup(self.BUTTON_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        self.button_press_callback = None
        self.button_release_callback = None
        GPIO.add_event_detect(
            self.BUTTON_PIN, GPIO.BOTH, callback=self._button_event, bouncetime=50
        )

    def set_rgb(self, r, g, b):
        self.red_pwm.ChangeDutyCycle(100 - (r / 255 * 100))
        self.green_pwm.ChangeDutyCycle(100 - (g / 255 * 100))
        self.blue_pwm.ChangeDutyCycle(100 - (b / 255 * 100))
        self._current_r = r
        self._current_g = g
        self._current_b = b

    def set_rgb_fade(self, r_target, g_target, b_target, duration_ms=100):
        steps = 20
        delay_ms = duration_ms / steps
        r_step = (r_target - self._current_r) / steps
        g_step = (g_target - self._current_g) / steps
        b_step = (b_target - self._current_b) / steps
        for i in range(steps + 1):
            r_interim = int(self._current_r + i * r_step)
            g_interim = int(self._current_g + i * g_step)
            b_interim = int(self._current_b + i * b_step)
            self.set_rgb(
                max(0, min(255, r_interim)),
                max(0, min(255, g_interim)),
                max(0, min(255, b_interim)),
            )
            time.sleep(delay_ms / 1000.0)

    def button_pressed(self):
        return GPIO.input(self.BUTTON_PIN) == 0

    def on_button_press(self, callback):
        self.button_press_callback = callback

    def on_button_release(self, callback):
        self.button_release_callback = callback

    def _button_release_event(self, channel):
        if self.button_release_callback:
            self.button_release_callback()

    def _button_press_event(self, channel):
        if self.button_press_callback:
            self.button_press_callback()

    def _button_event(self, channel):
        if GPIO.input(channel):
            self._button_press_event(channel)
        else:
            self._button_release_event(channel)

    def cleanup(self):
        self.red_pwm.stop()
        self.green_pwm.stop()
        self.blue_pwm.stop()
        GPIO.cleanup()
